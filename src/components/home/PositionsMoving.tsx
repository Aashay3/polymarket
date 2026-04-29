"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { ArrowDown, ArrowUp, Bell } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Open-position alerts — markets where the user has exposure and the
 * price has moved meaningfully in the last 24h. Encourages return
 * visits ("did my market move?") and primes a follow-up trade.
 *
 * Hides when signed out, when the user has no positions, or when
 * none of their positions have moved enough to be worth flagging.
 */
const MIN_MOVE_BPS = 100; // 1% — anything quieter is just noise

export function PositionsMoving() {
  const { status } = useSession();
  const { markets, myTrades } = useWallet();

  const alerts = useMemo(() => {
    if (!myTrades.length) return [];

    // Net YES-share exposure per market (BUY YES + SELL NO ≈ long YES).
    // We just need to know which side the user is on, not exact P&L.
    const sideByMarket = new Map<string, "YES" | "NO">();
    for (const t of myTrades) {
      // Most recent trade dictates the surfaced side. Good enough for an alert.
      if (!sideByMarket.has(t.marketId)) sideByMarket.set(t.marketId, t.type);
    }

    return markets
      .filter((m) => sideByMarket.has(m.id))
      .filter((m) => m.status === "OPEN")
      .map((m) => {
        const side = sideByMarket.get(m.id)!;
        const bps = side === "YES" ? m.yesChangeBps ?? 0 : m.noChangeBps ?? 0;
        return { market: m, side, bps };
      })
      .filter((x) => Math.abs(x.bps) >= MIN_MOVE_BPS)
      .sort((a, b) => Math.abs(b.bps) - Math.abs(a.bps))
      .slice(0, 3);
  }, [markets, myTrades]);

  if (status !== "authenticated") return null;
  if (alerts.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-cyan-400" />
        <h3 className="text-base font-semibold text-white/85">Your positions are moving</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
          Last 24h
        </span>
      </div>

      <div className="grid gap-2.5 grid-cols-1 lg:grid-cols-3">
        {alerts.map(({ market, side, bps }) => {
          const up = bps > 0;
          const pct = (Math.abs(bps) / 100).toFixed(1);
          const cents = Math.round(
            (side === "YES" ? market.yesPrice : market.noPrice) * 100
          );
          return (
            <Link
              key={market.id}
              href={`/market/${market.slug ?? market.id}`}
              className="group block bg-[#0c0c12] hover:bg-[#13131a] ring-1 ring-cyan-400/15 hover:ring-cyan-400/35 rounded-xl p-3.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">
                  Your {side} position
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-black ${
                    up ? "bg-yes/15 text-yes" : "bg-no/15 text-no"
                  }`}
                >
                  {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {pct}%
                </span>
              </div>
              <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2.5">
                {market.question}
              </p>
              <div className="flex items-baseline justify-between">
                <span className="font-mono tabular-nums text-lg font-black text-white">
                  {cents}<span className="text-xs opacity-50 ml-0.5">¢ {side}</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Manage →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
