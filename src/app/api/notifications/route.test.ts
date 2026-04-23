/**
 * GET + POST /api/notifications — inbox + mark-read tests.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ requireUser: () => authMock() }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { GET, POST } = await import("./route");

const USER = { id: "u_1", email: null, name: null, image: null, role: "USER" as const, username: null, walletAddress: null };

function mkNotif(id: string, readAt: Date | null = null) {
  return {
    id,
    userId: USER.id,
    type: "POSITION_WON",
    title: "You won!",
    body: "+25 USDC",
    data: { marketId: "m_1" },
    readAt,
    createdAt: new Date("2026-04-23T10:00:00Z"),
  };
}

beforeEach(() => {
  authMock.mockResolvedValue(USER);
  prismaMock.notification.findMany.mockReset();
  prismaMock.notification.count.mockReset();
  prismaMock.notification.updateMany.mockReset();
});

describe("GET /api/notifications", () => {
  it("returns items and unreadCount, ordered newest-first", async () => {
    prismaMock.notification.findMany.mockResolvedValueOnce([mkNotif("n1"), mkNotif("n2", new Date())]);
    prismaMock.notification.count.mockResolvedValueOnce(1);
    const res = await GET(new Request("http://x/api/notifications"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.unreadCount).toBe(1);
    expect(body.data.notifications).toHaveLength(2);
    expect(body.data.notifications[0].id).toBe("n1");
    expect(body.data.notifications[0].readAt).toBeNull();
    expect(body.data.notifications[1].readAt).not.toBeNull();

    const call = prismaMock.notification.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    expect(call.where.userId).toBe(USER.id);
  });

  it("filters to unread when unreadOnly=true", async () => {
    prismaMock.notification.findMany.mockResolvedValueOnce([]);
    prismaMock.notification.count.mockResolvedValueOnce(0);
    await GET(new Request("http://x/api/notifications?unreadOnly=true"));
    const call = prismaMock.notification.findMany.mock.calls[0][0];
    expect(call.where.readAt).toBeNull();
  });

  it("401s without a session", async () => {
    authMock.mockImplementationOnce(() => {
      throw new Response(JSON.stringify({ error: "auth" }), { status: 401 });
    });
    const res = await GET(new Request("http://x/api/notifications"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/notifications (mark-read)", () => {
  function req(body: unknown): Request {
    return new Request("http://x/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("marks specific ids read (filtered to the current user + unread only)", async () => {
    prismaMock.notification.updateMany.mockResolvedValueOnce({ count: 2 });
    const ids = ["clabcdefghij1234567890ab", "clabcdefghij1234567890cd"];
    const res = await POST(req({ ids }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.markedRead).toBe(2);

    const args = prismaMock.notification.updateMany.mock.calls[0][0];
    expect(args.where.userId).toBe(USER.id);
    expect(args.where.readAt).toBeNull();
    expect(args.where.id.in).toEqual(ids);
    expect(args.data.readAt).toBeInstanceOf(Date);
  });

  it("marks all unread when markAll=true", async () => {
    prismaMock.notification.updateMany.mockResolvedValueOnce({ count: 5 });
    const res = await POST(req({ markAll: true }));
    expect(res.status).toBe(200);
    const args = prismaMock.notification.updateMany.mock.calls[0][0];
    expect(args.where.userId).toBe(USER.id);
    expect(args.where.id).toBeUndefined();
  });

  it("rejects requests with neither ids nor markAll", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });
});
