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

---

## D-009  MySQL with PyMySQL and least-privilege credentials

**Decision:** The application runs exclusively against MySQL 9.x via `pymysql` and SQLAlchemy 2.0,
using a dedicated restricted user `ac_user` with access only to `anticounterfeit` and `anticounterfeit_test`.
The root account is never used.

**Reason:** Prevents accidental privilege escalation, protects system tables, and enforces production database
security hygiene in development.

---

## D-010  Fair rule baseline incorporates NFC counter freshness gap

**Decision:** The rule baseline (`FairRuleBaseline`) checks both impossible travel velocity (> 900 km/h) and
NFC counter delta gaps (counter jump > 5 or non-monotonic counter).

**Reason:** Comparing an ML model against a strawman rule baseline that ignores the primary NFC security
mechanism is scientifically dishonest. The fair baseline demonstrates the exact marginal value added by machine learning.

---

## D-011  Held-out attack variant (G_stealth_clone) for generalization testing

**Decision:** Attack variant `G_stealth_clone` (slow clone matching plausible travel timing and counter pacing)
is held out completely from the training set and evaluated only on test products.

**Reason:** Tests whether ML models can detect novel or adaptive attack vectors rather than merely memorizing
the generative distribution seen during training.

---

## D-012  MobileNetV2 image embedding as an optional fourth fusion signal

**Decision:** Visual verification uses MobileNetV2 pretrained on ImageNet (1280-d unit-length embeddings)
with cosine similarity and Platt scaling. The image signal is strictly optional: if no photo is submitted
or if the score falls into the abstain band, the signal is completely ignored.

**Reason:** Mobile devices frequently encounter adverse lighting, camera glare, or missing image uploads.
Making the image signal optional prevents camera/lighting variability from causing false rejections of valid products.
When a photo is provided and scores below the counterfeit threshold, it acts as a visual safety net catching gross
product swaps.

---

## D-013  Binary blob storage for image feature vectors

**Decision:** High-dimensional image embeddings (1280 float32 values) are stored in MySQL as binary blobs
(`np.ndarray.tobytes()`), unpacked at verification time via `np.frombuffer`.

**Reason:** Binary representation takes exactly 5,120 bytes per product (compared to > 15 KB for JSON floats)
and avoids serialization/parsing overhead.

