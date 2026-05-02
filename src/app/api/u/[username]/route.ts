/**
 * GET /api/u/[username] — public profile data.
 *
 * Public endpoint (no auth required). Returns identity fields, derived
 * trading stats (realized PnL, trade count, win rate, open positions,
 * leaderboard rank — all-time), and the most recent 20 trades.
 *
 * Privacy: the User model has no `isPublic` flag yet, so every user
 * with a username is implicitly public. When that flag lands, gate
 * this endpoint on it (and 404 otherwise).
 *
 * The `leaderboardRank` is a RANK() over the all-time PnL aggregate
 * — same shape as the /api/leaderboard `me` callout.
 */

import { handler, ok, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RankRow {
  rank: bigint;
  realizedPnl: string;
  tradeCount: number;
}

interface WinRateRow {
  resolvedPositions: number;
  winningPositions: number;
}

export const GET = handler(async (_req, ctx: { params: Promise<{ username: string }> }) => {
  const { username } = await ctx.params;
  if (!username || username.length > 64) {
    throw new ApiError("INVALID_USERNAME", "Bad username", 400);
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      createdAt: true,
    },
  });
  if (!user) throw new ApiError("NOT_FOUND", "User not found", 404);

  // Realized-PnL rank over all time. Same expression as
  // /api/leaderboard so numbers line up between the two pages.
  const rankRows = await prisma.$queryRaw<RankRow[]>`
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
      GROUP BY u.id
      HAVING COUNT(t.id) > 0
    )
    SELECT "rank", "realizedPnl", "tradeCount" FROM ranked WHERE "userId" = ${user.id}
  `;
  const rankRow = rankRows[0];

  // Win rate: settled positions on resolved markets where the user's
  // outcome matches the winning outcome. NULL-safe and zero-trade-safe.
  const winRows = await prisma.$queryRaw<WinRateRow[]>`
    SELECT
      COUNT(*)::int AS "resolvedPositions",
      COUNT(*) FILTER (WHERE p.outcome = m."winningOutcome")::int AS "winningPositions"
    FROM "Position" p
    INNER JOIN "Market" m ON m.id = p."marketId"
    WHERE p."userId" = ${user.id}
      AND p.settled = true
      AND m.status = 'RESOLVED'
      AND m."winningOutcome" IS NOT NULL
  `;
  const wr = winRows[0] ?? { resolvedPositions: 0, winningPositions: 0 };
  const winRate =
    wr.resolvedPositions > 0
      ? wr.winningPositions / wr.resolvedPositions
      : null;

  // Currently-open positions count (helpful "active in N markets" line).
  const openPositions = await prisma.position.count({
    where: { userId: user.id, settled: false, shares: { gt: 0 } },
  });

  // Recent trade tape — last 20, with market question denormalised.
  const trades = await prisma.trade.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      market: { select: { id: true, question: true, slug: true, status: true } },
    },
  });

  return ok({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      memberSince: user.createdAt.toISOString(),
    },
    stats: {
      realizedPnl: rankRow?.realizedPnl ?? "0.000000",
      tradeCount: rankRow?.tradeCount ?? 0,
      winRate, // null when no resolved positions yet
      openPositions,
      leaderboardRank: rankRow ? Number(rankRow.rank) : null,
      resolvedPositions: wr.resolvedPositions,
    },
    recentTrades: trades.map((t) => ({
      id: t.id,
      marketId: t.market.id,
      marketQuestion: t.market.question,
      marketSlug: t.market.slug,
      marketStatus: t.market.status,
      outcome: t.outcome,
      side: t.side,
      shares: t.shares.toString(),
      pricePerShare: t.pricePerShare.toString(),
      amount: t.amount.toString(),
      netAmount: t.netAmount.toString(),
      createdAt: t.createdAt.toISOString(),
    })),
  });
});
