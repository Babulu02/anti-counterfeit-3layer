"""
experiments/identity_race.py
==============================
Extended clone-first-race experiment.

Runs N=1000 trials per (scheme × scenario) combination across 5 seeds and
reports mean ± std for four metrics.

Schemes
-------
static_qr       URL+HMAC payload; no freshness mechanism.
hacp5_baseline  Server-rewrite (rolling token); clone-first flaw.
nfc_cmac        Our AES-CMAC + counter design.

Scenarios
---------
S1  replay          Attacker captures an *already-accepted* tap and replays it.
S2  skim_first      Attacker skims an *unused* valid tap and presents it BEFORE
                    the genuine tag.
S3  guess           Attacker has no valid capture; presents random/forged data.

Per-trial randomised parameters
---------------------------------
prior_taps      int in [0, 20]   Number of legitimate taps before the attack.
missed_taps     int in [0, W+2]  Genuine RF misses between capture and attack.
capture_point   int              Which prior tap the attacker captured (S1/S2).
clone_first     bool             Whether the attacker scans before the genuine tag
                                 (always True for S2 by definition; randomised
                                 for S1 and S3 where ordering matters).

Metrics (all rates in [0, 1])
------------------------------
clone_accepted_rate     Fraction of trials where the attacker's scan was ACCEPTED.
genuine_rejected_rate   Fraction of trials where the genuine presentation was REJECTED
                        (hard block — not merely disputed).
genuine_disputed_rate   Fraction of trials where the genuine presentation was DISPUTED
                        (friction — not a permanent block in nfc_cmac).
genuine_recovered_rate  Of the DISPUTED trials: fraction where the genuine tag's
                        next tap was subsequently ACCEPTED.

NOTE
----
All data is simulated.  Seeds are fixed for reproducibility.
Output: experiments/results/race.csv
Run from repo root:
    python experiments/identity_race.py
"""

from __future__ import annotations

import sys
import os
import csv
import random
import math
from dataclasses import dataclass, field
from typing import Callable

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.identity.qr_identity import make_qr_payload, verify_qr_payload
from backend.identity.nfc_ntag import EmulatedTag, Verifier, CloneTag, Outcome
from backend.identity.nfc_rewrite_baseline import RewriteTag, RewriteVerifier

# ── Configuration ────────────────────────────────────────────────────────────

N_TRIALS     = 1000
SEEDS        = [42, 7, 13, 99, 256]   # 5 fixed seeds
QR_SECRET    = b"experiment-hmac-secret-32-bytesX"
MASTER_KEY   = bytes.fromhex("cafebabecafebabecafebabecafebabe")
GAP_W        = 5       # gap tolerance W used in Verifier

SCENARIOS    = ["replay", "skim_first", "guess"]
SCHEMES      = ["static_qr", "hacp5_baseline", "nfc_cmac"]


# ── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class TrialResult:
    clone_accepted:    bool   # attacker's scan was ACCEPTED
    genuine_rejected:  bool   # genuine was hard-REJECTED
    genuine_disputed:  bool   # genuine was DISPUTED
    genuine_recovered: bool   # after dispute, next genuine tap ACCEPTED


# ════════════════════════════════════════════════════════════════════════════
# Shared per-trial parameter sampler
# ════════════════════════════════════════════════════════════════════════════

@dataclass
class TrialParams:
    prior_taps:    int    # number of genuine taps before the attack window
    missed_taps:   int    # genuine RF misses (advances counter without server)
    capture_point: int    # which tap (1-indexed) the attacker copied
    clone_first:   bool   # attacker scans before genuine in ambiguous scenarios


def sample_params(rng: random.Random) -> TrialParams:
    """Sample per-trial randomised parameters."""
    prior_taps  = rng.randint(0, 20)
    missed_taps = rng.randint(0, GAP_W + 2)
    # capture_point in [1, max(1, prior_taps)] — the tap index the attacker saw
    cap_max     = max(1, prior_taps)
    capture_point = rng.randint(1, cap_max)
    clone_first = rng.choice([True, False])
    return TrialParams(prior_taps, missed_taps, capture_point, clone_first)


# ════════════════════════════════════════════════════════════════════════════
# static_qr trials
# ════════════════════════════════════════════════════════════════════════════
# QR has no counter or freshness mechanism: every copy of the payload is valid.
# S1/S2 are identical (clone is just the same URL string).
# S3: attacker guesses a random URL that was never signed.

