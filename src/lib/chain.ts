/**
 * On-chain helpers for deposit verification.
 *
 * We never sign anything here — this module only READS the chain to confirm
 * a user-submitted txHash actually transferred USDC to our deposit address.
 * That's the security property that lets us run without a hot-wallet key.
 *
 * Configuration (read from env):
 *   NEXT_PUBLIC_CHAIN_ID          polygon mainnet 137, amoy testnet 80002
 *   NEXT_PUBLIC_RPC_URL           RPC endpoint URL
 *   DEPOSIT_ADDRESS               our canonical deposit address (lowercase)
 *   USDC_CONTRACT_ADDRESS         USDC token contract on the chain
 *   MIN_CONFIRMATIONS             required block confirmations (default 12)
 */

import { createPublicClient, http, getAddress, parseAbiItem, type Hex, type PublicClient } from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { Decimal } from "decimal.js";

// The single ERC-20 event signature we care about.
// event Transfer(address indexed from, address indexed to, uint256 value)
const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

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

export function getDepositAddress(): string {
  const addr = process.env.DEPOSIT_ADDRESS;
  if (!addr) throw new Error("DEPOSIT_ADDRESS is not configured");
  return getAddress(addr).toLowerCase();
}

export function getUsdcAddress(): string {
  const addr = process.env.USDC_CONTRACT_ADDRESS;
  if (!addr) throw new Error("USDC_CONTRACT_ADDRESS is not configured");
  return getAddress(addr).toLowerCase();
}

export function getChainId(): number {
  return Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 80002);
}

function minConfirmations(): bigint {
  return BigInt(process.env.MIN_CONFIRMATIONS ?? 12);
}

export interface VerifiedDeposit {
  fromAddress: string;
  toAddress: string;
  amount: Decimal;     // 6-decimal USDC
  blockNumber: number;
  confirmations: number;
  tokenAddress: string;
}

export type VerifyFailReason =
  | "TX_NOT_FOUND"
  | "TX_FAILED"
  | "WRONG_TOKEN"
  | "WRONG_DESTINATION"
  | "NO_TRANSFER_EVENT"
  | "INSUFFICIENT_CONFIRMATIONS";

export interface VerifyError {
  reason: VerifyFailReason;
  message: string;
  confirmations?: number;
}

/**
 * Resolve a txHash to a USDC Transfer into our deposit address.
 *
 * Returns the verified deposit details OR an error describing why it was
 * rejected. Does NOT care who submitted the hash — the caller checks that
 * `fromAddress` matches the user's linked wallet.
 */
export async function verifyUsdcDeposit(txHash: string): Promise<{
  ok: true;
  deposit: VerifiedDeposit;
} | { ok: false; error: VerifyError }> {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, error: { reason: "TX_NOT_FOUND", message: "Invalid transaction hash" } };
  }

  const client = getClient();
  const depositAddress = getDepositAddress();
  const usdcAddress = getUsdcAddress();

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as Hex });
  } catch {
    return { ok: false, error: { reason: "TX_NOT_FOUND", message: "Transaction not found on-chain" } };
  }

  if (receipt.status !== "success") {
    return { ok: false, error: { reason: "TX_FAILED", message: "On-chain transaction reverted" } };
  }

  // Confirm the tx interacted with the USDC contract.
  // For ERC-20 transfers, the `to` address on the tx is the token contract.
  const txTo = receipt.to?.toLowerCase() ?? "";
  if (txTo !== usdcAddress) {
    return { ok: false, error: { reason: "WRONG_TOKEN", message: "Transaction is not a USDC transfer" } };
  }

  // Find the first Transfer log whose `to` == deposit address.
  let match: { fromAddress: string; toAddress: string; amount: Decimal; tokenAddress: string } | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== usdcAddress) continue;
    try {
      // Decode Transfer event
      const decoded = await import("viem").then((m) =>
        m.decodeEventLog({
          abi: [TRANSFER_EVENT],
          data: log.data,
          topics: log.topics,
        }),
      );
      const { from, to, value } = decoded.args as unknown as { from: string; to: string; value: bigint };
      if (to.toLowerCase() === depositAddress) {
        match = {
          fromAddress: from.toLowerCase(),
          toAddress: to.toLowerCase(),
          amount: new Decimal(value.toString()).div(1_000_000),
          tokenAddress: log.address.toLowerCase(),
        };
        break;
      }
    } catch {
      // Not a Transfer event; ignore.
    }
  }

  if (!match) {
    return { ok: false, error: { reason: "WRONG_DESTINATION", message: "No USDC transfer to the deposit address in this transaction" } };
  }

  const currentBlock = await client.getBlockNumber();
  const confirmations = Number(currentBlock - receipt.blockNumber);

  if (BigInt(confirmations) < minConfirmations()) {
    return {
      ok: false,
      error: {
        reason: "INSUFFICIENT_CONFIRMATIONS",
        message: `Need ${minConfirmations()} confirmations; have ${confirmations}. Try again in a few minutes.`,
        confirmations,
      },
    };
  }

  return {
    ok: true,
    deposit: {
      ...match,
      blockNumber: Number(receipt.blockNumber),
      confirmations,
    },
  };
}
