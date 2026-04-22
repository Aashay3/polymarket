/**
 * Database seed — idempotent. Safe to run repeatedly.
 *
 * Usage:
 *   npm run db:seed
 *
 * Requires DATABASE_URL in .env.local
 */

import { config as dotenv } from "dotenv";
dotenv({ path: ".env.local" });
dotenv();

import { PrismaClient, Role, MarketStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Decimal } from "decimal.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — see .env.example");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const SEED_MARKETS = [
  {
    slug: "fed-rate-cut-q4",
    question: "Will the Federal Reserve cut interest rates in Q4 2026?",
    category: "Economy",
    description: "FOMC meetings in November and December 2026 decide. A 'cut' means a reduction of at least 25 bps from the October 1 level.",
    rules: "Resolution based on official Federal Reserve statement. Earliest cut determines outcome. Emergency cuts within the Q4 window count.",
    initialLiquidity: 5000,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "btc-100k-by-december",
    question: "Will Bitcoin hit $100k before December 2026?",
    category: "Crypto",
    description: "Resolves YES if BTC's spot price on Coinbase, Kraken, or Binance touches or exceeds $100,000 USD at any moment before 2026-12-01 00:00 UTC.",
    rules: "Decision based on the maximum price reported by any of the three exchanges listed. Wicks count.",
    initialLiquidity: 8000,
    endTime: new Date("2026-12-01T00:00:00Z"),
  },
  {
    slug: "openai-gpt5-2026",
    question: "Will OpenAI release GPT-5 in 2026?",
    category: "Tech",
    description: "Resolves YES if a model officially branded 'GPT-5' by OpenAI is released to any API tier or ChatGPT product before 2027-01-01.",
    rules: "Model must be explicitly named GPT-5 in OpenAI's official announcement. Preview / beta releases count.",
    initialLiquidity: 6000,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "nba-finals-2026",
    question: "Who will win the 2026 NBA Finals?",
    category: "Sports",
    description: "Binary market: resolves YES if the Western Conference champion wins the title.",
    rules: "Based on the official NBA Finals outcome.",
    initialLiquidity: 4000,
    endTime: new Date("2026-06-30T00:00:00Z"),
  },
  {
    slug: "eth-flip-btc-2028",
    question: "Will ETH flip BTC in market cap by 2028?",
    category: "Crypto",
    description: "Resolves YES if Ethereum's market cap exceeds Bitcoin's for any continuous 24-hour window before 2028-01-01.",
    rules: "Based on CoinMarketCap reported market cap data.",
    initialLiquidity: 3500,
    endTime: new Date("2027-12-31T23:59:59Z"),
  },
  {
    slug: "spacex-mars-2027",
    question: "Will SpaceX land a spacecraft on Mars by 2027?",
    category: "Science",
    description: "Any SpaceX-operated spacecraft (crewed or uncrewed) must achieve a controlled landing on the Martian surface.",
    rules: "Confirmed soft landing required. Crash-landings do not qualify.",
    initialLiquidity: 2000,
    endTime: new Date("2027-12-31T23:59:59Z"),
  },
];

async function main() {
  console.log("🌱 Seeding database…");

  // Admin bootstrap — only if SEED_ADMIN_EMAIL is set
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (adminEmail) {
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: Role.ADMIN },
      create: {
        email: adminEmail,
        role: Role.ADMIN,
        emailVerified: new Date(),
      },
    });
    console.log(`✓ Admin user ensured for ${adminEmail}`);
  } else {
    console.log("⚠ SEED_ADMIN_EMAIL not set — skipping admin bootstrap.");
  }

  // Markets — upsert by slug so re-seeding is idempotent
  for (const m of SEED_MARKETS) {
    // Split initial liquidity 50/50 across YES and NO shares.
    const half = new Decimal(m.initialLiquidity).div(2);
    await prisma.market.upsert({
      where: { slug: m.slug },
      update: {
        question: m.question,
        description: m.description,
        rules: m.rules,
        category: m.category,
        endTime: m.endTime,
      },
      create: {
        slug: m.slug,
        question: m.question,
        description: m.description,
        rules: m.rules,
        category: m.category,
        endTime: m.endTime,
        yesShares: half.toString(),
        noShares: half.toString(),
        status: MarketStatus.OPEN,
      },
    });
    console.log(`✓ Market: ${m.slug}`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
