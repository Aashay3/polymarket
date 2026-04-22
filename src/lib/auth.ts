/**
 * Auth.js v5 — Node-runtime config.
 *
 * Extends src/lib/auth.config.ts with PrismaAdapter and provider authorize()
 * bodies that touch the database / bcryptjs. NOT imported by middleware.
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { SiweMessage } from "siwe";
import { z } from "zod";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";
import { SIWEVerifySchema } from "./schemas";
import { authConfig } from "./auth.config";
import type { Role } from "@prisma/client";

// Signin credentials are intentionally lenient — let bcrypt.compare do the
// real rejection. Don't leak password-policy rules via the signin error.
const CredentialsInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(256),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      id: "credentials",
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = CredentialsInputSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true, email: true, name: true, image: true, role: true, username: true, passwordHash: true },
        });
        if (!user?.passwordHash) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          username: user.username,
        };
      },
    }),

    Credentials({
      id: "siwe",
      name: "Sign-In With Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(raw) {
        const parsed = SIWEVerifySchema.safeParse(raw);
        if (!parsed.success) return null;

        let siwe: SiweMessage;
        try {
          siwe = new SiweMessage(parsed.data.message);
        } catch {
          return null;
        }

        const verified = await siwe
          .verify({
            signature: parsed.data.signature,
            domain: new URL(process.env.AUTH_URL ?? "http://localhost:3000").host,
          })
          .catch(() => null);

        if (!verified?.success) return null;

        const address = siwe.address.toLowerCase();

        // Consume the nonce so it can't be replayed.
        const storedNonce = await prisma.verificationToken
          .findFirst({ where: { identifier: `siwe:${address}`, token: siwe.nonce } })
          .catch(() => null);
        if (!storedNonce || storedNonce.expires < new Date()) return null;

        await prisma.verificationToken
          .delete({
            where: { identifier_token: { identifier: storedNonce.identifier, token: storedNonce.token } },
          })
          .catch(() => {});

        // Upsert by wallet address.
        const existing = await prisma.wallet.findUnique({
          where: { address },
          include: { user: true },
        });

        if (existing) {
          return {
            id: existing.user.id,
            email: existing.user.email,
            name: existing.user.name,
            image: existing.user.image,
            role: existing.user.role,
            username: existing.user.username,
            walletAddress: address,
          };
        }

        const created = await prisma.user.create({
          data: {
            role: "USER" as Role,
            wallets: {
              create: { address, chainId: siwe.chainId ?? 137, isPrimary: true },
            },
            balance: { create: {} },
          },
          select: { id: true, email: true, name: true, image: true, role: true, username: true },
        });

        return {
          id: created.id,
          email: created.email,
          name: created.name,
          image: created.image,
          role: created.role,
          username: created.username,
          walletAddress: address,
        };
      },
    }),
  ],
});
