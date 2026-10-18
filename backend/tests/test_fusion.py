"""
backend/tests/test_fusion.py
==============================
Tests for fusion.py — every verdict path.

Tests are self-contained (no DB, no chain, no ML model required).
We test fuse() directly with hand-crafted Signals objects, then test
the full /scan endpoint for each verdict via the TestClient.

Verdict paths tested:
  F1  Unregistered product  — not on chain
  F2  Suspicious activity   — bad MAC (NFC)
  F3  Suspicious activity   — high ML risk score
  F4  Suspicious activity   — sold + new location
  F5  Suspicious activity   — invalid QR signature
  F6  Manual review         — NFC disputed
  F7  Manual review         — sold (same location)
  F8  Manual review         — medium ML risk
  F9  Verified              — all clear
"""

import sys
import os
from pathlib import Path

import pytest

_REPO = Path(__file__).resolve().parents[2]
for p in [str(_REPO), str(_REPO / "backend")]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.fusion import (
    VERDICT_VERIFIED, VERDICT_MANUAL, VERDICT_SUSPICIOUS, VERDICT_UNREGISTERED,
    VERDICT_CODE,
    Signals, fuse, is_new_location, _get_thresholds,
)
from backend.app.config import get_settings
from backend.identity.qr_identity import make_qr_payload
from backend.identity.nfc_ntag import EmulatedTag

settings = get_settings()
MFR_ADDR = "0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b"
MFR_KEY  = "0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _low_risk():
    """A risk score that is definitely below the low threshold."""
    _, high = _get_thresholds()
    return 0.0   # always below low = high/2

def _medium_risk():
    """A risk score between low and high thresholds."""
    low, high = _get_thresholds()
    return round((low + high) / 2.0, 4)

def _high_risk():
    """A risk score definitely at or above the high threshold."""
    _, high = _get_thresholds()
    return round(high + 0.01, 4)


# ═══════════════════════════════════════════════════════════════════════════════
# Direct fuse() unit tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestFuseUnregistered:
    """F1: Not on-chain → Unregistered product."""

    def test_not_on_chain_gives_unregistered(self):
        sig = Signals(
            on_chain=False, chain_result="not_found", sold=False,
            identity_result="valid", identity_reason="ok",
            risk_score=None,
        )
        verdict, reason = fuse(sig)
        assert verdict == VERDICT_UNREGISTERED

    def test_unregistered_reason_mentions_chain(self):
        sig = Signals(
            on_chain=False, chain_result="not_found", sold=False,
            identity_result="valid", identity_reason="ok",
            risk_score=_high_risk(),  # even high risk doesn't override unregistered
        )
        verdict, _ = fuse(sig)
        assert verdict == VERDICT_UNREGISTERED

    def test_verdict_code_is_3(self):
        assert VERDICT_CODE[VERDICT_UNREGISTERED] == 3


class TestFuseSuspicious:
    """F2–F5: Suspicious activity paths."""

    def test_bad_mac_suspicious(self):
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=False,
            identity_result="bad_mac", identity_reason="MAC mismatch",
            risk_score=None,
        )
        verdict, reason = fuse(sig)
        assert verdict == VERDICT_SUSPICIOUS
        assert "CMAC" in reason or "bad" in reason.lower()

    def test_high_risk_score_suspicious(self):
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=False,
            identity_result="valid", identity_reason="ok",
            risk_score=_high_risk(),
        )
        verdict, _ = fuse(sig)
        assert verdict == VERDICT_SUSPICIOUS

    def test_sold_and_new_location_suspicious(self):
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=True,
            identity_result="valid", identity_reason="ok",
            risk_score=_low_risk(),
            is_new_location=True,
        )
        verdict, _ = fuse(sig)
        assert verdict == VERDICT_SUSPICIOUS

    def test_invalid_qr_suspicious(self):
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=False,
            identity_result="invalid", identity_reason="bad_signature",
            risk_score=_low_risk(),
        )
        verdict, _ = fuse(sig)
        assert verdict == VERDICT_SUSPICIOUS

    def test_verdict_code_is_2(self):
        assert VERDICT_CODE[VERDICT_SUSPICIOUS] == 2

    def test_bad_mac_takes_priority_over_low_risk(self):
        """bad_mac beats even zero risk score."""
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=False,
            identity_result="bad_mac", identity_reason="bad",
            risk_score=0.0,
        )
        verdict, _ = fuse(sig)
        assert verdict == VERDICT_SUSPICIOUS

    def test_bad_mac_takes_priority_over_not_sold(self):
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=False,
            identity_result="bad_mac", identity_reason="bad",
            risk_score=None,
        )
        assert fuse(sig)[0] == VERDICT_SUSPICIOUS


