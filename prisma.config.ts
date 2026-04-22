import { config as dotenv } from "dotenv";
import path from "node:path";
import type { PrismaConfig } from "prisma";

// Load .env.local first (Next.js convention for dev secrets); fall back to .env.
// Values already present in process.env (e.g. in CI) take precedence over both.
dotenv({ path: ".env.local" });
dotenv();

// Prisma 7 config. DATABASE_URL lives here (not in schema.prisma) and is
// consumed by `prisma migrate`, `prisma generate`, and `prisma studio`.
// The runtime client in src/lib/prisma.ts uses the same env var via a
// driver adapter — but adapters are not configured here in Prisma 7.

export default {
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies PrismaConfig;
