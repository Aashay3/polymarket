/**
 * GET /api/cron/close-expired — cron endpoint tests.
 *
 * Verifies the bearer-token auth gate and that it calls updateMany with
 * the right { status: OPEN, endTime <= now } filter. Each test sets/
 * restores `process.env.CRON_SECRET` and `NODE_ENV` itself so they don't
 * leak into each other.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { market: { updateMany: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { GET } = await import("./route");

const ORIG_SECRET = process.env.CRON_SECRET;
const ORIG_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  prismaMock.market.updateMany.mockReset();
});

afterEach(() => {
  process.env.CRON_SECRET = ORIG_SECRET;
  process.env.NODE_ENV = ORIG_NODE_ENV;
});

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://x/api/cron/close-expired", {
    method: "GET",
    headers,
  });
}

describe("GET /api/cron/close-expired", () => {
  it("401s in production when CRON_SECRET is set and header is missing", async () => {
    process.env.CRON_SECRET = "s3cret";
    process.env.NODE_ENV = "production";
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(prismaMock.market.updateMany).not.toHaveBeenCalled();
  });

  it("401s on wrong bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";
    process.env.NODE_ENV = "production";
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("accepts requests with the correct bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";
    process.env.NODE_ENV = "production";
    prismaMock.market.updateMany.mockResolvedValueOnce({ count: 3 });
    const res = await GET(req({ authorization: "Bearer s3cret" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.closed).toBe(3);
  });

  it("allows unauthenticated calls in development (local cron triggers)", async () => {
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = "development";
    prismaMock.market.updateMany.mockResolvedValueOnce({ count: 0 });
    const res = await GET(req());
    expect(res.status).toBe(200);
  });

  it("refuses unauthenticated calls in production even when CRON_SECRET is unset (fail closed)", async () => {
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = "production";
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("filters to OPEN markets whose endTime is in the past", async () => {
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = "development";
    prismaMock.market.updateMany.mockResolvedValueOnce({ count: 1 });
    await GET(req());
    const args = prismaMock.market.updateMany.mock.calls[0][0];
    expect(args.where.status).toBe("OPEN");
    expect(args.where.endTime.lte).toBeInstanceOf(Date);
    expect(args.data.status).toBe("CLOSED");
  });
});
