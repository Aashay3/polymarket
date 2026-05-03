/**
 * POST /api/support — submit a support ticket.
 *
 * Persists to AuditLog with action="support.ticket". For now the
 * "inbox" is an admin SQL query; route to an external help-desk
 * (Help Scout / Zendesk / a Slack channel) by reading the AuditLog
 * stream when there's volume to triage.
 *
 * Public — no auth required (so unauthenticated users can ask).
 * Rate-limited per-IP because email + name fields are spammable.
 */

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  checkRateLimit,
  clientIdFromRequest,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const SupportTicketSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  category: z.enum([
    "Trade Issue",
    "Market Resolution",
    "Account & Security",
    "Other",
  ]),
  message: z.string().trim().min(10).max(4000),
});

// Reuse the signup limit shape — same blast radius (1 unauthenticated
// POST per N seconds is plenty).
const TICKET_LIMIT = RATE_LIMITS.signup;

export const POST = handler(async (req) => {
  const ip = clientIdFromRequest(req);
  const rl = checkRateLimit(`support:${ip}`, TICKET_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: { message: "Too many requests. Try again shortly." } },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))),
        },
      },
    );
  }

  const input = await parseBody(req, SupportTicketSchema);
  const me = await getCurrentUser();

  await prisma.auditLog.create({
    data: {
      actorId: me?.id ?? null,
      action: "support.ticket",
      targetType: "SupportTicket",
      metadata: {
        name: input.name,
        email: input.email,
        category: input.category,
        message: input.message,
      } as Prisma.InputJsonValue,
      ipAddress: ip,
    },
  });

  return ok({ received: true });
});
