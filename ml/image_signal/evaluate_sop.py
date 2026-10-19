"""
ml/image_signal/evaluate_sop.py
===============================
Stanford Online Products (SOP) calibration and evaluation pipeline for Phase 8.

Methodology:
1. Calibration set sampled from Ebay_train.txt (product-disjoint from test set).
2. MobileNetV2 (1280-d) and DINOv2 ViT-S/14 (384-d) extract unit-length feature embeddings.
3. Platt scaling (logistic regression on cosine similarities) fit on calibration set.
4. Decision thresholds chosen strictly on the validation/calibration split:
   - Operating point at FRR = 5% (tau_cnt = 0.2402 for MobileNetV2).
   - Confident genuine point at FAR = 5% (tau_gen = 0.5100 for MobileNetV2).
   - Calibrated abstain margin [tau_cnt, tau_gen] where scores are uncertain.
5. Evaluation performed on Ebay_test.txt (product-disjoint) with frozen thresholds:
   - ROC-AUC (overall, hard negatives, random impostors)
   - False Acceptance Rate (FAR) at fixed False Rejection Rates (FRR = 1%, 5%, 10%)
   - Expected Calibration Error (ECE) before and after Platt scaling
   - Decision coverage, abstain rate, and accuracy on decisive pairs
6. Comparative evaluation against stronger self-supervised vision backbone (DINOv2).
7. Saves artifacts and figures to ml/image_signal/artifacts/.
"""

from __future__ import annotations
import json
import os
from pathlib import Path
import random
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F
from torchvision import transforms

# Ensure repository root is on sys.path
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.image_signal.embedder import get_embedder
from ml.image_signal.similarity import PlattCalibrator


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
        gen_imgs = imgs[1:4]
        for g in gen_imgs:
            pairs.append((ref, g, 1, "genuine"))

        n_neg = len(gen_imgs)
        other_cids = [c for c in all_cids if c != cls_id]
        if other_cids:
            samp_cids = rng.sample(other_cids, min(n_neg, len(other_cids)))
            for oc in samp_cids:
                pairs.append((ref, rng.choice(by_class[oc]), 0, "random_impostor"))

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


