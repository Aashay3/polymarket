/**
 * GET /api/markets/updates — diff-since-timestamp polling endpoint.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Decimal } from "decimal.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { market: { findMany: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { GET } = await import("./route");

function mkMarket(id: string, updatedAt: Date) {
  return {
    id,
    slug: `s-${id}`,
    question: `Q${id}?`,
    description: "d",
    rules: "r",
    category: "c",
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
    updatedAt,
  };
}

beforeEach(() => {
  prismaMock.market.findMany.mockReset();
});

describe("GET /api/markets/updates", () => {
  it("filters by updatedAt > since when provided", async () => {
    prismaMock.market.findMany.mockResolvedValueOnce([]);
    const since = "2026-04-23T10:00:00Z";
    await GET(new Request(`http://x/api/markets/updates?since=${encodeURIComponent(since)}`));
    const call = prismaMock.market.findMany.mock.calls[0][0];
    expect(call.where.updatedAt.gt).toBeInstanceOf(Date);
    expect(call.where.updatedAt.gt.toISOString()).toBe("2026-04-23T10:00:00.000Z");
  });

  it("defaults to last 60s window when `since` is omitted", async () => {
    prismaMock.market.findMany.mockResolvedValueOnce([]);
    const before = Date.now();
    await GET(new Request("http://x/api/markets/updates"));
    const since = prismaMock.market.findMany.mock.calls[0][0].where.updatedAt.gt as Date;
    // Should be roughly 60 seconds before "now"
    const diff = before - since.getTime();
    expect(diff).toBeGreaterThanOrEqual(59_000);
    expect(diff).toBeLessThanOrEqual(61_000);
  });

  it("returns the markets plus a serverTime cursor for the next poll", async () => {
    const t = new Date("2026-04-23T12:34:56Z");
    prismaMock.market.findMany.mockResolvedValueOnce([mkMarket("a", t)]);
    const res = await GET(new Request("http://x/api/markets/updates"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.markets).toHaveLength(1);
    expect(body.data.markets[0].id).toBe("a");
    expect(typeof body.data.serverTime).toBe("string");
    expect(() => new Date(body.data.serverTime)).not.toThrow();
  });

  it("rejects invalid `since` values with 400", async () => {
    const res = await GET(new Request("http://x/api/markets/updates?since=not-a-date"));
    expect(res.status).toBe(400);
  });
});
