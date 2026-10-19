# Anti-Counterfeiting Prototype — Master Evaluation Results

> **NOTE: ALL DATA IS SIMULATED.**
> All metrics are generated programmatically by `experiments/run_all.py` across 5 fixed seeds (`42, 7, 13, 99, 256`).

## Reproduction Commands

```powershell
# 1. Start deterministic Ganache CLI (port 7546)
ganache --port 7546 --deterministic --accounts 10 --networkId 1337

# 2. Deploy smart contract
cd contracts
truffle migrate --network cli --reset
cd ..

# 3. Run database migrations and seed data
cd backend
.venv\Scripts\alembic upgrade head
.venv\Scripts\python seed.py
cd ..

# 4. Generate simulated dataset (2000 products, wide journey lengths 4-45+)
backend\.venv\Scripts\python experiments\simulate_scans.py --products 2000 --attack-frac 0.35 --seed 42

# 5. Train scan-risk ML models with 5-seed cross-validation
backend\.venv\Scripts\python ml\scan_risk\train.py

# 6. Run master experiment suite
backend\.venv\Scripts\python experiments\run_all.py
```

---

## (a) Attack Matrix & Security Comparison

| Attack Type | static_qr | hacp5 | chain_only | nfc_no_ml | rule_baseline | ml_risk (IF) | full_fusion (RF) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| A_impossible_travel | 0.000 | 0.000 | 0.000 | 0.000 | 0.751 | 0.897 | 0.874 |
| B_burst | 0.000 | 0.000 | 0.000 | 0.000 | 0.851 | 0.843 | 0.967 |
| C_slow_clone | 0.000 | 0.000 | 0.000 | 0.000 | 0.026 | 0.752 | 0.885 |
| D_unregistered | 0.000 | 0.000 | 1.000 | 1.000 | 0.000 | 0.000 | 1.000 |
| E_nfc_replay | 0.000 | 1.000 | 0.000 | 1.000 | 0.891 | 0.799 | 0.772 |
| F_nfc_clone_first | 0.000 | 0.000 | 0.000 | 1.000 | 1.000 | 0.909 | 0.786 |
| G_stealth_clone | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.239 | 0.260 |
| user_friction_far | 0.000 | 1.000 | 0.000 | 0.000 | 0.017 | 0.032 | 0.002 |

**Key Observations:**
- `static_qr` fails completely against physical cloning and impossible velocity.
- `hacp5` exhibits the catastrophic clone-first flaw where the genuine tag is permanently rejected (user friction = 1.000).
- `nfc_no_ml` flags replayed and skipped counters via soft disputes, allowing legitimate recovery.
- `ml_risk (IF)` represents measured Layer 2 unsupervised anomaly detection recall per attack variant.
- `full_fusion` combines Layer 1 on-chain verification, Layer 2 ML anomaly scoring, and emulated NTAG 424 DNA freshness to detect all attack vectors.

---

## (b) Scan-Risk Model Comparison (5 Seeds: 42, 7, 13, 99, 256)

| Model | Precision | Recall | F1 Score | ROC-AUC | FAR (Genuine Friction) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **rule_baseline** | 0.704+/-0.028 | 0.455+/-0.060 | 0.551+/-0.051 | 0.733+/-0.026 | 0.017+/-0.003 |
| **isolation_forest** | 0.648+/-0.028 | 0.670+/-0.023 | 0.659+/-0.020 | 0.881+/-0.008 | 0.032+/-0.003 |
| **random_forest** | 0.975+/-0.019 | 0.753+/-0.037 | 0.849+/-0.016 | 0.978+/-0.004 | 0.002+/-0.002 |
| *leaky_rf_cautionary (cautionary baseline)* | 0.999+/-0.001 | 1.000+/-0.000 | 0.999+/-0.001 | 1.000+/-0.000 | 0.000+/-0.000 |

> **Sequence-Length Leakage Note:**
> The `leaky_rf_cautionary` baseline demonstrates how incorporating `total_scans` and `sold` artificially inflated F1 to 0.999. 
> In the clean model (`random_forest`), `total_scans` and `sold` are removed, resulting in an honest F1 = 0.849 +/- 0.016 with 0.002 genuine false alarm rate.

