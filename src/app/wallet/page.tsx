"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet as WalletIcon,
  Lock,
  Trophy,
  Zap,
  Check,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import {
  CryptoIcon,
  type CryptoSymbol,
  getTokenName,
} from "@/components/ui/CryptoIcon";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Wallet — funds & positions hub.
 *
 * Layout (lg+):
 *
 *   ┌─────────────── 8 ───────────────┬─── 4 ───┐
 *   │ Hero balance (gradient)         │ Promo   │
 *   │ Token strip (selectable)        │ Network │
 *   │ Stats: Cash · Open · PnL        │ Help    │
 *   │ Transactions + filter tabs      │         │
 *   └─────────────────────────────────┴─────────┘
 *
 * Multi-currency: the strip is the single source of truth for the
 * active token; the hero re-renders against the selected one.
 *
 * Per-token balances are NOT yet tracked server-side — the wallet API
 * returns one USDC-equivalent number. Until then, USDC shows the real
 * balance and other tokens show 0; swap `tokenBalance()` for the real
 * lookup once `/api/me` returns a per-token map.
 */

const SUPPORTED_TOKENS: CryptoSymbol[] = ["USDC", "USDT", "DAI", "ETH", "BTC", "MATIC"];

// Mock 12-point history. Replace with real /api/me/history (or a
// derived series) when balance snapshots are wired up.
const BALANCE_HISTORY = [920, 870, 950, 890, 1010, 980, 1060, 1020, 1140, 1090, 1180, 1000];

type TxType = "Deposit" | "Trade" | "Payout" | "Withdrawal";
type TxFilter = "All" | TxType;

const STATIC_TXS: { id: string; type: TxType; label: string; amount: number; date: string; pending: boolean }[] = [
  { id: "tx1", type: "Deposit",    label: "Initial Deposit",            amount: +1000, date: "Mar 25, 2026", pending: false },
  { id: "tx2", type: "Trade",      label: "Bought YES — Bitcoin $100k", amount: -200,  date: "Mar 25, 2026", pending: false },
  { id: "tx3", type: "Trade",      label: "Bought NO — Fed Rate Cut",   amount: -150,  date: "Mar 26, 2026", pending: false },
  { id: "tx4", type: "Payout",     label: "Payout — SpaceX Mars (YES)", amount: +340,  date: "Mar 26, 2026", pending: false },
  { id: "tx5", type: "Withdrawal", label: "Withdrawal to Bank",         amount: -100,  date: "Mar 27, 2026", pending: true  },
];

const TX_COLOR: Record<TxType, string> = {
  Deposit:    "text-yes bg-yes/10",
  Payout:     "text-yes bg-yes/10",
  Trade:      "text-primary bg-primary/10",
  Withdrawal: "text-no bg-no/10",
};

const TX_FILTERS: TxFilter[] = ["All", "Deposit", "Trade", "Payout", "Withdrawal"];

