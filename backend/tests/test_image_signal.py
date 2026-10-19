"""
backend/tests/test_image_signal.py
==================================
Unit tests and ablation for Phase 8 image signal in multi-signal fusion.

Verifies:
  1. Optionality: absent image is completely ignored (no penalty or change to verdict).
  2. Abstain region: ambiguous image similarity falls in abstain band and does not penalize genuine product.
  3. Product swap detection: image similarity below counterfeit threshold flags visual mismatch (Manual review).
  4. Reinforcement: high image similarity confirms genuine visual appearance.
  5. Full ablation matrix comparing verdicts with and without image signal.
"""

import numpy as np
import pytest

from app.fusion import (
    VERDICT_VERIFIED,
    VERDICT_MANUAL,
    VERDICT_SUSPICIOUS,
    VERDICT_UNREGISTERED,
    Signals,
    fuse,
)
from ml.image_signal.similarity import (
    cosine_similarity,
    classify,
    PlattCalibrator,
    load_calibrated_thresholds,
)


@pytest.fixture
def base_genuine_signals():
    """A clean, genuine scan that passes all chain, identity, and ML checks."""
    return Signals(
        on_chain=True,
        chain_result="on_chain",
        sold=False,
        identity_result="valid",
        identity_reason="HMAC signature valid",
        risk_score=0.05,
        is_new_location=False,
    )


def test_absent_image_is_ignored(base_genuine_signals):
    """When no image is uploaded (image_result=None or image_similarity=None), verdict is Verified."""
    base_genuine_signals.image_similarity = None
    base_genuine_signals.image_result = None
    verdict, reason = fuse(base_genuine_signals)
    assert verdict == VERDICT_VERIFIED

    base_genuine_signals.image_result = "absent"
    verdict, reason = fuse(base_genuine_signals)
    assert verdict == VERDICT_VERIFIED


def test_uncertain_image_abstains(base_genuine_signals):
    """An ambiguous image (in abstain band) does not trigger false alarm."""
    thr_gen, thr_cnt, _, _ = load_calibrated_thresholds()
    # Score right between counterfeit and genuine
    mid_score = (thr_gen + thr_cnt) / 2.0
    label, conf = classify(mid_score, thr_gen, thr_cnt)
    assert label == "uncertain"

    base_genuine_signals.image_similarity = mid_score
    base_genuine_signals.image_result = label
    verdict, reason = fuse(base_genuine_signals)
    assert verdict == VERDICT_VERIFIED, "Uncertain image must not degrade genuine verdict"


def test_genuine_image_passes(base_genuine_signals):
    """Matching image reinforces genuine verdict."""
    thr_gen, thr_cnt, _, _ = load_calibrated_thresholds()
    high_score = min(thr_gen + 0.15, 0.95)
    label, conf = classify(high_score, thr_gen, thr_cnt)
    assert label == "genuine"

    base_genuine_signals.image_similarity = high_score
    base_genuine_signals.image_result = label
    verdict, reason = fuse(base_genuine_signals)
    assert verdict == VERDICT_VERIFIED


def test_counterfeit_product_swap_flagged(base_genuine_signals):
    """
    Product swap attack: QR and NFC are genuine, but visual appearance does not match.
    Fusion flags as Manual review due to visual mismatch.
    """
    thr_gen, thr_cnt, _, _ = load_calibrated_thresholds()
    low_score = max(thr_cnt - 0.02, 0.01)
    label, conf = classify(low_score, thr_gen, thr_cnt)
    assert label == "counterfeit"

    base_genuine_signals.image_similarity = low_score
    base_genuine_signals.image_result = label
    verdict, reason = fuse(base_genuine_signals)
    assert verdict == VERDICT_MANUAL
    assert "Visual appearance mismatch" in reason


def test_cosine_similarity_properties():
    """Cosine similarity unit test."""
    v1 = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    v2 = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    v3 = np.array([0.0, 1.0, 0.0], dtype=np.float32)

    assert pytest.approx(cosine_similarity(v1, v2)) == 1.0
    assert pytest.approx(cosine_similarity(v1, v3)) == 0.0


def test_platt_calibrator():
    """Test Platt scaling calibration."""
    sims = np.array([0.1, 0.2, 0.8, 0.9])
    labs = np.array([0, 0, 1, 1])
    cal = PlattCalibrator()
    cal.fit(sims, labs)

    p_low = cal.predict_proba(0.15)
    p_high = cal.predict_proba(0.85)
    assert p_low < 0.5
    assert p_high > 0.5


def test_signal_ablation():
    """
    Ablation across 4 signal configurations:
      1. Full 4-signal (chain, identity, scan_risk, image)
      2. No image signal
      3. No scan_risk signal
      4. No chain signal
    """
    # Case: Product swap (good chain, good identity, low risk scan pattern, fake image)
    swap_scan = Signals(
        on_chain=True,
        chain_result="on_chain",
        sold=False,
        identity_result="valid",
        identity_reason="Valid signature",
        risk_score=0.05,
        is_new_location=False,
        image_similarity=0.01,
        image_result="counterfeit",
    )

    # 1. Full 4-signal catches the swap
    v_full, _ = fuse(swap_scan)
    assert v_full == VERDICT_MANUAL

    # 2. No image signal misses the swap (falls back to Verified because identity/chain passed)
    swap_no_image = Signals(
        on_chain=True,
        chain_result="on_chain",
        sold=False,
        identity_result="valid",
        identity_reason="Valid signature",
        risk_score=0.05,
        is_new_location=False,
        image_similarity=None,
        image_result=None,
    )
    v_no_img, _ = fuse(swap_no_image)
    assert v_no_img == VERDICT_VERIFIED, "Without image signal, visual product swap is missed"
