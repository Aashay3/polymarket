"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Markets resolving in the next 24 hours. Last-call urgency strip.
 * Each row shows a live-updating countdown (HH:MM:SS) so the deadline
 * actually feels close.
 */
export function ClosingToday() {
  const { markets } = useWallet();

  // Re-render every second so the countdown ticks. Cheap — only 4 rows
  // and we're updating a single text node per row.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const closing = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    return markets
      .filter((m) => m.status === "OPEN")
      .filter((m) => {
        const end = new Date(m.endTime).getTime();
        return end > now && end - now <= dayMs;
      })
      .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
      .slice(0, 4);
  }, [markets, now]);

  if (closing.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-400" />
        <h3 className="text-base font-semibold text-white/85">Closing today</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
          Last call
        </span>
      </div>

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {closing.map((m) => {
          const cents = Math.round(m.yesPrice * 100);
          const remaining = new Date(m.endTime).getTime() - now;
          return (
            <Link
              key={m.id}
              href={`/market/${m.slug ?? m.id}`}
              className="group block bg-[#0c0c12] hover:bg-[#13131a] ring-1 ring-amber-500/15 hover:ring-amber-500/35 rounded-xl p-3.5 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                  {m.category}
                </span>
                <span className="font-mono text-[11px] font-black text-amber-300 tabular-nums">
                  {formatCountdown(remaining)}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-3">
                {m.question}
              </p>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono tabular-nums text-xl font-black text-white">
                  {cents}<span className="text-xs opacity-50 ml-0.5">¢ YES</span>
                </span>
                <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">
                  Trade now
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
