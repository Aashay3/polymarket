"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Sparkles } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Personalized picks — top open markets in categories the user has
 * already traded in, excluding markets they've already taken a
 * position on. Hides itself entirely when signed out, when the user
 * has no trades yet, or when there are no surfaced suggestions
 * (better silence than fake personalization).
 */
export function ForYou() {
  const { status } = useSession();
  const { markets, myTrades } = useWallet();

  const picks = useMemo(() => {
    if (!myTrades.length) return [];

    // Categories the user has traded in, weighted by trade count.
    const catWeight = new Map<string, number>();
    const tradedMarkets = new Set<string>();
    for (const t of myTrades) {
      tradedMarkets.add(t.marketId);
    }

    // Re-derive category from the markets list (Trade only stores
    // marketQuestion, not category). One pass through markets.
    for (const m of markets) {
      if (tradedMarkets.has(m.id)) {
        catWeight.set(m.category, (catWeight.get(m.category) ?? 0) + 1);
      }
    }

    if (catWeight.size === 0) return [];

    // Open markets in those categories that the user hasn't bet on.
    return markets
      .filter((m) => m.status === "OPEN")
      .filter((m) => !tradedMarkets.has(m.id))
      .filter((m) => catWeight.has(m.category))
      .sort((a, b) => {
        // Prefer the user's most-traded categories, then largest swings.
        const wa = catWeight.get(a.category) ?? 0;
        const wb = catWeight.get(b.category) ?? 0;
        if (wa !== wb) return wb - wa;
        return Math.abs(b.yesChangeBps ?? 0) - Math.abs(a.yesChangeBps ?? 0);
      })
      .slice(0, 4);
  }, [markets, myTrades]);

  if (status !== "authenticated") return null;
  if (picks.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-pink-400" />
        <h3 className="text-base font-semibold text-white/85">For you</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Based on your trades
        </span>
      </div>

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {picks.map((m) => {
          const cents = Math.round(m.yesPrice * 100);
          return (
            <Link
              key={m.id}
              href={`/market/${m.slug ?? m.id}`}
              className="group block bg-[#0c0c12] hover:bg-[#13131a] ring-1 ring-pink-400/15 hover:ring-pink-400/35 rounded-xl p-3.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-pink-300/80">
                  {m.category}
                </span>
                <span className="font-mono tabular-nums text-[11px] font-black text-white">
                  {cents}<span className="opacity-50 ml-0.5">¢</span>
                </span>
              </div>
              <p className="text-[13px] font-semibold text-white leading-snug line-clamp-3 group-hover:text-pink-200 transition-colors">
                {m.question}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
