# anti-counterfeit-3layer

A three-layer anti-counterfeiting prototype combining blockchain, ML anomaly detection,
and NFC/QR identity.

> **Status:** Phase 2 complete (smart contract + QR/NFC identity modules + tests).

---

## Architecture overview

```
Layer 1  →  ProductRegistry.sol (Solidity 0.8.20, Ganache)
              - Product registration, manufacturer whitelist
              - QR / NFC identity hashes on-chain
              - Scan verdict log (logScan)

Layer 2  →  ML risk model (Python, scikit-learn)
              - Features: speed, burst, device diversity, NFC counter gap
              - Models: rule baseline → IsolationForest → RandomForest

Layer 3  →  Fusion (FastAPI backend)
              - Verdict: Verified | Manual review | Suspicious | Unregistered
              - Every signal and reason returned in the API response
```

---

## Prerequisites

Install these before starting:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 24.x | https://nodejs.org |
| Python | 3.11 | https://python.org |
| Git | any | https://git-scm.com |
| Truffle (global) | 5.11.5 | `npm install -g truffle@5.11.5` |
| Ganache CLI (global) | 7.9.1 | `npm install -g ganache@7.9.1` |
| Ganache GUI (optional) | 2.x | https://trufflesuite.com/ganache/ |

> **Note (Node 24):** Ganache prints a µWS warning on Node 24. It falls back automatically
> and works fine — you can ignore the warning.

---

## Quick start (Windows PowerShell)

### 1. Clone and enter the project

```powershell
cd C:\Blockchain
git clone <repo-url> anti-counterfeit-3layer
cd anti-counterfeit-3layer
```

### 2. Copy the environment file

```powershell
Copy-Item .env.example .env
# Then open .env and fill in CONTRACT_ADDRESS after migration (step 5)
```

### 3. Start Ganache on port 7545

**Option A – CLI (scriptable, recommended for tests):**

Open a **separate** PowerShell window and run:
```powershell
ganache --port 7545 --deterministic --accounts 10 --networkId 1337
```
Leave this window open. `--deterministic` gives the same accounts every time.

**Option B – Ganache GUI:**
Open the app, create a new workspace, set port to 7545.

### 4. Compile the contracts

```powershell
cd contracts
truffle compile
```

Expected output: `Compiled successfully using: solc 0.8.20`

### 5. Migrate (deploy) to Ganache

```powershell
truffle migrate --network development
```

Copy the printed contract address into your `.env`:
```
CONTRACT_ADDRESS=0x...
```

### 6. Run the tests

```powershell
truffle test --network development
```

You should see **all tests passing** — look for `passing` at the bottom.

### 7. Measure gas usage

```powershell
truffle exec ..\experiments\measure_gas.js --network development
```

Results are written to `experiments\results\gas.csv`.

---

## Project structure

```
anti-counterfeit-3layer/
├── contracts/              ← Truffle project (Solidity + tests)
│   ├── contracts/
│   │   ├── Migrations.sol
│   │   └── ProductRegistry.sol
│   ├── migrations/
│   │   └── ProductRegistry.test.js
│   └── truffle-config.js
├── backend/                ← FastAPI + MySQL + web3.py v8 (Phase 3)
├── ml/                     ← ML risk model (Phase 4)
│   └── scan_risk/
├── frontend/               ← React + Vite (Phase 6)
├── experiments/            ← Scripts that produce numbers for the paper
│   ├── measure_gas.js
│   └── results/
│       └── gas.csv         ← generated
├── data/
│   └── product-images/     ← reference product images (not committed if > 50 MB)
├── docs/
│   ├── DECISIONS.md
│   ├── LIMITATIONS.md
│   └── VERSIONS.md
├── .env.example
├── .gitignore
└── README.md
```

---

## Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Smart contract, Truffle tests, gas measurement |
| 2 | ✅ Complete | QR + NFC identity modules, HACP5 baseline, pytest (43/43), race experiment |
| 3 | ✅ Complete | FastAPI backend, MySQL, web3.py v8 |
| 4 | ✅ Complete | Scan simulator, ML risk model (Rule / IF / RF) |
| 5 | ✅ Complete | Fusion layer (Layer 3 verdict, 55 tests passing) |
| 6 | ✅ Complete | React frontend (build-tested) |
| 7 | ⏳ In Progress | Master experiment suite for the paper (run_all.py) |
| 8 | ⏳ Optional | Image-consistency signal (MobileNetV2) |

---

## Phase 2: running the identity tests

```powershell
# From repo root
python -m pytest backend/tests/test_identity.py -v
```

### Run the clone-first-race experiment

```powershell
python experiments/identity_race.py
# Writes experiments/results/race.csv
```

**Results (N=1000 trials, seed=42, all data simulated):**

| Scheme | Genuine wrongly rejected | Rate |
|--------|--------------------------|------|
| static_qr | 0 / 1000 | 0.0% — clone undetectable at identity layer |
| hacp5_baseline | 1000 / 1000 | 100.0% — genuine always loses if clone goes first |
| nfc_cmac (ours) | 0 / 1000 | 0.0% — genuine recoverable via next tap |

---

## Important notes

- **Never commit your `.env` file.** It contains private keys.
- **Ganache keys are not real money.** Do not use them on any real network.
- **NFC is emulated.** See `docs/LIMITATIONS.md`.
- **All ML data is simulated.** See `docs/LIMITATIONS.md`.
