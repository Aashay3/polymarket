"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowDown, ArrowUp, Flame } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Top movers — markets with the largest absolute YES-side price move
 * over the trailing 24h. Uses `yesChangeBps` (signed basis points) so
 * we get both surges and crashes. Empty state hides the section
 * entirely; nothing more boring than a "no movers right now" placeholder.
 */
export function TopMovers() {
  const { markets } = useWallet();

  const movers = useMemo(() => {
    return markets
      .filter((m) => m.status === "OPEN" && m.yesChangeBps !== null && m.yesChangeBps !== undefined)
      .filter((m) => Math.abs(m.yesChangeBps as number) >= 50) // 0.5% floor — skip noise
      .sort((a, b) => Math.abs(b.yesChangeBps as number) - Math.abs(a.yesChangeBps as number))
      .slice(0, 5);
  }, [markets]);

  if (movers.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-400" />
        <h3 className="text-base font-semibold text-white/85">Top movers</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Last 24h
        </span>
      </div>

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {movers.map((m) => {
          const bps = m.yesChangeBps as number;
          const up = bps > 0;
          const pct = (Math.abs(bps) / 100).toFixed(1);
          const cents = Math.round(m.yesPrice * 100);
          return (
            <Link
              key={m.id}
              href={`/market/${m.slug ?? m.id}`}
              className="group block bg-[#0c0c12] hover:bg-[#13131a] ring-1 ring-white/5 hover:ring-white/15 rounded-xl p-3.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {m.category}
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-black ${
                    up
                      ? "bg-yes/15 text-yes"
                      : "bg-no/15 text-no"
                  }`}
                >
                  {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {pct}%
                </span>
              </div>
              <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-3">
                {m.question}
              </p>
              <div className="flex items-end justify-between gap-2">
                <span className="font-mono tabular-nums text-2xl font-black text-white leading-none">
                  {cents}
                  <span className="text-sm opacity-50 ml-0.5">¢</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                  YES
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
