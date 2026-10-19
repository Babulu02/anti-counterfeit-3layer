"""
ml/image_signal/evaluate_sop.py
===============================
Stanford Online Products (SOP) calibration and evaluation pipeline for Phase 8.

Methodology:
1. Calibration set sampled from Ebay_train.txt (product-disjoint from test set).
2. MobileNetV2 extracts 1280-d unit-length feature embeddings.
3. Platt scaling (logistic regression on cosine similarities) is fit on calibration set.
4. Decision thresholds chosen on calibration set only (e.g., at fixed FRR targets).
5. Evaluation performed on Ebay_test.txt with frozen thresholds:
   - ROC-AUC (overall, hard negatives, random impostors)
   - False Acceptance Rate (FAR) at fixed False Rejection Rates (FRR = 1%, 5%, 10%)
   - Expected Calibration Error (ECE) before and after Platt scaling
   - Coverage-vs-Accuracy curve under varying abstain margins
6. Saves artifacts and figures to ml/image_signal/artifacts/.
"""

from __future__ import annotations
import csv
import json
import math
import os
from pathlib import Path
import random
import sys
import time

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

# Ensure repository root is on sys.path
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.image_signal.embedder import get_embedder
from ml.image_signal.similarity import cosine_similarity, PlattCalibrator, classify


def load_sop_split(ann_file: Path, image_root: Path, max_classes: int | None = None, seed: int = 42):
    """Load SOP annotation file and group by class and superclass."""
    by_class: dict[int, list[Path]] = {}
    by_superclass: dict[int, list[Path]] = {}
    class_to_sup: dict[int, int] = {}

    with open(ann_file, "r", encoding="utf-8") as f:
        header = next(f)
        for line in f:
            parts = line.strip().split()
            if len(parts) < 4:
                continue
            img_id, cls_id, sup_id, rel_path = parts[:4]
            cls_id = int(cls_id)
            sup_id = int(sup_id)
            full_path = image_root / rel_path
            by_class.setdefault(cls_id, []).append(full_path)
            by_superclass.setdefault(sup_id, []).append(full_path)
            class_to_sup[cls_id] = sup_id

    # Filter to classes with >= 2 images
    valid_cids = [c for c, imgs in by_class.items() if len(imgs) >= 2]
    if max_classes and len(valid_cids) > max_classes:
        rng = random.Random(seed)
        selected_cids = sorted(rng.sample(valid_cids, max_classes))
    else:
        selected_cids = sorted(valid_cids)

    sub_by_class = {c: by_class[c] for c in selected_cids}
    return sub_by_class, by_superclass, class_to_sup


def build_evaluation_pairs(by_class: dict[int, list[Path]], by_superclass: dict[int, list[Path]], class_to_sup: dict[int, int], seed: int = 42):
    """
    Construct genuine pairs, random impostor pairs, and hard negative pairs.
    Reference image: first image of each class.
    """
    rng = random.Random(seed)
    pairs = []  # (ref_path, query_path, label, query_type)
    all_cids = sorted(by_class.keys())

    for cls_id in all_cids:
        imgs = by_class[cls_id]
        ref = imgs[0]
        # Genuine queries (up to 3)
        gen_imgs = imgs[1:4]
        for g in gen_imgs:
            pairs.append((ref, g, 1, "genuine"))

        n_neg = len(gen_imgs)

        # Random impostor (drawn from other classes)
        other_cids = [c for c in all_cids if c != cls_id]
        if other_cids:
            samp_cids = rng.sample(other_cids, min(n_neg, len(other_cids)))
            for oc in samp_cids:
                pairs.append((ref, rng.choice(by_class[oc]), 0, "random_impostor"))

        # Hard negative (same superclass, different class)
        sup_id = class_to_sup[cls_id]
        pool = [p for p in by_superclass.get(sup_id, []) if p not in imgs]
        if pool:
            hard_samp = rng.sample(pool, min(n_neg, len(pool)))
            for hp in hard_samp:
                pairs.append((ref, hp, 0, "hard_negative"))

    return pairs


def compute_roc(labels: np.ndarray, scores: np.ndarray):
    """Compute (fpr, tpr, thresholds, auc) via sorting."""
    order = np.argsort(-scores)
    y_ord = labels[order]
    s_ord = scores[order]
    n_pos = int(labels.sum())
    n_neg = len(labels) - n_pos

    tp = np.cumsum(y_ord)
    fp = np.cumsum(1 - y_ord)

    fpr = np.concatenate([[0.0], fp / max(n_neg, 1), [1.0]])
    tpr = np.concatenate([[0.0], tp / max(n_pos, 1), [1.0]])
    thr = np.concatenate([[s_ord[0] + 1e-5], s_ord, [s_ord[-1] - 1e-5]])
    auc = float(np.trapz(tpr, fpr))
    return fpr, tpr, thr, auc


