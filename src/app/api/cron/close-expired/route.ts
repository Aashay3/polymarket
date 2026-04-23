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

  const result = await prisma.market.updateMany({
    where: { status: "OPEN", endTime: { lte: new Date() } },
    data: { status: "CLOSED" },
  });

  return ok({
    closed: result.count,
    ranAt: new Date().toISOString(),
  });
});
