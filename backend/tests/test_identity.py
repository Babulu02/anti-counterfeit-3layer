"""
backend/tests/test_identity.py
================================
pytest tests for all three identity modules.

Groups
------
1.  QR — valid payload
2.  QR — tampered payload
3.  QR — cloned QR still verifies (documented weakness, asserted on purpose)
4.  QR — image generation produces a non-empty PNG
5.  NFC counter — normal consecutive taps accepted
6.  NFC counter — replay is DISPUTED (not REJECTED)
7.  NFC counter — gap tolerance: within W is accepted, over W is DISPUTED
8.  NFC counter — bad MAC is REJECTED
9.  NFC counter — CloneTag cannot produce a valid MAC for a new counter
10. NFC counter — clone-first race: genuine tag is NOT rejected; next tap ACCEPTED
11. NFC counter — gap reason is "gap", replay reason is "replay"
12. HACP5 baseline — normal scan (valid, ID rotated)
13. HACP5 baseline — double-scan same ID is duplicate
14. HACP5 baseline — clone-first race makes GENUINE tag fail (assert flaw)
15. HACP5 baseline — unknown UID is rejected
"""

import sys
import os
import io

import pytest

# Allow running from the repo root without installing the package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.identity.qr_identity import (
    make_qr_payload,
    verify_qr_payload,
    make_qr_image,
)
from backend.identity.nfc_ntag import (
    EmulatedTag,
    Verifier,
    CloneTag,
    Outcome,
    VerifyResult,
    DEFAULT_GAP,
)
from backend.identity.nfc_rewrite_baseline import RewriteTag, RewriteVerifier

# ── Shared fixtures ──────────────────────────────────────────────────────────

QR_SECRET     = b"test-hmac-secret-32-bytes-xxxxxX"   # 32 bytes
MASTER_KEY    = bytes.fromhex("00112233445566778899aabbccddeeff")  # 16 bytes
PRODUCT_ID    = "prod-abc-123"
SERIAL        = "001"
GAP_W         = 3   # small gap for tests so we don't need many taps


# ════════════════════════════════════════════════════════════════════════════
# 1–4  QR IDENTITY
# ════════════════════════════════════════════════════════════════════════════

