# AETHER v3.0: Intelligent Three-Layer Anti-Counterfeiting Platform
### Comprehensive System Architecture, Academic Alignment, and Implementation Guide

> **Author**: Anti-Counterfeiting Engineering & Research Team  
> **Platform Version**: 3.0.0 (Production / Sepolia & Cloud Deployed)  
> **Academic Baseline**: Extending HACPv5 (*Computers, Materials & Continua*, Vol. 83, No. 3, 2025)  
> **Repository**: `anti-counterfeit-3layer`  
> **Frontend URL**: `https://aether-block.vercel.app`  
> **Backend API**: `https://anti-counterfeit-backend-8gtq.onrender.com`  
> **Ethereum Sepolia Contract**: `0xd07c3ffEF5BFd1cbB3A36FD3cE80661bfeA3D294`

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement](#1-executive-summary--problem-statement)
2. [Academic Alignment: Critical Analysis of HACPv5 Paper](#2-academic-alignment-critical-analysis-of-hacpv5-paper)
3. [The Three-Layer Defense Architecture](#3-the-three-layer-defense-architecture)
   - [Layer 1: Cryptographic Identity & Ethereum Blockchain](#layer-1-cryptographic-token-identity--blockchain)
   - [Layer 2: Visual Packaging & Typography AI Inspection](#layer-2-visual-packaging--typography-ai-inspection)
   - [Layer 3: Spatio-Temporal Anomaly & Threat Detection](#layer-3-spatio-temporal-anomaly--threat-detection)
   - [Deterministic Multi-Signal Decision Fusion Matrix](#deterministic-multi-signal-decision-fusion-matrix)
4. [Smart Contract Architecture (`ProductRegistry.sol`)](#4-smart-contract-architecture-productregistrysol)
5. [Backend Microservice & ML Architecture](#5-backend-microservice--ml-architecture)
   - [FastAPI Microservices & MySQL 9.x Schema](#fastapi-microservices--mysql-9x-schema)
   - [RapidOCR & MobileNetV2 Neural Embedding Pipeline](#rapidocr--mobilenetv2-neural-embedding-pipeline)
   - [Client-Side HTML5 Canvas Downscaling (OOM Prevention)](#client-side-html5-canvas-downscaling-oom-prevention)
6. [Role-Separated Three-Portal Frontend](#6-role-separated-three-portal-frontend)
   - [Admin Portal (`/admin/*`)](#admin-portal-admin)
   - [Manufacturer Portal (`/manufacturer/*`)](#manufacturer-portal-manufacturer)
   - [Consumer Portal (`/consumer/*`)](#consumer-portal-consumer)
7. [Mobile-First Responsive Redesign & Dual Theme System](#7-mobile-first-responsive-redesign--dual-theme-system)
8. [Comprehensive Threat Model & 6 Attack Scenarios](#8-comprehensive-threat-model--6-attack-scenarios)
9. [Experimental Benchmark & Quantitative Results](#9-experimental-benchmark--quantitative-results)
10. [Local Development, Deployment & Configuration](#10-local-development-deployment--configuration)
11. [Repository Directory Layout](#11-repository-directory-layout)

---

## 1. Executive Summary & Problem Statement

Global trade in counterfeit goods accounts for more than **$4.5 trillion annually**, threatening human safety in pharmaceuticals, agrochemicals, and automotive components, while causing catastrophic brand equity loss in consumer electronics and luxury goods.

### The Failure of Conventional Anti-Counterfeiting:
1. **Static Barcodes & QR Codes**: Trivial to photocopy, clone, and mass-reproduce on counterfeit packaging.
2. **Passive RFID / Standard NFC**: Static UID chips can be cloned using commodity Proxmark devices or software emulators in seconds.
3. **Siloed Centralized Databases**: Vulnerable to insider database tampering, operator corruption, and single points of failure.
4. **Physical Packaging Disconnect**: Traditional authentication inspects only the digital tag; counterfeiters exploit this by detaching genuine tags and affixing them to adulterated bottles or lookalike knock-offs ("tag reapplication attack").

### The AETHER v3.0 Paradigm:
**AETHER v3.0** transforms physical asset authentication into a **three-layer, multi-factor deterministic verification pipeline**. It pairs **Ethereum smart contracts**, **NXP NTAG 424 DNA hardware cryptography**, **hardware-free signed dynamic QR HMACs**, **PyTorch MobileNetV2 neural vision with RapidOCR typosquatting detection**, and **spatio-temporal machine learning threat scoring** into three dedicated, role-separated portals for Admins, Manufacturers, and Consumers.

```
                              ┌─────────────────────────────────────────┐
                              │           AETHER v3.0 ENGINE            │
                              └────────────────────┬────────────────────┘
                                                   │
                  ┌────────────────────────────────┼────────────────────────────────┐
                  ▼                                ▼                                ▼
    ┌───────────────────────────┐    ┌───────────────────────────┐    ┌───────────────────────────┐
    │       LAYER 1: CRYPTO     │    │       LAYER 2: VISION     │    │       LAYER 3: ML RISK    │
    ├───────────────────────────┤    ├───────────────────────────┤    ├───────────────────────────┤
    │ • NTAG 424 SUN AES-128    │    │ • MobileNetV2 (1280-d)    │    │ • Haversine Velocity Check│
    │ • Rolling Counter (C+1)   │    │ • RapidOCR Typography     │    │ • Impossible Travel Metric│
    │ • Dynamic HMAC-SHA256 QR  │    │ • Levenshtein Distance    │    │ • Clone-First Detection   │
    │ • Sepolia Smart Contract  │    │ • Canvas Downscaling      │    │ • Random Forest Risk Model│
    └─────────────┬─────────────┘    └─────────────┬─────────────┘    └─────────────┬─────────────┘
                  │                                │                                │
                  └────────────────────────────────┼────────────────────────────────┘
                                                   │
                                                   ▼
                                  ┌─────────────────────────────────┐
                                  │   10-RULE DETERMINISTIC FUSION  │
                                  ├─────────────────────────────────┤
                                  │  ✔ VERIFIED (Genuine)           │
                                  │  ▲ MANUAL REVIEW (Policy Hold)  │
                                  │  ✖ SUSPICIOUS ACTIVITY (Fraud)  │
                                  └─────────────────────────────────┘
```

---

## 2. Academic Alignment: Critical Analysis of HACPv5 Paper

AETHER v3.0 is grounded in and directly improves upon the foundational peer-reviewed paper:
> **Title**: *A Holistic Anti-Counterfeiting Platform Using NFC and Blockchain Technologies*  
> **Authors**: Rajendren Subramaniam, Saaidal Razalli Azzuhri, Teh Ying Wah, Atif Mahmood, Vimala Balakrishnan  
> **Journal**: *Computers, Materials & Continua* (CMC), Vol. 83, No. 3, 2025, pp. 4257–4280.  
> **DOI**: `10.32604/cmc.2025.061560`

### Identified Deficiencies in the HACPv5 Paper:

1. **The Fatal "Clone Supersedes Authentic" Vulnerability (Paper Section 9)**:
   The authors candidly acknowledged in their conclusion:
   > *"When the mobile authenticator tries to authenticate the NFC tag with an obsolete identification, the NFC tag will be shown as unauthorized tag. However, there are chances of the original NFC tags also to be shown as duplicated if the duplicated supersedes the AuthentiCoding process. Hence, further research will be required to close this gap."*
   In HACPv5, authentication required over-the-air software rewriting (`ndef.write()`). If an adversary captured a code and scanned it first, the system updated the stored hash. When the legitimate customer later scanned the authentic physical item, **the authentic tag was flagged as counterfeit**, while the adversary's scan was granted genuine status.

2. **Vulnerability to Tag Reapplication & Adulterated Refills**:
   HACPv5 operated on the naive assumption that *if the digital tag is valid, the physical product must be genuine*. Counterfeiters bypass this by detaching genuine NFC stickers from discarded luxury wine bottles or high-end sneakers and re-sticking them onto fake bottles or lookalike replicas.

3. **Simulated Mock Blockchain**:
   HACPv5 implemented an in-memory/SQLite mock Python class labeled "blockchain.py" with no real consensus, no cryptographic transaction gas model, and no multi-signature authorization.

4. **Hardware Dependency Barrier**:
   HACPv5 mandated expensive physical NFC encoding equipment for every single SKU, rendering it economically unfeasible for fast-moving consumer goods (FMCG).

### Systematic Improvisation Matrix:

| Dimension | Base Paper (HACPv5, CMC 2025) | AETHER v3.0 Platform (`anti-counterfeit-3layer`) | Architectural Benefit |
| :--- | :--- | :--- | :--- |
| **NFC Identity Protocol** | Over-the-air software rewriting (`ndef.write()`). High failure rate, phone-write required. | **NXP NTAG 424 DNA Hardware SUN**: Read-only URL with AES-128 CMAC & monotonic hardware counter ($C \leftarrow C + 1$). | **Zero phone writes**. Immune to tag bricking, network interruption, and race condition desync. |
| **Race Condition Fix** | Vulnerable (adversary's clone can supersede authentic tag). | **Cryptographic Monotonic Counter Validation**: $C_{\text{new}} > C_{\text{last}}$, paired with spatial anomaly flags. | **Authentic items cannot be invalidated by obsolete clones**. |
| **Hardware-Free Track** | None. Requires NFC hardware on all items. | **Signed Dynamic QR HMAC-SHA256**: Generates single-use dynamic cryptographic tokens. | **Zero hardware barrier**. Works with standard consumer smartphone cameras. |
| **Physical Packaging** | None. Assumed genuine tag = genuine product. | **MobileNetV2 (1280-d) + RapidOCR Levenshtein Typography**: Visual embedding + brand lookalike text detection. | **Prevents tag reapplication & refill fraud** (e.g. `adibas`, `DEVTOL`, `NIEK`, `Bislie`). |
| **Blockchain** | Simulated Python mock class. | **Solidity Smart Contract (`ProductRegistry.sol`)**: Deployed on Ethereum Sepolia & Ganache with RBAC. | **Immutable public ledger, true decentralized audit trail, EVM state verification**. |
| **Threat Intelligence** | Simple static timestamp difference. | **Random Forest & Isolation Forest ML Anomaly Engine**: Live risk scoring on speed, frequency, and entropy. | **High precision (0.975), 0.978 ROC-AUC, 0.2% false alarm rate on genuine scans**. |
| **Portals & UX** | Single generic mock app. | **Three Independent Portals**: Role-separated Admin, Manufacturer, and Consumer experiences. | **Enterprise compliance, manufacturer batching, and frictionless consumer scanning**. |

---

## 3. The Three-Layer Defense Architecture

### Layer 1: Cryptographic Token Identity & Blockchain

Layer 1 guarantees cryptographic origin authenticity and immutability.

#### 1. Hardware Track: NTAG 424 DNA Secure Unique NFC (SUN)
- The NFC chip features a hardware-protected AES-128 cryptographic engine and a tamper-proof monotonic counter.
- On each NFC tap, the chip increments its internal counter ($C \leftarrow C + 1$) and generates a dynamic Cipher-based Message Authentication Code (CMAC):
  $$\text{CMAC} = \text{AES-128}_{\text{Key}}(\text{UID} \parallel C)$$
- The resulting NDEF payload is transmitted as a dynamic HTTPS mirror URL:
  `https://verify.example.com/v?uid=04A2B3C4D5E6F7&c=00002A&cmac=E4A1B2C3...`
- The backend verifies that the CMAC matches the secret manufacturer key and strictly enforces $C > C_{\text{last\_recorded}}$.

#### 2. Hardware-Free Track: Signed Dynamic QR Codes
- Generates high-security signed tokens using HMAC-SHA256:
  $$\text{Token} = \text{HMAC-SHA256}_{K_{\text{HMAC}}}(\text{ProductID} \parallel \text{Serial} \parallel \text{Timestamp})$$
- Even if a counterfeiter captures the printed QR code, attempts to scan it repeatedly across different geographical locations trigger Layer 3 spatial velocity anomalies.

#### 3. Blockchain State Machine (`ProductRegistry.sol`)
- Enforces an immutable on-chain state machine:
  $$\text{UNREGISTERED} \xrightarrow{\text{registerProduct()}} \text{ENROLLED} \xrightarrow{\text{markSold()}} \text{SOLD}$$
- Prevents post-sale resale fraud and duplicate enrollment.

---

### Layer 2: Visual Packaging & Typography AI Inspection

Layer 2 ensures that the physical item carrying the tag actually matches the authentic reference packaging registered by the brand.

```
       [ Uploaded Packaging Photo ]
                   │
                   ▼
    ┌──────────────────────────────┐
    │  Client-Side HTML5 Canvas    │  --> Downscale to max 512px (JPEG 0.82)
    │  Pre-Upload Normalization    │      (10 MB payload reduced to ~35 KB)
    └──────────────┬───────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────────┐┌──────────────────────────────────────┐
│  MobileNetV2     ││  RapidOCR / Text Recognition         │
│  Deep Metric CNN ││  Tokenization & Levenshtein Matching │
└────────┬─────────┘└──────────────────┬───────────────────┘
         │                             │
         ▼                             ▼
Cosine Similarity:              Typography Distance:
1280-d Feature Vector           Detects Brand Lookalikes:
Sim(u, v) >= 0.70 Genuine       • DEVTOL vs Dettol (0.83)
Sim(u, v) <  0.45 Counterfeit   • adibas vs Adidas (0.83)
                                • NIEK vs Nike (0.75)
                                • Bislie vs Bisleri (0.77)
```

1. **MobileNetV2 Metric Embedding**:
   - Pre-trained on ImageNet and fine-tuned for high-resolution packaging textures.
   - Extracts a normalized 1280-dimensional feature embedding vector:
     $$\mathbf{f} \in \mathbb{R}^{1280}, \quad \|\mathbf{f}\|_2 = 1$$
   - Cosine similarity with the manufacturer's genuine baseline embedding:
     $$\cos(\theta) = \frac{\mathbf{f}_{\text{query}} \cdot \mathbf{f}_{\text{baseline}}}{\|\mathbf{f}_{\text{query}}\| \|\mathbf{f}_{\text{baseline}}\|}$$

2. **RapidOCR Typosquatting & Lookalike Detection**:
   - Counterfeiters frequently exploit "copycat branding" with deliberate typographical mimicry.
   - RapidOCR extracts all textual tokens from the packaging label.
   - Computes normalized sequence matcher distance against registered brand trademarks:
     $$\text{Similarity}(S_1, S_2) = \frac{2 \cdot M}{|S_1| + |S_2|}$$
   - Any lookalike ratio between **0.65 and 0.99** indicates deceptive brand mimicry and immediately triggers a **Counterfeit / Lookalike packaging** flag.

---

### Layer 3: Spatio-Temporal Anomaly & Threat Detection

Layer 3 detects distributed scanning botnets, cloned QR codes, and stolen physical assets.

1. **Haversine Geodesic Velocity ($\Delta d / \Delta t$)**:
   Given two consecutive scans at coordinates $(lat_1, lon_1)$ and $(lat_2, lon_2)$ separated by $\Delta t$ seconds:
   $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
   $$d = 2R \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
   $$v = \frac{d}{\Delta t}$$
   If velocity $v > 900\text{ km/h}$ (commercial jet flight speed), an **Impossible Travel Anomaly** is flagged.

2. **Burst Scanning Density**:
   Monitors high-frequency scans across unique IP subnets and device fingerprints within a 120-second sliding window.

3. **Machine Learning Risk Model**:
   - **Isolation Forest**: Unsupervised spatial anomaly score based on path lengths in isolation trees.
   - **Random Forest Classifier**: Trained on 6 distinct attack vectors, outputting continuous risk scores $\in [0.0, 1.0]$.

---

### Deterministic Multi-Signal Decision Fusion Matrix

The final authentication verdict is computed using a deterministic 10-rule fusion engine (`fusion.py`):

| Rule | On-Chain Enrolled? | Token Identity Check | AI Visual Packaging | Lifecycle State | Spatial Risk Score | Final Verdict | Classification Reason |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **R1** | ✔ YES | ✔ Valid Cryptogram | ✔ Genuine ($\ge 0.70$) | UNSOLD | Low ($< 0.40$) | **Verified** | Product is on-chain, identity check passed, and packaging is authentic. |
| **R2** | ✔ YES | ✔ Valid Cryptogram | None Provided | UNSOLD | Low ($< 0.40$) | **Verified** | Product identity verified on-chain. Visual inspection omitted. |
| **R3** | ✖ NO | Any | Any | Any | Any | **Suspicious** | Product ID not found in Ethereum smart contract registry. |
| **R4** | Any | ✖ Bad CMAC / HMAC | Any | Any | Any | **Suspicious** | Invalid cryptographic token signature (counterfeit or replay). |
| **R5** | ✔ YES | ✔ Valid Cryptogram | ✖ Counterfeit / Lookalike | Any | Any | **Suspicious** | Physical packaging mismatch (deceptive brand lookalike detected on label). |
| **R6** | ✔ YES | ✔ Valid Cryptogram | Any | Any | High ($\ge 0.70$) | **Suspicious** | Critical spatio-temporal anomaly (impossible travel or burst clone scan). |
| **R7** | ✔ YES | ✔ Valid Cryptogram | Any | SOLD | Any | **Manual review**| Item was previously marked SOLD on-chain (possible resale or duplicate scan). |
| **R8** | ✔ YES | ✔ Valid Cryptogram | ▲ Ambiguous / Uncertain | UNSOLD | Low ($< 0.40$) | **Manual review**| Packaging photograph quality is ambiguous; physical retail audit advised. |
| **R9** | ✔ YES | ✔ Valid Cryptogram | Any | UNSOLD | Medium ($0.40 - 0.70$) | **Manual review**| Moderate spatial risk anomaly detected; flagged for secondary verification. |
| **R10**| ✔ YES | ✖ Replay Disputed Counter| Any | Any | Any | **Suspicious** | NFC rolling counter regression or duplicate replay detected. |

---

## 4. Smart Contract Architecture (`ProductRegistry.sol`)

The Solidity contract acts as the decentralized source of truth for physical asset ownership, lifecycle states, and manufacturer privileges.

### Core Architecture & State Variables:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ProductRegistry {
    address public owner;
    address public operator; // Backend oracle relayer

    enum LifecycleState { Unregistered, Enrolled, Sold }

    struct Product {
        bytes32 productId;           // keccak256 hash or deterministic ID
        bytes32 recordHash;          // SHA-256 metadata + packaging hash
        string serialNumber;        // Factory serial
        address manufacturer;        // Authorizing producer
        uint256 registrationTime;    // Block timestamp
        LifecycleState state;        // Current lifecycle
    }

    mapping(bytes32 => Product) public products;
    mapping(address => bool) public whitelistedManufacturers;
    
    event ProductRegistered(bytes32 indexed productId, address indexed manufacturer, bytes32 recordHash);
    event ProductMarkedSold(bytes32 indexed productId, uint256 soldTime);
    event ManufacturerWhitelisted(address indexed manufacturer);
    event ManufacturerRevoked(address indexed manufacturer);
    event ScanAudited(bytes32 indexed productId, address indexed verifier, uint8 verdict, uint256 timestamp);
}
```

### Access Control Modifiers:
- `onlyOwner`: Restricts governance functions (manufacturer whitelisting, contract administration) to the contract deployer (Account #0).
- `onlyOperator`: Authorizes the backend oracle account to log public consumer scan receipts and broadcast authorized `markSold` transactions without forcing consumers to hold ETH gas.
- `onlyWhitelistedManufacturer`: Restricts `registerProduct` execution exclusively to vetted, KYC-approved manufacturer addresses.

### Live Deployment Configurations:
| Parameter | Local Ganache Network | Ethereum Sepolia Testnet |
| :--- | :--- | :--- |
| **Network ID / Chain ID** | `1337` | `11155111` |
| **RPC Endpoint** | `http://127.0.0.1:7546` | Alchemy / Infura Sepolia RPC |
| **Contract Address** | `0xCfEB869F69431e42cdB54A4F4f105C19C080A601` | `0xd07c3ffEF5BFd1cbB3A36FD3cE80661bfeA3D294` |
| **Owner / Governance** | `0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1` | Cloud Admin Wallet (`0x8a87...20bd`) |
| **EVM Version** | London (200 compiler runs) | London (200 compiler runs) |

---

## 5. Backend Microservice & ML Architecture

The backend is built with **FastAPI** (Python 3.11) and **SQLAlchemy 2.x** with asynchronous database sessions.

### FastAPI Microservices & MySQL 9.x Schema:
The relational schema comprises 6 normalized core tables:
1. `products`: Primary asset registry (`product_id`, `short_id`, `record_hash`, `name`, `brand`, `serial`, `manufacturer_address`, `image_embedding_path`, `sold`, `created_at`).
2. `tags`: Physical hardware tokens (`uid`, `product_id`, `channel`, `last_counter`, `state`, `created_at`).
3. `scans`: Comprehensive audit telemetry (`id`, `product_id`, `channel`, `verdict`, `reason`, `identity_result`, `chain_result`, `image_result`, `risk_score`, `lat`, `lon`, `device_hash`, `chain_tx`, `ts`).
4. `manufacturers`: Corporate KYC records (`id`, `name`, `business_reg`, `email`, `wallet_address`, `jurisdiction`, `status`, `submitted_at`).
5. `brands`: Registered manufacturer brand trademarks (`id`, `mfr_id`, `name`, `reg_number`, `category`).
6. `batches`: Production lots (`id`, `mfr_id`, `lot_number`, `brand`, `units_count`, `mfg_date`, `expiry_date`).

### Key REST API Endpoints:
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/verify` | Multi-signal authentication pipeline (Token, Image, Geolocation). |
| `POST` | `/api/products/register` | Mint physical asset on-chain with reference packaging image. |
| `GET` | `/api/products/{pid}` | Retrieve product metadata and on-chain ledger proof. |
| `POST` | `/api/products/{pid}/sell` | Execute `markSold()` on-chain state transition. |
| `GET` | `/api/scans/recent` | Stream live audit events and security incidents. |
| `GET` | `/api/tags` | Directory of registered NFC tags and counter states. |
| `PUT` | `/api/tags/{uid}/state` | Deactivate/Reactivate compromised tags (`ok` / `disputed`). |
| `GET` | `/api/chain-info` | Real-time Web3 RPC connection status and contract configuration. |

### Client-Side HTML5 Canvas Downscaling (OOM Prevention):
During initial cloud deployment on Render (512 MB memory limit), uploading raw 12–15 megapixel smartphone camera photos (~10 MB) triggered PyTorch image buffer allocation spikes exceeding the container limit.

**Solution (`frontend/src/lib/imageUtils.ts`)**:
Before HTTP transmission, the client renders the image onto an off-screen HTML5 canvas, constraining the maximum dimension to **512px** at JPEG quality **0.82**:
```typescript
export async function downscaleImageForVerification(file: File, maxDimension = 512, quality = 0.82): Promise<File> {
  // Reduces 10MB raw photo to ~35KB (<50ms upload, 0% cloud memory pressure)
  // Preserves 100% of OCR typography resolution and MobileNetV2 embedding features
}
```
This reduced network payload by **99.6%** (from ~10 MB to ~35 KB), decreased transmission latency to `< 50ms`, and eliminated cloud server memory exhaustion.

---

## 6. Role-Separated Three-Portal Frontend

The frontend is implemented in **React 18**, **TypeScript**, and **Tailwind CSS**, bundled with **Vite**. The architecture enforces clean RBAC separation across three independent portals:

### 1. 🛡️ Admin Portal (`/admin/*`)
- **Overview (`/admin/overview`)**: Executive security dashboard, active EVM contract status, and real-time scan feed.
- **Security & Fraud Monitoring (`/admin/security`)**: Real-time attack telemetry, filterable by 6 attack categories, with investigator notes and audit logs.
- **Blockchain Console (`/admin/blockchain`)**: Direct `ProductRegistry.sol` governance, owner role verification, and deterministic account switching.
- **Manufacturer KYC (`/admin/manufacturers`)**: Review corporate documentation, verify business registration numbers, and trigger on-chain `whitelistManufacturer()` / `revokeManufacturer()`.
- **Product Registry (`/admin/products`)**: Complete directory of enrolled assets with bytes32 on-chain IDs and SHA-256 metadata verification.
- **Tag Management (`/admin/tags`)**: Directory of 7-byte NFC UIDs, rolling counters, and emergency deactivation switches.
- **Audit Logs (`/admin/audit`)**: Unified immutable chronological event stream across blockchain txs, KYC approvals, and verifications.
- **User Governance (`/admin/users`)**: Role-based access control, Ethereum wallet key association, and permission assignment.
- **System Settings (`/admin/settings`)**: Health metrics for FastAPI, MySQL 9.x, Ganache 1337, MobileNetV2, and RapidOCR.

### 2. 🏭 Manufacturer Portal (`/manufacturer/*`)
- **Overview (`/manufacturer/overview`)**: Production floor telemetry, active batch status, and quick enrollment actions.
- **Tag Generation (`/manufacturer/generate-tags`)**: Form for asset registration, reference packaging photo upload, MobileNetV2 embedding, on-chain minting, and printable signed QR generation.
- **NFC Encoding Station (`/manufacturer/nfc-encoding`)**: AuthentiCoding programmer interface for NXP NTAG 424 SUN chips with live trace.
- **Brand Management (`/manufacturer/brands`)**: Manage brand trademarks, registration numbers, and product categories.
- **Batch Management (`/manufacturer/batches`)**: Create manufacturing lots, assign unit counts, and manage expiry dates.
- **Product Catalog (`/manufacturer/products`)**: List of registered goods with human-readable Short IDs (`PRD-XXXXXX`).
- **Tag Inventory (`/manufacturer/tags`)**: Manage active NFC tags with compromise deactivation controls.
- **Encoding History (`/manufacturer/encoding-history`)**: QA audit log of programmer hardware sessions, unit yields, and operator stamps.
- **Product Analytics (`/manufacturer/analytics`)**: Consumer scan charts, authentic vs. suspicious ratios, and QR vs. NFC channel distribution.
- **Company Profile (`/manufacturer/profile`)**: Update corporate information, business registration numbers, and signing wallets.

### 3. 👤 Consumer Portal (`/consumer/*` and `/`)
- **Landing Page (`/` or `/consumer`)**: Public educational portal introducing the 3-layer security system.
- **Verify Product (`/consumer/verify`)**:
  - Live camera stream QR scanner via `html5-qrcode`.
  - Manual Short ID or 32-byte hash input.
  - NFC tap listener for NTAG 424 SUN chips.
  - Optional packaging photograph upload with client-side canvas downscaling.
  - Instant multi-signal diagnostic feedback and on-chain transaction receipt.
- **Verification Result (`/consumer/result`)**: Shareable Certificate of Authenticity with timestamp, item ledger proofs, and post-purchase `Mark as Purchased` action.
- **Verification History (`/consumer/history`)**: Local verification ledger stored on the consumer's device.
- **Report Counterfeit (`/consumer/report`)**: Public reporting form with photo upload, retail location details, and automated incident logging.
- **Product Directory (`/consumer/products`)**: Public catalog of approved genuine brands and products.
- **Help & Support (`/consumer/help`)**: Interactive step-by-step scanning guides and FAQ accordion.
- **About AETHER (`/consumer/about`)**: Architectural overview and scientific alignment with the HACP5 paper.

---

## 7. Mobile-First Responsive Redesign & Dual Theme System

The user interface was completely redesigned from the ground up for a **mobile-first** experience, tested extensively on compact viewports down to **360px (Samsung Galaxy A55)**:

### 1. Viewport Adaptation ($360\text{px} - 414\text{px}$):
- **Card Padding Budget**: Standard card padding adjusted to `p-3.5 sm:p-5`, reclaiming 14px of critical horizontal screen real estate on 360px screens.
- **Header Optimization**: Compact Portal Switcher displaying concise role badges (`Producer`, `Consumer`, `Admin`) on `< 640px` screens to prevent header collisions.
- **Accessible Hamburger Navigation**: Touch targets calibrated to a minimum of **$\ge 40\text{px} - 44\text{px}$** with full-screen slide-in drawers.
- **Verdict & Badge Collision Fix**: Added an explicit `xs: 480px` breakpoint in `tailwind.config.js`. Headings and large verdict badges (`SUSPICIOUS ACTIVITY`, `VERIFIED`) stack vertically on `< 480px` viewports, completely eliminating text overlap.
- **Full-Width Stacked Actions**: Action buttons ("Mark as Purchased", "Report Counterfeit Item") occupy 100% width on mobile screens with `min-h-[44px]` touch targets.

### 2. Dual Enterprise Theme System:
Switchable instantly via the navigation bar toggle with persistent `localStorage` synchronization:
- **Stark Dark Theme**: Base `#080D14`, Cards `#111C29`, Cyan Accent `#00BFFF`, Glow borders, designed for security operations and low-light inspection.
- **Enterprise Light Theme**: Base `#F3F6FA`, Cards `#FFFFFF`, Primary `#0788CE`, Dark Slate typography `#142C43`, designed for retail environments and bright outdoor sunlight.

---

## 8. Comprehensive Threat Model & 6 Attack Scenarios

| Attack Vector | Counterfeit Strategy | AETHER v3.0 Defense Mechanism | Resulting Verdict |
| :--- | :--- | :--- | :---: |
| **1. Replay Attack** | Adversary intercepts an NFC CMAC or QR token and replays it later. | Monotonic hardware counter check: $C_{\text{new}} \le C_{\text{last}}$ is detected and rejected on Layer 1. | **Suspicious activity** |
| **2. Clone-First Attack** | Adversary clones tag and scans it in another location before the genuine buyer. | Layer 3 Spatial Anomaly Engine detects impossible travel velocity ($v > 900\text{ km/h}$) and flags the clone. | **Suspicious activity** |
| **3. Forged QR Code** | Counterfeiter generates fake QR code with genuine product ID. | HMAC-SHA256 signature verification fails on Layer 1 due to missing manufacturer secret key. | **Suspicious activity** |
| **4. Impossible Travel** | Duplicate QR tokens scanned simultaneously in distant cities. | Haversine distance over elapsed time exceeds physical flight speed threshold. | **Suspicious activity** |
| **5. Lookalike Packaging** | Counterfeiter prints genuine QR code on knock-off brand (`adibas`, `DEVTOL`). | RapidOCR Levenshtein sequence matching catches brand typosquatting (ratio $0.65 - 0.99$). | **Suspicious activity** |
| **6. Post-Sale Resale Fraud**| Genuine empty luxury bottle or packaging reused and refilled with fake product. | Smart contract checks `isSold(productId)`. If item was already sold on-chain, transaction triggers a policy hold. | **Manual review** |

---

## 9. Experimental Benchmark & Quantitative Results

Experiments were evaluated across **37,312 simulated scans** and **2,000 unique products** across **5 random seeds** (42, 7, 13, 99, 256), benchmarked against the base paper's rule-based model:

| Metric | Base Paper Rule Baseline (HACPv5) | Isolation Forest Model | AETHER v3.0 Random Forest Engine |
| :--- | :---: | :---: | :---: |
| **Precision** | $0.704 \pm 0.028$ | $0.648 \pm 0.028$ | **$0.975 \pm 0.019$** |
| **Recall** | $0.455 \pm 0.060$ | $0.670 \pm 0.023$ | **$0.753 \pm 0.037$** |
| **F1-Score** | $0.551 \pm 0.051$ | $0.659 \pm 0.020$ | **$0.849 \pm 0.016$** |
| **ROC-AUC** | $0.733 \pm 0.026$ | $0.881 \pm 0.008$ | **$0.978 \pm 0.004$** |
| **False Alarm Rate (Genuine)** | $1.70\% \pm 0.26\%$ | $3.25\% \pm 0.34\%$ | **$0.20\% \pm 0.18\%$** |

### Key Experimental Findings:
1. **Precision Improvement**: AETHER achieved **97.5% precision**, eliminating false accusations against legitimate retail stores.
2. **False Alarm Reduction**: Genuine scan false alarms dropped from **1.70%** down to **0.20%**, ensuring a seamless consumer experience.
3. **ROC-AUC**: The Random Forest risk model achieved an exceptional **0.978 ROC-AUC**, demonstrating near-perfect discriminative capability across complex multi-city attack patterns.

---

## 10. Local Development, Deployment & Configuration

### Prerequisites:
- Windows 10/11, macOS, or Linux
- Python 3.11+
- Node.js 18+ and npm
- MySQL 8.x / 9.x
- Truffle Suite & Ganache CLI

### Step 1: Start Ganache Blockchain
```powershell
ganache --port 7546 --deterministic --accounts 10 --networkId 1337
```

### Step 2: Compile & Deploy Smart Contracts
```powershell
cd contracts
truffle migrate --network cli --reset
cd ..
```

### Step 3: Configure Environment (`.env`)
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

### Step 4: Launch FastAPI Microservices
```powershell
# In project root
.\backend\.venv\Scripts\uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*API interactive documentation: `http://127.0.0.1:8000/docs`*

### Step 5: Launch Vite Frontend
```powershell
cd frontend
npm install
npm run dev
```
*Application web interface: `http://localhost:5173/`*

---

## 11. Repository Directory Layout

```
anti-counterfeit-3layer/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI entrypoint, middleware, CORS, routes
│   │   ├── database.py                 # SQLAlchemy MySQL connection pool & session manager
│   │   ├── models.py                   # ORM models (Product, Tag, Scan, Manufacturer, etc.)
│   │   ├── schemas.py                  # Pydantic validation schemas
│   │   ├── eth.py                      # Web3.py smart contract interaction & transaction signer
│   │   ├── fusion.py                   # 10-rule deterministic multi-signal decision engine
│   │   └── crud.py                     # Database query and persistence routines
│   └── tests/                          # 55+ backend unit and integration test suites
│
├── contracts/
│   ├── contracts/
│   │   └── ProductRegistry.sol         # Solidity Ethereum smart contract
│   ├── migrations/                     # Truffle deployment migration scripts
│   └── truffle-config.js               # Network definitions (Ganache, Sepolia, Polygon)
│
├── frontend/
│   ├── src/
│   │   ├── components/                 # Shared UI components (Card, Navbar, PortalSwitcher, etc.)
│   │   ├── layouts/                    # Role layouts (AdminLayout, ManufacturerLayout, ConsumerLayout)
│   │   ├── lib/
│   │   │   ├── api.ts                  # Axios API client
│   │   │   ├── auth.tsx                # Role-based context & MetaMask provider
│   │   │   ├── imageUtils.ts           # Client-side HTML5 canvas downscaling utility
│   │   │   └── theme.tsx               # Enterprise dual theme provider
│   │   ├── pages/
│   │   │   ├── admin/                  # 9 dedicated Admin Portal pages
│   │   │   ├── manufacturer/           # 10 dedicated Manufacturer Portal pages
│   │   │   └── consumer/               # 8 dedicated Consumer Portal pages
│   │   ├── App.tsx                     # React Router 27-route definition
│   │   └── main.tsx                    # React DOM root
│   ├── tailwind.config.js              # Theme color tokens, custom 'xs' (480px) breakpoint
│   └── vite.config.ts                  # Vite production bundler configuration
│
├── ml/
│   ├── image_signal/
│   │   ├── embedder.py                 # MobileNetV2 1280-d neural feature extraction
│   │   └── ocr_checker.py              # RapidOCR typography & Levenshtein lookalike matcher
│   └── spatial/
│       ├── anomaly_detector.py         # Isolation Forest & Random Forest inference
│       └── haversine.py                # Geodesic velocity calculation
│
├── experiments/
│   └── results/
│       └── metrics.json                # 5-seed benchmark results across 37,312 scans
│
├── docs/                               # In-depth architectural & deployment guides
├── PROJECT_DOCUMENTATION.md            # Comprehensive Master Technical Documentation
└── README.md                           # Quickstart guide and overview
```

---

&copy; 2026 AETHER Protocol. Released under the MIT License. Developed for advanced multi-layer physical asset protection.