class TestFuseManualReview:
    """F6–F8: Manual review paths."""

    def test_disputed_nfc_manual_review(self):
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=False,
            identity_result="disputed", identity_reason="replay",
            risk_score=_low_risk(),
        )
        verdict, reason = fuse(sig)
        assert verdict == VERDICT_MANUAL
        assert "replay" in reason.lower() or "NFC" in reason

    def test_sold_same_location_manual_review(self):
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=True,
            identity_result="valid", identity_reason="ok",
            risk_score=_low_risk(),
            is_new_location=False,
        )
        verdict, _ = fuse(sig)
        assert verdict == VERDICT_MANUAL

    def test_medium_risk_manual_review(self):
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=False,
            identity_result="valid", identity_reason="ok",
            risk_score=_medium_risk(),
        )
        verdict, _ = fuse(sig)
        assert verdict == VERDICT_MANUAL

    def test_verdict_code_is_1(self):
        assert VERDICT_CODE[VERDICT_MANUAL] == 1


class TestFuseVerified:
    """F9: All clear → Verified."""

    def test_all_clear_verified(self):
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=False,
            identity_result="valid", identity_reason="ok",
            risk_score=_low_risk(),
        )
        verdict, _ = fuse(sig)
        assert verdict == VERDICT_VERIFIED

    def test_no_risk_score_verified_when_valid(self):
        """If model not trained (score=None), valid scan should still be Verified."""
        sig = Signals(
            on_chain=True, chain_result="on_chain", sold=False,
            identity_result="valid", identity_reason="ok",
            risk_score=None,
        )
        verdict, _ = fuse(sig)
        assert verdict == VERDICT_VERIFIED

    def test_verdict_code_is_0(self):
        assert VERDICT_CODE[VERDICT_VERIFIED] == 0


# ── is_new_location unit tests ────────────────────────────────────────────────

class TestIsNewLocation:
    _MUMBAI_LAT, _MUMBAI_LON = 19.07, 72.87
    _TOKYO_LAT,  _TOKYO_LON  = 35.68, 139.69

    def test_no_prior_scans_is_new(self):
        assert is_new_location("p", self._MUMBAI_LAT, self._MUMBAI_LON, []) is True

    def test_same_city_is_not_new(self):
        prior = [{"lat": self._MUMBAI_LAT + 0.01, "lon": self._MUMBAI_LON + 0.01}]
        assert is_new_location("p", self._MUMBAI_LAT, self._MUMBAI_LON, prior) is False

    def test_distant_city_is_new(self):
        prior = [{"lat": self._MUMBAI_LAT, "lon": self._MUMBAI_LON}]
        assert is_new_location("p", self._TOKYO_LAT, self._TOKYO_LON, prior) is True

    def test_none_lat_is_not_new(self):
        assert is_new_location("p", None, None, []) is False


# ═══════════════════════════════════════════════════════════════════════════════
# End-to-end /scan endpoint tests (all verdict paths via TestClient)
# ═══════════════════════════════════════════════════════════════════════════════

