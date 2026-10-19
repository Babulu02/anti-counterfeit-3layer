# Anti-Counterfeit 3-Layer: Complete Technical Reference & Agent System Guide

> **Document Purpose:** This document provides a complete, exhaustive reference of the entire repository. Any AI agent or developer reading this document will possess full context regarding the architecture, theory, cryptographic foundations, data schemas, smart contracts, ML models, frontend structure, operational runbook, and constraints of this project.

---

## 1. Executive Summary & Research Motivation

**Project Title:** Anti-Counterfeit 3-Layer Research Prototype  
**Extension Target:** "A Holistic Anti-Counterfeiting Platform Using NFC and Blockchain" (HACP5, *CMC 2025*)

### The Core Problem
Traditional supply-chain anti-counterfeiting solutions rely either solely on static barcodes/QR codes (trivially photocopied), static NFC tags (susceptible to cloning and replay attacks), or centralized databases. HACP5 proposed combining physical NFC tags with Ethereum blockchain records. However, HACP5 possessed critical vulnerabilities:
1. **Network Race Conditions:** HACP5 relied on updating an on-chain NFC counter during scanning. Under latency or network reordering, concurrent scans produced race conditions and false alarms.
2. **Binary Verification:** HACP5 used brittle binary verification without probabilistic anomaly detection for physical clones operating in different geographic locations.
3. **Absence of Visual Verification:** Packaging or label tampering without cloning electronics could not be detected.

### Our Solution
This repository implements a production-grade, 4-tier anti-counterfeit system:
- **Tier 1 (Physical & Blockchain Identity):** Dual-channel verification combining an HMAC-SHA256 signed QR code with dynamic AES-128 CMAC rolling-counter NFC emulation (NXP NTAG 424 DNA SUN standard) verified against an Ethereum smart contract (`ProductRegistry.sol`).
- **Tier 2 (Spatio-Temporal ML Anomaly Detection):** A behavioral feature extraction pipeline and calibrated ML model (RandomForest + IsolationForest vs FairRuleBaseline) detecting impossible travel velocities (Haversine), burst frequencies, device entropy, and NFC freshness gaps.
- **Tier 3 (Multi-Signal Deterministic Fusion Engine):** A priority cascade combining cryptographic validity, on-chain state, ML risk scores, and visual confidence into one of four auditable verdicts: `Verified`, `ManualReview`, `Suspicious`, or `Unregistered`.
- **Tier 4 (Visual Consistency Verification):** Transfer learning using MobileNetV2 (1280-d unit-length embeddings) calibrated with Platt scaling on the Stanford Online Products dataset, with an explicit abstain band to prevent false rejections.

---

## 2. System Architecture & Component Diagram

```
                              ┌────────────────────────────────────────────────────────┐
                              │                    USER INTERFACES                     │
                              │  React 18 + Vite + TailwindCSS + ethers.js (Port 5173) │
                              └──────────────┬─────────────────────────┬───────────────┘
                                             │                         │
                   Direct MetaMask Signatures│                         │ REST API (/api/*)
                   (Admin / Manufacturer)    │                         │
                                             ▼                         ▼
┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│         ETHEREUM / GANACHE BLOCKCHAIN        │        │           FASTAPI BACKEND SERVICE            │
│           (Port 7546, NetID 1337)            │        │           (Port 8000, Python 3.11)           │
├──────────────────────────────────────────────┤        ├──────────────────────────────────────────────┤
│ Contract: ProductRegistry.sol                │        │ Routes: /products, /scan, /health, /chain    │
│  - addManufacturer(address) [Owner only]     │◄───────┤ Web3.py v8 Client (EIP-1559 Transactions)    │
│  - registerProduct(id, hash) [Mfr only]      │ (read) ├──────────────────────────────────────────────┤
│  - markSold(id) [Operator only]              │        │ Cryptographic Verification:                  │
│  - logScan(id, scanHash, verdict) [Operator] │        │  - QR: HMAC-SHA256 signature validation      │
└──────────────────────────────────────────────┘        │  - NFC: AES-128 CMAC & counter freshness     │
                                                        ├──────────────────────────────────────────────┤
                                                        │ Tier 2: Spatio-Temporal ML Engine            │
                                                        │  - Haversine velocity calculation            │
                                                        │  - RandomForestClassifier (scikit-learn)     │
                                                        ├──────────────────────────────────────────────┤
                                                        │ Tier 3: Deterministic Fusion Engine          │
                                                        │  - Maps 4 signals → Final Verdict            │
                                                        ├──────────────────────────────────────────────┤
                                                        │ Tier 4: MobileNetV2 Visual Consistency       │
                                                        │  - 1280-d unit embeddings, Platt scaling     │
                                                        └──────────────────────┬───────────────────────┘
                                                                               │
                                                                               ▼
                                                        ┌──────────────────────────────────────────────┐
                                                        │           RELATIONAL STORAGE (MySQL 9)       │
                                                        │  User: ac_user (Credentials in .env)         │
                                                        │  Databases: anticounterfeit,                 │
                                                        │             anticounterfeit_test             │
                                                        │  Tables: products, tags, scans               │
                                                        └──────────────────────────────────────────────┘
```

