/**
 * Trading-streak compute.
 *
 * Streak = consecutive UTC days with at least one trade, ending today
 * OR yesterday. Yesterday-counts because someone who traded right
 * before midnight UTC and hasn't logged in yet today shouldn't see
 * their streak reset to zero.
 *
 * Computed on-demand from the Trade table — no schema change needed.
 * Trade(userId, createdAt) is indexed, so the underlying SELECT is
 * cheap. If /api/me throughput becomes a hot path, cache the result
 * in `User.streakDays` and update it on every successful trade write.
 */

import { prisma } from "./prisma";

interface StreakRow {
  day: Date;
}

/**
 * Returns:
 *   - days     — consecutive trading days ending today (or yesterday)
 *   - tradedToday — whether a trade has been recorded since UTC midnight
 *
 * `days` is 0 when the user hasn't traded today OR yesterday.
 */
export async function computeStreak(
  userId: string,
): Promise<{ days: number; tradedToday: boolean }> {
  // Pull up to 60 distinct trade days ending now. Bounded so a heavy
  // user doesn't hit a runaway scan; 60 days covers any realistic
  // streak the UI would care about.
  const rows = await prisma.$queryRaw<StreakRow[]>`
    SELECT DISTINCT DATE_TRUNC('day', t."createdAt" AT TIME ZONE 'UTC') AS "day"
    FROM "Trade" t
    WHERE t."userId" = ${userId}
    ORDER BY "day" DESC
    LIMIT 60
  `;

  if (rows.length === 0) return { days: 0, tradedToday: false };

  const today = utcDayStart(new Date());
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);

  const tradeDays = rows.map((r) => utcDayStart(r.day).getTime());
  const tradedToday = tradeDays.includes(today.getTime());

  // The streak's most-recent day must be today or yesterday. If
  // neither, no active streak.
  let cursor: Date;
  let i: number;
  if (tradeDays[0] === today.getTime()) {
    cursor = new Date(today);
    i = 0;
  } else if (tradeDays[0] === yesterday.getTime()) {
    cursor = new Date(yesterday);
    i = 0;
  } else {
    return { days: 0, tradedToday: false };
  }

  let streak = 0;
  while (i < tradeDays.length && tradeDays[i] === cursor.getTime()) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    i += 1;
  }

  return { days: streak, tradedToday };
}

function utcDayStart(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}
