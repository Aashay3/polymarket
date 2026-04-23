import { describe, it, expect } from "vitest";
import { Decimal } from "decimal.js";
import type { Market, Position, Trade } from "@prisma/client";
import { toMarketDTO, toPositionDTO, toTradeDTO } from "./serialize";

// Prisma's Decimal and decimal.js are functionally compatible at the
// .toString() boundary we care about for serialization. We use decimal.js
// instances and cast the final row objects to the Prisma row types since
// we're only testing pure DTO mappers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const D: any = Decimal;

// Build a realistic Market row. Prisma returns Decimal instances;
// we use its shared Decimal runtime so the type shape matches.
function mkMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: "ckmarket1",
    slug: "will-btc-hit-100k",
    question: "Will Bitcoin hit $100k before December?",
    description: "Full description...",
    rules: "Resolves YES if BTC closes ≥ $100,000 on any Coinbase 1-day bar before Dec 31.",
    category: "Crypto",
    imageUrl: null,
    yesShares: new D("4200"),
    noShares: new D("5800"),
    feeBps: 200,
    status: "OPEN",
    winningOutcome: null,
    resolutionNote: null,
    endTime: new Date("2026-12-01T00:00:00Z"),
    resolvedAt: null,
    createdById: null,
    resolvedById: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-04-23T00:00:00Z"),
    ...overrides,
  } as Market;
}

describe("toMarketDTO()", () => {
  it("serializes Decimal shares as strings and dates as ISO", () => {
    const dto = toMarketDTO(mkMarket());
    expect(dto.yesShares).toBe("4200");
    expect(dto.noShares).toBe("5800");
    expect(dto.endTime).toBe("2026-12-01T00:00:00.000Z");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("computes FPMM spot prices that sum to 1", () => {
    const dto = toMarketDTO(mkMarket());
    const yes = parseFloat(dto.yesPrice);
    const no = parseFloat(dto.noPrice);
    expect(yes + no).toBeCloseTo(1, 6);
    // FPMM convention: price(YES) = noShares / total → 5800/10000 = 0.58
    expect(yes).toBeCloseTo(0.58, 6);
    expect(no).toBeCloseTo(0.42, 6);
  });

  it("propagates null optional fields instead of undefined", () => {
    const dto = toMarketDTO(mkMarket({ imageUrl: null, resolvedAt: null }));
    expect(dto.imageUrl).toBeNull();
    expect(dto.resolvedAt).toBeNull();
    expect(dto.winningOutcome).toBeNull();
  });

  it("serializes resolved markets with winning outcome + resolvedAt", () => {
    const dto = toMarketDTO(
      mkMarket({
        status: "RESOLVED",
        winningOutcome: "YES",
        resolvedAt: new Date("2026-05-01T12:00:00Z"),
      }),
    );
    expect(dto.status).toBe("RESOLVED");
    expect(dto.winningOutcome).toBe("YES");
    expect(dto.resolvedAt).toBe("2026-05-01T12:00:00.000Z");
  });
});

describe("toPositionDTO()", () => {
  it("stringifies all Decimal fields losslessly", () => {
    const pos: Position = {
      id: "ckpos1",
      userId: "ckuser1",
      marketId: "ckmarket1",
      outcome: "YES",
      shares: new D("123.456789012345678901"),
      avgPrice: new D("0.42345678"),
      costBasis: new D("52.123456"),
      settled: false,
      settledAt: null,
      createdAt: new Date("2026-04-20T00:00:00Z"),
      updatedAt: new Date("2026-04-22T00:00:00Z"),
    } as Position;
    const dto = toPositionDTO(pos);
    expect(dto.shares).toBe("123.456789012345678901");
    expect(dto.avgPrice).toBe("0.42345678");
    expect(dto.costBasis).toBe("52.123456");
    expect(dto.settled).toBe(false);
  });
});

describe("toTradeDTO()", () => {
  it("produces the expected JSON shape", () => {
    const trade: Trade = {
      id: "cktrade1",
      userId: "ckuser1",
      marketId: "ckmarket1",
      outcome: "NO",
      side: "BUY",
      shares: new D("25.000000000000000000"),
      pricePerShare: new D("0.40000000"),
      amount: new D("10.000000"),
      fee: new D("0.200000"),
      netAmount: new D("9.800000"),
      txHash: null,
      blockNumber: null,
      createdAt: new Date("2026-04-22T10:30:00Z"),
    } as Trade;
    const dto = toTradeDTO(trade);
    expect(dto).toEqual({
      id: "cktrade1",
      userId: "ckuser1",
      marketId: "ckmarket1",
      outcome: "NO",
      side: "BUY",
      shares: "25",
      pricePerShare: "0.4",
      amount: "10",
      fee: "0.2",
      netAmount: "9.8",
      createdAt: "2026-04-22T10:30:00.000Z",
    });
  });
});
