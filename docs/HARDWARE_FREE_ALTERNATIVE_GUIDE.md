# Zero-Hardware Guide: Running and Demonstrating the Anti-Counterfeiting Platform Without Physical Devices

This guide explains:
1. **What physical hardware components were used in the base paper** (*Subramaniam et al., 2025*).
2. **How to run, demonstrate, and deploy this entire system completely in software**, without buying, programming, or using any physical hardware tags or readers.

---

## 1. What Physical Components Did the Base Paper Use?

In the base paper (*"A Holistic Anti-Counterfeiting Platform Using NFC and Blockchain Technologies"*), the authors relied on three mandatory hardware components:

```
[ Factory Worker ] ──> [ Physical Android NFC Writer Device ] ──> [ Physical Adhesive NFC Tag ]
                                                                             │ (Stuck to bottle/box)
                                                                             ▼
[ Consumer ]       ──> [ Smartphone with Hardware NFC Sensor ] ──> Reads & Rewrites Chip
```

1. **Physical NFC Tags / Microchips (Sections 5.2, 5.3 & Fig. 10)**:
   * Adhesive NFC stickers/inlays physically attached to individual product boxes or medicine containers.
2. **Dedicated Mobile NFC Writer / Hardware Encoder (Section 5.3 & Fig. 10)**:
   * A factory smartphone or dedicated handheld RFID/NFC reader/writer hardware device used by manufacturers to tap and physically write NDEF records to each chip one by one.
3. **Consumer Smartphones with Hardware NFC Sensors (Section 5.4 & Fig. 12)**:
   * Consumers had to carry a smartphone containing an active physical NFC transceiver (e.g. NXP or Broadcom RF controller) to interact with the stickers at the point of sale.

---

## 2. "I Don't Want to Use Hardware. What Can I Do?"

**You do NOT need any hardware.** 

Our platform (`anti-counterfeit-3layer`) was intentionally designed with **software-native channels and digital emulators** so that every single layer of the anti-counterfeit stack can be tested and demonstrated from a laptop browser.

### The 4 Zero-Hardware Equivalents

