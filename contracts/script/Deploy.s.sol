// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * Deploy script for PredictionMarket.
 *
 * Local / Anvil:
 *     forge script script/Deploy.s.sol --broadcast --rpc-url http://localhost:8545
 *
 * Polygon Amoy (testnet):
 *     export DEPLOYER_PRIVATE_KEY=0x...
 *     export USDC_ADDRESS=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582  # USDC on Amoy
 *     forge script script/Deploy.s.sol \
 *         --rpc-url $POLYGON_AMOY_RPC_URL \
 *         --broadcast \
 *         --verify
 *
 * If USDC_ADDRESS is unset (e.g. local fork), a MockUSDC is deployed and
 * its address logged so the frontend can wire to it.
 */
contract Deploy is Script {
    function run() external returns (PredictionMarket pm, address usdc) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address usdcEnv = vm.envOr("USDC_ADDRESS", address(0));

        vm.startBroadcast(pk);

        if (usdcEnv == address(0)) {
            MockUSDC mock = new MockUSDC();
            usdc = address(mock);
            console.log("MockUSDC deployed at", usdc);
        } else {
            usdc = usdcEnv;
            console.log("Using existing USDC at", usdc);
        }

        pm = new PredictionMarket(IERC20(usdc));
        console.log("PredictionMarket deployed at", address(pm));

        vm.stopBroadcast();
    }
}
