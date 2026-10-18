// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Standard Truffle Migrations contract – do not modify.
contract Migrations {
    address public owner = msg.sender;
    uint256 public last_completed_migration;

    modifier restricted() {
        require(msg.sender == owner, "Migrations: not owner");
        _;
    }

    function setCompleted(uint256 completed) public restricted {
        last_completed_migration = completed;
    }
}
