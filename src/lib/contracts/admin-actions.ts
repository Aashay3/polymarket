/**
 * High-level admin write helpers — all SERVER-ONLY.
 *
 * Wraps the raw viem calls so the API routes can fire them as
 * fire-and-forget mirrors of the DB mutation. Each helper waits for
 * 1 confirmation (so the txHash is mined before we resolve), but the
 * caller is expected to NOT block the user response on this — invoke
 * via `mirrorOnChain` (below) which logs failures rather than
 * rethrowing.
 *
 * Hybrid mode: the DB transaction stays the source of truth; the chain
 * call just provides on-chain provenance for market lifecycle events.
 * If the chain call fails, the API still returns 200 — the failure is
 * recorded in the AuditLog and can be retried by an admin tool.
 */

import "server-only";
import { erc20Abi, parseUnits, type Hex, type Address } from "viem";
import { PREDICTION_MARKET_ABI } from "./abi";
import {
  getAdminAccount,
  getAdminWallet,
  isOnChainEnabled,
} from "./admin-signer";
import { getPredictionMarketAddress, marketIdHash } from "./predictionMarket";
import { getUsdcAddress } from "@/lib/chain";

const APPROVAL_HEADROOM = parseUnits("1000000000", 6); // 1 B USDC — re-approve threshold

/**
 * Ensures the admin has approved at least `required` USDC to the
 * PredictionMarket. If the current allowance is below `required`, sends
 * a max-uint256 approval so we don't pay this gas every market creation.
 */
async function ensureUsdcApproval(required: bigint): Promise<void> {
  const wallet = getAdminWallet();
  const usdc = getUsdcAddress() as Address;
  const spender = getPredictionMarketAddress();
  const owner = getAdminAccount().address;

  const allowance = await wallet.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });

  if (allowance >= required) return;

  // Max approval — saves an approve per createMarket. Acceptable for a
  // hot-key admin; a multisig setup would do scoped approvals instead.
  const hash = await wallet.writeContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, APPROVAL_HEADROOM],
  });
  await wallet.waitForTransactionReceipt({ hash });
}

export interface ChainTxResult {
  ok: true;
  txHash: Hex;
  blockNumber: bigint;
}

export interface ChainTxFailure {
  ok: false;
  reason: string;
}

export async function createMarketOnChain(input: {
  marketUuid: string;
  question: string;
  endTime: Date;
  initialLiquidityUsdc: string; // decimal string, e.g. "10000"
  feeBps: number;
}): Promise<ChainTxResult | ChainTxFailure> {
  const wallet = getAdminWallet();
  const initialLiquidity = parseUnits(input.initialLiquidityUsdc, 6);

  await ensureUsdcApproval(initialLiquidity);

  const hash = await wallet.writeContract({
    address: getPredictionMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "createMarket",
    args: [
      marketIdHash(input.marketUuid),
      input.question,
      BigInt(Math.floor(input.endTime.getTime() / 1000)),
      initialLiquidity,
      input.feeBps,
    ],
  });

  const receipt = await wallet.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    return { ok: false, reason: "tx reverted" };
  }
  return { ok: true, txHash: hash, blockNumber: receipt.blockNumber };
}

export async function resolveMarketOnChain(input: {
  marketUuid: string;
  outcome: "YES" | "NO";
}): Promise<ChainTxResult | ChainTxFailure> {
  const wallet = getAdminWallet();
  const hash = await wallet.writeContract({
    address: getPredictionMarketAddress(),
    abi: PREDICTION_MARKET_ABI,
    functionName: "resolve",
    args: [
      marketIdHash(input.marketUuid),
      input.outcome === "YES" ? 0 : 1,
    ],
  });

  const receipt = await wallet.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    return { ok: false, reason: "tx reverted" };
  }
  return { ok: true, txHash: hash, blockNumber: receipt.blockNumber };
}

/**
 * Wraps a chain action so the API route can call it without try/catching
 * inline. Returns null on disabled / failure (so the API can branch on
 * the result without throwing); logs the reason for ops to triage.
 */
export async function mirrorOnChain(
  label: string,
  fn: () => Promise<ChainTxResult | ChainTxFailure>,
): Promise<ChainTxResult | null> {
  if (!isOnChainEnabled()) return null;
  try {
    const result = await fn();
    if (!result.ok) {
      console.error(`[on-chain mirror] ${label} failed: ${result.reason}`);
      return null;
    }
    return result;
  } catch (err) {
    console.error(`[on-chain mirror] ${label} threw:`, err);
    return null;
  }
}
