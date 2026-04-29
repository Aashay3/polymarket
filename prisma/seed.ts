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
  // ── Economy ────────────────────────────────────────────────
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
    slug: "us-recession-2026",
    question: "Will the US enter a recession in 2026?",
    category: "Economy",
    description: "Resolves YES if NBER officially declares a recession beginning at any point in 2026.",
    rules: "Determined solely by NBER's Business Cycle Dating Committee announcement.",
    initialLiquidity: 4500,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "sp500-7000-by-eoy",
    question: "Will the S&P 500 close above 7,000 by end of 2026?",
    category: "Economy",
    description: "Resolves YES if the S&P 500 closes at or above 7,000 on any trading day in 2026.",
    rules: "Based on official closing prices from S&P Dow Jones Indices.",
    initialLiquidity: 6500,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "us-cpi-under-2pct-2026",
    question: "Will US CPI fall below 2% YoY at any point in 2026?",
    category: "Economy",
    description: "Resolves YES if the headline CPI year-over-year reading falls below 2.0% in any monthly BLS release covering 2026 data.",
    rules: "Based on official BLS Consumer Price Index releases.",
    initialLiquidity: 3000,
    endTime: new Date("2027-01-31T23:59:59Z"),
  },

  // ── Crypto ─────────────────────────────────────────────────
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
    slug: "eth-flip-btc-2028",
    question: "Will ETH flip BTC in market cap by 2028?",
    category: "Crypto",
    description: "Resolves YES if Ethereum's market cap exceeds Bitcoin's for any continuous 24-hour window before 2028-01-01.",
    rules: "Based on CoinMarketCap reported market cap data.",
    initialLiquidity: 3500,
    endTime: new Date("2027-12-31T23:59:59Z"),
  },
  {
    slug: "sol-500-by-eoy",
    question: "Will Solana hit $500 by end of 2026?",
    category: "Crypto",
    description: "Resolves YES if SOL's spot price reaches or exceeds $500 USD on any major exchange before 2026-12-31.",
    rules: "Spot price on Coinbase, Binance, or Kraken counts. Wicks included.",
    initialLiquidity: 4000,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "stablecoin-supply-300b",
    question: "Will total stablecoin supply exceed $300B in 2026?",
    category: "Crypto",
    description: "Resolves YES if combined market cap of USDT + USDC + DAI + other major stablecoins exceeds $300B at any point in 2026.",
    rules: "Based on CoinGecko's stablecoin sector data.",
    initialLiquidity: 2500,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },

  // ── Tech ───────────────────────────────────────────────────
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
    slug: "apple-ar-glasses-2026",
    question: "Will Apple release AR glasses in 2026?",
    category: "Tech",
    description: "Resolves YES if Apple officially launches a glasses-form-factor AR product (not Vision Pro) for retail sale before 2027-01-01.",
    rules: "Must be a glasses form-factor — Vision Pro and successors don't count.",
    initialLiquidity: 3500,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "tesla-robotaxi-mass-2026",
    question: "Will Tesla launch a public robotaxi service in 2026?",
    category: "Tech",
    description: "Resolves YES if Tesla offers a paid, driverless robotaxi service to the public in any US city before 2027-01-01.",
    rules: "Must be commercially available, no safety driver, and accept paying riders.",
    initialLiquidity: 5000,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "anthropic-ipo-2027",
    question: "Will Anthropic IPO before end of 2027?",
    category: "Tech",
    description: "Resolves YES if Anthropic completes an initial public offering on any major exchange before 2027-12-31.",
    rules: "Direct listings count. Acquisition by a public company does not count as IPO.",
    initialLiquidity: 2500,
    endTime: new Date("2027-12-31T23:59:59Z"),
  },

  // ── Politics ───────────────────────────────────────────────
  {
    slug: "us-2028-democrat-wins",
    question: "Will a Democrat win the US 2028 Presidential Election?",
    category: "Politics",
    description: "Resolves YES if the candidate of the Democratic Party wins the 2028 US Presidential Election as certified by Congress.",
    rules: "Based on the official certified Electoral College result.",
    initialLiquidity: 9000,
    endTime: new Date("2029-01-20T00:00:00Z"),
  },
  {
    slug: "india-2029-bjp-majority",
    question: "Will the BJP win an outright majority in 2029 Lok Sabha elections?",
    category: "Politics",
    description: "Resolves YES if the BJP secures 272+ seats on its own in the 2029 Indian general elections.",
    rules: "Based on official Election Commission of India results.",
    initialLiquidity: 4000,
    endTime: new Date("2029-06-30T23:59:59Z"),
  },
  {
    slug: "uk-snap-election-2026",
    question: "Will the UK hold a snap general election in 2026?",
    category: "Politics",
    description: "Resolves YES if the UK Parliament is dissolved for an early general election before 2026-12-31.",
    rules: "Must be an early dissolution; scheduled elections do not count.",
    initialLiquidity: 1800,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "trump-impeachment-2026",
    question: "Will Donald Trump face an impeachment vote in 2026?",
    category: "Politics",
    description: "Resolves YES if the US House holds a floor vote on articles of impeachment against President Trump in 2026.",
    rules: "A formal vote on the House floor is required. Committee-level votes do not count.",
    initialLiquidity: 2200,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },

  // ── Sports — NBA ──────────────────────────────────────────
  {
    slug: "nba-finals-2026",
    question: "Will the Western Conference champion win the 2026 NBA Finals?",
    category: "Sports",
    description: "Binary market: resolves YES if the Western Conference champion wins the title.",
    rules: "Based on the official NBA Finals outcome.",
    initialLiquidity: 4000,
    endTime: new Date("2026-06-30T00:00:00Z"),
  },
  {
    slug: "nba-2026-mvp-jokic",
    question: "Will Nikola Jokic win the 2026 NBA MVP?",
    category: "Sports",
    description: "Resolves YES if Jokic is named regular-season MVP for the 2025-26 NBA season.",
    rules: "Based on the official NBA award announcement.",
    initialLiquidity: 3000,
    endTime: new Date("2026-06-30T00:00:00Z"),
  },
  {
    slug: "nba-lakers-playoffs-2026",
    question: "Will the Los Angeles Lakers make the 2026 NBA playoffs?",
    category: "Sports",
    description: "Resolves YES if the Lakers qualify for the 2026 NBA playoffs (including play-in tournament).",
    rules: "Based on official NBA standings.",
    initialLiquidity: 2200,
    endTime: new Date("2026-04-15T00:00:00Z"),
  },

  // ── Sports — IPL / CSK ────────────────────────────────────
  {
    slug: "ipl-2026-csk-wins",
    question: "Will Chennai Super Kings win IPL 2026?",
    category: "Sports",
    description: "Resolves YES if CSK wins the IPL 2026 final.",
    rules: "Based on the official IPL final result.",
    initialLiquidity: 5500,
    endTime: new Date("2026-05-31T00:00:00Z"),
  },
  {
    slug: "ipl-2026-mumbai-finals",
    question: "Will Mumbai Indians reach the IPL 2026 final?",
    category: "Sports",
    description: "Resolves YES if MI play in the IPL 2026 final.",
    rules: "Based on official IPL playoff results.",
    initialLiquidity: 2500,
    endTime: new Date("2026-05-31T00:00:00Z"),
  },
  {
    slug: "ipl-2026-orange-cap-virat",
    question: "Will Virat Kohli win the IPL 2026 Orange Cap?",
    category: "Sports",
    description: "Resolves YES if Virat Kohli is the highest run-scorer in the IPL 2026 season.",
    rules: "Based on official IPL season statistics.",
    initialLiquidity: 1800,
    endTime: new Date("2026-05-31T00:00:00Z"),
  },
  {
    slug: "ipl-2026-csk-playoffs",
    question: "Will CSK reach the IPL 2026 playoffs?",
    category: "Sports",
    description: "Resolves YES if Chennai Super Kings finish in the top 4 at the end of the league stage.",
    rules: "Based on official IPL final standings.",
    initialLiquidity: 2000,
    endTime: new Date("2026-05-15T00:00:00Z"),
  },

  // ── Sports — FIFA World Cup 2026 ──────────────────────────
  {
    slug: "world-cup-2026-final",
    question: "Will Brazil win the 2026 FIFA World Cup?",
    category: "Sports",
    description: "Resolves YES if Brazil wins the 2026 FIFA World Cup, hosted across the US, Mexico, and Canada.",
    rules: "Based on the official FIFA tournament result.",
    initialLiquidity: 6000,
    endTime: new Date("2026-07-19T23:59:59Z"),
  },
  {
    slug: "world-cup-2026-argentina-final",
    question: "Will Argentina reach the 2026 World Cup final?",
    category: "Sports",
    description: "Resolves YES if Argentina plays in the 2026 FIFA World Cup final.",
    rules: "Based on official FIFA tournament results.",
    initialLiquidity: 4500,
    endTime: new Date("2026-07-19T23:59:59Z"),
  },
  {
    slug: "world-cup-2026-mbappe-golden-boot",
    question: "Will Kylian Mbappé win the 2026 World Cup Golden Boot?",
    category: "Sports",
    description: "Resolves YES if Mbappé is the tournament's top scorer.",
    rules: "Based on official FIFA tournament statistics. Ties broken by FIFA's official rules.",
    initialLiquidity: 2000,
    endTime: new Date("2026-07-19T23:59:59Z"),
  },

  // ── Sports — MLS ──────────────────────────────────────────
  {
    slug: "messi-mls-cup-2026",
    question: "Will Inter Miami win MLS Cup 2026?",
    category: "Sports",
    description: "Resolves YES if Inter Miami CF wins the 2026 MLS Cup final.",
    rules: "Based on the official MLS Cup final result.",
    initialLiquidity: 1500,
    endTime: new Date("2026-12-15T23:59:59Z"),
  },
  {
    slug: "messi-mls-2026-top-scorer",
    question: "Will Messi be the MLS 2026 top scorer?",
    category: "Sports",
    description: "Resolves YES if Lionel Messi is the MLS 2026 regular-season top scorer.",
    rules: "Based on official MLS season statistics.",
    initialLiquidity: 2500,
    endTime: new Date("2026-10-31T23:59:59Z"),
  },

  // ── Sports — Champions League ─────────────────────────────
  {
    slug: "champions-league-2026-madrid",
    question: "Will Real Madrid win Champions League 2026?",
    category: "Sports",
    description: "Resolves YES if Real Madrid wins the 2025-26 UEFA Champions League final.",
    rules: "Based on the official UEFA result.",
    initialLiquidity: 5000,
    endTime: new Date("2026-05-30T23:59:59Z"),
  },
  {
    slug: "champions-league-2026-city-final",
    question: "Will Manchester City reach the Champions League 2026 final?",
    category: "Sports",
    description: "Resolves YES if Manchester City plays in the 2025-26 UEFA Champions League final.",
    rules: "Based on official UEFA tournament results.",
    initialLiquidity: 3200,
    endTime: new Date("2026-05-15T23:59:59Z"),
  },
  {
    slug: "champions-league-2026-arsenal-semis",
    question: "Will Arsenal reach the Champions League 2026 semi-finals?",
    category: "Sports",
    description: "Resolves YES if Arsenal qualifies for the 2025-26 UCL semi-finals.",
    rules: "Based on official UEFA tournament results.",
    initialLiquidity: 1800,
    endTime: new Date("2026-04-30T23:59:59Z"),
  },

  // ── Sports — Formula 1 ────────────────────────────────────
  {
    slug: "formula-1-2026-verstappen-champ",
    question: "Will Max Verstappen win the 2026 Formula 1 championship?",
    category: "Sports",
    description: "Resolves YES if Verstappen wins the 2026 F1 Drivers' Championship.",
    rules: "Based on official FIA standings at end of season.",
    initialLiquidity: 4000,
    endTime: new Date("2026-12-15T23:59:59Z"),
  },
  {
    slug: "formula-1-2026-ferrari-constructors",
    question: "Will Ferrari win the 2026 Formula 1 Constructors' title?",
    category: "Sports",
    description: "Resolves YES if Ferrari wins the 2026 F1 Constructors' Championship.",
    rules: "Based on official FIA standings at end of season.",
    initialLiquidity: 2800,
    endTime: new Date("2026-12-15T23:59:59Z"),
  },
  {
    slug: "formula-1-hamilton-podium-2026",
    question: "Will Lewis Hamilton finish on the podium in 2026 F1 season?",
    category: "Sports",
    description: "Resolves YES if Hamilton scores at least one podium finish (P1-P3) in any 2026 F1 race.",
    rules: "Based on official FIA race classifications.",
    initialLiquidity: 1500,
    endTime: new Date("2026-12-15T23:59:59Z"),
  },

  // ── Sports — MotoGP ───────────────────────────────────────
  {
    slug: "motogp-2026-marquez-champion",
    question: "Will Marc Márquez win the 2026 MotoGP championship?",
    category: "Sports",
    description: "Resolves YES if Marc Márquez wins the 2026 MotoGP Riders' Championship.",
    rules: "Based on official MotoGP final standings.",
    initialLiquidity: 1800,
    endTime: new Date("2026-11-30T23:59:59Z"),
  },
  {
    slug: "motogp-2026-ducati-constructors",
    question: "Will Ducati win the 2026 MotoGP Constructors' title?",
    category: "Sports",
    description: "Resolves YES if Ducati wins the 2026 MotoGP Constructors' Championship.",
    rules: "Based on official MotoGP final standings.",
    initialLiquidity: 1500,
    endTime: new Date("2026-11-30T23:59:59Z"),
  },

  // ── Sports — NFL ──────────────────────────────────────────
  {
    slug: "nfl-super-bowl-lx-chiefs",
    question: "Will the Kansas City Chiefs win Super Bowl LX?",
    category: "Sports",
    description: "Resolves YES if the Chiefs win Super Bowl LX (the 2025-26 NFL season championship).",
    rules: "Based on the official NFL result.",
    initialLiquidity: 5000,
    endTime: new Date("2026-02-08T23:59:59Z"),
  },
  {
    slug: "nfl-2026-mvp-mahomes",
    question: "Will Patrick Mahomes win NFL MVP 2026?",
    category: "Sports",
    description: "Resolves YES if Mahomes wins the 2025-26 NFL regular-season MVP award.",
    rules: "Based on the official AP MVP award announcement.",
    initialLiquidity: 2800,
    endTime: new Date("2026-02-15T23:59:59Z"),
  },
  {
    slug: "nfl-cowboys-playoffs-2026",
    question: "Will the Dallas Cowboys make the 2026 NFL playoffs?",
    category: "Sports",
    description: "Resolves YES if the Cowboys qualify for the 2025-26 NFL playoffs.",
    rules: "Based on official NFL standings at end of regular season.",
    initialLiquidity: 1800,
    endTime: new Date("2026-01-10T23:59:59Z"),
  },

  // ── Sports — Premier League (EPL) ─────────────────────────
  {
    slug: "premier-league-2026-city-wins",
    question: "Will Manchester City win the 2025-26 Premier League?",
    category: "Sports",
    description: "Resolves YES if Manchester City finishes first in the 2025-26 Premier League table.",
    rules: "Based on the official Premier League final standings.",
    initialLiquidity: 4500,
    endTime: new Date("2026-05-24T23:59:59Z"),
  },
  {
    slug: "premier-league-2026-arsenal-top4",
    question: "Will Arsenal finish top 4 in the 2025-26 Premier League?",
    category: "Sports",
    description: "Resolves YES if Arsenal finishes in positions 1-4 of the 2025-26 Premier League.",
    rules: "Based on official final standings.",
    initialLiquidity: 2200,
    endTime: new Date("2026-05-24T23:59:59Z"),
  },
  {
    slug: "premier-league-2026-haaland-golden-boot",
    question: "Will Erling Haaland win the 2025-26 Premier League Golden Boot?",
    category: "Sports",
    description: "Resolves YES if Haaland is the top scorer of the 2025-26 Premier League season.",
    rules: "Based on official Premier League season statistics. Ties resolved by official PL rules.",
    initialLiquidity: 2000,
    endTime: new Date("2026-05-24T23:59:59Z"),
  },

  // ── Sports — UFC ──────────────────────────────────────────
  {
    slug: "ufc-jones-defends-heavyweight-2026",
    question: "Will Jon Jones defend his UFC heavyweight title in 2026?",
    category: "Sports",
    description: "Resolves YES if Jon Jones successfully defends the UFC heavyweight championship in any 2026 fight.",
    rules: "Based on official UFC fight results.",
    initialLiquidity: 2000,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "ufc-makhachev-fighter-of-year-2026",
    question: "Will Islam Makhachev win UFC Fighter of the Year 2026?",
    category: "Sports",
    description: "Resolves YES if Makhachev wins the official UFC Fighter of the Year award for 2026.",
    rules: "Based on the official UFC year-end awards.",
    initialLiquidity: 1500,
    endTime: new Date("2027-01-31T23:59:59Z"),
  },
  {
    slug: "ufc-women-poatan-loses-belt-2026",
    question: "Will Alex Pereira lose his UFC light heavyweight belt in 2026?",
    category: "Sports",
    description: "Resolves YES if Pereira loses the title in any title defense during 2026.",
    rules: "Based on official UFC fight results.",
    initialLiquidity: 1200,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },

  // ── Sports — Olympics ─────────────────────────────────────
  {
    slug: "olympics-2026-usa-medal-table",
    question: "Will Team USA top the medal table at the 2026 Winter Olympics?",
    category: "Sports",
    description: "Resolves YES if the United States finishes 1st in total medal count at the Milan-Cortina 2026 Winter Olympics.",
    rules: "Based on official IOC final medal standings.",
    initialLiquidity: 2500,
    endTime: new Date("2026-02-22T23:59:59Z"),
  },
  {
    slug: "olympics-2026-india-medal-count",
    question: "Will India win 3+ medals at the 2026 Winter Olympics?",
    category: "Sports",
    description: "Resolves YES if India wins 3 or more medals (any color) at the 2026 Winter Olympics.",
    rules: "Based on official IOC final medal standings.",
    initialLiquidity: 800,
    endTime: new Date("2026-02-22T23:59:59Z"),
  },
  {
    slug: "olympics-2026-norway-gold-leader",
    question: "Will Norway win the most gold medals at the 2026 Winter Olympics?",
    category: "Sports",
    description: "Resolves YES if Norway finishes 1st in gold medal count at the Milan-Cortina 2026 Olympics.",
    rules: "Based on official IOC gold medal standings.",
    initialLiquidity: 1800,
    endTime: new Date("2026-02-22T23:59:59Z"),
  },

  // ── Science ────────────────────────────────────────────────
  {
    slug: "spacex-mars-2027",
    question: "Will SpaceX land a spacecraft on Mars by 2027?",
    category: "Science",
    description: "Any SpaceX-operated spacecraft (crewed or uncrewed) must achieve a controlled landing on the Martian surface.",
    rules: "Confirmed soft landing required. Crash-landings do not qualify.",
    initialLiquidity: 2000,
    endTime: new Date("2027-12-31T23:59:59Z"),
  },
  {
    slug: "fusion-net-energy-2027",
    question: "Will a fusion reactor achieve commercial-scale net energy gain by 2027?",
    category: "Science",
    description: "Resolves YES if any fusion device demonstrates sustained net energy production at >100MW for at least 1 hour before 2028-01-01.",
    rules: "Peer-reviewed publication or government confirmation required.",
    initialLiquidity: 1200,
    endTime: new Date("2027-12-31T23:59:59Z"),
  },
  {
    slug: "asteroid-mining-2028",
    question: "Will any company successfully mine an asteroid by 2028?",
    category: "Science",
    description: "Resolves YES if any private company returns extracted material from an asteroid to commercial use before 2029-01-01.",
    rules: "Material must be physically returned and commercially utilized.",
    initialLiquidity: 800,
    endTime: new Date("2028-12-31T23:59:59Z"),
  },
  {
    slug: "neuralink-1000-patients-2027",
    question: "Will Neuralink reach 1,000 implanted patients by 2027?",
    category: "Science",
    description: "Resolves YES if Neuralink confirms 1,000+ humans have received the implant by 2027-12-31.",
    rules: "Based on official Neuralink announcements.",
    initialLiquidity: 1800,
    endTime: new Date("2027-12-31T23:59:59Z"),
  },

  // ── Entertainment ──────────────────────────────────────────
  {
    slug: "oscars-2027-best-picture",
    question: "Will an A24 film win Best Picture at the 2027 Oscars?",
    category: "Entertainment",
    description: "Resolves YES if a film distributed by A24 wins the Best Picture award at the 99th Academy Awards.",
    rules: "Based on official Academy Awards results.",
    initialLiquidity: 1500,
    endTime: new Date("2027-03-31T23:59:59Z"),
  },
  {
    slug: "gta-vi-release-2026",
    question: "Will GTA VI release in 2026?",
    category: "Entertainment",
    description: "Resolves YES if Rockstar Games officially releases Grand Theft Auto VI to retail before 2027-01-01.",
    rules: "Full release; early access or paid betas don't count.",
    initialLiquidity: 7000,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "avatar-3-billion-2026",
    question: "Will Avatar 3 cross $1B at the box office in 2026?",
    category: "Entertainment",
    description: "Resolves YES if Avatar: Fire and Ash crosses $1B in worldwide gross before 2027-01-01.",
    rules: "Based on Box Office Mojo reported figures.",
    initialLiquidity: 2200,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "netflix-300m-subs-2026",
    question: "Will Netflix exceed 300M global subscribers in 2026?",
    category: "Entertainment",
    description: "Resolves YES if Netflix reports 300M+ global paid subscribers in any quarterly earnings release covering 2026.",
    rules: "Based on official Netflix shareholder letters.",
    initialLiquidity: 2800,
    endTime: new Date("2027-02-28T23:59:59Z"),
  },

  // ── World ──────────────────────────────────────────────────
  {
    slug: "us-iran-strike-2026",
    question: "Will the US conduct a direct military strike on Iran in 2026?",
    category: "World",
    description: "Resolves YES if the US military carries out a direct kinetic strike on Iranian territory or assets before 2027-01-01.",
    rules: "Must be officially confirmed by the US Department of Defense.",
    initialLiquidity: 4500,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "china-taiwan-blockade-2027",
    question: "Will China impose a naval blockade on Taiwan by 2027?",
    category: "World",
    description: "Resolves YES if Chinese armed forces enforce a naval blockade preventing commercial shipping to/from Taiwan before 2027-12-31.",
    rules: "Officially confirmed by either Taiwan's government or the US State Department.",
    initialLiquidity: 3200,
    endTime: new Date("2027-12-31T23:59:59Z"),
  },
  {
    slug: "ukraine-ceasefire-2026",
    question: "Will Russia and Ukraine agree to a formal ceasefire in 2026?",
    category: "World",
    description: "Resolves YES if a formal, internationally-recognized ceasefire agreement is signed between Russia and Ukraine before 2027-01-01.",
    rules: "Must be a written ceasefire signed by both governments.",
    initialLiquidity: 5500,
    endTime: new Date("2026-12-31T23:59:59Z"),
  },
  {
    slug: "global-temp-record-2026",
    question: "Will 2026 be the hottest year on record?",
    category: "World",
    description: "Resolves YES if NASA or NOAA officially declares 2026 the hottest calendar year on record by global mean temperature.",
    rules: "Based on the first official annual climate report from either NASA GISS or NOAA NCEI.",
    initialLiquidity: 2400,
    endTime: new Date("2027-02-28T23:59:59Z"),
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
