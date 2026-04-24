"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowDownLeft, ArrowUpRight, Activity, LogIn, Sparkles } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";
import { useIsClient } from "@/hooks/useIsClient";
import { CryptoIcon } from "@/components/ui/CryptoIcon";

/**
 * Right-rail widgets for the home feed. Only renders on xl+ screens
 * (parent controls visibility); sidebar vanishes below that so the
 * feed has room.
 *
 * Composition (top-down):
 *   1. PortfolioCard    — signed-in users see USDC balance + shortcuts;
 *                          signed-out users see a sign-in nudge.
 *   2. RecentActivity   — live-updated ticker of latest trades (any
 *                          user, any market) pushed via SSE.
 */
export function HomeSidebar() {
  return (
    <aside className="space-y-4 w-full">
      <PortfolioCard />
      <RecentActivity />
    </aside>
  );
}

function PortfolioCard() {
  const { balance } = useWallet();
  const mounted = useIsClient();
  const { status } = useSession();
  const isAuthed = status === "authenticated";

  if (!isAuthed) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-white">Start trading</p>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Sign in to deposit USDC, place trades, and see your portfolio in real time.
        </p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1.5 w-full justify-center py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          Sign in
        </Link>
      </div>
    );
  }

  const display = mounted ? balance.toFixed(2) : "0.00";
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121217] p-5">
      <p className="text-xs text-muted-foreground mb-2">Portfolio</p>
      <div className="flex items-baseline gap-2 mb-4">
        <CryptoIcon symbol="USDC" size={22} />
        <p className="text-2xl font-bold text-white tabular-nums font-mono">
          {display}
          <span className="text-xs text-white/40 ml-1.5">USDC</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/wallet/deposit"
          className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          Deposit
        </Link>
        <Link
          href="/wallet/withdraw"
          className="flex items-center justify-center gap-1.5 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-colors"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Withdraw
        </Link>
      </div>
    </div>
  );
}

function RecentActivity() {
  const { trades } = useWallet();
  // Cap to a small feed so the sidebar doesn't grow unbounded.
  const recent = trades.slice(0, 8);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121217] p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          Recent activity
        </p>
      </div>

      {recent.length === 0 ? (
        <p className="text-xs text-white/40 py-4 text-center">
          Trades will stream in here as they happen.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {recent.map((t) => (
            <li key={t.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className={`font-semibold ${t.type === "YES" ? "text-yes" : "text-no"}`}>
                  {t.side === "SELL" ? "SOLD" : "BOUGHT"} {t.type}
                </span>
                <span className="text-white/30 font-mono tabular-nums">
                  {Math.round(t.price * 100)}¢
                </span>
              </div>
              <p className="text-[11px] text-white/50 line-clamp-1 mt-0.5">
                {t.marketQuestion || "a market"}
              </p>
              <p className="text-[10px] text-white/25 mt-0.5">
                {relativeTime(t.timestamp)} · ${t.amount.toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 15_000) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
