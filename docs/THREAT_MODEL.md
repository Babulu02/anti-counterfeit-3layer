# Threat Model

This document outlines the threat landscape, attacker capabilities, protected assets, core assumptions, and out-of-scope attacks for the anti-counterfeit three-layer architecture (extending HACP5, CMC 2025).

---

## 1. System Overview & Security Objectives

The system provides end-to-end anti-counterfeiting verification across four interconnected layers:
1. **Layer 1a (Blockchain Registry):** Immutable on-chain registration of product identifiers, ownership status, and append-only audit trail (`logScan`).
2. **Layer 1b (Physical Identity):** Dual-channel verification combining static HMAC-signed QR codes and dynamic AES-128 CMAC rolling-counter NFC tags (emulating NTAG 424 DNA).
3. **Layer 2 (ML Scan-Risk Behavioral Engine):** Sequence-based anomaly detection evaluating spatio-temporal velocity, burst frequency, device entropy, and counter deltas.
4. **Layer 3 (Multi-Signal Fusion Engine):** Deterministic priority rules mapping multi-modal signals into actionable verdicts (`Verified`, `Manual review`, `Suspicious activity`, `Unregistered product`).
5. **Layer 4 (Optional Visual Image Signal):** MobileNetV2 embedding similarity comparing query photos against manufacturer reference embeddings.

**Primary Security Objectives:**
- Prevent counterfeit goods from successfully masquerading as authentic products.
- Ensure genuine buyers are **never permanently locked out** of their legitimate products (fixing the critical HACP5 clone-first flaw).
- Maintain consumer privacy by never publishing raw geographic coordinates or raw device identifiers on-chain.

---

## 2. Assets to Protect

| Asset | Sensitivity | Location | Protection Mechanism |
|-------|-------------|----------|----------------------|
| **Product Authenticity** | High | Smart Contract (`ProductRegistry.sol`) | Immutable bytes32 mapping `products[id]`, manufacturer signatures |
| **NFC Master Key** | Critical | Server `.env` / HSM | AES-128 per-tag key derivation `K_tag = KDF(K_master, UID)` |
| **QR HMAC Secret** | Critical | Server `.env` | SHA-256 HMAC signature verification |
| **Buyer Status / Ownership** | High | Smart Contract | `sold` boolean flag, `markSold()` restricted to authorized operator |
| **Consumer Geolocation Privacy** | High | MySQL (off-chain) | Geolocation hashed in `scanHash` before on-chain logging; never public |
| **Physical Reference Appearance** | Medium | MySQL (off-chain) | 1280-d MobileNetV2 feature embedding, SHA-256 image digest on-chain |

---

## 3. Adversary Profile & Capabilities

We consider adversaries ranging from casual counterfeiters to well-funded criminal syndicates:

1. **A1 — Naive Cloner:**
   - Possesses standard smartphones and high-resolution cameras.
   - Can photograph or scan genuine QR codes in retail displays and reprint them on identical physical packaging.
   - Cannot invert HMAC-SHA256 or forge arbitrary product IDs.

2. **A2 — Replay Attacker:**
   - Possesses standard NFC reader hardware or smartphone tap apps.
   - Can record an authentic NDEF tap payload `(UID, Counter, CMAC)` emitted by an authentic tag in a store.
   - Replays that exact recorded payload repeatedly on counterfeit packaging or via digital scan apps.
   - Cannot compute fresh CMAC signatures for higher counter values without the AES tag key.

3. **A3 — In-Transit Skimmer (Clone-First Race):**
   - Has temporary physical access to legitimate products during shipping or warehousing prior to final retail sale.
   - Skims an authentic tag to obtain a valid `(UID, Counter N, CMAC)` and transmits it to a distributed counterfeit syndicate before the real buyer scans.
   - Aims to cause confusion or lock out the authentic customer upon first retail scan.

4. **A4 — Distributed Relocation Syndicate:**
   - Deploys counterfeit goods carrying cloned labels across multiple distant cities or countries simultaneously.
   - Can coordinate multiple distinct physical devices to scan the same cloned identifier.

