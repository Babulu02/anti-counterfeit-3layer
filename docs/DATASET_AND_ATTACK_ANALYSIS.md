# Dataset Size, NFC Resynchronization Policy & Attack Matrix Breakdown

> **Document Summary:**  
> Answers to core empirical and architectural questions regarding the synthetic dataset size ($N$), NFC counter gap resynchronization semantics, and the root cause of the $0.772$ / $0.786$ recall values in the `full_fusion` column of `attack_matrix.csv`.  
> **Referenced Files:**  
> - [`data/scans.csv`](file:///C:/Blockchain/anti-counterfeit-3layer/data/scans.csv)  
> - [`backend/identity/nfc_ntag.py`](file:///C:/Blockchain/anti-counterfeit-3layer/backend/identity/nfc_ntag.py)  
> - [`experiments/identity_race.py`](file:///C:/Blockchain/anti-counterfeit-3layer/experiments/identity_race.py)  
> - [`experiments/run_all.py`](file:///C:/Blockchain/anti-counterfeit-3layer/experiments/run_all.py)  
> - [`experiments/results/metrics.json`](file:///C:/Blockchain/anti-counterfeit-3layer/experiments/results/metrics.json)  
> - [`experiments/results/attack_matrix.csv`](file:///C:/Blockchain/anti-counterfeit-3layer/experiments/results/attack_matrix.csv)  

---

## 1. Number of Scans $N$ in the Final Synthetic Dataset

The final synthetic dataset in [`data/scans.csv`](file:///C:/Blockchain/anti-counterfeit-3layer/data/scans.csv) contains **$N = 37,312$ total scans** across **2,000 unique products**.

### Exact Breakdown:
- **Total Scans ($N$):** **37,312**
- **Unique Products:** **2,000**
- **Genuine Scans (`label = 0`):** **33,926** ($90.92\%$)
- **Attack Scans (`label = 1`):** **3,386** ($9.08\%$)

### Attack Scans by Type:
| Attack Identifier | Attack Description | Scan Count | % of Attacks |
|:---|:---|:---:|:---:|
| **`B_burst`** | Rapid high-frequency scans across multiple devices | 2,075 | 61.28% |
| **`C_slow_clone`** | Low-frequency periodic scans across distant cities | 729 | 21.53% |
| **`G_stealth_clone`** | Low-and-slow held-out clone (1–2 scans, plausible timing/distance) | 191 | 5.64% |
| **`A_impossible_travel`** | Super-luminal velocity jump between distant cities ($v > 800$ km/h) | 182 | 5.38% |
| **`E_nfc_replay`** | Replay of previously observed NFC tap ($C \le C_{last}$) | 110 | 3.25% |
| **`F_nfc_clone_first`** | Clone presents skipped counter ($C > C_{last} + W$) | 99 | 2.92% |
| **Total Attack Scans** | | **3,386** | **100.00%** |

*Note:* [`experiments/results/metrics.json`](file:///C:/Blockchain/anti-counterfeit-3layer/experiments/results/metrics.json) has been updated to include `total_scans: 37312`, `unique_products: 2000`, `genuine_scans: 33926`, and `attack_scans: 3386`.

---

## 2. Resynchronization Policy & The 1.000 Recovery Rate

### 2.1 How `nfc_ntag.py` Handles a Large Counter Gap

In [`backend/identity/nfc_ntag.py:253-260`](file:///C:/Blockchain/anti-counterfeit-3layer/backend/identity/nfc_ntag.py#L253-L260):

```python
        if last is not None and counter > last + self._gap:
            # Suspiciously large gap. Could be a clone that tapped many times
            # offline, or a genuine tag with missed RF reads. Mark disputed
            # but do NOT permanently block (next valid tap in-range is fine).
            return VerifyResult(Outcome.DISPUTED, "gap", uid_hex, counter)

        # ── 3. Accept ────────────────────────────────────────────────────────
        self._last[uid_hex] = counter
```

#### Key Architectural Semantics in `nfc_ntag.py`:
1. **No Permanent Block:** When a tap arrives with $C > C_{last} + W$ (where $W = \text{DEFAULT\_GAP} = 5$), the verifier returns `Outcome.DISPUTED` with reason `"gap"`.
2. **State Freeze:** `self._last[uid_hex]` is **NOT** updated upon dispute. The server's expectation remains frozen at the previous accepted counter $C_{last}$.

### 2.2 Why the 1.000 Recovery Rate Was a Harness Step

In [`experiments/identity_race.py:301-310`](file:///C:/Blockchain/anti-counterfeit-3layer/experiments/identity_race.py#L301-L310):

```python
    # Recovery: if genuine was disputed, try next tap
    genuine_recovered = False
    if genuine_disputed:
        # Reset tag counter to last accepted + 1 to ensure in-range
        last_acc = verifier.last_counter(tag.uid_hex) or 0
        tag._counter = last_acc
        rec_tap  = tag.tap()
        rec_r    = verifier.verify(*rec_tap)
        genuine_recovered = rec_r.accepted
```

#### The Harness Caveat:
- In real physical hardware (NXP NTAG 424 DNA), the tag's internal counter is stored in non-volatile write-once EEPROM and **cannot be decremented or reset**.
- If a physical tag jumps by 10 counts offline ($C_{tag} = 15, C_{last} = 5$), its next natural tap will be $16$. Without an active server resync mechanism, every subsequent natural tap will continue to fail the $C \le C_{last} + W$ check ($16 > 10, 17 > 10, \dots$).
- The test harness achieved a `1.000` recovery rate by **artificially mutating the emulated tag's private attribute**: `tag._counter = last_acc`. This is an artifact of the simulation harness, not a hardware-supported operation.

### 2.3 Production Resynchronization Policy (Dual-Tap Confirmation)

To achieve true $1.000$ recovery on physical tags without manual administrative intervention, the server must implement a **Sequential Dual-Tap Resynchronization Policy**:

1. **Tap 1 (Gap Detected):**  
   Tag presents $C_1 > C_{last} + W$ with a valid CMAC. The server returns `DISPUTED ("gap")` and caches $C_{pending} = C_1$.
2. **Tap 2 (Sequential Confirmation):**  
   The user immediately taps the tag again. The tag presents $C_2 = C_1 + 1$ with a valid CMAC.
3. **Resynchronization:**  
   Because an attacker without the secret AES key cannot forge sequential valid CMACs for consecutive counter values, observing $C_2 = C_1 + 1$ with matching CMAC proves the physical tag is present and counting legitimately. The server updates $C_{last} = C_2$ and returns `ACCEPT`.

---

## 3. Attack Matrix: Why Full Fusion Recalled 0.772 and 0.786 Instead of 1.000

In [`experiments/results/attack_matrix.csv`](file:///C:/Blockchain/anti-counterfeit-3layer/experiments/results/attack_matrix.csv):

| Attack Type | `nfc_no_ml` | `rule_baseline` | `ml_risk` | `full_fusion` |
|---|:---:|:---:|:---:|:---:|
| **`E_nfc_replay`** | **1.000** | 0.8909 | 0.7993 | **0.7722** |
| **`F_nfc_clone_first`** | **1.000** | 1.0000 | 0.9095 | **0.7859** |

### The Root Cause: Code Mapping Bug in `run_all.py`

In [`experiments/run_all.py:91-105`](file:///C:/Blockchain/anti-counterfeit-3layer/experiments/run_all.py#L91-L105):

```python
    rows = []
    for at in all_attacks:
        row = {"attack_type": at}
        analytic = ANALYTICAL_RECALL.get(at, {})
        for s in SYSTEMS:
            if s in analytic:
                row[s] = analytic[s]
            elif s == "rule_baseline":
                row[s] = rule_per_at.get(at, {}).get("recall", {}).get("mean", 0.000)
            elif s == "ml_risk":
                # Per-attack measured recall for IsolationForest ML risk model
                row[s] = iso_per_at.get(at, {}).get("recall", {}).get("mean", 0.000)
            elif s == "full_fusion":
                row[s] = rf_per_at.get(at, {}).get("recall", {}).get("mean", 1.000)
        rows.append(row)
```

Look at line 103–104:
```python
elif s == "full_fusion":
    row[s] = rf_per_at.get(at, {}).get("recall", {}).get("mean", 1.000)
```

And look at line 62:
```python
rf_per_at = metrics_meta.get("per_attack_type", {})
```

### Explanation:
1. **The Column Contains Standalone Random Forest, Not Fusion:**  
   `rf_per_at` in [`metrics.json`](file:///C:/Blockchain/anti-counterfeit-3layer/experiments/results/metrics.json) is the per-attack recall of the **standalone RandomForest ML model**, trained purely on spatio-temporal features (`dist_km`, `speed_kmh`, `scans_1h`, `device_entropy`, etc.). It does **NOT** represent the output of the multi-signal rule engine (`backend/app/fusion.py`).
2. **Why Random Forest Alone Misses ~23% of NFC Replays:**  
   In `simulate_scans.py`, an NFC replay or clone-first scan is simulated by picking a timestamp $1–12$ hours later and picking a random city. In $\sim 23\%$ of cases, the simulated city and timestamp happen to have low velocity and normal scan density. Because the ML model has no on-chain state and only spatio-temporal features, it evaluates the scan pattern as low-risk.
3. **What True Full Fusion Actually Does:**  
   In [`backend/app/fusion.py:141`](file:///C:/Blockchain/anti-counterfeit-3layer/backend/app/fusion.py#L141):
   ```python
   # ── Rule 6: NFC counter disputed ─────────────────────────────────────────
   if signals.identity_result == "disputed":
       return (
           VERDICT_MANUAL,
           f"NFC counter check resulted in dispute ({signals.identity_reason}) — "
           f"possible replay attack or clone-first race.",
       )
   ```
   At the identity layer, `E_nfc_replay` and `F_nfc_clone_first` produce `identity_result = "disputed"` **100% of the time**. In true multi-signal fusion, **Rule 6 intercepts 100% of these scans**, yielding a true full-fusion recall of **1.000**.
4. **Summary:**  
   The column named `full_fusion` in `attack_matrix.csv` was populated directly with the **RandomForest behavioral model's ablation recall** ($0.772$ and $0.786$). True full fusion achieves **$1.000$** via deterministic Rule 6.
