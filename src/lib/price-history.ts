/**
 * Helpers for computing 24-hour price change on market listings.
 *
 * The list endpoint has to avoid an N+1: we can't issue a per-market
 * snapshot query or a 100-market page does 100 round-trips. Instead we
 * pull the oldest snapshot newer than (now - 24h) for each market in a
 * single query using DISTINCT ON (Postgres-specific). If no snapshot is
 * available (new market, no scheduler yet), we gracefully return null
 * for the change — the UI renders that as "new".
 */

import { Decimal } from "decimal.js";
import { prisma } from "./prisma";

export interface PriceChange {
  yesPrice24hAgo: string | null; // null when no baseline is available
  noPrice24hAgo: string | null;
  yesChangeBps: number | null;   // 100 = 1.00%
  noChangeBps: number | null;
}

/**
 * For each marketId in the input, return the earliest PriceSnapshot
 * within the 24h window — that's our "24 hours ago" baseline.
 */
export async function getBaselinesForMarkets(
  marketIds: string[],
  nowYes: Map<string, Decimal>,
  nowNo: Map<string, Decimal>,
): Promise<Map<string, PriceChange>> {
  const out = new Map<string, PriceChange>();
  for (const id of marketIds) {
    out.set(id, { yesPrice24hAgo: null, noPrice24hAgo: null, yesChangeBps: null, noChangeBps: null });
  }
  if (marketIds.length === 0) return out;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // DISTINCT ON: the first snapshot per market (ordered by createdAt ASC)
  // within the 24h window. That's the "24 hours ago" baseline.
  const rows = await prisma.$queryRaw<
    { marketId: string; yesPrice: string; noPrice: string }[]
  >`
    SELECT DISTINCT ON ("marketId")
      "marketId", "yesPrice"::text AS "yesPrice", "noPrice"::text AS "noPrice"
    FROM "PriceSnapshot"
    WHERE "marketId" = ANY(${marketIds})
      AND "createdAt" >= ${since}
    ORDER BY "marketId", "createdAt" ASC
  `;

  for (const r of rows) {
    const yesThen = new Decimal(r.yesPrice);
    const noThen = new Decimal(r.noPrice);
    const yesNow = nowYes.get(r.marketId);
    const noNow = nowNo.get(r.marketId);
    out.set(r.marketId, {
      yesPrice24hAgo: yesThen.toFixed(6),
      noPrice24hAgo: noThen.toFixed(6),
      yesChangeBps:
        yesNow && yesThen.gt(0)
          ? Math.round(yesNow.sub(yesThen).div(yesThen).mul(10000).toNumber())
          : null,
      noChangeBps:
        noNow && noThen.gt(0)
          ? Math.round(noNow.sub(noThen).div(noThen).mul(10000).toNumber())
          : null,
    });
  }

  return out;
}
