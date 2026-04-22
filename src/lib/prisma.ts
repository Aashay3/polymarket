import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter. We share one connection pool per
// Node process and reuse it across hot reloads in dev, so we don't exhaust
// the DB on every route-handler invocation.
//
// Initialization is LAZY (via Proxy) so that importing this module does not
// require DATABASE_URL to be set. Next.js' build-time "collect page data"
// phase imports route handlers to discover their config — if we threw at
// module load, the build would fail in environments without a DB (e.g.
// Vercel build containers before runtime env is injected).

declare global {
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — see .env.example");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

function getClient(): PrismaClient {
  if (!globalThis.__prisma) {
    globalThis.__prisma = createPrismaClient();
  }
  return globalThis.__prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
