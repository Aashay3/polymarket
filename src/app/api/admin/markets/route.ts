/**
 * POST /api/admin/markets — create a new market.
 *
 * Admin-only (guarded by src/proxy.ts). Seeds the initial FPMM pool with
 * equal YES/NO reserves so the opening price is 50/50. `initialLiquidity`
 * is the virtual USDC that defines pool depth — NOT debited from anyone
 * (Phase 4 will route it from an admin-controlled liquidity wallet).
 */

import { Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { CreateMarketSchema } from "@/lib/schemas";
import { toMarketDTO } from "@/lib/serialize";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export const POST = handler(async (req) => {
  const admin = await requireAdmin();
  const input = await parseBody(req, CreateMarketSchema);

  // Initial pool: split initialLiquidity equally (opening price 50/50).
  const half = new Decimal(input.initialLiquidity).div(2);
  const baseSlug = slugify(input.question);
  if (baseSlug.length < 3) {
    throw new ApiError("INVALID_QUESTION", "Question is too short to form a slug", 400);
  }

  // Guarantee slug uniqueness by appending a suffix on collision.
  let slug = baseSlug;
  for (let i = 1; i < 10; i++) {
    const exists = await prisma.market.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${baseSlug}-${i}`;
  }

  const market = await prisma.market.create({
    data: {
      slug,
      question: input.question,
      description: input.description,
      rules: input.rules,
      category: input.category,
      imageUrl: input.imageUrl ?? null,
      feeBps: input.feeBps,
      endTime: input.endTime,
      yesShares: half.toFixed(18),
      noShares: half.toFixed(18),
      createdById: admin.id,
      status: "OPEN",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "market.create",
      targetType: "Market",
      targetId: market.id,
      metadata: { question: market.question, initialLiquidity: input.initialLiquidity } as Prisma.InputJsonValue,
    },
  });

  const dto = toMarketDTO(market);
  publish({ type: "market.created", market: dto });

  return ok({ market: dto }, { status: 201 });
});