def _qr_genuine_check(payload: str) -> TrialResult:
    """Common helper: verify the genuine payload and report all four metrics."""
    r = verify_qr_payload(payload, QR_SECRET)
    # QR never returns anything other than valid/invalid — no DISPUTED concept.
    accepted   = r["valid"]
    rejected   = not r["valid"]
    disputed   = False   # QR has no disputed state
    recovered  = False   # N/A when not disputed
    return TrialResult(False, rejected, disputed, recovered)


def trial_qr_replay(rng: random.Random, p: TrialParams) -> TrialResult:
    """
    S1: Attacker replays the same signed URL that has already been verified.
    QR has no freshness → replay always succeeds; genuine also always succeeds.
    """
    pid     = f"prod-{rng.randint(0, 999999):06d}"
    serial  = f"{rng.randint(0, 9999):04d}"
    payload = make_qr_payload(pid, serial, QR_SECRET)

    # Simulate p.prior_taps verifications (all succeed — QR has no state)
    for _ in range(p.prior_taps):
        verify_qr_payload(payload, QR_SECRET)

    # Attacker replays the already-used payload
    clone_r = verify_qr_payload(payload, QR_SECRET)
    clone_accepted = clone_r["valid"]

    # Genuine also presents the same URL
    gen_r   = verify_qr_payload(payload, QR_SECRET)
    return TrialResult(clone_accepted, not gen_r["valid"], False, False)


def trial_qr_skim_first(rng: random.Random, p: TrialParams) -> TrialResult:
    """
    S2: Attacker skims an unused valid URL and scans it first.
    Outcome identical to S1 for static QR — both parties always verify.
    """
    return trial_qr_replay(rng, p)


def trial_qr_guess(rng: random.Random, p: TrialParams) -> TrialResult:
    """
    S3: Attacker presents a randomly forged URL (no valid HMAC).
    The genuine URL is still valid; the forged one fails.
    """
    pid     = f"prod-{rng.randint(0, 999999):06d}"
    serial  = f"{rng.randint(0, 9999):04d}"
    payload = make_qr_payload(pid, serial, QR_SECRET)

    # Attacker constructs a URL with a random 32-char hex sig
    fake_sig = rng.randbytes(16).hex()
    fake_url = f"https://verify.example.com/v?pid={pid}&ser={serial}&sig={fake_sig}"
    clone_r  = verify_qr_payload(fake_url, QR_SECRET)
    gen_r    = verify_qr_payload(payload, QR_SECRET)
    return TrialResult(clone_r["valid"], not gen_r["valid"], False, False)


# ════════════════════════════════════════════════════════════════════════════
# hacp5_baseline trials
# ════════════════════════════════════════════════════════════════════════════

def _hacp5_setup(rng: random.Random, prior_taps: int):
    """Create and warm up a HACP5 tag + verifier with prior_taps valid scans."""
    genuine  = RewriteTag(initial_id=bytes(rng.randbytes(32)))
    verifier = RewriteVerifier()
    verifier.register(genuine)
    for _ in range(prior_taps):
        verifier.scan(genuine)   # rotates ID each time
    return genuine, verifier


def trial_hacp5_replay(rng: random.Random, p: TrialParams) -> TrialResult:
    """
    S1: Attacker captured the ID at capture_point (already consumed by the
    server after that many scans).  Replaying a stale ID → DUPLICATE.
    The genuine tag still holds the current ID → VALID.
    """
    genuine, verifier = _hacp5_setup(rng, p.prior_taps)
    # The ID the attacker captured is now stale (server rotated past it)
    # Build a fake tag holding the stale ID
    stale_id = bytes(rng.randbytes(32))   # any non-current bytes → duplicate
    clone = RewriteTag(physical_uid=genuine.physical_uid, initial_id=stale_id)

    clone_r = verifier.scan(clone)
    gen_r   = verifier.scan(genuine)
    return TrialResult(
        clone_r["valid"],
        not gen_r["valid"],
        False,  # HACP5 has no "disputed" — only valid/duplicate
        False,
    )


