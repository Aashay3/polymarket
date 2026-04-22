/**
 * NEXORA Automated Market Maker — FPMM (Gnosis-style Fixed Product Market Maker)
 *
 * Binary prediction market AMM with a constant-product invariant:
 *     pool.yes * pool.no = k
 *
 * Convention: `yesShares` / `noShares` are the POOL'S RESERVES of the outcome
 * tokens. Users who buy YES receive YES tokens from the pool (reserves go
 * down), and buying YES pushes the NO reserve up — which means YES becomes
 * more expensive, as expected.
 *
 * Spot (marginal) price of outcome i = (reserve of OTHER outcomes) / (sum of all reserves)
 * For binary:
 *     spotPrice(YES) = no / (yes + no)
 *     spotPrice(NO)  = yes / (yes + no)
 *
 * Always sums to 1. Represents the market's implied probability.
 *
 * Fees: `feeBps` is basis points (200 = 2.00%). On BUY the fee is taken from
 * the input USDC before the swap. On SELL the fee is taken from the user's
 * proceeds. Fees stay in the pool, growing k.
 *
 * All math uses Decimal.js — never floats. Financial math with floats
 * is how money disappears.
 */

import { Decimal } from "decimal.js";

// 40-digit precision, banker's rounding.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

export type OutcomeKey = "YES" | "NO";

export interface PoolState {
  yesShares: Decimal | string | number;
  noShares: Decimal | string | number;
  feeBps?: number; // default 200 (= 2.00%)
}

export interface NormalizedPool {
  yes: Decimal;
  no: Decimal;
  feeBps: number;
}

export interface BuyQuote {
  sharesOut: Decimal;
  avgPrice: Decimal;        // amount / sharesOut (effective $ per share)
  spotPriceBefore: Decimal;
  spotPriceAfter: Decimal;
  fee: Decimal;
  priceImpactBps: number;
  newPool: { yes: Decimal; no: Decimal };
}

export interface SellQuote {
  proceeds: Decimal;        // USDC gross before fee
  netProceeds: Decimal;     // proceeds − fee
  avgPrice: Decimal;
  spotPriceBefore: Decimal;
  spotPriceAfter: Decimal;
  fee: Decimal;
  priceImpactBps: number;
  newPool: { yes: Decimal; no: Decimal };
}

const ZERO = new Decimal(0);
const ONE = new Decimal(1);
const BPS = new Decimal(10000);

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

export function normalizePool(pool: PoolState): NormalizedPool {
  const yes = new Decimal(pool.yesShares);
  const no = new Decimal(pool.noShares);
  const feeBps = pool.feeBps ?? 200;

  if (yes.lte(0) || no.lte(0)) {
    throw new AMMError("Pool shares must be > 0", "INVALID_POOL");
  }
  if (feeBps < 0 || feeBps >= 10000) {
    throw new AMMError("feeBps must be 0..9999", "INVALID_FEE");
  }

  return { yes, no, feeBps };
}

/**
 * Marginal (spot) price of `outcome`, in the [0, 1] range.
 * Represents the market's implied probability of that outcome.
 */
export function spotPrice(pool: PoolState, outcome: OutcomeKey): Decimal {
  const p = normalizePool(pool);
  const total = p.yes.add(p.no);
  // FPMM convention: price(i) = product of other reserves / sum of products.
  // For binary, that reduces to: price(YES) = no / (yes + no).
  return outcome === "YES" ? p.no.div(total) : p.yes.div(total);
}

/**
 * BUY `outcome` for `amount` USDC.
 *
 * Standard FPMM formula. User pays `amount`; pool receives `amount − fee`.
 * The AMM mints `a` units of each outcome with the net input, then swaps the
 * "other" outcome back for more of the desired outcome, keeping yes*no = k:
 *
 *   a = amount − fee
 *   newNo = no + a                      (pool gains the minted opposite)
 *   newYes = k / (no + a)                (keep invariant)
 *   sharesOut = yes − newYes + a          (what the user receives)
 *
 * Equivalent closed form: sharesOut = a * (yes + no + a) / (no + a).
 *
 * Note variable naming: `x` is the pool reserve of the BUY side,
 * `y` is the pool reserve of the OTHER side.
 */
