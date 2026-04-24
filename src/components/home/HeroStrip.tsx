"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Flame, Bitcoin, Landmark, Trophy } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";
import { useMemo } from "react";
import type { ComponentType, SVGProps } from "react";

/**
 * Hero strip at the top of the home feed — three punchy gradient
 * banners, each scoped to a category, with:
 *   - vibrant per-category gradient + glow
 *   - bold display-weight uppercase titles
 *   - live market count badge on each
 *   - subtle ambient icon on the right, not a mascot
 *
 * Three slots fixed for identity (Crypto / Politics / Sports), ordered
 * by which has the most OPEN markets right now so the hottest one
 * always sits first on desktop.
 */

interface HeroCard {
  category: string;
  eyebrow: string;       // small label above the big title
  title: string;
  blurb: string;
  accent: string;        // Tailwind gradient classes
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const FALLBACK: HeroCard[] = [
  {
    category: "Crypto",
    eyebrow: "Markets",
    title: "Crypto",
    blurb: "Trade the odds on BTC, ETH, and the next cycle.",
    accent:
      "from-violet-600/60 via-fuchsia-500/30 to-purple-900/40 border-violet-500/30",
    icon: Bitcoin,
  },
  {
    category: "Politics",
    eyebrow: "Markets",
    title: "Politics",
    blurb: "Elections, policy, and power — priced in real time.",
    accent:
      "from-blue-600/55 via-indigo-500/30 to-sky-900/40 border-blue-500/30",
    icon: Landmark,
  },
  {
    category: "Sports",
    eyebrow: "Markets",
    title: "Sports",
    blurb: "Where the line really sits — set by the crowd, not the book.",
    accent:
      "from-emerald-600/55 via-teal-500/30 to-green-900/40 border-emerald-500/30",
    icon: Trophy,
  },
];

export function HeroStrip() {
  const router = useRouter();
  const { markets } = useWallet();

  const cards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of markets) {
      if (m.status !== "OPEN") continue;
      counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
    }
    return FALLBACK.map((c) => ({
      ...c,
      count: counts.get(c.category) ?? 0,
    })).sort((a, b) => b.count - a.count);
  }, [markets]);

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        const isFeatured = i === 0; // first slot gets a "HOT" marker
        return (
          <button
            key={card.category}
            onClick={() => router.push(`/?category=${encodeURIComponent(card.category)}`)}
            className={`group relative overflow-hidden text-left rounded-2xl border bg-gradient-to-br ${card.accent} p-6 min-h-[180px] transition-all hover:-translate-y-0.5 active:translate-y-0`}
          >
            <div className="relative flex items-start justify-between gap-3 mb-8">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/60">
                    {card.eyebrow}
                  </p>
                  {isFeatured && card.count > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-widest uppercase text-white bg-white/15 rounded-full px-2 py-0.5">
                      <Flame className="w-2.5 h-2.5" />
                      Hot
                    </span>
                  )}
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase leading-none">
                  {card.title}
                </h3>
              </div>

              {/* Ambient icon — large but low-opacity so it doesn't
                  compete with the title. */}
              <Icon className="w-10 h-10 md:w-12 md:h-12 text-white/60 shrink-0 group-hover:text-white/80 transition-colors" />
            </div>

            <p className="text-sm text-white/75 line-clamp-2 mb-5 max-w-sm leading-snug">
              {card.blurb}
            </p>

            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                View markets
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
              {card.count > 0 && (
                <span className="text-xs font-bold text-white/60">
                  {card.count} live
                </span>
              )}
            </div>

            {/* Big soft glow in the top-right for depth */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl opacity-60 group-hover:opacity-90 transition-opacity" />
            {/* Thin highlight along the top edge — "game card" sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </button>
        );
      })}
    </div>
  );
}
