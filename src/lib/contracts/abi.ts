/**
 * PredictionMarket ABI — hand-maintained subset.
 *
 * After any ABI-affecting change in `contracts/src/PredictionMarket.sol`,
 * re-export from `contracts/out/PredictionMarket.sol/PredictionMarket.json`
 * (the `abi` field) and replace this constant. Functions/events not
 * listed here just won't be callable via viem until added.
 */
export const PREDICTION_MARKET_ABI = [
  // ── Reads ───────────────────────────────────────────────
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "question", type: "string" },
          { name: "endTime", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "winningOutcome", type: "uint8" },
          { name: "yesPool", type: "uint256" },
          { name: "noPool", type: "uint256" },
          { name: "usdcReserve", type: "uint256" },
          { name: "totalYesShares", type: "uint256" },
          { name: "totalNoShares", type: "uint256" },
          { name: "feeBps", type: "uint16" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getPrice",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcome", type: "uint8" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "quoteBuy",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcome", type: "uint8" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "sharesOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "quoteSell",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcome", type: "uint8" },
      { name: "sharesIn", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "yesShares",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "noShares",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },

  // ── Writes ──────────────────────────────────────────────
  {
    type: "function",
    name: "createMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "question", type: "string" },
      { name: "endTime", type: "uint64" },
      { name: "initialLiquidity", type: "uint256" },
      { name: "feeBps", type: "uint16" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcome", type: "uint8" },
      { name: "amountIn", type: "uint256" },
      { name: "minSharesOut", type: "uint256" },
    ],
    outputs: [{ name: "sharesOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "sell",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "outcome", type: "uint8" },
      { name: "sharesIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [{ name: "payout", type: "uint256" }],
  },
  {
    type: "function",
    name: "resolve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "winningOutcome", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawLP",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "to", type: "address" },
    ],
    outputs: [],
  },

  // ── Events ──────────────────────────────────────────────
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "question", type: "string", indexed: false },
      { name: "endTime", type: "uint64", indexed: false },
      { name: "initialLiquidity", type: "uint256", indexed: false },
      { name: "feeBps", type: "uint16", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SharesBought",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "sharesOut", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SharesSold",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "sharesIn", type: "uint256", indexed: false },
      { name: "amountOut", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MarketResolved",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "winningOutcome", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PayoutClaimed",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "shares", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export type Outcome = 0 | 1; // 0 = Yes, 1 = No
export const OUTCOME_YES: Outcome = 0;
export const OUTCOME_NO: Outcome = 1;
