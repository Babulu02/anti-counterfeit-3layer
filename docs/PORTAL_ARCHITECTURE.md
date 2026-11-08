# AETHER v3.0 — Three-Portal Role-Based Architecture Guide
**Holistic Anti-Counterfeiting Platform (HACP5 Research Alignment & Multi-Layer Cryptographic Extensions)**

---

## 1. Executive Summary

**AETHER v3.0** is an enterprise-grade, role-separated anti-counterfeiting platform that aligns with and expands upon the **HACP5 (Holistic Anti-Counterfeiting Platform)** scientific research framework. 

Rather than treating anti-counterfeiting as a single generic webpage or a simple database lookup, AETHER separates physical supply-chain lifecycle operations into **three independent, role-based portals**:

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

## 2. Portal Separation & Route Matrix

### A. Admin Portal (`/admin/*`)
*Target Persona:* Platform security directors, smart contract administrators, and compliance auditors.

| Route | View Component | Core Functionality |
| :--- | :--- | :--- |
| `/admin/overview` | `AdminOverviewPage` | Live telemetry command center, EVM block height, KPI counters, and audit feed stream. |
| `/admin/manufacturers` | `ManufacturerManagementPage` | KYC verification review, on-chain `addManufacturer` / `removeManufacturer` triggers. |
| `/admin/products` | `ProductManagementPage` | Searchable product registry, SHA-256 metadata inspect, record hash verification. |
| `/admin/blockchain` | `BlockchainManagementPage` | Direct ProductRegistry.sol contract console, owner permissions, deterministic account directory. |
| `/admin/security` | `SecurityMonitoringPage` | Real-time fraud detection (replay attacks, clone-first, burst scanning, impossible travel) & investigator notes. |
| `/admin/tags` | `TagManagementPage` | Directory of physical NFC UIDs, rolling counters, emergency tag deactivation / reactivation. |
| `/admin/audit` | `AuditLogsPage` | Unified immutable chronological stream across blockchain txs, KYC approvals, and verifications. |
| `/admin/users` | `UserManagementPage` | Role assignment, Ethereum wallet key association, permission scopes. |
| `/admin/settings` | `SystemSettingsPage` | Microservice liveness (FastAPI, MySQL 9.x, Ganache 1337, MobileNetV2, EasyOCR). |

---

### B. Manufacturer Portal (`/manufacturer/*`)
*Target Persona:* Production managers, quality control engineers, packaging operators.

| Route | View Component | Core Functionality |
| :--- | :--- | :--- |
| `/manufacturer/overview` | `ManufacturerOverviewPage` | Production floor metrics, active lots, verified customer scans, quick minting shortcuts. |
| `/manufacturer/profile` | `CompanyProfilePage` | Corporate registration documents, jurisdiction, compliance email, signing wallet address. |
| `/manufacturer/brands` | `BrandManagementPage` | Multi-brand management, trademark registration IDs, product line categories. |
| `/manufacturer/products` | `ManufacturerProductsPage` | Enrolled products catalog with short human IDs (`PRD-XXXXXX`) and on-chain bytes32 hashes. |
| `/manufacturer/batches` | `BatchManagementPage` | Manufacturing lot creator, unit counts, scheduled production dates, expiration tracking. |
| `/manufacturer/generate-tags` | `TagGenerationPage` | Full on-chain asset enrollment, reference packaging photo upload, MobileNetV2 embedding, signed QR download. |
| `/manufacturer/nfc-encoding` | `NfcEncodingPage` | HACP5 AuthentiCoding & DynamicID programmer interface (AES-128 CMAC and rolling counter pairing). |
| `/manufacturer/tags` | `ManufacturerTagsPage` | Inventory of active NFC tags bound to products, compromise deactivation controls. |
| `/manufacturer/encoding-history`| `EncodingHistoryPage` | Quality assurance audit log of hardware programmer sessions, unit yields, and operator stamps. |
| `/manufacturer/analytics` | `ManufacturerAnalyticsPage` | Consumer verification metrics, authentic vs. suspicious ratios, QR vs. NFC channel split. |

