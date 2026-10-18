"""
experiments/simulate_scans.py
==============================
Generates a labelled synthetic scan dataset.

⚠️  ALL DATA IS SIMULATED.  No real scans, products, or locations.
    Numbers produced by this script are for research / paper purposes only.

Genuine journey (label = 0):
  manufacturer → distributor → retailer → 1-3 consumer scans
  Each hop moves to a plausible nearby city with a realistic time gap.

Attack types (label = 1):
  A  impossible_travel   Two scans from cities >5000 km apart within 1 hour
  B  burst               >10 scans within 60 minutes from one device
  C  slow_clone          Plausible timing but many distinct devices/cities
  D  unregistered        product_id not in the registered set
  E  nfc_replay          NFC counter presented is <= last accepted counter
  F  nfc_clone_first     NFC skim-first race: valid CMAC, counter jumps

Attack mix is configurable via ATTACK_FRAC (fraction of products that are attacked).

Output: /data/scans.csv

Run from repo root:
    python experiments/simulate_scans.py [--products 200] [--attack-frac 0.4] [--seed 42]
"""

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

# ── City database ─────────────────────────────────────────────────────────────
# (name, lat, lon)
CITIES = [
    ("Mumbai",    19.07, 72.87), ("Delhi",      28.61, 77.20),
    ("Bangalore", 12.97, 77.59), ("Chennai",    13.08, 80.27),
    ("Kolkata",   22.57, 88.36), ("Hyderabad",  17.38, 78.48),
    ("Pune",      18.52, 73.85), ("Ahmedabad",  23.03, 72.58),
    ("Jaipur",    26.91, 75.78), ("Lucknow",    26.85, 80.95),
    ("London",    51.51, -0.13), ("Paris",      48.85,  2.35),
    ("Berlin",    52.52, 13.41), ("Tokyo",      35.68,139.69),
    ("New York",  40.71,-74.01), ("Los Angeles",34.05,-118.24),
    ("Singapore", 1.35, 103.82), ("Dubai",      25.20, 55.27),
    ("Sydney",   -33.87,151.21), ("São Paulo",  -23.55,-46.63),
]

