# Project Handoff & Completion Summary

**Project:** Anti-Counterfeit Three-Layer Research Prototype  
**Extension:** Extends and fixes "A Holistic Anti-Counterfeiting Platform Using NFC and Blockchain" (CMC 2025, HACP5).

---

## 1. Project State & Phase Completion

All Phases 1 through 8 are fully implemented, verified with live scripts, and committed to git:

| Phase | Component | Status | Verification & Evidence |
|:---|:---|:---:|:---|
| **Phase 1** | Smart Contract (`ProductRegistry.sol`) | ✅ Complete | 7 truffle tests passing; gas metrics in `experiments/results/gas.csv`. |
| **Phase 2** | Physical Identity Layer (QR + NFC CMAC) | ✅ Complete | 67 pytest tests passing; clone-first race recovery: 100.0% (`race.csv`). |
| **Phase 3** | FastAPI Backend + MySQL + web3.py v8 | ✅ Complete | 28 API integration tests; Alembic migrations 0001 & 0002. |
| **Phase 4** | Honest ML Scan-Risk Engine | ✅ Complete | 2,000 products simulated; 5-seed evaluation; `FairRuleBaseline` with NFC gap; held-out attack `G_stealth_clone`. |
| **Phase 5** | Multi-Signal Fusion Engine (Layer 3) | ✅ Complete | 27 fusion rule tests; priority-based verdicts with graceful degradation. |
| **Phase 6** | React + Vite + TailwindCSS Frontend | ✅ Complete | TypeScript compiled; dev server running on port 5173. |
| **Phase 7** | Master Experiment Runner (`run_all.py`) | ✅ Complete | Produced `attack_matrix.csv`, `model_comparison.csv`, `ablation.csv`, `gas_latency.csv`, `results.md`. |
| **Phase 8** | Image Signal (MobileNetV2 + Platt Scaling) | ✅ Complete | Evaluated on Stanford Online Products (`Ebay_test.txt`): ROC-AUC = 0.9115, ECE reduced by 62.24%. Optional 4th signal with 7 tests. |

---

## 2. Environment & Network Configuration

- **OS / Platform:** Windows 10/11 64-bit, Python 3.11.9 (`backend/.venv`), Node.js 24.20.0, npm 11.19.0.
- **Blockchain:** Ganache CLI daemon on `http://127.0.0.1:7546` (`--port 7546 --deterministic --accounts 10 --networkId 1337`).
- **Contract Address:** `0xCfEB869F69431e42cdB54A4F4f105C19C080A601` (deployed on deterministic Ganache network ID 1337).
- **Database:** MySQL 9.x via `pymysql` and SQLAlchemy 2.0.30 (`anticounterfeit` and `anticounterfeit_test`).
  - User: `ac_user` (restricted privileges; MySQL root account is never used).
- **Backend API:** Uvicorn ASGI daemon on `http://127.0.0.1:8000`.
- **Frontend App:** Vite dev server daemon on `http://localhost:5173`.
- **Image Dataset:** `C:\Project-MF\Stanford_Online_Products` (configured via `SOP_ROOT` in `.env`).

---

## 3. Key Findings & Scientific Clarifications

1. **Resolution of Near-Perfect RF Performance (L-012):**
   - The initial simulation artifact where RandomForest achieved F1 = 1.000 was audited for feature leakage.
   - Leakage audit confirmed no label, attack type, or future scans are used in feature computation.
   - MDI feature importance revealed the root cause: synthetic sequence-length bias (`distinct_devices` accounts for 28.1% and `total_scans` accounts for 22.4% of importance), because attacks were simulated as extensions to completed genuine timelines.
   - Fully documented with ablation analysis in `docs/LIMITATIONS.md` (L-012).
2. **Fair Rule Baseline (`FairRuleBaseline`):**
   - Incorporates both velocity (> 900 km/h) and NFC counter freshness gaps (jump > 5 or non-monotonic counter).
   - Provides an honest, non-strawman comparison baseline.
3. **Generalization on Held-Out Attack G (`G_stealth_clone`):**
   - Held out completely during training across 5 random seeds to test out-of-distribution generalization.
4. **HACP5 Flaw vs Counter+CMAC Recovery:**
   - In 1,000 clone-first race trials × 5 seeds, HACP5 permanently locks out genuine customers (100.0% wrong-reject rate).
   - Our counter+CMAC design flags the skimmed tap as `DISPUTED` without hard lockout, allowing genuine tags to recover on the next tap (100.0% recovery rate).
5. **Phase 8 Image Signal Scope:**
   - Evaluated on Stanford Online Products test split: ROC-AUC = 0.9115 (0.9574 random impostors, 0.8656 hard negatives).
   - Platt scaling reduces Expected Calibration Error (ECE) from 0.1337 to 0.0505 (62.24% calibration improvement).
   - Strictly acts as an optional 4th layer signal catching gross product swaps and low-effort fakes; absent or ambiguous images are gracefully ignored.

---

## 4. Test Verification Summary

- **Backend Pytest:** 129 passed in 15.15s (`test_api.py`, `test_fusion.py`, `test_identity.py`, `test_image_signal.py`).
- **Smart Contracts:** 7 passed in Truffle (`ProductRegistry.test.js`).
- **End-to-End Live Check:** All 8 actions passed (`experiments/live_check.py`).
- **Total Passing Automated Tests:** 136 / 136 (100%).

---

## 5. What Remains for Real-World Field Deployment

While the software and cryptographic protocol prototype is 100% complete, a commercial physical deployment would require:
1. **Physical NFC Hardware:** Replacing software `EmulatedTag` with real physical NXP NTAG 424 DNA tags provisioned with AES keys.
2. **Hardware Security Module (HSM):** Moving the master AES key and HMAC secrets from `.env` to a cloud or on-premise HSM (e.g. AWS CloudHSM, YubiHSM).
3. **Public Blockchain Deployment:** Deploying `ProductRegistry.sol` to a production EVM network (e.g. Polygon, Arbitrum, or Ethereum L2) with real gas fee management and multisig owner keys.
4. **Interactive Browser Testing:** Clicking through physical camera QR scanning (`html5-qrcode`) and Android Web NFC (`window.NDEFReader`) on actual mobile hardware.