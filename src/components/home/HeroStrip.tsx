"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";
import { useMemo } from "react";

/**
 * Hero strip at the top of the home feed — three themed gradient
 * banners, each scoped to a category and showing its live market
 * count. Big visual on desktop, stacks on mobile.
 *
 * The three slots are fixed for identity but the contents are
 * data-driven — we show whichever categories have the most OPEN
 * markets right now, falling back to sensible defaults so the layout
 * never has empty slots.
 */

interface HeroCard {
  category: string;
  title: string;
  blurb: string;
  emoji: string;
  // Tailwind gradient classes — brand-tinted, no neon.
  accent: string;
}

const FALLBACK: HeroCard[] = [
  {
    category: "Crypto",
    title: "Crypto",
    blurb: "Trade the market's odds on BTC, ETH, and the next cycle.",
    emoji: "₿",
    accent: "from-orange-500/20 via-amber-500/10 to-transparent border-orange-500/15",
  },
  {
    category: "Politics",
    title: "Politics",
    blurb: "Elections, policy, and power — priced in real time.",
    emoji: "⚖",
    accent: "from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/15",
  },
  {
    category: "Sports",
    title: "Sports",
    blurb: "Where the line really sits, set by the crowd.",
    emoji: "🏆",
    accent: "from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/15",
  },
];

export function HeroStrip() {
  const router = useRouter();
  const { markets } = useWallet();

  // Count open markets per category, pick top 3, fall back to FALLBACK
  // when the DB is thin so we never render empty slots.
  const cards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of markets) {
      if (m.status !== "OPEN") continue;
      counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
    }

    // Merge real counts into our curated cards; pick the three with most
    // markets, falling back to the curated list if fewer than 3 exist.
    const withCounts = FALLBACK.map((c) => ({
      ...c,
      count: counts.get(c.category) ?? 0,
    }));
    return withCounts.sort((a, b) => b.count - a.count);
  }, [markets]);

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      {cards.map((card) => (
        <button
          key={card.category}
          onClick={() => router.push(`/?category=${encodeURIComponent(card.category)}`)}
          className={`group relative overflow-hidden text-left rounded-2xl border bg-gradient-to-br ${card.accent} p-5 md:p-6 transition-all hover:-translate-y-0.5 active:translate-y-0`}
        >
          <div className="relative flex items-start justify-between gap-3 mb-10">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/50">
                {card.count > 0 ? `${card.count} market${card.count === 1 ? "" : "s"}` : "Explore"}
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-white mt-1">
                {card.title}
              </h3>
            </div>
            <span className="text-4xl md:text-5xl opacity-60 group-hover:opacity-80 transition-opacity -mt-1" aria-hidden>
              {card.emoji}
            </span>
          </div>

          <p className="text-sm text-white/60 line-clamp-2 mb-4 max-w-sm">{card.blurb}</p>

          <span className="inline-flex items-center gap-1 text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
            View markets
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>

          {/* Decorative corner glow — subtle, not casino-y */}
          <div className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
        </button>
      ))}
    </div>
  );
}