export default function WalletPage() {
  const { balance, tokenBalances, myTrades } = useWallet();
  const [hidden, setHidden] = useState(false);
  const [selectedToken, setSelectedToken] = useState<CryptoSymbol>("USDC");
  const [filter, setFilter] = useState<TxFilter>("All");
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // USDC remains canonical (every trade settles in USDC, so the
  // platform balance number lives on `balance`). Other tokens come
  // from the per-user `Balance.tokens` map populated by the deposit
  // worker once multi-token deposits ship — until then non-USDC
  // entries read as 0 and the strip clearly shows that.
  const tokenBalance = (symbol: CryptoSymbol): number => {
    if (symbol === "USDC") return balance;
    const raw = tokenBalances[symbol];
    return raw ? parseFloat(raw) : 0;
  };
  const activeBalance = tokenBalance(selectedToken);

  // 24h delta — last point of BALANCE_HISTORY vs current `balance`.
  const dayStart = BALANCE_HISTORY[BALANCE_HISTORY.length - 2] ?? balance;
  const dayPnl = balance - dayStart;
  const dayPnlPct = dayStart === 0 ? 0 : (dayPnl / dayStart) * 100;
  const isUp = dayPnl >= 0;

  const inOpenTrades = useMemo(
    () => myTrades.reduce((s, t) => s + t.amount, 0),
    [myTrades],
  );
  // Realized PnL needs a closed-positions endpoint we don't surface yet.
  const realizedPnl = 0;

  const sparkData = useMemo(
    () => [...BALANCE_HISTORY.slice(0, -1), balance],
    [balance],
  );

  const transactions = useMemo(
    () => [
      ...STATIC_TXS,
      ...myTrades.slice(0, 5).map((t) => ({
        id: t.id,
        type: "Trade" as TxType,
        label: `Bought ${t.type} — ${t.marketQuestion}`,
        amount: -t.amount,
        date: new Date(t.timestamp).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        pending: false,
      })),
    ],
    [myTrades],
  );

  const filteredTxs = useMemo(
    () => (filter === "All" ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter],
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const tokenName = getTokenName(selectedToken);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Wallet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Funds, positions, and on-chain activity
          </p>
        </div>
        <button
          onClick={() => showToast("Balance synced")}
          aria-label="Refresh balance"
          className="p-2.5 rounded-xl bg-[#121217] border border-white/8 text-muted-foreground hover:text-white hover:border-white/15 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Main column ───────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Hero balance — violet→fuchsia gradient with sparkline */}
          <section
            aria-label="Total balance"
            className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.6)]"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-linear-to-br from-violet-700 via-fuchsia-600 to-purple-900"
            />
            <div
              aria-hidden
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-fuchsia-400/30 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-violet-500/30 blur-3xl"
            />

            <div className="relative p-6 md:p-8">
              {/* Top row: label + 24h chip */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black tracking-[0.22em] uppercase text-white/80">
                    Total Balance
                  </p>
                  <button
                    onClick={() => setHidden((v) => !v)}
                    aria-label={hidden ? "Show balance" : "Hide balance"}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-sm ring-1 ring-white/15">
                  {isUp ? (
                    <TrendingUp className="w-3 h-3 text-emerald-300" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-rose-300" />
                  )}
                  <span className="text-[11px] font-black tabular-nums text-white">
                    {isUp ? "+" : ""}
                    ${dayPnl.toFixed(2)} ({isUp ? "+" : ""}
                    {dayPnlPct.toFixed(1)}%)
                  </span>
                  <span className="text-[9px] font-black tracking-widest uppercase text-white/60">
                    24h
                  </span>
                </div>
              </div>

              {/* Big balance line */}
              <div className="flex items-center gap-3 mb-1">
                <CryptoIcon symbol={selectedToken} size={36} />
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-5xl md:text-6xl font-black text-white tabular-nums leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)] truncate">
                    {hidden
                      ? "••••••"
                      : activeBalance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                  </span>
                  <span className="text-base md:text-lg font-black text-white/70">
                    {selectedToken}
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/70 font-medium mb-6">
                {tokenName} on Polygon · Available for trading
              </p>

              {/* Sparkline — white stroke over the gradient */}
              <div className="h-20 -mx-2 mb-6">
                <Sparkline
                  data={sparkData}
                  color="#FFFFFF"
                  strokeWidth={2}
                  fillOpacity={0.25}
                  height={80}
                />
              </div>

              {/* Actions: Deposit (filled) + Withdraw (outline) */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/wallet/deposit"
                  className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-white text-purple-900 text-sm font-black uppercase tracking-wider shadow-[0_8px_24px_-6px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.5)] transition-all"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Deposit
                </Link>
                <Link
                  href="/wallet/withdraw"
                  className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-black/25 backdrop-blur-sm ring-1 ring-white/25 text-white text-sm font-black uppercase tracking-wider hover:bg-black/35 hover:ring-white/40 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Withdraw
                </Link>
              </div>
            </div>
          </section>

          {/* Token strip — horizontally scrollable; tap to switch active */}
          <section aria-label="Supported tokens">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black tracking-[0.22em] uppercase text-white/40">
                Your Tokens
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Tap to switch · {SUPPORTED_TOKENS.length} supported
              </p>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {SUPPORTED_TOKENS.map((symbol) => {
                const isSelected = symbol === selectedToken;
                const bal = tokenBalance(symbol);
                return (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => setSelectedToken(symbol)}
                    aria-pressed={isSelected}
                    className={`shrink-0 w-[140px] p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary/50 shadow-[0_0_24px_-6px_rgba(139,92,246,0.5)]"
                        : "bg-[#121217] border-white/8 hover:border-white/20 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <CryptoIcon symbol={symbol} size={36} />
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        isSelected ? "text-primary" : "text-white"
                      }`}
                    >
                      {symbol}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {getTokenName(symbol)}
                    </p>
                    <p className="text-base font-black text-white tabular-nums mt-2">
                      {bal.toFixed(2)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Stats: Cash / In Open Trades / Realized PnL */}
          <section
            aria-label="Wallet stats"
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <StatCard
              icon={<WalletIcon className="w-4 h-4" />}
              label="Cash"
              value={`$${balance.toFixed(2)}`}
              tint="text-white"
              hint="Available now"
            />
            <StatCard
              icon={<Lock className="w-4 h-4" />}
              label="In Open Trades"
              value={`$${inOpenTrades.toFixed(2)}`}
              tint="text-primary"
              hint={`${myTrades.length} position${myTrades.length === 1 ? "" : "s"}`}
            />
            <StatCard
              icon={<Trophy className="w-4 h-4" />}
              label="Realized PnL"
              value={`${realizedPnl >= 0 ? "+" : ""}$${realizedPnl.toFixed(2)}`}
              tint={realizedPnl >= 0 ? "text-yes" : "text-no"}
              hint="All time"
            />
          </section>

          {/* Transactions */}
          <section aria-label="Transaction history">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-black tracking-tight text-white">
                Activity
              </h2>
              <div className="inline-flex gap-1 p-1 rounded-xl bg-[#121217] border border-white/8">
                {TX_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${
                      filter === f
                        ? "bg-primary text-white shadow-[0_2px_10px_-2px_rgba(139,92,246,0.6)]"
                        : "text-muted-foreground hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#121217] border border-white/8 rounded-2xl overflow-hidden">
              {filteredTxs.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-sm font-semibold text-white/60">
                    No {filter === "All" ? "" : filter.toLowerCase()} activity yet.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {filteredTxs.map((tx) => {
                    const isGain = tx.amount > 0;
                    const isExpanded = expandedTx === tx.id;
                    return (
                      <li key={tx.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                          aria-expanded={isExpanded}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/2 transition-colors text-left"
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TX_COLOR[tx.type]}`}
                          >
                            {tx.type === "Deposit" || tx.type === "Payout" ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : tx.type === "Trade" ? (
                              <Zap className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white line-clamp-1">
                              {tx.label}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] font-mono text-muted-foreground">
                                {tx.date}
                              </p>
                              {tx.pending && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/12 text-yellow-400 border border-yellow-500/20 uppercase tracking-widest">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                          <p
                            className={`font-black font-mono text-sm shrink-0 tabular-nums ${
                              isGain ? "text-yes" : "text-no"
                            }`}
                          >
                            {isGain ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                          </p>
                        </button>
                        {isExpanded && (
                          <div className="px-5 py-3 border-t border-white/5 bg-white/1 grid grid-cols-3 gap-4 text-xs">
                            {[
                              { k: "ID", v: `#${tx.id.toUpperCase()}` },
                              { k: "Status", v: tx.pending ? "Pending" : "Completed" },
                              { k: "Fee", v: tx.type === "Trade" ? "—" : "$0.00" },
                            ].map(({ k, v }) => (
                              <div key={k}>
                                <p className="text-muted-foreground uppercase tracking-widest text-[9px] mb-0.5 font-black">
                                  {k}
                                </p>
                                <p className="font-mono font-semibold text-white">{v}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Bonus promo — bold gradient, links to deposit */}
          <Link
            href="/wallet/deposit"
            className="group relative block overflow-hidden rounded-2xl ring-1 ring-white/10 hover:-translate-y-0.5 hover:ring-white/20 transition-all"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-linear-to-br from-amber-500 via-fuchsia-600 to-violet-700"
            />
            <div className="relative p-5">
              <p className="text-[10px] font-black tracking-[0.22em] uppercase text-white/70 mb-1">
                Welcome bonus
              </p>
              <h3 className="text-2xl font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                Get $5 free
              </h3>
              <p className="text-xs text-white/85 font-medium mt-1.5">
                Deposit $20+ and we&apos;ll match $5 to your trading balance.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white">
                Claim
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Network info */}
          <div className="rounded-2xl border border-white/8 bg-[#121217] p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <p className="text-[10px] font-black tracking-[0.22em] uppercase text-white/50">
                Network
              </p>
            </div>
            <p className="text-sm font-bold text-white">Polygon Mainnet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Trades settle in USDC. Other tokens auto-swap on deposit. Average gas &lt; $0.01.
            </p>
            <div className="mt-4 flex items-center gap-1.5 flex-wrap">
              {SUPPORTED_TOKENS.map((s) => (
                <CryptoIcon key={s} symbol={s} size={22} />
              ))}
            </div>
          </div>

          {/* Help */}
          <Link
            href="/support"
            className="block rounded-2xl border border-white/8 bg-[#121217] p-5 hover:border-white/15 hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">Need help?</p>
                <p className="text-xs text-muted-foreground">
                  Deposits, withdrawals, KYC — we&apos;re here.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#121217] border border-white/15 text-white text-sm font-semibold px-5 py-3 rounded-2xl flex items-center gap-2 shadow-2xl">
          <Check className="w-4 h-4 text-primary" />
          {toast}
        </div>
      )}
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
        <span className="text-[10px] font-black tracking-[0.22em] uppercase">
          {label}
        </span>
      </div>
      <p className={`text-xl font-black font-mono tabular-nums ${tint}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
