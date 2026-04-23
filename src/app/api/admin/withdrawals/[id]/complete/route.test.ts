/**
 * POST /api/admin/withdrawals/[id]/complete
 *
 * Admin marks a pending withdrawal as completed with an on-chain txHash.
 * Balance.locked decreases, totalWithdrawn increases. Non-admins rejected.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "decimal.js";

const { adminMock, publishMock, txMock, prismaMock } = vi.hoisted(() => {
  const txMockObj = {
    withdrawal: { findUnique: vi.fn(), update: vi.fn() },
    balance: { update: vi.fn(), findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn() },
  };
  return {
    adminMock: vi.fn(),
    publishMock: vi.fn(),
    prismaMock: {
      withdrawal: { findUnique: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: typeof txMockObj) => Promise<unknown>) => fn(txMockObj)),
    },
    txMock: txMockObj,
  };
});

vi.mock("@/lib/auth-helpers", () => ({ requireAdmin: () => adminMock() }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/events", () => ({ publish: publishMock }));

const { POST } = await import("./route");

const ADMIN = { id: "admin_1", email: null, name: null, image: null, role: "ADMIN" as const, username: null, walletAddress: null };
const TX = "0x" + "e".repeat(64);
const USER_ID = "u_1";
const WID = "w_1";

function req(body: unknown): Request {
  return new Request("http://x/api/admin/withdrawals/w_1/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ id: WID }) };

function pendingWithdrawal() {
  return {
    id: WID,
    userId: USER_ID,
    toAddress: "0x1111",
    chainId: 80002,
    amount: new Decimal("50"),
    txHash: null,
    status: "PENDING",
    rejectionReason: null,
    processedById: null,
    requestedAt: new Date(),
    processedAt: null,
  };
}

beforeEach(() => {
  adminMock.mockResolvedValue(ADMIN);
  publishMock.mockReset();
  prismaMock.withdrawal.findUnique.mockReset();
  Object.values(txMock).forEach((m) =>
    Object.values(m).forEach((fn) => (fn as { mockReset: () => void }).mockReset()),
  );
});

describe("POST /api/admin/withdrawals/[id]/complete", () => {
  it("requires admin role", async () => {
    adminMock.mockImplementationOnce(() => {
      throw new Response(JSON.stringify({ error: "x" }), { status: 403 });
    });
    const res = await POST(req({ txHash: TX }), ctx);
    expect(res.status).toBe(403);
  });

  it("404s when withdrawal not found", async () => {
    txMock.withdrawal.findUnique.mockResolvedValueOnce(null);
    const res = await POST(req({ txHash: TX }), ctx);
    expect(res.status).toBe(404);
  });

  it("rejects completing a non-PENDING withdrawal", async () => {
    txMock.withdrawal.findUnique.mockResolvedValueOnce({ ...pendingWithdrawal(), status: "COMPLETED" });
    const res = await POST(req({ txHash: TX }), ctx);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_STATE");
  });

  it("rejects a txHash that's already attached to another withdrawal", async () => {
    prismaMock.withdrawal.findUnique.mockResolvedValueOnce({ ...pendingWithdrawal(), id: "w_other" });
    const res = await POST(req({ txHash: TX }), ctx);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("DUPLICATE_TX");
  });

  it("happy path: decrements locked, bumps totalWithdrawn, records txHash + admin", async () => {
    prismaMock.withdrawal.findUnique.mockResolvedValueOnce(null); // no duplicate
    txMock.withdrawal.findUnique.mockResolvedValueOnce(pendingWithdrawal());
    txMock.withdrawal.update.mockResolvedValueOnce({
      ...pendingWithdrawal(),
      status: "COMPLETED",
      txHash: TX,
      processedById: ADMIN.id,
      processedAt: new Date(),
    });
    txMock.balance.update.mockResolvedValueOnce({});
    txMock.balance.findUnique.mockResolvedValueOnce({ available: new Decimal("0"), locked: new Decimal("0") });
    txMock.auditLog.create.mockResolvedValue({});
    txMock.notification.create.mockResolvedValue({});

    const res = await POST(req({ txHash: TX }), ctx);
    expect(res.status).toBe(200);

    // locked -= amount, totalWithdrawn += amount
    const balUpdate = txMock.balance.update.mock.calls[0][0];
    expect(balUpdate.where.userId).toBe(USER_ID);
    expect(balUpdate.data.locked).toEqual({ decrement: expect.anything() });
    expect(balUpdate.data.totalWithdrawn).toEqual({ increment: expect.anything() });

    // Withdrawal row updated with txHash + admin
    const wUpdate = txMock.withdrawal.update.mock.calls[0][0];
    expect(wUpdate.data.txHash).toBe(TX);
    expect(wUpdate.data.processedById).toBe(ADMIN.id);
    expect(wUpdate.data.status).toBe("COMPLETED");

    // Events published
    const types = publishMock.mock.calls.map((c) => c[0].type);
    expect(types).toContain("balance.changed");
    expect(types).toContain("notification.new");
  });
});
