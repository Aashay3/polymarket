"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, PieChart, History, X, Wallet, Activity, Target, Trophy, CheckCircle, ArrowDownLeft } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { useWallet } from "@/app/context/WalletContext";
import { useToast } from "@/app/context/ToastContext";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsTable, BitsTableRow, BitsTableCell } from "@/components/ui/bits/BitsTable";
import { EmptyState } from "@/components/ui/EmptyState";

const PORTFOLIO_SPARK = [820, 910, 870, 950, 890, 1050, 980, 1120, 1080, 1220, 1180, 1284];

type Tab = "active" | "settled";

interface Holding {
  marketId: string;
  marketQuestion: string;
  type: "YES" | "NO";
  shares: number;
  invested: number;
  // Computed only for "active":
  currentValue: number;
  currentPrice: number;
  avgBuyPrice: number;
  // Computed only for "settled":
  marketStatus: "OPEN" | "CLOSED" | "RESOLVED" | "VOIDED";
  winningOutcome?: "YES" | "NO";
}

export default function PortfolioPage() {
  const { myTrades, markets, balance, closePosition } = useWallet();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("active");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Aggregate trades into per-(market, outcome) holdings, then bucket
  // by the host market's status. Open positions get live AMM pricing,
  // settled positions get their resolution outcome instead.
  const { active, settled } = useMemo(() => {
    const map = new Map<string, Holding>();
    for (const trade of myTrades) {
      const key = `${trade.marketId}-${trade.type}`;
      const market = markets.find((m) => m.id === trade.marketId);
      if (!map.has(key)) {
        map.set(key, {
          marketId: trade.marketId,
          marketQuestion: trade.marketQuestion,
          type: trade.type,
          shares: 0,
          invested: 0,
          currentValue: 0,
          currentPrice: 0,
          avgBuyPrice: 0,
          marketStatus: market?.status ?? "OPEN",
          winningOutcome: market?.winningOutcome,
        });
      }
      const h = map.get(key)!;
      // BUY adds shares + invested cash; SELL (incl. resolver-issued
      // synthetic SELL @ 1.0 on winning settlement) reduces shares.
      if (trade.side === "BUY") {
        h.shares += trade.shares;
        h.invested += trade.amount;
      } else {
        h.shares -= trade.shares;
      }
    }

    const all = Array.from(map.values()).map((h) => {
      const market = markets.find((m) => m.id === h.marketId);
      h.marketStatus = market?.status ?? h.marketStatus;
      h.winningOutcome = market?.winningOutcome ?? h.winningOutcome;
      if (market && market.status === "OPEN") {
        const totalPool = market.yesShares + market.noShares;
        h.currentPrice = h.type === "YES"
          ? market.yesShares / totalPool
          : market.noShares / totalPool;
        h.currentValue = Math.max(h.shares, 0) * h.currentPrice;
      }
      h.avgBuyPrice = h.shares > 0 ? h.invested / Math.max(h.shares, 1) : 0;
      return h;
    });

    return {
      active: all.filter((h) => h.marketStatus === "OPEN" && h.shares > 0.0001),
      settled: all.filter(
        (h) => h.marketStatus === "RESOLVED" && h.invested > 0,
      ),
    };
  }, [myTrades, markets]);

  const positionsValue = active.reduce((s, h) => s + h.currentValue, 0);
  const totalValue = balance + positionsValue;
  const totalPnL = totalValue - 1000;
  const isUp = totalPnL >= 0;

  const settledRealizedPnl = useMemo(() => {
    let pnl = 0;
    for (const h of settled) {
      const won = h.winningOutcome === h.type;
      const payout = won ? h.shares > 0 ? h.shares : positionPayoutFromInvestedShares(h) : 0;
      pnl += payout - h.invested;
    }
    return pnl;
  }, [settled]);

  const handleClaim = async (h: Holding) => {
    const key = `${h.marketId}-${h.type}`;
    if (claiming === key) return;
    setClaiming(key);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketId: h.marketId, outcome: h.type }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        toast({
          type: "error",
          title: "Couldn't claim",
          description: body?.error?.message ?? `HTTP ${res.status}`,
        });
        return;
      }
      const amount = parseFloat(body.data.amount);
      toast({
        type: body.data.alreadyCredited ? "info" : "success",
        title: body.data.alreadyCredited ? "Already credited" : "Payout claimed",
        description: `+$${amount.toFixed(2)} on this market — see /wallet`,
      });
    } catch (e) {
      toast({
        type: "error",
        title: "Network error",
        description: e instanceof Error ? e.message : "Try again",
      });
    } finally {
      setClaiming(null);
    }
  };

  const statCards = [
    { label: "Cash Balance",    value: `$${balance.toFixed(2)}`,        icon: <Wallet className="w-4 h-4" /> },
    { label: "Positions Value", value: `$${positionsValue.toFixed(2)}`, icon: <PieChart className="w-4 h-4" /> },
    { label: "Open Positions",  value: `${active.length}`,              icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">
          Active positions and resolved-market history.
        </p>
      </div>

      {/* Hero balance card */}
      <BitsCard className="p-8 lg:p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-135 from-primary/10 to-transparent opacity-40 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Total Portfolio Value</p>
            <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <span className={`flex items-center gap-1 text-sm font-bold ${isUp ? "text-yes" : "text-no"}`}>
                {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isUp ? "+" : ""}${Math.abs(totalPnL).toLocaleString("en-US")}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isUp ? "bg-yes/10 text-yes" : "bg-no/10 text-no"}`}>
                {isUp ? "+" : ""}{((totalPnL / 1000) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="w-full md:w-64 h-24">
            <Sparkline data={PORTFOLIO_SPARK} color={isUp ? "#22C55E" : "#EF4444"} strokeWidth={2.5} />
          </div>
        </div>
      </BitsCard>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {statCards.map(s => (
          <BitsCard key={s.label} className="p-5 border-white/5 bg-white/2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{s.label}</span>
              <span className="text-muted-foreground/30">{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </BitsCard>
        ))}
      </div>

      {/* Tabs */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="inline-flex gap-1 p-1 rounded-xl bg-[#121217] border border-white/8">
            <button
              type="button"
              onClick={() => setTab("active")}
              aria-pressed={tab === "active"}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${
                tab === "active"
                  ? "bg-primary text-white shadow-[0_2px_10px_-2px_rgba(139,92,246,0.6)]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Active · {active.length}
            </button>
            <button
              type="button"
              onClick={() => setTab("settled")}
              aria-pressed={tab === "settled"}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${
                tab === "settled"
                  ? "bg-primary text-white shadow-[0_2px_10px_-2px_rgba(139,92,246,0.6)]"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Settled · {settled.length}
            </button>
          </div>
          {tab === "settled" && settled.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Realized P&L:
              <span
                className={`ml-1.5 font-black font-mono ${
                  settledRealizedPnl >= 0 ? "text-yes" : "text-no"
                }`}
              >
                {settledRealizedPnl >= 0 ? "+" : "−"}$
                {Math.abs(settledRealizedPnl).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {tab === "active" ? (
          active.length === 0 ? (
            <BitsCard className="border-white/5 bg-white/2">
              <EmptyState
                icon={Target}
                title="No active positions yet"
                description="Pick a market and place your first YES or NO order to start building your portfolio."
                action={{ label: "Browse markets", href: "/dashboard/markets" }}
              />
            </BitsCard>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {active.map((h) => {
                const pnl = h.currentValue - h.invested;
                const isProfit = pnl >= 0;
                const key = `${h.marketId}-${h.type}`;
                return (
                  <BitsCard key={key} hover className="border-white/5 flex flex-col">
                    <div className="p-5 cursor-pointer" onClick={() => setExpanded(expanded === key ? null : key)}>
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex-1 min-w-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider ${h.type === "YES" ? "bg-yes/10 text-yes" : "bg-no/10 text-no"}`}>
                            {h.type} Position
                          </span>
                          <p className="text-15px font-semibold text-white mt-4 line-clamp-2 leading-relaxed">{h.marketQuestion}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-bold ${isProfit ? "text-yes" : "text-no"}`}>
                            {isProfit ? "+" : ""}${pnl.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                          </p>
                          <p className={`text-xs font-bold ${isProfit ? "text-yes" : "text-no"}`}>
                            {isProfit ? "+" : ""}{((pnl / Math.max(h.invested, 1)) * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { k: "Invested", v: `$${h.invested.toLocaleString()}` },
                          { k: "Current",  v: `$${h.currentValue.toLocaleString()}` },
                          { k: "Shares",   v: h.shares.toFixed(2) },
                        ].map((s) => (
                          <div key={s.k} className="bg-white/3 border border-white/3 rounded-xl py-2.5 px-3 flex flex-col">
                            <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-widest mb-1">{s.k}</p>
                            <p className="font-bold text-white text-xs">{s.v}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-center mt-4">
                        <div className="w-8 h-1 bg-white/5 rounded-full" />
                      </div>
                    </div>

                    {expanded === key && (
                      <div className="px-5 pb-5 border-t border-white/5 pt-5 animate-in slide-in-from-top-2 duration-300">
                        <BitsButton
                          variant="no"
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); closePosition(h.marketId, h.type); setExpanded(null); }}
                          className="w-full h-10 rounded-xl"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Close Position
                        </BitsButton>
                      </div>
                    )}
                  </BitsCard>
                );
              })}
            </div>
          )
        ) : settled.length === 0 ? (
          <BitsCard className="border-white/5 bg-white/2">
            <EmptyState
              icon={Trophy}
              title="No settled markets yet"
              description="Once a market you traded resolves, it'll show up here with the result and your realized P&L."
            />
          </BitsCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {settled.map((h) => {
              const won = h.winningOutcome === h.type;
              // Payout = 1 USDC per winning share at resolution. For lost
              // positions, payout is zero. `h.shares` may have been
              // decremented by the synthetic SELL — use invested as the
              // floor reference for what the position cost.
              const payout = won
                ? positionPayoutFromInvestedShares(h)
                : 0;
              const pnl = payout - h.invested;
              const key = `${h.marketId}-${h.type}`;
              const claimingThis = claiming === key;
              return (
                <BitsCard key={key} className="border-white/5 flex flex-col">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider ${h.type === "YES" ? "bg-yes/10 text-yes" : "bg-no/10 text-no"}`}>
                            {h.type}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-[4px] uppercase tracking-wider inline-flex items-center gap-1 ${
                              won
                                ? "bg-yes/15 text-yes"
                                : "bg-white/5 text-muted-foreground"
                            }`}
                          >
                            {won ? (
                              <>
                                <Trophy className="w-3 h-3" /> Won
                              </>
                            ) : (
                              "Lost"
                            )}
                          </span>
                        </div>
                        <p className="text-15px font-semibold text-white mt-3 line-clamp-2 leading-relaxed">
                          {h.marketQuestion}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold ${pnl >= 0 ? "text-yes" : "text-no"}`}>
                          {pnl >= 0 ? "+" : ""}${pnl.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Realized
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { k: "Invested", v: `$${h.invested.toLocaleString("en-US", { maximumFractionDigits: 2 })}` },
                        { k: "Payout",   v: `$${payout.toLocaleString("en-US", { maximumFractionDigits: 2 })}` },
                        { k: "Outcome",  v: h.winningOutcome ?? "—" },
                      ].map((s) => (
                        <div key={s.k} className="bg-white/3 border border-white/3 rounded-xl py-2.5 px-3 flex flex-col">
                          <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-widest mb-1">{s.k}</p>
                          <p className="font-bold text-white text-xs">{s.v}</p>
                        </div>
                      ))}
                    </div>

                    {won ? (
                      <button
                        type="button"
                        onClick={() => handleClaim(h)}
                        disabled={claimingThis}
                        className="w-full h-10 rounded-xl bg-yes/15 hover:bg-yes/25 border border-yes/30 text-yes text-xs font-black uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {claimingThis ? (
                          "Checking…"
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            Confirm payout · ${payout.toFixed(2)}
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full h-10 rounded-xl bg-white/3 border border-white/5 text-muted-foreground text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        Settled — no payout
                      </div>
                    )}
                  </div>
                </BitsCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Trade History */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" /> Trade History
          <span className="text-muted-foreground font-normal">({myTrades.length})</span>
        </h2>
        {myTrades.length === 0 ? (
          <BitsCard className="border-white/5 bg-white/2">
            <EmptyState
              icon={History}
              title="No trades yet"
              description="Your trade history will appear here once you place your first order."
            />
          </BitsCard>
        ) : (
          <BitsTable headers={["Market", "Type", "Amount", "Shares"]}>
            {myTrades.map(trade => (
              <BitsTableRow key={trade.id}>
                <BitsTableCell>
                  <p className="font-bold text-white line-clamp-1">{trade.marketQuestion}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {new Date(trade.timestamp).toLocaleDateString("en-US", { day: '2-digit', month: 'short' })}
                  </p>
                </BitsTableCell>
                <BitsTableCell align="center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${trade.type === "YES" ? "bg-yes/10 text-yes" : "bg-no/10 text-no"}`}>
                    {trade.type}
                  </span>
                </BitsTableCell>
                <BitsTableCell align="right" className="font-bold">${trade.amount.toLocaleString()}</BitsTableCell>
                <BitsTableCell align="right" className="text-muted-foreground font-bold">{trade.shares.toFixed(2)}</BitsTableCell>
              </BitsTableRow>
            ))}
          </BitsTable>
        )}
      </div>
    </div>
  );
}

/**
 * Reconstruct the payout that was credited at resolution time. The
 * resolver writes a synthetic SELL @ 1.0 USDC for the full position
 * size, so the original BUY count is what we want — `h.invested`
 * tracks BUY-amount and `h.shares` reflects the (post-SELL) net.
 * Total winning shares ≈ invested-derived shares before settlement.
 */
function positionPayoutFromInvestedShares(h: Holding): number {
  // If the position still shows positive shares (no SELL yet recorded),
  // payout is just shares × 1. Otherwise approximate with invested
  // (each share originally cost ≤ 1 USDC, so payout ≥ invested for a
  // winner).
  if (h.shares > 0) return h.shares;
  return h.invested;
}