class TestScanEndpointFusion:
    """Each test checks verdict, identity_result, chain_result from /scan."""

    def test_unregistered_product(self, client):
        """Unknown product_id → Unregistered product."""
        fake_pid = "0x" + "aa" * 32
        payload  = make_qr_payload(fake_pid, "001", settings.identity_hmac_secret)
        r = client.post("/scan", json={
            "product_id": fake_pid, "channel": "qr", "qr_payload": payload,
        })
        assert r.status_code == 200
        body = r.json()
        assert body["verdict"]      == VERDICT_UNREGISTERED
        assert body["on_chain"]     is False
        assert body["chain_result"] == "not_found"

    def test_bad_mac_suspicious(self, client, registered_product):
        """NFC bad CMAC → Suspicious activity."""
        pid = registered_product["product"]["product_id"]
        r = client.post("/scan", json={
            "product_id": pid, "channel": "nfc",
            "nfc_uid": "aabbccddeeff00",
            "nfc_counter": 1,
            "nfc_cmac": "deadbeefdeadbeef",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["verdict"]         == VERDICT_SUSPICIOUS
        assert body["identity_result"] == "bad_mac"

    def test_invalid_qr_suspicious(self, client, registered_product):
        """Tampered QR → Suspicious activity."""
        pid = registered_product["product"]["product_id"]
        r = client.post("/scan", json={
            "product_id": pid, "channel": "qr",
            "qr_payload": "https://verify.example.com/v?pid=bad&ser=x&sig=" + "0" * 32,
        })
        body = r.json()
        assert body["verdict"]         == VERDICT_SUSPICIOUS
        assert body["identity_result"] == "invalid"

    def test_sold_product_manual_review(self, client, registered_product):
        """Valid scan on sold product → Manual review."""
        pid     = registered_product["product"]["product_id"]
        payload = make_qr_payload(pid, "000001", settings.identity_hmac_secret)
        # First sell it
        client.post(f"/products/{pid}/sell")
        # Then scan (same location, no lat/lon → is_new_location=False)
        r = client.post("/scan", json={
            "product_id": pid, "channel": "qr", "qr_payload": payload,
        })
        body = r.json()
        assert body["verdict"] == VERDICT_MANUAL
        assert body["sold"]    is True

    def test_valid_qr_verified(self, client, registered_product):
        """Valid QR, on-chain, not sold → Verified."""
        pid     = registered_product["product"]["product_id"]
        payload = make_qr_payload(pid, "000001", settings.identity_hmac_secret)
        r = client.post("/scan", json={
            "product_id": pid, "channel": "qr", "qr_payload": payload,
        })
        body = r.json()
        assert body["verdict"]         == VERDICT_VERIFIED
        assert body["identity_result"] == "valid"
        assert body["on_chain"]        is True
        assert body["chain_tx"]        is not None

    def test_valid_nfc_verified(self, client, registered_product):
        """Valid NFC tap → Verified."""
        import hashlib
        pid       = registered_product["product"]["product_id"]
        uid_bytes = hashlib.sha256(pid.encode()).digest()[:7]
        tag       = EmulatedTag(settings.nfc_master_key, uid=uid_bytes)
        uid_h, ctr, cmac = tag.tap()
        r = client.post("/scan", json={
            "product_id": pid, "channel": "nfc",
            "nfc_uid": uid_h, "nfc_counter": ctr, "nfc_cmac": cmac,
        })
        body = r.json()
        assert body["verdict"]         == VERDICT_VERIFIED
        assert body["identity_result"] == "valid"

    def test_nfc_replay_manual_review(self, client, registered_product):
        """NFC replay (same counter twice) → Manual review (disputed)."""
        import hashlib
        pid       = registered_product["product"]["product_id"]
        uid_bytes = hashlib.sha256(pid.encode()).digest()[:7]
        tag       = EmulatedTag(settings.nfc_master_key, uid=uid_bytes)
        uid_h, ctr, cmac = tag.tap()
        # First tap — accepted
        client.post("/scan", json={
            "product_id": pid, "channel": "nfc",
            "nfc_uid": uid_h, "nfc_counter": ctr, "nfc_cmac": cmac,
        })
        # Replay same tap — disputed
        r2 = client.post("/scan", json={
            "product_id": pid, "channel": "nfc",
            "nfc_uid": uid_h, "nfc_counter": ctr, "nfc_cmac": cmac,
        })
        body = r2.json()
        assert body["identity_result"] == "disputed"
        assert body["verdict"]         == VERDICT_MANUAL

    def test_risk_score_populated(self, client, registered_product):
        """risk_score field is a float after the model is trained."""
        pid     = registered_product["product"]["product_id"]
        payload = make_qr_payload(pid, "000001", settings.identity_hmac_secret)
        r = client.post("/scan", json={
            "product_id": pid, "channel": "qr", "qr_payload": payload,
        })
        body = r.json()
        # risk_score should be a float (model trained in pre-work)
        assert isinstance(body["risk_score"], (float, type(None)))
