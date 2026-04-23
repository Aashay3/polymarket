/**
 * GET /api/leaderboard — top traders by realized net P/L.
 *
 * Aggregates the Trade table: sum(netAmount on SELL) - sum(amount on BUY).
 * Joins user display fields. Public endpoint.
 *
 * For MVP this recomputes on every request. Fast enough under 100k trades.
 * Phase 4 will swap in a materialized view refreshed on trade commit.
 *
 * Query: limit (default 20, max 100).
 */

import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseQuery } from "@/lib/api";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dynamic = "force-dynamic";

interface Row {
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  realizedPnl: string;
  tradeCount: number;
}

export const GET = handler(async (req) => {
  const { limit } = parseQuery(req, QuerySchema);

  // Raw SQL: weighted P/L per user.
  // BUY contributes -amount to PnL (money out). SELL contributes +netAmount.
  // Resolved-market winnings are credited as SELL trades by the resolution
  // worker (Phase 4) so this formula stays correct.
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      u.id          AS "userId",
      u.username    AS "username",
      u.name        AS "name",
      u.image       AS "image",
      TO_CHAR(
        COALESCE(SUM(CASE WHEN t.side = 'SELL' THEN t."netAmount" ELSE -t.amount END), 0),
        'FM999999999990.000000'
      ) AS "realizedPnl",
      COUNT(t.id)::int AS "tradeCount"
    FROM "User" u
    INNER JOIN "Trade" t ON t."userId" = u.id
    GROUP BY u.id, u.username, u.name, u.image
    HAVING COUNT(t.id) > 0
    ORDER BY SUM(CASE WHEN t.side = 'SELL' THEN t."netAmount" ELSE -t.amount END) DESC NULLS LAST
    LIMIT ${limit}
  `;

  return ok({
    leaderboard: rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.userId,
      username: r.username,
      name: r.name,
      image: r.image,
      realizedPnl: r.realizedPnl,
      tradeCount: r.tradeCount,
    })),
  });
});
