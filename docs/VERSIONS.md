# Pinned Versions

This file records the exact, verified versions used in the anti-counterfeit-3layer prototype.
Update it whenever a dependency is changed.

## Blockchain / Smart Contracts

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 24.20.0 | Verified (`node -v`). Ganache µWS falls back on Node 24 (harmless warning). |
| npm | 11.19.0 | |
| Truffle | 5.11.5 | Discontinued by Consensys. Pinned. Standard deployer scripts. |
| Ganache (CLI) | 7.9.1 | Deterministic mode on port 7546 (`--port 7546 --deterministic --accounts 10 --networkId 1337`). |
| Solidity compiler | 0.8.20 | Pinned in `truffle-config.js` (`solc-js`). |
| Web3.js (Truffle bundled) | 1.10.0 | Used by Truffle internals and contract migrations. |

### Truffle / Ganache Discontinuation Note
Truffle and Ganache were officially discontinued by Consensys in 2023.
They remain fully functional locally:
- Contract code is written in pure Solidity 0.8.20 without vendor extensions.
- Migration scripts use standard `deployer.deploy()` patterns.
- Tests use Mocha + Truffle artifacts.

## Backend (Phases 1–8)

| Tool / Library | Version | Role |
|----------------|---------|------|
| Python | 3.11.9 | Runtime environment |
| FastAPI | 0.111.0 | REST API framework |
| Uvicorn | 0.30.1 | ASGI web server (daemon on port 8000) |
| web3.py | 8.0.0 | Web3 RPC client interacting with Ganache |
| MySQL | 9.x | PyMySQL 1.1.1 + SQLAlchemy 2.0.30 (`anticounterfeit`, `anticounterfeit_test`) |
| Alembic | 1.13.2 | Schema migrations (`0001_initial_schema`, `0002_add_image_embedding`) |
| torch | 2.14.1+cpu | MobileNetV2 feature extraction for Phase 8 image signal |
| torchvision | 0.29.1+cpu | Pretrained ImageNet weights and image preprocessing transforms |
| scikit-learn | 1.4.2 | RandomForestClassifier, Platt scaling (LogisticRegression) |
| pandas | 2.2.2 | Data analysis and scan timeline feature engineering |
| numpy | 1.26.4 | Vector math and cosine similarity calculations |
| joblib | 1.4.2 | Model serialization (`rf_model.joblib`) |
| pytest | 7.4.4 | Automated test runner (129 unit & integration tests) |

## Frontend (Phase 6)

| Tool / Library | Version | Role |
|----------------|---------|------|
| React | 18.3.1 | UI library |
| React DOM | 18.3.1 | DOM renderer |
| Vite | 6.0.3 | Build tool and dev server (port 5173) |
| ethers.js | 6.13.4 | Ethereum wallet connection and contract calls |
| html5-qrcode | 2.3.8 | Camera-based QR code scanning |
| qrcode | 1.5.4 | Client-side QR generation |
| TailwindCSS | 3.4.16 | CSS styling |
| TypeScript | 5.7.2 | Type-safe frontend code |
