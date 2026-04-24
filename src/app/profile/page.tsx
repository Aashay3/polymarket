"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit2, Share2, Globe, Lock, Flame, Zap, TrendingUp, Trophy, Star, Bell, LogOut, Key, ChevronRight, Copy, Check, Target, Swords, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { useWallet } from "@/app/context/WalletContext";
import { useToast } from "@/app/context/ToastContext";

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

const NEARBY_RANKS = [
  { rank: 41, name: "CryptoSage",   profit: "+$3,200", isYou: false },
  { rank: 42, name: "⭐ You",       profit: "+$284",   isYou: true  },
  { rank: 43, name: "MarketWizard", profit: "+$210",   isYou: false },
];

const SETTINGS_ITEMS: { icon: React.ReactNode; label: string; sub: string; href?: string; action?: "logout"; danger?: boolean }[] = [
  { icon: <Edit2 className="w-4 h-4" />,  label: "Edit Profile",          sub: "Change name, avatar, bio",      href: "/settings" },
  { icon: <Key className="w-4 h-4" />,    label: "Change Password",       sub: "Last changed 30 days ago",      href: "/settings" },
  { icon: <Bell className="w-4 h-4" />,   label: "Notification Settings", sub: "Email, push, in-app",           href: "/settings/notifications" },
  { icon: <LogOut className="w-4 h-4" />, label: "Logout",                sub: "Sign out of your account",      action: "logout", danger: true },
];

const DAILY_PNL  = [10, -25, 40, -10, 80, 30, 60, -15, 90, 45, 20, 70];
const WEEKLY_PNL = [80, -30, 150, 60, -20, 200, 140];

function getLevel(xp: number) {
  const lvl  = [...LEVELS].reverse().find(l => xp >= l.xpRequired) ?? LEVELS[0];
  const next = LEVELS.find(l => l.xpRequired > xp) ?? LEVELS[LEVELS.length - 1];
  const pct  = next.xpRequired > lvl.xpRequired ? ((xp - lvl.xpRequired) / (next.xpRequired - lvl.xpRequired)) * 100 : 100;
  return { current: lvl, next, pct: Math.min(pct, 100) };
}

