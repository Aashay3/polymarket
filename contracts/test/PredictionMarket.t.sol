// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract PredictionMarketTest is Test {
    PredictionMarket pm;
    MockUSDC usdc;

    address admin = makeAddr("admin");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    bytes32 constant MARKET_ID = keccak256("test-market");
    uint64 constant END_TIME = 1893456000; // 2030-01-01
    uint256 constant L = 1000e6; // 1,000 USDC initial liquidity
    uint16 constant FEE_BPS = 200; // 2%

    function setUp() public {
        vm.startPrank(admin);
        usdc = new MockUSDC();
        pm = new PredictionMarket(usdc);
        usdc.mint(admin, 10_000e6);
        usdc.approve(address(pm), type(uint256).max);
        pm.createMarket(MARKET_ID, "Will it rain?", END_TIME, L, FEE_BPS);
        vm.stopPrank();

        usdc.mint(alice, 10_000e6);
        usdc.mint(bob, 10_000e6);
        vm.prank(alice);
        usdc.approve(address(pm), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(pm), type(uint256).max);
    }

    // ─── Market creation ─────────────────────────────────────

    function test_createMarket_setsInitialState() public view {
        PredictionMarket.Market memory m = pm.getMarket(MARKET_ID);
        assertEq(m.yesPool, L);
        assertEq(m.noPool, L);
        assertEq(m.usdcReserve, L);
        assertEq(m.feeBps, FEE_BPS);
        assertEq(uint256(m.status), uint256(PredictionMarket.Status.Open));
    }

    function test_createMarket_revertsOnDuplicate() public {
        vm.prank(admin);
        vm.expectRevert(PredictionMarket.MarketAlreadyExists.selector);
        pm.createMarket(MARKET_ID, "dup", END_TIME, L, FEE_BPS);
    }

    function test_createMarket_revertsOnPastEndTime() public {
        vm.prank(admin);
        vm.expectRevert(PredictionMarket.EndTimeInPast.selector);
        pm.createMarket(keccak256("past"), "q", uint64(block.timestamp - 1), L, FEE_BPS);
    }

    function test_createMarket_revertsOnFeeTooHigh() public {
        vm.prank(admin);
        vm.expectRevert(PredictionMarket.FeeTooHigh.selector);
        pm.createMarket(keccak256("hi-fee"), "q", END_TIME, L, 1001);
    }

    // ─── Buy ─────────────────────────────────────────────────

    function test_buyYes_movesPriceUp() public {
        uint256 priceBefore = pm.getPrice(MARKET_ID, PredictionMarket.Outcome.Yes);
        vm.prank(alice);
        uint256 sharesOut = pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6, 0);
        uint256 priceAfter = pm.getPrice(MARKET_ID, PredictionMarket.Outcome.Yes);

        assertEq(priceBefore, 5e17, "starts at 0.5");
        assertGt(priceAfter, priceBefore, "buying YES raises YES price");
        assertGt(sharesOut, 0);
        assertEq(pm.yesShares(MARKET_ID, alice), sharesOut);
    }

    function test_buyYes_invariantPreserved() public {
        PredictionMarket.Market memory before = pm.getMarket(MARKET_ID);
        uint256 kBefore = before.yesPool * before.noPool;

        vm.prank(alice);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 250e6, 0);

        PredictionMarket.Market memory after_ = pm.getMarket(MARKET_ID);
        uint256 kAfter = after_.yesPool * after_.noPool;

        // k may grow slightly (fee retained in pool) but never shrinks.
        assertGe(kAfter, kBefore, "constant-product invariant cannot decrease");
    }

    function test_buy_slippageGuard() public {
        uint256 quoted = pm.quoteBuy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6);
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.SlippageExceeded.selector);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6, quoted + 1);
    }

    function test_buy_revertsAfterEndTime() public {
        vm.warp(END_TIME);
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.MarketClosed.selector);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6, 0);
    }

    // ─── Sell ────────────────────────────────────────────────

    function test_sell_returnsRoughlySameAmount() public {
        // Buy YES at 0.5 then sell back without anyone else trading;
        // user should recover most of their USDC, minus fees.
        vm.startPrank(alice);
        uint256 shares = pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6, 0);
        uint256 received = pm.sell(MARKET_ID, PredictionMarket.Outcome.Yes, shares, 0);
        vm.stopPrank();

        // Round-trip cost ≈ 2 × fee (≈ 4% on 100 USDC = 4 USDC). Allow
        // a small extra band for the AMM curve.
        assertLt(received, 100e6, "round-trip cannot net positive");
        assertGt(received, 92e6, "fee should be ~4 USDC, not larger");
    }

    function test_sell_revertsOnInsufficientShares() public {
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.InsufficientShares.selector);
        pm.sell(MARKET_ID, PredictionMarket.Outcome.Yes, 1, 0);
    }

    // ─── Resolve + claim ─────────────────────────────────────

    function test_resolve_thenClaim_paysWinner() public {
        // Alice buys YES, Bob buys NO, market resolves YES.
        vm.prank(alice);
        uint256 yesShares = pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6, 0);
        vm.prank(bob);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.No, 100e6, 0);

        vm.prank(admin);
        pm.resolve(MARKET_ID, PredictionMarket.Outcome.Yes);

        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = pm.claim(MARKET_ID);
        uint256 aliceAfter = usdc.balanceOf(alice);

        assertEq(payout, yesShares, "1 USDC per winning share");
        assertEq(aliceAfter - aliceBefore, yesShares);
        assertEq(pm.yesShares(MARKET_ID, alice), 0, "shares burned on claim");
    }

    function test_claim_loserCannotClaim() public {
        vm.prank(alice);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6, 0);
        vm.prank(bob);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.No, 100e6, 0);

        vm.prank(admin);
        pm.resolve(MARKET_ID, PredictionMarket.Outcome.Yes);

        vm.prank(bob);
        vm.expectRevert(PredictionMarket.InsufficientShares.selector);
        pm.claim(MARKET_ID);
    }

    function test_claim_revertsBeforeResolution() public {
        vm.prank(alice);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6, 0);
        vm.prank(alice);
        vm.expectRevert(PredictionMarket.MarketNotResolved.selector);
        pm.claim(MARKET_ID);
    }

    function test_resolve_blocksFurtherTrading() public {
        vm.prank(admin);
        pm.resolve(MARKET_ID, PredictionMarket.Outcome.Yes);

        vm.prank(alice);
        vm.expectRevert(PredictionMarket.MarketClosed.selector);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6, 0);
    }

    // ─── LP withdraw ─────────────────────────────────────────

    function test_withdrawLP_recoversSurplus() public {
        // Alice + Bob buy on opposite sides; market resolves; admin
        // withdraws what's not owed to winners.
        vm.prank(alice);
        uint256 winShares = pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, 100e6, 0);
        vm.prank(bob);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.No, 100e6, 0);

        vm.prank(admin);
        pm.resolve(MARKET_ID, PredictionMarket.Outcome.Yes);

        uint256 reserveBefore = pm.getMarket(MARKET_ID).usdcReserve;
        uint256 expectedSurplus = reserveBefore - winShares;

        uint256 adminBefore = usdc.balanceOf(admin);
        vm.prank(admin);
        pm.withdrawLP(MARKET_ID, admin);
        uint256 adminAfter = usdc.balanceOf(admin);

        assertEq(adminAfter - adminBefore, expectedSurplus, "admin pulls surplus only");

        // Alice can still claim afterwards — reserve remaining covers her exactly.
        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        pm.claim(MARKET_ID);
        assertEq(usdc.balanceOf(alice) - aliceBefore, winShares);
    }

    function test_withdrawLP_revertsBeforeResolution() public {
        vm.prank(admin);
        vm.expectRevert(PredictionMarket.MarketNotResolved.selector);
        pm.withdrawLP(MARKET_ID, admin);
    }

    // ─── Access control ──────────────────────────────────────

    function test_resolve_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pm.resolve(MARKET_ID, PredictionMarket.Outcome.Yes);
    }

    function test_createMarket_onlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pm.createMarket(keccak256("nope"), "q", END_TIME, L, FEE_BPS);
    }

    // ─── Fuzz: invariant under random trades ────────────────

    function testFuzz_kNeverDecreases(uint64 amt) public {
        amt = uint64(bound(amt, 1e6, 500e6));
        PredictionMarket.Market memory before = pm.getMarket(MARKET_ID);
        uint256 kBefore = before.yesPool * before.noPool;

        vm.prank(alice);
        pm.buy(MARKET_ID, PredictionMarket.Outcome.Yes, amt, 0);

        PredictionMarket.Market memory after_ = pm.getMarket(MARKET_ID);
        assertGe(after_.yesPool * after_.noPool, kBefore);
    }
}