---

## 3. Technology Stack & Software Versions

All dependencies are strictly pinned to avoid cross-platform discrepancies:

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **OS Platform** | Windows 10/11 | 64-bit | Execution environment |
| **Backend Runtime** | Python (CPython) | 3.11.9 | Core server, ML, and experiments (`backend/.venv`) |
| **Backend Framework** | FastAPI | 0.115.6 | Async REST API service |
| **ASGI Server** | Uvicorn | 0.34.0 | High-performance ASGI web server |
| **Blockchain Client** | Web3.py | 8.0.0b1 | Python Ethereum RPC client |
| **Database Engine** | MySQL Community Server | 9.x | Relational persistence |
| **ORM & Migrations** | SQLAlchemy / Alembic | 2.0.36 / 1.14.0 | Database abstraction and migrations |
| **Smart Contracts** | Solidity | 0.8.20 | EVM contract source code |
| **Contract Toolchain**| Truffle Suite | 5.11.5 | Contract compilation and migrations |
| **Local Blockchain** | Ganache CLI | 7.9.1 | Deterministic Ethereum RPC testnet |
| **Frontend Runtime** | Node.js / npm | 24.20.0 / 11.19.0| Frontend tooling and dependencies |
| **Frontend Framework**| React / TypeScript | 18.3.1 / 5.7.2 | User interface application |
| **Build Tool** | Vite | 6.0.3 | Fast dev server and frontend bundler |
| **Web3 Frontend Lib** | ethers.js | 6.13.4 | In-browser MetaMask contract interaction |
| **Styling** | Tailwind CSS | 3.4.16 | Utility-first responsive design |
| **ML Frameworks** | scikit-learn / PyTorch | 1.6.0 / 2.5.1 | Behavioral and visual classification |

---

## 4. Repository File Map

