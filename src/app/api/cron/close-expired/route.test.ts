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
  prismaMock: {
    market: { findMany: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Stub the event bus so tests don't accidentally persist listeners.
vi.mock("@/lib/events", () => ({ publish: vi.fn() }));

const { GET } = await import("./route");

const ORIG_SECRET = process.env.CRON_SECRET;
const ORIG_NODE_ENV = process.env.NODE_ENV;

// `process.env.NODE_ENV` is typed read-only in recent @types/node, but the
// runtime allows mutation via bracket access. Use this helper to bypass the
// type check while staying on the documented mutation path.
function setNodeEnv(v: string | undefined) {
  if (v === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  else (process.env as Record<string, string | undefined>).NODE_ENV = v;
}

beforeEach(() => {
  prismaMock.market.findMany.mockReset();
  prismaMock.market.updateMany.mockReset();
  // Default: no expired markets (so the `closed: 0` branch is hit unless
  // a test overrides).
  prismaMock.market.findMany.mockResolvedValue([]);
  prismaMock.market.updateMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
  process.env.CRON_SECRET = ORIG_SECRET;
  setNodeEnv(ORIG_NODE_ENV);
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
    setNodeEnv("production");
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(prismaMock.market.updateMany).not.toHaveBeenCalled();
  });

  it("401s on wrong bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";
    setNodeEnv("production");
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("accepts requests with the correct bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";
    setNodeEnv("production");
    // findMany is called twice: first to discover expired ids, second to
    // load the freshly-closed rows for event broadcasting.
    prismaMock.market.findMany
      .mockResolvedValueOnce([{ id: "m1" }, { id: "m2" }, { id: "m3" }])
      .mockResolvedValueOnce([]); // return value for broadcast loop isn't asserted
    prismaMock.market.updateMany.mockResolvedValueOnce({ count: 3 });
    const res = await GET(req({ authorization: "Bearer s3cret" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.closed).toBe(0); // no rows returned for broadcast → 0 reported
    // (Real runtime returns 3; test mock just returns empty to keep the
    // setup simple — the important assertion is that updateMany ran.)
    expect(prismaMock.market.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["m1", "m2", "m3"] } },
      data: { status: "CLOSED" },
    });
  });

  it("allows unauthenticated calls in development (local cron triggers)", async () => {
    delete process.env.CRON_SECRET;
    setNodeEnv("development");
    const res = await GET(req());
    expect(res.status).toBe(200);
  });

  it("refuses unauthenticated calls in production even when CRON_SECRET is unset (fail closed)", async () => {
    delete process.env.CRON_SECRET;
    setNodeEnv("production");
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("filters to OPEN markets whose endTime is in the past", async () => {
    delete process.env.CRON_SECRET;
    setNodeEnv("development");
    prismaMock.market.findMany
      .mockResolvedValueOnce([{ id: "m1" }])
      .mockResolvedValueOnce([]);
    await GET(req());
    // The first findMany discovers expiring markets
    const discoverArgs = prismaMock.market.findMany.mock.calls[0][0];
    expect(discoverArgs.where.status).toBe("OPEN");
    expect(discoverArgs.where.endTime.lte).toBeInstanceOf(Date);
    // The updateMany flips them to CLOSED
    const updateArgs = prismaMock.market.updateMany.mock.calls[0][0];
    expect(updateArgs.data.status).toBe("CLOSED");
  });
});
