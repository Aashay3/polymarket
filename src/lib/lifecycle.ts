/**
 * In-process market lifecycle scheduler.
 *
 * Runs on the long-lived Node server (started from instrumentation.ts).
 * Every minute it finds OPEN markets whose endTime has passed, flips
 * them to CLOSED, and broadcasts a market.updated event so every
 * connected SSE client sees the state change immediately.
 *
 * Idempotent: if two instances ever run in parallel, the updateMany is
 * a no-op on the losing race. For the launch we only run one instance,
 * so this is fine; Phase 8 will swap to a distributed lock if we go
 * multi-region.
 */

import { prisma } from "./prisma";
import { publish } from "./events";
import { toMarketDTO } from "./serialize";

const TICK_MS = 60_000;

declare global {
  var __lifecycleStarted: boolean | undefined;
}

async function tick(): Promise<void> {
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
    console.error("[lifecycle] tick failed", e);
  }
}

export function startLifecycleScheduler(): void {
  // Guard against multiple boots (Next.js dev reloads, etc.)
  if (globalThis.__lifecycleStarted) return;
  globalThis.__lifecycleStarted = true;

  console.log(`[lifecycle] scheduler running every ${TICK_MS / 1000}s`);
  // Delay first run slightly so the DB connection is ready.
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), TICK_MS);
  }, 5_000);
}
