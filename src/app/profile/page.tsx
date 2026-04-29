"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  Copy,
  Edit2,
  Flame,
  Globe,
  Key,
  Lock,
  LogOut,
  Settings as SettingsIcon,
  Share2,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { useWallet } from "@/app/context/WalletContext";
import { useToast } from "@/app/context/ToastContext";

/**
 * Profile page.
 *
 * Layout (top→bottom):
 *   1. Hero card  — avatar + identity + badges + XP progress
 *   2. 4-up stats — P&L, Trades, Win rate, Streak (each with a mini viz)
 *   3. Performance chart — daily/weekly toggle
 *   4. Recent activity + Achievements (side by side)
 */

const LEVELS = [
  { level: 1, name: "Novice",      xpRequired: 0     },
  { level: 2, name: "Apprentice",  xpRequired: 500   },
  { level: 3, name: "Analyst",     xpRequired: 1500  },
  { level: 4, name: "Strategist",  xpRequired: 3000  },
  { level: 5, name: "Pro Trader",  xpRequired: 6000  },
  { level: 6, name: "Market Sage", xpRequired: 12000 },
];

const BADGES = [
  { id: "brain",   icon: "🧠", label: "Smart Predictor", earned: true  },
  { id: "fire",    icon: "🔥", label: "High Roller",     earned: true  },
  { id: "target",  icon: "🎯", label: "Accurate Trader", earned: true  },
  { id: "streak",  icon: "⚡", label: "On a Streak",     earned: false },
  { id: "diamond", icon: "💎", label: "Diamond Hands",   earned: false },
  { id: "whale",   icon: "🐋", label: "Whale",           earned: false },
];

const DAILY_PNL  = [10, -25, 40, -10, 80, 30, 60, -15, 90, 45, 20, 70];
const WEEKLY_PNL = [80, -30, 150, 60, -20, 200, 140];
const PNL_SPARK   = [40, -10, 60, 20, -40, 30, -20, 50, -30, 10, -50, -30];
const TRADES_SPARK = [2, 4, 3, 6, 5, 7, 6, 8, 7, 9, 8, 10];
const STREAK_BARS = [2, 3, 4, 4, 5, 6, 7];

function getLevel(xp: number) {
  const lvl  = [...LEVELS].reverse().find((l) => xp >= l.xpRequired) ?? LEVELS[0];
  const next = LEVELS.find((l) => l.xpRequired > xp) ?? LEVELS[LEVELS.length - 1];
  const pct  =
    next.xpRequired > lvl.xpRequired
      ? ((xp - lvl.xpRequired) / (next.xpRequired - lvl.xpRequired)) * 100
      : 100;
  return { current: lvl, next, pct: Math.min(pct, 100) };
}

