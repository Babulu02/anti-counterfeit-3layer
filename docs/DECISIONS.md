# Design Decisions

This file records non-obvious design choices and the reasons for them.
Add a new entry whenever a significant decision is made.

---

## D-001  No strings stored on-chain

**Decision:** All on-chain data uses `bytes32` hashes. Product names, descriptions, images,
and QR/NFC payloads live in the off-chain MySQL database.

**Reason:** String storage in Solidity is expensive (each character costs gas) and exposes
product details publicly on the blockchain. Storing only hashes gives us integrity guarantees
without cost or privacy downsides. The backend can still prove a record matches the chain by
recomputing the hash.

---

## D-002  Separate `owner` and `operator` roles

**Decision:** The contract has two privileged accounts: `owner` (manages whitelists) and
`operator` (calls `logScan` and `markSold`). The backend uses the operator key, never the owner key.

**Reason:** Least-privilege principle. If the backend is compromised, the attacker cannot
add new manufacturers or change the operator. The owner key can be kept in cold storage.

---

## D-003  Truffle + Ganache despite discontinuation

**Decision:** We use Truffle 5.11.5 and Ganache 7.9.1 because they are already installed and
familiar. All contract code is Hardhat-portable.

**Reason:** The project spec explicitly mentions Truffle/Ganache and notes they are discontinued.
See VERSIONS.md for migration notes if a breaking incompatibility appears.

---

## D-004  `logScan` accepts any `productId` (including unregistered ones)

**Decision:** The `logScan` function does NOT require the product to exist on-chain.

**Reason:** Unregistered scans (verdict 3) still need an audit trail. Rejecting the call
for unknown products would mean the backend cannot log that someone tried to scan a fake ID.

---

## D-005  NFC is emulated in software

**Decision:** The NFC layer (Phase 2) is a software emulation of NTAG 424 DNA behavior using
AES-CMAC and a rolling counter. No actual NFC hardware is used.

**Reason:** This is an academic prototype. The cryptographic logic (per-tag key derivation,
counter-based freshness, CMAC verification) is real and identical to what a physical tag would
produce. The emulation is clearly labelled in all code and docs.

---

## D-006  Static QR codes are intentionally clonable (baseline)

**Decision:** Layer 1 QR codes are static URL+HMAC payloads — they cannot defend against
physical cloning by themselves.

**Reason:** This is by design. The QR is the "naive baseline" that the ML and NFC layers
improve upon. The attack matrix in Phase 7 demonstrates this gap explicitly.

---

## D-007  Location data is hashed before going on-chain

**Decision:** The `scanHash` logged via `logScan` is a hash of `(productId, channel, deviceHash,
lat, lon, timestamp)` computed by the backend. Raw coordinates never touch the chain.

**Reason:** Public blockchains are permanent. Storing raw geolocation would create an irrevocable
privacy record. See LIMITATIONS.md for further discussion.

---

## D-008  ML split by product_id, not by row

**Decision:** Train/val/test sets are split on unique `product_id` values, not individual scan rows.

**Reason:** Splitting by row would leak future scans of the same product into training data,
producing optimistic metrics that do not reflect real deployment. Splitting by product ensures
the model has never seen any scan of a test product.
