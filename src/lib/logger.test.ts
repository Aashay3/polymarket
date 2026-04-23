import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { logger, newRequestId } from "./logger";

/**
 * The logger writes JSON lines to stdout. We capture console calls and
 * assert on the parsed JSON shape rather than string regex — that way the
 * tests are resilient to attribute ordering or reformatting.
 */

let logs: string[];
let warns: string[];
let errors: string[];
let origLog: typeof console.log;
let origWarn: typeof console.warn;
let origError: typeof console.error;

beforeEach(() => {
  logs = [];
  warns = [];
  errors = [];
  origLog = console.log;
  origWarn = console.warn;
  origError = console.error;
  console.log = (line: string) => { logs.push(line); };
  console.warn = (line: string) => { warns.push(line); };
  console.error = (line: string) => { errors.push(line); };
});

afterEach(() => {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
});

function parseLast(arr: string[]) {
  return JSON.parse(arr[arr.length - 1]);
}

describe("logger", () => {
  it("emits JSON with level, msg, ts, service fields", () => {
    logger.info("hello");
    const payload = parseLast(logs);
    expect(payload.level).toBe("info");
    expect(payload.msg).toBe("hello");
    expect(payload.service).toBe("nexora");
    expect(typeof payload.ts).toBe("string");
    expect(() => new Date(payload.ts)).not.toThrow();
  });

  it("sends error lines to console.error, warn lines to console.warn", () => {
    logger.error("boom");
    logger.warn("careful");
    expect(errors).toHaveLength(1);
    expect(warns).toHaveLength(1);
    expect(parseLast(errors).level).toBe("error");
    expect(parseLast(warns).level).toBe("warn");
  });

  it("merges attrs into the output", () => {
    logger.info("trade", { userId: "u_1", amount: 50 });
    const payload = parseLast(logs);
    expect(payload.userId).toBe("u_1");
    expect(payload.amount).toBe(50);
  });

  it("child logger keeps context across calls", () => {
    const child = logger.child({ rid: "abc", userId: "u_1" });
    child.info("one");
    child.info("two", { extra: "y" });
    const p1 = JSON.parse(logs[logs.length - 2]);
    const p2 = parseLast(logs);
    expect(p1.rid).toBe("abc");
    expect(p1.userId).toBe("u_1");
    expect(p2.rid).toBe("abc");
    expect(p2.userId).toBe("u_1");
    expect(p2.extra).toBe("y");
  });

  it("later attrs override child context for one-off calls", () => {
    const child = logger.child({ rid: "abc" });
    child.info("override", { rid: "xyz" });
    expect(parseLast(logs).rid).toBe("xyz");
  });
});

describe("newRequestId()", () => {
  it("returns a UUID-shaped string", () => {
    const id = newRequestId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("is unique across calls", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) set.add(newRequestId());
    expect(set.size).toBe(100);
  });
});
