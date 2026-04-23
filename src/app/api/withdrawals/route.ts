/**
 * POST /api/withdrawals — user requests a USDC withdrawal.
 *
 * Atomic transaction:
 *   1. Load balance row (FOR UPDATE via Serializable isolation).
 *   2. Require available >= amount.
 *   3. Insert Withdrawal row with status=PENDING.
 *   4. Move amount from available -> locked (so it can't be double-spent
 *      or traded while the admin processes the payout).
 *
 * The admin later completes or rejects via /api/admin/withdrawals/[id].
 *
 * GET /api/withdrawals — user's withdrawal history (newest first).
 */

import { Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";
import { handler, ok, parseBody, parseQuery, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { RequestWithdrawalSchema, PaginationSchema } from "@/lib/schemas";
import { toWithdrawalDTO } from "@/lib/serialize";
import { getChainId } from "@/lib/chain";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

// Minimum withdrawal size — below this the gas cost to pay out is
// uneconomical. Tunable via env.
function minWithdrawal(): Decimal {
  return new Decimal(process.env.MIN_WITHDRAWAL_USDC ?? "5");
}

export const POST = handler(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, RequestWithdrawalSchema);

  const amount = new Decimal(input.amount);
  if (amount.lt(minWithdrawal())) {
    throw new ApiError("BELOW_MINIMUM", `Minimum withdrawal is ${minWithdrawal().toFixed(2)} USDC`, 400);
  }

  const toAddress = input.toAddress.toLowerCase();

  const result = await prisma.$transaction(
    async (tx) => {
      const balance = await tx.balance.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, available: 0, locked: 0 },
      });

      const available = new Decimal(balance.available.toString());
      if (available.lt(amount)) {
        throw new ApiError("INSUFFICIENT_BALANCE", "Not enough USDC available", 400, {
          available: available.toFixed(6),
          requested: amount.toFixed(6),
        });
      }

      // Move available -> locked. Same Balance row, no double-spending
      // between request and admin processing.
      await tx.balance.update({
        where: { userId: user.id },
        data: {
          available: { decrement: amount.toFixed(6) },
          locked: { increment: amount.toFixed(6) },
        },
      });

      const withdrawal = await tx.withdrawal.create({
        data: {
          userId: user.id,
          toAddress,
          chainId: getChainId(),
          amount: amount.toFixed(6),
          status: "PENDING",
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "withdrawal.requested",
          targetType: "Withdrawal",
          targetId: withdrawal.id,
          metadata: {
            amount: amount.toFixed(6),
            toAddress,
            chainId: getChainId(),
          } as Prisma.InputJsonValue,
        },
      });

      const newBalance = await tx.balance.findUnique({ where: { userId: user.id } });
      return { withdrawal, balance: newBalance };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  publish({
    type: "balance.changed",
    userId: user.id,
    available: result.balance?.available.toString() ?? "0",
    locked: result.balance?.locked.toString() ?? "0",
  });

  return ok({ withdrawal: toWithdrawalDTO(result.withdrawal) }, { status: 201 });
});

export const GET = handler(async (req) => {
  const user = await requireUser();
  const q = parseQuery(req, PaginationSchema);

  const rows = await prisma.withdrawal.findMany({
    where: { userId: user.id },
    orderBy: { requestedAt: "desc" },
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;

  return ok({
    withdrawals: page.map(toWithdrawalDTO),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});
