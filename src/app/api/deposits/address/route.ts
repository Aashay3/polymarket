/**
 * GET /api/deposits/address — returns the canonical deposit address.
 *
 * Public: showing the deposit address doesn't leak anything sensitive,
 * and letting unauthenticated visitors see it is useful for onboarding
 * copy. The server enforces sender-must-match-linked-wallet at credit
 * time, so just knowing the address doesn't let anyone steal credit.
 *
 * If deposit env vars are missing we return 503 NOT_CONFIGURED rather
 * than a generic 500 — that way the UI can show a clear "deposits not
 * configured yet" message instead of a mystery stack trace.
 */

import { handler, ok, err } from "@/lib/api";
import { getDepositAddress, getChainId, getUsdcAddress } from "@/lib/chain";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  let address: string;
  let tokenAddress: string;
  try {
    address = getDepositAddress();
    tokenAddress = getUsdcAddress();
  } catch (e) {
    return err(
      "NOT_CONFIGURED",
      "Deposits are not configured on this server yet. Ask the operator to set DEPOSIT_ADDRESS and USDC_CONTRACT_ADDRESS.",
      503,
      { hint: e instanceof Error ? e.message : undefined },
    );
  }
  return ok({
    address,
    chainId: getChainId(),
    tokenAddress,
    minConfirmations: Number(process.env.MIN_CONFIRMATIONS ?? 12),
  });
});
