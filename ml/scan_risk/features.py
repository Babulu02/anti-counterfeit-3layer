"""
ml/scan_risk/features.py
=========================
Compute per-scan features from a scan history DataFrame with STRICT CAUSALITY.

NOTE: ALL DATA IS SIMULATED.

Feature set (11 features per scan, no sequence-length or on-chain state leakage):
--------------------------------------------------------------------------------
dist_km          Haversine distance to previous scan (km); 0 for first scan.
time_delta_h     Hours since previous scan; 0 for first scan.
speed_kmh        Implied speed (dist_km / time_delta_h); 0 when delta==0.
scans_1h         Number of prior scans of this product in the preceding 1 hour.
scans_24h        Number of prior scans of this product in the preceding 24 hours.
distinct_devices Number of distinct device hashes seen up to and including this scan.
distinct_cities  Number of distinct cities seen up to and including this scan.
hour_of_day      Hour of the scan timestamp (0–23).
channel_nfc      1 if channel == 'nfc', else 0.
nfc_counter_gap  Counter - last_accepted_counter; 0 for QR or first NFC scan.
is_new_city      1 if this scan's city has never been seen before for this product.

NOTE on sequence leakage:
`total_scans` and `sold` have been REMOVED from FEATURE_COLS:
  - `total_scans` caused artificial F1=1.000 sequence-length leakage.
  - `sold` is an on-chain lifecycle signal handled separately by fusion.py rules.
`LEAKY_FEATURE_COLS` is retained solely for cautionary ablation comparison.

Input
-----
df : pd.DataFrame with columns:
    product_id, timestamp (parseable), city, lat, lon,
    device_id (or device_hash), channel, nfc_counter, sold, label (optional)

Returns
-------
pd.DataFrame with FEATURE_COLS (and optional leaky columns for ablation).
"""

from __future__ import annotations
import math
import pandas as pd
import numpy as np


FEATURE_COLS = [
    "dist_km", "time_delta_h", "speed_kmh",
    "scans_1h", "scans_24h",
    "distinct_devices", "distinct_cities",
    "hour_of_day", "channel_nfc", "nfc_counter_gap",
    "is_new_city",
]

# Cautionary ablation feature set showing the effect of sequence-length & sold leakage
LEAKY_FEATURE_COLS = FEATURE_COLS + ["total_scans", "sold"]


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute features for every row in df with strict causality:
    Each scan's features depend ONLY on history strictly up to that scan.
    """
    df = df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], format="ISO8601")
    df = df.sort_values(["product_id", "timestamp"]).reset_index(drop=True)

    # Use device_id or device_hash interchangeably
    if "device_id" in df.columns and "device_hash" not in df.columns:
        df["device_hash"] = df["device_id"]
    elif "device_hash" not in df.columns:
        df["device_hash"] = "unknown"

    results = []

    for pid, grp in df.groupby("product_id", sort=False):
        grp = grp.sort_values("timestamp").reset_index(drop=True)
        prev_lat, prev_lon, prev_ts = None, None, None
        seen_devices: set = set()
        seen_cities: set = set()
        last_nfc_counter = -1

        for i, row in grp.iterrows():
            ts = row["timestamp"]
            lat = float(row.get("lat", 0) or 0)
            lon = float(row.get("lon", 0) or 0)
            city = str(row.get("city", "") or "")
            dev = str(row.get("device_hash", "") or "")
            ch = str(row.get("channel", "qr"))
            ctr = int(row.get("nfc_counter", 0) or 0)
            sold = int(row.get("sold", 0) or 0)

            # Distance and time delta to previous scan
            if prev_ts is None:
                dist_km = 0.0
                time_delta_h = 0.0
            else:
                dist_km = _haversine(prev_lat, prev_lon, lat, lon)
                td = (ts - prev_ts).total_seconds() / 3600.0
                time_delta_h = max(td, 0.0)

            if time_delta_h > 0:
                speed_kmh = dist_km / time_delta_h
            elif dist_km > 5.0:
                speed_kmh = dist_km / (1.0 / 3600.0)  # instantaneous multi-city scan
            else:
                speed_kmh = 0.0

            # Strictly causal preceding window counts (only prior scans in grp up to i-1)
            if i > 0:
                history_ts = grp["timestamp"].iloc[:i]
                scans_1h = int((history_ts >= ts - pd.Timedelta(hours=1)).sum())
                scans_24h = int((history_ts >= ts - pd.Timedelta(hours=24)).sum())
            else:
                scans_1h = 0
                scans_24h = 0

            # Cumulative distinct up to current scan
            is_new_city = int(city not in seen_cities)
            seen_devices.add(dev)
            seen_cities.add(city)
            distinct_devices = len(seen_devices)
            distinct_cities = len(seen_cities)
            total_scans = i + 1

            # NFC counter gap
            if ch == "nfc":
                nfc_gap = ctr - last_nfc_counter if last_nfc_counter >= 0 else 0
                if ctr > last_nfc_counter:
                    last_nfc_counter = ctr
            else:
                nfc_gap = 0

            results.append({
                "dist_km": round(dist_km, 2),
                "time_delta_h": round(time_delta_h, 4),
                "speed_kmh": round(speed_kmh, 2),
                "scans_1h": scans_1h,
                "scans_24h": scans_24h,
                "distinct_devices": distinct_devices,
                "distinct_cities": distinct_cities,
                "hour_of_day": ts.hour,
                "channel_nfc": int(ch == "nfc"),
                "nfc_counter_gap": nfc_gap,
                "is_new_city": is_new_city,
                # Retained for cautionary ablation only:
                "total_scans": total_scans,
                "sold": sold,
            })

            prev_lat, prev_lon, prev_ts = lat, lon, ts

    feat_df = pd.DataFrame(results)
    feat_df.index = df.index.tolist()
    return feat_df
