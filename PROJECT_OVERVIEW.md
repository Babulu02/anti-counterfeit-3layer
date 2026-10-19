# Anti-Counterfeiting Prototype: Comprehensive System Overview

> **Document Note:** This document is generated programmatically by `experiments/make_overview.py`.
> All metrics, counts, thresholds, package versions, and contract details are dynamically parsed from source files, test collectors, and experiment results artifacts.
> **Status:** 129 backend pytest tests passing, 43 contract Truffle tests passing.

---

## 1. Research Motivation & Theoretical Foundations

### 1.1 Context and Shortcomings of Prior Art: HACP5
This project builds directly upon the architecture presented in:
*“A Holistic Anti-Counterfeiting Platform Using NFC and Blockchain”* (HACP5, *Computers, Materials & Continua*, CMC 2025).

The original HACP5 paper combined physical NFC chips with an Ethereum smart contract. Under the HACP5 protocol, an on-chain counter or tag state is updated synchronously during product verification. However, rigorous security analysis reveals critical real-world vulnerabilities:

1. **Clone-First Race Condition:** In HACP5, if an attacker skims a genuine tag's credentials and submits an on-chain transaction before the legitimate owner, the contract advances the registered tag state. When the legitimate consumer subsequently presents the genuine physical tag, HACP5 flags it as a duplicate or counterfeit, permanently locking out the authentic item.
2. **Brittle Binary Verification:** HACP5 relies strictly on exact counter equality. It lacks spatio-temporal behavioral analysis, failing to detect parallel clones operating across distant geographical locations.
3. **Network Latency & Front-Running:** Requiring on-chain write transactions during the consumer scan loop creates user friction and vulnerability to network reordering.

### 1.2 Our Architectural Improvements
To address these limitations, our research prototype introduces:
- **Dual-Channel Cryptographic Identity:** Combines HMAC-SHA256 signed QR codes with dynamic AES-128 CMAC rolling counter emulation (matching the NXP NTAG 424 DNA SUN standard).
- **Soft Dispute Handling (`ManualReview`):** Counter replays and gaps do not permanently invalidate tags. Instead, they enter a soft `ManualReview` state where genuine tags can recover on subsequent sequential taps.
- **Spatio-Temporal ML Anomaly Detection:** An 8-feature behavioral model detecting impossible travel velocity (Haversine), burst frequency, and device entropy.
- **Deterministic Multi-Signal Fusion:** A 10-rule priority cascade yielding auditable verdicts: `Verified`, `ManualReview`, `Suspicious activity`, and `Unregistered product`.
- **Optional Auxiliary Visual Verification:** Transfer-learned MobileNetV2 1280-d embeddings calibrated with Platt scaling, incorporating an explicit abstain band to prevent false rejections.

---

## 2. Technology Stack & Software Versions

The environment versions below were read directly from `backend/.venv` via `pip freeze` and local configuration:

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Python Environment** | Python | 3.11.9 (`backend/.venv`) | Backend, ML training, evaluation |
| **FastAPI** | fastapi | 0.111.0 | Async REST API |
| **ASGI Server** | uvicorn | 0.29.0 | Web server |
| **Web3 Client** | web3.py | 8.0.0 | Ethereum client (EIP-1559 support) |
| **Pydantic** | pydantic | 2.14.1 | Schema validation |
| **ORM** | SQLAlchemy | 2.0.30 | Database engine and session mapping |
| **Machine Learning** | scikit-learn | 1.4.2 | Behavioral anomaly detection models |
| **Deep Learning** | PyTorch | 2.14.1+cpu | MobileNetV2 visual feature extraction |
| **Testing Engine** | pytest | 7.4.4 | 129 automated backend unit & integration tests |
| **Contract Framework** | Truffle | 5.11.5 | 43 automated EVM contract test specifications |
| **Local Blockchain** | Ganache CLI | 7.9.1 | Local deterministic testnet on port 7546 |
| **Frontend Framework** | React / Vite | 18.3.1 / 6.0.3 | Web interface application |
| **Web3 Frontend** | ethers.js | 6.13.4 | In-browser MetaMask contract interaction |

---

## 3. Blockchain & Smart Contract Architecture

