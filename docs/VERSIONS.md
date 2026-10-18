# Pinned Versions

This file records the exact versions used in the anti-counterfeit-3layer prototype.
Update it whenever a dependency is changed.

## Blockchain / Smart Contracts

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 24.20.0 | Installed on dev machine. Ganache µWS falls back on Node 24 (harmless warning). |
| npm | 11.19.0 | |
| Truffle | 5.11.5 | Discontinued by Truffle / Consensys. Pinned. See DECISIONS.md. |
| Ganache (CLI) | 7.9.1 | Installed globally via `npm install -g ganache@7.9.1`. Port 7545. |
| Solidity compiler | 0.8.20 | Pinned in truffle-config.js. Compatible with Truffle 5.11.x solc-js. |
| Web3.js (Truffle bundled) | 1.10.0 | Used by Truffle internals and test helpers. |

### Truffle / Ganache Discontinuation Note
Truffle and Ganache were officially discontinued by Consensys in 2023.
They still work but receive no new updates.
- Contract code is written to be portable to Hardhat (no Truffle-specific Solidity).
- Migration scripts use only standard `deployer.deploy()` — portable pattern.
- Tests use plain Mocha + `artifacts.require` — can be ported to `ethers.js` + Hardhat.
- If Truffle fails due to Node compatibility, switch with: `npm install --save-dev hardhat`
  and create a `hardhat.config.js` pointing at the same Ganache port.

## Backend (Phase 3)

| Tool | Version |
|------|---------|
| Python | 3.11.9 |
| FastAPI | 0.111.0 |
| web3.py | 8.0.0 |
| MySQL | 9.x via PyMySQL 1.1.1 + SQLAlchemy 2.0.30 |
| Alembic | 1.13.2 |
| scikit-learn | 1.4.2 |
| pandas | 2.2.2 |
| numpy | 1.26.4 |
| joblib | 1.4.2 |
| pytest | 7.4.4 |

## Frontend (Phase 6)

| Tool | Version |
|------|---------|
| React | 18.x |
| Vite | 5.x |
| ethers.js | 6.x |
| html5-qrcode | 2.x |
| qrcode | 1.x |

_Versions will be pinned in package.json when frontend is scaffolded._
