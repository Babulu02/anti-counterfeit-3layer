"""
experiments/simulate_scans.py
==============================
Generates a labelled synthetic scan dataset for scan-risk ML evaluation.

NOTE: ALL DATA IS SIMULATED. No real scans, products, or locations.
Numbers produced by this script are for academic research / paper evaluation only.

Genuine journey variability (label = 0):
  - Standard supply chain: manufacturer -> distributor -> retailer -> 1-3 consumer scans.
  - Retailer inventory bursts: retailers scanning 2-6 units within 15-60 min.
  - Shared devices / multiple clerks.
  - Realistic travel: customers flying or taking high-speed rail (200-750 km/h).
  - GPS noise: realistic jitter (+/- 0.01 to 0.03 deg) from mobile cell/Wi-Fi positioning.
  - Missed NFC taps: normal counter gaps of +2 to +4 caused by unconfirmed/interrupted reads.

Attack types (label = 1):
  A  impossible_travel    Scans from distant locations (>1200 km/h impossible physical velocity).
  B  burst                Rapid barrage of 15-30 scans within 15 min.
  C  slow_clone           Dispersed clones across 5-8 distinct cities/devices over weeks.
  D  unregistered         Fabricated or unregistered product IDs.
  E  nfc_replay           NFC counter presented <= last accepted counter.
  F  nfc_clone_first      NFC skim-first race with counter jump (gap > 10).
  G  stealth_clone        HELD-OUT FOR TEST ONLY: low-and-slow clone (1-2 scans, nearby city,
                          using 1 device, mimicking ordinary consumer cadence).

Output: data/scans.csv
"""

from __future__ import annotations

import argparse
import csv
import math
import os
import random
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

CITIES = [
    ("Mumbai",      19.0760,  72.8777),
    ("Delhi",       28.6139,  77.2090),
    ("Bangalore",   12.9716,  77.5946),
    ("Chennai",     13.0827,  80.2707),
    ("Kolkata",     22.5726,  88.3639),
    ("Hyderabad",   17.3850,  78.4867),
    ("Pune",        18.5204,  73.8567),
    ("Ahmedabad",   23.0225,  72.5714),
    ("Jaipur",      26.9124,  75.7873),
    ("Lucknow",     26.8467,  80.9462),
    ("London",      51.5074,  -0.1278),
    ("Paris",       48.8566,   2.3522),
    ("Berlin",      52.5200,  13.4050),
    ("Tokyo",       35.6762, 139.6503),
    ("New York",    40.7128, -74.0060),
    ("Los Angeles", 34.0522,-118.2437),
    ("Singapore",    1.3521, 103.8198),
    ("Dubai",       25.2048,  55.2708),
    ("Sydney",     -33.8688, 151.2093),
    ("Sao Paulo",  -23.5505, -46.6333),
]


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two lat/lon points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _add_gps_noise(rng: random.Random, lat: float, lon: float) -> tuple[float, float]:
    """Add small realistic GPS/Cell-ID noise (+/- 0.01-0.02 degrees)."""
    n_lat = lat + rng.gauss(0.0, 0.012)
    n_lon = lon + rng.gauss(0.0, 0.012)
    return round(n_lat, 4), round(n_lon, 4)


def _make_row(product_id: str, ts: datetime, city: tuple[str, float, float],
              device_id: str, channel: str, nfc_counter: int, sold: bool,
              label: int, attack_type: str, rng: random.Random) -> dict:
    noisy_lat, noisy_lon = _add_gps_noise(rng, city[1], city[2])
    return {
        "product_id":   product_id,
        "timestamp":    ts.isoformat(),
        "city":         city[0],
        "lat":          noisy_lat,
        "lon":          noisy_lon,
        "device_id":    device_id,
        "channel":      channel,
        "nfc_counter":  nfc_counter,
        "sold":         int(sold),
        "label":        label,          # 0 = genuine, 1 = attack
        "attack_type":  attack_type,    # empty string for genuine
    }


# ── Genuine Journey Simulator ────────────────────────────────────────────────

def _advance_counter(rng: random.Random, current_ctr: int) -> int:
    """Simulate realistic NFC counter increment with occasional missed taps."""
    if current_ctr == 0:
        return 1
    # 20% chance of 1-2 missed taps during normal handling
    if rng.random() < 0.20:
        return current_ctr + rng.randint(2, 3)
    return current_ctr + 1


