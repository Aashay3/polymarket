"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Trophy, Medal, TrendingUp, TrendingDown, Crown } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Leaderboard — top traders by realized P/L for a chosen timeframe.
 *
 * Fully wired to /api/leaderboard. The "Your rank" callout is rendered
 * when the requester has at least one trade in the selected window —
 * the API returns a `me` row with rank + pnl whether or not the user
 * is in the top N.
 */

type Timeframe = "all" | "30d" | "7d";

interface BoardRow {
  rank: number;
  userId: string;
  username: string | null;
  name: string | null;
  image: string | null;
  realizedPnl: string;
  tradeCount: number;
}

interface MeRow {
  rank: number;
  realizedPnl: string;
  tradeCount: number;
}

interface ApiResponse {
  ok: true;
  data: {
    leaderboard: BoardRow[];
    me: MeRow | null;
    timeframe: Timeframe;
  };
}

const TIMEFRAMES: { id: Timeframe; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "30d", label: "30 days" },
  { id: "7d",  label: "7 days"  },
];

function formatPnl(raw: string): { display: string; positive: boolean } {
  const n = parseFloat(raw);
  const positive = n >= 0;
  const abs = Math.abs(n);
  // Compact for 4+ digits (most leaderboard entries), 2-decimals otherwise.
  const display =
    abs >= 1000
      ? abs.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : abs.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return { display: `${positive ? "+" : "−"}$${display}`, positive };
}

function displayName(r: { username: string | null; name: string | null; userId: string }): string {
  return r.username ?? r.name ?? `${r.userId.slice(0, 6)}…${r.userId.slice(-4)}`;
}

function profileHref(r: { username: string | null }): string | null {
  // /u/[username] route doesn't exist yet (PARTIAL in the status PDF).
  // Returning null disables the link until the public profile lands.
  return r.username ? `/u/${r.username}` : null;
}

type FetchState =
  | { status: "loading" }
  | { status: "ready"; data: ApiResponse["data"] }
  | { status: "error"; message: string };

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [timeframe, setTimeframe] = useState<Timeframe>("all");
  const [state, setState] = useState<FetchState>({ status: "loading" });

  // State-machine pattern keeps setState out of the effect body (which
  // React 19 flags as "cascading render"). On a timeframe switch the
  // last successful data stays visible until the new request resolves
  // — UX-wise that's nicer than flashing a skeleton anyway.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leaderboard?timeframe=${timeframe}&limit=50`)
      .then((r) => r.json())
      .then((body: ApiResponse | { ok: false; error: { message: string } }) => {
        if (cancelled) return;
        if (body.ok) {
          setState({ status: "ready", data: body.data });
        } else {
          setState({
            status: "error",
            message: body.error?.message ?? "Failed to load",
          });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "Failed to load",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  const loading = state.status === "loading";
  const error = state.status === "error" ? state.message : null;
  const data = state.status === "ready" ? state.data : null;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Top Traders</h1>
            <p className="text-sm text-muted-foreground">
              Highest realized P&amp;L
              {timeframe === "all" ? " (all time)" : ` (last ${timeframe.replace("d", " days")})`}
            </p>
          </div>
        </div>

        {/* Timeframe toggle */}
        <div className="inline-flex gap-1 p-1 rounded-xl bg-[#121217] border border-white/8">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => setTimeframe(tf.id)}
              aria-pressed={timeframe === tf.id}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${
                timeframe === tf.id
                  ? "bg-primary text-white shadow-[0_2px_10px_-2px_rgba(139,92,246,0.6)]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Your-rank callout — visible when authed user has ≥1 trade in window */}
      {session?.user && data?.me && (
        <YourRankCallout me={data.me} />
      )}

      {/* Board */}
      <div className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-white/5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2 text-center">Rank</div>
          <div className="col-span-5">Trader</div>
          <div className="col-span-3 text-right">Realized P&amp;L</div>
          <div className="col-span-2 text-right">Trades</div>
        </div>

        {loading && (
          <ul className="divide-y divide-white/5">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="grid grid-cols-12 gap-4 p-4 items-center">
                <div className="col-span-2 flex justify-center">
                  <div className="w-6 h-6 rounded-full bg-white/5 animate-pulse" />
                </div>
                <div className="col-span-5 h-4 bg-white/5 rounded animate-pulse" />
                <div className="col-span-3 h-4 bg-white/5 rounded animate-pulse" />
                <div className="col-span-2 h-4 bg-white/5 rounded animate-pulse" />
              </li>
            ))}
          </ul>
        )}

        {!loading && error && (
          <div className="p-12 text-center text-sm text-no font-semibold">
            Couldn&apos;t load leaderboard: {error}
          </div>
        )}

        {!loading && !error && data && data.leaderboard.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No trades yet for this window. Check back after the first round of resolutions.
          </div>
        )}

        {!loading && !error && data && data.leaderboard.length > 0 && (
          <div className="divide-y divide-white/5">
            {data.leaderboard.map((trader, i) => {
              const pnl = formatPnl(trader.realizedPnl);
              const href = profileHref(trader);
              const isMe = session?.user?.id === trader.userId;
              const Row = (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors ${
                    isMe ? "bg-primary/8" : "hover:bg-white/5"
                  } ${href ? "cursor-pointer" : ""}`}
                >
                  <div className="col-span-2 flex justify-center">
                    {trader.rank === 1 ? (
                      <Crown className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                    ) : trader.rank === 2 ? (
                      <Medal className="w-6 h-6 text-slate-300" />
                    ) : trader.rank === 3 ? (
                      <Medal className="w-6 h-6 text-amber-600" />
                    ) : (
                      <span className="font-bold text-muted-foreground">#{trader.rank}</span>
                    )}
                  </div>
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <Avatar src={trader.image} fallback={displayName(trader)} />
                    <div className="min-w-0">
                      <p className="font-bold font-mono text-sm truncate text-white">
                        {displayName(trader)}
                        {isMe && (
                          <span className="ml-2 text-[9px] font-black tracking-widest uppercase text-primary">
                            You
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`col-span-3 text-right font-mono font-bold tabular-nums ${
                      pnl.positive ? "text-yes" : "text-no"
                    }`}
                  >
                    {pnl.display}
                  </div>
                  <div className="col-span-2 text-right text-sm text-foreground/80 tabular-nums">
                    {trader.tradeCount}
                  </div>
                </motion.div>
              );
              return href ? (
                <Link key={trader.userId} href={href} className="block">
                  {Row}
                </Link>
              ) : (
                <div key={trader.userId}>{Row}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function YourRankCallout({ me }: { me: MeRow }) {
  const pnl = formatPnl(me.realizedPnl);
  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-primary/30">
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-br from-violet-700/40 via-fuchsia-600/30 to-purple-900/40"
      />
      <div className="relative p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-black text-base">
            #{me.rank}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
              Your rank
            </p>
            <p className="text-sm text-white/80">
              {me.tradeCount} trade{me.tradeCount === 1 ? "" : "s"} in this window
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pnl.positive ? (
            <TrendingUp className="w-4 h-4 text-emerald-300" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-300" />
          )}
          <p
            className={`text-2xl font-black font-mono tabular-nums ${
              pnl.positive ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {pnl.display}
          </p>
        </div>
      </div>
    </div>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string }) {
  const initial = fallback.replace(/^0x/i, "").charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="w-8 h-8 rounded-full bg-neutral-800 object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary text-xs font-black shrink-0">
      {initial}
    </div>
  );
}
