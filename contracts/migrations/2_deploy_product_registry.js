/**
 * 2_deploy_product_registry.js
 *
 * Deploys ProductRegistry to the configured network.
 *
 * The constructor requires an `operator` address.
 * During development we use accounts[1] as the operator so accounts[0]
 * (the owner/deployer) stays separate.
 *
 * After deployment, copy the contract address into your .env file:
 *   CONTRACT_ADDRESS=<address printed below>
 */
const ProductRegistry = artifacts.require("ProductRegistry");

module.exports = async function (deployer, network, accounts) {
  // accounts[0] = owner (deployer)
  // accounts[1] = operator (backend account)
  const operator = accounts[1];

  console.log(`\nDeploying ProductRegistry`);
  console.log(`  Network  : ${network}`);
  console.log(`  Owner    : ${accounts[0]}`);
  console.log(`  Operator : ${operator}\n`);

  await deployer.deploy(ProductRegistry, operator);

  const instance = await ProductRegistry.deployed();
  console.log(`\nProductRegistry deployed at: ${instance.address}`);
  console.log(`Add this to your .env:  CONTRACT_ADDRESS=${instance.address}\n`);
};
