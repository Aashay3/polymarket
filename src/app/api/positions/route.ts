/**
 * GET /api/positions — authenticated user's open positions with market state
 * and mark-to-market P/L computed on the fly.
 *
 * Returns every Position joined with its Market, plus:
 *   currentPrice  — AMM spot price right now
 *   markValue     — shares * currentPrice
 *   unrealizedPnl — markValue − costBasis
 */

import { Decimal } from "decimal.js";
import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { spotPrice } from "@/lib/amm";
import { toMarketDTO, toPositionDTO } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await requireUser();

  const positions = await prisma.position.findMany({
    where: { userId: user.id, shares: { gt: 0 } },
    include: { market: true },
    orderBy: { updatedAt: "desc" },
  });

  const items = positions.map((p) => {
    const price = spotPrice(
      { yesShares: p.market.yesShares.toString(), noShares: p.market.noShares.toString() },
      p.outcome,
    );
    const shares = new Decimal(p.shares.toString());
    const cost = new Decimal(p.costBasis.toString());
    const markValue = shares.mul(price);
    const unrealized = markValue.sub(cost);
    return {
      ...toPositionDTO(p),
      market: toMarketDTO(p.market),
      currentPrice: price.toFixed(6),
      markValue: markValue.toFixed(6),
      unrealizedPnl: unrealized.toFixed(6),
    };
  });

  const totals = items.reduce(
    (acc, i) => ({
      costBasis: acc.costBasis.add(i.costBasis),
      markValue: acc.markValue.add(i.markValue),
    }),
    { costBasis: new Decimal(0), markValue: new Decimal(0) },
  );

  return ok({
    positions: items,
    totals: {
      costBasis: totals.costBasis.toFixed(6),
      markValue: totals.markValue.toFixed(6),
      unrealizedPnl: totals.markValue.sub(totals.costBasis).toFixed(6),
    },
  });
});