def get_far_at_frr(fpr: np.ndarray, tpr: np.ndarray, thr: np.ndarray, target_frr: float):
    frr = 1.0 - tpr
    idx = int(np.clip(np.searchsorted(-frr, -target_frr), 0, len(frr) - 1))
    return float(fpr[idx]), float(thr[idx])


def compute_ece(probs: np.ndarray, labels: np.ndarray, n_bins: int = 15) -> float:
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    idx = np.clip(np.digitize(probs, edges) - 1, 0, n_bins - 1)
    n = len(probs)
    ece = 0.0
    for b in range(n_bins):
        mask = (idx == b)
        if not mask.any():
            continue
        ece += (mask.sum() / n) * abs(labels[mask].mean() - probs[mask].mean())
    return float(ece)


def run_pipeline(sop_root_str: str | None = None, n_calib_classes: int = 150, n_test_classes: int = 250):
    if not sop_root_str:
        from backend.app.config import get_settings
        sop_root = Path(get_settings().sop_root)
    else:
        sop_root = Path(sop_root_str)

    if not sop_root.exists():
        raise FileNotFoundError(f"SOP_ROOT directory not found: {sop_root}")

    train_ann = sop_root / "Ebay_train.txt"
    test_ann = sop_root / "Ebay_test.txt"

    print("=" * 70)
    print("PHASE 8: MOBILE-NET-V2 IMAGE SIGNAL EVALUATION (SOP DATASET)")
    print("=" * 70)
    print(f"Dataset root: {sop_root}")

    embedder = get_embedder()
    emb_cache: dict[Path, np.ndarray] = {}

    def get_emb(p: Path) -> np.ndarray | None:
        if p in emb_cache:
            return emb_cache[p]
        try:
            emb = embedder.embed_file(p)
            emb_cache[p] = emb
            return emb
        except Exception as e:
            return None

    # 1. Calibration Phase (Ebay_train.txt)
    print(f"\n[1/4] Loading Calibration Set from Ebay_train.txt ({n_calib_classes} classes)...")
    cal_classes, cal_sups, cal_c2s = load_sop_split(train_ann, sop_root, max_classes=n_calib_classes, seed=42)
    cal_pairs = build_evaluation_pairs(cal_classes, cal_sups, cal_c2s, seed=42)
    print(f"  Generated {len(cal_pairs)} calibration image pairs.")

    print("  Extracting embeddings for calibration pairs...")
    cal_sims = []
    cal_labels = []
    for ref_p, q_p, lab, q_type in cal_pairs:
        e1 = get_emb(ref_p)
        e2 = get_emb(q_p)
        if e1 is not None and e2 is not None:
            sim = float(np.dot(e1, e2))
            cal_sims.append(sim)
            cal_labels.append(lab)

    cal_sims = np.array(cal_sims)
    cal_labels = np.array(cal_labels)

    # Fit Platt scaling
    print("  Fitting Platt scaling calibrator on calibration similarities...")
    platt = PlattCalibrator()
    platt.fit(cal_sims, cal_labels)
    print(f"  Calibrator parameters: scale A = {platt.a:.4f}, bias B = {platt.b:.4f}")

    # Select operating thresholds on calibration set at FRR = 5%
    cal_fpr, cal_tpr, cal_thr, _ = compute_roc(cal_labels, cal_sims)
    far_05, thr_gen = get_far_at_frr(cal_fpr, cal_tpr, cal_thr, 0.05)
    far_10, thr_cnt = get_far_at_frr(cal_fpr, cal_tpr, cal_thr, 0.50)  # low threshold for confident counterfeit
    thr_cnt = min(thr_cnt, thr_gen - 0.20)  # ensure distinct margin

    print(f"  Selected thresholds (validation only):")
    print(f"    Genuine threshold (FRR 5%): {thr_gen:.4f}")
    print(f"    Counterfeit threshold:      {thr_cnt:.4f}")

    # 2. Test Phase (Ebay_test.txt - product-disjoint)
    print(f"\n[2/4] Evaluating on Test Split from Ebay_test.txt ({n_test_classes} classes, thresholds frozen)...")
    test_classes, test_sups, test_c2s = load_sop_split(test_ann, sop_root, max_classes=n_test_classes, seed=1337)
    test_pairs = build_evaluation_pairs(test_classes, test_sups, test_c2s, seed=1337)
    print(f"  Generated {len(test_pairs)} test image pairs.")

    print("  Extracting embeddings for test pairs...")
    test_sims = []
    test_labels = []
    test_types = []
    for ref_p, q_p, lab, q_type in test_pairs:
        e1 = get_emb(ref_p)
        e2 = get_emb(q_p)
        if e1 is not None and e2 is not None:
            sim = float(np.dot(e1, e2))
            test_sims.append(sim)
            test_labels.append(lab)
            test_types.append(q_type)

    test_sims = np.array(test_sims)
    test_labels = np.array(test_labels)
    test_types = np.array(test_types)

    # 3. Compute Metrics on Test Set
    print("\n[3/4] Computing ROC-AUC, FAR@FRR, ECE, and Abstain Analysis...")
    fpr_all, tpr_all, thr_all, auc_all = compute_roc(test_labels, test_sims)

    # Subsets: hard negatives vs random impostors
    mask_hard = (test_labels == 1) | (test_types == "hard_negative")
    fpr_hard, tpr_hard, _, auc_hard = compute_roc(test_labels[mask_hard], test_sims[mask_hard])

    mask_rand = (test_labels == 1) | (test_types == "random_impostor")
    fpr_rand, tpr_rand, _, auc_rand = compute_roc(test_labels[mask_rand], test_sims[mask_rand])

    far_01, thr_01 = get_far_at_frr(fpr_all, tpr_all, thr_all, 0.01)
    far_05, thr_05 = get_far_at_frr(fpr_all, tpr_all, thr_all, 0.05)
    far_10, thr_10 = get_far_at_frr(fpr_all, tpr_all, thr_all, 0.10)

    # ECE before calibration (raw cosine similarity clamped to [0,1])
    raw_probs = np.clip(test_sims, 0.0, 1.0)
    ece_before = compute_ece(raw_probs, test_labels, n_bins=15)

    # ECE after Platt scaling
    cal_probs = platt.predict_proba_array(test_sims)
    ece_after = compute_ece(cal_probs, test_labels, n_bins=15)

    # Abstain coverage vs accuracy analysis
    margins = np.linspace(0.0, 0.30, 20)
    cov_acc_curve = []
    base_center = (thr_gen + thr_cnt) / 2.0
    for m in margins:
        t_high = min(base_center + m, 0.95)
        t_low = max(base_center - m, 0.05)
        abstain_mask = (test_sims > t_low) & (test_sims < t_high)
        n_abstain = int(abstain_mask.sum())
        coverage = 1.0 - (n_abstain / len(test_sims))  # fraction of decisions made
        decisive = ~abstain_mask
        if decisive.any():
            pred = np.where(test_sims[decisive] >= t_high, 1, 0)
            acc = float((pred == test_labels[decisive]).mean())
        else:
            acc = 1.0
        cov_acc_curve.append({"margin": round(float(m), 4), "coverage": round(coverage, 4), "accuracy": round(acc, 4)})

    # Coverage at the frozen chosen thresholds
    abstain_frozen = (test_sims > thr_cnt) & (test_sims < thr_gen)
    frozen_cov = 1.0 - float(abstain_frozen.mean())
    frozen_dec = ~abstain_frozen
    if frozen_dec.any():
        frozen_pred = np.where(test_sims[frozen_dec] >= thr_gen, 1, 0)
        frozen_acc = float((frozen_pred == test_labels[frozen_dec]).mean())
    else:
        frozen_acc = 1.0

    # 4. Generate Figures & Save Artifacts
    print("\n[4/4] Saving Artifacts and Generating Plots...")
    art_dir = REPO_ROOT / "ml" / "image_signal" / "artifacts"
    art_dir.mkdir(parents=True, exist_ok=True)

    # (a) ROC Plot
    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    ax.plot(fpr_all, tpr_all, label=f"All Impostors (AUC = {auc_all:.4f})", color="#2563eb", lw=2)
    ax.plot(fpr_hard, tpr_hard, label=f"Hard Negatives (AUC = {auc_hard:.4f})", color="#dc2626", lw=1.5, ls="--")
    ax.plot(fpr_rand, tpr_rand, label=f"Random Impostors (AUC = {auc_rand:.4f})", color="#16a34a", lw=1.5, ls=":")
    ax.plot([0, 1], [0, 1], color="gray", ls="--", lw=1)
    ax.set_xlabel("False Positive Rate (FAR)")
    ax.set_ylabel("True Positive Rate (1 - FRR)")
    ax.set_title("MobileNetV2 Image Verification ROC Curve (SOP Test Split)")
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(art_dir / "roc_curve.png")
    plt.close(fig)

    # (b) Coverage vs Accuracy Plot
    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    covs = [r["coverage"] * 100 for r in cov_acc_curve]
    accs = [r["accuracy"] * 100 for r in cov_acc_curve]
    ax.plot(covs, accs, marker="o", color="#7c3aed", lw=2)
    ax.axvline(frozen_cov * 100, color="#dc2626", ls="--", label=f"Operating Point ({frozen_cov*100:.1f}% cov, {frozen_acc*100:.1f}% acc)")
    ax.set_xlabel("Decision Coverage (%)")
    ax.set_ylabel("Classification Accuracy Outside Abstain Band (%)")
    ax.set_title("Coverage vs Accuracy Under Abstain Region")
    ax.legend(loc="lower left")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(art_dir / "coverage_vs_accuracy.png")
    plt.close(fig)

    # Save thresholds json
    thresholds_dict = {
        "genuine_threshold": round(float(thr_gen), 4),
        "counterfeit_threshold": round(float(thr_cnt), 4),
        "platt_scale_a": round(float(platt.a), 4),
        "platt_bias_b": round(float(platt.b), 4),
        "calibration_frr_target": 0.05,
    }
    with open(art_dir / "image_thresholds.json", "w", encoding="utf-8") as f:
        json.dump(thresholds_dict, f, indent=2)

    # Save summary results json
    results_dict = {
        "dataset": "Stanford Online Products",
        "model": "MobileNetV2 (ImageNet Pretrained, 1280-d)",
        "test_pairs_evaluated": len(test_pairs),
        "auc_all_impostors": round(auc_all, 4),
        "auc_hard_negatives": round(auc_hard, 4),
        "auc_random_impostors": round(auc_rand, 4),
        "far_at_frr_01": {"target_frr": 0.01, "far": round(far_01, 4), "threshold": round(thr_01, 4)},
        "far_at_frr_05": {"target_frr": 0.05, "far": round(far_05, 4), "threshold": round(thr_05, 4)},
        "far_at_frr_10": {"target_frr": 0.10, "far": round(far_10, 4), "threshold": round(thr_10, 4)},
        "ece_raw": round(ece_before, 4),
        "ece_platt_calibrated": round(ece_after, 4),
        "ece_reduction_pct": round((ece_before - ece_after) / ece_before * 100, 2),
        "frozen_decision_coverage": round(frozen_cov, 4),
        "frozen_accuracy": round(frozen_acc, 4),
        "abstain_rate": round(1.0 - frozen_cov, 4),
    }
    with open(art_dir / "sop_eval_results.json", "w", encoding="utf-8") as f:
        json.dump(results_dict, f, indent=2)

    # Print summary table
    print("\n" + "=" * 70)
    print("SOP EVALUATION METRICS SUMMARY (FROZEN TEST SPLIT)")
    print("=" * 70)
    print(f"  Test image pairs evaluated:         {len(test_pairs)}")
    print(f"  ROC-AUC (All Impostors):            {auc_all:.4f}")
    print(f"  ROC-AUC (Hard Negatives):           {auc_hard:.4f}")
    print(f"  ROC-AUC (Random Impostors):         {auc_rand:.4f}")
    print(f"  FAR @ FRR = 1%:                     {far_01:.4f} (thr={thr_01:.4f})")
    print(f"  FAR @ FRR = 5%:                     {far_05:.4f} (thr={thr_05:.4f})")
    print(f"  FAR @ FRR = 10%:                    {far_10:.4f} (thr={thr_10:.4f})")
    print(f"  ECE Before Calibration (raw sim):   {ece_before:.4f}")
    print(f"  ECE After Platt Calibration:        {ece_after:.4f} ({results_dict['ece_reduction_pct']}% error reduction)")
    print(f"  Abstain Band Coverage:              {frozen_cov*100:.1f}%")
    print(f"  Accuracy Outside Abstain Band:      {frozen_acc*100:.1f}%")
    print("=" * 70)
    print(f"Artifacts saved in: {art_dir}")


if __name__ == "__main__":
    sop_path = sys.argv[1] if len(sys.argv) > 1 else None
    run_pipeline(sop_path)