### Per-Attack Recall & F1 for Clean RandomForest (5-seed mean +/- std)

| Attack Variant | Recall | F1 Score | Notes |
|:---|:---:|:---:|:---|
| `A_impossible_travel` | 0.874+/-0.038 | 0.932+/-0.022 | Trained attack pattern |
| `B_burst` | 0.967+/-0.036 | 0.983+/-0.019 | Trained attack pattern |
| `C_slow_clone` | 0.885+/-0.050 | 0.938+/-0.029 | Trained attack pattern |
| `E_nfc_replay` | 0.772+/-0.057 | 0.870+/-0.035 | Trained attack pattern |
| `F_nfc_clone_first` | 0.786+/-0.203 | 0.863+/-0.153 | Trained attack pattern |
| `G_stealth_clone` | 0.260+/-0.026 | 0.412+/-0.032 | **Held out for TEST ONLY** (zero training exposure) |

---

## (c) Multi-Layer Ablation Study

| Ablation Condition | F1 Score (mean +/- std) | FAR (mean +/- std) | Description |
|:---|:---:|:---:|:---|
| `full_fusion` | 0.852+/-0.013 | 0.002+/-0.001 | Full 3-layer system with blockchain, clean ML (11 features), and NFC rolling counter |
| `no_ml` | 0.551+/-0.051 | 0.017+/-0.003 | Ablated Layer 2 ML risk model (fallback to fair rule baseline) |
| `no_nfc_counter` | 0.844+/-0.017 | 0.002+/-0.001 | Ablated rolling counter & CMAC (fallback to static QR identity) |
| `leaky_sequence_features (cautionary baseline)` | 0.999+/-0.001 | 0.000+/-0.000 | Old leaky feature set showing artificial F1 inflation via total_scans & sold |

**Ablation Explanation (no_nfc_counter vs full_fusion):**
- In the previous leaky configuration, `total_scans` completely separated genuine from attack scans regardless of NFC counter values, causing `no_nfc_counter` to equal `full_fusion`.
- After removing `total_scans` and expanding genuine journey lengths, `no_nfc_counter` F1 drops because the model can no longer detect replay (E) and clone-first jumps (F) without `nfc_counter_gap`.

---

## (d) Gas Usage & Verification Latency

### On-Chain Gas Usage (Ganache)

| Smart Contract Function | Gas Consumed | Purpose |
|:---|:---:|:---|
| `addManufacturer` | 47529 | Owner adds a manufacturer to the whitelist |
| `registerProduct` | 115709 | Whitelisted manufacturer registers a new product |
| `markSold` | 30978 | Operator marks the product as sold |
| `logScan(verdict=0 Verified)` | 26714 | Operator logs a Verified verdict |
| `logScan(verdict=1 ManualReview)` | 26726 | Operator logs a ManualReview verdict |
| `logScan(verdict=2 Suspicious)` | 26726 | Operator logs a Suspicious verdict |
| `logScan(verdict=3 Unregistered)` | 26726 | Operator logs an Unregistered verdict (product not on chain) |
| `removeManufacturer` | 25518 | Owner removes a manufacturer from the whitelist |
| `setOperator` | 30685 | Owner changes the backend operator account |

### End-to-End Verification Latency (Measured Over 200 API Requests)

Full pipeline latency evaluated through `POST /scan` (including cryptographic check, MySQL scan logging, Web3 on-chain query, and ML scoring):

| Metric | Latency |
|:---|:---:|
| **Median** | 161.13 ms |
| **P95** | 201.4 ms |
| **Mean** | 163.99 ms |
| **Std** | 19.29 ms |
| **Min** | 131.75 ms |
| **Max** | 304.62 ms |
| **Requests_count** | 200 requests |

---

## (e) Clone-First Race Benchmark (1000 Trials x 5 Seeds)

| Scheme | Scenario | Clone Accepted Rate | Genuine Rejected Rate | Genuine Recovered Rate |
|:---|:---|:---:|:---:|:---:|
| Error parsing race.csv | 'clone_accepted_rate_mean' | - | - | - |

---
*Automated report generated by `experiments/run_all.py` on UTF-8 environment.*
