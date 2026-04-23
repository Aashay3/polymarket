/**
 * POST /api/admin/withdrawals/[id]/reject
 *
 * Admin rejects a PENDING withdrawal. Locked funds return to available;
 * the row flips to REJECTED with a human-readable reason and the
 * processing admin recorded. User is notified.
 */

import { Prisma } from "@prisma/client";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { RejectWithdrawalSchema } from "@/lib/schemas";
import { toWithdrawalDTO } from "@/lib/serialize";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const input = await parseBody(req, RejectWithdrawalSchema);

  const result = await prisma.$transaction(
    async (tx) => {
      const w = await tx.withdrawal.findUnique({ where: { id } });
      if (!w) throw new ApiError("NOT_FOUND", "Withdrawal not found", 404);
      if (w.status !== "PENDING") {
        throw new ApiError("INVALID_STATE", `Withdrawal is ${w.status}`, 400);
      }

      // Return the locked funds to available.
      await tx.balance.update({
        where: { userId: w.userId },
        data: {
          locked: { decrement: w.amount },
          available: { increment: w.amount },
        },
      });

      const updated = await tx.withdrawal.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: input.reason,
          processedById: admin.id,
          processedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "withdrawal.rejected",
          targetType: "Withdrawal",
          targetId: id,
          metadata: {
            amount: w.amount.toString(),
            reason: input.reason,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.notification.create({
        data: {
          userId: w.userId,
          type: "SYSTEM",
          title: "Withdrawal rejected",
          body: `Your withdrawal of ${w.amount.toString()} USDC was rejected: ${input.reason}. Funds have been returned to your balance.`,
          data: { withdrawalId: id, reason: input.reason } as Prisma.InputJsonValue,
        },
      });

      const newBalance = await tx.balance.findUnique({ where: { userId: w.userId } });
      return { withdrawal: updated, balance: newBalance };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  publish({
    type: "balance.changed",
    userId: result.withdrawal.userId,
    available: result.balance?.available.toString() ?? "0",
    locked: result.balance?.locked.toString() ?? "0",
  });
  publish({
    type: "notification.new",
    userId: result.withdrawal.userId,
    notification: {
      id: `withdrawal-reject-${id}`,
      type: "SYSTEM",
      title: "Withdrawal rejected",
      body: `Funds returned: ${input.reason}`,
      createdAt: new Date().toISOString(),
    },
  });

  return ok({ withdrawal: toWithdrawalDTO(result.withdrawal) });
});
