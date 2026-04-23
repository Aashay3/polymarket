/**
 * GET /api/deposits/address — returns the canonical deposit address.
 *
 * Public: showing the deposit address doesn't leak anything sensitive,
 * and letting unauthenticated visitors see it is useful for onboarding
 * copy. The server enforces sender-must-match-linked-wallet at credit
 * time, so just knowing the address doesn't let anyone steal credit.
 */

import { handler, ok } from "@/lib/api";
import { getDepositAddress, getChainId, getUsdcAddress } from "@/lib/chain";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  return ok({
    address: getDepositAddress(),
    chainId: getChainId(),
    tokenAddress: getUsdcAddress(),
    minConfirmations: Number(process.env.MIN_CONFIRMATIONS ?? 12),
  });
});
