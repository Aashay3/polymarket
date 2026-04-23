/**
 * POST /api/admin/withdrawals/[id]/reject
 *
 * Admin rejects a pending withdrawal; funds return to available.
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
const USER_ID = "u_1";
const WID = "w_1";

function req(body: unknown): Request {
  return new Request("http://x/api/admin/withdrawals/w_1/reject", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ id: WID }) };

beforeEach(() => {
  adminMock.mockResolvedValue(ADMIN);
  publishMock.mockReset();
  Object.values(txMock).forEach((m) =>
    Object.values(m).forEach((fn) => (fn as { mockReset: () => void }).mockReset()),
  );
});

describe("POST /api/admin/withdrawals/[id]/reject", () => {
  it("requires admin role", async () => {
    adminMock.mockImplementationOnce(() => {
      throw new Response(JSON.stringify({ error: "x" }), { status: 403 });
    });
    const res = await POST(req({ reason: "KYC failure" }), ctx);
    expect(res.status).toBe(403);
  });

  it("rejects missing reason", async () => {
    const res = await POST(req({}), ctx);
    expect(res.status).toBe(400);
  });

  it("404s when withdrawal not found", async () => {
    txMock.withdrawal.findUnique.mockResolvedValueOnce(null);
    const res = await POST(req({ reason: "flagged" }), ctx);
    expect(res.status).toBe(404);
  });

  it("rejects rejecting a non-PENDING withdrawal", async () => {
    txMock.withdrawal.findUnique.mockResolvedValueOnce({
      id: WID,
      userId: USER_ID,
      toAddress: "0x1",
      chainId: 80002,
      amount: new Decimal("50"),
      status: "COMPLETED",
      txHash: null,
      rejectionReason: null,
      processedById: null,
      requestedAt: new Date(),
      processedAt: null,
    });
    const res = await POST(req({ reason: "late" }), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_STATE");
  });

  it("happy path: returns locked -> available, records reason, notifies user", async () => {
    txMock.withdrawal.findUnique.mockResolvedValueOnce({
      id: WID,
      userId: USER_ID,
      toAddress: "0x1",
      chainId: 80002,
      amount: new Decimal("75"),
      status: "PENDING",
      txHash: null,
      rejectionReason: null,
      processedById: null,
      requestedAt: new Date(),
      processedAt: null,
    });
    txMock.withdrawal.update.mockResolvedValueOnce({
      id: WID,
      userId: USER_ID,
      toAddress: "0x1",
      chainId: 80002,
      amount: new Decimal("75"),
      status: "REJECTED",
      txHash: null,
      rejectionReason: "KYC required",
      processedById: ADMIN.id,
      requestedAt: new Date(),
      processedAt: new Date(),
    });
    txMock.balance.update.mockResolvedValueOnce({});
    txMock.balance.findUnique.mockResolvedValueOnce({ available: new Decimal("75"), locked: new Decimal("0") });
    txMock.auditLog.create.mockResolvedValue({});
    txMock.notification.create.mockResolvedValue({});

    const res = await POST(req({ reason: "KYC required" }), ctx);
    expect(res.status).toBe(200);

    // Balance: locked -= amount, available += amount
    const balUpdate = txMock.balance.update.mock.calls[0][0];
    expect(balUpdate.data.locked).toEqual({ decrement: expect.anything() });
    expect(balUpdate.data.available).toEqual({ increment: expect.anything() });

    // Withdrawal row marked rejected with reason + admin
    const wUpdate = txMock.withdrawal.update.mock.calls[0][0];
    expect(wUpdate.data.status).toBe("REJECTED");
    expect(wUpdate.data.rejectionReason).toBe("KYC required");
    expect(wUpdate.data.processedById).toBe(ADMIN.id);

    // Events
    const types = publishMock.mock.calls.map((c) => c[0].type);
    expect(types).toContain("balance.changed");
    expect(types).toContain("notification.new");
  });
});
