/**
 * GET /api/leaderboard — top traders by realized net P/L.
 *
 * Aggregates the Trade table: sum(netAmount on SELL) - sum(amount on BUY).
 * Joins user display fields. Public endpoint.
 *
 * For MVP this recomputes on every request. Fast enough under 100k trades.
 * Phase 4 will swap in a materialized view refreshed on trade commit.
 *
 * Query:
 *   limit     default 20, max 100
 *   timeframe "all" | "30d" | "7d"   (default "all")
 *
 * Response includes a `me` field with the requesting user's row (rank +
 * pnl + tradeCount) when authed, even if they sit outside the top
 * `limit` — drives the "Your rank" callout on the leaderboard page.
 */

import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseQuery } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth-helpers";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  timeframe: z.enum(["all", "30d", "7d"]).default("all"),
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

interface MeRow {
  rank: number;
  realizedPnl: string;
  tradeCount: number;
}

function timeframeCutoff(tf: "all" | "30d" | "7d"): Date | null {
  if (tf === "all") return null;
  const days = tf === "30d" ? 30 : 7;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

export const GET = handler(async (req) => {
  const { limit, timeframe } = parseQuery(req, QuerySchema);
  const me = await getCurrentUser();
  const cutoff = timeframeCutoff(timeframe);

  // Raw SQL: BUY contributes -amount to PnL, SELL contributes +netAmount.
  // Resolved-market winnings are credited as SELL trades by the resolver
  // (synthetic SELL @ 1.0) so this formula stays correct.
  //
  // The cutoff is interpolated by Prisma as a parameter — `null` skips
  // the time filter, otherwise we constrain `t.createdAt >= cutoff`.
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
    WHERE ${cutoff}::timestamp IS NULL OR t."createdAt" >= ${cutoff}::timestamp
    GROUP BY u.id, u.username, u.name, u.image
    HAVING COUNT(t.id) > 0
    ORDER BY SUM(CASE WHEN t.side = 'SELL' THEN t."netAmount" ELSE -t.amount END) DESC NULLS LAST
    LIMIT ${limit}
  `;

  const board = rows.map((r, idx) => ({
    rank: idx + 1,
    userId: r.userId,
    username: r.username,
    name: r.name,
    image: r.image,
    realizedPnl: r.realizedPnl,
    tradeCount: r.tradeCount,
  }));

  // Resolve `me`: if the requester is in the top `limit` we already have
  // their row; otherwise compute their rank with one extra aggregate.
  let meBoard: MeRow | null = null;
  if (me) {
    const inTop = board.find((b) => b.userId === me.id);
    if (inTop) {
      meBoard = {
        rank: inTop.rank,
        realizedPnl: inTop.realizedPnl,
        tradeCount: inTop.tradeCount,
      };
    } else {
      // RANK() over the full leaderboard — one round-trip, returns at
      // most 1 row. NULL `image` if user has never traded.
      const meRows = await prisma.$queryRaw<
        Array<{ rank: bigint; realizedPnl: string; tradeCount: number }>
      >`
        WITH ranked AS (
          SELECT
            u.id AS "userId",
            RANK() OVER (
              ORDER BY SUM(CASE WHEN t.side = 'SELL' THEN t."netAmount" ELSE -t.amount END) DESC NULLS LAST
            ) AS "rank",
            TO_CHAR(
              COALESCE(SUM(CASE WHEN t.side = 'SELL' THEN t."netAmount" ELSE -t.amount END), 0),
              'FM999999999990.000000'
            ) AS "realizedPnl",
            COUNT(t.id)::int AS "tradeCount"
          FROM "User" u
          INNER JOIN "Trade" t ON t."userId" = u.id
          WHERE ${cutoff}::timestamp IS NULL OR t."createdAt" >= ${cutoff}::timestamp
          GROUP BY u.id
          HAVING COUNT(t.id) > 0
        )
        SELECT "rank", "realizedPnl", "tradeCount" FROM ranked WHERE "userId" = ${me.id}
      `;
      if (meRows[0]) {
        meBoard = {
          rank: Number(meRows[0].rank),
          realizedPnl: meRows[0].realizedPnl,
          tradeCount: meRows[0].tradeCount,
        };
      }
    }
  }

  return ok({
    leaderboard: board,
    me: meBoard,
    timeframe,
  });
});
