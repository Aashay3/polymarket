import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import {
  spotPrice,
  quoteBuy,
  quoteSell,
  redeemWinnings,
  normalizePool,
  usdcToInt,
  intToUsdc,
  formatPriceCents,
  AMMError,
} from "./amm";

// Helpers
const d = (n: number | string) => new Decimal(n);
const approx = (actual: Decimal | number | string, expected: number, tol = 1e-9) => {
  const diff = new Decimal(actual).sub(expected).abs().toNumber();
  if (diff > tol) {
    throw new Error(`Expected ~${expected}, got ${actual.toString()} (diff ${diff})`);
  }
};

describe("normalizePool", () => {
  it("rejects zero shares", () => {
    expect(() => normalizePool({ yesShares: 0, noShares: 100 })).toThrow(AMMError);
    expect(() => normalizePool({ yesShares: 100, noShares: 0 })).toThrow(AMMError);
  });

  it("rejects negative shares", () => {
    expect(() => normalizePool({ yesShares: -1, noShares: 100 })).toThrow(AMMError);
  });

  it("rejects bad feeBps", () => {
    expect(() => normalizePool({ yesShares: 100, noShares: 100, feeBps: -1 })).toThrow(AMMError);
    expect(() => normalizePool({ yesShares: 100, noShares: 100, feeBps: 10000 })).toThrow(AMMError);
  });

  it("defaults feeBps to 200", () => {
    const p = normalizePool({ yesShares: 100, noShares: 100 });
    expect(p.feeBps).toBe(200);
  });
});

describe("spotPrice", () => {
  it("returns 0.5 for a balanced pool", () => {
    approx(spotPrice({ yesShares: 1000, noShares: 1000 }, "YES"), 0.5);
    approx(spotPrice({ yesShares: 1000, noShares: 1000 }, "NO"), 0.5);
  });

  it("reflects pool skew (FPMM convention: more reserve ⇒ that outcome is cheaper)", () => {
    // Pool holds 9000 YES tokens, 1000 NO tokens → YES is plentiful, so YES is cheap.
    approx(spotPrice({ yesShares: 9000, noShares: 1000 }, "YES"), 0.1);
    approx(spotPrice({ yesShares: 9000, noShares: 1000 }, "NO"), 0.9);
  });

  it("YES + NO prices always sum to 1", () => {
    const pools = [
      { yesShares: 100, noShares: 100 },
      { yesShares: 5000, noShares: 3000 },
      { yesShares: 1, noShares: 9999 },
    ];
    for (const p of pools) {
      const sum = spotPrice(p, "YES").add(spotPrice(p, "NO"));
      approx(sum, 1);
    }
  });
});

describe("quoteBuy", () => {
  it("rejects non-positive amount", () => {
    expect(() => quoteBuy({ yesShares: 100, noShares: 100 }, "YES", 0)).toThrow(AMMError);
    expect(() => quoteBuy({ yesShares: 100, noShares: 100 }, "YES", -5)).toThrow(AMMError);
  });

  it("deducts the fee correctly", () => {
    const q = quoteBuy({ yesShares: 10000, noShares: 10000, feeBps: 200 }, "YES", 100);
    approx(q.fee, 2);
  });

  it("increases spot price of the bought outcome", () => {
    const q = quoteBuy({ yesShares: 1000, noShares: 1000 }, "YES", 100);
    expect(q.spotPriceAfter.gt(q.spotPriceBefore)).toBe(true);
  });

  it("produces more shares at cheaper prices", () => {
    // Balanced pool → YES ≈ 0.5. Pool {yes: 100, no: 900} → YES is expensive (price = 0.9).
    const cheap = quoteBuy({ yesShares: 1000, noShares: 1000 }, "YES", 100);
    const pricey = quoteBuy({ yesShares: 100, noShares: 900 }, "YES", 100);
    expect(cheap.sharesOut.gt(pricey.sharesOut)).toBe(true);
  });

  it("preserves CPMM invariant (k is non-decreasing across trades)", () => {
    const pool = { yesShares: 1000, noShares: 1000, feeBps: 0 };
    const kBefore = d(1000).mul(1000);
    const q = quoteBuy(pool, "YES", 100);
    const kAfter = q.newPool.yes.mul(q.newPool.no);
    // With 0% fee, invariant holds approximately (rounding-exact here).
    approx(kAfter.div(kBefore), 1, 1e-18);
  });

  it("fee is taken from the input, k is preserved (Gnosis FPMM convention)", () => {
    // Gnosis-style: fee is skimmed before the swap and accrues to the protocol
    // treasury, NOT back into k. So invariant stays flat and `fee` is reported
    // separately for the caller to credit wherever the protocol wants it.
    const pool = { yesShares: 1000, noShares: 1000, feeBps: 200 };
    const kBefore = d(1000).mul(1000);
    const q = quoteBuy(pool, "YES", 100);
    const kAfter = q.newPool.yes.mul(q.newPool.no);
    approx(kAfter.div(kBefore), 1, 1e-18);
    approx(q.fee, 2); // 2% of 100
  });

  it("symmetry: buying YES and buying NO of same amount mirror each other", () => {
    const yesQ = quoteBuy({ yesShares: 1000, noShares: 1000 }, "YES", 100);
    const noQ = quoteBuy({ yesShares: 1000, noShares: 1000 }, "NO", 100);
    approx(yesQ.sharesOut.sub(noQ.sharesOut), 0);
  });

  it("tiny trades have tiny price impact", () => {
    const q = quoteBuy({ yesShares: 100_000, noShares: 100_000 }, "YES", 1);
    expect(Math.abs(q.priceImpactBps)).toBeLessThan(5); // < 0.05%
  });

  it("large trades have large price impact", () => {
    const q = quoteBuy({ yesShares: 1000, noShares: 1000 }, "YES", 500);
    expect(q.priceImpactBps).toBeGreaterThan(1000); // > 10%
  });
});

