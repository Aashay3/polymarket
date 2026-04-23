/**
 * Tests for the maintenance-mode kill switch.
 *
 * requireWritesEnabled() throws ApiError(MAINTENANCE_MODE, 503) when
 * MAINTENANCE_MODE env is truthy, and is a no-op otherwise. We test
 * exactly that.
 */

import { describe, it, expect, afterEach } from "vitest";
import { requireWritesEnabled, ApiError } from "./api";

const ORIG = process.env.MAINTENANCE_MODE;

afterEach(() => {
  if (ORIG === undefined) delete process.env.MAINTENANCE_MODE;
  else process.env.MAINTENANCE_MODE = ORIG;
});

describe("requireWritesEnabled()", () => {
  it("no-op when MAINTENANCE_MODE is unset", () => {
    delete process.env.MAINTENANCE_MODE;
    expect(() => requireWritesEnabled()).not.toThrow();
  });

  it("no-op when MAINTENANCE_MODE === 'false'", () => {
    process.env.MAINTENANCE_MODE = "false";
    expect(() => requireWritesEnabled()).not.toThrow();
  });

  it("no-op when MAINTENANCE_MODE === '0'", () => {
    process.env.MAINTENANCE_MODE = "0";
    expect(() => requireWritesEnabled()).not.toThrow();
  });

  it("throws 503 ApiError when MAINTENANCE_MODE === 'true'", () => {
    process.env.MAINTENANCE_MODE = "true";
    let caught: unknown;
    try {
      requireWritesEnabled();
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).code).toBe("MAINTENANCE_MODE");
    expect((caught as ApiError).status).toBe(503);
  });

  it("throws on any other truthy value", () => {
    process.env.MAINTENANCE_MODE = "yes";
    expect(() => requireWritesEnabled()).toThrow(ApiError);
    process.env.MAINTENANCE_MODE = "1";
    expect(() => requireWritesEnabled()).toThrow(ApiError);
  });
});
