// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PredictionMarket
 * @notice Binary-outcome AMM prediction market settling in a single ERC-20
 *         (USDC). One contract holds every market; outcome share balances
 *         are tracked internally rather than as separate ERC-20s, which
 *         keeps the deploy cost flat and makes a "claim winnings" flow
 *         simple to read.
 *
 * AMM model — constant-product invariant `yesPool * noPool = k`. When a
 * user buys YES with X USDC (fee-adjusted), the pool's NO reserve grows
 * by X and YES reserve shrinks to keep k constant. Sharesout =
 * yesPool * X / (noPool + X). Selling shares is the symmetric inverse.
 *
 * Resolution — owner-only for the demo. A production version would
 * delegate to a UMA-style oracle or a multisig with a dispute window;
 * the function surface (`resolve(bytes32, Outcome)`) stays the same.
 *
 * Liquidity — the owner seeds each market with `initialLiquidity` USDC
 * which sets `yesPool = noPool = initialLiquidity` (50/50 starting
 * price). After resolution + claiming, the owner can withdraw the
 * pool's surplus (LP profit + unredeemed shares) via `withdrawLP`.
 */
contract PredictionMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Outcome {
        Yes,
        No
    }

    enum Status {
        Open,
        Resolved
    }

    struct Market {
        string question;
        uint64 endTime;
        Status status;
        Outcome winningOutcome;
        uint256 yesPool;
        uint256 noPool;
        uint256 usdcReserve; // USDC held in trust for this market
        uint256 totalYesShares; // shares held by users (NOT pool)
        uint256 totalNoShares;
        uint16 feeBps;
    }

    IERC20 public immutable usdc;

    /// @dev hard cap on the per-trade fee — 10%. Anything higher is
    ///      almost certainly a misconfiguration.
    uint16 public constant MAX_FEE_BPS = 1000;

    mapping(bytes32 => Market) public markets;
    mapping(bytes32 => mapping(address => uint256)) public yesShares;
    mapping(bytes32 => mapping(address => uint256)) public noShares;

    event MarketCreated(
        bytes32 indexed id,
        string question,
        uint64 endTime,
        uint256 initialLiquidity,
        uint16 feeBps
    );

    event SharesBought(
        bytes32 indexed id,
        address indexed user,
        Outcome outcome,
        uint256 amountIn,
        uint256 sharesOut,
        uint256 fee
    );

    event SharesSold(
        bytes32 indexed id,
        address indexed user,
        Outcome outcome,
        uint256 sharesIn,
        uint256 amountOut,
        uint256 fee
    );

    event MarketResolved(bytes32 indexed id, Outcome winningOutcome);
    event PayoutClaimed(bytes32 indexed id, address indexed user, uint256 shares, uint256 amount);
    event LPWithdrawn(bytes32 indexed id, address indexed to, uint256 amount);

    error MarketAlreadyExists();
    error MarketNotFound();
    error MarketClosed();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error InvalidAmount();
    error InsufficientShares();
    error EndTimeInPast();
    error FeeTooHigh();
    error SlippageExceeded();
    error NoSurplus();

    constructor(IERC20 _usdc) Ownable(msg.sender) {
        usdc = _usdc;
    }

    // ─────────────────────────────────────────────────────────
    // Admin: create / resolve / withdraw
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Spin up a new market. Caller (owner) must have approved
     *         `initialLiquidity` USDC to this contract.
     * @param marketId    Unique key (bytes32 — typically keccak256 of
     *                    the off-chain market UUID).
     * @param question    Display question (gas-light; consider keeping
     *                    it short on-chain and storing the long form
     *                    off-chain by content hash).
     * @param endTime     Unix seconds at which trading should stop. The
     *                    contract doesn't auto-close — caller / cron
     *                    blocks trades after this in app-layer logic.
     */
    function createMarket(
        bytes32 marketId,
        string calldata question,
        uint64 endTime,
        uint256 initialLiquidity,
        uint16 feeBps
    ) external onlyOwner {
        if (markets[marketId].usdcReserve != 0) revert MarketAlreadyExists();
        if (endTime <= block.timestamp) revert EndTimeInPast();
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        if (initialLiquidity == 0) revert InvalidAmount();

        usdc.safeTransferFrom(msg.sender, address(this), initialLiquidity);

        markets[marketId] = Market({
            question: question,
            endTime: endTime,
            status: Status.Open,
            winningOutcome: Outcome.Yes, // placeholder; ignored until resolved
            yesPool: initialLiquidity,
            noPool: initialLiquidity,
            usdcReserve: initialLiquidity,
            totalYesShares: 0,
            totalNoShares: 0,
            feeBps: feeBps
        });

        emit MarketCreated(marketId, question, endTime, initialLiquidity, feeBps);
    }

    /// @notice Owner-only resolution. Sets the winning outcome and
    ///         flips status to Resolved; further trading reverts.
    function resolve(bytes32 marketId, Outcome winningOutcome) external onlyOwner {
        Market storage m = markets[marketId];
        if (m.usdcReserve == 0) revert MarketNotFound();
        if (m.status == Status.Resolved) revert MarketAlreadyResolved();

        m.status = Status.Resolved;
        m.winningOutcome = winningOutcome;

        emit MarketResolved(marketId, winningOutcome);
    }

    /// @notice After resolution, withdraw the surplus USDC — the
    ///         pool's USDC reserve minus the amount still owed to
    ///         outstanding winning-share holders.
    function withdrawLP(bytes32 marketId, address to) external onlyOwner nonReentrant {
        Market storage m = markets[marketId];
        if (m.status != Status.Resolved) revert MarketNotResolved();

        uint256 owed =
            m.winningOutcome == Outcome.Yes ? m.totalYesShares : m.totalNoShares;
        if (m.usdcReserve <= owed) revert NoSurplus();

        uint256 surplus = m.usdcReserve - owed;
        m.usdcReserve = owed;

        usdc.safeTransfer(to, surplus);
        emit LPWithdrawn(marketId, to, surplus);
    }

    // ─────────────────────────────────────────────────────────
    // User: buy / sell / claim
    // ─────────────────────────────────────────────────────────

    /**
     * @notice Buy `outcome` shares with USDC. Caller must have approved
     *         `amountIn` to this contract.
     * @param minSharesOut Slippage guard — revert if the AMM would give
     *                     fewer shares than this. Frontend computes it
     *                     from a recent quote with a tolerance band.
     */
    function buy(bytes32 marketId, Outcome outcome, uint256 amountIn, uint256 minSharesOut)
        external
        nonReentrant
        returns (uint256 sharesOut)
    {
        Market storage m = markets[marketId];
        if (m.usdcReserve == 0) revert MarketNotFound();
        if (m.status == Status.Resolved) revert MarketClosed();
        if (block.timestamp >= m.endTime) revert MarketClosed();
        if (amountIn == 0) revert InvalidAmount();

        uint256 fee = (amountIn * m.feeBps) / 10000;
        uint256 amountInAfterFee = amountIn - fee;

        // Constant-product AMM:
        //   sharesOut = thisPool * X' / (otherPool + X')
        //   newOtherPool = otherPool + X'
        //   newThisPool  = thisPool * otherPool / newOtherPool
        if (outcome == Outcome.Yes) {
            sharesOut = (m.yesPool * amountInAfterFee) / (m.noPool + amountInAfterFee);
            m.noPool += amountInAfterFee;
            m.yesPool -= sharesOut;
            m.totalYesShares += sharesOut;
            yesShares[marketId][msg.sender] += sharesOut;
        } else {
            sharesOut = (m.noPool * amountInAfterFee) / (m.yesPool + amountInAfterFee);
            m.yesPool += amountInAfterFee;
            m.noPool -= sharesOut;
            m.totalNoShares += sharesOut;
            noShares[marketId][msg.sender] += sharesOut;
        }

        if (sharesOut < minSharesOut) revert SlippageExceeded();

        // Pull full amountIn (fee + amountInAfterFee both stay in the
        // pool — the fee just isn't credited as USDC backing for the
        // shares, which is what gives LPs their spread).
        usdc.safeTransferFrom(msg.sender, address(this), amountIn);
        m.usdcReserve += amountIn;

        emit SharesBought(marketId, msg.sender, outcome, amountIn, sharesOut, fee);
    }

    /**
     * @notice Sell `sharesIn` of `outcome` shares back to the pool for
     *         USDC. Symmetric inverse of `buy`.
     */
    function sell(bytes32 marketId, Outcome outcome, uint256 sharesIn, uint256 minAmountOut)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        Market storage m = markets[marketId];
        if (m.usdcReserve == 0) revert MarketNotFound();
        if (m.status == Status.Resolved) revert MarketClosed();
        if (block.timestamp >= m.endTime) revert MarketClosed();
        if (sharesIn == 0) revert InvalidAmount();

        uint256 grossOut;
        if (outcome == Outcome.Yes) {
            if (yesShares[marketId][msg.sender] < sharesIn) revert InsufficientShares();
            grossOut = (m.noPool * sharesIn) / (m.yesPool + sharesIn);
            m.yesPool += sharesIn;
            m.noPool -= grossOut;
            m.totalYesShares -= sharesIn;
            yesShares[marketId][msg.sender] -= sharesIn;
        } else {
            if (noShares[marketId][msg.sender] < sharesIn) revert InsufficientShares();
            grossOut = (m.yesPool * sharesIn) / (m.noPool + sharesIn);
            m.noPool += sharesIn;
            m.yesPool -= grossOut;
            m.totalNoShares -= sharesIn;
            noShares[marketId][msg.sender] -= sharesIn;
        }

        uint256 fee = (grossOut * m.feeBps) / 10000;
        amountOut = grossOut - fee;
        if (amountOut < minAmountOut) revert SlippageExceeded();

        m.usdcReserve -= amountOut;
        usdc.safeTransfer(msg.sender, amountOut);

        emit SharesSold(marketId, msg.sender, outcome, sharesIn, amountOut, fee);
    }

    /**
     * @notice Burn the caller's winning shares for 1 USDC each. Reverts
     *         if the market hasn't been resolved or the caller holds no
     *         shares on the winning side.
     */
    function claim(bytes32 marketId) external nonReentrant returns (uint256 payout) {
        Market storage m = markets[marketId];
        if (m.status != Status.Resolved) revert MarketNotResolved();

        if (m.winningOutcome == Outcome.Yes) {
            payout = yesShares[marketId][msg.sender];
            if (payout == 0) revert InsufficientShares();
            yesShares[marketId][msg.sender] = 0;
            m.totalYesShares -= payout;
        } else {
            payout = noShares[marketId][msg.sender];
            if (payout == 0) revert InsufficientShares();
            noShares[marketId][msg.sender] = 0;
            m.totalNoShares -= payout;
        }

        m.usdcReserve -= payout;
        usdc.safeTransfer(msg.sender, payout);

        emit PayoutClaimed(marketId, msg.sender, payout, payout);
    }

    // ─────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────

    function getMarket(bytes32 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /// @notice Marginal price of `outcome` as a 1e18-scaled probability.
    ///         For YES: noPool / (yesPool + noPool); for NO: the inverse.
    function getPrice(bytes32 marketId, Outcome outcome) external view returns (uint256) {
        Market storage m = markets[marketId];
        if (m.usdcReserve == 0) revert MarketNotFound();
        uint256 total = m.yesPool + m.noPool;
        if (total == 0) return 0;
        return outcome == Outcome.Yes ? (m.noPool * 1e18) / total : (m.yesPool * 1e18) / total;
    }

    /// @notice Quote how many shares `amountIn` USDC would buy, after fee.
    function quoteBuy(bytes32 marketId, Outcome outcome, uint256 amountIn)
        external
        view
        returns (uint256 sharesOut)
    {
        Market storage m = markets[marketId];
        if (m.usdcReserve == 0) revert MarketNotFound();
        if (amountIn == 0) return 0;
        uint256 fee = (amountIn * m.feeBps) / 10000;
        uint256 amountInAfterFee = amountIn - fee;
        if (outcome == Outcome.Yes) {
            sharesOut = (m.yesPool * amountInAfterFee) / (m.noPool + amountInAfterFee);
        } else {
            sharesOut = (m.noPool * amountInAfterFee) / (m.yesPool + amountInAfterFee);
        }
    }

    /// @notice Quote how much USDC selling `sharesIn` shares would yield, after fee.
    function quoteSell(bytes32 marketId, Outcome outcome, uint256 sharesIn)
        external
        view
        returns (uint256 amountOut)
    {
        Market storage m = markets[marketId];
        if (m.usdcReserve == 0) revert MarketNotFound();
        if (sharesIn == 0) return 0;
        uint256 grossOut;
        if (outcome == Outcome.Yes) {
            grossOut = (m.noPool * sharesIn) / (m.yesPool + sharesIn);
        } else {
            grossOut = (m.yesPool * sharesIn) / (m.noPool + sharesIn);
        }
        uint256 fee = (grossOut * m.feeBps) / 10000;
        amountOut = grossOut - fee;
    }
}