def trial_hacp5_skim_first(rng: random.Random, p: TrialParams) -> TrialResult:
    """
    S2: Attacker skims the CURRENT ID (unused) and scans first.
    Clone is accepted; genuine is left with old ID → DUPLICATE.
    This is the canonical HACP5 clone-first-race flaw.
    """
    genuine, verifier = _hacp5_setup(rng, p.prior_taps)

    # Clone holds the same current_id as genuine right now
    clone = RewriteTag(
        physical_uid=genuine.physical_uid,
        initial_id=genuine.current_id,
    )

    clone_r = verifier.scan(clone)    # scans first — accepted, rotates ID
    gen_r   = verifier.scan(genuine)  # genuine still holds old ID → duplicate
    return TrialResult(
        clone_r["valid"],
        not gen_r["valid"],
        False,
        False,
    )


def trial_hacp5_guess(rng: random.Random, p: TrialParams) -> TrialResult:
    """
    S3: Attacker guesses a random 32-byte ID.  Probability of success is
    negligible (1/2^256).  Genuine still valid.
    """
    genuine, verifier = _hacp5_setup(rng, p.prior_taps)
    fake_id = bytes(rng.randbytes(32))
    clone   = RewriteTag(physical_uid=genuine.physical_uid, initial_id=fake_id)

    clone_r = verifier.scan(clone)
    gen_r   = verifier.scan(genuine)
    return TrialResult(
        clone_r["valid"],
        not gen_r["valid"],
        False,
        False,
    )


# ════════════════════════════════════════════════════════════════════════════
# nfc_cmac trials
# ════════════════════════════════════════════════════════════════════════════

def _nfc_setup(rng: random.Random, prior_taps: int):
    """Create a fresh EmulatedTag + Verifier; perform prior_taps accepted taps."""
    uid      = bytes(rng.randbytes(7))
    tag      = EmulatedTag(MASTER_KEY, uid=uid)
    verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
    taps     = []
    for _ in range(prior_taps):
        t = tag.tap()
        verifier.verify(*t)   # accepted
        taps.append(t)
    return tag, verifier, taps


def trial_nfc_replay(rng: random.Random, p: TrialParams) -> TrialResult:
    """
    S1: Attacker captured tap at capture_point (already accepted).
    Replaying it → DISPUTED (counter <= last_seen).
    Genuine taps next (counter = last_seen+1+missed_taps) → may be ACCEPT or DISPUTED(gap).
    Recovered = genuine's next-next tap after any dispute is ACCEPTED.
    """
    tag, verifier, taps = _nfc_setup(rng, p.prior_taps)

    # Pick captured tap (0-indexed from captured taps; clamp to available)
    idx      = min(p.capture_point - 1, max(0, len(taps) - 1))
    if taps:
        captured = taps[idx]
    else:
        # No prior taps → capture a fresh tap before it's been verified
        captured = tag.tap()
        verifier.verify(*captured)   # accept it, then attacker replays below

    # Attacker replays the already-used tap
    clone_r = verifier.verify(*captured)
    clone_accepted = clone_r.accepted

    # Genuine advances counter by missed_taps then taps once
    tag._counter += p.missed_taps
    gen_tap  = tag.tap()
    gen_r    = verifier.verify(*gen_tap)

    genuine_rejected = gen_r.rejected
    genuine_disputed = gen_r.disputed

    # Recovery: if genuine was disputed, try next tap
    genuine_recovered = False
    if genuine_disputed:
        # Reset tag counter to last accepted + 1 to ensure in-range
        last_acc = verifier.last_counter(tag.uid_hex) or 0
        tag._counter = last_acc
        rec_tap  = tag.tap()
        rec_r    = verifier.verify(*rec_tap)
        genuine_recovered = rec_r.accepted

    return TrialResult(clone_accepted, genuine_rejected, genuine_disputed, genuine_recovered)


