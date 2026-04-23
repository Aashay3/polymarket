/**
 * GET /api/admin/audit-log — read-only access to the audit trail.
 *
 * Filters:
 *   action=market.resolve     exact action name
 *   actorId=cuid              who did it
 *   targetType=Withdrawal     "Market" | "Withdrawal" | "User" | "Deposit" | ...
 *   targetId=cuid             specific target
 *   cursor=<id>               pagination
 *   limit=1..200              default 50
 *
 * No destructive operations — the audit log is append-only, always.
 */

import { z } from "zod";
import { handler, ok, parseQuery } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  action: z.string().max(80).optional(),
  actorId: z.string().cuid().optional(),
  targetType: z.string().max(40).optional(),
  targetId: z.string().cuid().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const GET = handler(async (req) => {
  await requireAdmin();
  const q = parseQuery(req, QuerySchema);

  const where: Prisma.AuditLogWhereInput = {};
  if (q.action) where.action = q.action;
  if (q.actorId) where.actorId = q.actorId;
  if (q.targetType) where.targetType = q.targetType;
  if (q.targetId) where.targetId = q.targetId;

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    include: {
      actor: { select: { id: true, email: true, username: true, name: true, role: true } },
    },
  });

  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;

  return ok({
    entries: page.map((r) => ({
      id: r.id,
      action: r.action,
      actor: r.actor
        ? {
            id: r.actor.id,
            email: r.actor.email,
            username: r.actor.username,
            name: r.actor.name,
            role: r.actor.role,
          }
        : null,
      targetType: r.targetType,
      targetId: r.targetId,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});