```
anti-counterfeit-3layer/
├── contracts/                        # Solidity contracts and Truffle toolchain
│   ├── contracts/
│   │   ├── Migrations.sol           # Truffle migration manager
│   │   └── ProductRegistry.sol      # Core Ethereum smart contract
│   ├── migrations/
│   │   ├── 1_initial_migration.js
│   │   └── 2_deploy_product_registry.js
│   ├── test/
│   │   └── ProductRegistry.test.js  # 43 automated Truffle/Mocha tests
│   └── truffle-config.js            # Network definitions (cli: port 7546)
├── backend/                         # FastAPI backend service
│   ├── alembic/                     # Database migrations
│   │   ├── versions/
│   │   │   ├── 0001_initial_schema.py
│   │   │   └── 0002_add_image_embedding.py
│   │   └── env.py
│   ├── app/
│   │   ├── chain.py                 # web3.py v8 client (EIP-1559, contract calls)
│   │   ├── config.py                # Environment variable reader (.env)
│   │   ├── crud.py                  # SQLAlchemy database operations
│   │   ├── database.py              # Engine and session creation
│   │   ├── fusion.py                # Multi-signal decision engine
│   │   ├── identity_service.py      # QR & NFC validation service
│   │   ├── main.py                  # FastAPI route controllers & middleware
│   │   ├── models.py                # SQLAlchemy ORM declarations
│   │   └── schemas.py               # Pydantic v2 schemas
│   ├── identity/
│   │   ├── nfc_ntag.py              # NTAG 424 DNA SUN / AES-128 CMAC emulator
│   │   ├── nfc_rewrite_baseline.py  # HACP5 race baseline simulation
│   │   └── qr_identity.py           # HMAC-SHA256 QR payload builder
│   ├── seed.py                      # Demo data generator (20 products)
│   └── tests/
│       ├── conftest.py              # Pytest fixtures (DB cleanup, Ganache fixtures)
│       ├── test_chain.py            # On-chain integration tests
│       ├── test_fusion.py           # Fusion truth table unit tests
│       └── test_identity.py         # CMAC/QR cryptographic tests
├── ml/                              # Machine learning engines
│   ├── scan_risk/
│   │   ├── features.py              # Spatio-temporal behavioral feature extraction
│   │   ├── generator.py             # 2,000 synthetic product scan simulator
│   │   ├── model.py                 # RandomForest, IsolationForest, FairRuleBaseline
│   │   └── scorer.py                # Inference pipeline
│   └── image_signal/
│       ├── embedder.py              # MobileNetV2 1280-d feature extractor
│       └── similarity.py            # Cosine distance & Platt scaling calibration
├── frontend/                        # React 18 single page application
│   ├── src/
│   │   ├── components/              # Reusable UI cards, badges, signal rows
│   │   ├── lib/
│   │   │   ├── api.ts               # Typed client calling Vite /api proxy
│   │   │   └── metamask.ts          # ethers.js MetaMask wallet provider & ABI
│   │   ├── pages/
│   │   │   ├── AdminPage.tsx        # Smart contract administration & whitelisting
│   │   │   ├── DashboardPage.tsx    # Scan logs and live metrics dashboard
│   │   │   ├── DemoPage.tsx         # Interactive simulation walkthrough
│   │   │   ├── ManufacturerPage.tsx # Product registration & QR/NFC export
│   │   │   └── VerifyPage.tsx       # Multi-layer consumer verification portal
│   │   ├── App.tsx                  # Routing and global navbar
│   │   └── main.tsx
│   └── vite.config.ts               # Proxy configuration (/api -> :8000)
├── experiments/                     # Research experiment runner & evaluation
│   ├── run_all.py                   # Master reproducible benchmark script
│   ├── measure_gas.js               # Truffle gas consumption profiler
│   └── results/                     # Saved CSV metrics, ROC curves, models
├── docs/                            # Research & design documentation
│   ├── DECISIONS.md                 # Architectural decision records (ADRs)
│   ├── LIMITATIONS.md               # Honest technical boundary disclosures
│   ├── THREAT_MODEL.md              # Security threats, attacker models, defenses
│   └── VERSIONS.md                  # Dependency pinning rationale
├── .env                             # Secret configuration (never commit)
└── README.md                        # Quickstart documentation
```

---

## 5. Blockchain Layer Details

### Smart Contract: `ProductRegistry.sol`
Deployed on Ganache at `0xCfEB869F69431e42cdB54A4F4f105C19C080A601`.
- **Compiler:** Solidity `0.8.20` with optimizer enabled (200 runs).
- **Accounts and Roles (Deterministic Ganache Mnemonic):**
  - **Account #0 (`0x90F8bf6A...`):** Owner / Deployer. Holds sole permission to call `addManufacturer`, `removeManufacturer`, and `setOperator`.
  - **Account #1 (`0xFFcf8FDE...`):** Operator. Designated backend server account. Holds sole permission to call `logScan` and `markSold`.
  - **Account #2 (`0x22d491Bd...`):** Default Manufacturer. Whitelisted by owner; signs `registerProduct`.
  - **Accounts #3–#9:** Additional manufacturer or consumer accounts.

### Privacy-Preserving On-Chain Logging
Zero Personally Identifiable Information (PII) or plaintext scan locations touch the public ledger:
1. `recordHash`: SHA-256 of `name|brand|serial|image_sha256` recorded during registration.
2. `scanHash`: SHA-256 of `productId|channel|deviceHash|lat|lon|timestamp` generated by the backend before calling `logScan(productId, scanHash, verdict)`.
3. Verdict codes: `0 = Verified`, `1 = ManualReview`, `2 = Suspicious`, `3 = Unregistered`.

---

## 6. Cryptographic Identity Layer

### Channel A: QR Identity (HMAC-SHA256)
- The QR payload encodes: `https://verify.example.com/v?pid=<productId>&ser=<serial>&sig=<signature>`
- Signature calculation:
  $$\text{sig} = \text{HMAC-SHA256}(\text{IDENTITY\_HMAC\_SECRET}, \text{productId} \parallel \text{serial})[:32]$$
- Provides fast verification in air-gapped or camera-only environments.

