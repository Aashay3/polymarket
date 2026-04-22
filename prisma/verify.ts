import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [markets, users, trades] = await Promise.all([
    prisma.market.count(),
    prisma.user.count(),
    prisma.trade.count(),
  ]);
  console.log(`Markets: ${markets} | Users: ${users} | Trades: ${trades}`);

  const list = await prisma.market.findMany({
    select: { slug: true, question: true, category: true, yesShares: true, noShares: true },
  });
  for (const m of list) {
    console.log(`  - [${m.category.padEnd(10)}] ${m.slug}`);
    console.log(`      ${m.question}`);
    console.log(`      pool: yes=${m.yesShares.toString()} no=${m.noShares.toString()}`);
  }
}

main().finally(() => prisma.$disconnect());
