/**
 * Server-side auth helpers.
 *
 *   getCurrentUser()  — null if not signed in.
 *   requireUser()     — throws 401 Response if not signed in.
 *   requireAdmin()    — throws 403 Response if not admin.
 *
 * Use in route handlers:
 *
 *   export async function POST(req: Request) {
 *     const user = await requireUser();
 *     // ... do stuff with user.id, user.role ...
 *   }
 *
 * If authentication fails, the thrown Response is caught by Next.js and
 * returned directly to the client, which means call sites don't need to
 * branch on "is this person signed in?" — they can always assume `user`
 * exists after the call.
 */

import { auth } from "./auth";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: Role;
  username: string | null;
  walletAddress: string | null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
    username: session.user.username ?? null,
    walletAddress: session.user.walletAddress ?? null,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}
