/**
 * POST /api/admin/markets/[id]/resolve — tests winner payout logic
 * with mocked Prisma. Non-admin users should be rejected.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "decimal.js";

const { adminMock, txMock } = vi.hoisted(() => ({
  adminMock: vi.fn(),
  txMock: {
    market: { findUnique: vi.fn(), update: vi.fn() },
    balance: { upsert: vi.fn() },
    position: { findMany: vi.fn(), update: vi.fn() },
    trade: { create: vi.fn() },
    notification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ requireAdmin: () => adminMock() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
  },
}));

const { POST } = await import("./route");

const ADMIN = { id: "admin_1", email: null, name: null, image: null, role: "ADMIN" as const, username: null, walletAddress: null };

function mkMarket(overrides: Record<string, unknown> = {}) {
  return {
    id: "m_1",
    yesShares: new Decimal("5000"),
    noShares: new Decimal("5000"),
    feeBps: 200,
    status: "OPEN",
    winningOutcome: null,
    resolutionNote: null,
    resolvedAt: null,
    resolvedById: null,
    endTime: new Date(Date.now() + 86400000),
    question: "Will X?",
    slug: "s",
    description: "d",
    rules: "r",
    category: "c",
    imageUrl: null,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mkPosition(id: string, userId: string, outcome: "YES" | "NO", shares: string, cost: string) {
  return {
    id,
    userId,
    marketId: "m_1",
    outcome,
    shares: new Decimal(shares),
    avgPrice: new Decimal("0.5"),
    costBasis: new Decimal(cost),
    settled: false,
    settledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function req(body: unknown): Request {
  return new Request("http://x/api/admin/markets/m_1/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ id: "m_1" }) };

beforeEach(() => {
  adminMock.mockResolvedValue(ADMIN);
  Object.values(txMock).forEach((m) =>
    Object.values(m).forEach((fn) => (fn as { mockReset: () => void }).mockReset()),
  );
  // Default: notification.create resolves (route calls `.catch()` on it).
  txMock.notification.create.mockResolvedValue({});
  // Default: other mocks that don't care about return value still need to be promises
  txMock.position.update.mockResolvedValue({});
  txMock.auditLog.create.mockResolvedValue({});
});

describe("POST /api/admin/markets/[id]/resolve", () => {
  it("requires admin role", async () => {
    adminMock.mockImplementationOnce(() => {
      throw new Response(JSON.stringify({ error: "Admin required" }), { status: 403 });
    });
    const res = await POST(req({ outcome: "YES" }), ctx);
    expect(res.status).toBe(403);
  });

  it("404s when market not found", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(null);
    const res = await POST(req({ outcome: "YES" }), ctx);
    expect(res.status).toBe(404);
  });

  it("rejects already-resolved markets", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket({ status: "RESOLVED" }));
    const res = await POST(req({ outcome: "YES" }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("ALREADY_RESOLVED");
  });

  it("pays winners 1 USDC per share and marks loser positions settled without payout", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.position.findMany.mockResolvedValueOnce([
      mkPosition("p_w1", "u_winner1", "YES", "25", "10"),
      mkPosition("p_w2", "u_winner2", "YES", "15", "7"),
      mkPosition("p_l1", "u_loser1", "NO", "30", "15"),
    ]);
    txMock.market.update.mockResolvedValueOnce(mkMarket({ status: "RESOLVED", winningOutcome: "YES" }));

    const res = await POST(req({ outcome: "YES" }), ctx);
    expect(res.status).toBe(200);

    // Two winners got balance credits
    const upsertCalls = txMock.balance.upsert.mock.calls.map((c) => c[0]);
    expect(upsertCalls).toHaveLength(2);
    expect(upsertCalls.map((c) => c.where.userId).sort()).toEqual(["u_winner1", "u_winner2"]);
    // Loser userId never appears in balance.upsert
    expect(upsertCalls.find((c) => c.where.userId === "u_loser1")).toBeUndefined();

    // Two synthetic SELL trades created at price 1.0 for winners
    const tradeCalls = txMock.trade.create.mock.calls.map((c) => c[0].data);
    expect(tradeCalls).toHaveLength(2);
    tradeCalls.forEach((t) => {
      expect(t.side).toBe("SELL");
      expect(t.pricePerShare).toBe("1.00000000");
    });
    // Amounts equal shares (1:1 payout): 25 and 15 USDC
    expect(tradeCalls.map((t) => t.amount).sort()).toEqual(["15.000000", "25.000000"]);

    // ALL positions marked settled (winners AND losers)
    expect(txMock.position.update).toHaveBeenCalledTimes(3);
    txMock.position.update.mock.calls.forEach((call) => {
      expect(call[0].data.settled).toBe(true);
    });

    // Market transitioned to RESOLVED
    expect(txMock.market.update.mock.calls[0][0].data).toMatchObject({
      status: "RESOLVED",
      winningOutcome: "YES",
      resolvedById: ADMIN.id,
    });

    // Audit log recorded
    expect(txMock.auditLog.create).toHaveBeenCalled();
    const audit = txMock.auditLog.create.mock.calls[0][0].data;
    expect(audit.action).toBe("market.resolve");
    expect(audit.actorId).toBe(ADMIN.id);

    // Response body summary
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.winnersCount).toBe(2);
    expect(body.data.totalPaid).toBe("40.000000"); // 25 + 15
  });

  it("handles zero-winner resolution (everyone held the losing side)", async () => {
    txMock.market.findUnique.mockResolvedValueOnce(mkMarket());
    txMock.position.findMany.mockResolvedValueOnce([
      mkPosition("p_l1", "u_a", "NO", "100", "50"),
      mkPosition("p_l2", "u_b", "NO", "50", "25"),
    ]);
    txMock.market.update.mockResolvedValueOnce(mkMarket({ status: "RESOLVED", winningOutcome: "YES" }));

    const res = await POST(req({ outcome: "YES" }), ctx);
    expect(res.status).toBe(200);

    expect(txMock.balance.upsert).not.toHaveBeenCalled();
    expect(txMock.trade.create).not.toHaveBeenCalled();
    // Both loser positions still marked settled
    expect(txMock.position.update).toHaveBeenCalledTimes(2);

    const body = await res.json();
    expect(body.data.winnersCount).toBe(0);
    expect(body.data.totalPaid).toBe("0.000000");
  });
});
