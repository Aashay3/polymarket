"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trophy, TrendingUp, TrendingDown, User, Medal, ArrowRight } from "lucide-react";

/**
 * Home-page top-traders strip — wired to /api/leaderboard.
 * Mirrors the timeframe options on /leaderboard but caps at 8 rows
 * for the home strip. Stale-while-revalidate: keeps showing the
 * previous timeframe's data while the new one loads.
 */

type Timeframe = "7d" | "30d" | "all";

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "7d",  label: "7 days"   },
  { id: "30d", label: "30 days"  },
  { id: "all", label: "All time" },
];

interface BoardRow {
  rank: number;
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  realizedPnl: string;
  tradeCount: number;
}

type FetchState =
  | { status: "loading" }
  | { status: "ready"; rows: BoardRow[] }
  | { status: "error" };

function displayName(r: BoardRow): string {
  return r.username ?? r.name ?? `${r.userId.slice(0, 6)}…${r.userId.slice(-4)}`;
}

export function LeaderboardSection() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leaderboard?timeframe=${timeframe}&limit=8`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (!body.ok) {
          setState({ status: "error" });
          return;
        }
        setState({ status: "ready", rows: body.data.leaderboard });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  const rows = state.status === "ready" ? state.rows : [];

  return (
    <section className="mt-12 py-12 bg-[#0F0F14]/50 border-y border-white/5">
      <div className="max-w-[1248px] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" /> Top Traders
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Leading participants by realized P&amp;L
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="flex bg-[#121217] p-1 rounded-xl border border-white/6">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeframe(t.id)}
                  aria-pressed={timeframe === t.id}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeframe === t.id
                      ? "bg-[#8B5CF6] text-white"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
            >
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-[#121217] border border-white/6 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/6 bg-white/2">
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest w-24">Rank</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-right">P&amp;L</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-right">Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {state.status === "loading" && rows.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="h-14 animate-pulse">
                      <td className="px-6 py-3"><div className="w-8 h-4 bg-white/5 rounded" /></td>
                      <td className="px-6 py-3"><div className="w-32 h-4 bg-white/5 rounded" /></td>
                      <td className="px-6 py-3 text-right"><div className="w-20 h-4 bg-white/5 rounded ml-auto" /></td>
                      <td className="px-6 py-3 text-right"><div className="w-10 h-4 bg-white/5 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : state.status === "error" ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-no font-semibold">
                      Couldn&apos;t load leaderboard
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      No trades yet for this window.
                    </td>
                  </tr>
                ) : (
                  rows.map((trader, idx) => {
                    const pnl = parseFloat(trader.realizedPnl);
                    const isPositive = pnl >= 0;
                    const name = displayName(trader);
                    const profileHref = trader.username ? `/u/${trader.username}` : null;

                    return (
                      <tr
                        key={trader.userId}
                        onClick={profileHref ? () => router.push(profileHref) : undefined}
                        className={`group hover:bg-white/2 transition-colors relative h-14 ${
                          profileHref ? "cursor-pointer" : ""
                        } ${
                          idx === 0
                            ? "bg-yellow-500/3"
                            : idx === 1
                              ? "bg-slate-400/3"
                              : idx === 2
                                ? "bg-amber-700/3"
                                : ""
                        }`}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm">
                            {idx === 0 ? (
                              <Medal className="w-5 h-5 text-yellow-500" />
                            ) : idx === 1 ? (
                              <Medal className="w-5 h-5 text-slate-400" />
                            ) : idx === 2 ? (
                              <Medal className="w-5 h-5 text-amber-700" />
                            ) : (
                              <span className="text-muted-foreground">#{trader.rank}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                              {trader.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={trader.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors truncate max-w-[180px]">
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className={`flex items-center justify-end gap-1.5 font-mono font-bold text-sm ${isPositive ? "text-yes" : "text-no"}`}>
                            {isPositive ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {isPositive ? "+" : "−"}${Math.abs(pnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span className="text-sm font-medium text-white/70 tabular-nums">
                            {trader.tradeCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
