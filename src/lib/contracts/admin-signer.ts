/**
 * Server-side admin wallet for on-chain admin actions.
 *
 * SERVER ONLY — never imported into client code. Uses a hot key from
 * `ADMIN_PRIVATE_KEY` to sign `createMarket` / `resolve` / `withdrawLP`
 * on the deployed PredictionMarket. User-side actions (`buy`, `sell`,
 * `claim`) sign in the user's browser via wallet-connect; that wiring
 * is intentionally NOT here.
 *
 * Required env (only when ENABLE_ON_CHAIN_SETTLEMENT=true):
 *   ADMIN_PRIVATE_KEY                          0x-prefixed hex
 *   NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS      deployed contract
 *   NEXT_PUBLIC_CHAIN_ID  / NEXT_PUBLIC_RPC_URL   already used elsewhere
 *
 * Hot keys are an anti-pattern for production. Migrate to a multisig
 * (Safe) and a relayer (Defender / Gelato) before any real value lives
 * in this contract.
 */

import "server-only";
import {
  createWalletClient,
  http,
  publicActions,
  type Account,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon, polygonAmoy } from "viem/chains";

// Build returns a wallet client extended with public actions; we let TS
// infer the (long) intersection type rather than asserting it manually
// — viem's strict generics make hand-written annotations brittle.
function buildWallet() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 80002);
  const chain = chainId === 137 ? polygon : polygonAmoy;
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  return createWalletClient({
    account: getAdminAccount(),
    chain,
    transport: http(rpcUrl),
  }).extend(publicActions);
}

let _wallet: ReturnType<typeof buildWallet> | null = null;
let _account: Account | null = null;

export function isOnChainEnabled(): boolean {
  return process.env.ENABLE_ON_CHAIN_SETTLEMENT === "true";
}

export function getAdminAccount(): Account {
  if (_account) return _account;
  const pk = process.env.ADMIN_PRIVATE_KEY;
  if (!pk || !/^0x[a-fA-F0-9]{64}$/.test(pk)) {
    throw new Error("ADMIN_PRIVATE_KEY missing or malformed");
  }
  _account = privateKeyToAccount(pk as Hex);
  return _account;
}

/**
 * Lazily-built wallet client extended with public actions so the same
 * instance can both write (sendTransaction) and read (waitForReceipt,
 * getBalance, etc.) without juggling two clients.
 */
export function getAdminWallet() {
  if (_wallet) return _wallet;
  _wallet = buildWallet();
  return _wallet;
}
