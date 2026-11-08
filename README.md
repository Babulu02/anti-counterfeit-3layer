# AETHER v3.0 — Intelligent Anti-Counterfeiting Platform
### Holistic Anti-Counterfeiting Platform (HACP5 Research Alignment with Multi-Layer Cryptographic Extensions)

A complete, production-ready anti-counterfeiting platform combining **Ethereum Solidity smart contracts**, **NFC NTAG 424 SUN AuthentiCoding**, **signed dynamic QR codes**, **spatio-temporal ML anomaly detection**, **MobileNetV2 + OCR visual packaging verification**, and **three independent role-based portals**.

---

## 🏛️ System Architecture

```
                                  ┌──────────────────────────────┐
                                  │      AETHER v3.0 ENGINE      │
                                  └──────────────┬───────────────┘
                                                 │
                   ┌─────────────────────────────┼─────────────────────────────┐
                   ▼                             ▼                             ▼
    ┌─────────────────────────────┐┌───────────────────────────┐┌───────────────────────────┐
    │     ADMIN PORTAL (/admin)   ││MANUFACTURER PORTAL (/mfr) ││   CONSUMER PORTAL (/root)  │
    ├─────────────────────────────┤├───────────────────────────┤├───────────────────────────┤
    │ • Security & Fraud Monitor  ││ • Factory Lot Batching    ││ • Camera QR Live Scanner   │
    │ • Smart Contract Whitelist  ││ • Dynamic QR Tag Minting  ││ • NTAG 424 SUN NFC Tap     │
    │ • Manufacturer KYC Approvals││ • AuthentiCoding Station  ││ • MobileNetV2 AI Matching  │
    │ • Cryptographic Tag Auditing││ • Active Tag Lifecycle    ││ • Consumer Audit Ledger    │
    │ • Real-time Threat Engine   ││ • Product Sales Analytics ││ • Counterfeit Reporting    │
    └─────────────────────────────┘└───────────────────────────┘└───────────────────────────┘
```

---

## 🌟 The Three Independent Portals

### 1. 🛡️ Admin Portal (`/admin/*`)
*Designed for security officers, system auditors, and smart contract governors.*
* **Overview (`/admin/overview`)**: Real-time telemetry, node health, active contract status, and live audit stream.
* **Manufacturer Management (`/admin/manufacturers`)**: KYC application review, business verification, and on-chain whitelist/revoke triggers.
* **Product Management (`/admin/products`)**: Complete searchable physical goods registry, SHA-256 metadata verification, and on-chain hashes.
* **Blockchain Management (`/admin/blockchain`)**: Direct `ProductRegistry.sol` contract console, owner permissions, deterministic account directory.
* **Security & Fraud Monitoring (`/admin/security`)**: Real-time detection of replay attacks, clone-first attacks, impossible travel, burst scanning, and investigator incident queue.
* **NFC / QR Management (`/admin/tags`)**: Directory of physical 7-byte NFC UIDs, rolling counters, and emergency tag deactivation.
* **Audit & Transaction Logs (`/admin/audit`)**: Unified immutable chronological log of blockchain txs, KYC approvals, and verifications.
* **User & Role Management (`/admin/users`)**: RBAC permissions, Ethereum wallet key association, and account statuses.
* **System Settings (`/admin/settings`)**: Health metrics for FastAPI, MySQL 9.x, Ganache 1337, MobileNetV2, and EasyOCR.

