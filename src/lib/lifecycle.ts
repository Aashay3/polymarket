/**
 * In-process scheduler for market housekeeping.
 *
 * Runs on the long-lived Node server (kicked off by instrumentation.ts).
 * Two independent loops:
 *
 *   closeTick — every 60s. Finds OPEN markets whose endTime has passed,
 *               flips them to CLOSED, broadcasts market.updated over SSE.
 *
 *   snapshotTick — every 15 minutes. Writes a PriceSnapshot row per
 *                  OPEN market. Powers 24h-change badges, detail-page
 *                  sparkline charts, and future analytics.
 *
 * Idempotent: if two instances ever run in parallel, each loop is safe
 * — the close is an updateMany that's a no-op on the losing race, and
 * snapshots are just extra data points (slightly denser history, not
 * a correctness problem). Phase 8 will swap to a distributed lock if we
 * go multi-region.
 */

import { Decimal } from "decimal.js";
import { prisma } from "./prisma";
import { publish } from "./events";
import { toMarketDTO } from "./serialize";
import { spotPrice } from "./amm";

const CLOSE_TICK_MS = 60_000;
const SNAPSHOT_TICK_MS = 15 * 60_000;

declare global {
  var __lifecycleStarted: boolean | undefined;
}

async function closeTick(): Promise<void> {
  try {
    const expiring = await prisma.market.findMany({
      where: { status: "OPEN", endTime: { lte: new Date() } },
      select: { id: true },
    });
    if (expiring.length === 0) return;

    const ids = expiring.map((m) => m.id);
    await prisma.market.updateMany({
      where: { id: { in: ids } },
      data: { status: "CLOSED" },
    });

    const closed = await prisma.market.findMany({ where: { id: { in: ids } } });
    for (const m of closed) {
      publish({ type: "market.updated", market: toMarketDTO(m) });
    }

    console.log(`[lifecycle] closed ${closed.length} expired market(s)`);
  } catch (e) {
    // Never crash the scheduler — swallow and move on.
    console.error("[lifecycle] close tick failed", e);
  }
}

export async function snapshotTick(): Promise<number> {
  try {
    const open = await prisma.market.findMany({
      where: { status: "OPEN" },
      select: { id: true, yesShares: true, noShares: true },
    });
    if (open.length === 0) return 0;

    const rows = open.map((m) => {
      const yesP = spotPrice({ yesShares: m.yesShares.toString(), noShares: m.noShares.toString() }, "YES");
      const noP = new Decimal(1).sub(yesP);
      return {
        marketId: m.id,
        yesPrice: yesP.toFixed(8),
        noPrice: noP.toFixed(8),
      };
    });

    await prisma.priceSnapshot.createMany({ data: rows });
    console.log(`[lifecycle] wrote ${rows.length} price snapshot(s)`);
    return rows.length;
  } catch (e) {
    console.error("[lifecycle] snapshot tick failed", e);
    return 0;
  }
}

export function startLifecycleScheduler(): void {
  // Guard against multiple boots (Next.js dev reloads, etc.)
  if (globalThis.__lifecycleStarted) return;
  globalThis.__lifecycleStarted = true;

  console.log(
    `[lifecycle] close every ${CLOSE_TICK_MS / 1000}s, snapshot every ${SNAPSHOT_TICK_MS / 60_000}m`,
  );
  // Delay first run slightly so the DB connection pool is warm.
  setTimeout(() => {
    void closeTick();
    void snapshotTick();
    setInterval(() => void closeTick(), CLOSE_TICK_MS);
    setInterval(() => void snapshotTick(), SNAPSHOT_TICK_MS);
  }, 5_000);
}
