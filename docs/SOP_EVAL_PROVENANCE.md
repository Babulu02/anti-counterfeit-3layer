# ML Image Signal Evaluation Provenance & Audit Report

**Date of Audit:** October 19, 2026  
**Target Artifact:** `ml/image_signal/artifacts/sop_eval_results.json`  
**Workspace:** `anti-counterfeit-3layer`

---

## 1. Overview & Provenance of `sop_eval_results.json`

The file `ml/image_signal/artifacts/sop_eval_results.json` contains quantitative validation and calibration metrics for the Phase 8 visual layer (Layer 3) on the **Stanford Online Products (SOP)** dataset.

### Generating Script and Function
- **Script Path:** `ml/image_signal/evaluate_sop.py`
- **Primary Function:** `run_pipeline(sop_root_str=None, n_calib_classes=150, n_test_classes=250)` (lines 149–375)
- **Output Code Snippet** (lines 354–358 in `ml/image_signal/evaluate_sop.py`):
  ```python
  art_dir = Path(__file__).resolve().parent / "artifacts"
  art_dir.mkdir(parents=True, exist_ok=True)

  with open(art_dir / "sop_eval_results.json", "w", encoding="utf-8") as f:
      json.dump(results_dict, f, indent=2)

  with open(art_dir / "image_thresholds.json", "w", encoding="utf-8") as f:
      json.dump(thresholds, f, indent=2)
  ```

### Generation Pipeline Summary
1. **Dataset Split:** Reads `Ebay_train.txt` and `Ebay_test.txt` from the SOP dataset root directory.
2. **Calibration Class Selection:** Extracts classes `1..150` from training split to fit the probability calibrator.
3. **Evaluation Class Selection:** Samples 250 classes from the test split to form evaluation image pairs.
4. **Feature Extraction:** Passes product images through `Embedder` (1280-dim unit-length feature vectors from MobileNetV2).
5. **Pair Formation & Scoring:** Computes pairwise cosine similarity between genuine reference/query pairs and random/hard negative pairs.
6. **Calibration & Metrics:** Fits a Platt scaling logistic regression (`PlattCalibrator`), evaluates False Accept Rate (FAR) at False Reject Rate (FRR) 1.0%, ROC AUC, and Expected Calibration Error (ECE before and after calibration).

---

## 2. Execution Command

The file was produced by invoking the command line interface in `ml/image_signal/evaluate_sop.py`:

```powershell
# Using an explicit dataset path:
python ml/image_signal/evaluate_sop.py C:\Project-MF\Stanford_Online_Products

# Or using the SOP_ROOT environment variable from .env:
python ml/image_signal/evaluate_sop.py
```

### Underlying CLI Entrypoint
```python
if __name__ == "__main__":
    sop_path = sys.argv[1] if len(sys.argv) > 1 else None
    run_pipeline(sop_path)
```

---

## 3. Timestamp and Git History

### Filesystem Metadata
- **Absolute Path:** `c:\Blockchain\anti-counterfeit-3layer\ml\image_signal\artifacts\sop_eval_results.json`
- **File Size:** `1,146 bytes`
- **Last Modified Timestamp:** `2026-10-19 10:35:16 +05:30` (UTC: `2026-10-19 05:05:16`)

### Git History
```
commit 69873a13fea531dcca41883e92a53aa2fff3d57b
Author: Anti-Counterfeit Dev <dev@anti-counterfeit.local>
Date:   Mon Oct 19 10:42:16 2026 +0530

    Step 4: Phase 8 MobileNetV2 image embedding signal with SOP evaluation, calibration, and fusion ablation

 ml/image_signal/artifacts/sop_eval_results.json | 53 +++++++++++++++++++++++++
 1 file changed, 53 insertions(+)
```

---

## 4. Status of `sop_eval.ipynb`

### Was `sop_eval.ipynb` ever executed?
**No. It was never executed.**