- **Contract:** `ProductRegistry.sol` (Solidity 0.8.20, optimizer runs=200).
- **Deployed Address:** `0xCfEB869F69431e42cdB54A4F4f105C19C080A601` (read from `.env`).
- **Network Parameters:** Ganache CLI, Port 7546, Chain ID 1337 (`--deterministic --accounts 10`).

### 3.1 Account Roles (Deterministic Ganache CLI)
*No private keys are stored in documentation or repository files.*

- **Account #0 (`0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1`):** Contract Owner / Deployer. Authorized to manage manufacturer whitelists (`addManufacturer`, `removeManufacturer`) and assign the operator (`setOperator`).
- **Account #1 (`0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0`):** Backend Operator. Authorized to call `logScan` and `markSold`.
- **Account #2 (`0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b`):** Primary Manufacturer. Authorized to call `registerProduct` once whitelisted.
- **Accounts #3–#9:** Auxiliary manufacturers and consumer accounts.

### 3.2 State Functions & Events
- `addManufacturer(address _mfr)`: Whitelists a manufacturer address (`onlyOwner`).
- `removeManufacturer(address _mfr)`: Revokes manufacturer permissions (`onlyOwner`).
- `setOperator(address _newOperator)`: Updates the backend operator account (`onlyOwner`).
- `registerProduct(bytes32 productId, bytes32 recordHash)`: Registers product identity (`onlyManufacturer`).
- `markSold(bytes32 productId)`: Marks a product as sold upon consumer purchase (`onlyOperator`).
- `logScan(bytes32 productId, bytes32 scanHash, uint8 verdict)`: Appends auditable scan verdict to ledger (`onlyOperator`).

### 3.3 Accurate Privacy Analysis: Secret-Salted On-Chain Hashing
Zero plaintext coordinates, device IDs, or consumer identities are stored on-chain:
- **`recordHash`:** SHA-256 over `name|brand|serial|image_sha256`.
- **`scanHash`:** SHA-256 over `salt|productId|channel|deviceHash|lat|lon|ts`.

> **Privacy Disclosure:** Without a secret salt, an unsalted hash over low-entropy data (such as city coordinates rounded to 2 decimals and timestamps within a known 1-hour window) can be inverted via offline dictionary or rainbow-table attacks. To prevent this, the backend incorporates a server-side secret salt (`IDENTITY_HMAC_SECRET` from `.env`) into `build_scan_hash()` (implemented in `backend/app/chain.py`), making the on-chain scan hashes preimage-resistant against third-party ledger observers.

---

## 4. Attack Scenarios & Behavioral Simulation

The synthetic dataset generator (`experiments/simulate_scans.py`) simulates realistic journeys across 2,000 products with realistic GPS noise (+/- 0.012 deg) and 7 distinct attack patterns:

| Attack Code | Attack Identifier | Technical Characteristics | Citation |
|:---:|---|---|---|
| **A** | `impossible_travel` | Physical velocity > 1200 km/h between consecutive scans using Haversine calculation. | `experiments/simulate_scans.py` |
| **B** | `burst` | Rapid barrage of 15–30 scans within 15 minutes on a single product ID. | `experiments/simulate_scans.py` |
| **C** | `slow_clone` | Low-frequency clone scans dispersed across 5–8 distinct cities over several weeks. | `experiments/simulate_scans.py` |
| **D** | `unregistered` | Fabricated product identifiers not present on the Ethereum blockchain. | `experiments/simulate_scans.py` |
| **E** | `nfc_replay` | Presentation of a counter value <= last accepted hardware counter (delta <= 0). | `experiments/simulate_scans.py` |
| **F** | `nfc_clone_first` | Attacker skims tag first; subsequent genuine read exhibits large counter jump (> 10). | `experiments/simulate_scans.py` |
| **G** | `stealth_clone` | **HELD-OUT TEST SET ONLY:** Low-and-slow clone mimicking normal consumer cadence. Zero exposure during training. | `experiments/simulate_scans.py` |

---

## 5. Machine Learning Evaluation & Honest Benchmark Results

Evaluated across 5 independent random seeds (`42, 7, 13, 99, 256`):

### 5.1 Model Comparison
*Generated directly from `experiments/results/metrics.json` and `experiments/results/model_comparison.csv`:*