def _genuine_journey(rng: random.Random, product_id: str, start_ts: datetime, start_city: tuple[str, float, float]) -> list[dict]:
    """
    Return scan rows for one genuine product journey with realistic human, retail,
    household, and secondary market variability.
    Spans lengths from 4 to 45+ scans across 4 realistic archetypes:
      1. Minimal consumer (~30%): standard 4-8 scans.
      2. Household / family (~35%): multiple members, 10-22 scans.
      3. Retail store clerk audits (~20%): repeated inventory scans, 14-30 scans.
      4. Resale / secondary market (~15%): peer-to-peer / appraisal, 24-48 scans.
    """
    rows = []
    ts = start_ts
    city = start_city
    nfc_counter = 0
    sold = False

    # 1. Supply chain hops: manufacturer -> distributor -> retailer
    mfr_dev = f"dev-mfr-{rng.randint(100, 999)}"
    dist_dev = f"dev-dist-{rng.randint(100, 999)}"
    retail_dev = f"dev-ret-{rng.randint(100, 999)}"
    clerks = [retail_dev, f"dev-ret-{rng.randint(100, 999)}", f"dev-ret-{rng.randint(100, 999)}"]

    hops = [
        ("manufacturer", mfr_dev, 0),
        ("distributor", dist_dev, rng.randint(18, 72)),
        ("retailer", rng.choice(clerks), rng.randint(24, 96)),
    ]

    for role, dev, hours_gap in hops:
        ts += timedelta(hours=hours_gap)
        nfc_counter = _advance_counter(rng, nfc_counter)
        ch = rng.choice(["qr", "nfc"])
        rows.append(_make_row(product_id, ts, city, dev, ch, nfc_counter, sold, 0, "", rng))

        if role == "distributor" and rng.random() < 0.40:
            # Distributor warehouse intake / pallet scan
            extra_dist = rng.randint(1, 3)
            for _ in range(extra_dist):
                ts += timedelta(minutes=rng.randint(5, 30))
                rows.append(_make_row(product_id, ts, city, dist_dev, "qr", nfc_counter, sold, 0, "", rng))

        if role == "retailer":
            sold = True
            # Initial retail intake
            if rng.random() < 0.50:
                extra_intake = rng.randint(1, 3)
                for _ in range(extra_intake):
                    ts += timedelta(minutes=rng.randint(3, 15))
                    rows.append(_make_row(product_id, ts, city, rng.choice(clerks), "qr", nfc_counter, sold, 0, "", rng))

        # Plausible freight transition between cities
        candidates = [c for c in CITIES if 80 < _haversine(city[1], city[2], c[1], c[2]) < 2500]
        if candidates:
            city = rng.choice(candidates)

    # 2. Archetype selection for post-retail journey
    archetype_roll = rng.random()

    if archetype_roll < 0.30:
        # Archetype 1: Minimal consumer (1-4 consumer scans) -> total ~4-8
        n_scans = rng.randint(1, 4)
        consumer_devs = [f"dev-usr-{rng.randint(10000, 99999)}"]
    elif archetype_roll < 0.65:
        # Archetype 2: Household / family (6-16 consumer scans) -> total ~10-22
        n_scans = rng.randint(6, 16)
        consumer_devs = [f"dev-usr-{rng.randint(10000, 99999)}" for _ in range(rng.randint(2, 3))]
    elif archetype_roll < 0.85:
        # Archetype 3: Retail store audits & clerk display checks (10-24 scans) -> total ~14-30
        n_scans = rng.randint(10, 24)
        consumer_devs = clerks + [f"dev-usr-{rng.randint(10000, 99999)}"]
    else:
        # Archetype 4: Resale / secondary market transfer (18-38 scans) -> total ~24-48
        n_scans = rng.randint(18, 38)
        consumer_devs = [
            f"dev-usr-{rng.randint(10000, 99999)}",
            f"dev-pawn-{rng.randint(10000, 99999)}",
            f"dev-appr-{rng.randint(10000, 99999)}",
            f"dev-buyer-{rng.randint(10000, 99999)}",
        ]

    for _ in range(n_scans):
        dev = rng.choice(consumer_devs)
        # Normal spacing: minutes (if repeated check) or hours/days
        if rng.random() < 0.25:
            ts += timedelta(minutes=rng.randint(2, 45))
        else:
            ts += timedelta(hours=rng.randint(2, 96))

        # Genuine travel (flight or train, plausible physical speed)
        if rng.random() < 0.12:
            travel_candidates = [c for c in CITIES if 200 < _haversine(city[1], city[2], c[1], c[2]) < 5000]
            if travel_candidates:
                dest = rng.choice(travel_candidates)
                dist = _haversine(city[1], city[2], dest[1], dest[2])
                flight_hours = max(2.0, dist / rng.uniform(300.0, 750.0))
                ts += timedelta(hours=flight_hours)
                city = dest

        nfc_counter = _advance_counter(rng, nfc_counter)
        ch = rng.choice(["qr", "nfc"])
        rows.append(_make_row(product_id, ts, city, dev, ch, nfc_counter, sold, 0, "", rng))

    return rows