def extract_pair_similarities(pairs, embed_fn):
    """Extract pair similarities with image-level caching."""
    sims = []
    labels = []
    types = []
    for ref_p, q_p, lab, q_type in pairs:
        e1 = embed_fn(ref_p)
        e2 = embed_fn(q_p)
        if e1 is not None and e2 is not None:
            sims.append(float(np.dot(e1, e2)))
            labels.append(lab)
            types.append(q_type)
    return np.array(sims), np.array(labels), np.array(types)


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
    print("PHASE 8: IMAGE SIGNAL CALIBRATION & BENCHMARK PIPELINE")
    print("=" * 70)
    print(f"Dataset root: {sop_root}")

    # Build calibration and test pairs
    print(f"\n[1/5] Building pair sets from SOP...")
    cal_classes, cal_sups, cal_c2s = load_sop_split(train_ann, sop_root, max_classes=n_calib_classes, seed=42)
    cal_pairs = build_evaluation_pairs(cal_classes, cal_sups, cal_c2s, seed=42)
    print(f"  Calibration pairs (Ebay_train.txt): {len(cal_pairs)} across {len(cal_classes)} classes")

    test_classes, test_sups, test_c2s = load_sop_split(test_ann, sop_root, max_classes=n_test_classes, seed=1337)
    test_pairs = build_evaluation_pairs(test_classes, test_sups, test_c2s, seed=1337)
    print(f"  Test pairs (Ebay_test.txt, product-disjoint): {len(test_pairs)} across {len(test_classes)} classes")

    # -------------------------------------------------------------
    # Model 1: MobileNetV2 (1280-d)
    # -------------------------------------------------------------
    print(f"\n[2/5] Evaluating MobileNetV2 (1280-d)...")
    mobilenet = get_embedder()
    mb_cache: dict[Path, np.ndarray] = {}
    def get_mb_emb(p: Path) -> np.ndarray | None:
        if p not in mb_cache:
            try:
                mb_cache[p] = mobilenet.embed_file(p)
            except Exception:
                return None
        return mb_cache[p]

    mb_cal_sims, mb_cal_labels, _ = extract_pair_similarities(cal_pairs, get_mb_emb)
    mb_test_sims, mb_test_labels, mb_test_types = extract_pair_similarities(test_pairs, get_mb_emb)

    # Threshold selection on validation split
    mb_gen_sims = mb_cal_sims[mb_cal_labels == 1]
    mb_imp_sims = mb_cal_sims[mb_cal_labels == 0]

    # Target FRR <= 5% determines counterfeit threshold (only 5% of genuine items fall below this)
    mb_thr_cnt = float(np.percentile(mb_gen_sims, 5.0))
    # Target FAR <= 5% determines genuine threshold (only 5% of impostors exceed this)
    mb_thr_gen = float(np.percentile(mb_imp_sims, 95.0))

    # Single-threshold binary operating point at FRR = 5% (tau_opt = mb_thr_cnt)
    mb_single_opt_thr = mb_thr_cnt

    print(f"  Validation chosen thresholds (MobileNetV2):")
    print(f"    Counterfeit threshold (FRR <= 5%): {mb_thr_cnt:.4f}")
    print(f"    Genuine threshold     (FAR <= 5%): {mb_thr_gen:.4f}")
    print(f"    Abstain band:                      [{mb_thr_cnt:.4f}, {mb_thr_gen:.4f}]")

    # Fit Platt calibrator
    platt_mb = PlattCalibrator()
    platt_mb.fit(mb_cal_sims, mb_cal_labels)

    # Test metrics for MobileNetV2
    mb_fpr_all, mb_tpr_all, mb_thr_all, mb_auc_all = compute_roc(mb_test_labels, mb_test_sims)
    mask_hard = (mb_test_labels == 1) | (mb_test_types == "hard_negative")
    mb_fpr_hard, mb_tpr_hard, _, mb_auc_hard = compute_roc(mb_test_labels[mask_hard], mb_test_sims[mask_hard])
    mask_rand = (mb_test_labels == 1) | (mb_test_types == "random_impostor")
    mb_fpr_rand, mb_tpr_rand, _, mb_auc_rand = compute_roc(mb_test_labels[mask_rand], mb_test_sims[mask_rand])

    mb_far_01, mb_t01 = get_far_at_frr(mb_fpr_all, mb_tpr_all, mb_thr_all, 0.01)
    mb_far_05, mb_t05 = get_far_at_frr(mb_fpr_all, mb_tpr_all, mb_thr_all, 0.05)
    mb_far_10, mb_t10 = get_far_at_frr(mb_fpr_all, mb_tpr_all, mb_thr_all, 0.10)

    mb_ece_raw = compute_ece(np.clip(mb_test_sims, 0.0, 1.0), mb_test_labels)
    mb_cal_probs = platt_mb.predict_proba_array(mb_test_sims)
    mb_ece_cal = compute_ece(mb_cal_probs, mb_test_labels)

    # 1. Binary classification at single FRR=5% operating point without abstain
    mb_single_pred = np.where(mb_test_sims >= mb_single_opt_thr, 1, 0)
    mb_single_acc = float((mb_single_pred == mb_test_labels).mean())

    # 2. Ternary classification outside abstain band
    mb_decisive = (mb_test_sims >= mb_thr_gen) | (mb_test_sims <= mb_thr_cnt)
    mb_coverage = float(mb_decisive.mean())
    mb_abstain_rate = 1.0 - mb_coverage
    mb_preds = np.where(mb_test_sims[mb_decisive] >= mb_thr_gen, 1, 0)
    mb_decisive_acc = float((mb_preds == mb_test_labels[mb_decisive]).mean())

    mb_tp = int(((mb_preds == 1) & (mb_test_labels[mb_decisive] == 1)).sum())
    mb_fp = int(((mb_preds == 1) & (mb_test_labels[mb_decisive] == 0)).sum())
    mb_tn = int(((mb_preds == 0) & (mb_test_labels[mb_decisive] == 0)).sum())
    mb_fn = int(((mb_preds == 0) & (mb_test_labels[mb_decisive] == 1)).sum())

    # -------------------------------------------------------------
    # Model 2: DINOv2 ViT-S/14 (384-d)
    # -------------------------------------------------------------
    print(f"\n[3/5] Evaluating DINOv2 ViT-S/14 (384-d)...")
    dinov2 = torch.hub.load("facebookresearch/dinov2", "dinov2_vits14")
    dinov2.eval()

    dino_transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    dino_cache: dict[Path, np.ndarray] = {}
    def get_dino_emb(p: Path) -> np.ndarray | None:
        if p not in dino_cache:
            try:
                img = Image.open(p).convert("RGB")
                t = dino_transform(img).unsqueeze(0)
                with torch.no_grad():
                    feat = dinov2(t)
                    norm = F.normalize(feat, p=2, dim=1)
                dino_cache[p] = norm.squeeze(0).numpy()
            except Exception:
                return None
        return dino_cache[p]

    dino_cal_sims, dino_cal_labels, _ = extract_pair_similarities(cal_pairs, get_dino_emb)
    dino_test_sims, dino_test_labels, dino_test_types = extract_pair_similarities(test_pairs, get_dino_emb)

    dino_gen_sims = dino_cal_sims[dino_cal_labels == 1]
    dino_imp_sims = dino_cal_sims[dino_cal_labels == 0]

    dino_thr_cnt = float(np.percentile(dino_gen_sims, 5.0))
    dino_thr_gen = float(np.percentile(dino_imp_sims, 95.0))

    platt_dino = PlattCalibrator()
    platt_dino.fit(dino_cal_sims, dino_cal_labels)

    dino_fpr_all, dino_tpr_all, dino_thr_all, dino_auc_all = compute_roc(dino_test_labels, dino_test_sims)
    mask_hard_d = (dino_test_labels == 1) | (dino_test_types == "hard_negative")
    _, _, _, dino_auc_hard = compute_roc(dino_test_labels[mask_hard_d], dino_test_sims[mask_hard_d])
    mask_rand_d = (dino_test_labels == 1) | (dino_test_types == "random_impostor")
    _, _, _, dino_auc_rand = compute_roc(dino_test_labels[mask_rand_d], dino_test_sims[mask_rand_d])

    dino_far_01, _ = get_far_at_frr(dino_fpr_all, dino_tpr_all, dino_thr_all, 0.01)
    dino_far_05, _ = get_far_at_frr(dino_fpr_all, dino_tpr_all, dino_thr_all, 0.05)
    dino_far_10, _ = get_far_at_frr(dino_fpr_all, dino_tpr_all, dino_thr_all, 0.10)

    dino_ece_raw = compute_ece(np.clip(dino_test_sims, 0.0, 1.0), dino_test_labels)
    dino_cal_probs = platt_dino.predict_proba_array(dino_test_sims)
    dino_ece_cal = compute_ece(dino_cal_probs, dino_test_labels)

    dino_decisive = (dino_test_sims >= dino_thr_gen) | (dino_test_sims <= dino_thr_cnt)
    dino_coverage = float(dino_decisive.mean())
    dino_abstain_rate = 1.0 - dino_coverage
    dino_preds = np.where(dino_test_sims[dino_decisive] >= dino_thr_gen, 1, 0)
    dino_decisive_acc = float((dino_preds == dino_test_labels[dino_decisive]).mean())

    dino_tp = int(((dino_preds == 1) & (dino_test_labels[dino_decisive] == 1)).sum())
    dino_fp = int(((dino_preds == 1) & (dino_test_labels[dino_decisive] == 0)).sum())
    dino_tn = int(((dino_preds == 0) & (dino_test_labels[dino_decisive] == 0)).sum())
    dino_fn = int(((dino_preds == 0) & (dino_test_labels[dino_decisive] == 1)).sum())

    # -------------------------------------------------------------
    # 4. Generate Figures
    # -------------------------------------------------------------
    print(f"\n[4/5] Generating Artifacts and Plots...")
    art_dir = REPO_ROOT / "ml" / "image_signal" / "artifacts"
    art_dir.mkdir(parents=True, exist_ok=True)

    # (a) ROC Plot
    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    ax.plot(mb_fpr_all, mb_tpr_all, label=f"MobileNetV2 All (AUC = {mb_auc_all:.4f})", color="#2563eb", lw=2)
    ax.plot(mb_fpr_hard, mb_tpr_hard, label=f"MobileNetV2 Hard Neg (AUC = {mb_auc_hard:.4f})", color="#dc2626", lw=1.5, ls="--")
    ax.plot(mb_fpr_rand, mb_tpr_rand, label=f"MobileNetV2 Rand Imp (AUC = {mb_auc_rand:.4f})", color="#16a34a", lw=1.5, ls=":")
    ax.plot(dino_fpr_all, dino_tpr_all, label=f"DINOv2 All (AUC = {dino_auc_all:.4f})", color="#7c3aed", lw=2)
    ax.plot([0, 1], [0, 1], color="gray", ls="--", lw=1)
    ax.set_xlabel("False Positive Rate (FAR)")
    ax.set_ylabel("True Positive Rate (1 - FRR)")
    ax.set_title("Image Verification ROC Curve (SOP Test Split)")
    ax.legend(loc="lower right", fontsize=8)
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(art_dir / "roc_curve.png")
    plt.close(fig)

    # (b) Coverage vs Accuracy Plot for MobileNetV2
    margins = np.linspace(0.0, 0.25, 25)
    cov_acc_curve = []
    base_center = (mb_thr_gen + mb_thr_cnt) / 2.0
    for m in margins:
        t_high = min(base_center + m, 0.95)
        t_low = max(base_center - m, 0.05)
        abstain_m = (mb_test_sims > t_low) & (mb_test_sims < t_high)
        cov = 1.0 - float(abstain_m.mean())
        dec = ~abstain_m
        acc = float((np.where(mb_test_sims[dec] >= t_high, 1, 0) == mb_test_labels[dec]).mean()) if dec.any() else 1.0
        cov_acc_curve.append({"margin": round(float(m), 4), "coverage": round(cov, 4), "accuracy": round(acc, 4)})

    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    covs = [r["coverage"] * 100 for r in cov_acc_curve]
    accs = [r["accuracy"] * 100 for r in cov_acc_curve]
    ax.plot(covs, accs, marker="o", color="#7c3aed", lw=2)
    ax.axvline(mb_coverage * 100, color="#dc2626", ls="--", label=f"Calibrated ({mb_coverage*100:.1f}% cov, {mb_decisive_acc*100:.1f}% acc)")
    ax.set_xlabel("Decision Coverage (%)")
    ax.set_ylabel("Classification Accuracy Outside Abstain Band (%)")
    ax.set_title("Coverage vs Accuracy Under Abstain Region")
    ax.legend(loc="lower left")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(art_dir / "coverage_vs_accuracy.png")
    plt.close(fig)

    # (c) Backbone Comparison Bar Chart
    fig, ax = plt.subplots(figsize=(7, 4.5), dpi=150)
    metrics_names = ["ROC-AUC", "FAR @ FRR 5%", "Coverage", "Decisive Acc"]
    mb_vals = [mb_auc_all, mb_far_05, mb_coverage, mb_decisive_acc]
    dino_vals = [dino_auc_all, dino_far_05, dino_coverage, dino_decisive_acc]
    x = np.arange(len(metrics_names))
    width = 0.35
    ax.bar(x - width/2, mb_vals, width, label="MobileNetV2 (1280-d)", color="#3b82f6")
    ax.bar(x + width/2, dino_vals, width, label="DINOv2 ViT-S/14 (384-d)", color="#8b5cf6")
    ax.set_ylabel("Score / Rate")
    ax.set_title("Backbone Comparison on Stanford Online Products Test Split")
    ax.set_xticks(x)
    ax.set_xticklabels(metrics_names)
    ax.set_ylim(0.0, 1.05)
    ax.legend(loc="upper right")
    ax.grid(True, alpha=0.3, axis="y")
    for i in range(len(metrics_names)):
        ax.text(x[i] - width/2, mb_vals[i] + 0.02, f"{mb_vals[i]:.2f}", ha="center", fontsize=8)
        ax.text(x[i] + width/2, dino_vals[i] + 0.02, f"{dino_vals[i]:.2f}", ha="center", fontsize=8)
    fig.tight_layout()
    fig.savefig(art_dir / "backbone_comparison.png")
    plt.close(fig)

    # -------------------------------------------------------------
    # 5. Save Results and Threshold JSON Files
    # -------------------------------------------------------------
    print(f"\n[5/5] Writing JSON artifacts...")
    thresholds_dict = {
        "genuine_threshold": round(mb_thr_gen, 4),
        "counterfeit_threshold": round(mb_thr_cnt, 4),
        "platt_scale_a": round(float(platt_mb.a), 4),
        "platt_bias_b": round(float(platt_mb.b), 4),
        "calibration_frr_target": 0.05,
        "calibration_far_target": 0.05,
        "single_operating_threshold_frr05": round(mb_single_opt_thr, 4),
        "dinov2_genuine_threshold": round(dino_thr_gen, 4),
        "dinov2_counterfeit_threshold": round(dino_thr_cnt, 4),
    }
    with open(art_dir / "image_thresholds.json", "w", encoding="utf-8") as f:
        json.dump(thresholds_dict, f, indent=2)

    results_dict = {
        "dataset": "Stanford Online Products",
        "model": "MobileNetV2 (ImageNet Pretrained, 1280-d)",
        "test_pairs_evaluated": len(test_pairs),
        "auc_all_impostors": round(mb_auc_all, 4),
        "auc_hard_negatives": round(mb_auc_hard, 4),
        "auc_random_impostors": round(mb_auc_rand, 4),
        "far_at_frr_01": {"target_frr": 0.01, "far": round(mb_far_01, 4), "threshold": round(mb_t01, 4)},
        "far_at_frr_05": {"target_frr": 0.05, "far": round(mb_far_05, 4), "threshold": round(mb_t05, 4)},
        "far_at_frr_10": {"target_frr": 0.10, "far": round(mb_far_10, 4), "threshold": round(mb_t10, 4)},
        "ece_raw": round(mb_ece_raw, 4),
        "ece_platt_calibrated": round(mb_ece_cal, 4),
        "ece_reduction_pct": round((mb_ece_raw - mb_ece_cal) / mb_ece_raw * 100, 2),
        "single_threshold_binary_accuracy": round(mb_single_acc, 4),
        "frozen_decision_coverage": round(mb_coverage, 4),
        "frozen_accuracy": round(mb_decisive_acc, 4),
        "abstain_rate": round(mb_abstain_rate, 4),
        "confusion_matrix": {"tp": mb_tp, "fp": mb_fp, "tn": mb_tn, "fn": mb_fn},
        "stronger_backbone_comparison": {
            "model": "DINOv2 ViT-S/14 (384-d)",
            "auc_all_impostors": round(dino_auc_all, 4),
            "auc_hard_negatives": round(dino_auc_hard, 4),
            "auc_random_impostors": round(dino_auc_rand, 4),
            "far_at_frr_01": round(dino_far_01, 4),
            "far_at_frr_05": round(dino_far_05, 4),
            "far_at_frr_10": round(dino_far_10, 4),
            "ece_raw": round(dino_ece_raw, 4),
            "ece_platt_calibrated": round(dino_ece_cal, 4),
            "frozen_decision_coverage": round(dino_coverage, 4),
            "frozen_accuracy": round(dino_decisive_acc, 4),
            "abstain_rate": round(dino_abstain_rate, 4),
            "confusion_matrix": {"tp": dino_tp, "fp": dino_fp, "tn": dino_tn, "fn": dino_fn},
        }
    }
    with open(art_dir / "sop_eval_results.json", "w", encoding="utf-8") as f:
        json.dump(results_dict, f, indent=2)

    # Print summary
    print("\n" + "=" * 70)
    print("SOP EVALUATION METRICS SUMMARY (FROZEN TEST SPLIT)")
    print("=" * 70)
    print(f"  Test image pairs evaluated:         {len(test_pairs)}")
    print(f"  --- MobileNetV2 (1280-d) ---")
    print(f"    ROC-AUC (All Impostors):            {mb_auc_all:.4f}")
    print(f"    ROC-AUC (Hard Negatives):           {mb_auc_hard:.4f}")
    print(f"    ROC-AUC (Random Impostors):         {mb_auc_rand:.4f}")
    print(f"    FAR @ FRR = 5%:                     {mb_far_05:.4f}")
    print(f"    Single Operating Accuracy (no abs): {mb_single_acc*100:.2f}%")
    print(f"    Abstain Band Coverage:              {mb_coverage*100:.2f}% ({mb_decisive.sum()}/{len(test_pairs)})")
    print(f"    Abstain Rate:                       {mb_abstain_rate*100:.2f}%")
    print(f"    Accuracy on Decisive Pairs:         {mb_decisive_acc*100:.2f}% (TP={mb_tp}, FP={mb_fp}, TN={mb_tn}, FN={mb_fn})")
    print(f"  --- DINOv2 ViT-S/14 (384-d) ---")
    print(f"    ROC-AUC (All Impostors):            {dino_auc_all:.4f}")
    print(f"    ROC-AUC (Hard Negatives):           {dino_auc_hard:.4f}")
    print(f"    ROC-AUC (Random Impostors):         {dino_auc_rand:.4f}")
    print(f"    FAR @ FRR = 5%:                     {dino_far_05:.4f}")
    print(f"    Abstain Band Coverage:              {dino_coverage*100:.2f}% ({dino_decisive.sum()}/{len(test_pairs)})")
    print(f"    Abstain Rate:                       {dino_abstain_rate*100:.2f}%")
    print(f"    Accuracy on Decisive Pairs:         {dino_decisive_acc*100:.2f}% (TP={dino_tp}, FP={dino_fp}, TN={dino_tn}, FN={dino_fn})")
    print("=" * 70)
    print(f"Artifacts saved in: {art_dir}")


if __name__ == "__main__":
    sop_path = sys.argv[1] if len(sys.argv) > 1 else None
    run_pipeline(sop_path)
