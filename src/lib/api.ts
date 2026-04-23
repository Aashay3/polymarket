/**
 * Shared API primitives for Next.js route handlers.
 *
 * - `ok(data)` / `err(code, message)` — consistent JSON envelope
 * - `handler(fn)` — wraps a handler so thrown `Response` objects (from
 *   requireUser/requireAdmin), `ZodError` validation failures, and
 *   uncaught exceptions all return structured JSON instead of HTML.
 * - `json(req)` — safe JSON body parse (rejects empty / invalid).
 */

import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: { code: string; message: string; details?: unknown } };

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiOk<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

export function err(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiErr> {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
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
        return err(e.code, e.message, e.status, e.details);
      }
      if (e instanceof ZodError) {
        return err("VALIDATION_ERROR", "Invalid input", 400, e.issues);
      }
      const rid = crypto.randomUUID();
      console.error(`[api:${rid}]`, e);
      return err("INTERNAL", `Internal server error (ref: ${rid})`, 500);
    }
  };
}