---

### C. Consumer Portal (`/consumer/*` and `/`)
*Target Persona:* End-market shoppers, retail inspectors, brand protection investigators.

| Route | View Component | Core Functionality |
| :--- | :--- | :--- |
| `/` or `/consumer` | `ConsumerHomePage` | Public educational landing page explaining the 3-layer anti-counterfeiting platform. |
| `/consumer/verify` | `ConsumerVerifyPage` | Live camera QR scanner (`html5-qrcode`), manual Short ID input, NFC tap authenticator, packaging photo upload. |
| `/consumer/result` | `ConsumerResultPage` | Dedicated certificate of authenticity, complete multi-signal diagnostic proofs, mark-sold action. |
| `/consumer/history` | `ConsumerHistoryPage` | Local verification ledger storing past scans and verdicts on the user's device. |
| `/consumer/report` | `ConsumerReportPage` | Public counterfeit reporting form with vendor details, photograph upload, and tracking ID. |
| `/consumer/products` | `ConsumerProductsPage` | Searchable public catalog of certified genuine brands and products. |
| `/consumer/help` | `ConsumerHelpPage` | Visual step-by-step guides for QR scanning and NFC tapping, FAQs, and diagnostic guides. |
| `/consumer/about` | `ConsumerAboutPage` | Detailed scientific paper alignment comparing HACP5 core architecture with AETHER extensions. |

---

## 3. Role-Based Access Control (RBAC) Architecture

AETHER enforces a three-tier permission model managed via [`auth.tsx`](file:///C:/Blockchain/anti-counterfeit-3layer/frontend/src/lib/auth.tsx) and guarded by [`ProtectedRoute.tsx`](file:///C:/Blockchain/anti-counterfeit-3layer/frontend/src/components/ProtectedRoute.tsx):

1. **`CONSUMER`**:
   - Public access to all consumer verification tools, approved catalog, history, and reporting.
   - Does **not** require MetaMask, cryptocurrency, or an account.
   - Prevented from accessing administrative governance and manufacturer encoding tools.

2. **`MANUFACTURER`**:
   - Requires corporate KYC approval and an on-chain whitelisted Ethereum address on `ProductRegistry.sol`.
   - Access to batch creation, asset enrollment, QR/NFC tag minting, and production telemetry.
   - Prevented from altering platform-wide smart contract ownership or revoking other manufacturers.

3. **`ADMIN`**:
   - Requires contract owner credentials (`onlyOwner` Account #0: `0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1`).
   - Authority to execute on-chain `addManufacturer` / `removeManufacturer` transactions, review fraud alerts, and oversee audit telemetry.

### Seamless Role Switcher
For evaluators, researchers, and project demonstrations, the navigation header includes an interactive **Portal Switcher (`PortalSwitcher.tsx`)**. Evaluators can switch between **Admin**, **Manufacturer**, and **Consumer** roles with a single click without manually reconnecting multiple wallets.

---

## 4. Scientific Alignment: HACP5 vs. AETHER v3.0

| Feature | Original Base Paper (HACP5) | AETHER v3.0 Implementation |
| :--- | :--- | :--- |
| **Physical Identity** | NFC NTAG 424 SUN only | **Dual-Channel:** NTAG 424 SUN + Hardware-Free Signed HMAC QR codes |
| **Blockchain** | Hyperledger Fabric (Private) | **Public EVM / Ethereum L1** (`ProductRegistry.sol`, London EVM, Solidity 0.8.20) |
| **Visual Packaging AI** | None (Hardware reliance only) | **PyTorch MobileNetV2** (1280-d cosine embeddings) + **EasyOCR text matching** |
| **Fraud Detection** | Basic counter gap | **Multi-Signal Fusion:** Impossible travel, burst scanning, clone-first, and resale fraud |
| **Portal Structure** | Disconnected client apps | **Three unified, role-separated web portals** with shared cryptographic state |
| **Theme System** | Unspecified / Standard UI | **Enterprise Dual Theme** (Light `#F3F6FA` & Dark `#080D14` with instant toggle) |

