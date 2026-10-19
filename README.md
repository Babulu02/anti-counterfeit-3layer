# anti-counterfeit-3layer

A four-layer anti-counterfeiting research prototype combining Ethereum smart contracts, dynamic NFC CMAC + QR identity, ML spatio-temporal scan anomaly detection, multi-signal fusion, and MobileNetV2 visual consistency verification (extending and fixing HACP5, CMC 2025).

> **Status:** All Phases 1–8 complete and verified. 129 automated tests passing.

---

## Architecture Overview

```
Layer 1  →  Blockchain & Physical Identity
              - ProductRegistry.sol (Solidity 0.8.20 on Ganache port 7546)
              - Dual-channel: HMAC-signed QR + AES-128 CMAC rolling counter (NTAG 424 DNA emulation)
              - Append-only on-chain verdict audit trail (logScan)

Layer 2  →  ML Scan-Risk Behavioral Engine (Python, scikit-learn)
              - Features: speed_kmh, burst frequency, device entropy, NFC counter freshness gap
              - Models: FairRuleBaseline → IsolationForest → RandomForestClassifier
              - Trained on 2,000 products with realistic noise; evaluated with held-out attack G_stealth_clone

Layer 3  →  Multi-Signal Fusion Engine (FastAPI backend)
              - Priority rules mapping signals into four verdicts:
                Verified | Manual review | Suspicious activity | Unregistered product

Layer 4  →  Optional Visual Image Signal (MobileNetV2, PyTorch)
              - 1280-d unit-length feature embedding + cosine similarity
              - Platt scaling calibration on Stanford Online Products dataset
              - Graceful degradation: absent/ambiguous image is ignored (abstain band)
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Windows 10/11 | 64-bit | Operating system |
| Python | 3.11.9 | Backend, ML, experiments (`backend/.venv`) |
| Node.js | 24.20.0 | Frontend build and Ganache runtime |
| npm | 11.19.0 | Package manager |
| Truffle | 5.11.5 | Smart contract compilation and deployment |
| Ganache CLI | 7.9.1 | Local Ethereum blockchain (`--port 7546`) |
| MySQL | 9.x | Relational storage (`anticounterfeit`, `anticounterfeit_test`) |

---

## Windows Run Steps (Step-by-Step)

### 1. Start Ganache Blockchain (Terminal 1)

In a dedicated PowerShell window:
```powershell
ganache --port 7546 --deterministic --accounts 10 --networkId 1337
```
Leave this window running. Port 7546 matches `.env`.

### 2. Deploy Smart Contracts to Ganache

```powershell
cd C:\Blockchain\anti-counterfeit-3layer\contracts
truffle migrate --network cli --reset
cd ..
```
*Note: The contract deploys to `0xCfEB869F69431e42cdB54A4F4f105C19C080A601` on deterministic Ganache account 0.*

### 3. Configure Environment Variables (`.env`)

Copy the template if not already done:
```powershell
Copy-Item .env.example .env
```
Ensure `.env` contains:
```ini
DB_USER=ac_user
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=anticounterfeit
TEST_DB_NAME=anticounterfeit_test
RPC_URL=http://127.0.0.1:7546
CONTRACT_ADDRESS=0xCfEB869F69431e42cdB54A4F4f105C19C080A601
SOP_ROOT=C:\Project-MF\Stanford_Online_Products
```

### 4. Run Database Migrations (Alembic)

```powershell
.\backend\.venv\Scripts\python.exe -m alembic upgrade head
```

### 5. Start the FastAPI Backend Server (Terminal 2)

```powershell
.\backend\.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Swagger API docs will be available at `http://127.0.0.1:8000/docs`.

### 6. Seed Demonstration Products

```powershell
.\backend\.venv\Scripts\python.exe backend/seed.py
```
Registers 20 demo products on-chain and in MySQL (`TC-0001` through `CV-0002`).

### 7. Start the React Frontend Dev Server (Terminal 3)

```powershell
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

### 8. Run End-to-End Live Check Script

```powershell
.\backend\.venv\Scripts\python.exe experiments/live_check.py
```
Validates the entire 8-step live cycle (Health, Product Registration, Genuine QR, Genuine NFC, NFC Replay, Product Sale, Post-Sale Relocation Scan, and Unregistered Product Scan) directly against the live FastAPI server, Ganache, and MySQL.

---

## Running Research Experiments

### Master Paper Evaluation Suite (`experiments/run_all.py`)

```powershell
.\backend\.venv\Scripts\python.exe experiments/run_all.py
```
Produces:
- `experiments/results/attack_matrix.csv`: Every attack vs Static QR, HACP5 rewrite, Chain only, NFC CMAC, Fair Rule baseline, and Full Fusion.
- `experiments/results/model_comparison.csv`: Fair Rule Baseline vs IsolationForest vs RandomForest (5 seeds, mean ± std).
- `experiments/results/ablation.csv`: Full fusion vs No Chain, No ML, and No NFC.
- `experiments/results/gas_latency.csv`: On-chain gas usage and live API latency over 200 requests (median and p95).
- `experiments/results/race.csv`: Clone-first race results over 1,000 trials × 5 seeds.
- `experiments/results/results.md`: Complete structured markdown report with reproduction commands.

### Phase 8 MobileNetV2 Image Evaluation (`ml/image_signal/evaluate_sop.py`)

```powershell
.\backend\.venv\Scripts\python.exe ml/image_signal/evaluate_sop.py "C:\Project-MF\Stanford_Online_Products"
```
Evaluates MobileNetV2 feature extraction on Stanford Online Products:
- ROC-AUC: 0.9115 overall (0.9574 random impostors, 0.8656 hard negatives).
- Platt scaling calibration: 62.24% reduction in Expected Calibration Error (ECE from 0.1337 to 0.0505).
- Generates `roc_curve.png` and `coverage_vs_accuracy.png` in `ml/image_signal/artifacts/`.

---

## Running Automated Tests

```powershell
# Run all 129 backend tests:
.\backend\.venv\Scripts\pytest backend/tests -v

# Run smart contract unit tests:
cd contracts
truffle test --network cli
cd ..
```

---

## Phase Status Summary

| Phase | Description | Status | Verification Metric |
|-------|-------------|--------|---------------------|
| **Phase 1** | Smart Contract (`ProductRegistry.sol`) | ✅ Complete | 7 truffle tests passing; gas measured in `gas.csv` |
| **Phase 2** | QR & NFC Identity Modules (NTAG 424 DNA) | ✅ Complete | 67 pytest tests passing; clone-first race recovery: 100% |
| **Phase 3** | FastAPI Backend + MySQL + web3.py v8 | ✅ Complete | 28 API integration tests passing; live DB migrations |
| **Phase 4** | Scan-Risk ML Engine (2,000 products, 5 seeds) | ✅ Complete | Honest feature audit, held-out attack G, `FairRuleBaseline` |
| **Phase 5** | Multi-Signal Fusion Engine (Layer 3) | ✅ Complete | 27 fusion rule tests passing; graceful degradation |
| **Phase 6** | React + Vite + TailwindCSS Frontend | ✅ Complete | TypeScript compiled; dev server running on port 5173 |
| **Phase 7** | Master Experiment Runner (`run_all.py`) | ✅ Complete | Generated attack matrix, model comparison, ablation, latency |
| **Phase 8** | Image Signal (MobileNetV2, Platt Scaling) | ✅ Complete | 7 unit tests, ROC-AUC 0.9115 on SOP dataset, ECE -62.24% |
