/**
 * GET /api/health — deep health check with per-component status.
 *
 * We mock prisma's $queryRaw and stub global fetch for the RPC call so
 * the test runs in <50ms and doesn't need any real network.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { $queryRaw: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { GET } = await import("./route");

const ORIG_RPC = process.env.NEXT_PUBLIC_RPC_URL;
const ORIG_FETCH = globalThis.fetch;

beforeEach(() => {
  prismaMock.$queryRaw.mockReset();
  process.env.NEXT_PUBLIC_RPC_URL = "http://localhost:8545";
});

afterEach(() => {
  if (ORIG_RPC === undefined) delete process.env.NEXT_PUBLIC_RPC_URL;
  else process.env.NEXT_PUBLIC_RPC_URL = ORIG_RPC;
  globalThis.fetch = ORIG_FETCH;
});

function stubFetch(handler: () => Response | Promise<Response>) {
  globalThis.fetch = (async () => handler()) as typeof fetch;
}

describe("GET /api/health", () => {
  it("returns 200 with status 'up' when DB and RPC are both healthy", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    stubFetch(() => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x123" }), { status: 200 }));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("up");
    expect(body.checks.db.status).toBe("up");
    expect(body.checks.chain.status).toBe("up");
    expect(typeof body.checks.db.latencyMs).toBe("number");
  });

  it("returns 503 when the DB check fails", async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error("Can't reach database"));
    stubFetch(() => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x123" }), { status: 200 }));

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("down");
    expect(body.checks.db.status).toBe("down");
    expect(body.checks.db.error).toContain("Can't reach database");
  });

  it("returns 503 when the RPC call fails", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    stubFetch(() => new Response("upstream down", { status: 502 }));

    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.checks.chain.status).toBe("down");
  });

  it("returns 200 when RPC is not configured (optional dependency)", async () => {
    delete process.env.NEXT_PUBLIC_RPC_URL;
    prismaMock.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checks.chain.status).toBe("up");
  });

  it("sets no-store cache control (health must never be cached)", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    stubFetch(() => new Response(JSON.stringify({ result: "0x1" }), { status: 200 }));

    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("includes the APP_VERSION in the response body", async () => {
    process.env.APP_VERSION = "v1.2.3";
    prismaMock.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    stubFetch(() => new Response(JSON.stringify({ result: "0x1" }), { status: 200 }));

    const res = await GET();
    const body = await res.json();
    expect(body.version).toBe("v1.2.3");
    delete process.env.APP_VERSION;
  });
});
