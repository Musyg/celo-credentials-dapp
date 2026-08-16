// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

import {EducationCredential} from "../src/EducationCredential.sol";

contract DeployEducationCredential is Script {
    uint256 internal constant CELO_SEPOLIA_CHAIN_ID = 11_142_220;

    error WrongChain(uint256 actualChainId);
    error ZeroInitialOwner();
    error OwnerMismatch(address expected, address actual);

    function run() external returns (EducationCredential credential) {
        if (block.chainid != CELO_SEPOLIA_CHAIN_ID) revert WrongChain(block.chainid);

        address initialOwner = vm.envAddress("INITIAL_OWNER");
        if (initialOwner == address(0)) revert ZeroInitialOwner();

        vm.startBroadcast();
        credential = new EducationCredential(initialOwner);
        vm.stopBroadcast();

        address deployedOwner = credential.owner();
        if (deployedOwner != initialOwner) revert OwnerMismatch(initialOwner, deployedOwner);

        console2.log("EducationCredential:", address(credential));
        console2.log("Owner:", deployedOwner);
    }
}
