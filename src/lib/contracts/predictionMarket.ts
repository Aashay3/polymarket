/**
 * PredictionMarket on-chain reader.
 *
 * Read-side wrapper around the deployed contract — quotes, prices,
 * positions. This module deliberately does NOT sign transactions:
 * writes go through the user's wallet (wallet-connect / SIWE) on the
 * client. Server-side trade simulation can use these reads to validate
 * the AMM math against the off-chain orderbook before recording.
 *
 * Configuration (env):
 *   NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS   deployed contract address
 *   NEXT_PUBLIC_CHAIN_ID + NEXT_PUBLIC_RPC_URL   already used by chain.ts
 *
 * Wire-up status: stand-alone module. The API routes
 * (/api/trades, /api/positions/close, /api/admin/markets/[id]/resolve)
 * do not call this yet — that's a separate task (see Tier-2 day 4 in
 * the status PDF).
 */

import { createPublicClient, getAddress, http, keccak256, toHex, type Address, type Hex, type PublicClient } from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { PREDICTION_MARKET_ABI, type Outcome } from "./abi";

let _client: PublicClient | null = null;

function getClient(): PublicClient {
  if (_client) return _client;
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 80002);
  const chain = chainId === 137 ? polygon : polygonAmoy;
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  _client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  }) as PublicClient;
  return _client;
}

export function getPredictionMarketAddress(): Address {
  const addr = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS;
  if (!addr) {
    throw new Error("NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS is not configured");
  }
  return getAddress(addr);
}

/// Hash an off-chain market UUID to the bytes32 key the contract uses.
/// Stable + deterministic so the same UUID always maps to the same key.
export function marketIdHash(uuid: string): Hex {
  return keccak256(toHex(uuid));
}

export interface OnChainMarket {
  question: string;
  endTime: bigint;
  status: "Open" | "Resolved";
  winningOutcome: "Yes" | "No";
  yesPool: bigint;
  noPool: bigint;
  usdcReserve: bigint;
  totalYesShares: bigint;
  totalNoShares: bigint;
  feeBps: number;
}

export async function readMarket(uuid: string): Promise<OnChainMarket> {
  const client = getClient();
  const result = await client.readContract({
    address: getPredictionMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "getMarket",
    args: [marketIdHash(uuid)],
  });
  return {
    question: result.question,
    endTime: result.endTime,
    status: result.status === 0 ? "Open" : "Resolved",
    winningOutcome: result.winningOutcome === 0 ? "Yes" : "No",
    yesPool: result.yesPool,
    noPool: result.noPool,
    usdcReserve: result.usdcReserve,
    totalYesShares: result.totalYesShares,
    totalNoShares: result.totalNoShares,
    feeBps: result.feeBps,
  };
}

/// Marginal probability of `outcome` as a number in [0, 1].
export async function readPrice(uuid: string, outcome: Outcome): Promise<number> {
  const client = getClient();
  const raw = await client.readContract({
    address: getPredictionMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "getPrice",
    args: [marketIdHash(uuid), outcome],
  });
  return Number(raw) / 1e18;
}

/// Quote: how many shares would `amountInUsdc` (6-dec USDC) buy?
export async function quoteBuy(
  uuid: string,
  outcome: Outcome,
  amountInUsdc: bigint,
): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: getPredictionMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "quoteBuy",
    args: [marketIdHash(uuid), outcome, amountInUsdc],
  });
}

/// Quote: how much USDC would selling `sharesIn` shares yield?
export async function quoteSell(
  uuid: string,
  outcome: Outcome,
  sharesIn: bigint,
): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: getPredictionMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "quoteSell",
    args: [marketIdHash(uuid), outcome, sharesIn],
  });
}

/// Read a user's outcome-share balance for a market.
export async function readUserShares(
  uuid: string,
  outcome: Outcome,
  user: Address,
): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: getPredictionMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: outcome === 0 ? "yesShares" : "noShares",
    args: [marketIdHash(uuid), user],
  });
}
