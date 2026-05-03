/**
 * POST /api/auth/reset-password — consume a reset token, set a new password.
 *
 * Validates the raw token by hashing it and looking up the matching
 * row. Token must be unused and not expired. On success, marks the
 * token as `usedAt = now()` (so it can't be replayed) and updates
 * the user's password hash atomically with the token consumption.
 *
 * Audit-logged. Does NOT log the user in — they get a "password
 * reset, please sign in" affordance and bounce back through the
 * normal sign-in flow.
 */

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { hashPassword, PasswordPolicyError } from "@/lib/password";

export const dynamic = "force-dynamic";

const ResetPasswordSchema = z.object({
  token: z.string().min(20).max(128),
  newPassword: z.string().min(12).max(128),
});

function tokenHash(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const POST = handler(async (req) => {
  const input = await parseBody(req, ResetPasswordSchema);

  const hashed = tokenHash(input.token);
  const tokenRow = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashed },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!tokenRow) {
    throw new ApiError("INVALID_TOKEN", "Reset link is invalid", 400);
  }
  if (tokenRow.usedAt) {
    throw new ApiError("USED_TOKEN", "This reset link has already been used", 400);
  }
  if (tokenRow.expiresAt.getTime() <= Date.now()) {
    throw new ApiError("EXPIRED_TOKEN", "Reset link has expired — request a new one", 400);
  }

  let newHash: string;
  try {
    newHash = await hashPassword(input.newPassword);
  } catch (err) {
    if (err instanceof PasswordPolicyError) {
      throw new ApiError("WEAK_PASSWORD", err.message, 400);
    }
    throw err;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRow.userId },
      data: { passwordHash: newHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenRow.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding tokens for the same user —
    // attacker can't reuse a previously leaked token after a reset.
    prisma.passwordResetToken.updateMany({
      where: {
        userId: tokenRow.userId,
        usedAt: null,
        id: { not: tokenRow.id },
      },
      data: { usedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: tokenRow.userId,
        action: "auth.password_reset.completed",
        targetType: "User",
        targetId: tokenRow.userId,
        metadata: {} as Prisma.InputJsonValue,
      },
    }),
  ]);

  return ok({ ok: true });
});