### 2. 🏭 Manufacturer Portal (`/manufacturer/*`)
*Designed for brand owners, factory managers, and production packaging lines.*
* **Overview (`/manufacturer/overview`)**: Production floor metrics, active lots, verified customer scans, quick minting shortcuts.
* **Company Profile (`/manufacturer/profile`)**: Corporate registration documents, jurisdiction, compliance email, and signing wallet address.
* **Brand Management (`/manufacturer/brands`)**: Multi-brand portfolio management, trademark numbers, and product categories.
* **Product Management (`/manufacturer/products`)**: Enrolled products catalog with short human IDs (`PRD-XXXXXX`) and on-chain bytes32 hashes.
* **Batch Management (`/manufacturer/batches`)**: Manufacturing lot creator, unit counts, scheduled production dates, and expiration tracking.
* **Tag Generation (`/manufacturer/generate-tags`)**: Full on-chain asset enrollment, reference packaging photo upload, MobileNetV2 embedding, and printable signed QR codes.
* **NFC Encoding (`/manufacturer/nfc-encoding`)**: HACP5 AuthentiCoding & DynamicID programmer interface (AES-128 CMAC and rolling counter pairing).
* **Tag Management (`/manufacturer/tags`)**: Inventory of active NFC tags bound to products with compromise deactivation controls.
* **Encoding History (`/manufacturer/encoding-history`)**: Quality assurance audit log of hardware programmer sessions, unit yields, and operator stamps.
* **Product Analytics (`/manufacturer/analytics`)**: Consumer verification metrics, authentic vs. suspicious ratios, and QR vs. NFC channel split.

### 3. 👤 Consumer Portal (`/consumer/*` and `/`)
*Designed for end-market shoppers, retail inspectors, and the general public.*
* **Home (`/` or `/consumer`)**: Public educational landing page explaining the 3-layer anti-counterfeiting platform.
* **Verify Product (`/consumer/verify`)**: Live camera QR scanner (`html5-qrcode`), manual Short ID input, NFC tap authenticator, and packaging photo upload.
* **Verification Result (`/consumer/result`)**: Dedicated certificate of authenticity, complete multi-signal diagnostic proofs, and mark-sold action.
* **Verification History (`/consumer/history`)**: Local verification ledger storing past scans and verdicts on the user's device.
* **Report Counterfeit (`/consumer/report`)**: Public counterfeit reporting form with vendor details, photograph upload, and tracking ID.
* **Product Information (`/consumer/products`)**: Searchable public catalog of certified genuine brands and products.
* **Help & Support (`/consumer/help`)**: Visual step-by-step guides for QR scanning and NFC tapping, FAQs, and diagnostic guides.
* **About AETHER (`/consumer/about`)**: Detailed scientific paper alignment comparing HACP5 core architecture with AETHER extensions.

---

## 🎨 Enterprise Dual Theme System

AETHER includes an enterprise-grade Light and Dark mode theme system switchable via the navigation bar toggle or the operating system's preferred color scheme:

| Color Token | Light Theme | Dark Theme | Purpose |
| :--- | :--- | :--- | :--- |
| **Background** | `#F3F6FA` | `#080D14` | Application canvas & base background |
| **Cards** | `#FFFFFF` | `#111C29` | Container cards, modals, and tables |
| **Primary Accent** | `#0788CE` | `#00BFFF` | Active links, primary buttons, accents |
| **Headings** | `#142C43` | `#F1F6FC` | `h1`–`h4` typography, prominent titles |
| **Secondary Text**| `#63768B` | `#9BAFC5` | Monospace tags, labels, table headers |
| **Borders** | `#E1E8F0` | `#26384B` | Dividers, card borders, input strokes |
| **Success** | `#16A36A` | `#10B981` | Verified verdicts, healthy node indicators |
| **Warning** | `#E9A23B` | `#F59E0B` | Manual review alerts, sold status |
| **Danger** | `#E05252` | `#EF4444` | Suspicious alerts, counterfeit warnings |

---

## 🚀 Step-by-Step Running Instructions

### Prerequisites
* Windows 10/11 (64-bit)
* Python 3.11+
* Node.js 18+ and npm
* MySQL 8.x / 9.x
* Ganache CLI (for local blockchain)

---

### Step 1: Start Ganache Blockchain (Terminal 1)
```powershell
ganache --port 7546 --deterministic --accounts 10 --networkId 1337
```
*Deterministic Account #0 (`0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1`) is the Contract Owner.*  
*Deterministic Account #2 (`0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b`) is the Default Manufacturer.*

