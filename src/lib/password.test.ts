import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, generateNonce, PasswordPolicyError } from "./password";

describe("hashPassword", () => {
  it("produces a verifiable bcrypt hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).toMatch(/^\$2[aby]\$12\$/); // bcrypt format, cost 12
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects passwords shorter than 12 chars", async () => {
    await expect(hashPassword("short")).rejects.toThrow(PasswordPolicyError);
    await expect(hashPassword("eleven-char")).rejects.toThrow(PasswordPolicyError);
  });

  it("rejects passwords longer than 128 chars", async () => {
    await expect(hashPassword("a".repeat(129))).rejects.toThrow(PasswordPolicyError);
  });

  it("rejects common weak passwords", async () => {
    await expect(hashPassword("Password123")).rejects.toThrow(PasswordPolicyError);
    await expect(hashPassword("letmein123")).rejects.toThrow(PasswordPolicyError);
  });

  it("produces different hashes for the same password (salted)", async () => {
    const a = await hashPassword("correct-horse-battery-staple");
    const b = await hashPassword("correct-horse-battery-staple");
    expect(a).not.toBe(b);
    expect(await verifyPassword("correct-horse-battery-staple", a)).toBe(true);
    expect(await verifyPassword("correct-horse-battery-staple", b)).toBe(true);
  });
});

describe("verifyPassword", () => {
  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password-attempt-1234", hash)).toBe(false);
  });

  it("returns false on invalid/empty input", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("", hash)).toBe(false);
    expect(await verifyPassword("any", "")).toBe(false);
    expect(await verifyPassword("any", "not-a-bcrypt-hash")).toBe(false);
  });
});

describe("generateNonce", () => {
  it("produces the requested length", () => {
    expect(generateNonce(16)).toHaveLength(16);
    expect(generateNonce(32)).toHaveLength(32);
  });

  it("produces distinct nonces on repeated calls", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).not.toBe(b);
  });

  it("uses only alphanumeric characters", () => {
    expect(generateNonce(100)).toMatch(/^[0-9A-Za-z]+$/);
  });
});
