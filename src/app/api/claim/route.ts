/**
 * POST /api/claim — claim payout on a resolved winning position.
 *
 * Idempotent. In the off-chain flow this is purely informational:
 * the resolution worker already credited balance + filed a synthetic
 * SELL trade at price 1.0 the moment the admin called
 * /api/admin/markets/[id]/resolve. So the response just confirms
 * "yes, this is yours, here's how much you got."
 *
 * Forward-compat: when wallet-connect ships and user trades move
 * on-chain, this endpoint becomes the place to either
 *   (a) build the calldata for the client to sign against
 *       PredictionMarket.claim(marketId), or
 *   (b) sponsor the gas via the admin signer.
 *
 * Body: { marketId, outcome }
 * Returns: { paid: true, amount: <USDC string>, alreadyCredited: boolean }
 */

import { z } from "zod";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { OutcomeSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const ClaimSchema = z.object({
  marketId: z.string().cuid(),
  outcome: OutcomeSchema,
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, ClaimSchema);

  const market = await prisma.market.findUnique({
    where: { id: input.marketId },
    select: { id: true, status: true, winningOutcome: true, question: true },
  });
  if (!market) throw new ApiError("NOT_FOUND", "Market not found", 404);
  if (market.status !== "RESOLVED" || !market.winningOutcome) {
    throw new ApiError("NOT_RESOLVED", "Market hasn't been resolved yet", 400);
  }
  if (input.outcome !== market.winningOutcome) {
    throw new ApiError("LOSING_SIDE", "This position lost; nothing to claim", 400);
  }

  const position = await prisma.position.findFirst({
    where: { userId: user.id, marketId: input.marketId, outcome: input.outcome },
  });
  if (!position) {
    throw new ApiError("NO_POSITION", "You don't hold this position", 400);
  }

  // Off-chain payouts happen during /api/admin/.../resolve; the position
  // is already settled and the funds are in the user's balance. We
  // report the payout amount that was credited (1 USDC × winning shares).
  const sharesAtResolution = position.shares.toString();
  const payout = sharesAtResolution; // 1 USDC per share
  return ok({
    paid: true,
    amount: payout,
    alreadyCredited: position.settled,
    marketQuestion: market.question,
  });
});