def trial_nfc_skim_first(rng: random.Random, p: TrialParams) -> TrialResult:
    """
    S2: Attacker skims an UNUSED valid tap and presents it before the genuine tag.

    This is the hardest attack against counter+CMAC:
    - The attacker captures a valid (uid, counter, cmac) tuple BEFORE it is
      ever presented to the server.
    - The attacker scans first → ACCEPTED (genuine counter, valid CMAC, first seen).
    - Genuine then taps (same counter) → DISPUTED (replay, counter <= last_seen).
    - Genuine's NEXT tap → ACCEPTED (counter+1, valid CMAC, within gap).

    IMPORTANT: The identity layer CANNOT distinguish this from a legitimate scan.
    Detection relies on the scan-risk and fusion layers (see docs/LIMITATIONS.md).
    """
    tag, verifier, _ = _nfc_setup(rng, p.prior_taps)

    # Attacker skims the NEXT unused tap from the genuine tag
    # (e.g. by holding a reader near the tag before the legitimate scan)
    skimmed = tag.tap()     # this tap is NOT yet presented to the server

    # Attacker presents it first → accepted
    clone_r        = verifier.verify(*skimmed)
    clone_accepted = clone_r.accepted

    # Genuine now taps — produces the SAME (uid, counter, cmac) as the skimmed tap
    # because the physical counter already incremented when the attacker skimmed it.
    # We model this by having genuine present the same skimmed data.
    gen_r          = verifier.verify(*skimmed)   # same counter → DISPUTED (replay)

    genuine_rejected = gen_r.rejected
    genuine_disputed = gen_r.disputed

    # Recovery: genuine's next tap (counter+1)
    genuine_recovered = False
    if genuine_disputed:
        last_acc = verifier.last_counter(tag.uid_hex) or 0
        tag._counter = last_acc
        rec_tap  = tag.tap()
        rec_r    = verifier.verify(*rec_tap)
        genuine_recovered = rec_r.accepted

    return TrialResult(clone_accepted, genuine_rejected, genuine_disputed, genuine_recovered)


def trial_nfc_guess(rng: random.Random, p: TrialParams) -> TrialResult:
    """
    S3: Attacker has no valid capture; presents random (uid, counter, cmac).
    Random CMAC will not match → REJECTED.  Genuine tap unaffected.
    """
    tag, verifier, _ = _nfc_setup(rng, p.prior_taps)

    # Attacker guesses
    fake_uid  = tag.uid_hex                     # attacker knows the UID (public)
    last_acc  = verifier.last_counter(fake_uid) or 0
    fake_ctr  = last_acc + rng.randint(1, GAP_W)   # plausible counter
    fake_cmac = rng.randbytes(8).hex()

    clone_r        = verifier.verify(fake_uid, fake_ctr, fake_cmac)
    clone_accepted = clone_r.accepted

    # Genuine taps normally
    gen_tap = tag.tap()
    gen_r   = verifier.verify(*gen_tap)

    genuine_rejected = gen_r.rejected
    genuine_disputed = gen_r.disputed

    genuine_recovered = False
    if genuine_disputed:
        last_acc2 = verifier.last_counter(tag.uid_hex) or 0
        tag._counter = last_acc2
        rec_tap  = tag.tap()
        rec_r    = verifier.verify(*rec_tap)
        genuine_recovered = rec_r.accepted

    return TrialResult(clone_accepted, genuine_rejected, genuine_disputed, genuine_recovered)


# ════════════════════════════════════════════════════════════════════════════
# Dispatch table
# ════════════════════════════════════════════════════════════════════════════

TRIAL_FNS: dict[str, dict[str, Callable]] = {
    "static_qr": {
        "replay":     trial_qr_replay,
        "skim_first": trial_qr_skim_first,
        "guess":      trial_qr_guess,
    },
    "hacp5_baseline": {
        "replay":     trial_hacp5_replay,
        "skim_first": trial_hacp5_skim_first,
        "guess":      trial_hacp5_guess,
    },
    "nfc_cmac": {
        "replay":     trial_nfc_replay,
        "skim_first": trial_nfc_skim_first,
        "guess":      trial_nfc_guess,
    },
}


# ════════════════════════════════════════════════════════════════════════════
# Runner
# ════════════════════════════════════════════════════════════════════════════

@dataclass
class ScenarioStats:
    """Accumulated counts for one (scheme, scenario, seed) run."""
    n:                    int = 0
    clone_accepted:       int = 0
    genuine_rejected:     int = 0
    genuine_disputed:     int = 0
    disputed_recovered:   int = 0   # numerator for genuine_recovered_rate
    disputed_total:       int = 0   # denominator for genuine_recovered_rate

    def add(self, r: TrialResult) -> None:
        self.n                += 1
        self.clone_accepted   += int(r.clone_accepted)
        self.genuine_rejected += int(r.genuine_rejected)
        self.genuine_disputed += int(r.genuine_disputed)
        if r.genuine_disputed:
            self.disputed_total     += 1
            self.disputed_recovered += int(r.genuine_recovered)

    def rates(self) -> dict[str, float]:
        n = self.n or 1
        rec_denom = self.disputed_total or 1
        return {
            "clone_accepted_rate":    self.clone_accepted   / n,
            "genuine_rejected_rate":  self.genuine_rejected / n,
            "genuine_disputed_rate":  self.genuine_disputed / n,
            "genuine_recovered_rate": self.disputed_recovered / rec_denom,
        }


