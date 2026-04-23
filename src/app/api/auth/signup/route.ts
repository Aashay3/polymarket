import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, PasswordPolicyError } from "@/lib/password";
import { SignupSchema } from "@/lib/schemas";
import { Prisma } from "@prisma/client";
import { checkRateLimit, clientIdFromRequest, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/auth/signup
 *
 * Creates a new user with email + password credentials. Idempotent-ish —
 * returns 409 if email is already taken. Does NOT auto-sign-in; the client
 * should follow up with a `signIn("credentials", ...)` call.
 *
 * Returns 200 + { userId } on success.
 */
export async function POST(req: Request) {
  // Rate limit first — don't even bother parsing JSON for abusive callers.
  const ip = clientIdFromRequest(req);
  const rl = checkRateLimit(`signup:${ip}`, RATE_LIMITS.signup);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(rl.retryAfterMs / 1000))) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password, username } = parsed.data;

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch (err) {
    if (err instanceof PasswordPolicyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          username: username ?? null,
          passwordHash,
          role: "USER",
          // Seed a zero-balance row so we never have a null balance later.
          balance: { create: {} },
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: created.id,
          action: "user.signup",
          targetType: "User",
          targetId: created.id,
        },
      });
      return created;
    });

    return NextResponse.json({ userId: user.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const field = (err.meta?.target as string[] | undefined)?.[0] ?? "field";
      return NextResponse.json(
        { error: `${field} already in use` },
        { status: 409 },
      );
    }
    console.error("[signup] unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