### Channel B: Dynamic NFC Identity (NTAG 424 DNA SUN)
- Emulates the Secure Unique NFC (SUN) protocol of NXP NTAG 424 DNA chips.
- Each scan yields:
  1. `uid`: 7-byte unique identifier (e.g. `04A2B3C4D5E6F7`).
  2. `counter`: 3-byte monotonically increasing hardware counter.
  3. `cmac`: 8-byte AES-128 CMAC over `uid || counter` computed with `K_SDM`.
- **Counter Freshness Check:**
  $$\Delta = \text{counter}_{\text{scan}} - \text{counter}_{\text{stored}}$$
  - If $\Delta \le 0$: Replay attack detected immediately.
  - If $\Delta = 1$: Ideal sequential scan.
  - If $1 < \Delta \le 10$: Minor skip (missed scans or intermediate reads).
  - If $\Delta > 10$: Severe counter jump (indicative of cloning or counter tampering).

---

## 7. Machine Learning Spatio-Temporal Engine

### Feature Vector Definition
For every incoming scan event, the engine computes an 8-dimensional feature vector:
1. `delta_time_hours`: Elapsed time since the previous scan of the same product ID.
2. `distance_km`: Haversine great-circle distance between current scan and previous scan coordinates:
   $$d = 2R \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
3. `speed_kmh`: Implied physical velocity:
   $$\text{speed} = \frac{\text{distance\_km}}{\max(\text{delta\_time\_hours}, 0.001)}$$
4. `scans_last_1h`: Burst scan count across the past 60 minutes.
5. `scans_last_24h`: Burst scan count across the past 24 hours.
6. `device_entropy`: Shannon entropy over unique `device_id` strings scanning this product:
   $$H(X) = -\sum_{i} P(x_i) \log_2 P(x_i)$$
7. `is_new_location`: Boolean indicator (1 or 0) for whether coordinates deviate $>50\text{ km}$ from known product cluster centers.
8. `nfc_counter_gap`: Discontinuity metric $\max(0, \Delta - 1)$.

### Attack Profiles & Realistic Simulation
Trained across 2,000 synthetic products (5 independent seeds) covering 7 attack classes:
- **Attack A (Rapid Remote Clone):** Identical tags scanned in Tokyo and New York within 15 minutes ($\text{speed} > 40,000\text{ km/h}$).
- **Attack B (NFC Counter Replay):** Cloned tag replaying stale counter ($\Delta \le 0$).
- **Attack C (NFC Counter Race):** Concurrent reads generating gap anomalies.
- **Attack D (Distributed Physical Counterfeiting):** Multi-device high burst rates across multiple retail stores.
- **Attack E (Label Harvesting):** Legitimate label scanned at warehouse, then discarded and rescanned 6 months later.
- **Attack F (Post-Sale Re-scanning):** Repeated reads after product has been marked `sold` on-chain.
- **Attack G (Held-Out Stealth Clone):** Sub-threshold physical movement with delayed reads to test generalization against unseen threats.

### Honest Benchmark Results
Evaluated without target leakage:
- **FairRuleBaseline:** Precision: `0.957`, Recall: `0.941`, F1: `0.949`
- **IsolationForest (Unsupervised):** Precision: `0.912`, Recall: `0.884`, F1: `0.898`
- **RandomForestClassifier (Supervised):** Precision: `0.988`, Recall: `0.985`, F1: `0.986`

---

## 8. Multi-Signal Deterministic Fusion Engine

The fusion layer evaluates up to four orthogonal signals using a deterministic priority cascade:

$$\text{Verdict} = f(\text{Identity}, \text{Chain}, \text{ML Risk}, \text{Visual})$$

| Priority | Condition / Rule | Verdict Code | Verdict Name | Actionable Rationale |
|:---:|---|:---:|---|---|
| **1** | Product missing on-chain (`exists == false`) | `3` | `Unregistered` | Critical counterfeit or unregistered barcode. |
| **2** | Cryptographic failure (bad QR HMAC or invalid NFC CMAC) | `2` | `Suspicious` | Cryptographic signature forgery or replay attack. |
| **3** | Impossible velocity ($\text{speed} > 1000\text{ km/h}$) | `2` | `Suspicious` | Physical clone scanned simultaneously in distant locations. |
| **4** | NFC counter gap severe ($\Delta \le 0$ or $\Delta > 10$) | `2` | `Suspicious` | NFC tag cloned or rolled backwards. |
| **5** | Product marked `sold` on-chain and rescanned elsewhere | `1` | `ManualReview` | Potential gray-market resale or recycled packaging. |
| **6** | ML Risk Score $\ge 0.65$ | `2` | `Suspicious` | High behavioral anomaly probability. |
| **7** | Visual embedding cosine similarity $< \text{threshold}$ | `1` | `ManualReview` | Packaging visual inconsistency or wrong product variant. |
| **8** | ML Risk Score between $0.40$ and $0.65$ | `1` | `ManualReview` | Borderline behavioral anomaly requiring operator review. |
| **9** | All checks clean ($\text{Risk} < 0.40$, valid crypto, on-chain) | `0` | `Verified` | Authentic genuine product. |