class TestQRValid:
    """Group 1: valid payload round-trip."""

    def test_make_returns_string(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        assert isinstance(p, str)

    def test_payload_contains_product_id(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        assert PRODUCT_ID in p

    def test_payload_contains_serial(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        assert SERIAL in p

    def test_verify_returns_valid(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        result = verify_qr_payload(p, QR_SECRET)
        assert result["valid"] is True

    def test_verify_returns_correct_product_id(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        result = verify_qr_payload(p, QR_SECRET)
        assert result["product_id"] == PRODUCT_ID

    def test_verify_returns_correct_serial(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        result = verify_qr_payload(p, QR_SECRET)
        assert result["serial"] == SERIAL


class TestQRTampered:
    """Group 2: tampered payloads must be rejected."""

    def test_wrong_secret_rejected(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        result = verify_qr_payload(p, b"wrong-secret-bytes-32-xxxxxxxxxX")
        assert result["valid"] is False

    def test_modified_product_id_rejected(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        tampered = p.replace(PRODUCT_ID, "evil-product")
        result = verify_qr_payload(tampered, QR_SECRET)
        assert result["valid"] is False

    def test_modified_serial_rejected(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        tampered = p.replace(f"ser={SERIAL}", "ser=999")
        result = verify_qr_payload(tampered, QR_SECRET)
        assert result["valid"] is False

    def test_truncated_sig_rejected(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        # Remove last 4 chars of the sig parameter
        result = verify_qr_payload(p[:-4], QR_SECRET)
        assert result["valid"] is False

    def test_missing_sig_field_rejected(self):
        # Build a URL without a sig parameter
        result = verify_qr_payload(
            "https://verify.example.com/v?pid=abc&ser=001", QR_SECRET
        )
        assert result["valid"] is False

    def test_garbage_input_rejected(self):
        result = verify_qr_payload("not_a_url_at_all!!!", QR_SECRET)
        assert result["valid"] is False


class TestQRCloneWeakness:
    """
    Group 3: DOCUMENTED WEAKNESS — a cloned/photographed QR still verifies.

    This test is INTENTIONALLY asserting the flaw, not a bug.
    The static QR baseline is expected to accept clones; the ML layer
    (Phase 4) detects clone attacks via scan-pattern anomalies.
    """

    def test_clone_verifies_with_same_payload(self):
        """
        If an attacker photographs the QR and reads off the URL, they can
        present the exact same payload string and it WILL verify.
        This is the known weakness of static QR codes (see DECISIONS.md D-006).
        """
        original_payload = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        # Simulate "clone": attacker just copies the string
        cloned_payload = original_payload   # identical bytes
        result = verify_qr_payload(cloned_payload, QR_SECRET)
        # ASSERT TRUE — the clone verifies, demonstrating the flaw
        assert result["valid"] is True, (
            "Cloned QR should verify — this is the expected baseline weakness. "
            "If this fails, the clone detection logic has been incorrectly added "
            "to the QR module (it belongs in the ML layer)."
        )

    def test_two_independent_scans_both_valid(self):
        """Both the genuine and clone scanning the same payload both get valid."""
        p = make_qr_payload(PRODUCT_ID, "002", QR_SECRET)
        assert verify_qr_payload(p, QR_SECRET)["valid"] is True   # genuine
        assert verify_qr_payload(p, QR_SECRET)["valid"] is True   # clone


class TestQRImage:
    """Group 4: image generation."""

    def test_make_qr_image_returns_pil_image(self):
        from PIL import Image
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        img = make_qr_image(p)
        assert isinstance(img, Image.Image)

    def test_qr_image_is_non_empty(self):
        p = make_qr_payload(PRODUCT_ID, SERIAL, QR_SECRET)
        img = make_qr_image(p)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        assert buf.tell() > 0


# ════════════════════════════════════════════════════════════════════════════
# 5–11  NFC COUNTER + CMAC (our design)
# ════════════════════════════════════════════════════════════════════════════

class TestNFCNormalTaps:
    """Group 5: normal consecutive taps are all accepted."""

    def test_first_tap_accepted(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()
        result = verifier.verify(uid, ctr, cmac)
        assert result.accepted

    def test_three_consecutive_taps_all_accepted(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        for _ in range(3):
            uid, ctr, cmac = tag.tap()
            result = verifier.verify(uid, ctr, cmac)
            assert result.accepted, f"Tap {ctr} should be accepted, got {result}"

    def test_accepted_result_has_reason_ok(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()
        result = verifier.verify(uid, ctr, cmac)
        assert result.reason == "ok"

    def test_last_counter_updated_after_accept(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()
        verifier.verify(uid, ctr, cmac)
        assert verifier.last_counter(uid) == ctr


class TestNFCReplay:
    """Group 6: replay is DISPUTED (not rejected), does not block genuine tag."""

    def test_same_tap_twice_is_disputed(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()
        verifier.verify(uid, ctr, cmac)           # first scan: ACCEPT
        result = verifier.verify(uid, ctr, cmac)  # same data again: DISPUTED
        assert result.disputed

    def test_replay_reason_is_replay(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()
        verifier.verify(uid, ctr, cmac)
        result = verifier.verify(uid, ctr, cmac)
        assert result.reason == "replay"

    def test_after_replay_next_genuine_tap_accepted(self):
        """DISPUTED must not permanently block the tag."""
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()
        verifier.verify(uid, ctr, cmac)           # ACCEPT counter=1
        verifier.verify(uid, ctr, cmac)           # DISPUTED (replay)
        # Genuine tag taps again — counter=2 — must be ACCEPTED
        uid2, ctr2, cmac2 = tag.tap()
        result = verifier.verify(uid2, ctr2, cmac2)
        assert result.accepted, f"Genuine next tap should be ACCEPTED, got {result}"


class TestNFCGapTolerance:
    """Group 7: gap tolerance W."""

    def test_exact_gap_W_accepted(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()   # counter = 1
        verifier.verify(uid, ctr, cmac)
        # Manually advance tag counter by W (simulate W missed taps)
        tag._counter += GAP_W - 1   # will be GAP_W after next tap()
        uid2, ctr2, cmac2 = tag.tap()
        result = verifier.verify(uid2, ctr2, cmac2)
        assert result.accepted, f"Gap exactly W should be accepted, got {result}"

    def test_gap_over_W_is_disputed(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()
        verifier.verify(uid, ctr, cmac)
        # Jump counter by W+1
        tag._counter += GAP_W        # next tap() will be last+W+1
        uid2, ctr2, cmac2 = tag.tap()
        result = verifier.verify(uid2, ctr2, cmac2)
        assert result.disputed, f"Gap > W should be DISPUTED, got {result}"

    def test_gap_reason_is_gap(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()
        verifier.verify(uid, ctr, cmac)
        tag._counter += GAP_W
        uid2, ctr2, cmac2 = tag.tap()
        result = verifier.verify(uid2, ctr2, cmac2)
        assert result.reason == "gap"

    def test_after_gap_dispute_next_valid_tap_accepted(self):
        """Gap DISPUTED also must not permanently block the tag."""
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, cmac = tag.tap()
        verifier.verify(uid, ctr, cmac)       # last_seen = 1
        tag._counter += GAP_W                 # skip ahead too far
        uid2, ctr2, cmac2 = tag.tap()
        verifier.verify(uid2, ctr2, cmac2)    # DISPUTED; last_seen still = 1
        # Now tap normally (counter = last_seen + 1 = 2)
        tag._counter = verifier.last_counter(uid2)   # reset to last accepted
        uid3, ctr3, cmac3 = tag.tap()
        result = verifier.verify(uid3, ctr3, cmac3)
        assert result.accepted


class TestNFCBadMAC:
    """Group 8: bad CMAC is REJECTED (not disputed)."""

    def test_bad_mac_rejected(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, _ = tag.tap()
        bad_cmac = "deadbeefdeadbeef"  # 8 bytes but wrong value
        result = verifier.verify(uid, ctr, bad_cmac)
        assert result.rejected

    def test_bad_mac_reason(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, _ = tag.tap()
        result = verifier.verify(uid, ctr, "0000000000000000")
        assert result.reason == "bad_mac"

    def test_all_zeros_mac_rejected(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        uid, ctr, _ = tag.tap()
        result = verifier.verify(uid, ctr, "00" * 8)
        assert result.rejected


class TestNFCCloneCannotForgeMac:
    """Group 9: CloneTag cannot produce valid MAC for a new counter."""

    def test_clone_replay_accepted_before_genuine(self):
        """If clone scans first, the replay is accepted (clone wins the race)."""
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        tap = tag.tap()
        clone = CloneTag.from_tap(tap)
        # Clone scans first
        uid, ctr, cmac = clone.replay()
        result = verifier.verify(uid, ctr, cmac)
        assert result.accepted   # clone wins first scan

    def test_clone_cannot_advance_counter_with_valid_mac(self):
        """
        Clone tries to present counter+1 but uses the old CMAC — rejected.
        This proves the clone cannot advance without the key.
        """
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)
        tap = tag.tap()    # counter = 1
        clone = CloneTag.from_tap(tap)
        verifier.verify(*tap)   # genuine scanned first; last_seen = 1

        # Clone tries counter=2 with the counter=1 CMAC → bad_mac
        uid, ctr, cmac = clone.replay()
        result = verifier.verify(uid, ctr + 1, cmac)   # counter=2, wrong CMAC
        assert result.rejected


class TestNFCCloneFirstRace:
    """
    Group 10: clone-first race scenario.

    Clone is scanned BEFORE the genuine tag.
    After that, genuine tag taps → must be DISPUTED (not rejected).
    Then genuine tag taps again → must be ACCEPTED.
    This is the key advantage over HACP5: genuine tag is recoverable.
    """

    def test_genuine_not_permanently_rejected_after_clone_first(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)

        # Genuine taps once (counter = 1); clone copies it
        tap1 = tag.tap()
        clone = CloneTag.from_tap(tap1)

        # Clone scanned first
        verifier.verify(*clone.replay())       # ACCEPT (first seen, counter=1)

        # Genuine now presents counter=1 → DISPUTED (replay), NOT rejected
        result_genuine = verifier.verify(*tap1)
        assert result_genuine.disputed, (
            f"Genuine after clone-first should be DISPUTED, got {result_genuine}"
        )
        assert not result_genuine.rejected, "Genuine must not be REJECTED"

    def test_genuine_next_tap_accepted_after_clone_first(self):
        tag = EmulatedTag(MASTER_KEY)
        verifier = Verifier(MASTER_KEY, gap_tolerance=GAP_W)

        tap1 = tag.tap()
        clone = CloneTag.from_tap(tap1)

        verifier.verify(*clone.replay())   # clone first
        verifier.verify(*tap1)             # genuine: DISPUTED

        # Genuine taps again (counter = 2) → must be ACCEPTED
        tap2 = tag.tap()
        result = verifier.verify(*tap2)
        assert result.accepted, (
            f"Genuine second tap after clone-first race must be ACCEPTED, got {result}"
        )


# ════════════════════════════════════════════════════════════════════════════
# 12–15  HACP5 REWRITE BASELINE
# ════════════════════════════════════════════════════════════════════════════

class TestHACP5Normal:
    """Group 12: normal single scan rotates the ID."""

    def test_first_scan_is_valid(self):
        tag = RewriteTag()
        verifier = RewriteVerifier()
        verifier.register(tag)
        result = verifier.scan(tag)
        assert result["valid"] is True

    def test_first_scan_status_is_valid(self):
        tag = RewriteTag()
        verifier = RewriteVerifier()
        verifier.register(tag)
        result = verifier.scan(tag)
        assert result["status"] == "valid"

    def test_scan_count_increments(self):
        tag = RewriteTag()
        verifier = RewriteVerifier()
        verifier.register(tag)
        r1 = verifier.scan(tag)
        r2 = verifier.scan(tag)
        assert r1["scan_count"] == 1
        assert r2["scan_count"] == 2

    def test_id_rotated_after_scan(self):
        tag = RewriteTag()
        verifier = RewriteVerifier()
        verifier.register(tag)
        old_id = tag.current_id
        verifier.scan(tag)
        assert tag.current_id != old_id, "ID should rotate after a valid scan"

    def test_second_scan_with_new_id_valid(self):
        tag = RewriteTag()
        verifier = RewriteVerifier()
        verifier.register(tag)
        verifier.scan(tag)   # rotates ID
        result = verifier.scan(tag)
        assert result["valid"] is True


class TestHACP5DoubleScan:
    """Group 13: presenting the old ID after rotation is duplicate."""

    def test_old_id_after_rotation_is_duplicate(self):
        tag = RewriteTag()
        verifier = RewriteVerifier()
        verifier.register(tag)
        old_id = tag.current_id  # save old ID

        verifier.scan(tag)       # valid → ID rotated

        # Build a "stale clone" that still holds the old ID
        stale_clone = RewriteTag(physical_uid=tag.physical_uid, initial_id=old_id)
        result = verifier.scan(stale_clone)
        assert result["valid"] is False
        assert result["status"] == "duplicate"


class TestHACP5CloneFirstFlaw:
    """
    Group 14: CLONE-FIRST RACE — the genuine tag is wrongly rejected.

    This test ASSERTS THE KNOWN FLAW in the HACP5 baseline:
    if the clone is scanned first, the genuine tag becomes a "duplicate".
    This is expected behaviour for this baseline; it motivates our design.
    """

    def test_genuine_rejected_after_clone_first(self):
        """
        ⚠️  THIS TEST ASSERTS A FLAW IN THE HACP5 BASELINE.
        The genuine tag should NOT be rejected in a robust system.
        Our counter+CMAC design (nfc_ntag.py) fixes this.
        """
        genuine_tag = RewriteTag()
        verifier = RewriteVerifier()
        verifier.register(genuine_tag)

        # Attacker clones current ID before genuine is scanned
        clone_tag = RewriteTag(
            physical_uid=genuine_tag.physical_uid,
            initial_id=genuine_tag.current_id,   # same current_id as genuine
        )

        # Clone scanned first → VALID, ID rotates in the server DB
        clone_result = verifier.scan(clone_tag)
        assert clone_result["valid"] is True, "Clone should win the first scan"

        # Genuine tag still holds the OLD ID → server sees it as duplicate
        genuine_result = verifier.scan(genuine_tag)
        assert genuine_result["valid"] is False, (
            "HACP5 FLAW: genuine tag must be rejected after clone-first race. "
            "If this assertion fails, the flaw has been accidentally fixed."
        )
        assert genuine_result["status"] == "duplicate", (
            f"Expected status='duplicate', got {genuine_result['status']!r}"
        )

    def test_genuine_permanently_locked_out(self):
        """After clone-first, genuine stays locked out on subsequent scans too."""
        genuine_tag = RewriteTag()
        verifier = RewriteVerifier()
        verifier.register(genuine_tag)

        clone_tag = RewriteTag(
            physical_uid=genuine_tag.physical_uid,
            initial_id=genuine_tag.current_id,
        )
        verifier.scan(clone_tag)   # clone wins

        # Genuine tries three more times — all duplicates
        for _ in range(3):
            result = verifier.scan(genuine_tag)
            assert result["valid"] is False


class TestHACP5Unknown:
    """Group 15: unregistered UID is rejected."""

    def test_unknown_uid_rejected(self):
        verifier = RewriteVerifier()
        tag = RewriteTag()   # not registered
        result = verifier.scan(tag)
        assert result["valid"] is False
        assert result["status"] == "unknown"


# ════════════════════════════════════════════════════════════════════════════
# 16  RACE SCENARIOS (all three schemes × all three scenarios)
#     Tests the logic from experiments/identity_race.py at unit-test granularity.
# ════════════════════════════════════════════════════════════════════════════

import random as _random
import sys as _sys
import os as _os
_sys.path.insert(0, _os.path.join(_os.path.dirname(__file__), "..", ".."))
from experiments.identity_race import (
    sample_params,
    trial_qr_replay, trial_qr_skim_first, trial_qr_guess,
    trial_hacp5_replay, trial_hacp5_skim_first, trial_hacp5_guess,
    trial_nfc_replay, trial_nfc_skim_first, trial_nfc_guess,
    TrialResult,
)

# Fixed RNG and params helpers for deterministic unit tests
_SEED     = 42
_MK_QR    = b"experiment-hmac-secret-32-bytesX"
_MK_NFC   = bytes.fromhex("cafebabecafebabecafebabecafebabe")


def _rng():
    return _random.Random(_SEED)


def _params(prior_taps=3, missed_taps=0, capture_point=1, clone_first=True):
    from experiments.identity_race import TrialParams
    return TrialParams(prior_taps, missed_taps, capture_point, clone_first)


class TestRaceScenariosQR:
    """Group 16a: static_qr × all scenarios."""

    def test_qr_replay_genuine_never_rejected(self):
        """QR has no freshness — replay never rejects the genuine tag."""
        r = trial_qr_replay(_rng(), _params())
        assert not r.genuine_rejected

    def test_qr_replay_clone_always_accepted(self):
        """Replayed QR payload always verifies — documented baseline weakness."""
        r = trial_qr_replay(_rng(), _params())
        assert r.clone_accepted

    def test_qr_skim_first_genuine_never_rejected(self):
        r = trial_qr_skim_first(_rng(), _params())
        assert not r.genuine_rejected

    def test_qr_skim_first_clone_accepted(self):
        r = trial_qr_skim_first(_rng(), _params())
        assert r.clone_accepted

    def test_qr_guess_clone_rejected(self):
        """Random forged HMAC is rejected."""
        r = trial_qr_guess(_rng(), _params())
        assert not r.clone_accepted

    def test_qr_guess_genuine_not_rejected(self):
        r = trial_qr_guess(_rng(), _params())
        assert not r.genuine_rejected

    def test_qr_no_disputed_state(self):
        """QR has no disputed state — always False for all scenarios."""
        for fn in (trial_qr_replay, trial_qr_skim_first, trial_qr_guess):
            r = fn(_rng(), _params())
            assert not r.genuine_disputed


class TestRaceScenariosHACP5:
    """Group 16b: hacp5_baseline × all scenarios."""

    def test_hacp5_replay_stale_clone_rejected(self):
        """Replayed stale ID is duplicate — clone fails."""
        r = trial_hacp5_replay(_rng(), _params(prior_taps=3))
        assert not r.clone_accepted

    def test_hacp5_replay_genuine_accepted(self):
        """After stale-replay, genuine still holds current ID → valid."""
        r = trial_hacp5_replay(_rng(), _params(prior_taps=3))
        assert not r.genuine_rejected

    def test_hacp5_skim_first_clone_accepted(self):
        """Clone with current ID scans first → accepted."""
        r = trial_hacp5_skim_first(_rng(), _params())
        assert r.clone_accepted

    def test_hacp5_skim_first_genuine_rejected(self):
        """After clone-first, genuine has old ID → rejected as duplicate (known flaw)."""
        r = trial_hacp5_skim_first(_rng(), _params())
        assert r.genuine_rejected, (
            "HACP5 FLAW: genuine must be rejected after skim-first — "
            "this is the expected baseline flaw."
        )

    def test_hacp5_guess_clone_rejected(self):
        """Random 32-byte ID has negligible chance of matching."""
        # Run 20 trials; probability of accidental match ≈ 0
        rng = _random.Random(_SEED)
        for _ in range(20):
            p = sample_params(rng)
            r = trial_hacp5_guess(rng, p)
            assert not r.clone_accepted

    def test_hacp5_guess_genuine_not_rejected(self):
        """Random guess doesn't consume the current ID — genuine still valid."""
        r = trial_hacp5_guess(_rng(), _params())
        assert not r.genuine_rejected

    def test_hacp5_no_disputed_state(self):
        """HACP5 has no disputed state — only valid/duplicate."""
        for fn in (trial_hacp5_replay, trial_hacp5_skim_first, trial_hacp5_guess):
            r = fn(_rng(), _params(prior_taps=2))
            assert not r.genuine_disputed


class TestRaceScenariosNFCCMAC:
    """Group 16c: nfc_cmac × all scenarios."""

    def test_nfc_replay_clone_disputed(self):
        """Replayed (already-accepted) tap → DISPUTED, not accepted."""
        r = trial_nfc_replay(_rng(), _params(prior_taps=3, missed_taps=0))
        assert not r.clone_accepted

    def test_nfc_replay_genuine_not_rejected(self):
        """After replay attempt, genuine tap (within gap) is accepted."""
        r = trial_nfc_replay(_rng(), _params(prior_taps=3, missed_taps=0))
        assert not r.genuine_rejected

    def test_nfc_skim_first_clone_accepted(self):
        """
        Skimmed-and-presented-first valid tap is ACCEPTED.
        The identity layer alone CANNOT block this — see docs/LIMITATIONS.md §L-011.
        Detection requires scan-risk and fusion layers.
        """
        r = trial_nfc_skim_first(_rng(), _params())
        assert r.clone_accepted, (
            "Skimmed valid tap should be ACCEPTED by the identity layer. "
            "Blocking it requires the scan-risk / fusion layer (Phase 4/5)."
        )

    def test_nfc_skim_first_genuine_disputed_not_rejected(self):
        """
        After skim-first, genuine presents the same counter → DISPUTED (replay).
        It must NOT be hard-REJECTED.
        """
        r = trial_nfc_skim_first(_rng(), _params())
        assert r.genuine_disputed, "Genuine should be DISPUTED after skim-first"
        assert not r.genuine_rejected, "Genuine must NOT be hard-rejected"

    def test_nfc_skim_first_genuine_recovered(self):
        """
        After being DISPUTED, genuine's next tap (counter+1) is ACCEPTED.
        This is the key advantage over HACP5.
        """
        r = trial_nfc_skim_first(_rng(), _params())
        assert r.genuine_recovered, (
            "Genuine must recover (next tap ACCEPTED) after skim-first dispute."
        )

    def test_nfc_guess_clone_rejected(self):
        """Random CMAC is rejected (bad_mac)."""
        rng = _random.Random(_SEED)
        for _ in range(10):
            p = sample_params(rng)
            r = trial_nfc_guess(rng, p)
            assert not r.clone_accepted

    def test_nfc_guess_genuine_not_rejected(self):
        """Guess attempt doesn't advance last_seen — genuine tap is accepted."""
        r = trial_nfc_guess(_rng(), _params(prior_taps=2))
        assert not r.genuine_rejected

    def test_nfc_guess_genuine_not_disputed(self):
        """Guess attempt does not cause genuine tag to be disputed."""
        r = trial_nfc_guess(_rng(), _params(prior_taps=2))
        assert not r.genuine_disputed

    def test_nfc_skim_first_recovered_rate_high(self):
        """
        Over 50 skim-first trials, genuine recovery rate must be 100%
        (counter+CMAC never permanently blocks the genuine tag).
        """
        rng = _random.Random(_SEED)
        recovered = 0
        disputed  = 0
        for _ in range(50):
            p = sample_params(rng)
            r = trial_nfc_skim_first(rng, p)
            if r.genuine_disputed:
                disputed += 1
                if r.genuine_recovered:
                    recovered += 1
        # All disputed cases should recover
        assert disputed > 0, "Expected some disputed results in 50 trials"
        assert recovered == disputed, (
            f"Expected all {disputed} disputed cases to recover, "
            f"got {recovered}"
        )

    def test_nfc_replay_stats_over_many_trials(self):
        """
        Over 100 replay trials: clone should NEVER be accepted
        (replayed counter is always <= last_seen after prior taps).
        """
        rng = _random.Random(_SEED)
        clone_accepted = 0
        for _ in range(100):
            p = sample_params(rng)
            # Ensure at least 1 prior tap so there is a captured tap to replay
            from experiments.identity_race import TrialParams
            p2 = TrialParams(
                max(1, p.prior_taps), p.missed_taps, p.capture_point, p.clone_first
            )
            r = trial_nfc_replay(rng, p2)
            clone_accepted += int(r.clone_accepted)
        assert clone_accepted == 0, (
            f"Replay should never be accepted, but was {clone_accepted}/100 times"
        )
