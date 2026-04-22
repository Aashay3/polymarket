/**
 * Password hashing — bcryptjs at cost 12.
 *
 * Cost 12 is OWASP-acceptable today (~300ms on modest hardware). Higher is
 * better but adds perceptible sign-in latency. For pre-mainnet hardening we
 * should switch to argon2id (@node-rs/argon2), which is the current OWASP
 * recommendation. Tracked in the security hardening checklist.
 *
 * Constant-time verification is provided by bcryptjs.compare.
 */

import bcrypt from "bcryptjs";

const COST = 12;

// Guard against common weak passwords at the application layer — Zod handles
// shape/length, this blocks the obvious "password123" category.
const COMMON_WEAK_PASSWORDS = new Set([
  "password", "Password1", "password1", "Password123", "password123",
  "12345678", "123456789", "qwerty123", "admin123", "letmein123",
]);

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordPolicyError";
  }
}

export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 12) {
    throw new PasswordPolicyError("Password must be at least 12 characters");
  }
  if (plain.length > 128) {
    // bcrypt truncates at 72 bytes; long passwords silently drop entropy.
    // Reject outright so callers don't get surprised.
    throw new PasswordPolicyError("Password must be at most 128 characters");
  }
  if (COMMON_WEAK_PASSWORDS.has(plain)) {
    throw new PasswordPolicyError("Password is too common");
  }
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/** Generate a cryptographically-random nonce for SIWE / verification flows. */
export function generateNonce(bytes = 16): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  let out = "";
  for (let i = 0; i < buf.length; i++) out += chars[buf[i] % chars.length];
  return out;
}