---

### Step 2: Deploy Smart Contract to Ganache
```powershell
cd C:\Blockchain\anti-counterfeit-3layer\contracts
truffle migrate --network cli --reset
cd ..
```
*The `ProductRegistry.sol` contract deploys to `0xCfEB869F69431e42cdB54A4F4f105C19C080A601`.*

---

### Step 3: Configure Environment (`.env`)
Ensure `.env` in the root directory contains:
```ini
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=anticounterfeit

RPC_URL=http://127.0.0.1:7546
CONTRACT_ADDRESS=0xCfEB869F69431e42cdB54A4F4f105C19C080A601

IDENTITY_HMAC_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
NFC_MASTER_KEY=00112233445566778899aabbccddeeff

OWNER_ADDRESS=0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1
MANUFACTURER_ADDRESS=0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b
MANUFACTURER_PRIVATE_KEY=0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c
```

---

### Step 4: Start FastAPI Backend Server (Terminal 2)
```powershell
cd C:\Blockchain\anti-counterfeit-3layer
.\backend\.venv\Scripts\uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API documentation is available at `http://127.0.0.1:8000/docs`.*

---

### Step 5: Start the Frontend Application (Terminal 3)
```powershell
cd C:\Blockchain\anti-counterfeit-3layer\frontend
npm run dev
```
Open **`http://localhost:5173/`** in your web browser.

---

## 🧪 Testing Role Switching & Verification

1. **Consumer Verification Workflow**:
   - Open `http://localhost:5173/consumer/verify`.
   - Click **Start Camera** to scan a physical QR code, or enter a registered Short ID (e.g., `PRD-A49F2E`).
   - Click **Run Verification Pipeline** to inspect multi-signal diagnostic proofs across Blockchain, Token Identity, and MobileNetV2 AI visual checks.

2. **Manufacturer Asset Minting Workflow**:
   - Click the **Portal Switcher** in the header and select **Manufacturer Portal**.
   - Navigate to `/manufacturer/generate-tags`.
   - Enter product name, brand, serial, upload a packaging reference photo, and click **Execute On-Chain Minting**.
   - Download the printable signed QR code and inspect the NTAG 424 SUN AuthentiCoding cryptograms.

3. **Admin Smart Contract Governance Workflow**:
   - Click the **Portal Switcher** and select **Admin Portal**.
   - Navigate to `/admin/blockchain` or `/admin/manufacturers`.
   - Connect MetaMask with Account #0 to whitelist or revoke manufacturer privileges directly on the Ethereum blockchain.
   - Review active threats, impossible travel incidents, and fraud logs on `/admin/security`.

---

## 📚 Architectural & Research Documentation
* [`docs/PORTAL_ARCHITECTURE.md`](file:///C:/Blockchain/anti-counterfeit-3layer/docs/PORTAL_ARCHITECTURE.md) — Detailed specifications of all 27 role-based routes and RBAC boundaries.
* [`docs/IMPROVEMENTS_OVER_BASE_PAPER.md`](file:///C:/Blockchain/anti-counterfeit-3layer/docs/IMPROVEMENTS_OVER_BASE_PAPER.md) — Scientific breakdown of HACP5 paper limitations and AETHER v3.0 contributions.
* [`docs/HARDWARE_FREE_ALTERNATIVE_GUIDE.md`](file:///C:/Blockchain/anti-counterfeit-3layer/docs/HARDWARE_FREE_ALTERNATIVE_GUIDE.md) — Signed QR HMAC hardware-free alternative deployment guide.
* [`docs/DATASET_AND_ATTACK_ANALYSIS.md`](file:///C:/Blockchain/anti-counterfeit-3layer/docs/DATASET_AND_ATTACK_ANALYSIS.md) — Security evaluation across 6 distinct attack vectors.

---
&copy; 2026 AETHER Protocol. Built for advanced multi-layer physical asset security.
