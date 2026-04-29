"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Scale } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Markets sitting near a 50/50 split — where the crowd genuinely
 * can't decide. These are the highest-information-value bets, since
 * the marginal trade has the most price impact.
 */
export function CoinFlip() {
  const { markets } = useWallet();

  const flips = useMemo(() => {
    return markets
      .filter((m) => m.status === "OPEN")
      .map((m) => ({ m, dist: Math.abs(m.yesPrice - 0.5) }))
      .filter((x) => x.dist <= 0.07) // within 7 cents of even
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4)
      .map((x) => x.m);
  }, [markets]);

  if (flips.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-fuchsia-400" />
        <h3 className="text-base font-semibold text-white/85">Coin-flip markets</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          The crowd can&apos;t decide
        </span>
      </div>

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {flips.map((m) => {
          const yesCents = Math.round(m.yesPrice * 100);
          const noCents = 100 - yesCents;
          return (
            <Link
              key={m.id}
              href={`/market/${m.slug ?? m.id}`}
              className="group block bg-[#0c0c12] hover:bg-[#13131a] ring-1 ring-white/5 hover:ring-fuchsia-400/30 rounded-xl p-3.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {m.category}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400">
                  ≈50/50
                </span>
              </div>
              <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-3">
                {m.question}
              </p>
              {/* Mini split bar — visual reinforcement of the near-even
                  odds. Width responds to price even in the tight band. */}
              <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                <div
                  className="absolute inset-y-0 left-0 bg-yes/70"
                  style={{ width: `${yesCents}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold tabular-nums">
                <span className="text-yes">YES {yesCents}¢</span>
                <span className="text-no">{noCents}¢ NO</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
