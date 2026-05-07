// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {SidzSol} from "../src/SidzSol.sol";

/**
 * Deploy script for the SIDZSOL token.
 *
 * Local / Anvil:
 *     forge script script/DeploySidzSol.s.sol \
 *         --broadcast --rpc-url http://localhost:8545
 *
 * Polygon Amoy (testnet):
 *     export DEPLOYER_PRIVATE_KEY=0x...
 *     # optional — defaults to the deployer if unset
 *     export TREASURY_ADDRESS=0x...
 *     forge script script/DeploySidzSol.s.sol \
 *         --rpc-url $POLYGON_AMOY_RPC_URL \
 *         --broadcast \
 *         --verify
 *
 * After deploy:
 *   - The treasury address holds the entire 100,000,000 SIDZSOL supply.
 *   - Add the printed contract address as `NEXT_PUBLIC_SIDZSOL_ADDRESS`
 *     in `.env.local` so the frontend / token list picks it up.
 *   - Verify on Polygonscan Amoy if `--verify` was passed:
 *     https://amoy.polygonscan.com/address/<address>#code
 */
contract DeploySidzSol is Script {
    function run() external returns (SidzSol token) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);

        console.log("Deployer", deployer);
        console.log("Treasury", treasury);

        vm.startBroadcast(pk);
        token = new SidzSol(treasury);
        vm.stopBroadcast();

        console.log("SidzSol deployed at", address(token));
        console.log("Initial supply (wei)", token.INITIAL_SUPPLY());
        console.log("Treasury balance (wei)", token.balanceOf(treasury));
    }
}
