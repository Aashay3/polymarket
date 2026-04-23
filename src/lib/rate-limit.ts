/**
 * Minimal in-process sliding-window rate limiter.
 *
 * Keyed arbitrarily (usually IP, sometimes userId + route). Stores
 * timestamps in an LRU-ish Map; old keys are lazily evicted on access.
 *
 * Scale note: this is per-process. Behind a load balancer with N
 * instances, the effective rate is N * limit. That's acceptable for
 * pre-audit launch. Phase 8 swaps the Map for Redis-backed storage
 * (Upstash, Redis Cluster, whatever) and the public API stays the same.
 */

interface Bucket {
  hits: number[]; // timestamps in ms, sorted ascending
}

// Cap total memory. If we start tracking more keys than this, oldest
// untouched entries get evicted.
const MAX_KEYS = 50_000;

declare global {
  var __rateLimiter: Map<string, Bucket> | undefined;
}

const store: Map<string, Bucket> = globalThis.__rateLimiter ?? new Map();
if (process.env.NODE_ENV !== "production") globalThis.__rateLimiter = store;

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check-and-consume. Returns `ok: true` if the request is within budget;
 * `ok: false` with `retryAfterMs` > 0 otherwise.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const bucket = store.get(key) ?? { hits: [] };
  // Drop timestamps that fell out of the window.
  bucket.hits = bucket.hits.filter((t) => t > windowStart);

  if (bucket.hits.length >= config.limit) {
    // Rejected. retryAfter = when the OLDEST hit in the bucket will age out.
    const retryAfterMs = Math.max(0, bucket.hits[0] - windowStart);
    store.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterMs };
  }

  bucket.hits.push(now);
  store.set(key, bucket);

  // Cheap eviction: if we blew past MAX_KEYS, drop the oldest entry.
  if (store.size > MAX_KEYS) {
    const iter = store.keys().next();
    if (!iter.done) store.delete(iter.value);
  }

  return { ok: true, remaining: config.limit - bucket.hits.length, retryAfterMs: 0 };
}

/**
 * Extract a best-effort client identifier from a Request. Prefers the
 * proxy-forwarded IP since we'll run behind one in production.
 */
export function clientIdFromRequest(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

// Preset configs, named for clarity at the call site.
export const RATE_LIMITS = {
  // Brute-force protection on signin. Bcrypt is slow but not a substitute
  // for rate limiting — attackers might try millions of accounts, not one.
  signin: { limit: 10, windowMs: 60_000 },

  // Account creation abuse / spam registration.
  signup: { limit: 5, windowMs: 60 * 60_000 }, // 5 accounts / hour / IP

  // SIWE nonce endpoint — anyone can trigger DB writes (VerificationToken).
  siweNonce: { limit: 30, windowMs: 60_000 },

  // Trade flood protection. Even authenticated, we don't want a single
  // account to hammer the AMM and monopolize the event loop.
  trade: { limit: 30, windowMs: 60_000 },

  // Deposit submission — each call triggers an RPC call to the chain.
  deposit: { limit: 10, windowMs: 60_000 },

  // Withdrawal requests — rarer action.
  withdrawal: { limit: 5, windowMs: 60 * 60_000 },
} as const;

// Test-only helper.
export function _resetForTests(): void {
  store.clear();
}