| Model | Precision | Recall | F1 Score | ROC-AUC | FAR (Friction on Genuine) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **FairRuleBaseline** | 0.704+/-0.028 | 0.455+/-0.060 | 0.551+/-0.051 | 0.733+/-0.026 | 0.017+/-0.003 |
| **IsolationForest** | 0.648+/-0.028 | 0.670+/-0.023 | 0.659+/-0.020 | 0.881+/-0.008 | 0.032+/-0.003 |
| **RandomForestClassifier** | 0.975+/-0.019 | 0.753+/-0.037 | 0.849+/-0.016 | 0.978+/-0.004 | 0.002+/-0.002 |

- **FairRuleBaseline Thresholds:** `speed_kmh` = 750.0 km/h, `burst_1h` = 3, `gap_thresh` = 8 (from `experiments/results/thresholds.json`).
- **Model Decision Thresholds:** RandomForest = 0.75, IsolationForest = 0.5935.

### 5.2 Security Comparison Matrix
*Generated directly from `experiments/results/attack_matrix.csv`:*

| attack_type | static_qr | hacp5 | chain_only | nfc_no_ml | rule_baseline | ml_risk | full_fusion |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| A_impossible_travel | 0.0 | 0.0 | 0.0 | 0.0 | 0.7506944444444446 | 0.8973611111111112 | 0.8740277777777777 |
| B_burst | 0.0 | 0.0 | 0.0 | 0.0 | 0.8510324010879643 | 0.8425367889606952 | 0.9669824489864386 |
| C_slow_clone | 0.0 | 0.0 | 0.0 | 0.0 | 0.025605653184318743 | 0.7517038664859588 | 0.8851610068707588 |
| D_unregistered | 0.0 | 0.0 | 1.0 | 1.0 | 0.0 | 0.0 | 1.0 |
| E_nfc_replay | 0.0 | 1.0 | 0.0 | 1.0 | 0.8908888888888888 | 0.7993333333333333 | 0.7722222222222223 |
| F_nfc_clone_first | 0.0 | 0.0 | 0.0 | 1.0 | 1.0 | 0.9094605475040257 | 0.7858615136876007 |
| G_stealth_clone | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.23874345549738218 | 0.25968586387434556 |
| user_friction_far | 0.0 | 1.0 | 0.0 | 0.0 | 0.01696544669496349 | 0.03249757904115842 | 0.0019602509437630206 |

### 5.3 Multi-Layer Ablation Study
*Generated directly from `experiments/results/ablation.csv`:*

| condition | f1_mean | f1_std | far_mean | far_std |
| :--- | :---: | :---: | :---: | :---: |
| full_fusion | 0.8520516696546141 | 0.012829451482707557 | 0.0021894849194863493 | 0.0013033938754308594 |
| no_ml | 0.5512832012473152 | 0.050796613343241544 | 0.01696544669496349 | 0.0025555010616684086 |
| no_nfc_counter | 0.8443813390275821 | 0.017389915268250115 | 0.0019542743911347706 | 0.001226176488153251 |
| leaky_sequence_features (cautionary baseline) | 0.9993521339858493 | 0.000601859679442692 | 0.00011844616681523042 | 0.00010552973820567032 |

---

## 6. NFC Verification & Gap Tolerance Policy

Implemented in `backend/identity/nfc_ntag.py`:

- **Hardware Standard:** Emulates NXP NTAG 424 DNA Secure Unique NFC (SUN) protocol.
- **Authentication:** AES-128 CMAC truncated to 64 bits over `UID || Counter`.
- **Gap Tolerance Parameter ($W = 5$):** Real-world NFC scans can miss intermediate increments due to radio frequency dropouts or user interruptions. The verifier permits counter jumps up to $W = 5$ taps (`DEFAULT_GAP = 5` in `backend/identity/nfc_ntag.py`).
- **Decision Logic:**
  - `ACCEPT`: counter > last AND counter <= last + W AND CMAC is valid.
  - `DISPUTED`: counter <= last (replay or counter rollback).
  - `DISPUTED`: counter > last + W (suspicious gap jump).
  - `REJECT`: CMAC verification fails (invalid key or forged MAC).

### 6.1 Clone-First Race Benchmark (1,000 Trials x 5 Seeds)
*Generated directly from `experiments/results/race.csv`:*

