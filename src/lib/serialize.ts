/**
 * Serialization helpers for Prisma Decimal / Date values at the API boundary.
 *
 * Decimal.js values and Prisma Decimal must become strings in JSON (never
 * numbers — precision loss). Dates become ISO strings.
 */

import { Decimal } from "decimal.js";
import { spotPrice } from "./amm";
import type { Market, MarketStatus, Outcome, Position, Trade } from "@prisma/client";

export interface MarketDTO {
  id: string;
  slug: string;
  question: string;
  description: string;
  rules: string;
  category: string;
  imageUrl: string | null;
  yesShares: string;
  noShares: string;
  yesPrice: string;   // 0..1 implied probability
  noPrice: string;
  feeBps: number;
  status: MarketStatus;
  winningOutcome: Outcome | null;
  endTime: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toMarketDTO(m: Market): MarketDTO {
  const yesPrice = spotPrice({ yesShares: m.yesShares.toString(), noShares: m.noShares.toString() }, "YES");
  const noPrice = new Decimal(1).sub(yesPrice);
  return {
    id: m.id,
    slug: m.slug,
    question: m.question,
    description: m.description,
    rules: m.rules,
    category: m.category,
    imageUrl: m.imageUrl,
    yesShares: m.yesShares.toString(),
    noShares: m.noShares.toString(),
    yesPrice: yesPrice.toFixed(6),
    noPrice: noPrice.toFixed(6),
    feeBps: m.feeBps,
    status: m.status,
    winningOutcome: m.winningOutcome,
    endTime: m.endTime.toISOString(),
    resolvedAt: m.resolvedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export interface PositionDTO {
  id: string;
  marketId: string;
  outcome: Outcome;
  shares: string;
  avgPrice: string;
  costBasis: string;
  settled: boolean;
}

export function toPositionDTO(p: Position): PositionDTO {
  return {
    id: p.id,
    marketId: p.marketId,
    outcome: p.outcome,
    shares: p.shares.toString(),
    avgPrice: p.avgPrice.toString(),
    costBasis: p.costBasis.toString(),
    settled: p.settled,
  };
}

export interface TradeDTO {
  id: string;
  userId: string;
  marketId: string;
  outcome: Outcome;
  side: "BUY" | "SELL";
  shares: string;
  pricePerShare: string;
  amount: string;
  fee: string;
  netAmount: string;
  createdAt: string;
}

export function toTradeDTO(t: Trade): TradeDTO {
  return {
    id: t.id,
    userId: t.userId,
    marketId: t.marketId,
    outcome: t.outcome,
    side: t.side,
    shares: t.shares.toString(),
    pricePerShare: t.pricePerShare.toString(),
    amount: t.amount.toString(),
    fee: t.fee.toString(),
    netAmount: t.netAmount.toString(),
    createdAt: t.createdAt.toISOString(),
  };
}