export function quoteBuy(
  pool: PoolState,
  outcome: OutcomeKey,
  amount: Decimal | string | number
): BuyQuote {
  const p = normalizePool(pool);
  const amt = new Decimal(amount);
  if (amt.lte(0)) throw new AMMError("amount must be > 0", "INVALID_AMOUNT");

  const fee = amt.mul(p.feeBps).div(BPS);
  const a = amt.sub(fee);

  const [x, y] = outcome === "YES" ? [p.yes, p.no] : [p.no, p.yes];
  const k = x.mul(y);
  const newY = y.add(a);
  const newX = k.div(newY);
  const sharesOut = x.sub(newX).add(a);

  const finalYes = outcome === "YES" ? newX : newY;
  const finalNo = outcome === "YES" ? newY : newX;

  const spotBefore = spotPrice({ yesShares: p.yes, noShares: p.no, feeBps: p.feeBps }, outcome);
  const spotAfter = spotPrice({ yesShares: finalYes, noShares: finalNo, feeBps: p.feeBps }, outcome);

  const avgPrice = amt.div(sharesOut);
  const priceImpactBps = spotBefore.gt(0)
    ? Number(spotAfter.sub(spotBefore).div(spotBefore).mul(BPS).toFixed(0))
    : 0;

  return {
    sharesOut,
    avgPrice,
    spotPriceBefore: spotBefore,
    spotPriceAfter: spotAfter,
    fee,
    priceImpactBps,
    newPool: { yes: finalYes, no: finalNo },
  };
}

/**
 * SELL `shares` of `outcome` back to the pool.
 *
 * The user returns `s` outcome tokens and receives `r` USDC such that the
 * CPMM invariant is preserved. After the trade:
 *   newX = x + s − r    (pool gains back s of the sold outcome, loses r to redemption)
 *   newY = y − r
 *   newX * newY = x * y
 *
 * Solving the quadratic:
 *   r² − r(x + y + s) + s·y = 0
 *   r = ((x + y + s) − √((x + y + s)² − 4·s·y)) / 2
 *
 * The minus root is the one in [0, y); the plus root gives a non-physical
 * value larger than y.
 *
 * Fee is taken from `r` (gross proceeds) and stays in the pool.
 */
export function quoteSell(
  pool: PoolState,
  outcome: OutcomeKey,
  shares: Decimal | string | number
): SellQuote {
  const p = normalizePool(pool);
  const s = new Decimal(shares);
  if (s.lte(0)) throw new AMMError("shares must be > 0", "INVALID_AMOUNT");

  const [x, y] = outcome === "YES" ? [p.yes, p.no] : [p.no, p.yes];

  const sum = x.add(y).add(s);
  const disc = sum.mul(sum).sub(s.mul(y).mul(4));
  if (disc.lt(0)) throw new AMMError("Discriminant negative — math error", "MATH_ERROR");
  const gross = sum.sub(disc.sqrt()).div(2);

  if (gross.lte(0) || gross.gte(y)) {
    // Shouldn't happen with valid input — the quadratic root is always
    // strictly inside [0, y) for positive reserves. Guard anyway.
    throw new AMMError("Sell amount out of bounds", "INSUFFICIENT_LIQUIDITY");
  }

  const fee = gross.mul(p.feeBps).div(BPS);
  const netProceeds = gross.sub(fee);

  const newX = x.add(s).sub(gross);
  const newY = y.sub(gross);

  const finalYes = outcome === "YES" ? newX : newY;
  const finalNo = outcome === "YES" ? newY : newX;

  const spotBefore = spotPrice({ yesShares: p.yes, noShares: p.no, feeBps: p.feeBps }, outcome);
  const spotAfter = spotPrice({ yesShares: finalYes, noShares: finalNo, feeBps: p.feeBps }, outcome);

  const avgPrice = gross.div(s);
  const priceImpactBps = spotBefore.gt(0)
    ? Number(spotAfter.sub(spotBefore).div(spotBefore).mul(BPS).toFixed(0))
    : 0;

  return {
    proceeds: gross,
    netProceeds,
    avgPrice,
    spotPriceBefore: spotBefore,
    spotPriceAfter: spotAfter,
    fee,
    priceImpactBps,
    newPool: { yes: finalYes, no: finalNo },
  };
}

/**
 * Redeem winning positions at market resolution.
 * Winning shares pay exactly 1 USDC each. Losers pay 0.
 */
export function redeemWinnings(shares: Decimal | string | number, isWinner: boolean): Decimal {
  const s = new Decimal(shares);
  if (s.lt(0)) throw new AMMError("shares cannot be negative", "INVALID_AMOUNT");
  return isWinner ? s : ZERO;
}

// ─────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────

export class AMMError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "AMMError";
  }
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────

/** Render a price as "42.15¢" for UI. */
export function formatPriceCents(price: Decimal | number | string): string {
  const p = new Decimal(price);
  return p.mul(100).toFixed(2) + "¢";
}

/** USDC (6 decimals) ↔ smart-contract integer units. */
export function usdcToInt(usdc: Decimal | string | number): bigint {
  return BigInt(new Decimal(usdc).mul(1_000_000).toFixed(0));
}

export function intToUsdc(units: bigint): Decimal {
  return new Decimal(units.toString()).div(1_000_000);
}

export { ZERO, ONE };
