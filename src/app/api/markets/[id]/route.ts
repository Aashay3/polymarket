/**
 * GET /api/markets/[id] — single market detail.
 *
 * Accepts either a cuid OR a slug in the [id] segment. Returns the full
 * MarketDTO plus recent trade tape (last 20 trades) and basic volume
 * totals, so the detail page can render without a second round-trip.
 */

import { Decimal } from "decimal.js";
import { prisma } from "@/lib/prisma";
import { handler, ok, err } from "@/lib/api";
import { toMarketDTO, toTradeDTO } from "@/lib/serialize";
import { getBaselinesForMarkets } from "@/lib/price-history";
import { spotPrice } from "@/lib/amm";

export const dynamic = "force-dynamic";

const CUID_RE = /^c[a-z0-9]{20,}$/i;

export const GET = handler(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!id || id.length < 3) {
    return err("INVALID_ID", "Market id or slug required", 400);
  }

  const byId = CUID_RE.test(id);
  const market = await prisma.market.findUnique({
    where: byId ? { id } : { slug: id },
  });
  if (!market) return err("NOT_FOUND", "Market not found", 404);

  const [recentTrades, volumeAgg] = await Promise.all([
    prisma.trade.findMany({
      where: { marketId: market.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.trade.aggregate({
      where: { marketId: market.id },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const yesP = spotPrice({ yesShares: market.yesShares.toString(), noShares: market.noShares.toString() }, "YES");
  const baselines = await getBaselinesForMarkets(
    [market.id],
    new Map([[market.id, yesP]]),
    new Map([[market.id, new Decimal(1).sub(yesP)]]),
  );
  const change = baselines.get(market.id);

  const dto = toMarketDTO(market);
  dto.yesChangeBps = change?.yesChangeBps ?? null;
  dto.noChangeBps = change?.noChangeBps ?? null;

  return ok({
    market: dto,
    recentTrades: recentTrades.map(toTradeDTO),
    stats: {
      volume: (volumeAgg._sum.amount ?? 0).toString(),
      tradeCount: volumeAgg._count._all,
    },
  });
});
