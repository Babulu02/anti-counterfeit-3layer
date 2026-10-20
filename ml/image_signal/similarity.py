"""
ml/image_signal/similarity.py
==============================
Cosine similarity and Platt scaling calibration for MobileNetV2 image embeddings.
"""

from __future__ import annotations
import math
import numpy as np

import json
from pathlib import Path

# Calibrated thresholds (hardened against deceptive brand lookalikes)
GENUINE_THRESHOLD     = 0.7200
COUNTERFEIT_THRESHOLD = 0.3500
PLATT_SCALE_A         = 8.0245
PLATT_BIAS_B          = -3.7986


def load_calibrated_thresholds() -> tuple[float, float, float, float]:
    """Load calibrated thresholds and Platt parameters from artifacts if available."""
    p = Path(__file__).resolve().parent / "artifacts" / "image_thresholds.json"
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                return (
                    float(data.get("genuine_threshold", GENUINE_THRESHOLD)),
                    float(data.get("counterfeit_threshold", COUNTERFEIT_THRESHOLD)),
                    float(data.get("platt_scale_a", PLATT_SCALE_A)),
                    float(data.get("platt_bias_b", PLATT_BIAS_B)),
                )
        except Exception:
            pass
    return GENUINE_THRESHOLD, COUNTERFEIT_THRESHOLD, PLATT_SCALE_A, PLATT_BIAS_B


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute cosine similarity between two unit-length vectors.
    Since both vectors are L2-normalized, cosine similarity is the dot product.
    """
    if a.shape != b.shape:
        raise ValueError(f"Shape mismatch: {a.shape} vs {b.shape}")
    return float(np.dot(a, b))


class PlattCalibrator:
    """
    Univariate Platt Scaling: P(y=1 | s) = 1 / (1 + exp(-(A * s + B)))
    Fits scalar parameters A and B using logistic regression on similarity scores.
    """

    def __init__(self, a: float = 1.0, b: float = 0.0):
        self.a = float(a)
        self.b = float(b)

    def fit(self, similarities: np.ndarray, labels: np.ndarray):
        from sklearn.linear_model import LogisticRegression
        lr = LogisticRegression(solver="lbfgs", max_iter=1000)
        X = similarities.reshape(-1, 1)
        lr.fit(X, labels)
        self.a = float(lr.coef_[0][0])
        self.b = float(lr.intercept_[0])

    def predict_proba(self, similarity: float) -> float:
        z = self.a * similarity + self.b
        # Numerically stable sigmoid
        if z >= 0:
            return float(1.0 / (1.0 + math.exp(-z)))
        else:
            ez = math.exp(z)
            return float(ez / (1.0 + ez))

    def predict_proba_array(self, similarities: np.ndarray) -> np.ndarray:
        z = self.a * similarities + self.b
        return 1.0 / (1.0 + np.exp(-z))


def classify(
    similarity: float,
    genuine_threshold: float = GENUINE_THRESHOLD,
    counterfeit_threshold: float = COUNTERFEIT_THRESHOLD,
) -> tuple[str, float]:
    """
    Classify a similarity score into:
      - 'genuine' (>= genuine_threshold)
      - 'counterfeit' (<= counterfeit_threshold)
      - 'uncertain' (in between, abstain region)

    Returns (label, distance_confidence).
    """
    if similarity >= genuine_threshold:
        conf = min((similarity - genuine_threshold) / max(1.0 - genuine_threshold, 1e-6), 1.0)
        return "genuine", float(conf)
    elif similarity <= counterfeit_threshold:
        conf = min((counterfeit_threshold - similarity) / max(counterfeit_threshold, 1e-6), 1.0)
        return "counterfeit", float(conf)
    else:
        return "uncertain", 0.0