5. **A5 — Product Swapper (Visual Substitution):**
   - Procures legitimate packaging and authentic tags, but substitutes the enclosed product with a cheap fake or wrong item (e.g. coffee maker substituted for luxury watch).

---

## 4. Trust Assumptions

1. **Cryptographic Primitives:**
   - AES-128, HMAC-SHA256, and SHA-256 are secure against practical cryptanalysis; forging CMAC or HMAC without the key is computationally infeasible.
2. **Server & Secret Integrity:**
   - The manufacturer's private signing key and the server's `NFC_MASTER_KEY` / `IDENTITY_HMAC_SECRET` are not compromised.
   - The database server runs with least-privilege credentials (`ac_user`), prohibiting unauthorized SQL modification.
3. **Smart Contract Immutability:**
   - The EVM execution environment correctly enforces access controls (`onlyOwner`, `onlyOperator`, `onlyManufacturer`).
   - The underlying blockchain network is resistant to 51% transaction reorganizations.
4. **Physical Tag Freshness (NTAG 424 DNA):**
   - The physical silicon tag increments its internal hardware counter monotonically on each RF tap. The counter cannot decrement or be rewritten over NFC.

---

## 5. Explicitly Out-of-Scope Attacks

The following attack vectors are acknowledged as real-world threats but are outside the scope of this software/protocol research prototype:

1. **Silicon-Level Hardware Attacks (Side-Channel / Decapping):**
   - Invasive silicon decapping, Focused Ion Beam (FIB) probing, or Differential Power Analysis (DPA) against physical NTAG 424 DNA chips to extract the hardware AES key.
2. **Compromised Backend Root / Server Host Takeover:**
   - Direct physical or root shell compromise of the backend server hosting `.env` secrets.
3. **Blockchain 51% Reorganization Attacks:**
   - Majority hashpower or validator collusion attacks altering historical blocks on the underlying blockchain.
4. **Microscopic Packaging & Stitching Counterfeiting:**
   - High-end counterfeiters who fabricate identical physical goods matching reference appearance down to microscopic fabric weave, paint pigment, or chemical composition. (The optional Phase 8 image signal detects gross product swaps, not microscopic forensic replicas).

---

## 6. Multi-Layer Defense Matrix

| Attack Vector | Layer 1a (Chain) | Layer 1b (Identity) | Layer 2 (ML Scan-Risk) | Layer 3 (Fusion) | Layer 4 (Image Signal) | System Verdict |
|---------------|------------------|---------------------|------------------------|------------------|------------------------|----------------|
| **Random / Guessed ID** | Returns `exists=False` | N/A | N/A | Rule 1 Triggers | N/A | **Unregistered product** |
| **Static QR Clone** | Returns `exists=True` | Passes HMAC | Flags impossible travel / velocity > 900 km/h | Rule 3 / Rule 4 Triggers | N/A | **Suspicious activity** |
| **NFC Replay Attack** | Returns `exists=True` | Flags `Counter <= last_counter` | Flags duplicate counter anomaly | Rule 6 Triggers | N/A | **Manual review** |
| **NFC Key Guess / Bad CMAC** | Returns `exists=True` | Flags `bad_mac` | N/A | Rule 2 Triggers | N/A | **Suspicious activity** |
| **In-Transit Skim (Clone First)** | Returns `exists=True` | 1st tap accepted; 2nd tap `DISPUTED` | Flags device / location leap | Soft flag; genuine recovers on next tap | N/A | **Manual review (Zero permanent lockout)** |
| **Post-Sale Impossible Relocation** | Returns `sold=True` | Passes Identity | Flags velocity across continents | Rule 4 Triggers | N/A | **Suspicious activity** |
| **Visual Product Swap** | Returns `exists=True` | Passes Identity | May show normal timing | Rule 9 Triggers | Cosine similarity < 0.0401 | **Manual review** |
