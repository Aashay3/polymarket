/**
 * POST + GET /api/withdrawals — user-side withdrawal requests.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "decimal.js";

const { authMock, publishMock, txMock, prismaMock } = vi.hoisted(() => {
  const txMockObj = {
    balance: { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    withdrawal: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    authMock: vi.fn(),
    publishMock: vi.fn(),
    prismaMock: {
      withdrawal: { findMany: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: typeof txMockObj) => Promise<unknown>) => fn(txMockObj)),
    },
    txMock: txMockObj,
  };
});

vi.mock("@/lib/auth-helpers", () => ({ requireUser: () => authMock() }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/chain", () => ({ getChainId: () => 80002 }));
vi.mock("@/lib/events", () => ({ publish: publishMock }));

const { POST, GET } = await import("./route");

const USER = { id: "u_1", email: null, name: null, image: null, role: "USER" as const, username: null, walletAddress: null };
const TO = "0x1111111111111111111111111111111111111111";

function req(body: unknown): Request {
  return new Request("http://x/api/withdrawals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authMock.mockResolvedValue(USER);
  publishMock.mockReset();
  prismaMock.withdrawal.findMany.mockReset();
  Object.values(txMock).forEach((m) =>
    Object.values(m).forEach((fn) => (fn as { mockReset: () => void }).mockReset()),
  );
});

describe("POST /api/withdrawals", () => {
  it("rejects amounts below MIN_WITHDRAWAL_USDC", async () => {
    const res = await POST(req({ toAddress: TO, amount: "1" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BELOW_MINIMUM");
  });

  it("rejects on insufficient balance (no state mutation)", async () => {
    txMock.balance.upsert.mockResolvedValueOnce({ available: new Decimal("5") });
    const res = await POST(req({ toAddress: TO, amount: "50" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INSUFFICIENT_BALANCE");
    expect(txMock.withdrawal.create).not.toHaveBeenCalled();
    expect(txMock.balance.update).not.toHaveBeenCalled();
  });

  it("moves funds from available -> locked + creates a PENDING withdrawal", async () => {
    txMock.balance.upsert.mockResolvedValueOnce({ available: new Decimal("200") });
    txMock.balance.update.mockResolvedValueOnce({});
    txMock.withdrawal.create.mockResolvedValueOnce({
      id: "w_1",
      userId: USER.id,
      toAddress: TO,
      chainId: 80002,
      amount: new Decimal("100"),
      status: "PENDING",
      txHash: null,
      rejectionReason: null,
      requestedAt: new Date(),
      processedAt: null,
    });
    txMock.auditLog.create.mockResolvedValue({});
    txMock.balance.findUnique.mockResolvedValueOnce({ available: new Decimal("100"), locked: new Decimal("100") });

    const res = await POST(req({ toAddress: TO, amount: "100" }));
    expect(res.status).toBe(201);

    // Balance was decremented + locked was incremented by the same amount
    expect(txMock.balance.update).toHaveBeenCalledWith({
      where: { userId: USER.id },
      data: {
        available: { decrement: "100.000000" },
        locked: { increment: "100.000000" },
      },
    });

    // Withdrawal row was inserted with PENDING status
    const created = txMock.withdrawal.create.mock.calls[0][0].data;
    expect(created.status).toBe("PENDING");
    expect(created.toAddress).toBe(TO);
    expect(created.amount).toBe("100.000000");

    // balance.changed was broadcast
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "balance.changed", userId: USER.id }),
    );
  });

  it("normalizes the destination address to lowercase", async () => {
    const mixedCase = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaa";
    txMock.balance.upsert.mockResolvedValueOnce({ available: new Decimal("200") });
    txMock.balance.update.mockResolvedValueOnce({});
    txMock.withdrawal.create.mockResolvedValueOnce({
      id: "w_c",
      userId: USER.id,
      toAddress: mixedCase.toLowerCase(),
      chainId: 80002,
      amount: new Decimal("100"),
      status: "PENDING",
      txHash: null,
      rejectionReason: null,
      requestedAt: new Date(),
      processedAt: null,
    });
    txMock.auditLog.create.mockResolvedValue({});
    txMock.balance.findUnique.mockResolvedValueOnce({ available: new Decimal("100"), locked: new Decimal("100") });

    await POST(req({ toAddress: mixedCase, amount: "100" }));
    const created = txMock.withdrawal.create.mock.calls[0][0].data;
    expect(created.toAddress).toBe(mixedCase.toLowerCase());
  });

  it("validates input (bad address)", async () => {
    const res = await POST(req({ toAddress: "0xnotanaddress", amount: "100" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/withdrawals", () => {
  it("returns user's withdrawals newest-first", async () => {
    prismaMock.withdrawal.findMany.mockResolvedValueOnce([
      { id: "w1", userId: USER.id, toAddress: TO, chainId: 80002, amount: new Decimal("100"), status: "COMPLETED", txHash: "0x" + "c".repeat(64), rejectionReason: null, requestedAt: new Date(), processedAt: new Date() },
      { id: "w2", userId: USER.id, toAddress: TO, chainId: 80002, amount: new Decimal("25"), status: "PENDING", txHash: null, rejectionReason: null, requestedAt: new Date(), processedAt: null },
    ]);
    const res = await GET(new Request("http://x/api/withdrawals?limit=5"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.withdrawals).toHaveLength(2);
    const call = prismaMock.withdrawal.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ requestedAt: "desc" });
    expect(call.where.userId).toBe(USER.id);
  });
});
