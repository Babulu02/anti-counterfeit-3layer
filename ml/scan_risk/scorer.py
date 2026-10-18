"""
ml/scan_risk/scorer.py
=======================
Live scan scorer — loads the trained RandomForest model and thresholds,
computes features from the scan history stored in MySQL, and returns
a risk score in [0, 1].

Used by the FastAPI /scan endpoint (Phase 5 fusion).
A risk_score >= threshold means the scan is flagged as high-risk.

The scorer is lazy — model and thresholds are loaded on first call and
cached for the lifetime of the process.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]


@lru_cache(maxsize=1)
def _load_artifacts() -> tuple:
    """Load model and thresholds once; cache them."""
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env", override=False)

    model_path     = os.getenv("ML_MODEL_PATH",     "experiments/results/rf_model.joblib")
    threshold_path = os.getenv("ML_THRESHOLDS_PATH","experiments/results/thresholds.json")

    mp = ROOT / model_path
    tp = ROOT / threshold_path

    if not mp.exists() or not tp.exists():
        return None, None   # model not trained yet; caller handles None

    model  = joblib.load(mp)
    with open(tp) as f:
        thresholds = json.load(f)
    return model, thresholds


def score_scan(scan_history: list[dict]) -> Optional[float]:
    """
    Compute the risk score for the LATEST scan in scan_history.

    Parameters
    ----------
    scan_history : list[dict]
        All scans for this product, **including** the current scan as the
        last element.  Each dict must have keys:
        product_id, timestamp, city, lat, lon, device_hash (or device_id),
        channel, nfc_counter (int), sold (int).

    Returns
    -------
    float in [0, 1] if model is loaded; None if model not yet trained.
    """
    model, thresholds = _load_artifacts()
    if model is None:
        return None

    if not scan_history:
        return 0.0

    from ml.scan_risk.features import FEATURE_COLS, compute_features

    df = pd.DataFrame(scan_history)
    # Ensure required columns exist with defaults
    for col, default in [("city",""), ("lat",0.0), ("lon",0.0),
                          ("nfc_counter",0), ("sold",0)]:
        if col not in df.columns:
            df[col] = default

    try:
        feats = compute_features(df)
    except Exception:
        return 0.0

    last_feat = feats.iloc[[-1]][FEATURE_COLS]
    proba     = float(model.predict_proba(last_feat)[0, 1])
    return round(proba, 4)


def is_high_risk(score: float | None, model: str = "random_forest") -> bool:
    """Return True if score meets the threshold for high-risk classification."""
    if score is None:
        return False
    _, thresholds = _load_artifacts()
    if thresholds is None:
        return False
    thresh = thresholds.get(model, 0.5)
    return score >= thresh