# ── Attack Simulators ────────────────────────────────────────────────────────

def _attack_A_impossible_travel(rng: random.Random, product_id: str, base_rows: list[dict]) -> list[dict]:
    """A: Impossible travel — two scans >4000 km apart within 15-45 minutes (>1500 km/h)."""
    rows = base_rows[:]
    last = rows[-1]
    ts = datetime.fromisoformat(last["timestamp"]) + timedelta(hours=rng.randint(1, 24))
    far_pairs = [(c1, c2) for c1 in CITIES for c2 in CITIES if _haversine(c1[1], c1[2], c2[1], c2[2]) > 4000]
    c1, c2 = rng.choice(far_pairs)
    dev1 = f"dev-att-{rng.randint(10000, 99999)}"
    dev2 = f"dev-att-{rng.randint(10000, 99999)}"
    rows.append(_make_row(product_id, ts, c1, dev1, "qr", 0, False, 1, "A_impossible_travel", rng))
    rows.append(_make_row(product_id, ts + timedelta(minutes=rng.randint(15, 40)), c2, dev2, "qr", 0, False, 1, "A_impossible_travel", rng))
    return rows


def _attack_B_burst(rng: random.Random, product_id: str, base_rows: list[dict]) -> list[dict]:
    """B: Burst — 15 to 30 scans within 20 minutes (cloned QR scan flood)."""
    rows = base_rows[:]
    last = rows[-1]
    ts = datetime.fromisoformat(last["timestamp"]) + timedelta(hours=rng.randint(2, 48))
    city = rng.choice(CITIES)
    dev = f"dev-burst-{rng.randint(10000, 99999)}"
    n_burst = rng.randint(15, 28)
    for i in range(n_burst):
        scan_time = ts + timedelta(seconds=i * rng.randint(20, 60))
        rows.append(_make_row(product_id, scan_time, city, dev, "qr", 0, False, 1, "B_burst", rng))
    return rows


def _attack_C_slow_clone(rng: random.Random, product_id: str, base_rows: list[dict]) -> list[dict]:
    """C: Slow clone — cloned QR code active over weeks across 5-9 distinct cities and devices."""
    rows = base_rows[:]
    last = rows[-1]
    ts = datetime.fromisoformat(last["timestamp"]) + timedelta(days=rng.randint(1, 5))
    n_scans = rng.randint(6, 10)
    for _ in range(n_scans):
        city = rng.choice(CITIES)
        dev = f"dev-clone-{rng.randint(10000, 99999)}"
        ts += timedelta(hours=rng.randint(18, 60))
        rows.append(_make_row(product_id, ts, city, dev, "qr", 0, False, 1, "C_slow_clone", rng))
    return rows


def _attack_D_unregistered(rng: random.Random, _product_id: str, _base_rows: list[dict]) -> list[dict]:
    """D: Unregistered product ID (completely bogus ID)."""
    fake_id = "0x" + uuid.uuid4().hex.ljust(64, "0")
    ts = datetime(2026, 3, rng.randint(1, 28), rng.randint(0, 23), 0, 0)
    city = rng.choice(CITIES)
    dev = f"dev-fake-{rng.randint(10000, 99999)}"
    return [_make_row(fake_id, ts, city, dev, "qr", 0, False, 1, "D_unregistered", rng)]


def _attack_E_nfc_replay(rng: random.Random, product_id: str, base_rows: list[dict]) -> list[dict]:
    """E: NFC replay — counter presented is <= last accepted counter."""
    rows = base_rows[:]
    last = rows[-1]
    ts = datetime.fromisoformat(last["timestamp"]) + timedelta(hours=rng.randint(1, 12))
    city = rng.choice(CITIES)
    dev = f"dev-replay-{rng.randint(10000, 99999)}"
    current_ctr = last["nfc_counter"]
    replay_ctr = max(0, current_ctr - rng.randint(1, 3))
    rows.append(_make_row(product_id, ts, city, dev, "nfc", replay_ctr, False, 1, "E_nfc_replay", rng))
    return rows


def _attack_F_nfc_clone_first(rng: random.Random, product_id: str, base_rows: list[dict]) -> list[dict]:
    """F: NFC clone-first race — valid CMAC, but counter jumps far beyond window W (gap > 10)."""
    rows = base_rows[:]
    last = rows[-1]
    ts = datetime.fromisoformat(last["timestamp"]) + timedelta(hours=rng.randint(1, 24))
    city = rng.choice(CITIES)
    dev = f"dev-skip-{rng.randint(10000, 99999)}"
    current_ctr = last["nfc_counter"]
    skip_ctr = current_ctr + rng.randint(15, 45)
    rows.append(_make_row(product_id, ts, city, dev, "nfc", skip_ctr, False, 1, "F_nfc_clone_first", rng))
    return rows