---

## 9. Visual Consistency Signal (MobileNetV2)

- **Model Architecture:** MobileNetV2 pretrained on ImageNet, extracting a 1,280-dimensional feature vector from the global average pooling layer.
- **Normalization:** $\ell_2$ unit-length projection:
  $$\hat{\mathbf{v}} = \frac{\mathbf{v}}{\|\mathbf{v}\|_2}$$
- **Metric:** Cosine similarity:
  $$S_C(\hat{\mathbf{u}}, \hat{\mathbf{v}}) = \hat{\mathbf{u}} \cdot \hat{\mathbf{v}}$$
- **Calibration via Platt Scaling:**
  $$P(\text{Genuine} \mid S_C) = \frac{1}{1 + \exp(A \cdot S_C + B)}$$
  Fitted on the Stanford Online Products dataset.
- **Abstain Band Policy:**
  - $S_C \ge 0.78$: Visual match verified (`genuine`).
  - $S_C \le 0.52$: Visual mismatch flagged (`counterfeit`).
  - $0.52 < S_C < 0.78$: **Abstain** (Lighting, angle, or background ambiguity; system does not penalize legitimate products on visual alone).

---

## 10. Database Schema (MySQL 9)

Managed via Alembic in `backend/alembic/versions/`:

### Table: `products`
```sql
CREATE TABLE products (
    product_id VARCHAR(66) PRIMARY KEY,     -- 0x-prefixed 32-byte hex string
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    serial VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'registered', -- 'registered' | 'sold'
    manufacturer_address VARCHAR(42) NOT NULL,
    record_hash VARCHAR(66) NOT NULL,
    image_sha256 VARCHAR(64) NULL,
    image_embedding BLOB NULL,              -- 1280 float32 (5,120 bytes)
    created_at DATETIME NOT NULL
);
```

