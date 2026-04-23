/**
 * GET /api/notifications — current user's notifications, newest first.
 * POST /api/notifications — mark one or many as read.
 *
 * The `body` is already free-form text; `data` carries structured payload
 * (like marketId). Unread count is whatever has `readAt === null`.
 */

import { z } from "zod";
import { handler, ok, parseBody, parseQuery } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
});

export const GET = handler(async (req) => {
  const user = await requireUser();
  const q = parseQuery(req, ListQuery);

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId: user.id,
        ...(q.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: q.limit,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return ok({
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  });
});

const MarkReadBody = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100).optional(),
  markAll: z.boolean().optional(),
}).refine((v) => v.ids || v.markAll, { message: "Provide `ids` or `markAll: true`" });

export const POST = handler(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, MarkReadBody);

  const result = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
      ...(input.ids ? { id: { in: input.ids } } : {}),
    },
    data: { readAt: new Date() },
  });

  return ok({ markedRead: result.count });
});