def _attack_G_stealth_clone(rng: random.Random, product_id: str, base_rows: list[dict]) -> list[dict]:
    """
    G: Stealth low-and-slow clone (HELD-OUT ATTACK VARIANT FOR TEST ONLY).
    Attacker makes only 1-2 scans, uses a single device, plausibly timed (24-48h later),
    and located in a plausible nearby city. Highly overlapping with legitimate consumer behaviour.
    """
    rows = base_rows[:]
    last = rows[-1]
    ts = datetime.fromisoformat(last["timestamp"]) + timedelta(hours=rng.randint(24, 72))
    # Pick nearby or same city
    last_city = (last["city"], last["lat"], last["lon"])
    nearby = [c for c in CITIES if 50 < _haversine(last["lat"], last["lon"], c[1], c[2]) < 600]
    city = rng.choice(nearby) if nearby else rng.choice(CITIES)
    dev = f"dev-stealth-{rng.randint(10000, 99999)}"
    n_scans = rng.randint(1, 2)
    for _ in range(n_scans):
        rows.append(_make_row(product_id, ts, city, dev, "qr", 0, False, 1, "G_stealth_clone", rng))
        ts += timedelta(hours=rng.randint(12, 36))
    return rows


TRAINABLE_ATTACKS = {
    "A": _attack_A_impossible_travel,
    "B": _attack_B_burst,
    "C": _attack_C_slow_clone,
    "D": _attack_D_unregistered,
    "E": _attack_E_nfc_replay,
    "F": _attack_F_nfc_clone_first,
}

HELD_OUT_ATTACKS = {
    "G": _attack_G_stealth_clone,
}


# ── Main Simulation Generator ───────────────────────────────────────────────

def simulate(n_products: int = 2000, attack_frac: float = 0.35, seed: int = 42) -> list[dict]:
    """
    Simulate n_products products.
    attack_frac fraction of products receive an attack.
    About 15% of attacked products receive the held-out attack G (held out for test).
    """
    rng = random.Random(seed)
    rows: list[dict] = []

    trainable_keys = list(TRAINABLE_ATTACKS.keys())

    for i in range(n_products):
        product_id = "0x" + uuid.UUID(int=rng.getrandbits(128)).hex.ljust(64, "0")[:64]
        start_ts = datetime(2025, 1, 1) + timedelta(days=rng.randint(0, 320), hours=rng.randint(0, 23))
        start_city = rng.choice(CITIES)
        genuine = _genuine_journey(rng, product_id, start_ts, start_city)
        rows.extend(genuine)

        if rng.random() < attack_frac:
            # 15% of attacks are the held-out attack G
            if rng.random() < 0.15:
                fn = HELD_OUT_ATTACKS["G"]
            else:
                k = trainable_keys[i % len(trainable_keys)]
                fn = TRAINABLE_ATTACKS[k]

            attacked = fn(rng, product_id, genuine)
            # Add only attack rows
            rows.extend(attacked[len(genuine):])

    return rows


def main():
    parser = argparse.ArgumentParser(description="Simulate anti-counterfeit scan dataset")
    parser.add_argument("--products",    type=int,   default=2000, help="Number of products (min 2000)")
    parser.add_argument("--attack-frac", type=float, default=0.35, help="Fraction of products attacked")
    parser.add_argument("--seed",        type=int,   default=42,   help="Random seed")
    args = parser.parse_args()

    print(f"\nNOTE: ALL DATA IS SIMULATED  (products={args.products}, attack_frac={args.attack_frac}, seed={args.seed})")
    rows = simulate(args.products, args.attack_frac, args.seed)

    out_path = ROOT / "data" / "scans.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "product_id", "timestamp", "city", "lat", "lon",
        "device_id", "channel", "nfc_counter", "sold", "label", "attack_type"
    ]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        f.write("# NOTE: ALL DATA IS SIMULATED\n")
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    n_genuine = sum(1 for r in rows if r["label"] == 0)
    n_attack = sum(1 for r in rows if r["label"] == 1)
    by_type: dict[str, int] = {}
    for r in rows:
        if r["attack_type"]:
            by_type[r["attack_type"]] = by_type.get(r["attack_type"], 0) + 1

    print(f"Total rows : {len(rows)}")
    print(f"Genuine    : {n_genuine}  ({100 * n_genuine / len(rows):.1f}%)")
    print(f"Attack     : {n_attack}  ({100 * n_attack / len(rows):.1f}%)")
    print("By attack type:")
    for k, v in sorted(by_type.items()):
        print(f"  {k:<28}  {v}")
    print(f"\nWritten to: {out_path}")


if __name__ == "__main__":
    main()
