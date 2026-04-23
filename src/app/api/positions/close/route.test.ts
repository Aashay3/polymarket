/**
 * POST /api/positions/close — money-path tests with mocked Prisma.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "decimal.js";

const { authMock, txMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  txMock: {
    market: { findUnique: vi.fn(), update: vi.fn() },
    balance: { upsert: vi.fn(), findUnique: vi.fn() },
    position: { findUnique: vi.fn(), update: vi.fn() },
    trade: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ requireUser: () => authMock() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  },
}));

const { POST } = await import("./route");

const USER = { id: "u_1", email: null, name: null, image: null, role: "USER" as const, username: null, walletAddress: null };
const CUID = "ckxxxxxxxxxxxxxxxxxxxxxx";

function mkMarket(overrides: Record<string, unknown> = {}) {
  return {
    id: "m_1",
    yesShares: new Decimal("5000"),
    noShares: new Decimal("5000"),
    feeBps: 200,
    status: "OPEN",
    endTime: new Date(Date.now() + 86400000),
    question: "Q",
    slug: "s",
    description: "d",
    rules: "r",
    category: "c",
    imageUrl: null,
    winningOutcome: null,
    resolutionNote: null,
    resolvedAt: null,
    createdById: null,
    resolvedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mkPosition(overrides: Record<string, unknown> = {}) {
  return {
    id: "p_1",
    userId: USER.id,
    marketId: "m_1",
    outcome: "YES" as const,
    shares: new Decimal("100"),
    avgPrice: new Decimal("0.50000000"),
    costBasis: new Decimal("50"),
    settled: false,
    settledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function req(body: unknown): Request {
  return new Request("http://x/api/positions/close", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authMock.mockResolvedValue(USER);
  Object.values(txMock).forEach((m) =>
    Object.values(m).forEach((fn) => (fn as { mockReset: () => void }).mockReset()),
  );
});

describe("POST /api/positions/close", () => {
  it("404s when market not found", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(null);
    const res = await POST(req({ marketId: CUID, outcome: "YES" }));
    expect(res.status).toBe(404);
  });

  it("rejects close on non-OPEN market", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket({ status: "RESOLVED" }));
    const res = await POST(req({ marketId: CUID, outcome: "YES" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("MARKET_CLOSED");
  });

  it("404s when no position to close", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.position.findUnique.mockResolvedValueOnce(null);
    const res = await POST(req({ marketId: CUID, outcome: "YES" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NO_POSITION");
  });

  it("rejects partial close above held shares", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.position.findUnique.mockResolvedValueOnce(mkPosition({ shares: new Decimal("10") }));
    const res = await POST(req({ marketId: CUID, outcome: "YES", shares: "100" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_AMOUNT");
  });

  it("enforces minProceeds slippage floor", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.position.findUnique.mockResolvedValueOnce(mkPosition());
    // Selling 100 YES on 50/50 5000-deep pool yields ~48 USDC gross.
    // Demand 1000 → tripped.
    const res = await POST(req({ marketId: CUID, outcome: "YES", minProceeds: "1000" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("SLIPPAGE");
    expect(txMock.trade.create).not.toHaveBeenCalled();
  });

  it("full close: sells all shares, pro-rates cost (drops to zero), credits proceeds", async () => {
    txMock.market.findUnique
      .mockResolvedValueOnce(mkMarket())     // initial lookup
      .mockResolvedValueOnce(mkMarket());     // re-fetch for response payload
    txMock.position.findUnique.mockResolvedValueOnce(mkPosition({ shares: new Decimal("100"), costBasis: new Decimal("50") }));
    txMock.market.update.mockImplementationOnce(async ({ data }: { data: { yesShares: string; noShares: string } }) =>
      mkMarket({ yesShares: new Decimal(data.yesShares), noShares: new Decimal(data.noShares) }),
    );
    txMock.position.update.mockImplementationOnce(async ({ data }) => ({
      ...mkPosition(),
      shares: new Decimal(data.shares),
      costBasis: new Decimal(data.costBasis),
    }));
    txMock.trade.create.mockImplementationOnce(async ({ data }) => ({
      ...data,
      id: "t_x",
      shares: new Decimal(data.shares),
      pricePerShare: new Decimal(data.pricePerShare),
      amount: new Decimal(data.amount),
      fee: new Decimal(data.fee),
      netAmount: new Decimal(data.netAmount),
      txHash: null,
      blockNumber: null,
      createdAt: new Date(),
    }));
    txMock.balance.upsert.mockResolvedValueOnce({ available: new Decimal("48"), locked: new Decimal("0"), userId: USER.id, id: "b_1", totalDeposited: new Decimal("0"), totalWithdrawn: new Decimal("0"), updatedAt: new Date() });
    txMock.balance.findUnique.mockResolvedValueOnce({ available: new Decimal("48"), locked: new Decimal("0"), userId: USER.id, id: "b_1", totalDeposited: new Decimal("0"), totalWithdrawn: new Decimal("0"), updatedAt: new Date() });

    const res = await POST(req({ marketId: CUID, outcome: "YES" }));
    expect(res.status).toBe(200);

    // Trade row was a SELL of all 100 shares
    const trade = txMock.trade.create.mock.calls[0][0].data;
    expect(trade.side).toBe("SELL");
    expect(trade.shares).toBe("100.000000000000000000");

    // Position: shares=0, costBasis=0 (full pro-rata)
    const posUpdate = txMock.position.update.mock.calls[0][0].data;
    expect(posUpdate.shares).toBe("0.000000000000000000");
    expect(posUpdate.costBasis).toBe("0.000000");

    // Balance was credited (upsert with increment)
    const upsertArgs = txMock.balance.upsert.mock.calls[0][0];
    expect(upsertArgs.update.available.increment).toBeDefined();
  });

  it("partial close: pro-rates cost basis correctly", async () => {
    txMock.market.findUnique
      .mockResolvedValueOnce(mkMarket())
      .mockResolvedValueOnce(mkMarket());
    txMock.position.findUnique.mockResolvedValueOnce(mkPosition({ shares: new Decimal("100"), costBasis: new Decimal("50") }));
    txMock.market.update.mockImplementationOnce(async ({ data }: { data: { yesShares: string; noShares: string } }) =>
      mkMarket({ yesShares: new Decimal(data.yesShares), noShares: new Decimal(data.noShares) }),
    );
    txMock.position.update.mockImplementationOnce(async ({ data }) => ({
      ...mkPosition(),
      shares: new Decimal(data.shares),
      costBasis: new Decimal(data.costBasis),
    }));
    txMock.trade.create.mockImplementationOnce(async ({ data }) => ({
      ...data,
      id: "t_y",
      shares: new Decimal(data.shares),
      pricePerShare: new Decimal(data.pricePerShare),
      amount: new Decimal(data.amount),
      fee: new Decimal(data.fee),
      netAmount: new Decimal(data.netAmount),
      txHash: null,
      blockNumber: null,
      createdAt: new Date(),
    }));
    txMock.balance.upsert.mockResolvedValueOnce({ available: new Decimal("25"), locked: new Decimal("0"), userId: USER.id, id: "b", totalDeposited: new Decimal("0"), totalWithdrawn: new Decimal("0"), updatedAt: new Date() });
    txMock.balance.findUnique.mockResolvedValueOnce({ available: new Decimal("25"), locked: new Decimal("0"), userId: USER.id, id: "b", totalDeposited: new Decimal("0"), totalWithdrawn: new Decimal("0"), updatedAt: new Date() });

    // Sell HALF (50 of 100). costBasis should drop from 50 → 25.
    const res = await POST(req({ marketId: CUID, outcome: "YES", shares: "50" }));
    expect(res.status).toBe(200);

    const posUpdate = txMock.position.update.mock.calls[0][0].data;
    expect(posUpdate.shares).toBe("50.000000000000000000");
    expect(posUpdate.costBasis).toBe("25.000000");
  });
});
