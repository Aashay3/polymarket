/**
 * Serialization helpers for Prisma Decimal / Date values at the API boundary.
 *
 * Decimal.js values and Prisma Decimal must become strings in JSON (never
 * numbers — precision loss). Dates become ISO strings.
 */

import { Decimal } from "decimal.js";
import { spotPrice } from "./amm";
import type { Deposit, DepositStatus, Market, MarketStatus, Outcome, Position, Trade, Withdrawal, WithdrawalStatus } from "@prisma/client";

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
  // Populated by the list + detail endpoints that join price history.
  // null when no baseline is available (market < 24h old, or scheduler
  // hasn't written snapshots yet).
  yesChangeBps?: number | null;
  noChangeBps?: number | null;
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

export interface DepositDTO {
  id: string;
  txHash: string;
  chainId: number;
  fromAddress: string;
  toAddress: string;
  amount: string;
  status: DepositStatus;
  rejectionReason: string | null;
  blockNumber: number | null;
  createdAt: string;
  confirmedAt: string | null;
}

export function toDepositDTO(d: Deposit): DepositDTO {
  return {
    id: d.id,
    txHash: d.txHash,
    chainId: d.chainId,
    fromAddress: d.fromAddress,
    toAddress: d.toAddress,
    amount: d.amount.toString(),
    status: d.status,
    rejectionReason: d.rejectionReason,
    blockNumber: d.blockNumber,
    createdAt: d.createdAt.toISOString(),
    confirmedAt: d.confirmedAt?.toISOString() ?? null,
  };
}

export interface WithdrawalDTO {
  id: string;
  toAddress: string;
  chainId: number;
  amount: string;
  txHash: string | null;
  status: WithdrawalStatus;
  rejectionReason: string | null;
  requestedAt: string;
  processedAt: string | null;
}

export function toWithdrawalDTO(w: Withdrawal): WithdrawalDTO {
  return {
    id: w.id,
    toAddress: w.toAddress,
    chainId: w.chainId,
    amount: w.amount.toString(),
    txHash: w.txHash,
    status: w.status,
    rejectionReason: w.rejectionReason,
    requestedAt: w.requestedAt.toISOString(),
    processedAt: w.processedAt?.toISOString() ?? null,
  };
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