Detailed inspection of `C:\Project-MF\ml\sop_eval.ipynb`:
- Total cells: **11** (2 Markdown cells, 9 Code cells).
- `execution_count` for all code cells: **`None` / `null`**.
- `outputs` list for all code cells: **`[]` (0 outputs)**.
- No cached visual plots or execution metadata exist in the notebook file.

### Is `sop_eval.ipynb` a wrapper around `sop_eval_core.py`?
**Yes.** The notebook is a template created for Kaggle/Jupyter execution that directly imports and delegates all logic to `sop_eval_core.py`:
- **Cell 3:**
  ```python
  from sop_eval_core import (
      load_split, group_by_class, group_by_superclass, build_query_set
  )
  ```
- **Cell 5:**
  ```python
  from embedder import Embedder
  from sop_eval_core import embed_references, score_queries
  ```
- **Cell 7:**
  ```python
  from sop_eval_core import (
      compute_roc, far_at_frr, compute_ece, abstain_stats,
      save_scores_csv, save_metrics_json, print_metrics_table,
  )
  ```
- **Cell 8:**
  ```python
  from sop_eval_core import plot_roc, plot_histogram
  ```
- **Cell 9:**
  ```python
  from sop_eval_core import save_scores_csv, save_metrics_json
  save_scores_csv(scored,  OUT_DIR / 'sop_scores.csv')
  save_metrics_json(metrics, OUT_DIR / 'sop_metrics.json')
  ```
*(Note: Cell 9 writes to `sop_metrics.json`, unlike the repository's `evaluate_sop.py` which writes `sop_eval_results.json`.)*

---

## 5. Reconciliation: `C:\Project-MF\ml` vs `ml/image_signal/`

### Direct Comparison Matrix

| Component / File | `C:\Project-MF\ml` (External Scratchpad) | `ml/image_signal/` (Repository) | Match Status | Technical Differences |
| :--- | :--- | :--- | :---: | :--- |
| **`embedder.py`** | 4,081 bytes<br>SHA-256: `7e97be6f...` | 2,387 bytes<br>SHA-256: `7c21352c...` | **Identical Backbone** | Both extract 1280-dim unit-length feature embeddings from MobileNetV2 (features + adaptive average pooling without classification head). |
| **`similarity.py`** | 1,911 bytes<br>SHA-256: `8ecb276a...` | 3,530 bytes<br>SHA-256: `3ed32985...` | **No** | `C:\Project-MF\ml` contains only basic cosine similarity. `ml/image_signal` implements `PlattCalibrator`, ECE computation, Brier scores, and threshold search. |
| **Evaluation Code** | `sop_eval.py` (2,655 B) + `sop_eval_core.py` (25,182 B) | `evaluate_sop.py` (15,683 B) | **No** | Consolidated in `ml/image_signal/evaluate_sop.py` as a single, maintainable pipeline producing `sop_eval_results.json`. |
| **Notebook** | `sop_eval.ipynb` (11 unexecuted cells) | *Not present* | **No** | The unexecuted Kaggle template only exists in `C:\Project-MF\ml`. |

### Source of Truth Determination
**`ml/image_signal/` in the repository is the sole source of truth.**

1. **Production Backend Integration:**  
   [`backend/app/main.py`](file:///c:/Blockchain/anti-counterfeit-3layer/backend/app/main.py) imports directly from the repo package:
   ```python
   from ml.image_signal.embedder import MobileNetV2Embedder
   from ml.image_signal.similarity import compute_similarity, PlattCalibrator
   ```
2. **Version Control:**  
   `ml/image_signal/` is tracked under Git commit `69873a13fe...`, whereas `C:\Project-MF\ml` is an external, unversioned staging workspace.
3. **Experiment Reproducibility:**  
   `experiments/run_all.py` and `experiments/make_overview.py` strictly consume artifacts from `ml/image_signal/artifacts/`.
