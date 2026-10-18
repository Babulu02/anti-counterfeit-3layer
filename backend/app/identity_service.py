"""
backend/app/identity_service.py
================================
Thin wrappers around /backend/identity that adapt QR / NFC calls
to the data shapes the API receives.

Returns a uniform dict:
    {
        "result":   "valid" | "invalid" | "disputed" | "bad_mac",
        "reason":   str,
        "product_id": str | None,   # from QR only
        "serial":   str | None,
    }
"""

import os, sys
# Ensure the repo root is importable when this module is imported
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from backend.identity.qr_identity import verify_qr_payload
from backend.identity.nfc_ntag import Verifier, Outcome, DEFAULT_GAP
from .config import get_settings

_settings = get_settings()

# One global NFC verifier — stores last-seen counters in memory.
# In production this would persist state to the DB; for Phase 3 we keep
# it simple and note the limitation in docs/LIMITATIONS.md.
_nfc_verifier: Verifier | None = None


def _get_nfc_verifier() -> Verifier:
    global _nfc_verifier
    if _nfc_verifier is None:
        _nfc_verifier = Verifier(_settings.nfc_master_key, gap_tolerance=DEFAULT_GAP)
    return _nfc_verifier


def reset_nfc_verifier() -> None:
    """Reset the in-memory NFC verifier (used in tests to get a clean state)."""
    global _nfc_verifier
    _nfc_verifier = None


def verify_qr(payload: str) -> dict:
    """Verify a QR payload string."""
    r = verify_qr_payload(payload, _settings.identity_hmac_secret)
    if r["valid"]:
        return {
            "result":     "valid",
            "reason":     "QR signature valid",
            "product_id": r.get("product_id"),
            "serial":     r.get("serial"),
        }
    return {
        "result":     "invalid",
        "reason":     f"QR invalid: {r.get('reason', 'unknown')}",
        "product_id": None,
        "serial":     None,
    }


def verify_nfc(uid: str, counter: int, cmac: str) -> dict:
    """Verify an NFC tap (uid_hex, counter int, cmac_hex)."""
    verifier = _get_nfc_verifier()
    vr = verifier.verify(uid, counter, cmac)

    if vr.outcome == Outcome.ACCEPT:
        return {"result": "valid",    "reason": "NFC counter+CMAC valid", "product_id": None, "serial": None}
    elif vr.outcome == Outcome.DISPUTED:
        return {"result": "disputed", "reason": f"NFC disputed: {vr.reason}", "product_id": None, "serial": None}
    else:  # REJECT
        return {"result": "bad_mac",  "reason": f"NFC bad MAC: {vr.reason}", "product_id": None, "serial": None}
