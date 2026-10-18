/**
 * ProductRegistry.test.js
 *
 * Truffle/Mocha tests for ProductRegistry.sol.
 *
 * Accounts used:
 *   accounts[0] = owner (deployer)
 *   accounts[1] = operator (backend)
 *   accounts[2] = manufacturer A (whitelisted)
 *   accounts[3] = manufacturer B (whitelisted)
 *   accounts[4] = random outsider (never whitelisted)
 *
 * Test groups:
 *   1. Deployment sanity
 *   2. Manufacturer whitelist management
 *   3. registerProduct – normal use
 *   4. registerProduct – duplicate rejection
 *   5. registerProduct – unauthorized access
 *   6. getProduct – unknown product
 *   7. markSold – normal use and double-sell
 *   8. logScan – operator calls
 *   9. logScan – unauthorized access
 *  10. setOperator
 */

const ProductRegistry = artifacts.require("ProductRegistry");

// Helper: expect a transaction to revert with a specific message substring.
async function expectRevert(promise, msgSubstring) {
  try {
    await promise;
    throw new Error("Expected transaction to revert but it did not");
  } catch (err) {
    // Truffle wraps revert reasons differently across versions.
    const message = err.message || "";
    if (!message.includes("revert") && !message.includes(msgSubstring)) {
      throw new Error(
        `Expected revert containing "${msgSubstring}" but got: ${message}`
      );
    }
    // If the error mentions revert OR our expected substring, it's fine.
    assert.ok(
      message.includes(msgSubstring) || message.includes("revert"),
      `Expected "${msgSubstring}" in error message, got: ${message}`
    );
  }
}

// Convenience: a non-zero bytes32 hash
const HASH_A = web3.utils.keccak256("product-details-a");
const HASH_B = web3.utils.keccak256("product-details-b");
const PROD_ID_1 = web3.utils.keccak256("product-uuid-1");
const PROD_ID_2 = web3.utils.keccak256("product-uuid-2");
const SCAN_HASH = web3.utils.keccak256("scan-metadata");

