"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Check, Eye, X } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Crowd-vs-reality strip — for resolved markets, show what the
 * crowd's final implied probability was vs the actual outcome.
 * Builds the brand as a "truth machine" and gives users a feel for
 * when prediction markets actually work.
 *
 * We don't track peak price snapshots yet, so we use the final
 * resting price as the proxy for "what the crowd thought." Once a
 * proper price-history feed is wired in, swap in the peak price
 * for a more dramatic delta.
 */
export function CrowdVsReality() {
  const { markets } = useWallet();

  const items = useMemo(() => {
    return markets
      .filter((m) => m.status === "RESOLVED" && m.winningOutcome)
      .slice(0, 4);
  }, [markets]);

  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-cyan-400" />
        <h3 className="text-base font-semibold text-white/85">Crowd vs reality</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Recently resolved
        </span>
      </div>

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((m) => {
          // What the crowd thought the winning side would be at close.
          const winnerPriceFrac =
            m.winningOutcome === "YES" ? m.yesPrice : m.noPrice;
          const winnerCents = Math.round(winnerPriceFrac * 100);
          const wasRight = winnerCents >= 50;
          return (
            <Link
              key={m.id}
              href={`/market/${m.slug ?? m.id}`}
              className={`group block rounded-xl ring-1 transition-colors p-3.5 ${
                wasRight
                  ? "bg-yes/5 ring-yes/20 hover:ring-yes/40"
                  : "bg-no/5 ring-no/20 hover:ring-no/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {m.category}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                    wasRight ? "text-yes" : "text-no"
                  }`}
                >
                  {wasRight ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {wasRight ? "Right" : "Wrong"}
                </span>
              </div>

              <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-3">
                {m.question}
              </p>

              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                    Crowd said
                  </p>
                  <p className="font-mono tabular-nums text-base font-black text-white leading-none">
                    {winnerCents}<span className="text-xs opacity-50 ml-0.5">¢ {m.winningOutcome}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-0.5">
                    Actual
                  </p>
                  <p
                    className={`font-mono text-sm font-black leading-none ${
                      m.winningOutcome === "YES" ? "text-yes" : "text-no"
                    }`}
                  >
                    {m.winningOutcome}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