| Base Paper Hardware | Our Zero-Hardware Equivalent | Where It Lives in the Project |
|---|---|---|
| **Physical Adhesive NFC Tag** | **Dual-Channel Cryptographic QR Code** + **Software NFC Payload** | [`backend/identity/qr_identity.py`](file:///c:/Blockchain/anti-counterfeit-3layer/backend/identity/qr_identity.py) & [`backend/identity/nfc_ntag.py`](file:///c:/Blockchain/anti-counterfeit-3layer/backend/identity/nfc_ntag.py) |
| **Physical Handheld NFC Writer** | **1-Click Web Minting & Key Generator** | [`frontend/src/pages/ManufacturerPage.tsx`](file:///c:/Blockchain/anti-counterfeit-3layer/frontend/src/pages/ManufacturerPage.tsx) |
| **Consumer NFC Hardware Sensor** | **Software NFC Tap Simulator & Camera QR Scanner** | [`frontend/src/pages/VerifyPage.tsx`](file:///c:/Blockchain/anti-counterfeit-3layer/frontend/src/pages/VerifyPage.tsx) |
| **Physical Laboratory Packaging** | **Digital Image Embeddings (MobileNetV2)** | [`ml/image_signal/embedder.py`](file:///c:/Blockchain/anti-counterfeit-3layer/ml/image_signal/embedder.py) |

---

## 3. How to Use the Software Alternatives

### Solution 1: Cryptographic QR Code Channel (100% Software)
Instead of relying strictly on an NFC chip, our system issues a cryptographically signed QR code alongside the product:

1. When a product is registered, the backend computes an **HMAC-SHA256 signature** over the product ID, serial, and creation timestamp:
   $$\text{Payload} = \text{product\_id} \mathbin{\Vert} \text{serial} \mathbin{\Vert} \text{timestamp} \mathbin{\Vert} \text{HMAC-SHA256}$$
2. The QR code displays directly on your screen.
3. **To verify without hardware**:
   * Open [`/verify`](file:///c:/Blockchain/anti-counterfeit-3layer/frontend/src/pages/VerifyPage.tsx).
   * Click the **QR Code** tab.
   * Either scan the QR code displayed on screen with your laptop/phone camera or click **"Upload QR Image"** to upload the `.png`.
   * The backend validates the signature against the server's private HMAC secret. If an attacker tampers with even 1 character, verification fails.

---

### Solution 2: Built-in Software NFC Emulator (`EmulatedTag`)
To test and demonstrate the dynamic NFC counter ($C \leftarrow C + 1$) and AES-128 CMAC without real NTAG 424 chips, our backend includes an **exact software emulator of the NTAG 424 DNA chip** ([`backend/identity/nfc_ntag.py`](file:///c:/Blockchain/anti-counterfeit-3layer/backend/identity/nfc_ntag.py)):

1. Upon product registration, the system creates an initial NFC payload:
   ```json
   {
     "uid": "04A1B2C3D4E5F6",
     "counter": 1,
     "cmac": "A3F8B12C4D9E5678"
   }
   ```
2. On the **Verification Page ([`/verify`](file:///c:/Blockchain/anti-counterfeit-3layer/frontend/src/pages/VerifyPage.tsx))**:
   * Switch to the **NFC Tap** tab.
   * You will see the **"Simulate NFC Tap"** interface.
   * **To demonstrate a genuine tap**: Click **"Simulate Tap"** (counter advances $1 \to 2$). The CMAC is verified, and the system outputs **Verified (Green)**.
   * **To demonstrate an NFC Replay Attack**: Resend the same counter value ($C=2$). The backend immediately catches the duplicate counter and triggers **Manual Review / Replay Detected (Rule 6)**.

---

### Solution 3: Digital Product Photos (Vision Layer)
You do not need physical packaging with microscopic anti-counterfeit watermarks:
1. During product registration in [`ManufacturerPage.tsx`](file:///c:/Blockchain/anti-counterfeit-3layer/frontend/src/pages/ManufacturerPage.tsx), simply upload any `.jpg` or `.png` from your laptop.
2. The backend extracts a 1280-dimensional feature vector using MobileNetV2 and registers its hash on-chain.
3. During verification:
   * Upload the same image $\to$ High cosine similarity ($s > 0.51$) $\implies$ Genuine.
   * Upload an image of a different object/fake $\to$ Low cosine similarity ($s < 0.24$) $\implies$ Counterfeit detected.

---

### Solution 4: Virtual EVM Blockchain
You do not need dedicated hardware blockchain nodes:
* **Local Development**: Run `ganache --port 7546 --deterministic` (an in-memory virtual Ethereum node running on your machine).
* **Cloud Deployment**: Connect to a free public testnet such as **Polygon Amoy** (`https://rpc-amoy.polygon.technology`) using free faucet tokens.

---

## 4. Complete Step-by-Step Hardware-Free Demo Script

Follow this script to demonstrate the entire 3-layer system without touching any hardware:

### Step 1: Register an Asset (Manufacturer Portal)
1. Navigate to `http://localhost:5173/manufacturer` (or your deployed Vercel URL).
2. Connect MetaMask (using Ganache or Polygon Amoy).
3. Enter Product Name (e.g., `Luxury Watch`), Brand (e.g., `Stark Chrono`), and Serial Number (e.g., `STK-2026-001`).
4. Select any image file from your computer.
5. Click **"Register Product On-Chain"**.
   * *What happens*: The smart contract writes the `recordHash` to the blockchain. A cryptographic QR code and an initial NFC payload are generated on screen.

### Step 2: Test Genuine Verification
1. Navigate to `http://localhost:5173/verify`.
2. Under the **QR Tab**, upload the downloaded QR image (or scan it).
3. Under the **NFC Tab**, click **"Simulate NFC Tap"**.
4. Upload the matching product image.
5. Click **"Verify Asset"**.
   * *Result*: **VERIFIED (Green)** — All 3 layers (Identity valid, Image matched, ML risk 0.00) pass Rule 10.

### Step 3: Test a Replay Attack (Duplicate NFC Tap)
1. On the same product, click **"Simulate NFC Tap"** again without incrementing the counter (counter remains 1).
2. Click **"Verify Asset"**.
   * *Result*: **MANUAL REVIEW (Amber)** — Rule 6 flags the reused counter.

### Step 4: Test a Packaging Counterfeit Attack
1. Provide the valid QR code, but upload an image of a different item (e.g. a shoe instead of a watch).
2. Click **"Verify Asset"**.
   * *Result*: **MANUAL REVIEW (Amber)** — Rule 9 flags the physical image mismatch ($s < 0.2402$).

### Step 5: Test Post-Sale Fraud
1. Mark the product as **Sold** in the database/contract.
2. Attempt to scan the item again.
   * *Result*: **MANUAL REVIEW (Amber)** — Rule 8 flags that the product has already been sold at retail POS.

### Step 6: Inspect Analytics
1. Navigate to `http://localhost:5173/dashboard`.
2. View real-time scan logs, anomaly distributions, and fraud alerts reflected on interactive charts.

---

## 5. Conclusion

By using **HMAC-SHA256 QR codes**, **Software NFC Emulation**, **Digital Image Embeddings**, and **EVM Smart Contracts**, you can execute and demonstrate the entire platform with **zero hardware costs and zero physical equipment**.
