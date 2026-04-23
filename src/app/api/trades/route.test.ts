/**
 * POST /api/trades — money-path integration test with mocked Prisma.
 *
 * These tests verify the control flow without needing a real database:
 *   - auth is required
 *   - zod validation rejects bad input
 *   - closed/expired markets are refused
 *   - insufficient balance is refused
 *   - slippage is enforced (minSharesOut, price drift)
 *   - on success, pool updates, trade row is created, balance debited,
 *     position upserted — all from a single $transaction call.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "decimal.js";

// Hoisted mocks — must be declared before the module-under-test imports them.
const { authMock, txMock } = vi.hoisted(() => {
  return {
    authMock: vi.fn(),
    txMock: {
      market: { findUnique: vi.fn(), update: vi.fn() },
      balance: { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
      position: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
      trade: { create: vi.fn() },
    },
  };
});

vi.mock("@/lib/auth-helpers", () => ({
  requireUser: () => authMock(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  },
}));

// Dynamic import AFTER the mocks are registered.
const { POST } = await import("./route");

// ─── Fixtures ───────────────────────────────────────────────────

const USER = { id: "u_1", email: "a@b.co", name: "A", image: null, role: "USER" as const, username: null, walletAddress: null };

function mkMarket(overrides: Record<string, unknown> = {}) {
  return {
    id: "m_1",
    yesShares: new Decimal("5000"),
    noShares: new Decimal("5000"),
    feeBps: 200,
    status: "OPEN",
    endTime: new Date(Date.now() + 24 * 3600 * 1000),
    question: "Will X happen?",
    slug: "will-x-happen",
    description: "d",
    rules: "r",
    category: "Crypto",
    imageUrl: null,
    winningOutcome: null,
    resolutionNote: null,
    resolvedAt: null,
    createdById: null,
    resolvedById: null,
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
    ...overrides,
  };
}

function mkBalance(available: string = "100.000000") {
  return { userId: USER.id, available: new Decimal(available), locked: new Decimal("0"), totalDeposited: new Decimal("0"), totalWithdrawn: new Decimal("0"), id: "b_1", updatedAt: new Date() };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/trades", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Cuid-looking ids so the schema accepts them.
const CUID_MARKET = "ckxxxxxxxxxxxxxxxxxxxxxx";

beforeEach(() => {
  authMock.mockResolvedValue(USER);
  Object.values(txMock).forEach((model) =>
    Object.values(model).forEach((fn) => (fn as { mockReset: () => void }).mockReset()),
  );
});

// ─── Tests ──────────────────────────────────────────────────────

describe("POST /api/trades — auth", () => {
  it("returns 401 when not signed in", async () => {
    authMock.mockImplementationOnce(() => {
      throw new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 });
    });
    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "10" }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/trades — validation", () => {
  it("rejects invalid outcome", async () => {
    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "MAYBE", amount: "10" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects non-positive amount", async () => {
    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "0" }));
    expect(res.status).toBe(400);
  });

  it("rejects amount above the single-trade cap", async () => {
    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "99999999" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/trades — market state checks", () => {
  it("404s when market doesn't exist", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "10" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("refuses trades on CLOSED markets", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket({ status: "CLOSED" }));
    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "10" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MARKET_CLOSED");
  });

  it("refuses trades after endTime", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(
      mkMarket({ endTime: new Date(Date.now() - 3600 * 1000) }),
    );
    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "10" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MARKET_EXPIRED");
  });
});

describe("POST /api/trades — balance & slippage", () => {
  it("refuses when balance.available < amount", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.balance.upsert.mockResolvedValueOnce(mkBalance("5.000000"));
    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "10" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INSUFFICIENT_BALANCE");
    // Balance was NOT debited because we never reached the update call
    expect(txMock.balance.update).not.toHaveBeenCalled();
  });

  it("enforces minSharesOut (slippage floor)", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.balance.upsert.mockResolvedValueOnce(mkBalance("1000.000000"));
    // A 10 USDC buy on a 50/50 pool returns ~19.5 shares. Require way more.
    const res = await POST(
      makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "10", minSharesOut: "100" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("SLIPPAGE");
    expect(txMock.trade.create).not.toHaveBeenCalled();
  });

  it("rejects stale expectedPrice (drift > 100 bps)", async () => {
    // Pool 50/50 → spot(YES) = 0.5. Client claims 0.30 → 20% drift = 2000 bps.
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.balance.upsert.mockResolvedValueOnce(mkBalance());
    const res = await POST(
      makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "10", expectedPrice: 0.3 }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("PRICE_DRIFT");
  });
});

describe("POST /api/trades — happy path", () => {
  it("executes a new-position BUY: pool updated, trade/position created, balance debited", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.balance.upsert.mockResolvedValueOnce(mkBalance("100.000000"));
    txMock.balance.update.mockResolvedValueOnce(mkBalance("90.000000"));
    txMock.market.update.mockImplementationOnce(async ({ data }: { data: { yesShares: string; noShares: string } }) =>
      mkMarket({ id: "m_1", yesShares: new Decimal(data.yesShares), noShares: new Decimal(data.noShares) }),
    );
    txMock.position.findUnique.mockResolvedValueOnce(null); // new position
    txMock.position.create.mockImplementationOnce(async ({ data }) => ({ ...data, id: "p_new", shares: new Decimal(data.shares), avgPrice: new Decimal(data.avgPrice), costBasis: new Decimal(data.costBasis), settled: false, settledAt: null, createdAt: new Date(), updatedAt: new Date() }));
    txMock.trade.create.mockImplementationOnce(async ({ data }) => ({ ...data, id: "t_new", shares: new Decimal(data.shares), pricePerShare: new Decimal(data.pricePerShare), amount: new Decimal(data.amount), fee: new Decimal(data.fee), netAmount: new Decimal(data.netAmount), txHash: null, blockNumber: null, createdAt: new Date() }));
    txMock.balance.findUnique.mockResolvedValueOnce(mkBalance("90.000000"));

    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "10" }));
    expect(res.status).toBe(200);

    // Pool moved in the right direction (YES bought → yesShares decreases, noShares grows)
    const poolUpdate = txMock.market.update.mock.calls[0][0].data;
    expect(new Decimal(poolUpdate.noShares).gt(5000)).toBe(true);
    expect(new Decimal(poolUpdate.yesShares).lt(5000)).toBe(true);

    // Trade row was a BUY with the gross amount
    const tradeCreate = txMock.trade.create.mock.calls[0][0].data;
    expect(tradeCreate.side).toBe("BUY");
    expect(tradeCreate.amount).toBe("10.000000");
    expect(tradeCreate.outcome).toBe("YES");
    // Fee is 2% of 10 = 0.20
    expect(tradeCreate.fee).toBe("0.200000");
    expect(tradeCreate.netAmount).toBe("9.800000");

    // Balance was decremented by the full gross amount
    expect(txMock.balance.update).toHaveBeenCalledWith({
      where: { userId: USER.id },
      data: { available: { decrement: "10.000000" } },
    });

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.trade.side).toBe("BUY");
    expect(body.data.market.id).toBe("m_1");
  });

  it("updates an existing position with weighted-average cost basis", async () => {
    const existing = {
      id: "p_1",
      userId: USER.id,
      marketId: "m_1",
      outcome: "YES" as const,
      shares: new Decimal("20.000000000000000000"),
      avgPrice: new Decimal("0.50000000"),
      costBasis: new Decimal("10.000000"),
      settled: false,
      settledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.balance.upsert.mockResolvedValueOnce(mkBalance("100"));
    txMock.balance.update.mockResolvedValueOnce(mkBalance("90"));
    txMock.market.update.mockImplementationOnce(async ({ data }: { data: { yesShares: string; noShares: string } }) =>
      mkMarket({ id: "m_1", yesShares: new Decimal(data.yesShares), noShares: new Decimal(data.noShares) }),
    );
    txMock.position.findUnique.mockResolvedValueOnce(existing);
    txMock.position.update.mockImplementationOnce(async ({ data }) => ({ ...existing, ...data, shares: new Decimal(data.shares), avgPrice: new Decimal(data.avgPrice), costBasis: new Decimal(data.costBasis) }));
    txMock.trade.create.mockImplementationOnce(async ({ data }) => ({ ...data, id: "t_2", shares: new Decimal(data.shares), pricePerShare: new Decimal(data.pricePerShare), amount: new Decimal(data.amount), fee: new Decimal(data.fee), netAmount: new Decimal(data.netAmount), txHash: null, blockNumber: null, createdAt: new Date() }));
    txMock.balance.findUnique.mockResolvedValueOnce(mkBalance("90"));

    const res = await POST(makeRequest({ marketId: CUID_MARKET, outcome: "YES", amount: "10" }));
    expect(res.status).toBe(200);

    const posUpdate = txMock.position.update.mock.calls[0][0].data;
    // Old: 20 shares, cost 10.  New trade adds more shares + 10 cost.
    // New shares > 20, new cost basis = 20 (10 old + 10 new)
    expect(new Decimal(posUpdate.shares).gt(20)).toBe(true);
    expect(posUpdate.costBasis).toBe("20.000000");
    // Weighted-avg cost basis / shares = new avgPrice. Buying more YES on
    // a 50/50 pool pushes the marginal price above 0.5, so the blended
    // avg moves up from 0.50 (old) toward ~0.51, still < 0.55.
    const newAvg = new Decimal(posUpdate.avgPrice);
    expect(newAvg.gt("0.50000000")).toBe(true);
    expect(newAvg.lt("0.55000000")).toBe(true);

    expect(txMock.position.create).not.toHaveBeenCalled();
  });
});
