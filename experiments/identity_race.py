"""
experiments/identity_race.py
==============================
Clone-first-race experiment.

Runs N=1000 trials for three identity schemes and reports the fraction of
trials in which the GENUINE tag/QR is wrongly rejected after the clone is
presented first.

Schemes tested
--------------
static_qr
    Baseline QR: clone presents the same URL payload → always verifies.
    Genuine also always verifies.  Neither is "rejected".  Wrong-reject rate = 0.
    (Clone is UNDETECTABLE at the identity layer; detection must come from ML.)

hacp5_baseline
    Server-rewrite scheme.  Clone presents current ID first → server rotates ID.
    Genuine then presents old ID → rejected as duplicate.
    Wrong-reject rate = 1.0 (clone ALWAYS wins if it goes first).

nfc_cmac
    Our counter+CMAC design.  Clone replays (uid, counter, cmac).
    Genuine presents same (uid, counter, cmac) → DISPUTED (not rejected).
    Genuine's NEXT tap (counter+1) → ACCEPTED.
    Wrong-reject rate = 0 (genuine is never permanently rejected).

NOTE
----
All data is simulated.  Seeds are fixed for reproducibility.
Output written to experiments/results/race.csv.

Run from repo root:
    python experiments/identity_race.py
"""

import sys
import os
import csv
import random

# Allow import from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.identity.qr_identity import make_qr_payload, verify_qr_payload
from backend.identity.nfc_ntag import EmulatedTag, Verifier, CloneTag
from backend.identity.nfc_rewrite_baseline import RewriteTag, RewriteVerifier

# ── Configuration ────────────────────────────────────────────────────────────

N_TRIALS   = 1000
BASE_SEED  = 42          # fixed for reproducibility
QR_SECRET  = b"experiment-hmac-secret-32-bytesX"
MASTER_KEY = bytes.fromhex("cafebabecafebabecafebabecafebabe")  # 16 bytes
GAP_W      = 5


# ── Trial functions ───────────────────────────────────────────────────────────

def trial_static_qr(rng: random.Random) -> bool:
    """
    Returns True if the genuine QR is WRONGLY REJECTED after clone goes first.

    Static QR: clone and genuine present the same payload.  Both always verify.
    The QR layer cannot distinguish them → genuine is NEVER rejected here.
    Clone success is invisible at identity layer (requires ML).
    """
    product_id = f"prod-{rng.randint(0, 999999):06d}"
    serial     = f"{rng.randint(0, 9999):04d}"
    payload    = make_qr_payload(product_id, serial, QR_SECRET)

    # Clone scanned first
    clone_result   = verify_qr_payload(payload, QR_SECRET)
    # Genuine scanned second (same payload)
    genuine_result = verify_qr_payload(payload, QR_SECRET)

    # Genuine is "wrongly rejected" if it returns valid=False
    return not genuine_result["valid"]


def trial_hacp5(rng: random.Random) -> bool:
    """
    Returns True if the genuine tag is WRONGLY REJECTED after clone goes first.

    HACP5: clone presents current_id → server rotates → genuine tag has old ID
    → genuine is flagged duplicate = wrongly rejected.
    This is the expected flaw; wrong-reject rate should be 1.0.
    """
    genuine = RewriteTag(initial_id=bytes(rng.randbytes(32)))
    verifier = RewriteVerifier()
    verifier.register(genuine)

    # Clone copies the current ID
    clone = RewriteTag(
        physical_uid=genuine.physical_uid,
        initial_id=genuine.current_id,
    )

    # Clone goes first
    verifier.scan(clone)

    # Genuine tries to scan with old ID
    result = verifier.scan(genuine)
    return not result["valid"]   # True = wrongly rejected


def trial_nfc_cmac(rng: random.Random) -> bool:
    """
    Returns True if the genuine tag is WRONGLY REJECTED after clone goes first.

    Our design: clone replays (uid, counter=1, cmac).
    Genuine presents same data → DISPUTED (not rejected).
    Genuine's next tap (counter=2) → ACCEPTED.
    Wrong-reject = REJECTED result on genuine's SECOND tap.
    """
    uid = bytes(rng.randbytes(7))
    tag = EmulatedTag(MASTER_KEY, uid=uid)
    verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)

    # Genuine taps once → clone copies it
    tap1 = tag.tap()   # counter = 1
    clone = CloneTag.from_tap(tap1)

    # Clone goes first
    verifier.verify(*clone.replay())   # ACCEPT (first seen)

    # Genuine presents counter=1 → DISPUTED (replay)
    r_genuine_1 = verifier.verify(*tap1)
    # Genuine taps again → counter=2 → should ACCEPT
    tap2 = tag.tap()
    r_genuine_2 = verifier.verify(*tap2)

    # "Wrongly rejected" = second tap is not accepted
    return not r_genuine_2.accepted


# ── Main ──────────────────────────────────────────────────────────────────────

def run_experiment():
    results = {
        "static_qr":      {"trials": N_TRIALS, "genuine_rejected": 0},
        "hacp5_baseline": {"trials": N_TRIALS, "genuine_rejected": 0},
        "nfc_cmac":       {"trials": N_TRIALS, "genuine_rejected": 0},
    }

    print(f"\nClone-first-race experiment  (N={N_TRIALS}, seed={BASE_SEED})")
    print("NOTE: all data is simulated.\n")

    for scheme, trial_fn in [
        ("static_qr",      trial_static_qr),
        ("hacp5_baseline", trial_hacp5),
        ("nfc_cmac",       trial_nfc_cmac),
    ]:
        rng = random.Random(BASE_SEED)   # same seed for every scheme
        count = 0
        for _ in range(N_TRIALS):
            if trial_fn(rng):
                count += 1
        results[scheme]["genuine_rejected"] = count
        rate = count / N_TRIALS
        print(f"  {scheme:<20}  genuine wrongly rejected: {count:4d}/{N_TRIALS}  ({rate:.1%})")

    # ── Write CSV ──────────────────────────────────────────────────────────
    out_dir = os.path.join(os.path.dirname(__file__), "results")
    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, "race.csv")

    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "NOTE: all data is simulated",
            "", "", "", ""
        ])
        writer.writerow([
            "scheme",
            "n_trials",
            "genuine_wrongly_rejected",
            "wrong_reject_rate",
            "description",
        ])
        descriptions = {
            "static_qr":      "Clone verifies same as genuine; identity layer cannot distinguish",
            "hacp5_baseline": "Clone wins race; genuine flagged duplicate (known flaw)",
            "nfc_cmac":       "Genuine DISPUTED on replay; next tap ACCEPTED (recoverable)",
        }
        for scheme, data in results.items():
            n   = data["trials"]
            rej = data["genuine_rejected"]
            writer.writerow([
                scheme,
                n,
                rej,
                f"{rej / n:.4f}",
                descriptions[scheme],
            ])

    print(f"\nResults written to: {csv_path}")
    return csv_path


if __name__ == "__main__":
    run_experiment()
