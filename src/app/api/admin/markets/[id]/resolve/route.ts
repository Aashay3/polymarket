/**
 * POST /api/admin/markets/[id]/resolve — resolve a market and pay winners.
 *
 * For every Position on the winning outcome with shares > 0:
 *   - insert a synthetic SELL Trade at price 1.0 (for PnL / leaderboard)
 *   - credit balance.available by (shares * 1 USDC)
 *   - mark position settled
 *
 * Losers are simply marked settled. All settlement happens in one
 * Serializable transaction.
 *
 * Body: { outcome: YES|NO, resolutionNote? }
 */

import { Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { z } from "zod";
import { OutcomeSchema } from "@/lib/schemas";
import { toMarketDTO } from "@/lib/serialize";
import { publish } from "@/lib/events";
import { resolveMarketOnChain, mirrorOnChain } from "@/lib/contracts/admin-actions";

export const dynamic = "force-dynamic";

const ResolveBody = z.object({
  outcome: OutcomeSchema,
  resolutionNote: z.string().max(2000).optional(),
});

export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const input = await parseBody(req, ResolveBody);

  const result = await prisma.$transaction(
    async (tx) => {
      const market = await tx.market.findUnique({ where: { id } });
      if (!market) throw new ApiError("NOT_FOUND", "Market not found", 404);
      if (market.status !== "OPEN") {
        throw new ApiError("ALREADY_RESOLVED", `Market is ${market.status}`, 400);
      }

      // Load open positions on both sides.
      const positions = await tx.position.findMany({
        where: { marketId: market.id, shares: { gt: 0 }, settled: false },
      });

      let totalPaid = new Decimal(0);
      let winnersCount = 0;
      // Collect per-user summaries so we can broadcast events AFTER commit.
      const winnerPayouts: Array<{ userId: string; payout: string; notificationTitle: string; notificationBody: string }> = [];

      for (const pos of positions) {
        const shares = new Decimal(pos.shares.toString());
        const isWinner = pos.outcome === input.outcome;

        if (isWinner && shares.gt(0)) {
          // Payout: 1 USDC per winning share.
          const payout = shares;
          const costBasis = new Decimal(pos.costBasis.toString());

          await tx.balance.upsert({
            where: { userId: pos.userId },
            update: { available: { increment: payout.toFixed(6) } },
            create: { userId: pos.userId, available: payout.toFixed(6), locked: 0 },
          });

          // Record synthetic SELL at price 1.0 so leaderboard & activity show it.
          await tx.trade.create({
            data: {
              userId: pos.userId,
              marketId: market.id,
              outcome: pos.outcome,
              side: "SELL",
              shares: shares.toFixed(18),
              pricePerShare: "1.00000000",
              amount: payout.toFixed(6),
              fee: "0.000000",
              netAmount: payout.toFixed(6),
            },
          });

          totalPaid = totalPaid.add(payout);
          winnersCount += 1;

          const notifTitle = "You won!";
          const notifBody = `+${payout.toFixed(2)} USDC on "${market.question}" (net P/L ${payout.sub(costBasis).toFixed(2)})`;
          winnerPayouts.push({
            userId: pos.userId,
            payout: payout.toFixed(6),
            notificationTitle: notifTitle,
            notificationBody: notifBody,
          });

          await tx.notification.create({
            data: {
              userId: pos.userId,
              type: "POSITION_WON",
              title: notifTitle,
              body: notifBody,
              data: { marketId: market.id, payout: payout.toFixed(6) } as Prisma.InputJsonValue,
            },
          }).catch(() => { /* notification failures shouldn't block settlement */ });
        }

        await tx.position.update({
          where: { id: pos.id },
          data: { settled: true, settledAt: new Date() },
        });
      }

      const resolvedMarket = await tx.market.update({
        where: { id: market.id },
        data: {
          status: "RESOLVED",
          winningOutcome: input.outcome,
          resolutionNote: input.resolutionNote ?? null,
          resolvedAt: new Date(),
          resolvedById: admin.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "market.resolve",
          targetType: "Market",
          targetId: market.id,
          metadata: {
            outcome: input.outcome,
            winnersCount,
            totalPaid: totalPaid.toFixed(6),
          } as Prisma.InputJsonValue,
        },
      });

      return { market: resolvedMarket, winnersCount, totalPaid, winnerPayouts };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 },
  );

  // Best-effort on-chain mirror of the resolution. Off-chain is the
  // source of truth for payouts (already disbursed in the DB tx); the
  // chain call just records the outcome on-chain for provenance.
  const chainTx = await mirrorOnChain("resolve", () =>
    resolveMarketOnChain({ marketUuid: result.market.id, outcome: input.outcome }),
  );

  const marketDTO = toMarketDTO(result.market);
  publish({ type: "market.resolved", market: marketDTO });
  publish({ type: "market.updated", market: marketDTO });
  // Per-winner events so each affected user's UI updates instantly.
  for (const w of result.winnerPayouts) {
    publish({
      type: "notification.new",
      userId: w.userId,
      notification: {
        id: `payout-${result.market.id}-${w.userId}`,
        type: "POSITION_WON",
        title: w.notificationTitle,
        body: w.notificationBody,
        createdAt: new Date().toISOString(),
      },
    });
    // Balance/position deltas: client will refetch on the notification or
    // on next action; we could publish exact new values by fetching here
    // post-tx, but one round-trip per winner is cheap compared to staleness.
  }

  return ok({
    market: marketDTO,
    winnersCount: result.winnersCount,
    totalPaid: result.totalPaid.toFixed(6),
    chainTxHash: chainTx?.txHash ?? null,
  });
});
