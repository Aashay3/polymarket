import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

/**
 * Edge-runtime auth proxy (Next.js 16 renamed `middleware` → `proxy`).
 *
 * Uses ONLY auth.config.ts (no Prisma, no bcryptjs) because proxy runs
 * in the Edge runtime and Node-only modules would blow up at load time.
 *
 * Rules:
 *   - /dashboard/admin/**  → ADMIN role required. Redirect signed-out users
 *     to /auth/signin; signed-in non-admins get kicked to / with ?error=unauthorized.
 *   - /api/admin/**        → same, but JSON 401/403 (never redirect).
 *
 * The socket.io custom server bypasses Next proxy — real-time auth is
 * handled in Phase 5 via an `io.use()` middleware.
 */

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;
  const isAdminRoute = pathname.startsWith("/dashboard/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminRoute && !isAdminApi) return NextResponse.next();

  if (!user) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (user.role !== "ADMIN") {
    if (isAdminApi) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/admin/:path*", "/api/admin/:path*"],
};