contract("ProductRegistry", (accounts) => {
  const [owner, operator, mfrA, mfrB, outsider] = accounts;

  let registry;

  // Deploy a fresh contract before every test to avoid state bleed.
  beforeEach(async () => {
    registry = await ProductRegistry.new(operator, { from: owner });
  });

  // ─── 1. Deployment sanity ──────────────────────────────────────────────────
  describe("1. Deployment", () => {
    it("sets owner to deployer", async () => {
      const actual = await registry.owner();
      assert.equal(actual, owner, "owner should be deployer");
    });

    it("sets operator to constructor argument", async () => {
      const actual = await registry.operator();
      assert.equal(actual, operator, "operator should match constructor arg");
    });

    it("deployer is not automatically a manufacturer", async () => {
      const yes = await registry.isManufacturer(owner);
      assert.isFalse(yes, "owner should not be auto-whitelisted as manufacturer");
    });
  });

  // ─── 2. Manufacturer whitelist ────────────────────────────────────────────
  describe("2. Manufacturer whitelist", () => {
    it("owner can add a manufacturer", async () => {
      await registry.addManufacturer(mfrA, { from: owner });
      const yes = await registry.isManufacturer(mfrA);
      assert.isTrue(yes, "mfrA should be whitelisted after addManufacturer");
    });

    it("emits ManufacturerAdded event", async () => {
      const tx = await registry.addManufacturer(mfrA, { from: owner });
      const evt = tx.logs.find((l) => l.event === "ManufacturerAdded");
      assert.ok(evt, "ManufacturerAdded event missing");
      assert.equal(evt.args.manufacturer.toLowerCase(), mfrA.toLowerCase());
    });

    it("owner can remove a manufacturer", async () => {
      await registry.addManufacturer(mfrA, { from: owner });
      await registry.removeManufacturer(mfrA, { from: owner });
      const yes = await registry.isManufacturer(mfrA);
      assert.isFalse(yes, "mfrA should be removed");
    });

    it("outsider cannot add a manufacturer", async () => {
      await expectRevert(
        registry.addManufacturer(mfrA, { from: outsider }),
        "not owner"
      );
    });

    it("cannot add zero address", async () => {
      await expectRevert(
        registry.addManufacturer("0x0000000000000000000000000000000000000000", { from: owner }),
        "zero address"
      );
    });

    it("cannot add an already-whitelisted manufacturer", async () => {
      await registry.addManufacturer(mfrA, { from: owner });
      await expectRevert(
        registry.addManufacturer(mfrA, { from: owner }),
        "already whitelisted"
      );
    });

    it("cannot remove a non-whitelisted address", async () => {
      await expectRevert(
        registry.removeManufacturer(mfrA, { from: owner }),
        "not whitelisted"
      );
    });
  });

  // ─── 3. registerProduct – normal use ──────────────────────────────────────
  describe("3. registerProduct – normal use", () => {
    beforeEach(async () => {
      await registry.addManufacturer(mfrA, { from: owner });
    });

    it("whitelisted manufacturer can register a product", async () => {
      await registry.registerProduct(PROD_ID_1, HASH_A, { from: mfrA });
      const p = await registry.getProduct(PROD_ID_1);
      assert.isTrue(p.exists, "product should exist after registration");
    });

    it("stores recordHash correctly", async () => {
      await registry.registerProduct(PROD_ID_1, HASH_A, { from: mfrA });
      const p = await registry.getProduct(PROD_ID_1);
      assert.equal(p.recordHash, HASH_A);
    });

    it("stores manufacturer address correctly", async () => {
      await registry.registerProduct(PROD_ID_1, HASH_A, { from: mfrA });
      const p = await registry.getProduct(PROD_ID_1);
      assert.equal(p.manufacturer.toLowerCase(), mfrA.toLowerCase());
    });

    it("sold flag is false after registration", async () => {
      await registry.registerProduct(PROD_ID_1, HASH_A, { from: mfrA });
      const p = await registry.getProduct(PROD_ID_1);
      assert.isFalse(p.sold);
    });

    it("emits ProductRegistered event with correct args", async () => {
      const tx = await registry.registerProduct(PROD_ID_1, HASH_A, { from: mfrA });
      const evt = tx.logs.find((l) => l.event === "ProductRegistered");
      assert.ok(evt, "ProductRegistered event missing");
      assert.equal(evt.args.productId,   PROD_ID_1);
      assert.equal(evt.args.recordHash,  HASH_A);
      assert.equal(evt.args.manufacturer.toLowerCase(), mfrA.toLowerCase());
    });

    it("multiple manufacturers can register different products", async () => {
      await registry.addManufacturer(mfrB, { from: owner });
      await registry.registerProduct(PROD_ID_1, HASH_A, { from: mfrA });
      await registry.registerProduct(PROD_ID_2, HASH_B, { from: mfrB });
      const p1 = await registry.getProduct(PROD_ID_1);
      const p2 = await registry.getProduct(PROD_ID_2);
      assert.isTrue(p1.exists);
      assert.isTrue(p2.exists);
    });
  });

  // ─── 4. registerProduct – duplicates ──────────────────────────────────────
  describe("4. registerProduct – duplicate rejection", () => {
    beforeEach(async () => {
      await registry.addManufacturer(mfrA, { from: owner });
      await registry.registerProduct(PROD_ID_1, HASH_A, { from: mfrA });
    });

    it("rejects a second registration of the same productId", async () => {
      await expectRevert(
        registry.registerProduct(PROD_ID_1, HASH_B, { from: mfrA }),
        "already registered"
      );
    });

    it("rejects zero productId", async () => {
      await expectRevert(
        registry.registerProduct(
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          HASH_A,
          { from: mfrA }
        ),
        "productId cannot be zero"
      );
    });

    it("rejects zero recordHash", async () => {
      await expectRevert(
        registry.registerProduct(
          PROD_ID_2,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          { from: mfrA }
        ),
        "recordHash cannot be zero"
      );
    });
  });

  // ─── 5. registerProduct – unauthorized ────────────────────────────────────
  describe("5. registerProduct – unauthorized access", () => {
    it("outsider (not whitelisted) cannot register", async () => {
      await expectRevert(
        registry.registerProduct(PROD_ID_1, HASH_A, { from: outsider }),
        "not a whitelisted manufacturer"
      );
    });

    it("owner (not whitelisted as mfr) cannot register directly", async () => {
      await expectRevert(
        registry.registerProduct(PROD_ID_1, HASH_A, { from: owner }),
        "not a whitelisted manufacturer"
      );
    });

    it("operator cannot register products", async () => {
      await expectRevert(
        registry.registerProduct(PROD_ID_1, HASH_A, { from: operator }),
        "not a whitelisted manufacturer"
      );
    });
  });

  // ─── 6. getProduct – unknown product ──────────────────────────────────────
  describe("6. getProduct – unknown product", () => {
    it("returns exists=false for an unregistered productId", async () => {
      const unknownId = web3.utils.keccak256("totally-unknown-product");
      const p = await registry.getProduct(unknownId);
      assert.isFalse(p.exists, "exists should be false for unknown product");
    });

    it("returns zero values for unregistered product", async () => {
      const unknownId = web3.utils.keccak256("another-unknown");
      const p = await registry.getProduct(unknownId);
      assert.equal(
        p.recordHash,
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
      assert.equal(p.manufacturer, "0x0000000000000000000000000000000000000000");
    });
  });

  // ─── 7. markSold ──────────────────────────────────────────────────────────
  describe("7. markSold", () => {
    beforeEach(async () => {
      await registry.addManufacturer(mfrA, { from: owner });
      await registry.registerProduct(PROD_ID_1, HASH_A, { from: mfrA });
    });

    it("operator can mark a product as sold", async () => {
      await registry.markSold(PROD_ID_1, { from: operator });
      const p = await registry.getProduct(PROD_ID_1);
      assert.isTrue(p.sold, "product should be marked sold");
    });

    it("emits ProductSold event", async () => {
      const tx = await registry.markSold(PROD_ID_1, { from: operator });
      const evt = tx.logs.find((l) => l.event === "ProductSold");
      assert.ok(evt, "ProductSold event missing");
      assert.equal(evt.args.productId, PROD_ID_1);
    });

    it("cannot mark an already-sold product as sold again", async () => {
      await registry.markSold(PROD_ID_1, { from: operator });
      await expectRevert(
        registry.markSold(PROD_ID_1, { from: operator }),
        "already sold"
      );
    });

    it("cannot mark an unregistered product as sold", async () => {
      const unknownId = web3.utils.keccak256("not-registered");
      await expectRevert(
        registry.markSold(unknownId, { from: operator }),
        "product not found"
      );
    });

    it("outsider cannot mark as sold", async () => {
      await expectRevert(
        registry.markSold(PROD_ID_1, { from: outsider }),
        "not the operator"
      );
    });

    it("manufacturer cannot mark as sold (only operator can)", async () => {
      await expectRevert(
        registry.markSold(PROD_ID_1, { from: mfrA }),
        "not the operator"
      );
    });
  });

  // ─── 8. logScan – operator calls ──────────────────────────────────────────
  describe("8. logScan – valid calls", () => {
    beforeEach(async () => {
      await registry.addManufacturer(mfrA, { from: owner });
      await registry.registerProduct(PROD_ID_1, HASH_A, { from: mfrA });
    });

    it("operator can log verdict 0 (Verified)", async () => {
      const tx = await registry.logScan(PROD_ID_1, SCAN_HASH, 0, { from: operator });
      const evt = tx.logs.find((l) => l.event === "ScanLogged");
      assert.ok(evt);
      assert.equal(evt.args.verdict.toString(), "0");
    });

    it("operator can log verdict 1 (ManualReview)", async () => {
      const tx = await registry.logScan(PROD_ID_1, SCAN_HASH, 1, { from: operator });
      const evt = tx.logs.find((l) => l.event === "ScanLogged");
      assert.equal(evt.args.verdict.toString(), "1");
    });

    it("operator can log verdict 2 (Suspicious)", async () => {
      const tx = await registry.logScan(PROD_ID_1, SCAN_HASH, 2, { from: operator });
      const evt = tx.logs.find((l) => l.event === "ScanLogged");
      assert.equal(evt.args.verdict.toString(), "2");
    });

    it("operator can log verdict 3 (Unregistered) – product need not exist on-chain", async () => {
      const unknownId = web3.utils.keccak256("ghost-product");
      const tx = await registry.logScan(unknownId, SCAN_HASH, 3, { from: operator });
      const evt = tx.logs.find((l) => l.event === "ScanLogged");
      assert.equal(evt.args.verdict.toString(), "3");
    });

    it("rejects invalid verdict code (4)", async () => {
      await expectRevert(
        registry.logScan(PROD_ID_1, SCAN_HASH, 4, { from: operator }),
        "invalid verdict code"
      );
    });

    it("rejects zero scanHash", async () => {
      await expectRevert(
        registry.logScan(
          PROD_ID_1,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          0,
          { from: operator }
        ),
        "scanHash cannot be zero"
      );
    });

    it("ScanLogged event contains correct productId and scanHash", async () => {
      const tx = await registry.logScan(PROD_ID_1, SCAN_HASH, 0, { from: operator });
      const evt = tx.logs.find((l) => l.event === "ScanLogged");
      assert.equal(evt.args.productId, PROD_ID_1);
      assert.equal(evt.args.scanHash,  SCAN_HASH);
    });
  });

  // ─── 9. logScan – unauthorized ────────────────────────────────────────────
  describe("9. logScan – unauthorized access", () => {
    it("outsider cannot call logScan", async () => {
      await expectRevert(
        registry.logScan(PROD_ID_1, SCAN_HASH, 0, { from: outsider }),
        "not the operator"
      );
    });

    it("manufacturer cannot call logScan", async () => {
      await registry.addManufacturer(mfrA, { from: owner });
      await expectRevert(
        registry.logScan(PROD_ID_1, SCAN_HASH, 0, { from: mfrA }),
        "not the operator"
      );
    });

    it("owner cannot call logScan", async () => {
      await expectRevert(
        registry.logScan(PROD_ID_1, SCAN_HASH, 0, { from: owner }),
        "not the operator"
      );
    });
  });

  // ─── 10. setOperator ──────────────────────────────────────────────────────
  describe("10. setOperator", () => {
    it("owner can change the operator", async () => {
      await registry.setOperator(mfrB, { from: owner });
      const actual = await registry.operator();
      assert.equal(actual.toLowerCase(), mfrB.toLowerCase());
    });

    it("emits OperatorChanged event", async () => {
      const tx = await registry.setOperator(mfrB, { from: owner });
      const evt = tx.logs.find((l) => l.event === "OperatorChanged");
      assert.ok(evt);
      assert.equal(evt.args.newOperator.toLowerCase(), mfrB.toLowerCase());
    });

    it("outsider cannot change operator", async () => {
      await expectRevert(
        registry.setOperator(mfrB, { from: outsider }),
        "not owner"
      );
    });
  });
});