| scheme | scenario | n_trials | clone_accepted_rate_mean | clone_accepted_rate_std | genuine_rejected_rate_mean | genuine_rejected_rate_std | genuine_disputed_rate_mean | genuine_disputed_rate_std | genuine_recovered_rate_mean | genuine_recovered_rate_std |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| static_qr | replay | 1000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| static_qr | skim_first | 1000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| static_qr | guess | 1000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| hacp5_baseline | replay | 1000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| hacp5_baseline | skim_first | 1000 | 1.0000 | 0.0000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| hacp5_baseline | guess | 1000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |
| nfc_cmac | replay | 1000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.3718 | 0.0181 | 1.0000 | 0.0000 |
| nfc_cmac | skim_first | 1000 | 1.0000 | 0.0000 | 0.0000 | 0.0000 | 1.0000 | 0.0000 | 1.0000 | 0.0000 |
| nfc_cmac | guess | 1000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 | 0.0000 |

> **Disputed-to-ManualReview Rule:** When an NFC counter exhibits a replay or large jump, `backend/app/fusion.py` assigns verdict `Manual review` rather than `Suspicious activity`. This ensures that legitimate consumers caught in clone-first race conditions are not permanently locked out, allowing recovery on subsequent sequential reads.

---

## 7. Multi-Signal Deterministic Fusion Rules

Implemented in `backend/app/fusion.py` (Rule Priority Order 1 to 10):

| Rule # | Condition / Trigger | Verdict Assigned | Rationale | Cited Source |
|:---:|---|:---:|---|---|
| **1** | Product missing on-chain (`not on_chain`) | `Unregistered product` | Unregistered serial or counterfeit barcode. | `backend/app/fusion.py:101` |
| **2** | NFC key mismatch (`identity_result == 'bad_mac'`) | `Suspicious activity` | Forged tag without valid AES master key. | `backend/app/fusion.py:108` |
| **3** | High ML risk score (risk >= 0.75) | `Suspicious activity` | Multi-feature spatio-temporal anomaly detected. | `backend/app/fusion.py:116` |
| **4** | Sold on-chain AND scanned in new location | `Suspicious activity` | Duplicate product circulating post-sale. | `backend/app/fusion.py:125` |
| **5** | QR signature invalid (`identity_result == 'invalid'`) | `Suspicious activity` | Tampered QR payload or bad HMAC. | `backend/app/fusion.py:133` |
| **6** | NFC counter disputed (`identity_result == 'disputed'`) | `Manual review` | Replay or counter gap; enables genuine recovery. | `backend/app/fusion.py:141` |
| **7** | Already sold on-chain (same location / resale) | `Manual review` | Resale or packaging reuse requires verification. | `backend/app/fusion.py:149` |
| **8** | Medium ML risk score (risk >= 0.3750) | `Manual review` | Minor anomaly pattern requiring operator check. | `backend/app/fusion.py:157` |
| **9** | Visual mismatch (`image_result == 'counterfeit'`) | `Manual review` | Packaging discrepancy flagged by MobileNetV2. | `backend/app/fusion.py:166` |
| **10**| All signals normal | `Verified` | Valid crypto, on-chain active, normal behavior. | `backend/app/fusion.py:174` |

---

## 8. Auxiliary Visual Consistency Verification (MobileNetV2)

Implemented in `ml/image_signal/embedder.py` and evaluated in `ml/image_signal/evaluate_sop.py`:

- **Backbone Architecture:** MobileNetV2 pretrained on ImageNet (1280-d unit-length feature embedding).
- **Evaluation Dataset:** Stanford Online Products (SOP) — `1782` test pairs evaluated.
- **Discrimination Thresholds (`ml/image_signal/artifacts/image_thresholds.json`):**
  - Genuine threshold: $S_C \ge 0.2401$
  - Counterfeit threshold: $S_C \le 0.0401$
  - Abstain band: $0.0401 < S_C < 0.2401$

### 8.1 Empirical Visual Evaluation Results
*Generated directly from `ml/image_signal/artifacts/sop_eval_results.json`:*

