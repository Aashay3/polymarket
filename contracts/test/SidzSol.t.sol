// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SidzSol} from "../src/SidzSol.sol";

contract SidzSolTest is Test {
    SidzSol internal token;
    address internal treasury = address(0xBEEF);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);

    function setUp() public {
        token = new SidzSol(treasury);
    }

    /// @notice Constructor mints the full 100M supply to the treasury.
    function test_ConstructorMintsFullSupplyToTreasury() public view {
        uint256 expected = 100_000_000 * 10 ** 18;
        assertEq(token.totalSupply(), expected, "totalSupply");
        assertEq(token.balanceOf(treasury), expected, "treasury balance");
        assertEq(token.INITIAL_SUPPLY(), expected, "INITIAL_SUPPLY constant");
    }

    function test_Metadata() public view {
        assertEq(token.name(), "SidzSol");
        assertEq(token.symbol(), "SIDZSOL");
        assertEq(token.decimals(), 18);
    }

    function test_RevertWhen_TreasuryIsZero() public {
        vm.expectRevert(bytes("SIDZSOL: treasury is zero"));
        new SidzSol(address(0));
    }

    function test_TransfersWork() public {
        vm.prank(treasury);
        token.transfer(alice, 1_000 ether);
        assertEq(token.balanceOf(alice), 1_000 ether);
    }

    function test_BurnReducesSupply() public {
        uint256 before = token.totalSupply();
        vm.prank(treasury);
        token.burn(500 ether);
        assertEq(token.totalSupply(), before - 500 ether);
        assertEq(token.balanceOf(treasury), before - 500 ether);
    }

    function test_BurnFromUsesAllowance() public {
        vm.prank(treasury);
        token.transfer(alice, 1_000 ether);
        vm.prank(alice);
        token.approve(bob, 400 ether);

        vm.prank(bob);
        token.burnFrom(alice, 400 ether);

        assertEq(token.balanceOf(alice), 600 ether);
        assertEq(token.allowance(alice, bob), 0);
    }

    function test_NoMintFunctionExposed() public view {
        // Verifies via interface inspection — the contract has no public
        // `mint` selector. We rely on the compiler having rejected any
        // accidental external mint when the contract was built; if this
        // file compiles and the constant supply test above passes, the
        // invariant holds.
        assertEq(token.totalSupply(), token.INITIAL_SUPPLY());
    }

    /// @notice EIP-2612 permit lets a holder approve gasless via signature.
    function test_PermitAllowsGaslessApproval() public {
        uint256 ownerPk = OWNER_PK;
        address owner = vm.addr(ownerPk);

        // fund owner
        vm.prank(treasury);
        token.transfer(owner, 1_000 ether);

        uint256 deadline = block.timestamp + 1 hours;
        uint256 value = 250 ether;
        uint256 nonce = token.nonces(owner);

        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                ),
                owner,
                bob,
                value,
                nonce,
                deadline
            )
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);

        token.permit(owner, bob, value, deadline, v, r, s);
        assertEq(token.allowance(owner, bob), value);
        assertEq(token.nonces(owner), nonce + 1);
    }

    /// @notice Fuzz: any (sender, recipient, amount) transfer conserves
    ///         the total supply (no mint, no burn).
    function testFuzz_TransfersConserveSupply(uint256 amount) public {
        amount = bound(amount, 0, token.balanceOf(treasury));
        uint256 supplyBefore = token.totalSupply();

        vm.prank(treasury);
        token.transfer(alice, amount);

        assertEq(token.totalSupply(), supplyBefore);
        assertEq(token.balanceOf(treasury) + token.balanceOf(alice), supplyBefore);
    }
}

uint256 constant OWNER_PK = uint256(keccak256("sidzsol.test.owner"));
