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

# 4. Generate simulated dataset (2000 products)
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
| A_impossible_travel | 0.000 | 0.000 | 0.000 | 0.000 | 1.000 | 0.757 | 1.000 |
| B_burst | 0.000 | 0.000 | 0.000 | 0.000 | 1.000 | 0.757 | 1.000 |
| C_slow_clone | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.757 | 1.000 |
| D_unregistered | 0.000 | 0.000 | 1.000 | 1.000 | 1.000 | 0.757 | 1.000 |
| E_nfc_replay | 0.000 | 1.000 | 0.000 | 1.000 | 1.000 | 0.757 | 1.000 |
| F_nfc_clone_first | 0.000 | 0.000 | 0.000 | 1.000 | 1.000 | 0.757 | 1.000 |
| G_stealth_clone | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.757 | 1.000 |
| user_friction_far | 0.000 | 1.000 | 0.000 | 0.000 | 0.111 | 0.020 | 0.000 |

**Key Observations:**
- `static_qr` fails completely against physical cloning and impossible velocity.
- `hacp5` exhibits the catastrophic clone-first flaw where the genuine tag is permanently rejected (user friction = 1.000).
- `nfc_no_ml` flags replayed and skipped counters via soft disputes, allowing legitimate recovery.
- `full_fusion` combines Layer 1 on-chain verification, Layer 2 ML anomaly scoring, and emulated NTAG 424 DNA freshness to detect all attack vectors.

---

## (b) Scan-Risk Model Comparison (5 Seeds: 42, 7, 13, 99, 256)

| Model | Precision | Recall | F1 Score | ROC-AUC | FAR (Genuine Friction) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **rule_baseline** | 0.526+/-0.023 | 0.503+/-0.034 | 0.513+/-0.021 | 0.765+/-0.012 | 0.111+/-0.008 |
| **isolation_forest** | 0.904+/-0.024 | 0.757+/-0.018 | 0.824+/-0.012 | 0.960+/-0.003 | 0.020+/-0.005 |
| **random_forest** | 1.000+/-0.000 | 1.000+/-0.000 | 1.000+/-0.000 | 1.000+/-0.000 | 0.000+/-0.000 |

### Per-Attack Recall & F1 for RandomForest (5-seed mean +/- std)

| Attack Variant | Recall | F1 Score | Notes |
|:---|:---:|:---:|:---|
| `A_impossible_travel` | 1.000+/-0.000 | 1.000+/-0.000 | Trained attack pattern |
| `B_burst` | 1.000+/-0.000 | 1.000+/-0.000 | Trained attack pattern |
| `C_slow_clone` | 1.000+/-0.000 | 1.000+/-0.000 | Trained attack pattern |
| `E_nfc_replay` | 1.000+/-0.000 | 1.000+/-0.000 | Trained attack pattern |
| `F_nfc_clone_first` | 1.000+/-0.000 | 1.000+/-0.000 | Trained attack pattern |
| `G_stealth_clone` | 1.000+/-0.000 | 1.000+/-0.000 | Held out for TEST ONLY (zero training exposure) |

---

## (c) Multi-Layer Ablation Study

| Ablation Condition | F1 Score (mean +/- std) | FAR (mean +/- std) | Description |
|:---|:---:|:---:|:---|
| `full_fusion` | 1.000+/-0.000 | 0.000+/-0.000 | Full 3-layer system with blockchain, ML, and NFC rolling counter |
| `no_chain` | 0.901+/-0.014 | 0.006+/-0.004 | Ablated on-chain status (sold flag and on-chain lifecycle missing) |
| `no_ml` | 0.513+/-0.021 | 0.111+/-0.008 | Ablated Layer 2 ML risk model (fallback to fair rule baseline) |
| `no_nfc_counter` | 1.000+/-0.001 | 0.000+/-0.000 | Ablated rolling counter & CMAC (fallback to static QR identity) |

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
| **Median** | 192.46 ms |
| **P95** | 218.52 ms |
| **Mean** | 193.35 ms |
| **Std** | 15.0 ms |
| **Min** | 161.93 ms |
| **Max** | 232.83 ms |
| **Requests_count** | 200 requests |

---

## (e) Clone-First Race Benchmark (1000 Trials x 5 Seeds)

| Scheme | Scenario | Clone Accepted Rate | Genuine Rejected Rate | Genuine Recovered Rate |
|:---|:---|:---:|:---:|:---:|
| Error parsing race.csv | 'clone_accepted_rate_mean' | - | - | - |

---
*Automated report generated by `experiments/run_all.py` on UTF-8 environment.*
