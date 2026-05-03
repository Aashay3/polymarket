/**
 * GET /api/me — current user + balance summary.
 *
 * Used by the frontend to hydrate WalletContext with the real user identity
 * and current balance on page load / session change.
 */

import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await requireUser();

  const balance = await prisma.balance.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, available: 0, locked: 0 },
  });

  // `balance.tokens` is a JSON map of per-token balances. USDC stays
  // canonical in `available` (every trade settles in USDC). Other
  // tokens populate when multi-token deposit verification ships.
  const tokens = balance.tokens && typeof balance.tokens === "object"
    ? (balance.tokens as Record<string, string>)
    : {};

  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      image: user.image,
      role: user.role,
      walletAddress: user.walletAddress,
    },
    balance: {
      available: balance.available.toString(),
      locked: balance.locked.toString(),
      totalDeposited: balance.totalDeposited.toString(),
      totalWithdrawn: balance.totalWithdrawn.toString(),
      tokens,
    },
  });
});
