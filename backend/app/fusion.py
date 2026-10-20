"""
backend/app/fusion.py
======================
Layer 3 — fusion verdict engine.

Combines four signals and returns one of four verdicts:
  "Unregistered product"  — product ID not on-chain
  "Suspicious activity"   — bad MAC, high ML risk, or already-sold + new location
  "Manual review"         — NFC disputed, medium ML risk, or already sold (same place)
  "Verified"              — on-chain + valid identity + low ML risk + not-sold

Verdict codes for logScan():
  0  Verified
  1  Manual review
  2  Suspicious activity
  3  Unregistered product

Risk thresholds (from thresholds.json, defaults if model not loaded):
  low    < LOW_RISK_DEFAULT   → no ML flag
  medium in [LOW, HIGH)       → Manual review flag
  high   >= HIGH_RISK_DEFAULT → Suspicious flag

All thresholds are chosen on the validation set only (Phase 4).
The fusion layer does NOT re-choose thresholds — it reads them from file.

IMPORTANT: the risk score is Optional[float]. If the ML model has not been
trained yet (artifacts missing), score_scan() returns None and the fusion
falls back to identity + chain signals only (graceful degradation).
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

# ── Verdict constants ─────────────────────────────────────────────────────────

VERDICT_VERIFIED     = "Verified"
VERDICT_MANUAL       = "Manual review"
VERDICT_SUSPICIOUS   = "Suspicious activity"
VERDICT_UNREGISTERED = "Unregistered product"

# Verdict → on-chain code for logScan()
VERDICT_CODE = {
    VERDICT_VERIFIED:     0,
    VERDICT_MANUAL:       1,
    VERDICT_SUSPICIOUS:   2,
    VERDICT_UNREGISTERED: 3,
}

# Risk-score thresholds used when thresholds.json can't be read
LOW_RISK_DEFAULT  = 0.30
HIGH_RISK_DEFAULT = 0.60


# ── Signals dataclass ─────────────────────────────────────────────────────────

@dataclass
class Signals:
    """Collected signals from all layers, passed to fuse()."""
    # Chain (Layer 1)
    on_chain:     bool        # product exists on-chain
    chain_result: str         # "on_chain" | "not_found"
    sold:         bool        # on-chain sold flag
    # Identity (Layer 1 / Phase 2)
    identity_result: str      # "valid" | "invalid" | "disputed" | "bad_mac"
    identity_reason: str
    # ML (Layer 2 / Phase 4)
    risk_score:   Optional[float]  # [0,1] or None
    # Contextual
    # Context
    is_new_location: bool = False  # scan location never seen for this product
    # Image signal (Phase 8 - optional 4th signal)
    image_similarity: Optional[float] = None
    image_result:     Optional[str]   = None  # "genuine" | "counterfeit" | "uncertain" | "absent"
    image_reason:     Optional[str]   = None


# ── Core fusion logic ─────────────────────────────────────────────────────────

def fuse(signals: Signals) -> tuple[str, str]:
    """
    Apply the fusion rules and return (verdict, plain-language reason).

    Rules (evaluated in priority order — first match wins):

    1. Not on-chain → Unregistered product
    2. Bad MAC (NFC key mismatch / random guess) → Suspicious activity
    3. High ML risk score → Suspicious activity
    4. Already sold AND scanned from a new location → Suspicious activity
       (sold + same location → Manual review, handled in rule 7)
    5. Invalid QR signature → Suspicious activity
    6. NFC counter disputed (replay / gap) → Manual review
    7. Already sold (any location) → Manual review
    8. Medium ML risk → Manual review
    9. Image visual mismatch (Phase 8 optional signal) → Manual review
    10. Everything else → Verified
    """
    # Load thresholds lazily (tolerates missing model — returns defaults)
    low_thresh, high_thresh = _get_thresholds()

    # ── Rule 1: not on-chain ─────────────────────────────────────────────────
    if not signals.on_chain:
        if signals.image_result == "counterfeit":
            detail = signals.image_reason or "deceptive counterfeit packaging detected"
            return (
                VERDICT_SUSPICIOUS,
                f"Product ID not found on-chain AND {detail} — confirmed counterfeit asset.",
            )
        return (
            VERDICT_UNREGISTERED,
            "Product ID not found on-chain — likely counterfeit or unregistered.",
        )

    # ── Rule 2: bad MAC ──────────────────────────────────────────────────────
    if signals.identity_result == "bad_mac":
        return (
            VERDICT_SUSPICIOUS,
            f"NFC authentication failed (bad CMAC) — cannot verify tag authenticity. "
            f"Detail: {signals.identity_reason}",
        )

    # ── Rule 3: high ML risk ─────────────────────────────────────────────────
    if signals.risk_score is not None and signals.risk_score >= high_thresh:
        return (
            VERDICT_SUSPICIOUS,
            f"ML risk model flagged this scan as high-risk "
            f"(score={signals.risk_score:.3f}, threshold={high_thresh:.3f}). "
            f"Possible attack patterns detected.",
        )

    # ── Rule 4: sold + new location ──────────────────────────────────────────
    if signals.sold and signals.is_new_location:
        return (
            VERDICT_SUSPICIOUS,
            "Product has been sold and is now being scanned from a new location — "
            "possible counterfeit in circulation.",
        )

    # ── Rule 5: invalid QR ───────────────────────────────────────────────────
    if signals.identity_result == "invalid":
        return (
            VERDICT_SUSPICIOUS,
            f"QR signature verification failed — payload may have been tampered. "
            f"Detail: {signals.identity_reason}",
        )

    # ── Rule 6: NFC disputed ─────────────────────────────────────────────────
    if signals.identity_result == "disputed":
        return (
            VERDICT_MANUAL,
            f"NFC counter anomaly detected ({signals.identity_reason}) — "
            f"possible replay or clone-first race. Genuine tag recoverable on next tap.",
        )

    # ── Rule 7: already sold ─────────────────────────────────────────────────
    if signals.sold:
        return (
            VERDICT_MANUAL,
            "Product has already been sold. Scan may be legitimate resale or "
            "a duplicated label — requires manual check.",
        )

    # ── Rule 8: medium ML risk ───────────────────────────────────────────────
    if signals.risk_score is not None and signals.risk_score >= low_thresh:
        return (
            VERDICT_MANUAL,
            f"ML risk model returned a medium risk score "
            f"(score={signals.risk_score:.3f}, threshold={low_thresh:.3f}). "
            f"Scan pattern is unusual but not conclusively malicious.",
        )

    # ── Rule 9: Image visual mismatch (Phase 8 optional signal) ──────────────
    if signals.image_result == "counterfeit":
        detail = signals.image_reason or (
            f"similarity={signals.image_similarity:.3f} below threshold"
            if signals.image_similarity is not None else "physical packaging anomaly"
        )
        return (
            VERDICT_MANUAL,
            f"Visual appearance mismatch ({detail}) — possible product swap, lookalike brand or counterfeit packaging.",
        )

    # ── Rule 10: all clear ───────────────────────────────────────────────────
    return (
        VERDICT_VERIFIED,
        "Product is on-chain, identity check passed, and scan pattern is normal.",
    )


# ── Threshold loader ──────────────────────────────────────────────────────────

def _get_thresholds() -> tuple[float, float]:
    """
    Return (low_risk_threshold, high_risk_threshold).
    Reads thresholds.json if available; falls back to module defaults.
    The ML threshold for "random_forest" is used as the high-risk boundary;
    half of that is used as the medium-risk boundary.
    """
    try:
        import json
        from pathlib import Path
        p = Path(__file__).resolve().parents[2] / "experiments" / "results" / "thresholds.json"
        if not p.exists():
            return LOW_RISK_DEFAULT, HIGH_RISK_DEFAULT
        with open(p) as f:
            t = json.load(f)
        high = float(t.get("random_forest", HIGH_RISK_DEFAULT))
        # Medium threshold = midpoint between 0 and the high threshold
        low  = round(high / 2.0, 4)
        return low, high
    except Exception:
        return LOW_RISK_DEFAULT, HIGH_RISK_DEFAULT


# ── Location helper ───────────────────────────────────────────────────────────

def is_new_location(product_id: str, lat: float | None, lon: float | None,
                    scan_history: list[dict], radius_km: float = 50.0) -> bool:
    """
    Return True if (lat, lon) has not been seen within radius_km of any
    previous scan of this product.  Returns False if lat/lon is None.

    Uses a simple haversine check against all prior scan locations.
    This is O(n) in scan count — acceptable for typical product scan counts.
    """
    if lat is None or lon is None:
        return False
    import math
    def _hav(la1, lo1, la2, lo2):
        R = 6371.0
        f1, f2 = math.radians(la1), math.radians(la2)
        df = math.radians(la2 - la1)
        dl = math.radians(lo2 - lo1)
        a  = math.sin(df/2)**2 + math.cos(f1)*math.cos(f2)*math.sin(dl/2)**2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    for row in scan_history:
        plat = row.get("lat")
        plon = row.get("lon")
        if plat is not None and plon is not None:
            if _hav(lat, lon, float(plat), float(plon)) <= radius_km:
                return False   # within known radius → not a new location
    return True   # no prior scan within radius → new location
