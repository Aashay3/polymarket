/**
 * Cron: close markets whose endTime has passed.
 *
 * Transitions every OPEN market with endTime <= now to CLOSED. Doesn't
 * resolve (that needs an admin decision) — just stops accepting trades.
 *
 * Scheduled in vercel.json. Protected by the CRON_SECRET env var; Vercel's
 * Cron headers include Authorization: Bearer ${CRON_SECRET} when configured.
 * Any request without that header is rejected with 401.
 *
 * Safe to run frequently; the UPDATE is a no-op when nothing is expired.
 */

import { handler, ok, err } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/events";
import { toMarketDTO } from "@/lib/serialize";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // If unset, refuse in production; allow in dev so local triggers work.
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export const GET = handler(async (req) => {
  if (!isAuthorized(req)) return err("UNAUTHORIZED", "Cron secret required", 401);

  // Fetch + update + publish. We fetch first so we can emit events for the
  // specific markets that transitioned.
  const expiring = await prisma.market.findMany({
    where: { status: "OPEN", endTime: { lte: new Date() } },
    select: { id: true },
  });
  if (expiring.length === 0) {
    return ok({ closed: 0, ranAt: new Date().toISOString() });
  }

  const ids = expiring.map((m) => m.id);
  await prisma.market.updateMany({
    where: { id: { in: ids } },
    data: { status: "CLOSED" },
  });

  const closed = await prisma.market.findMany({ where: { id: { in: ids } } });
  for (const m of closed) {
    publish({ type: "market.updated", market: toMarketDTO(m) });
  }

  return ok({
    closed: closed.length,
    ranAt: new Date().toISOString(),
  });
});
