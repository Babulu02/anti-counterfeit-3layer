"""
ml/scan_risk/features.py
=========================
Compute per-scan features from a scan history DataFrame.

Feature set (13 features per scan)
------------------------------------
dist_km          Haversine distance to previous scan (km); 0 for first scan.
time_delta_h     Hours since previous scan; 0 for first scan.
speed_kmh        Implied speed (dist_km / time_delta_h); 0 when delta==0.
scans_1h         Number of scans of this product in the preceding 1 hour.
scans_24h        Number of scans in the preceding 24 hours.
distinct_devices Number of distinct device hashes ever seen for this product
                 up to and including this scan.
distinct_cities  Number of distinct cities ever seen for this product.
total_scans      Running count of scans for this product (including this one).
hour_of_day      Hour of the scan timestamp (0–23).
channel_nfc      1 if channel == 'nfc', else 0.
nfc_counter_gap  Counter - last_accepted_counter; 0 for QR or first NFC scan.
sold             1 if product was flagged as sold before this scan, else 0.
is_new_city      1 if this scan's city has never been seen before for this product.

Input
-----
df : pd.DataFrame with columns:
    product_id, timestamp (parseable), city, lat, lon,
    device_id (or device_hash), channel, nfc_counter, sold, label (optional)

Returns
-------
pd.DataFrame with the 13 feature columns, same index as input.
"""

from __future__ import annotations
import math
import pandas as pd
import numpy as np


FEATURE_COLS = [
    "dist_km", "time_delta_h", "speed_kmh",
    "scans_1h", "scans_24h",
    "distinct_devices", "distinct_cities", "total_scans",
    "hour_of_day", "channel_nfc", "nfc_counter_gap",
    "sold", "is_new_city",
]


def _haversine(lat1, lon1, lat2, lon2) -> float:
    R = 6371.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a  = math.sin(dφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(dλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute features for every row in df.
    df must be sorted by (product_id, timestamp) before calling.
    Returns a new DataFrame with FEATURE_COLS columns and the same index.
    """
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["product_id", "timestamp"]).reset_index(drop=True)

    # Use device_id or device_hash interchangeably
    if "device_id" in df.columns and "device_hash" not in df.columns:
        df["device_hash"] = df["device_id"]
    elif "device_hash" not in df.columns:
        df["device_hash"] = "unknown"

    results = []

    for pid, grp in df.groupby("product_id", sort=False):
        grp  = grp.sort_values("timestamp").reset_index(drop=True)
        prev_lat, prev_lon, prev_ts = None, None, None
        seen_devices: set = set()
        seen_cities:  set = set()
        last_nfc_counter = -1

        for i, row in grp.iterrows():
            ts   = row["timestamp"]
            lat  = float(row.get("lat", 0) or 0)
            lon  = float(row.get("lon", 0) or 0)
            city = str(row.get("city", "") or "")
            dev  = str(row.get("device_hash", "") or "")
            ch   = str(row.get("channel", "qr"))
            ctr  = int(row.get("nfc_counter", 0) or 0)
            sold = int(row.get("sold", 0) or 0)

            # Distance and time delta
            if prev_ts is None:
                dist_km      = 0.0
                time_delta_h = 0.0
            else:
                dist_km      = _haversine(prev_lat, prev_lon, lat, lon)
                td           = (ts - prev_ts).total_seconds() / 3600.0
                time_delta_h = max(td, 0.0)

            speed_kmh = (dist_km / time_delta_h) if time_delta_h > 0 else 0.0

            # Rolling window counts
            window_1h  = grp[grp["timestamp"].between(ts - pd.Timedelta(hours=1),  ts, inclusive="left")]
            window_24h = grp[grp["timestamp"].between(ts - pd.Timedelta(hours=24), ts, inclusive="left")]
            scans_1h   = len(window_1h)
            scans_24h  = len(window_24h)

            # Cumulative distinct
            is_new_city  = int(city not in seen_cities)
            seen_devices.add(dev)
            seen_cities.add(city)
            total_scans      = i + 1   # 1-indexed within product group
            distinct_devices = len(seen_devices)
            distinct_cities  = len(seen_cities)

            # NFC counter gap
            if ch == "nfc":
                nfc_gap = ctr - last_nfc_counter if last_nfc_counter >= 0 else 0
                last_nfc_counter = ctr
            else:
                nfc_gap = 0

            results.append({
                "dist_km":          round(dist_km, 2),
                "time_delta_h":     round(time_delta_h, 4),
                "speed_kmh":        round(speed_kmh, 2),
                "scans_1h":         scans_1h,
                "scans_24h":        scans_24h,
                "distinct_devices": distinct_devices,
                "distinct_cities":  distinct_cities,
                "total_scans":      total_scans,
                "hour_of_day":      ts.hour,
                "channel_nfc":      int(ch == "nfc"),
                "nfc_counter_gap":  nfc_gap,
                "sold":             sold,
                "is_new_city":      is_new_city,
            })

            prev_lat, prev_lon, prev_ts = lat, lon, ts

    feat_df = pd.DataFrame(results, columns=FEATURE_COLS)
    # Restore original index order by aligning back
    # (results were appended in product/time order; re-index to original df index)
    sorted_idx = df.index.tolist()
    feat_df.index = sorted_idx
    return feat_df
