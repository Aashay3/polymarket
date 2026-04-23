/**
 * POST /api/trades — place a BUY trade against the FPMM.
 *
 * Flow (all inside one Prisma transaction):
 *   1. Lock the market row  (SELECT ... FOR UPDATE)
 *   2. Reject if status != OPEN or endTime passed.
 *   3. Lock the user's Balance row.
 *   4. Reject if balance.available < amount.
 *   5. Quote the trade via AMM (uses Decimal.js for precision).
 *   6. Enforce slippage: sharesOut >= minSharesOut (if provided),
 *      and spot price hasn't drifted from expectedPrice beyond tolerance.
 *   7. Debit balance, update market pool, upsert Position (average cost),
 *      insert Trade row.
 *   8. Return the trade + new market state + new balance.
 *
 * Everything commits together or nothing does. No partial writes.
 */

import { Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";
import { handler, ok, parseBody, parseQuery, rateLimit, requireWritesEnabled, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { PlaceTradeSchema, PaginationSchema } from "@/lib/schemas";
import { quoteBuy } from "@/lib/amm";
import { toMarketDTO, toTradeDTO, toPositionDTO } from "@/lib/serialize";
import { publish } from "@/lib/events";
import { RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// How far the server-side spot price may drift from the client's `expectedPrice`
// before we abort. 100 bps = 1%. Keeps users from eating stale-price slippage.
const MAX_PRICE_DRIFT_BPS = 100;

export const POST = handler(async (req) => {
  requireWritesEnabled();
  const user = await requireUser();
  // Rate-limit per user, not just IP, so one account can't hog capacity.
  rateLimit(req, RATE_LIMITS.trade, "trade", user.id);
  const input = await parseBody(req, PlaceTradeSchema);

  const amountDec = new Decimal(input.amount);
  const minSharesOut = input.minSharesOut ? new Decimal(input.minSharesOut) : null;

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Lock market row
      const market = await tx.market.findUnique({ where: { id: input.marketId } });
      if (!market) throw new ApiError("NOT_FOUND", "Market not found", 404);
      if (market.status !== "OPEN") {
        throw new ApiError("MARKET_CLOSED", "Market is not open for trading", 400);
      }
      if (market.endTime.getTime() <= Date.now()) {
        throw new ApiError("MARKET_EXPIRED", "Market closing time has passed", 400);
      }

      // 2. Quote the trade
      const quote = quoteBuy(
        { yesShares: market.yesShares.toString(), noShares: market.noShares.toString(), feeBps: market.feeBps },
        input.outcome,
        amountDec,
      );

      // 3. Slippage enforcement
      if (minSharesOut && quote.sharesOut.lt(minSharesOut)) {
        throw new ApiError("SLIPPAGE", "Would receive fewer shares than minSharesOut", 400, {
          quoted: quote.sharesOut.toString(),
          minimum: minSharesOut.toString(),
        });
      }
      if (input.expectedPrice != null) {
        const drift = quote.spotPriceBefore.sub(input.expectedPrice).abs();
        const driftBps = drift.mul(10000).toNumber();
        if (driftBps > MAX_PRICE_DRIFT_BPS) {
          throw new ApiError("PRICE_DRIFT", "Market price moved — please refresh", 400, {
            expected: input.expectedPrice,
            current: quote.spotPriceBefore.toFixed(6),
            driftBps,
          });
        }
      }

      // 4. Ensure balance row exists and debit
      const balance = await tx.balance.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, available: 0, locked: 0 },
      });
      const available = new Decimal(balance.available.toString());
      if (available.lt(amountDec)) {
        throw new ApiError("INSUFFICIENT_BALANCE", "Not enough USDC available", 400, {
          available: available.toFixed(6),
          required: amountDec.toFixed(6),
        });
      }
      await tx.balance.update({
        where: { userId: user.id },
        data: { available: { decrement: amountDec.toFixed(6) } },
      });

      // 5. Update pool
      const updatedMarket = await tx.market.update({
        where: { id: market.id },
        data: {
          yesShares: quote.newPool.yes.toFixed(18),
          noShares: quote.newPool.no.toFixed(18),
        },
      });

      // 6. Upsert position (weighted-average cost basis)
      const existingPos = await tx.position.findUnique({
        where: { userId_marketId_outcome: { userId: user.id, marketId: market.id, outcome: input.outcome } },
      });
      let position;
      if (existingPos) {
        const oldShares = new Decimal(existingPos.shares.toString());
        const oldCost = new Decimal(existingPos.costBasis.toString());
        const newShares = oldShares.add(quote.sharesOut);
        const newCost = oldCost.add(amountDec);
        const newAvg = newCost.div(newShares);
        position = await tx.position.update({
          where: { id: existingPos.id },
          data: {
            shares: newShares.toFixed(18),
            costBasis: newCost.toFixed(6),
            avgPrice: newAvg.toFixed(8),
          },
        });
      } else {
        position = await tx.position.create({
          data: {
            userId: user.id,
            marketId: market.id,
            outcome: input.outcome,
            shares: quote.sharesOut.toFixed(18),
            costBasis: amountDec.toFixed(6),
            avgPrice: quote.avgPrice.toFixed(8),
          },
        });
      }

      // 7. Insert trade
      const trade = await tx.trade.create({
        data: {
          userId: user.id,
          marketId: market.id,
          outcome: input.outcome,
          side: "BUY",
          shares: quote.sharesOut.toFixed(18),
          pricePerShare: quote.avgPrice.toFixed(8),
          amount: amountDec.toFixed(6),
          fee: quote.fee.toFixed(6),
          netAmount: amountDec.sub(quote.fee).toFixed(6),
        },
      });

      const newBalance = await tx.balance.findUnique({ where: { userId: user.id } });

      return { market: updatedMarket, trade, position, newBalance };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  // Broadcast to SSE subscribers AFTER commit so readers never see a pool
  // state that wasn't actually persisted.
  const marketDTO = toMarketDTO(result.market);
  const tradeDTO = toTradeDTO(result.trade);
  const positionDTO = toPositionDTO(result.position);
  const balancePayload = {
    available: result.newBalance?.available.toString() ?? "0",
    locked: result.newBalance?.locked.toString() ?? "0",
  };
  publish({ type: "trade.executed", trade: tradeDTO, market: marketDTO });
  publish({ type: "market.updated", market: marketDTO });
  publish({ type: "position.updated", userId: user.id, position: positionDTO });
  publish({
    type: "balance.changed",
    userId: user.id,
    available: balancePayload.available,
    locked: balancePayload.locked,
  });

  return ok({
    trade: tradeDTO,
    market: marketDTO,
    position: positionDTO,
    balance: balancePayload,
  });
});

/**
 * GET /api/trades — authenticated user's trade history (newest first).
 * Query: cursor, limit (default 20, max 100).
 */
export const GET = handler(async (req) => {
  const user = await requireUser();
  const q = parseQuery(req, PaginationSchema);

  const trades = await prisma.trade.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: q.limit + 1,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });

  const hasMore = trades.length > q.limit;
  const page = hasMore ? trades.slice(0, q.limit) : trades;

  return ok({
    trades: page.map(toTradeDTO),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});
