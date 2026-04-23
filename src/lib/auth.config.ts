/**
 * Edge-runtime-safe Auth.js config.
 *
 * This file MUST NOT import anything that needs Node APIs — no Prisma,
 * no bcryptjs, no crypto. It's loaded by middleware, which runs in the
 * Edge runtime.
 *
 * The full config (with PrismaAdapter + provider authorize() bodies) lives
 * in auth.ts, which is only imported by route handlers running in Node.
 */

import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    // Default 30 days. We pin explicitly so it's reviewable.
    maxAge: 30 * 24 * 60 * 60,
  },
  // Required when running behind a reverse proxy (nginx, Cloudflare, etc.).
  // Without this, Auth.js rejects tokens whose `iss` doesn't exactly match
  // the request's Host header.
  trustHost: true,
  // httpOnly + sameSite=Lax + secure are Auth.js defaults already; we spell
  // them out here so any future change is intentional + reviewable.
  // The __Secure- prefix requires HTTPS, so we only use it in production.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-nexora.session-token"
          : "nexora.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      },
    },
  },
  pages: {
    signIn: "/auth/signin",
    newUser: "/auth/signup",
  },
  // Providers are overridden in auth.ts; the empty list here keeps the edge
  // bundle small. `authorized` is what middleware actually consults.
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isAdminRoute = pathname.startsWith("/dashboard/admin");
      const isAdminApi = pathname.startsWith("/api/admin");
      if (!isAdminRoute && !isAdminApi) return true;
      if (!auth?.user) return false;
      return auth.user.role === "ADMIN";
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role ?? "USER";
        token.username = (user as { username?: string | null }).username ?? null;
        token.walletAddress = (user as { walletAddress?: string | null }).walletAddress ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token?.id === "string") {
        session.user.id = token.id;
        session.user.role = (token.role as Role) ?? "USER";
        session.user.username = (token.username as string | null) ?? null;
        session.user.walletAddress = (token.walletAddress as string | null) ?? null;
      }
      return session;
    },
  },
};
