/**
 * POST /api/admin/withdrawals/[id]/complete
 *
 * Admin marks a PENDING withdrawal as COMPLETED after manually sending
 * USDC from the operations wallet. Body carries the on-chain txHash.
 *
 * Atomic: balance.locked decreases, totalWithdrawn increases, withdrawal
 * row flips to COMPLETED with txHash + processedBy. User is notified.
 */

import { Prisma } from "@prisma/client";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { CompleteWithdrawalSchema } from "@/lib/schemas";
import { toWithdrawalDTO } from "@/lib/serialize";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export const POST = handler(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const input = await parseBody(req, CompleteWithdrawalSchema);

  // Reject if the txHash has already been attached to another withdrawal.
  const duplicateTx = await prisma.withdrawal.findUnique({ where: { txHash: input.txHash } });
  if (duplicateTx && duplicateTx.id !== id) {
    throw new ApiError("DUPLICATE_TX", "This transaction hash is already attached to another withdrawal", 409);
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const w = await tx.withdrawal.findUnique({ where: { id } });
      if (!w) throw new ApiError("NOT_FOUND", "Withdrawal not found", 404);
      if (w.status !== "PENDING") {
        throw new ApiError("INVALID_STATE", `Withdrawal is ${w.status}`, 400);
      }

      // Release from locked, bump lifetime counter.
      await tx.balance.update({
        where: { userId: w.userId },
        data: {
          locked: { decrement: w.amount },
          totalWithdrawn: { increment: w.amount },
        },
      });

      const updated = await tx.withdrawal.update({
        where: { id },
        data: {
          status: "COMPLETED",
          txHash: input.txHash,
          processedById: admin.id,
          processedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "withdrawal.completed",
          targetType: "Withdrawal",
          targetId: id,
          metadata: {
            amount: w.amount.toString(),
            toAddress: w.toAddress,
            txHash: input.txHash,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.notification.create({
        data: {
          userId: w.userId,
          type: "SYSTEM",
          title: "Withdrawal sent",
          body: `Your ${w.amount.toString()} USDC withdrawal to ${w.toAddress.slice(0, 6)}…${w.toAddress.slice(-4)} is on-chain`,
          data: { withdrawalId: id, txHash: input.txHash } as Prisma.InputJsonValue,
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
      id: `withdrawal-${id}`,
      type: "SYSTEM",
      title: "Withdrawal sent",
      body: `Your withdrawal of ${result.withdrawal.amount.toString()} USDC is on-chain`,
      createdAt: new Date().toISOString(),
    },
  });

  return ok({ withdrawal: toWithdrawalDTO(result.withdrawal) });
});
