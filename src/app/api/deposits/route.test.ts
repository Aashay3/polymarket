/**
 * POST /api/deposits + GET /api/deposits — deposit submission & history.
 *
 * Mocks the chain verifier + Prisma so we can exercise every branch:
 *   - idempotent duplicate submit
 *   - user has no linked wallet
 *   - on-chain verification failure modes
 *   - sender mismatch
 *   - successful credit path (balance incremented, notification issued)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "decimal.js";

const { authMock, prismaMock, verifyMock, publishMock, txMock } = vi.hoisted(() => {
  const txMockObj = {
    deposit: { create: vi.fn() },
    balance: { upsert: vi.fn() },
    auditLog: { create: vi.fn() },
    notification: { create: vi.fn() },
  };
  return {
    authMock: vi.fn(),
    verifyMock: vi.fn(),
    publishMock: vi.fn(),
    prismaMock: {
      deposit: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
      wallet: { findMany: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: typeof txMockObj) => Promise<unknown>) => fn(txMockObj)),
    },
    txMock: txMockObj,
  };
});

vi.mock("@/lib/auth-helpers", () => ({ requireUser: () => authMock() }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/chain", () => ({
  verifyUsdcDeposit: (hash: string) => verifyMock(hash),
  getChainId: () => 80002,
  getDepositAddress: () => "0x0000000000000000000000000000000000000001",
  getUsdcAddress: () => "0x0000000000000000000000000000000000000002",
}));
vi.mock("@/lib/events", () => ({ publish: publishMock }));

const { POST, GET } = await import("./route");

const USER = { id: "u_1", email: "a@b.co", name: null, image: null, role: "USER" as const, username: null, walletAddress: null };
const TX = "0x" + "a".repeat(64);
const USER_WALLET = "0x1111111111111111111111111111111111111111";

function req(body: unknown): Request {
  return new Request("http://x/api/deposits", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  authMock.mockResolvedValue(USER);
  Object.values(prismaMock).forEach((v) => {
    if (v && typeof v === "object") {
      Object.values(v).forEach((fn) => {
        if (typeof (fn as { mockReset?: () => void }).mockReset === "function") {
          (fn as { mockReset: () => void }).mockReset();
        }
      });
    }
  });
  Object.values(txMock).forEach((m) =>
    Object.values(m).forEach((fn) => (fn as { mockReset: () => void }).mockReset()),
  );
  verifyMock.mockReset();
  publishMock.mockReset();

  // Sensible defaults
  prismaMock.deposit.findUnique.mockResolvedValue(null);
  prismaMock.wallet.findMany.mockResolvedValue([{ address: USER_WALLET }]);
});

describe("POST /api/deposits — idempotency + auth", () => {
  it("returns the existing deposit row on duplicate txHash", async () => {
    const existing = {
      id: "dep_1",
      userId: USER.id,
      txHash: TX,
      chainId: 80002,
      tokenAddress: "0x2",
      fromAddress: USER_WALLET,
      toAddress: "0x1",
      amount: new Decimal("25"),
      status: "CONFIRMED",
      rejectionReason: null,
      blockNumber: 42,
      createdAt: new Date(),
      confirmedAt: new Date(),
    };
    prismaMock.deposit.findUnique.mockResolvedValueOnce(existing);
    const res = await POST(req({ txHash: TX }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.duplicate).toBe(true);
    expect(body.data.deposit.id).toBe("dep_1");
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("rejects when the user has no linked wallet", async () => {
    prismaMock.wallet.findMany.mockResolvedValueOnce([]);
    const res = await POST(req({ txHash: TX }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("NO_WALLET");
  });

  it("401s without a session", async () => {
    authMock.mockImplementationOnce(() => {
      throw new Response(JSON.stringify({ error: "auth" }), { status: 401 });
    });
    const res = await POST(req({ txHash: TX }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/deposits — verification failure branches", () => {
  it("records a REJECTED deposit row when verification fails", async () => {
    verifyMock.mockResolvedValueOnce({
      ok: false,
      error: { reason: "WRONG_TOKEN", message: "Not USDC" },
    });
    const rejectedRow = {
      id: "dep_r",
      userId: USER.id,
      txHash: TX,
      chainId: 80002,
      tokenAddress: "",
      fromAddress: "",
      toAddress: "",
      amount: new Decimal("0"),
      status: "REJECTED",
      rejectionReason: "WRONG_TOKEN: Not USDC",
      blockNumber: null,
      createdAt: new Date(),
      confirmedAt: null,
    };
    prismaMock.deposit.create.mockResolvedValueOnce(rejectedRow);

    const res = await POST(req({ txHash: TX }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.data.error.reason).toBe("WRONG_TOKEN");
    expect(body.data.deposit.status).toBe("REJECTED");
    // Credit never happened
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects with SENDER_MISMATCH when from-address is someone else's wallet", async () => {
    verifyMock.mockResolvedValueOnce({
      ok: true,
      deposit: {
        fromAddress: "0x9999999999999999999999999999999999999999",
        toAddress: "0x0000000000000000000000000000000000000001",
        amount: new Decimal("50"),
        blockNumber: 100,
        confirmations: 20,
        tokenAddress: "0x0000000000000000000000000000000000000002",
      },
    });
    const rejectedRow = {
      id: "dep_m",
      userId: USER.id,
      txHash: TX,
      chainId: 80002,
      tokenAddress: "0x2",
      fromAddress: "0x9999999999999999999999999999999999999999",
      toAddress: "0x1",
      amount: new Decimal("50"),
      status: "REJECTED",
      rejectionReason: "SENDER_MISMATCH: tx sender does not match any wallet linked to your account",
      blockNumber: 100,
      createdAt: new Date(),
      confirmedAt: null,
    };
    prismaMock.deposit.create.mockResolvedValueOnce(rejectedRow);

    const res = await POST(req({ txHash: TX }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.data.error.reason).toBe("SENDER_MISMATCH");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("POST /api/deposits — happy path", () => {
  it("credits the balance and publishes balance.changed + notification.new", async () => {
    verifyMock.mockResolvedValueOnce({
      ok: true,
      deposit: {
        fromAddress: USER_WALLET,
        toAddress: "0x0000000000000000000000000000000000000001",
        amount: new Decimal("100"),
        blockNumber: 200,
        confirmations: 20,
        tokenAddress: "0x0000000000000000000000000000000000000002",
      },
    });

    const createdDeposit = {
      id: "dep_ok",
      userId: USER.id,
      txHash: TX,
      chainId: 80002,
      tokenAddress: "0x2",
      fromAddress: USER_WALLET,
      toAddress: "0x1",
      amount: new Decimal("100"),
      status: "CONFIRMED",
      rejectionReason: null,
      blockNumber: 200,
      createdAt: new Date(),
      confirmedAt: new Date(),
    };
    const updatedBalance = { available: new Decimal("100"), locked: new Decimal("0") };

    txMock.deposit.create.mockResolvedValueOnce(createdDeposit);
    txMock.balance.upsert.mockResolvedValueOnce(updatedBalance);
    txMock.auditLog.create.mockResolvedValue({});
    txMock.notification.create.mockResolvedValue({});

    const res = await POST(req({ txHash: TX }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.deposit.status).toBe("CONFIRMED");
    expect(body.data.deposit.amount).toBe("100");

    // Balance credited with the verified amount
    expect(txMock.balance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER.id },
        update: expect.objectContaining({
          available: { increment: "100.000000" },
          totalDeposited: { increment: "100.000000" },
        }),
      }),
    );

    // Two events published: balance + notification
    expect(publishMock).toHaveBeenCalledTimes(2);
    const types = publishMock.mock.calls.map((c) => c[0].type);
    expect(types).toContain("balance.changed");
    expect(types).toContain("notification.new");
  });
});

describe("GET /api/deposits", () => {
  it("returns the user's deposits newest-first with cursor pagination", async () => {
    prismaMock.deposit.findMany.mockResolvedValueOnce([
      { id: "d1", txHash: TX, chainId: 80002, fromAddress: USER_WALLET, toAddress: "0x1", amount: new Decimal("10"), status: "CONFIRMED", rejectionReason: null, blockNumber: 1, createdAt: new Date(), confirmedAt: new Date() },
      { id: "d2", txHash: "0x" + "b".repeat(64), chainId: 80002, fromAddress: USER_WALLET, toAddress: "0x1", amount: new Decimal("5"), status: "PENDING", rejectionReason: null, blockNumber: null, createdAt: new Date(), confirmedAt: null },
    ]);
    const res = await GET(new Request("http://x/api/deposits?limit=10"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deposits).toHaveLength(2);
    expect(body.data.nextCursor).toBeNull();
    const call = prismaMock.deposit.findMany.mock.calls[0][0];
    expect(call.where.userId).toBe(USER.id);
    expect(call.orderBy).toEqual({ createdAt: "desc" });
  });
});
