/**
 * truffle-config.js
 *
 * Truffle configuration for anti-counterfeit-3layer.
 * Targets Ganache on port 7545 (matches both the GUI default and our CLI script).
 * Solidity compiler pinned to 0.8.20 for stability with Node 24 / Truffle 5.11.
 */

module.exports = {
  networks: {
    // Local Ganache – used for development and testing
    development: {
      host: "127.0.0.1",
      port: 7545,          // Ganache GUI default; our CLI script also uses 7545
      network_id: "*",     // Accept any network id
      gas: 6000000,        // Block gas limit headroom
    },
  },

  mocha: {
    // Increase timeout because Ganache can be slow on first startup
    timeout: 60000,
  },

  compilers: {
    solc: {
      version: "0.8.20",   // Pinned – see docs/VERSIONS.md
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,        // Optimise for repeated calls (verification is hot path)
        },
        evmVersion: "london",
      },
    },
  },
};
