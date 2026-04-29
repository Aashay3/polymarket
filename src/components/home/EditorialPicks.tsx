"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Sparkle } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Editorial picks of the week — hand-curated. Differentiates NEXORA
 * from the algorithmic-only feeds (Polymarket, Kalshi). Edit
 * `CURATED` once a week. Gracefully degrades if a slug isn't found
 * (the entry is just dropped).
 */

interface CuratedPick {
  slug: string;
  blurb: string;
}

const CURATED: CuratedPick[] = [
  {
    slug: "us-2028-democrat-wins",
    blurb:
      "Three years out and the field is wide open. The crowd's pricing the noise; the signal arrives at the primaries.",
  },
  {
    slug: "btc-100k-by-december",
    blurb:
      "The narrative writes itself if it crosses, but the wick has to clear $100k on a major venue — not a thin Asian session ghost.",
  },
  {
    slug: "gta-vi-release-2026",
    blurb:
      "Rockstar has slipped before. Pre-orders, official trailer cadence, and dev-team chatter all suggest fall — but Take-Two's calendar is the final word.",
  },
];

export function EditorialPicks() {
  const { markets } = useWallet();

  const picks = useMemo(() => {
    const bySlug = new Map(markets.map((m) => [m.slug, m]));
    return CURATED.flatMap((c) => {
      const m = bySlug.get(c.slug);
      return m ? [{ market: m, blurb: c.blurb }] : [];
    });
  }, [markets]);

  if (picks.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkle className="w-4 h-4 text-violet-400" />
        <h3 className="text-base font-semibold text-white/85">Editor&apos;s picks</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          This week
        </span>
      </div>

      <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        {picks.map(({ market, blurb }) => {
          const cents = Math.round(market.yesPrice * 100);
          return (
            <Link
              key={market.id}
              href={`/market/${market.slug ?? market.id}`}
              className="group block relative overflow-hidden rounded-2xl bg-linear-to-br from-violet-700/25 via-[#0c0c12] to-[#0c0c12] ring-1 ring-violet-400/20 hover:ring-violet-400/40 p-5 transition-all hover:-translate-y-0.5"
            >
              {/* Vertical accent bar on the left edge — editorial mark. */}
              <span aria-hidden className="absolute inset-y-5 left-0 w-0.5 rounded-r-full bg-violet-400" />

              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-violet-300">
                  {market.category}
                </span>
                <span className="font-mono tabular-nums text-sm font-black text-white">
                  {cents}<span className="text-[10px] opacity-50 ml-0.5">¢ YES</span>
                </span>
              </div>

              <h4 className="text-base font-bold text-white leading-snug mb-2 group-hover:text-violet-200 transition-colors line-clamp-2">
                {market.question}
              </h4>

              <p className="text-[12px] text-white/65 leading-relaxed italic line-clamp-3">
                &ldquo;{blurb}&rdquo;
              </p>

              <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-white/30">
                — NEXORA editor
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
