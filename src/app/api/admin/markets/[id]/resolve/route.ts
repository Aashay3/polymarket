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

          await tx.notification.create({
            data: {
              userId: pos.userId,
              type: "POSITION_WON",
              title: "You won!",
              body: `+${payout.toFixed(2)} USDC on "${market.question}" (net P/L ${payout.sub(costBasis).toFixed(2)})`,
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

      return { market: resolvedMarket, winnersCount, totalPaid };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 },
  );

  return ok({
    market: toMarketDTO(result.market),
    winnersCount: result.winnersCount,
    totalPaid: result.totalPaid.toFixed(6),
  });
});
