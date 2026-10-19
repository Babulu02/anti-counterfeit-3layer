# Anti-Counterfeiting Platform — Cloud Deployment Guide (Render + Vercel)

This guide walks through deploying the anti-counterfeit system to the cloud:
- **Backend API & Database**: [Render](https://render.com) (FastAPI + Managed PostgreSQL)
- **Frontend Web App**: [Vercel](https://vercel.com) (React 18 + Vite + TailwindCSS)
- **Blockchain Contract**: Polygon Amoy Testnet, Ethereum Sepolia, or an EVM testnet

---

## 1. Safety Check: Git Exclusion Verification

Before pushing to GitHub, `.gitignore` ensures that heavy local artifacts and datasets are never pushed:

| Directory / Pattern | Size Locally | Git Status | Reason Excluded |
|---|---|---|---|
| `backend/.venv/` | > 1.2 GB | **Ignored** | Virtual environment binaries; reconstructed by Render during build. |
| `data/product-images/` | Variable (> 500 MB) | **Ignored** | Raw dataset images; created automatically off-chain in production. |
| `data/*.csv` | Large | **Ignored** | Synthetic training raw data; metrics & models stay in `experiments/results/`. |
| `node_modules/` | > 300 MB | **Ignored** | Reconstructed by Vercel during build (`npm install`). |

The rest of the codebase (including ML weights `experiments/results/rf_model.joblib` [~3.7 MB], contract ABI `contracts/build/contracts/ProductRegistry.json`, and frontend source) is lightweight (< 15 MB total).

---

## 2. Deploying Backend on Render

### Option A: 1-Click Blueprint (Recommended)
This repository includes a `render.yaml` blueprint.
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository: `anti-counterfeit-3layer`.
4. Render will read `render.yaml` and provision:
   - A Web Service (`anti-counterfeit-api`)
   - A PostgreSQL Database (`anti-counterfeit-db`)
5. Click **Apply**.

### Option B: Manual Web Service Setup
If configuring manually:
1. **New Web Service** -> Connect repository.
2. Configure settings:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
3. Under **Environment Variables**, set:
   | Variable | Example / Description |
   |---|---|
   | `DATABASE_URL` | Render PostgreSQL internal connection URL |
   | `RPC_URL` | Public testnet RPC (e.g., `https://rpc-amoy.polygon.technology`) |
   | `CONTRACT_ADDRESS` | Address of deployed `ProductRegistry` smart contract |
   | `OPERATOR_PRIVATE_KEY` | Hex private key for oracle operator |
   | `OWNER_PRIVATE_KEY` | Hex private key for contract admin |
   | `MANUFACTURER_PRIVATE_KEY` | Hex private key for authorized manufacturer |
   | `IDENTITY_HMAC_SECRET` | 64-hex-character secret for QR HMAC-SHA256 |
   | `NFC_MASTER_KEY` | 32-hex-character AES key for NFC SUN CMAC |

> [!NOTE]
> Database tables (`products`, `tags`, `scans`) are automatically created on first startup via SQLAlchemy `Base.metadata.create_all`.

---

## 3. Deploying Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> **Project** -> Import your GitHub repository.
3. Configure the Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   ```env
   VITE_API_BASE_URL=https://<your-render-service>.onrender.com
   ```
5. Click **Deploy**.

> [!TIP]
> `frontend/vercel.json` already contains SPA route rewrites to handle client-side routing (`/admin`, `/manufacturer`, `/verify`, `/dashboard`, `/consumer`) without 404 errors on page refresh.

---

## 4. Smart Contract Deployment (Testnet)

To deploy `ProductRegistry.sol` to a public testnet:
1. Fund a test wallet with testnet tokens (e.g. Polygon Amoy MATIC or Sepolia ETH).
2. Configure `contracts/truffle-config.js` with your RPC URL and private key or deploy via Remix:
   - Copy `contracts/contracts/ProductRegistry.sol` to [Remix IDE](https://remix.ethereum.org).
   - Compile with Solidity `^0.8.20`.
   - Deploy via **Injected Provider - MetaMask**.
3. Copy the deployed contract address and set it in:
   - Render environment variable: `CONTRACT_ADDRESS`
   - Testnet accounts can be whitelisted using the `/admin` UI in the frontend.

---

## 5. Pushing to GitHub

To commit all latest features, UI enhancements, and deployment configuration, run:

```bash
# 1. Stage all tracked and new safe files
git add .

# 2. Confirm .venv and product-images are NOT staged
git status

# 3. Commit
git commit -m "feat(deploy): configure Render and Vercel cloud deployment"

# 4. Push to your repository
git push origin main
```
