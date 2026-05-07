// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title SidzSol (SIDZSOL)
/// @notice Fixed-supply ERC-20 with 100,000,000 tokens minted at deployment.
///
///         Properties:
///           - Name / symbol: SidzSol / SIDZSOL
///           - Decimals: 18 (standard)
///           - Total supply: 100M, fully minted to the deployer at construction.
///             No `mint` function is exposed, so circulation is fixed forever.
///           - Burnable: holders can burn their own balance via ERC20Burnable.
///             Burns reduce totalSupply (deflationary on burn).
///           - Permit (EIP-2612): gasless approvals for DEX / DeFi integrations.
///
///         Designed for Polygon Amoy testnet first; the same code is safe on
///         Polygon mainnet — there is no privileged owner and no upgrade path.
contract SidzSol is ERC20, ERC20Burnable, ERC20Permit {
    /// @notice 100,000,000 SIDZSOL — denominated in wei (18 decimals).
    uint256 public constant INITIAL_SUPPLY = 100_000_000 * 10 ** 18;

    /// @param treasury Address that receives the entire initial supply.
    ///                 Pass the deployer if no separate treasury exists.
    constructor(address treasury) ERC20("SidzSol", "SIDZSOL") ERC20Permit("SidzSol") {
        require(treasury != address(0), "SIDZSOL: treasury is zero");
        _mint(treasury, INITIAL_SUPPLY);
    }
}
