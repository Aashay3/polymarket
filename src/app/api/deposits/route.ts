/**
 * POST /api/deposits — user submits a txHash claiming a USDC deposit.
 *
 * Security chain (every one must pass before crediting):
 *   1. Auth required; user has a linked wallet (from SIWE).
 *   2. txHash hasn't been attributed to any deposit already (@unique).
 *   3. On-chain verification (src/lib/chain.ts):
 *        - tx exists + success
 *        - interacts with the configured USDC contract
 *        - has a Transfer log whose `to` == our deposit address
 *        - has enough confirmations
 *   4. `from` address in the Transfer matches one of the user's wallets.
 * All of this happens before the balance is incremented, and the crediting
 * + deposit-row insert runs in a single Serializable transaction.
 *
 * GET /api/deposits — user's deposit history (newest first).
 */

import { Prisma } from "@prisma/client";
import { handler, ok, parseBody, parseQuery, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { SubmitDepositSchema, PaginationSchema } from "@/lib/schemas";
import { toDepositDTO } from "@/lib/serialize";
import { verifyUsdcDeposit, getChainId } from "@/lib/chain";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const user = await requireUser();
  const { txHash } = await parseBody(req, SubmitDepositSchema);

  // 1. Idempotency: has this hash been seen already?
  const existing = await prisma.deposit.findUnique({ where: { txHash } });
  if (existing) {
    // Return the existing record rather than erroring — the user may be
    // retrying after a network hiccup. Surfacing the state lets the UI
    // reflect confirmed/pending/rejected correctly.
    return ok({ deposit: toDepositDTO(existing), duplicate: true });
  }

  // 2. Load the user's linked wallets (lowercased for comparison).
  const wallets = await prisma.wallet.findMany({
    where: { userId: user.id },
    select: { address: true },
  });
  if (wallets.length === 0) {
    throw new ApiError("NO_WALLET", "Link a wallet (Sign in with Ethereum) before depositing", 400);
  }
  const userAddresses = new Set(wallets.map((w) => w.address.toLowerCase()));

  // 3. Verify on-chain.
  const result = await verifyUsdcDeposit(txHash);
  if (!result.ok) {
    // Record the rejection so the user sees it in history and can't retry
    // the same hash indefinitely.
    const rejected = await prisma.deposit.create({
      data: {
        userId: user.id,
        txHash,
        chainId: getChainId(),
        tokenAddress: "",
        fromAddress: "",
        toAddress: "",
        amount: "0",
        status: "REJECTED",
        rejectionReason: `${result.error.reason}: ${result.error.message}`,
      },
    });
    return ok({ deposit: toDepositDTO(rejected), error: result.error }, { status: 400 });
  }

  // 4. Sender must be one of the user's linked wallets.
  const verified = result.deposit;
  if (!userAddresses.has(verified.fromAddress)) {
    const rejected = await prisma.deposit.create({
      data: {
        userId: user.id,
        txHash,
        chainId: getChainId(),
        tokenAddress: verified.tokenAddress,
        fromAddress: verified.fromAddress,
        toAddress: verified.toAddress,
        amount: verified.amount.toFixed(6),
        status: "REJECTED",
        rejectionReason: "SENDER_MISMATCH: tx sender does not match any wallet linked to your account",
        blockNumber: verified.blockNumber,
      },
    });
    return ok(
      { deposit: toDepositDTO(rejected), error: { reason: "SENDER_MISMATCH", message: "Sender must match your linked wallet" } },
      { status: 400 },
    );
  }

  // 5. Credit: deposit insert + balance update + audit — atomic.
  const credited = await prisma.$transaction(
    async (tx) => {
      // Race-safe: use onConflict via create's unique constraint. If two
      // requests arrive in parallel, exactly one wins; the other throws
      // and the caller sees the existing row on retry.
      const deposit = await tx.deposit.create({
        data: {
          userId: user.id,
          txHash,
          chainId: getChainId(),
          tokenAddress: verified.tokenAddress,
          fromAddress: verified.fromAddress,
          toAddress: verified.toAddress,
          amount: verified.amount.toFixed(6),
          blockNumber: verified.blockNumber,
          status: "CONFIRMED",
          confirmedAt: new Date(),
        },
      });

      const balance = await tx.balance.upsert({
        where: { userId: user.id },
        update: {
          available: { increment: verified.amount.toFixed(6) },
          totalDeposited: { increment: verified.amount.toFixed(6) },
        },
        create: {
          userId: user.id,
          available: verified.amount.toFixed(6),
          locked: 0,
          totalDeposited: verified.amount.toFixed(6),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "deposit.confirmed",
          targetType: "Deposit",
          targetId: deposit.id,
          metadata: {
            txHash,
            amount: verified.amount.toFixed(6),
            chainId: getChainId(),
          } as Prisma.InputJsonValue,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Deposit received",
          body: `+${verified.amount.toFixed(2)} USDC credited to your balance`,
          data: { depositId: deposit.id, txHash } as Prisma.InputJsonValue,
        },
      });

      return { deposit, balance };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  publish({
    type: "balance.changed",
    userId: user.id,
    available: credited.balance.available.toString(),
    locked: credited.balance.locked.toString(),
  });
  publish({
    type: "notification.new",
    userId: user.id,
    notification: {
      id: `deposit-${credited.deposit.id}`,
      type: "SYSTEM",
      title: "Deposit received",
      body: `+${verified.amount.toFixed(2)} USDC credited to your balance`,
      createdAt: new Date().toISOString(),
    },
  });

  return ok({ deposit: toDepositDTO(credited.deposit) }, { status: 201 });
});

export const GET = handler(async (req) => {
  const user = await requireUser();
  const q = parseQuery(req, PaginationSchema);

  const rows = await prisma.deposit.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
  const hasMore = rows.length > q.limit;
  const page = hasMore ? rows.slice(0, q.limit) : rows;

  return ok({
    deposits: page.map(toDepositDTO),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});