| Metric | Measured Value | Meaning & Context |
|---|:---:|---|
| **ROC-AUC (All Impostors)** | 0.9115 | Overall pair discrimination capability |
| **ROC-AUC (Hard Negatives)** | 0.8656 | Same superclass, different product class |
| **ROC-AUC (Random Impostors)** | 0.9574 | Distant categories |
| **FAR @ FRR = 1%** | 0.8013 (80.1%) | High security target yields high false acceptance |
| **FAR @ FRR = 5%** | 0.4747 (47.5%) | Medium security target |
| **FAR @ FRR = 10%** | 0.2710 (27.1%) | Relaxed rejection threshold |
| **Raw ECE** | 0.1337 | Expected Calibration Error before Platt scaling |
| **Calibrated ECE** | 0.0505 | Expected Calibration Error after Platt scaling |
| **ECE Error Reduction** | 62.24% | Calibration improvement via logistic regression |
| **Decision Coverage** | 0.6302 (63.0%) | Fraction of test pairs outside the abstain band |
| **Abstain Rate** | 0.3698 (37.0%) | Fraction of ambiguous pairs deferred |
| **Frozen Decision Accuracy** | **0.5013 (50.1%)** | Accuracy on non-abstaining pairs |

### 8.2 Explanation of the Frozen Accuracy (~0.50)
The frozen accuracy on non-abstaining pairs is **50.13%**, essentially random chance on a balanced binary task. This occurs because the MobileNetV2 backbone is frozen on generic ImageNet features without domain-specific metric learning (e.g. triplet or contrastive fine-tuning on Stanford Online Products). 

This empirical finding validates our core architectural decision: **the visual image signal is treated strictly as an auxiliary, non-blocking 4th signal with an explicit abstain band** (`Rule 9` maps counterfeits to `Manual review`, never outright rejection). The primary security guarantees remain anchored in Layer 1 cryptographic identity and Layer 2 spatio-temporal behavioral modeling.

---

## 9. On-Chain Gas Usage & Verification Latency

*Generated directly from `experiments/results/gas_latency.csv`:*

| type | name_or_function | value | unit |
| :--- | :---: | :---: | :---: |
| gas | addManufacturer | 47529 | gas |
| gas | registerProduct | 115709 | gas |
| gas | markSold | 30978 | gas |
| gas | logScan(verdict=0 Verified) | 26714 | gas |
| gas | logScan(verdict=1 ManualReview) | 26726 | gas |
| gas | logScan(verdict=2 Suspicious) | 26726 | gas |
| gas | logScan(verdict=3 Unregistered) | 26726 | gas |
| gas | removeManufacturer | 25518 | gas |
| gas | setOperator | 30685 | gas |
| latency_e2e_api | median | 161.13 | ms |
| latency_e2e_api | p95 | 201.4 | ms |
| latency_e2e_api | mean | 163.99 | ms |
| latency_e2e_api | std | 19.29 | ms |
| latency_e2e_api | min | 131.75 | ms |
| latency_e2e_api | max | 304.62 | ms |
| latency_e2e_api | requests_count | 200 | requests |

---

## 10. End-to-End Operational Walkthrough

To verify the complete platform in a browser:

1. **Start the Stack:**
   - Terminal 1: `ganache --port 7546 --deterministic --accounts 10 --networkId 1337`
   - Terminal 2: `truffle migrate --network cli --reset` (in `contracts/`)
   - Terminal 3: `.\backend\.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
   - Terminal 4: `npm run dev` (in `frontend/`, opens `http://localhost:5173/`)
2. **Authorize Manufacturer:** Go to `/admin`, connect MetaMask with Account #0, click **"Use Account #2 (Default)"**, then click **"✨ Whitelist via MetaMask"**.
3. **Register Product:** Go to `/manufacturer`, enter product details (e.g. `Rolex Submariner`), select an image, and submit registration. Copy the generated Product ID and NFC payload.
4. **First Verification (Authentic Scan):** Go to `/verify`, select NFC mode, enter the UID, counter `1`, and CMAC. Click **Verify** -> Status: `Verified`.
5. **Replay NFC Tap (Soft Dispute):** On `/verify`, submit the exact same counter `1` again -> Status: `Manual review` (NFC counter anomaly detected).
6. **Mark as Sold (Consumer Point-of-Sale):** In the Consumer Action card on `/verify`, click **"🏷️ Mark as Sold"** -> Triggers on-chain `markSold()` transaction.
7. **Post-Sale Scan:** Click **Verify** again -> Status: `Manual review` (Product has already been sold on-chain).
8. **Dashboard Inspection:** Go to `/dashboard` -> Live charts reflect the verified, disputed, and sold events.
