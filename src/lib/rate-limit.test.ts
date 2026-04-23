import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit, clientIdFromRequest, _resetForTests } from "./rate-limit";

beforeEach(() => {
  _resetForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit() — sliding window", () => {
  const config = { limit: 3, windowMs: 1000 };

  it("allows requests up to the limit", () => {
    expect(checkRateLimit("k", config).ok).toBe(true);
    expect(checkRateLimit("k", config).ok).toBe(true);
    expect(checkRateLimit("k", config).ok).toBe(true);
  });

  it("rejects the next request once the limit is hit", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("k", config);
    const blocked = checkRateLimit("k", config);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.remaining).toBe(0);
  });

  it("isolates counters per key", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("ip-A", config);
    expect(checkRateLimit("ip-A", config).ok).toBe(false);
    // ip-B's bucket is independent
    expect(checkRateLimit("ip-B", config).ok).toBe(true);
  });

  it("releases capacity after the window slides past old hits", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    for (let i = 0; i < 3; i++) checkRateLimit("k", config);
    expect(checkRateLimit("k", config).ok).toBe(false);

    // Advance past the window
    vi.setSystemTime(new Date("2026-01-01T00:00:01.5Z"));
    expect(checkRateLimit("k", config).ok).toBe(true);
  });

  it("returns accurate retryAfterMs (at most windowMs)", () => {
    const cfg = { limit: 1, windowMs: 5000 };
    checkRateLimit("k", cfg);
    const blocked = checkRateLimit("k", cfg);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(cfg.windowMs);
  });

  it("decrements remaining as hits accumulate", () => {
    expect(checkRateLimit("k", config).remaining).toBe(2);
    expect(checkRateLimit("k", config).remaining).toBe(1);
    expect(checkRateLimit("k", config).remaining).toBe(0);
  });
});

describe("clientIdFromRequest()", () => {
  it("prefers X-Forwarded-For (first hop)", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2" },
    });
    expect(clientIdFromRequest(req)).toBe("203.0.113.5");
  });

  it("falls back to X-Real-IP", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "198.51.100.7" } });
    expect(clientIdFromRequest(req)).toBe("198.51.100.7");
  });

  it("returns 'unknown' when no IP header is present", () => {
    const req = new Request("http://x");
    expect(clientIdFromRequest(req)).toBe("unknown");
  });

  it("trims whitespace around the forwarded IP", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "  192.0.2.1  " } });
    expect(clientIdFromRequest(req)).toBe("192.0.2.1");
  });
});
