/**
 * GET /api/markets/updates?since=<ISO timestamp>
 *
 * Returns markets whose `updatedAt` is strictly greater than `since`, so
 * clients can poll this endpoint every few seconds and reconcile their
 * local market list without refetching everything.
 *
 * Omitting `since` returns all markets updated in the last 60 seconds —
 * useful on reconnect after the tab was hidden.
 *
 * Public. No auth required; market state is all public.
 */

import { z } from "zod";
import { handler, ok, parseQuery } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toMarketDTO } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  since: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : new Date(Date.now() - 60_000)))
    .refine((d) => !isNaN(d.getTime()), "Invalid timestamp"),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const GET = handler(async (req) => {
  const { since, limit } = parseQuery(req, QuerySchema);

  const markets = await prisma.market.findMany({
    where: { updatedAt: { gt: since } },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  // Send the server's current time so the client uses OUR clock as the next
  // `since` — avoids drift between the browser and the DB.
  return ok({
    markets: markets.map(toMarketDTO),
    serverTime: new Date().toISOString(),
  });
});