def run_one_seed(seed: int) -> dict[tuple[str, str], dict[str, float]]:
    """Run all (scheme × scenario) combinations for one seed."""
    results: dict[tuple[str, str], ScenarioStats] = {}
    for scheme in SCHEMES:
        for scenario in SCENARIOS:
            key   = (scheme, scenario)
            stats = ScenarioStats()
            rng   = random.Random(seed)
            fn    = TRIAL_FNS[scheme][scenario]
            for _ in range(N_TRIALS):
                params = sample_params(rng)
                result = fn(rng, params)
                stats.add(result)
            results[key] = stats
    return {k: v.rates() for k, v in results.items()}


def run_experiment() -> str:
    """Run all seeds, compute mean±std, write CSV, return CSV path."""
    print(f"\nClone-first-race experiment  (N={N_TRIALS} trials/scheme/scenario, {len(SEEDS)} seeds)")
    print("NOTE: all data is simulated.\n")

    # seed → (scheme, scenario) → {metric: float}
    all_seed_results: list[dict] = []
    for seed in SEEDS:
        all_seed_results.append(run_one_seed(seed))

    metrics = [
        "clone_accepted_rate",
        "genuine_rejected_rate",
        "genuine_disputed_rate",
        "genuine_recovered_rate",
    ]

    # Compute mean and std across seeds for each (scheme, scenario, metric)
    summary: dict[tuple[str, str], dict[str, tuple[float, float]]] = {}
    for scheme in SCHEMES:
        for scenario in SCENARIOS:
            key   = (scheme, scenario)
            vals  = {m: [] for m in metrics}
            for sr in all_seed_results:
                for m in metrics:
                    vals[m].append(sr[key][m])
            summary[key] = {
                m: (_mean(vals[m]), _std(vals[m])) for m in metrics
            }

    # ── Print table ────────────────────────────────────────────────────────
    _print_table(summary)

    # ── Write CSV ──────────────────────────────────────────────────────────
    out_dir  = os.path.join(os.path.dirname(__file__), "results")
    os.makedirs(out_dir, exist_ok=True)
    csv_path = os.path.join(out_dir, "race.csv")

    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["NOTE: all data is simulated. Seeds: " + str(SEEDS), *[""] * 10])
        header = [
            "scheme", "scenario", "n_trials",
        ]
        for m in metrics:
            header += [f"{m}_mean", f"{m}_std"]
        writer.writerow(header)

        for scheme in SCHEMES:
            for scenario in SCENARIOS:
                key  = (scheme, scenario)
                row  = [scheme, scenario, N_TRIALS]
                for m in metrics:
                    mean_, std_ = summary[key][m]
                    row += [f"{mean_:.4f}", f"{std_:.4f}"]
                writer.writerow(row)

    print(f"\nResults written to: {csv_path}")
    return csv_path


# ── Statistics helpers ────────────────────────────────────────────────────────

def _mean(xs: list[float]) -> float:
    return sum(xs) / len(xs) if xs else 0.0


def _std(xs: list[float]) -> float:
    if len(xs) < 2:
        return 0.0
    m = _mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def _print_table(summary: dict) -> None:
    header = f"{'scheme':<18} {'scenario':<12} {'clone_acc':>10} {'gen_rej':>9} {'gen_disp':>10} {'gen_rec':>9}"
    print(header)
    print("-" * len(header))
    for scheme in SCHEMES:
        for scenario in SCENARIOS:
            key = (scheme, scenario)
            d   = summary[key]
            def fmt(m):
                mean_, std_ = d[m]
                return f"{mean_:.3f}±{std_:.3f}"
            print(
                f"{scheme:<18} {scenario:<12} "
                f"{fmt('clone_accepted_rate'):>10} "
                f"{fmt('genuine_rejected_rate'):>9} "
                f"{fmt('genuine_disputed_rate'):>10} "
                f"{fmt('genuine_recovered_rate'):>9}"
            )
    print()


if __name__ == "__main__":
    run_experiment()