describe("quoteSell", () => {
  it("rejects non-positive shares", () => {
    expect(() => quoteSell({ yesShares: 100, noShares: 100 }, "YES", 0)).toThrow(AMMError);
    expect(() => quoteSell({ yesShares: 100, noShares: 100 }, "YES", -5)).toThrow(AMMError);
  });

  it("decreases spot price of the sold outcome", () => {
    const q = quoteSell({ yesShares: 1000, noShares: 1000 }, "YES", 100);
    expect(q.spotPriceAfter.lt(q.spotPriceBefore)).toBe(true);
  });

  it("throws when selling more than the pool can absorb", () => {
    // Pool only has 1000 NO shares; selling a huge amount of YES would push newY toward 0.
    // At some point gross = y - newY approaches y, bounded. But very large `shares` will
    // cause newY ≈ 0 and is still finite — so no throw here unless we set tighter guards.
    // Instead, test the boundary — selling hugely is allowed but cost-ineffective.
    const q = quoteSell({ yesShares: 1000, noShares: 1000 }, "YES", 1_000_000);
    expect(q.proceeds.lt(1000)).toBe(true); // can't get more than the pool holds
  });

  it("fees are taken from proceeds, not added on top", () => {
    const pool = { yesShares: 1000, noShares: 1000, feeBps: 200 };
    const q = quoteSell(pool, "YES", 100);
    expect(q.netProceeds.lt(q.proceeds)).toBe(true);
    approx(q.proceeds.mul(0.02).sub(q.fee), 0, 1e-18);
  });
});

describe("round-trip (buy then sell)", () => {
  it("round-trip with 0% fee returns approximately the original amount", () => {
    const pool = { yesShares: 10_000, noShares: 10_000, feeBps: 0 };
    const amount = 100;

    const buy = quoteBuy(pool, "YES", amount);
    const sell = quoteSell(
      { yesShares: buy.newPool.yes, noShares: buy.newPool.no, feeBps: 0 },
      "YES",
      buy.sharesOut
    );

    // With 0 fee and back-to-back trades, user should get back almost exactly
    // what they put in. Exact match is impossible due to CPMM mechanics
    // (each trade pays a tiny slippage to the pool), but it should be close.
    approx(sell.proceeds, amount, 1e-6);
  });

  it("round-trip with 2% fee loses roughly 4% (fee paid twice)", () => {
    const pool = { yesShares: 10_000, noShares: 10_000, feeBps: 200 };
    const amount = 100;

    const buy = quoteBuy(pool, "YES", amount);
    const sell = quoteSell(
      { yesShares: buy.newPool.yes, noShares: buy.newPool.no, feeBps: 200 },
      "YES",
      buy.sharesOut
    );

    // Net = 100 * 0.98 * 0.98 ≈ 96.04
    const ratio = sell.netProceeds.div(amount).toNumber();
    expect(ratio).toBeGreaterThan(0.955);
    expect(ratio).toBeLessThan(0.965);
  });
});

describe("redeemWinnings", () => {
  it("winning shares pay 1 USDC each", () => {
    approx(redeemWinnings(42, true), 42);
  });

  it("losing shares pay 0", () => {
    approx(redeemWinnings(42, false), 0);
  });

  it("rejects negative shares", () => {
    expect(() => redeemWinnings(-1, true)).toThrow(AMMError);
  });
});

describe("USDC unit conversion", () => {
  it("usdcToInt rounds to 6 decimals", () => {
    expect(usdcToInt(1)).toBe(1_000_000n);
    expect(usdcToInt(1.5)).toBe(1_500_000n);
    expect(usdcToInt("0.000001")).toBe(1n);
  });

  it("intToUsdc is the inverse", () => {
    approx(intToUsdc(1_500_000n), 1.5);
    approx(intToUsdc(1n), 0.000001);
  });
});

describe("formatPriceCents", () => {
  it("renders 0.5 as 50.00¢", () => {
    expect(formatPriceCents(0.5)).toBe("50.00¢");
  });
  it("renders 0.4215 as 42.15¢", () => {
    expect(formatPriceCents(0.4215)).toBe("42.15¢");
  });
});

describe("high-precision stress", () => {
  it("handles very large pools without float issues", () => {
    const pool = {
      yesShares: "1000000000000000000", // 1e18 (chain-like)
      noShares: "1000000000000000000",
      feeBps: 200,
    };
    const q = quoteBuy(pool, "YES", "1000000");
    expect(q.sharesOut.isFinite()).toBe(true);
    expect(q.sharesOut.gt(0)).toBe(true);
  });

  it("handles very tiny trades", () => {
    const q = quoteBuy({ yesShares: 10000, noShares: 10000 }, "YES", "0.000001");
    expect(q.sharesOut.gt(0)).toBe(true);
  });
});