export default function ProfilePage() {
  const { balance, myTrades } = useWallet();
  const { toast } = useToast();
  const [isPublic,  setIsPublic]  = useState(true);
  const [copied,    setCopied]    = useState(false);
  const [chartMode, setChartMode] = useState<"daily" | "weekly">("daily");

  const totalTraded = myTrades.reduce((s, t) => s + t.amount, 0);
  const xp          = Math.floor(totalTraded * 2.4 + myTrades.length * 50);
  const { current: lvl, next: nextLvl, pct: xpPct } = getLevel(xp);
  const streak   = 7;
  const totalPnL = balance - 1000;

  const sparkData  = chartMode === "daily" ? DAILY_PNL : WEEKLY_PNL;
  const sparkColor = sparkData.reduce((a, b) => a + b, 0) >= 0 ? "#22C55E" : "#EF4444";

  const copyAddr = async () => {
    try {
      await navigator.clipboard.writeText("0x4f2a000000000000000000000000000000000c9B3");
      setCopied(true);
      toast({ type: "success", title: "Address copied" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ type: "error", title: "Copy failed" });
    }
  };

  const shareProfile = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "CryptoKing99 on NEXORA", url });
        return;
      } catch {
        // fall through
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ type: "success", title: "Profile link copied" });
    } catch {
      toast({ type: "error", title: "Share failed" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      <div>
        <h1 className="text-xl font-semibold text-white">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your trading profile and settings</p>
      </div>

      {/* Profile header */}
      <div className="bg-[#121217] border border-white/8 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center mb-6">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-2xl shrink-0">
            🧑‍💻
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-white">CryptoKing99</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/12 text-primary border border-primary/20">{lvl.name}</span>
              {isPublic ? <Globe className="w-3.5 h-3.5 text-yes" /> : <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
            <button onClick={copyAddr} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors mt-1 font-mono">
              0x4f2a…c9B3
              {copied ? <Check className="w-3 h-3 text-yes" /> : <Copy className="w-3 h-3" />}
            </button>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">{streak} day streak</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href="/settings"
              className="py-2 px-3.5 rounded-xl border border-white/10 bg-white/4 text-white text-xs font-semibold hover:bg-white/8 transition-colors flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Link>
            <button
              onClick={shareProfile}
              className="py-2 px-3.5 rounded-xl border border-white/10 bg-white/4 text-white text-xs font-semibold hover:bg-white/8 transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button
              onClick={() => { setIsPublic(!isPublic); toast({ type: "info", title: `Profile is now ${!isPublic ? "public" : "private"}` }); }}
              aria-pressed={isPublic}
              className={`py-2 px-3.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${isPublic ? "bg-yes/10 border-yes/20 text-yes" : "bg-white/4 border-white/10 text-muted-foreground"}`}
            >
              {isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isPublic ? "Public" : "Private"}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total PnL",    value: `${totalPnL >= 0 ? "+" : ""}$${Math.abs(totalPnL).toFixed(0)}`, color: totalPnL >= 0 ? "text-yes" : "text-no" },
            { label: "Accuracy",     value: "68%",                                                            color: "text-white" },
            { label: "Total Trades", value: `${myTrades.length}`,                                             color: "text-white" },
            { label: "Win Rate",     value: "68%",                                                            color: "text-white" },
          ].map(s => (
            <div key={s.label} className="bg-white/4 rounded-xl p-3 text-center border border-white/6">
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
              <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* XP bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs font-semibold text-white">Level {lvl.level} — {lvl.name}</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{xp} / {nextLvl.xpRequired} XP</span>
          </div>
          <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
            <div className="h-full bg-[#8B5CF6] rounded-full transition-all" style={{ width: `${xpPct}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{nextLvl.xpRequired - xp} XP to {nextLvl.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Performance chart */}
        <div className="bg-[#121217] border border-white/8 rounded-2xl p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-muted-foreground" />Performance</h3>
            <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
              {(["daily", "weekly"] as const).map(m => (
                <button key={m} onClick={() => setChartMode(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${chartMode === m ? "bg-[#8B5CF6] text-white" : "text-muted-foreground hover:text-white"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="h-32">
            <Sparkline data={sparkData} color={sparkColor} strokeWidth={2} fillOpacity={0.15} />
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-[#121217] border border-white/8 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500" />Achievements</h3>
          <div className="grid grid-cols-3 gap-2">
            {BADGES.map(b => (
              <div key={b.id} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${b.earned ? "border-white/10 bg-white/4 hover:bg-white/6" : "border-white/5 bg-white/2 opacity-40 grayscale"}`}>
                <span className="text-2xl">{b.icon}</span>
                <span className="text-[9px] font-semibold text-white leading-tight">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="bg-[#121217] border border-white/8 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-muted-foreground" />Recent Activity</h3>
          <div className="divide-y divide-white/5">
            {[
              ...myTrades.slice(0, 2).map(t => ({ icon: <Swords className="w-3.5 h-3.5 text-primary" />, label: `Bought ${t.type}`, sub: `$${t.amount.toFixed(2)}`, pnl: null })),
              { icon: <ArrowUpRight className="w-3.5 h-3.5 text-yes" />, label: "Won — Fed Rate Cut", sub: "Mar 25", pnl: "+$340" },
              { icon: <ArrowDownRight className="w-3.5 h-3.5 text-no" />, label: "Lost — SpaceX Mars", sub: "Mar 24", pnl: "-$80" },
              { icon: <Star className="w-3.5 h-3.5 text-yellow-500" />, label: "Reached Level 2", sub: "Mar 23", pnl: null },
            ].slice(0, 4).map((act, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-7 h-7 shrink-0 rounded-lg bg-white/5 flex items-center justify-center">{act.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white line-clamp-1">{act.label}</p>
                  <p className="text-[10px] text-muted-foreground">{act.sub}</p>
                </div>
                {act.pnl && <span className={`text-xs font-bold font-mono ${act.pnl.startsWith("+") ? "text-yes" : "text-no"}`}>{act.pnl}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-[#121217] border border-white/8 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-muted-foreground" />Leaderboard</h3>
          <div className="space-y-2">
            {NEARBY_RANKS.map(r => (
              <div key={r.rank} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${r.isYou ? "bg-primary/8 border-primary/20" : "bg-white/2 border-white/6"}`}>
                <span className={`text-sm font-bold w-6 ${r.isYou ? "text-primary" : "text-muted-foreground"}`}>#{r.rank}</span>
                <span className={`flex-1 text-sm font-medium ${r.isYou ? "text-white" : "text-muted-foreground"}`}>{r.name}</span>
                <span className="text-xs font-mono text-yes font-semibold">{r.profit}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">Rank <span className="text-white font-semibold">#42</span> · Top 0.5%</p>
        </div>

        {/* Settings */}
        <div className="bg-[#121217] border border-white/8 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-muted-foreground" />Settings</h3>
          <div className="divide-y divide-white/5">
            {SETTINGS_ITEMS.map((item) => {
              const rowClass = `w-full flex items-center gap-3 py-3.5 hover:bg-white/3 rounded-xl px-2 -mx-2 transition-colors text-left ${item.danger ? "text-no" : "text-muted-foreground hover:text-white"}`;
              const body = (
                <>
                  <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center border ${item.danger ? "bg-no/8 border-no/15" : "bg-white/4 border-white/8"}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-30" />
                </>
              );
              if (item.href) {
                return <Link key={item.label} href={item.href} className={rowClass}>{body}</Link>;
              }
              return (
                <button
                  key={item.label}
                  onClick={() => { if (item.action === "logout") toast({ type: "info", title: "Signed out", description: "Come back soon." }); }}
                  className={rowClass}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