### Table: `tags`
```sql
CREATE TABLE tags (
    tag_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(66) NOT NULL UNIQUE,
    uid VARCHAR(14) NOT NULL,               -- 7-byte hex
    counter INT NOT NULL DEFAULT 0,         -- Monotonic hardware counter
    key_slot INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

### Table: `scans`
```sql
CREATE TABLE scans (
    scan_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(66) NOT NULL,
    channel VARCHAR(16) NOT NULL,           -- 'qr' | 'nfc'
    ts DATETIME NOT NULL,
    lat DOUBLE NULL,
    lon DOUBLE NULL,
    device_id VARCHAR(64) NULL,
    verdict VARCHAR(32) NOT NULL,           -- Verified | ManualReview | Suspicious | Unregistered
    risk_score DOUBLE NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

---

## 11. Frontend Application Architecture

The frontend is a React 18 single-page application bundled with Vite.

### Networking & Proxy
In `vite.config.ts`, Vite proxies `/api` directly to `http://127.0.0.1:8000`:
```ts
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```
This ensures the browser avoids cross-origin preflight issues and connects directly via the host origin `http://localhost:5173`.

### Key Pages:
1. **`/admin` (AdminPage):** Connects to MetaMask using Account #0 (Owner). Inspects on-chain roles, displays contract configuration, and allows one-click or custom whitelisting/revoking of manufacturer addresses via `addManufacturer`.
2. **`/manufacturer` (ManufacturerPage):** Allows authorized manufacturers to register a new product with an optional product image, generating on-chain registration transactions and exportable QR codes + NFC payloads.
3. **`/verify` (VerifyPage):** Consumer portal. Supports camera-based QR code scanning, manual payload entry, geolocation reporting, and multi-signal verification breakdown.
4. **`/dashboard` (DashboardPage):** Real-time monitoring portal displaying global metrics, scan counts, verdict distribution charts, and recent activity.
5. **`/demo` (DemoPage):** Interactive demonstration showcasing simulated attack scenarios (e.g. impossible speed, replay attacks) and step-by-step resolution.

---

## 12. Complete Operational Runbook

Follow these exact steps to start the complete platform from a clean state:

### Step 1: Start Ganache Blockchain
Open Terminal 1 (PowerShell):
```powershell
ganache --port 7546 --deterministic --accounts 10 --networkId 1337
```
*Keep this running. Do not close.*

### Step 2: Deploy Contracts
Open Terminal 2 (PowerShell):
```powershell
cd C:\Blockchain\anti-counterfeit-3layer\contracts
npx truffle migrate --network cli --reset
cd ..
```
*Deploys `ProductRegistry` to `0xCfEB869F69431e42cdB54A4F4f105C19C080A601`.*

### Step 3: Authorize Manufacturer (Two Options)
- **Option A (MetaMask Web UI):** Go to `http://localhost:5173/admin`, connect MetaMask with Account #0 (`0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d`), click **"Use Account #2 (Default)"**, and click **"Whitelist via MetaMask"**.
- **Option B (Command Line):**
  ```powershell
  .\backend\.venv\Scripts\python.exe -c "import sys; sys.path.insert(0,'backend'); from app.chain import get_contract,get_w3; from eth_account import Account; w3=get_w3(); c=get_contract(); o=Account.from_key('0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d'); tx=c.functions.addManufacturer('0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b').build_transaction({'from':o.address,'nonce':w3.eth.get_transaction_count(o.address),'gas':100000}); w3.eth.wait_for_transaction_receipt(w3.eth.send_raw_transaction(o.sign_transaction(tx).raw_transaction)); print('Whitelisted')"
  ```

### Step 4: Run Database Migrations
```powershell
cd C:\Blockchain\anti-counterfeit-3layer\backend
.\.venv\Scripts\python.exe -m alembic upgrade head
cd ..
```

### Step 5: Start FastAPI Backend Server
In Terminal 2:
```powershell
cd C:\Blockchain\anti-counterfeit-3layer\backend
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Health check:* `curl http://127.0.0.1:8000/health` should return `{"status":"ok","db":"ok","chain":"ok","contract":"ok"}`.

### Step 6: Start Frontend Server
Open Terminal 3 (PowerShell):
```powershell
cd C:\Blockchain\anti-counterfeit-3layer\frontend
npm run dev
```
*Access frontend in browser at:* `http://localhost:5173/`

### Step 7: Seed Demo Products (Optional)
In another terminal:
```powershell
cd C:\Blockchain\anti-counterfeit-3layer
.\backend\.venv\Scripts\python.exe backend\seed.py
```
*Seeds 20 demo luxury watches, handbags, and consumer goods into MySQL and Ganache.*

---

## 13. Running Automated Tests

All tests are repeatable and run without external dependencies:

```powershell
# 1. Smart Contract Tests (43 tests)
cd C:\Blockchain\anti-counterfeit-3layer\contracts
npx truffle test --network cli

# 2. Backend, Cryptographic & ML Integration Tests (129 tests)
cd C:\Blockchain\anti-counterfeit-3layer
.\backend\.venv\Scripts\pytest.exe backend/tests/ -v

# 3. Master Research Experiment Benchmark Runner
.\backend\.venv\Scripts\python.exe experiments/run_all.py
```

---

## 14. Essential Rules for Agents Working on this Repo

1. **Virtual Environment Isolation:** Always execute Python commands using `backend\.venv\Scripts\python.exe`. Never modify system Python.
2. **Database Credentials:** MySQL user is `ac_user`. The credentials live strictly in `.env`. **Never use or request the MySQL `root` account.**
3. **No Fabricated Numbers:** All reported metrics (accuracy, F1, gas costs, latencies) must originate from executable scripts. Never invent metrics.
4. **Encoding & Windows Safety:** Write all files as UTF-8 without BOM. Do not include emojis in Python `print()` statements to prevent Windows `cp1252` encoding crashes.
5. **Contract Immutability:** Do not edit contracts under `contracts/contracts/` unless explicitly requested, as doing so alters deployed ABIs and bytecodes.
6. **Chain Synchronicity:** Whenever Ganache is restarted, remember that block height resets to 0. You must re-run `truffle migrate --reset` and re-whitelist Account #2 before attempting product registration.
