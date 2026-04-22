import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateNonce } from "@/lib/password";
import { EthAddressSchema } from "@/lib/schemas";

/**
 * POST /api/auth/siwe/nonce
 * Body: { address: "0x…" }
 *
 * Returns a 16-char alphanumeric nonce valid for 10 minutes. The client
 * signs a SIWE message containing this nonce, then calls `signIn("siwe", …)`
 * which consumes the nonce server-side (see src/lib/auth.ts).
 *
 * Idempotent per address: submitting twice invalidates the prior nonce.
 */
const BodySchema = z.object({ address: EthAddressSchema });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const address = parsed.data.address.toLowerCase();
  const identifier = `siwe:${address}`;
  const nonce = generateNonce(16);
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  // Clear any prior unclaimed nonces for this address, then write the new one.
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({ data: { identifier, token: nonce, expires } }),
  ]);

  return NextResponse.json({ nonce });
}
