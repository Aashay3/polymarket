import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ok, err, handler, parseBody, parseQuery, ApiError } from "./api";

describe("ok()", () => {
  it("wraps data in an { ok: true, data } envelope", async () => {
    const res = ok({ answer: 42 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: { answer: 42 } });
  });

  it("honors custom status codes", async () => {
    const res = ok({ created: true }, { status: 201 });
    expect(res.status).toBe(201);
  });
});

describe("err()", () => {
  it("wraps error info in an { ok: false, error } envelope", async () => {
    const res = err("BAD_INPUT", "nope", 400, { field: "x" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      ok: false,
      error: { code: "BAD_INPUT", message: "nope", details: { field: "x" } },
    });
  });

  it("defaults status to 400", async () => {
    const res = err("X", "y");
    expect(res.status).toBe(400);
  });
});

describe("parseBody()", () => {
  const Schema = z.object({ name: z.string().min(2) });

  it("returns parsed data on valid JSON", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ name: "Ada" }),
    });
    await expect(parseBody(req, Schema)).resolves.toEqual({ name: "Ada" });
  });

  it("throws ApiError(INVALID_JSON) on malformed body", async () => {
    const req = new Request("http://x", { method: "POST", body: "{not json" });
    await expect(parseBody(req, Schema)).rejects.toMatchObject({
      code: "INVALID_JSON",
      status: 400,
    });
  });

  it("throws ApiError(VALIDATION_ERROR) on schema failure", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ name: "a" }),
    });
    await expect(parseBody(req, Schema)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });
});

describe("parseQuery()", () => {
  const Schema = z.object({
    limit: z.coerce.number().int().min(1).max(100),
    q: z.string().optional(),
  });

  it("coerces numeric strings", () => {
    const req = new Request("http://x/?limit=25&q=btc");
    expect(parseQuery(req, Schema)).toEqual({ limit: 25, q: "btc" });
  });

  it("throws ApiError on invalid params", () => {
    const req = new Request("http://x/?limit=abc");
    expect(() => parseQuery(req, Schema)).toThrow(ApiError);
  });
});

describe("handler()", () => {
  it("passes through a successful response", async () => {
    const route = handler(async () => ok({ hello: "world" }));
    const res = await route(new Request("http://x"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { hello: "world" } });
  });

  it("forwards thrown Response objects (auth helpers throw these)", async () => {
    const forbidden = new Response(JSON.stringify({ error: "nope" }), { status: 403 });
    const route = handler(async () => {
      throw forbidden;
    });
    const res = await route(new Request("http://x"));
    expect(res).toBe(forbidden);
  });

  it("converts ApiError into a JSON envelope with its code/status", async () => {
    const route = handler(async () => {
      throw new ApiError("INSUFFICIENT_BALANCE", "Not enough", 402);
    });
    const res = await route(new Request("http://x"));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("converts ZodError into VALIDATION_ERROR", async () => {
    const route = handler(async () => {
      // Force a ZodError
      z.object({ a: z.string() }).parse({ a: 1 });
      return ok(null);
    });
    const res = await route(new Request("http://x"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns a generic 500 for uncaught exceptions (no stack leak)", async () => {
    // Silence console.error for this test
    const origErr = console.error;
    console.error = () => {};
    try {
      const route = handler(async () => {
        throw new Error("secret internal: database password is hunter2");
      });
      const res = await route(new Request("http://x"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe("INTERNAL");
      expect(body.error.message).not.toContain("hunter2");
    } finally {
      console.error = origErr;
    }
  });
});
