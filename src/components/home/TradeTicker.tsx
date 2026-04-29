"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Zap } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Live trade ticker — horizontal marquee of recent trades. Each tile
 * shows side, amount, market, pseudonymous user. CSS animation scrolls
 * the row continuously; the row pauses on hover so people can read.
 *
 * Pseudonymous handle: short hash of userId so the same trader always
 * shows the same handle, without leaking real identity.
 */
export function TradeTicker() {
  const { trades } = useWallet();

  const items = useMemo(() => {
    if (!trades.length) return [];
    // Most-recent first, capped at 25 — enough to fill the marquee on
    // wide screens without feeling repetitive.
    return [...trades]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 25);
  }, [trades]);

  if (items.length === 0) return null;

  // Duplicate the row so the CSS marquee loops seamlessly.
  const marquee = [...items, ...items];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" />
        <h3 className="text-base font-semibold text-white/85">Live trades</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          Now
        </span>
      </div>

      <div
        className="group relative overflow-hidden rounded-xl bg-[#0c0c12] ring-1 ring-white/5"
        aria-label="Recent trades, scrolling"
      >
        {/* Edge fades — keeps the loop seam invisible. */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#0c0c12] to-transparent z-10" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0c0c12] to-transparent z-10" />

        <div
          className="flex gap-3 py-3 px-4 whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused]"
          style={{ width: "max-content" }}
        >
          {marquee.map((t, i) => (
            <Link
              key={`${t.id}-${i}`}
              href={`/market/${t.marketId}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] ring-1 ring-white/5 hover:ring-white/15 transition-colors text-xs"
            >
              <span className="font-mono font-semibold text-white/55">
                {handleFor(t.userId)}
              </span>
              <span className="text-white/40">{t.side === "BUY" ? "bought" : "sold"}</span>
              <span className="font-mono font-bold text-white">${formatCompact(t.amount)}</span>
              <span
                className={`font-bold ${t.type === "YES" ? "text-yes" : "text-no"}`}
              >
                {t.type}
              </span>
              <span className="text-white/40">on</span>
              <span className="font-semibold text-white/85 max-w-[280px] truncate">
                {t.marketQuestion}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function handleFor(userId?: string): string {
  if (!userId) return "@anon";
  // Stable two-syllable pseudonym from a hash of userId.
  let h = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const heads = ["sol", "alex", "kit", "max", "luna", "ren", "zoe", "kai", "nova", "rio", "iris", "leo", "tao", "ari", "vega", "echo"];
  const tails = ["", "x", "o", "i", "y"];
  const head = heads[Math.abs(h) % heads.length];
  const tail = tails[Math.abs(h >> 8) % tails.length];
  return `@${head}${tail}`;
}

function formatCompact(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}
