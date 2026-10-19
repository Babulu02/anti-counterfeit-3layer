# Image-Signal Calibration, Threshold Bug Resolution & Backbone Benchmark

> **Document Summary:**  
> Detailed investigative report explaining the inconsistency between ROC-AUC ($0.9115$) and initial frozen decision accuracy ($0.5013$), mathematical proof of the threshold defect, derivation of principled validation-split thresholds, re-evaluation on the product-disjoint test split ($92.29\%$ decisive accuracy), and benchmarking against DINOv2 ViT-S/14.  
> **Source Artifacts:** [sop_eval_results.json](file:///C:/Blockchain/anti-counterfeit-3layer/ml/image_signal/artifacts/sop_eval_results.json), [image_thresholds.json](file:///C:/Blockchain/anti-counterfeit-3layer/ml/image_signal/artifacts/image_thresholds.json).

---

## 1. Problem Statement & Mathematical Investigation

In initial evaluation on the Stanford Online Products (SOP) dataset:
- Overall pair discrimination capability: **ROC-AUC = 0.9115**
- Reported accuracy on non-abstaining pairs: **0.5013 (50.13%)**

An ROC-AUC of $0.9115$ indicates that in $\sim 91\%$ of randomly chosen (genuine, impostor) pairs, the genuine similarity exceeds the impostor similarity. An accuracy of $50.13\%$ on non-abstaining pairs is equivalent to a random coin flip on a balanced binary set. These two findings are mathematically irreconcilable without an asymmetric decision boundary defect.

### 1.1 Space of Application and Space of Selection

To determine whether a threshold space mismatch occurred:

1. **Threshold Application:**  
   Thresholds $\tau_{gen} = 0.2401$ and $\tau_{cnt} = 0.0401$ were applied directly to **raw cosine similarity** ($S_C \in [-1, 1]$), **not** to Platt-scaled probability ($P \in [0, 1]$).
   - In [`ml/image_signal/evaluate_sop.py`](file:///C:/Blockchain/anti-counterfeit-3layer/ml/image_signal/evaluate_sop.py):
     ```python
     abstain_frozen = (test_sims > thr_cnt) & (test_sims < thr_gen)
     frozen_pred = np.where(test_sims[frozen_dec] >= thr_gen, 1, 0)
     ```
   - In [`ml/image_signal/similarity.py`](file:///C:/Blockchain/anti-counterfeit-3layer/ml/image_signal/similarity.py):
     ```python
     if similarity >= genuine_threshold:
         return "genuine", float(conf)
     elif similarity <= counterfeit_threshold:
         return "counterfeit", float(conf)
     else:
         return "uncertain", 0.0
     ```
2. **Threshold Selection:**  
   Both thresholds were also calculated in **raw cosine similarity space** (`compute_roc(cal_labels, cal_sims)`). The space was consistent between selection and application.

### 1.2 Root Cause of the 0.5013 Frozen Accuracy

Inspection of the empirical similarity distributions on the calibration split (`Ebay_train.txt`, 150 classes, 1,140 pairs) reveals the flaw:

| Split Distribution | Mean | Median | 5th Percentile | 95th Percentile | Minimum |
|---|:---:|:---:|:---:|:---:|:---:|
| **Genuine Pairs ($y = 1$)** | 0.5719 | 0.5736 | **0.2402** | 0.8410 | 0.1260 |
| **Impostor Pairs ($y = 0$)** | 0.2569 | 0.2333 | 0.0912 | **0.5100** | **0.0425** |

1. **Genuine Threshold Selection:**  
   $\tau_{gen}$ was selected at target $FRR = 5\%$ ($TPR = 95\%$), yielding $\tau_{gen} = 0.2401$.  
   Because the median impostor similarity is $0.2333$, **$47.47\%$ of all impostor pairs scored $\ge 0.2401$**.
2. **Counterfeit Threshold Selection:**  
   $\tau_{cnt}$ was calculated using an arbitrary subtraction heuristic:
   ```python
   thr_cnt = min(thr_cnt, thr_gen - 0.20)  # 0.2401 - 0.20 = 0.0401
   ```
3. **The Collapse:**  
   Because the minimum impostor cosine similarity in the dataset is $0.0425$, **virtually zero negative pairs scored $\le 0.0401$**.
4. **Resulting Bias:**  
   Every single non-abstained test pair was classified as `genuine` ($1$). On a balanced evaluation test set ($N_{gen} = 407$, $N_{imp\_above} = 405$), predicting all positive yields an accuracy of:
   $$\text{Accuracy} = \frac{N_{gen}}{N_{gen} + N_{imp\_above}} = \frac{407}{407 + 405} \approx 50.13\%$$

---

## 2. Principled Validation Threshold Selection

To eliminate bias, thresholds must be selected symmetrically on the validation split (`Ebay_train.txt`), strictly separated from the product-disjoint test split (`Ebay_test.txt`):

1. **Counterfeit Threshold ($\tau_{cnt}$ at Validation $FRR \le 5\%$):**  
   $$\tau_{cnt} = \text{Percentile}_{5\%}(\{S_C \mid y=1\}) = \mathbf{0.2402}$$  
   *Guarantee:* Only 5% of authentic items fall below this threshold. Any pair with $S_C \le 0.2402$ can be classified as counterfeit with bounded false rejection risk ($\le 5\%$).
2. **Genuine Threshold ($\tau_{gen}$ at Validation $FAR \le 5\%$):**  
   $$\tau_{gen} = \text{Percentile}_{95\%}(\{S_C \mid y=0\}) = \mathbf{0.5100}$$  
   *Guarantee:* Only 5% of impostor pairs exceed this threshold. Any pair with $S_C \ge 0.5100$ can be classified as authentic with bounded false acceptance risk ($\le 5\%$).
3. **Calibrated Abstain Band:**  
   $$[0.2402, 0.5100]$$  
   Pairs falling inside this band are flagged as `uncertain` and mapped by Rule 9 of [`backend/app/fusion.py`](file:///C:/Blockchain/anti-counterfeit-3layer/backend/app/fusion.py#L166) to `Manual review`.
4. **Single-Threshold Operating Point (No Abstention):**  
   $$\tau_{opt} = \mathbf{0.2402}$$  
   At this single operating point, all items with $S_C \ge 0.2402$ are called genuine, and all items below are called counterfeit.

---

## 3. Product-Disjoint Test Split Re-Evaluation

Frozen evaluation on 1,782 product-disjoint pairs across 250 classes from `Ebay_test.txt`:

```
======================================================================
SOP EVALUATION METRICS SUMMARY (FROZEN TEST SPLIT)
======================================================================
  Test image pairs evaluated:         1782
  --- MobileNetV2 (1280-d) ---
    ROC-AUC (All Impostors):            0.9115
    ROC-AUC (Hard Negatives):           0.8656
    ROC-AUC (Random Impostors):         0.9574
    FAR @ FRR = 1%:                     0.8013 (thr=0.1503)
    FAR @ FRR = 5%:                     0.4747 (thr=0.2385)
    FAR @ FRR = 10%:                    0.2710 (thr=0.3135)
    ECE Raw (uncalibrated):             0.1337
    ECE Platt Calibrated:               0.0505 (62.24% error reduction)
    Single Operating Accuracy (no abs): 66.95% (1193 / 1782)
    Abstain Band Coverage:              61.17% (1090 / 1782)
    Abstain Rate:                       38.83% (692 / 1782)
    Accuracy on Decisive Pairs:         92.29% (1006 / 1090)
    Confusion Matrix:                   TP=376, FP=53, TN=630, FN=31
```

### Empirical Results Summary Table

| Metric | Measured Value | Meaning & Context |
|---|:---:|---|
| **ROC-AUC (All Impostors)** | **0.9115** | Overall pair ranking capability |
| **ROC-AUC (Hard Negatives)** | **0.8656** | Same superclass, different product class |
| **ROC-AUC (Random Impostors)** | **0.9574** | Distant category impostors |
| **FAR @ FRR = 1%** | **0.8013** | Strict false-reject target forces high false-acceptance |
| **FAR @ FRR = 5%** | **0.4747** | Balanced visual operating point |
| **FAR @ FRR = 10%** | **0.2710** | Relaxed rejection threshold |
| **Raw ECE** | **0.1337** | Expected Calibration Error before Platt scaling |
| **Calibrated ECE** | **0.0505** | Expected Calibration Error after Platt scaling |
| **ECE Reduction** | **62.24%** | Error reduction via logistic calibration |
| **Single-Threshold Binary Accuracy** | **66.95%** | Binary accuracy at $\tau = 0.2402$ with zero abstention |
| **Decision Coverage** | **61.17%** | Fraction of pairs outside abstain band ($1,090 / 1,782$) |
| **Abstain Rate** | **38.83%** | Fraction of pairs deferred to manual review ($692 / 1,782$) |
| **Decisive Pair Accuracy** | **92.29%** | **Accuracy on non-abstaining pairs ($1,006 / 1,090$)** |

---

## 4. Backbone Benchmark: MobileNetV2 vs DINOv2 ViT-S/14

To evaluate whether modern self-supervised vision models improve zero-shot product matching without fine-tuning, **DINOv2 ViT-S/14** (384-d unit-length embeddings) was evaluated on the exact same calibration and test pairs:

| Evaluation Metric | MobileNetV2 (1280-d ImageNet) | DINOv2 ViT-S/14 (384-d Self-Supervised) | Performance Gain |
|---|:---:|:---:|:---:|
| **ROC-AUC (All Impostors)** | 0.9115 | **0.9293** | **+0.0178** |
| **ROC-AUC (Hard Negatives)** | 0.8656 | **0.8797** | **+0.0141** |
| **ROC-AUC (Random Impostors)** | 0.9574 | **0.9788** | **+0.0214** |
| **FAR @ FRR = 1%** | 0.8013 | **0.6077** | -24.2% relative error |
| **FAR @ FRR = 5%** | 0.4747 | **0.3081** | **-35.1% relative error** |
| **FAR @ FRR = 10%** | 0.2710 | **0.2079** | -23.3% relative error |
| **Raw ECE** | 0.1337 | **0.0503** | **-62.4% initial miscalibration** |
| **Calibrated ECE** | 0.0505 | **0.0428** | Superior calibrated confidence |
| **Decision Coverage** | 61.17% | **69.53%** | **+8.36% higher automation** |
| **Abstain Rate** | 38.83% | **30.47%** | **-8.36% lower manual review load** |
| **Decisive Accuracy** | 92.29% | **93.54%** | **TP=401, FP=60, TN=758, FN=20** |

---

## 5. Architectural Implications for Anti-Counterfeiting

1. **Validation of Multi-Signal Fusion Design:**  
   The $38.8\%$ abstain rate and $92.3\%$ decisive accuracy confirm that visual appearance matching should remain an **auxiliary, non-blocking 4th signal**:
   - `Rule 9` in [`backend/app/fusion.py`](file:///C:/Blockchain/anti-counterfeit-3layer/backend/app/fusion.py#L166) routes visual discrepancies to `Manual review`, never outright rejection.
   - Genuine items with ambiguous camera angles or unusual lighting fall inside the abstain band and do not trigger false alarm rejections.
   - Primary security remains rooted in Layer 1 cryptographic identity (AES-CMAC rolling counter) and Layer 2 spatio-temporal behavioral modeling.
2. **Backbone Recommendation:**  
   For edge/mobile deployments with strict RAM limits, **MobileNetV2** (3.5M parameters, 14MB footprint) delivers acceptable product-swap protection ($92.3\%$ accuracy). For cloud verification backends, **DINOv2 ViT-S/14** (21M parameters, 85MB footprint) reduces false alarms by $35.1\%$ and increases automated decision coverage to $69.5\%$.