function initialsFor(name?: string | null, email?: string | null): string {
  const src = (name || email || "").trim();
  if (!src) return "N";
  const parts = src.split(/[\s.@_-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { balance, myTrades } = useWallet();
  const { toast } = useToast();
  const [isPublic, setIsPublic] = useState(true);
  const [copied, setCopied] = useState(false);
  const [chartMode, setChartMode] = useState<"daily" | "weekly">("daily");

  const totalTraded = myTrades.reduce((s, t) => s + t.amount, 0);
  const xp          = Math.floor(totalTraded * 2.4 + myTrades.length * 50);
  const { current: lvl, next: nextLvl, pct: xpPct } = getLevel(xp);

  const totalPnL = balance - 1000;
  const streak   = 7;
  const winRate  = 68;

  const displayName =
    session?.user?.username ||
    session?.user?.name ||
    session?.user?.email?.split("@")[0] ||
    "Trader";
  const initials = initialsFor(session?.user?.name, session?.user?.email);
  const handle   = `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  const sparkData  = chartMode === "daily" ? DAILY_PNL : WEEKLY_PNL;
  const sparkColor = sparkData.reduce((a, b) => a + b, 0) >= 0 ? "#22C55E" : "#EF4444";

  const activity = useMemo(() => {
    const tradeRows = myTrades.slice(0, 3).map((t) => ({
      icon: t.type === "YES" ? (
        <ArrowUpRight className="w-3.5 h-3.5 text-yes" />
      ) : (
        <ArrowDownRight className="w-3.5 h-3.5 text-no" />
      ),
      label: `Bought ${t.type} on ${t.marketQuestion?.slice(0, 28) ?? "a market"}`,
      sub: relTime(t.timestamp),
      pnl: null as string | null,
    }));
    const padding = [
      { icon: <Star className="w-3.5 h-3.5 text-yellow-400" />, label: `Reached Level ${lvl.level}`, sub: "this week", pnl: null },
      { icon: <Zap className="w-3.5 h-3.5 text-violet-400" />,  label: `${streak}-day streak active`, sub: "today", pnl: null },
    ];
    return [...tradeRows, ...padding].slice(0, 5);
  }, [myTrades, lvl.level]);

  const copyHandle = async () => {
    try {
      await navigator.clipboard.writeText(handle);
      setCopied(true);
      toast({ type: "success", title: "Handle copied" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ type: "error", title: "Copy failed" });
    }
  };

  const shareProfile = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${displayName} on NEXORA`, url });
        return;
      } catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ type: "success", title: "Profile link copied" });
    } catch {
      toast({ type: "error", title: "Share failed" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-6">
      {/* ── Hero card ────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0c0c12] ring-1 ring-white/8 p-6 sm:p-7">
        {/* Soft violet spotlight in the top-right corner */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 w-[420px] h-[420px] rounded-full bg-violet-600/30 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,1) 1px, transparent 0)",
            backgroundSize: "16px 16px",
          }}
        />

        {/* Top-right action cluster */}
        <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
          <button
            onClick={shareProfile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/15 text-white text-xs font-bold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/15 text-white text-xs font-bold transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Link>
        </div>

        <div className="relative flex flex-col sm:flex-row gap-5 sm:gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-linear-to-br from-violet-500 to-fuchsia-600 ring-4 ring-[#0c0c12] flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-[0_8px_24px_-4px_rgba(139,92,246,0.55)]">
              {initials}
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white truncate">
                {displayName}
              </h1>
              <span className="text-[10px] font-black tracking-[0.18em] uppercase px-2 py-0.5 rounded-md bg-primary/15 text-primary ring-1 ring-primary/25">
                {lvl.name}
              </span>
            </div>

            <button
              onClick={copyHandle}
              className="inline-flex items-center gap-1.5 mt-1 text-xs font-mono text-white/55 hover:text-white transition-colors"
            >
              {handle}
              {copied ? <Check className="w-3 h-3 text-yes" /> : <Copy className="w-3 h-3" />}
            </button>

            {/* Badge row */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/95 text-yellow-950 text-[10px] font-black tracking-[0.1em] uppercase">
                <Star className="w-3 h-3 fill-yellow-950" />
                L{lvl.level}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-400/15 ring-1 ring-orange-400/30 text-orange-300 text-[11px] font-bold">
                <Flame className="w-3 h-3" />
                {streak}-day streak
              </span>
              <button
                onClick={() => {
                  setIsPublic(!isPublic);
                  toast({ type: "info", title: `Profile is now ${!isPublic ? "public" : "private"}` });
                }}
                aria-pressed={isPublic}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                  isPublic
                    ? "bg-yes/15 ring-1 ring-yes/30 text-yes hover:bg-yes/20"
                    : "bg-white/5 ring-1 ring-white/10 text-white/55 hover:text-white"
                }`}
              >
                {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {isPublic ? "Public" : "Private"}
              </button>
            </div>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="relative mt-6">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-white/40 mb-1.5">
            <span>Level {lvl.level} · {lvl.name}</span>
            <span className="font-mono normal-case tracking-normal">
              {xp} / {nextLvl.xpRequired} XP
            </span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-linear-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="text-[10px] text-white/40 mt-1.5">
            {Math.max(0, nextLvl.xpRequired - xp)} XP to{" "}
            <span className="text-white/70 font-semibold">{nextLvl.name}</span>
          </p>
        </div>
      </section>

      {/* ── 4-up stats ───────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Total P&L"
          value={`${totalPnL >= 0 ? "+" : "-"}$${Math.abs(totalPnL).toFixed(0)}`}
          accent={totalPnL >= 0 ? "yes" : "no"}
          viz={
            <Sparkline
              data={PNL_SPARK}
              color={totalPnL >= 0 ? "#22C55E" : "#EF4444"}
              height={36}
              strokeWidth={1.75}
            />
          }
        />
        <StatTile
          label="Trades"
          value={String(myTrades.length)}
          viz={<Sparkline data={TRADES_SPARK} color="#3B82F6" height={36} strokeWidth={1.75} />}
        />
        <StatTile
          label="Win rate"
          value={`${winRate}%`}
          accent="yes"
          viz={<CircularProgress value={winRate} color="#22C55E" />}
        />
        <StatTile
          label="Streak"
          value={`${streak}d`}
          accent="violet"
          viz={<MiniBars data={STREAK_BARS} color="#A78BFA" />}
        />
      </section>

      {/* ── Performance chart ─────────────────────────────────── */}
      <section className="rounded-2xl bg-[#0c0c12] ring-1 ring-white/8 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-white/85 uppercase tracking-[0.16em]">
            Performance
          </h3>
          <div className="inline-flex p-0.5 rounded-full bg-white/5 ring-1 ring-white/10">
            {(["daily", "weekly"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setChartMode(m)}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
                  chartMode === m
                    ? "bg-primary text-white"
                    : "text-white/55 hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="h-44">
          <Sparkline data={sparkData} color={sparkColor} strokeWidth={2.25} fillOpacity={0.18} height={176} />
        </div>
      </section>

      {/* ── Activity + Achievements ──────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-[#0c0c12] ring-1 ring-white/8 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white/85 uppercase tracking-[0.16em]">
              Recent activity
            </h3>
            <Link
              href="/portfolio"
              className="text-[11px] font-bold text-white/45 hover:text-white transition-colors flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-white/5">
            {activity.length === 0 ? (
              <li className="text-xs text-white/40 py-4 text-center">
                Your trades will appear here.
              </li>
            ) : (
              activity.map((act, i) => (
                <li key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-white/5 ring-1 ring-white/8 flex items-center justify-center">
                    {act.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white line-clamp-1">{act.label}</p>
                    <p className="text-[10px] text-white/40">{act.sub}</p>
                  </div>
                  {act.pnl && (
                    <span
                      className={`text-xs font-bold font-mono ${
                        act.pnl.startsWith("+") ? "text-yes" : "text-no"
                      }`}
                    >
                      {act.pnl}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-2xl bg-[#0c0c12] ring-1 ring-white/8 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white/85 uppercase tracking-[0.16em]">
              Achievements
            </h3>
            <span className="text-[11px] font-mono text-white/40">
              {BADGES.filter((b) => b.earned).length}/{BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BADGES.map((b) => (
              <div
                key={b.id}
                title={b.label}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${
                  b.earned
                    ? "border-white/10 bg-white/4 hover:bg-white/6"
                    : "border-white/5 bg-white/2 opacity-40 grayscale"
                }`}
              >
                <span className="text-2xl" aria-hidden>{b.icon}</span>
                <span className="text-[10px] font-bold text-white leading-tight">{b.label}</span>
                {b.earned && <Trophy className="w-2.5 h-2.5 text-yellow-400" aria-hidden />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Settings ─────────────────────────────────────────── */}
      <section className="rounded-2xl bg-[#0c0c12] ring-1 ring-white/8 p-5">
        <h3 className="text-sm font-black text-white/85 uppercase tracking-[0.16em] mb-4">
          Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <SettingsLink
            href="/settings"
            icon={<SettingsIcon className="w-4 h-4" />}
            label="Account & profile"
            sub="Name, avatar, bio"
          />
          <SettingsLink
            href="/settings"
            icon={<Key className="w-4 h-4" />}
            label="Security"
            sub="Password, 2FA, sessions"
          />
          <SettingsLink
            href="/settings/notifications"
            icon={<Bell className="w-4 h-4" />}
            label="Notifications"
            sub="Email, push, in-app"
          />
          <button
            onClick={() => toast({ type: "info", title: "Signed out", description: "Come back soon." })}
            className="group flex items-center gap-3 px-3 py-3 rounded-xl bg-no/5 ring-1 ring-no/15 hover:bg-no/10 hover:ring-no/30 transition-colors text-left"
          >
            <div className="w-8 h-8 shrink-0 rounded-lg bg-no/15 flex items-center justify-center text-no">
              <LogOut className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-no">Log out</p>
              <p className="text-[10px] text-no/70">Sign out of this device</p>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingsLink({
  href,
  icon,
  label,
  sub,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] ring-1 ring-white/8 hover:bg-white/5 hover:ring-white/15 transition-colors"
    >
      <div className="w-8 h-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-white/70 group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-[10px] text-white/40">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/60 transition-colors" />
    </Link>
  );
}

