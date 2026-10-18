/**
 * experiments/measure_gas.js
 *
 * Truffle script: deploys ProductRegistry to the connected network,
 * calls every state-changing function, records gas used, and writes
 * experiments/results/gas.csv.
 *
 * Run from the /contracts directory:
 *   truffle exec ../experiments/measure_gas.js --network development
 *
 * Output: ../experiments/results/gas.csv
 */

const ProductRegistry = artifacts.require("ProductRegistry");
const fs   = require("fs");
const path = require("path");

module.exports = async function (callback) {
  try {
    const accounts  = await web3.eth.getAccounts();
    const owner     = accounts[0];
    const operator  = accounts[1];
    const mfrA      = accounts[2];

    console.log("Deploying ProductRegistry for gas measurement...");
    const registry = await ProductRegistry.new(operator, { from: owner });
    console.log(`Deployed at: ${registry.address}`);

    // ── Helper to measure gas ──────────────────────────────────────────────
    const rows = [["function", "gas_used", "description"]];

    async function measure(label, description, txPromise) {
      const tx = await txPromise;
      const gas = tx.receipt.gasUsed;
      console.log(`  ${label.padEnd(30)} gas: ${gas}`);
      rows.push([label, gas, description]);
      return tx;
    }

    // ── Calls ──────────────────────────────────────────────────────────────

    // 1. addManufacturer
    await measure(
      "addManufacturer",
      "Owner adds a manufacturer to the whitelist",
      registry.addManufacturer(mfrA, { from: owner })
    );

    // 2. registerProduct
    const prodId1    = web3.utils.keccak256("gas-test-product-1");
    const recordHash = web3.utils.keccak256("off-chain-record-hash-1");
    await measure(
      "registerProduct",
      "Whitelisted manufacturer registers a new product",
      registry.registerProduct(prodId1, recordHash, { from: mfrA })
    );

    // 3. markSold
    await measure(
      "markSold",
      "Operator marks the product as sold",
      registry.markSold(prodId1, { from: operator })
    );

    // 4. logScan – Verified (0)
    const scanHash = web3.utils.keccak256("scan-metadata-hash");
    await measure(
      "logScan(verdict=0 Verified)",
      "Operator logs a Verified verdict",
      registry.logScan(prodId1, scanHash, 0, { from: operator })
    );

    // 5. logScan – ManualReview (1)
    const scanHash2 = web3.utils.keccak256("scan-metadata-hash-2");
    await measure(
      "logScan(verdict=1 ManualReview)",
      "Operator logs a ManualReview verdict",
      registry.logScan(prodId1, scanHash2, 1, { from: operator })
    );

    // 6. logScan – Suspicious (2)
    const scanHash3 = web3.utils.keccak256("scan-metadata-hash-3");
    await measure(
      "logScan(verdict=2 Suspicious)",
      "Operator logs a Suspicious verdict",
      registry.logScan(prodId1, scanHash3, 2, { from: operator })
    );

    // 7. logScan – Unregistered (3) for a ghost product
    const ghostId   = web3.utils.keccak256("ghost-product-id");
    const scanHash4 = web3.utils.keccak256("scan-metadata-hash-4");
    await measure(
      "logScan(verdict=3 Unregistered)",
      "Operator logs an Unregistered verdict (product not on chain)",
      registry.logScan(ghostId, scanHash4, 3, { from: operator })
    );

    // 8. removeManufacturer
    await measure(
      "removeManufacturer",
      "Owner removes a manufacturer from the whitelist",
      registry.removeManufacturer(mfrA, { from: owner })
    );

    // 9. setOperator
    await measure(
      "setOperator",
      "Owner changes the backend operator account",
      registry.setOperator(accounts[3], { from: owner })
    );

    // ── Write CSV ──────────────────────────────────────────────────────────
    const resultsDir = path.join(__dirname, "results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const csvPath = path.join(resultsDir, "gas.csv");
    const csv = rows.map((r) => r.join(",")).join("\n");
    fs.writeFileSync(csvPath, csv, "utf8");

    console.log(`\nGas results written to: ${csvPath}`);
    console.log("\nSummary:");
    console.log("function,gas_used");
    rows.slice(1).forEach(([fn, gas]) => console.log(`  ${fn},${gas}`));

    callback();
  } catch (err) {
    console.error("Gas measurement failed:", err);
    callback(err);
  }
};
