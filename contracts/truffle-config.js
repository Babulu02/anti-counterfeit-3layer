/**
 * truffle-config.js
 *
 * Truffle configuration for anti-counterfeit-3layer.
 * Targets Ganache on port 7545 (matches both the GUI default and our CLI script).
 * Solidity compiler pinned to 0.8.20 for stability with Node 24 / Truffle 5.11.
 */

module.exports = {
  networks: {
    // Ganache GUI on 7545 (manual use / MetaMask)
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 6000000,
    },
    // Deterministic Ganache CLI on 7546 — used by backend + pytest
    // Start with: ganache --port 7546 --deterministic --accounts 10 --networkId 1337
    cli: {
      host: "127.0.0.1",
      port: 7546,
      network_id: "1337",
      gas: 6000000,
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