// ─── Stat tile ─────────────────────────────────────────────────

function StatTile({
  label,
  value,
  accent,
  viz,
}: {
  label: string;
  value: string;
  accent?: "yes" | "no" | "violet";
  viz?: React.ReactNode;
}) {
  const valueColor =
    accent === "yes"    ? "text-yes" :
    accent === "no"     ? "text-no" :
    accent === "violet" ? "text-violet-400" :
    "text-white";
  return (
    <div className="rounded-2xl bg-[#0c0c12] ring-1 ring-white/8 p-4 flex items-center gap-3 min-h-[110px]">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black tracking-[0.22em] uppercase text-white/40 mb-2">
          {label}
        </p>
        <p className={`text-2xl sm:text-[28px] font-black font-mono tabular-nums leading-none ${valueColor}`}>
          {value}
        </p>
      </div>
      {viz && <div className="w-20 h-12 shrink-0 flex items-center justify-end">{viz}</div>}
    </div>
  );
}

// ─── Mini visualizations ───────────────────────────────────────

function CircularProgress({
  value,
  color = "#22C55E",
  size = 54,
}: {
  value: number;
  color?: string;
  size?: number;
}) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function MiniBars({
  data,
  color,
  height = 40,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-sm"
          style={{
            height: `${(v / max) * 100}%`,
            background: color,
            opacity: 0.55 + 0.45 * (i / (data.length - 1)),
          }}
        />
      ))}
    </div>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
