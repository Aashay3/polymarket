/**
 * POST /api/positions/close — sell back shares to the pool.
 *
 * Body: { marketId, outcome, shares?, minProceeds? }
 *   If `shares` omitted → close the entire position.
 *   `minProceeds` enforces slippage (abort if netProceeds < minProceeds).
 *
 * Atomic transaction mirrors /api/trades:
 *   lock market → lock position → quoteSell → update pool → update position
 *   (shares decreased, cost basis pro-rated) → insert SELL Trade row
 *   → credit balance with netProceeds.
 */

import { Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";
import { handler, ok, parseBody, requireWritesEnabled, ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { ClosePositionSchema } from "@/lib/schemas";
import { quoteSell } from "@/lib/amm";
import { toMarketDTO, toTradeDTO, toPositionDTO } from "@/lib/serialize";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  requireWritesEnabled();
  const user = await requireUser();
  const input = await parseBody(req, ClosePositionSchema);
  const minProceeds = input.minProceeds ? new Decimal(input.minProceeds) : null;

  const result = await prisma.$transaction(
    async (tx) => {
      const market = await tx.market.findUnique({ where: { id: input.marketId } });
      if (!market) throw new ApiError("NOT_FOUND", "Market not found", 404);
      if (market.status !== "OPEN") {
        throw new ApiError("MARKET_CLOSED", "Market is not open for trading", 400);
      }

      const position = await tx.position.findUnique({
        where: {
          userId_marketId_outcome: {
            userId: user.id,
            marketId: market.id,
            outcome: input.outcome,
          },
        },
      });
      if (!position) throw new ApiError("NO_POSITION", "No position to close", 404);

      const held = new Decimal(position.shares.toString());
      if (held.lte(0)) throw new ApiError("NO_POSITION", "Position already closed", 404);

      const sharesToSell = input.shares ? new Decimal(input.shares) : held;
      if (sharesToSell.lte(0) || sharesToSell.gt(held)) {
        throw new ApiError("INVALID_AMOUNT", "shares must be >0 and <= held", 400, {
          held: held.toFixed(18),
          requested: sharesToSell.toFixed(18),
        });
      }

      const quote = quoteSell(
        {
          yesShares: market.yesShares.toString(),
          noShares: market.noShares.toString(),
          feeBps: market.feeBps,
        },
        input.outcome,
        sharesToSell,
      );

      if (minProceeds && quote.netProceeds.lt(minProceeds)) {
        throw new ApiError("SLIPPAGE", "Would receive less than minProceeds", 400, {
          quoted: quote.netProceeds.toFixed(6),
          minimum: minProceeds.toFixed(6),
        });
      }

      // Pro-rate cost basis against shares sold.
      const costBasisBefore = new Decimal(position.costBasis.toString());
      const costConsumed = costBasisBefore.mul(sharesToSell).div(held);
      const newShares = held.sub(sharesToSell);
      const newCost = costBasisBefore.sub(costConsumed);

      await tx.market.update({
        where: { id: market.id },
        data: {
          yesShares: quote.newPool.yes.toFixed(18),
          noShares: quote.newPool.no.toFixed(18),
        },
      });

      const updatedPosition = await tx.position.update({
        where: { id: position.id },
        data: {
          shares: newShares.toFixed(18),
          costBasis: newCost.toFixed(6),
          // avgPrice unchanged — it describes the remaining shares' entry cost
        },
      });

      const trade = await tx.trade.create({
        data: {
          userId: user.id,
          marketId: market.id,
          outcome: input.outcome,
          side: "SELL",
          shares: sharesToSell.toFixed(18),
          pricePerShare: quote.avgPrice.toFixed(8),
          amount: quote.proceeds.toFixed(6),
          fee: quote.fee.toFixed(6),
          netAmount: quote.netProceeds.toFixed(6),
        },
      });

      // Credit proceeds. Create balance row on demand for users who haven't
      // deposited yet (shouldn't happen for someone selling, but safe).
      await tx.balance.upsert({
        where: { userId: user.id },
        update: { available: { increment: quote.netProceeds.toFixed(6) } },
        create: {
          userId: user.id,
          available: quote.netProceeds.toFixed(6),
          locked: 0,
        },
      });

      const [updatedMarket, newBalance] = await Promise.all([
        tx.market.findUnique({ where: { id: market.id } }),
        tx.balance.findUnique({ where: { userId: user.id } }),
      ]);

      return {
        market: updatedMarket!,
        trade,
        position: updatedPosition,
        newBalance,
        realizedPnl: quote.netProceeds.sub(costConsumed),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

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
    realizedPnl: result.realizedPnl.toFixed(6),
  });
});
