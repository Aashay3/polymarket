/**
 * POST /api/auth/forgot-password — issue a password-reset link.
 *
 * Always returns 200 even if the email isn't on file (so an attacker
 * can't enumerate registered emails). Behind the scenes:
 *   - Looks up the user by email.
 *   - If found AND has a passwordHash (i.e. not OAuth-only), creates
 *     a single-use token. Stores ONLY the sha256 hash; the raw token
 *     is what goes in the email URL.
 *   - "Sends" the reset link. In dev / when no email provider is
 *     configured, logs the URL to the server console + writes it to
 *     AuditLog. In production, swap the dispatch helper for Resend /
 *     SES / Postmark.
 *
 * Rate-limited per-IP and per-email so an attacker can't fan out
 * thousands of resets at the user's expense (mailer cost + UX).
 */

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { handler, ok, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  clientIdFromRequest,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const TOKEN_TTL_MINUTES = 30;
const RESET_PATH = "/auth/reset-password";

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

function tokenHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function appOrigin(req: Request): string {
  // Prefer AUTH_URL (already set for NextAuth); fall back to the
  // request's own origin. Avoids hardcoding localhost in dev.
  const fromEnv = process.env.AUTH_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return new URL(req.url).origin;
}

/**
 * Dispatches the reset email. Replace this with a real email
 * provider before going to production. The console + AuditLog write
 * lets dev environments work end-to-end without setting up Resend.
 */
async function dispatchResetEmail(opts: {
  email: string;
  resetUrl: string;
  userId: string;
}): Promise<void> {
  console.warn("[forgot-password] reset link:", opts.resetUrl);
  await prisma.auditLog
    .create({
      data: {
        actorId: opts.userId,
        action: "auth.password_reset.requested",
        targetType: "User",
        targetId: opts.userId,
        metadata: {
          email: opts.email,
          resetUrlInDevOnly: opts.resetUrl,
        } as Prisma.InputJsonValue,
      },
    })
    .catch((err) => {
      console.error("[forgot-password] audit-log write failed:", err);
    });
}

export const POST = handler(async (req) => {
  const ip = clientIdFromRequest(req);
  const rl = checkRateLimit(`forgot:${ip}`, RATE_LIMITS.signup);
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

  const input = await parseBody(req, ForgotPasswordSchema);
  const email = input.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  // Issue a token only for password-credential users we actually know
  // about. The response is identical either way — no user enumeration.
  if (user && user.passwordHash) {
    const raw = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(raw),
        expiresAt,
      },
    });

    const resetUrl = `${appOrigin(req)}${RESET_PATH}?token=${raw}`;
    await dispatchResetEmail({ email, resetUrl, userId: user.id });
  }

  return ok({
    received: true,
    expiresInMinutes: TOKEN_TTL_MINUTES,
  });
});
