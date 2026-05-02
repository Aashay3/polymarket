/**
 * POST /api/me/password — change the signed-in user's password.
 *
 * Verifies the current password before applying the new one. Returns
 * 400 when the user is OAuth-only (no `passwordHash` set) so the UI
 * can prompt them to set one via the social-account-link flow instead.
 *
 * Audit-logged. Does NOT invalidate other sessions — that requires a
 * separate sessions endpoint (placeholder in /settings/security).
 */

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import {
  hashPassword,
  verifyPassword,
  PasswordPolicyError,
} from "@/lib/password";

export const dynamic = "force-dynamic";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: z.string().min(12).max(128),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must differ from current",
    path: ["newPassword"],
  });

export const POST = handler(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, ChangePasswordSchema);

  // Re-fetch via Prisma so we have the hash (session doesn't carry it).
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, passwordHash: true },
  });
  if (!dbUser) throw new ApiError("NOT_FOUND", "User missing", 404);

  if (!dbUser.passwordHash) {
    throw new ApiError(
      "OAUTH_ONLY",
      "This account doesn't have a password set. Sign in with your linked provider, then add one in Settings.",
      400,
    );
  }

  const valid = await verifyPassword(input.currentPassword, dbUser.passwordHash);
  if (!valid) {
    throw new ApiError("WRONG_PASSWORD", "Current password is incorrect", 400);
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
      where: { id: user.id },
      data: { passwordHash: newHash },
    }),
    prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "user.password.change",
        targetType: "User",
        targetId: user.id,
        metadata: {} as Prisma.InputJsonValue,
      },
    }),
  ]);

  return ok({ ok: true });
});
