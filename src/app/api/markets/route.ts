/**
 * GET /api/markets — list markets with filters + cursor pagination.
 *
 * Query params (all optional):
 *   status=OPEN|CLOSED|RESOLVED|VOIDED
 *   category=Crypto
 *   search=bitcoin            (ILIKE match on question)
 *   sort=volume|endTime|createdAt   (default: createdAt)
 *   order=asc|desc                  (default: desc)
 *   cursor=<cuid>                   (opaque pagination cursor)
 *   limit=1..100                    (default: 20)
 *
 * Returns { markets: MarketDTO[], nextCursor: string | null }.
 * Public — no auth required.
 */

import { prisma } from "@/lib/prisma";
import { handler, ok, parseQuery } from "@/lib/api";
import { MarketListQuerySchema } from "@/lib/schemas";
import { toMarketDTO } from "@/lib/serialize";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  const q = parseQuery(req, MarketListQuerySchema);

  const where: Prisma.MarketWhereInput = {};
  if (q.status) where.status = q.status;
  if (q.category) where.category = q.category;
  if (q.search) where.question = { contains: q.search, mode: "insensitive" };

  // Sort field mapping. `volume` isn't stored directly; proxy by Trade.amount
  // SUM for now via an aggregate. Keep it simple for MVP — sort by createdAt
  // when volume requested, with a TODO for a denormalized volume column.
  const orderBy: Prisma.MarketOrderByWithRelationInput =
    q.sort === "endTime"
      ? { endTime: q.order }
      : { createdAt: q.order };

  // Cursor pagination: fetch limit+1 to detect a next page.
  const markets = await prisma.market.findMany({
    where,
    orderBy,
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });

  const hasMore = markets.length > q.limit;
  const page = hasMore ? markets.slice(0, q.limit) : markets;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return ok({
    markets: page.map(toMarketDTO),
    nextCursor,
  });
});
