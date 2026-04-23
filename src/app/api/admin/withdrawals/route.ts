/**
 * GET /api/admin/withdrawals — admin queue of withdrawal requests.
 * Defaults to PENDING; use ?status=COMPLETED|REJECTED|CANCELLED for history.
 */

import { z } from "zod";
import { handler, ok, parseQuery } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { toWithdrawalDTO } from "@/lib/serialize";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "REJECTED", "CANCELLED"]).default("PENDING"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = handler(async (req) => {
  await requireAdmin();
  const q = parseQuery(req, QuerySchema);

  const rows = await prisma.withdrawal.findMany({
    where: { status: q.status },
    orderBy: { requestedAt: "asc" }, // oldest first so operator works FIFO
    take: q.limit,
    include: {
      user: { select: { id: true, email: true, username: true, name: true } },
    },
  });

  return ok({
    withdrawals: rows.map((w) => ({
      ...toWithdrawalDTO(w),
      user: {
        id: w.user.id,
        email: w.user.email,
        username: w.user.username,
        name: w.user.name,
      },
    })),
  });
});
