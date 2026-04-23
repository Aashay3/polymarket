/**
 * Shared API primitives for Next.js route handlers.
 *
 * - `ok(data)` / `err(code, message)` — consistent JSON envelope
 * - `handler(fn)` — wraps a handler so thrown `Response` objects (from
 *   requireUser/requireAdmin), `ZodError` validation failures, and
 *   uncaught exceptions all return structured JSON instead of HTML.
 * - `json(req)` — safe JSON body parse (rejects empty / invalid).
 */

import { ZodError, type ZodSchema } from "zod";
import { checkRateLimit, clientIdFromRequest, type RateLimitConfig } from "./rate-limit";
import { logger, newRequestId } from "./logger";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string; details?: unknown } };

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  return jsonResponse({ ok: true, data }, init);
}

export function err(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  return jsonResponse({ ok: false, error: { code, message, details } }, { status });
}

// Parse + validate a JSON body against a Zod schema. Throws on failure —
// `handler()` converts the throw into a 400 envelope.
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("INVALID_JSON", "Request body must be valid JSON", 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", "Invalid request body", 400, parsed.error.issues);
  }
  return parsed.data;
}

// Parse + validate URL search params against a Zod schema.
export function parseQuery<T>(req: Request, schema: ZodSchema<T>): T {
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", "Invalid query params", 400, parsed.error.issues);
  }
  return parsed.data;
}

/**
 * Reject mutating requests when the operator has flipped the kill switch.
 *
 * Controlled by `MAINTENANCE_MODE` env. Set to a truthy value to freeze
 * the system: no trades, no deposits, no withdrawals, no admin writes.
 * GET requests still work so users can see their balance / history and
 * a banner explaining the outage.
 *
 * Call from any POST/PUT/DELETE handler as the very first line after auth.
 * Operator uses this before responding to incidents — flip the flag,
 * investigate, flip back.
 */
export function requireWritesEnabled(): void {
  const flag = process.env.MAINTENANCE_MODE;
  if (flag && flag !== "false" && flag !== "0") {
    throw new ApiError(
      "MAINTENANCE_MODE",
      "The platform is in read-only maintenance mode. Trading and withdrawals are temporarily paused.",
      503,
    );
  }
}

/**
 * Enforce a rate limit. Throws ApiError(TOO_MANY_REQUESTS) if the caller
 * is over budget. Callers usually key by `${config-name}:${ip}`; for
 * authenticated endpoints we also include the user id so a single abusive
 * IP can't starve everyone else out.
 */
export function rateLimit(req: Request, config: RateLimitConfig, keyPrefix: string, subKey?: string): void {
  const ip = clientIdFromRequest(req);
  const key = subKey ? `${keyPrefix}:${ip}:${subKey}` : `${keyPrefix}:${ip}`;
  const result = checkRateLimit(key, config);
  if (!result.ok) {
    throw new ApiError(
      "TOO_MANY_REQUESTS",
      "Rate limit exceeded. Try again shortly.",
      429,
      { retryAfterMs: result.retryAfterMs },
    );
  }
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Wrap a route handler so known error shapes become clean JSON envelopes.
// Uncaught exceptions are logged server-side with a request id and return
// a generic 500 — we never leak stack traces to the client.
export function handler<Args extends unknown[]>(
  fn: (req: Request, ...args: Args) => Promise<Response>,
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    try {
      return await fn(req, ...args);
    } catch (e) {
      if (e instanceof Response) return e; // requireUser / requireAdmin
      if (e instanceof ApiError) {
        const res = err(e.code, e.message, e.status, e.details);
        // Add the standard Retry-After header on 429s so well-behaved
        // HTTP clients / CDNs respect the window.
        if (e.status === 429 && typeof e.details === "object" && e.details && "retryAfterMs" in e.details) {
          const retryAfterSec = Math.ceil(Number((e.details as { retryAfterMs: number }).retryAfterMs) / 1000);
          res.headers.set("Retry-After", String(Math.max(1, retryAfterSec)));
        }
        return res;
      }
      if (e instanceof ZodError) {
        return err("VALIDATION_ERROR", "Invalid input", 400, e.issues);
      }
      const rid = newRequestId();
      logger.error("unhandled route exception", {
        rid,
        path: new URL(req.url).pathname,
        method: req.method,
        err: e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : String(e),
      });
      return err("INTERNAL", `Internal server error (ref: ${rid})`, 500);
    }
  };
}
