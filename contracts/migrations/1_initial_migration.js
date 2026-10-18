// Standard Truffle "Migrations" contract deployment.
// This keeps track of which migrations have run so they don't run twice.
const Migrations = artifacts.require("Migrations");

module.exports = function (deployer) {
  deployer.deploy(Migrations);
};