def _haversine(lat1, lon1, lat2, lon2) -> float:
    """Return distance in km between two lat/lon points."""
    R = 6371.0
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a  = math.sin(dφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(dλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


# ── Scan row dataclass ────────────────────────────────────────────────────────

def _make_row(product_id, ts, city, device_id, channel,
              nfc_counter, sold, label, attack_type):
    lat, lon = city[1], city[2]
    return {
        "product_id":   product_id,
        "timestamp":    ts.isoformat(),
        "city":         city[0],
        "lat":          round(lat, 4),
        "lon":          round(lon, 4),
        "device_id":    device_id,
        "channel":      channel,
        "nfc_counter":  nfc_counter,
        "sold":         int(sold),
        "label":        label,          # 0 = genuine, 1 = attack
        "attack_type":  attack_type,    # "" for genuine
    }


# ── Genuine journey simulator ─────────────────────────────────────────────────

def _genuine_journey(rng, product_id, start_ts, start_city):
    """Return a list of scan rows for one genuine product journey."""
    rows = []
    ts   = start_ts
    city = start_city
    nfc_counter = 0
    sold = False

    # Each hop: pick a nearby city and advance time
    for role in ["manufacturer", "distributor", "retailer"]:
        device = f"dev-{rng.randint(10000,99999)}"
        rows.append(_make_row(product_id, ts, city, device,
                               rng.choice(["qr","nfc"]), nfc_counter, sold, 0, ""))
        if role == "retailer":
            sold = True
        # Move to nearby city (within 2000 km)
        candidates = [c for c in CITIES
                      if 50 < _haversine(city[1],city[2],c[1],c[2]) < 2000]
        if candidates:
            city = rng.choice(candidates)
        ts += timedelta(hours=rng.randint(12, 72))
        nfc_counter += 1

    # 1-3 consumer scans in the same or nearby city
    n_consumer = rng.randint(1, 3)
    for _ in range(n_consumer):
        device = f"dev-{rng.randint(10000,99999)}"
        ts += timedelta(hours=rng.randint(1, 48))
        nfc_counter += 1
        rows.append(_make_row(product_id, ts, city, device,
                               rng.choice(["qr","nfc"]), nfc_counter, sold, 0, ""))
    return rows


# ── Attack simulators ─────────────────────────────────────────────────────────

def _attack_A(rng, product_id, base_rows):
    """A: Impossible travel — two scans >5000 km apart within 60 min."""
    ts = datetime(2026, 1, rng.randint(1,28), rng.randint(0,23), 0, 0)
    far_pairs = [(c1,c2) for c1 in CITIES for c2 in CITIES
                 if _haversine(c1[1],c1[2],c2[1],c2[2]) > 5000]
    c1, c2 = rng.choice(far_pairs)
    dev = f"dev-{rng.randint(10000,99999)}"
    rows = base_rows[:]
    rows.append(_make_row(product_id, ts,                         c1, dev, "qr", 99, False, 1, "A_impossible_travel"))
    rows.append(_make_row(product_id, ts+timedelta(minutes=30),   c2, dev, "qr", 99, False, 1, "A_impossible_travel"))
    return rows


def _attack_B(rng, product_id, base_rows):
    """B: Burst — >10 scans within 60 min from same device."""
    ts  = datetime(2026, 1, rng.randint(1,28), rng.randint(0,23), 0, 0)
    city = rng.choice(CITIES)
    dev  = f"dev-{rng.randint(10000,99999)}"
    rows = base_rows[:]
    for i in range(rng.randint(11, 15)):
        rows.append(_make_row(product_id, ts+timedelta(minutes=i*3), city,
                               dev, "qr", 0, False, 1, "B_burst"))
    return rows


def _attack_C(rng, product_id, base_rows):
    """C: Slow clone — plausible timing but many distinct devices and cities."""
    ts  = datetime(2026, 2, rng.randint(1,28), rng.randint(0,23), 0, 0)
    rows = base_rows[:]
    n   = rng.randint(6, 10)
    for i in range(n):
        city = rng.choice(CITIES)
        dev  = f"dev-{rng.randint(10000,99999)}"    # different device each time
        ts  += timedelta(hours=rng.randint(8, 30))
        rows.append(_make_row(product_id, ts, city, dev, "qr", 0, False, 1, "C_slow_clone"))
    return rows


def _attack_D(rng, _product_id, _base_rows):
    """D: Unregistered product ID (entirely fake)."""
    fake_id = "0x" + uuid.uuid4().hex + uuid.uuid4().hex[:0]   # 64 hex = bytes32
    fake_id = "0x" + uuid.uuid4().hex.ljust(64, "0")
    ts      = datetime(2026, 3, rng.randint(1,28), rng.randint(0,23), 0, 0)
    city    = rng.choice(CITIES)
    dev     = f"dev-{rng.randint(10000,99999)}"
    return [_make_row(fake_id, ts, city, dev, "qr", 0, False, 1, "D_unregistered")]


def _attack_E(rng, product_id, base_rows):
    """E: NFC replay — counter presented is <= last accepted."""
    rows = base_rows[:]
    ts   = datetime(2026, 4, rng.randint(1,28), rng.randint(0,23), 0, 0)
    city = rng.choice(CITIES)
    dev  = f"dev-{rng.randint(10000,99999)}"
    # Last genuine counter was len(base_rows) — replay an earlier one
    replay_ctr = max(0, len(base_rows) - 2)
    rows.append(_make_row(product_id, ts, city, dev, "nfc", replay_ctr, False, 1, "E_nfc_replay"))
    return rows


def _attack_F(rng, product_id, base_rows):
    """F: NFC clone-first race — valid CMAC, counter skips forward."""
    rows = base_rows[:]
    ts   = datetime(2026, 4, rng.randint(1,28), rng.randint(0,23), 0, 0)
    city = rng.choice(CITIES)
    dev  = f"dev-{rng.randint(10000,99999)}"
    # Counter jumps by more than W (gap > 5) — flags as suspicious
    skip_ctr = len(base_rows) + rng.randint(10, 30)
    rows.append(_make_row(product_id, ts, city, dev, "nfc", skip_ctr, False, 1, "F_nfc_clone_first"))
    return rows


ATTACK_FNS = {
    "A": _attack_A,
    "B": _attack_B,
    "C": _attack_C,
    "D": _attack_D,
    "E": _attack_E,
    "F": _attack_F,
}


# ── Main simulation ────────────────────────────────────────────────────────────

def simulate(n_products: int = 300, attack_frac: float = 0.40, seed: int = 42):
    """
    Simulate n_products products and return a list of scan row dicts.
    attack_frac fraction of products get one or more attack scans appended.
    """
    rng   = random.Random(seed)
    rows  = []
    # Assign attack types evenly across attacked products
    attack_keys = list(ATTACK_FNS.keys())   # A-F

    for i in range(n_products):
        product_id = "0x" + uuid.UUID(int=rng.getrandbits(128)).hex.ljust(64, "0")[:64]
        start_ts   = datetime(2025, 1, 1) + timedelta(days=rng.randint(0, 300),
                                                       hours=rng.randint(0, 23))
        start_city = rng.choice(CITIES)
        genuine    = _genuine_journey(rng, product_id, start_ts, start_city)
        rows.extend(genuine)

        # Decide if this product is attacked
        if rng.random() < attack_frac:
            attack_type = attack_keys[i % len(attack_keys)]
            fn          = ATTACK_FNS[attack_type]
            attacked    = fn(rng, product_id, genuine)
            # Only add the NEW rows (attack rows that weren't in genuine)
            rows.extend(attacked[len(genuine):])

    return rows


def main():
    parser = argparse.ArgumentParser(description="Simulate anti-counterfeit scan dataset")
    parser.add_argument("--products",    type=int,   default=300)
    parser.add_argument("--attack-frac", type=float, default=0.40)
    parser.add_argument("--seed",        type=int,   default=42)
    args = parser.parse_args()

    print(f"\nNOTE: ALL DATA IS SIMULATED  (products={args.products}, attack_frac={args.attack_frac}, seed={args.seed})")
    rows = simulate(args.products, args.attack_frac, args.seed)

    out_path = ROOT / "data" / "scans.csv"
    fieldnames = ["product_id","timestamp","city","lat","lon",
                  "device_id","channel","nfc_counter","sold","label","attack_type"]
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        f.write("# NOTE: ALL DATA IS SIMULATED\n")
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    n_genuine = sum(1 for r in rows if r["label"] == 0)
    n_attack  = sum(1 for r in rows if r["label"] == 1)
    by_type   = {}
    for r in rows:
        if r["attack_type"]:
            by_type[r["attack_type"]] = by_type.get(r["attack_type"], 0) + 1

    print(f"Total rows : {len(rows)}")
    print(f"Genuine    : {n_genuine}  ({100*n_genuine/len(rows):.1f}%)")
    print(f"Attack     : {n_attack}  ({100*n_attack/len(rows):.1f}%)")
    print("By attack type:")
    for k, v in sorted(by_type.items()):
        print(f"  {k:<25}  {v}")
    print(f"\nWritten to: {out_path}")


if __name__ == "__main__":
    main()
