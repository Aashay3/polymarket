/**
 * GET /api/markets — list filtering, sorting, and cursor pagination.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "decimal.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    market: { findMany: vi.fn() },
    // $queryRaw is used by getBaselinesForMarkets (DISTINCT ON). Default
    // returns no baselines; tests don't care about the change values.
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { GET } = await import("./route");

function mkMarket(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    slug: `slug-${id}`,
    question: `Question ${id}?`,
    description: "d",
    rules: "r",
    category: "Crypto",
    imageUrl: null,
    yesShares: new Decimal("5000"),
    noShares: new Decimal("5000"),
    feeBps: 200,
    status: "OPEN",
    winningOutcome: null,
    resolutionNote: null,
    endTime: new Date("2026-12-01"),
    resolvedAt: null,
    createdById: null,
    resolvedById: null,
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
    ...overrides,
  };
}

beforeEach(() => {
  prismaMock.market.findMany.mockReset();
});

describe("GET /api/markets", () => {
  it("returns markets in an { ok, data.markets } envelope", async () => {
    prismaMock.market.findMany.mockResolvedValueOnce([mkMarket("a"), mkMarket("b")]);
    const res = await GET(new Request("http://x/api/markets"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.markets).toHaveLength(2);
    expect(body.data.markets[0].id).toBe("a");
  });

  it("passes status filter through to Prisma", async () => {
    prismaMock.market.findMany.mockResolvedValueOnce([]);
    await GET(new Request("http://x/api/markets?status=RESOLVED"));
    expect(prismaMock.market.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "RESOLVED" }) }),
    );
  });

  it("passes search filter as ILIKE `contains`", async () => {
    prismaMock.market.findMany.mockResolvedValueOnce([]);
    await GET(new Request("http://x/api/markets?search=bitcoin"));
    const call = prismaMock.market.findMany.mock.calls[0][0];
    expect(call.where.question).toEqual({ contains: "bitcoin", mode: "insensitive" });
  });

  it("uses endTime ordering when sort=endTime", async () => {
    prismaMock.market.findMany.mockResolvedValueOnce([]);
    await GET(new Request("http://x/api/markets?sort=endTime&order=asc"));
    const call = prismaMock.market.findMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ endTime: "asc" });
  });

  it("sets nextCursor when there's another page (fetches limit+1)", async () => {
    // Limit 2 + one extra = 3 rows fetched; hasMore=true
    prismaMock.market.findMany.mockResolvedValueOnce([mkMarket("a"), mkMarket("b"), mkMarket("c")]);
    const res = await GET(new Request("http://x/api/markets?limit=2"));
    const body = await res.json();
    expect(body.data.markets).toHaveLength(2);
    expect(body.data.nextCursor).toBe("b"); // last id of the page
  });

  it("returns null nextCursor on the final page", async () => {
    prismaMock.market.findMany.mockResolvedValueOnce([mkMarket("a")]);
    const res = await GET(new Request("http://x/api/markets?limit=10"));
    const body = await res.json();
    expect(body.data.nextCursor).toBeNull();
  });

  it("applies cursor + skip:1 when cursor is provided", async () => {
    // Use a cuid-shaped string so zod's .cuid() validation passes
    const cursor = "clabcdefghij1234567890ab";
    prismaMock.market.findMany.mockResolvedValueOnce([]);
    await GET(new Request(`http://x/api/markets?cursor=${cursor}`));
    const call = prismaMock.market.findMany.mock.calls[0][0];
    expect(call.cursor).toEqual({ id: cursor });
    expect(call.skip).toBe(1);
  });

  it("rejects invalid query params with 400 VALIDATION_ERROR", async () => {
    const res = await GET(new Request("http://x/api/markets?status=NONSENSE"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
