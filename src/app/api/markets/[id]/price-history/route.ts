/**
 * GET /api/markets/[id]/price-history?hours=24
 *
 * Returns a list of { ts, yesPrice, noPrice } snapshots from the
 * PriceSnapshot table for the given market, within the requested
 * lookback window (capped at 30 days).
 *
 * Public — market prices are not secret.
 */

import { z } from "zod";
import { handler, ok, err, parseQuery } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CUID_RE = /^c[a-z0-9]{20,}$/i;

const QuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(30 * 24).default(24),
});

export const GET = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { hours } = parseQuery(req, QuerySchema);

  // Allow cuid or slug, matching the market detail route's behaviour.
  const market = await prisma.market.findUnique({
    where: CUID_RE.test(id) ? { id } : { slug: id },
    select: { id: true },
  });
  if (!market) return err("NOT_FOUND", "Market not found", 404);

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await prisma.priceSnapshot.findMany({
    where: { marketId: market.id, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { yesPrice: true, noPrice: true, createdAt: true },
  });

  return ok({
    points: rows.map((r) => ({
      ts: r.createdAt.toISOString(),
      yesPrice: r.yesPrice.toString(),
      noPrice: r.noPrice.toString(),
    })),
    hours,
  });
});
