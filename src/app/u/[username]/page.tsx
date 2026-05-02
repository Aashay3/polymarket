"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Trophy,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  Share2,
  Check,
  Calendar,
  Activity,
  ArrowRight,
} from "lucide-react";

/**
 * Public profile route — `/u/[username]`.
 *
 * Pulls aggregated stats + recent trades from /api/u/[username].
 * Anyone can view this; the page never reveals open positions
 * (we only show settled ones in stats). When the User model gains
 * an `isPublic` flag, the API will 404 for opted-out users and the
 * NotFound branch here will render that case the same way.
 */

interface PublicUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  memberSince: string;
}

interface PublicStats {
  realizedPnl: string;
  tradeCount: number;
  winRate: number | null;
  openPositions: number;
  leaderboardRank: number | null;
  resolvedPositions: number;
}

interface RecentTrade {
  id: string;
  marketId: string;
  marketQuestion: string;
  marketSlug: string;
  marketStatus: "OPEN" | "RESOLVED" | "CLOSED" | "VOIDED";
  outcome: "YES" | "NO";
  side: "BUY" | "SELL";
  shares: string;
  pricePerShare: string;
  amount: string;
  netAmount: string;
  createdAt: string;
}

interface ApiData {
  user: PublicUser;
  stats: PublicStats;
  recentTrades: RecentTrade[];
}

type FetchState =
  | { status: "loading" }
  | { status: "ready"; data: ApiData }
  | { status: "notfound" }
  | { status: "error"; message: string };

function formatPnl(raw: string): { display: string; positive: boolean } {
  const n = parseFloat(raw);
  const positive = n >= 0;
  const abs = Math.abs(n);
  const display =
    abs >= 1000
      ? abs.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : abs.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return { display: `${positive ? "+" : "−"}$${display}`, positive };
}

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initialFor(user: PublicUser): string {
  const src = (user.name ?? user.username).trim();
  return (src[0] ?? "?").toUpperCase();
}

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { data: session } = useSession();
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/u/${encodeURIComponent(username)}`)
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 404) {
          setState({ status: "notfound" });
          return;
        }
        const body = await r.json();
        if (!body.ok) {
          setState({
            status: "error",
            message: body.error?.message ?? "Failed to load",
          });
          return;
        }
        setState({ status: "ready", data: body.data });
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
  }, [username]);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — silently no-op; the URL is still in the address bar.
    }
  };

  if (state.status === "loading") {
    return <ProfileSkeleton />;
  }
  if (state.status === "notfound") {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-2xl font-black text-white mb-2">Profile not found</p>
        <p className="text-sm text-muted-foreground mb-6">
          @{username} doesn&apos;t exist or hasn&apos;t set a username yet.
        </p>
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
        >
          See top traders
        </Link>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-sm text-no font-semibold">
          Couldn&apos;t load profile: {state.message}
        </p>
      </div>
    );
  }

  const { user, stats, recentTrades } = state.data;
  const pnl = formatPnl(stats.realizedPnl);
  const isMe = session?.user?.id === user.id;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl ring-1 ring-white/10">
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-br from-violet-700 via-fuchsia-600 to-purple-900"
        />
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-fuchsia-400/30 blur-3xl"
        />
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar user={user} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                @{user.username}
              </p>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                {user.name ?? user.username}
              </h1>
              <p className="text-xs text-white/80 font-semibold mt-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Joined {formatJoinDate(user.memberSince)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-black/25 backdrop-blur-sm ring-1 ring-white/25 text-white text-xs font-black uppercase tracking-widest hover:bg-black/35 hover:ring-white/40 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" /> Share
                </>
              )}
            </button>
            {isMe && (
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white text-purple-900 text-xs font-black uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-[0_8px_18px_-4px_rgba(0,0,0,0.4)] transition-all"
              >
                Edit profile
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={pnl.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          label="Realized P&L"
          value={pnl.display}
          tint={pnl.positive ? "text-yes" : "text-no"}
          hint="All time"
        />
        <StatCard
          icon={<Zap className="w-4 h-4" />}
          label="Trades"
          value={stats.tradeCount.toLocaleString("en-US")}
          tint="text-white"
          hint={
            stats.openPositions > 0
              ? `${stats.openPositions} open position${stats.openPositions === 1 ? "" : "s"}`
              : "No open positions"
          }
        />
        <StatCard
          icon={<Target className="w-4 h-4" />}
          label="Win rate"
          value={
            stats.winRate === null
              ? "—"
              : `${(stats.winRate * 100).toFixed(0)}%`
          }
          tint="text-primary"
          hint={
            stats.resolvedPositions === 0
              ? "No resolved markets yet"
              : `${stats.resolvedPositions} settled`
          }
        />
        <StatCard
          icon={<Trophy className="w-4 h-4" />}
          label="Rank"
          value={stats.leaderboardRank ? `#${stats.leaderboardRank}` : "—"}
          tint="text-amber-300"
          hint={stats.leaderboardRank ? "Leaderboard" : "Trade to qualify"}
        />
      </section>

      {/* Recent activity */}
      <section className="bg-[#121217] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-black tracking-tight text-white">Recent activity</h2>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Last {recentTrades.length}
          </span>
        </div>

        {recentTrades.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-semibold text-white/60">
              No trades yet. Their first move will show here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {recentTrades.map((t) => {
              const isBuy = t.side === "BUY";
              const isYes = t.outcome === "YES";
              return (
                <li key={t.id}>
                  <Link
                    href={`/market/${t.marketId}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isYes ? "text-yes bg-yes/10" : "text-no bg-no/10"
                      }`}
                    >
                      <span className="text-[10px] font-black tracking-widest">{t.outcome}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white line-clamp-1">
                        {t.marketQuestion}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                          {t.side}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {parseFloat(t.shares).toFixed(2)} sh @ {(parseFloat(t.pricePerShare) * 100).toFixed(1)}¢
                        </span>
                        <span className="text-[10px] font-mono text-white/40">
                          · {relativeTime(t.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p
                      className={`font-black font-mono text-sm shrink-0 tabular-nums ${
                        isBuy ? "text-no" : "text-yes"
                      }`}
                    >
                      {isBuy ? "−" : "+"}${parseFloat(t.amount).toFixed(2)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: string;
  hint?: string;
}) {
  return (
    <div className="bg-[#121217] border border-white/8 rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground mb-3">
        {icon}
        <span className="text-[10px] font-black tracking-[0.22em] uppercase">{label}</span>
      </div>
      <p className={`text-xl md:text-2xl font-black font-mono tabular-nums ${tint}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function Avatar({ user }: { user: PublicUser }) {
  if (user.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt=""
        className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover ring-2 ring-white/30 shrink-0"
      />
    );
  }
  return (
    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 backdrop-blur-sm ring-2 ring-white/30 flex items-center justify-center text-white text-2xl md:text-3xl font-black shrink-0">
      {initialFor(user)}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <div className="h-44 rounded-3xl bg-[#121217] border border-white/8 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-[#121217] border border-white/8 animate-pulse"
          />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-[#121217] border border-white/8 animate-pulse" />
    </div>
  );
}
