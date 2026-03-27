"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, PieChart, History, ChevronDown, X, Wallet, Activity } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { useWallet } from "@/app/context/WalletContext";

const PORTFOLIO_SPARK = [820, 910, 870, 950, 890, 1050, 980, 1120, 1080, 1220, 1180, 1284];

export default function PortfolioPage() {
  const { myTrades, markets, balance } = useWallet();
  const [expanded, setExpanded] = useState<string | null>(null);

  const holdingsMap = new Map<string, any>();
  myTrades.forEach(trade => {
    const key = `${trade.marketId}-${trade.type}`;
    if (!holdingsMap.has(key)) {
      holdingsMap.set(key, { marketId: trade.marketId, marketQuestion: trade.marketQuestion, type: trade.type, shares: 0, invested: 0, currentValue: 0, currentPrice: 0, avgBuyPrice: 0 });
    }
    const h = holdingsMap.get(key)!;
    h.shares += trade.shares;
    h.invested += trade.amount;
  });

  const holdings = Array.from(holdingsMap.values())
    .filter(h => markets.find(m => m.id === h.marketId)?.status === "OPEN")
    .map(h => {
      const market = markets.find(m => m.id === h.marketId);
      if (market) {
        const totalPool = market.yesShares + market.noShares;
        h.currentPrice = h.type === "YES" ? market.yesShares / totalPool : market.noShares / totalPool;
        h.currentValue = h.shares * h.currentPrice;
      }
      h.avgBuyPrice = h.invested / h.shares;
      return h;
    });

  const positionsValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalValue = balance + positionsValue;
  const totalPnL = totalValue - 1000;
  const isUp = totalPnL >= 0;

  const statCards = [
    { label: "Cash Balance",     value: `$${balance.toFixed(2)}`,          icon: <Wallet className="w-4 h-4" /> },
    { label: "Positions Value",  value: `$${positionsValue.toFixed(2)}`,   icon: <PieChart className="w-4 h-4" /> },
    { label: "Open Positions",   value: `${holdings.length}`,             icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-[1248px] mx-auto px-4 md:px-6 space-y-8 pb-10">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your positions and trade history</p>
      </div>

      {/* Hero balance card */}
      <div className="bg-[#121217] border border-white/6 rounded-[16px] p-8 lg:p-10 relative overflow-hidden">
        {/* Subtle Gradient Hint */}
        <div className="absolute inset-0 bg-linear-135 from-[#FF6A3D]/8 to-transparent opacity-40 pointer-events-none" />
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Portfolio Value</p>
            <p className="text-4xl font-bold text-white tracking-tight">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p className={`text-sm font-semibold mt-2 flex items-center gap-1 ${isUp ? "text-yes" : "text-no"}`}>
              {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUp ? "+" : ""}${Math.abs(totalPnL).toFixed(2)} all time
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${isUp ? "bg-yes/12 text-yes" : "bg-no/12 text-no"}`}>
            {isUp ? "+" : ""}{((totalPnL / 1000) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-24">
          <Sparkline data={PORTFOLIO_SPARK} color={isUp ? "#22C55E" : "#EF4444"} strokeWidth={2} fillOpacity={0.12} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        {statCards.map(s => (
          <div key={s.label} className="bg-[#121217] border border-white/6 rounded-[16px] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-muted-foreground">{s.icon}</span>
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Active Positions */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-muted-foreground" /> Active Positions
          <span className="text-muted-foreground font-normal">({holdings.length})</span>
        </h2>

        {holdings.length === 0 ? (
          <div className="bg-[#121217] border border-white/6 rounded-[16px] p-10 text-center text-muted-foreground text-sm">
            No active positions. Buy YES or NO to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {holdings.map(h => {
              const pnl = h.currentValue - h.invested;
              const isProfit = pnl >= 0;
              const key = `${h.marketId}-${h.type}`;
              return (
                <div key={key} className="bg-[#121217] border border-white/6 rounded-[16px] overflow-hidden">
                  <div className="p-5 cursor-pointer hover:bg-white/2 transition-colors" onClick={() => setExpanded(expanded === key ? null : key)}>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] mr-2 ${h.type === "YES" ? "bg-yes/10 text-yes" : "bg-no/10 text-no"}`}>
                          {h.type}
                        </span>
                        <p className="text-[15px] font-medium text-white mt-3 line-clamp-2 leading-snug">{h.marketQuestion}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-base font-bold ${isProfit ? "text-yes" : "text-no"}`}>
                          {isProfit ? "+" : ""}${pnl.toFixed(2)}
                        </p>
                        <p className={`text-xs font-medium ${isProfit ? "text-yes" : "text-no"}`}>
                          {isProfit ? "+" : ""}{((pnl / h.invested) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                      {[{ k: "Invested", v: `$${h.invested.toFixed(2)}` }, { k: "Current", v: `$${h.currentValue.toFixed(2)}` }, { k: "Shares", v: h.shares.toFixed(2) }].map(s => (
                        <div key={s.k} className="bg-white/2 border border-white/5 rounded-lg py-2">
                          <p className="text-muted-foreground text-[9px] uppercase tracking-wider mb-0.5">{s.k}</p>
                          <p className="font-bold text-white/90">{s.v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-end mt-4">
                      <ChevronDown className={`w-4 h-4 text-muted-foreground/50 transition-transform ${expanded === key ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                  {expanded === key && (
                    <div className="px-6 pb-6 border-t border-white/5 pt-5">
                      <button className={`w-full h-8 rounded-[8px] text-[11px] font-bold transition-all ${h.type === "YES" ? "bg-no/10 text-no hover:bg-no hover:text-white" : "bg-yes/10 text-yes hover:bg-yes hover:text-white"}`}>
                        <X className="w-3.5 h-3.5 inline mr-1.5" />Close Position
                      </button>
                    </div>
                  )}
                </div>
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
        <div className="bg-[#121217] border border-white/6 rounded-[16px] overflow-hidden">
          {myTrades.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground text-sm">No trades yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-white/6 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <div className="col-span-6">Market</div>
                <div className="col-span-2 text-center">Type</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-2 text-right">Shares</div>
              </div>
              <div className="divide-y divide-white/5">
                {myTrades.map(trade => (
                  <div key={trade.id} className="grid grid-cols-12 gap-2 px-5 py-3.5 hover:bg-white/2 transition-colors text-sm">
                    <div className="col-span-6">
                      <p className="font-medium text-white line-clamp-1">{trade.marketQuestion}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{new Date(trade.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${trade.type === "YES" ? "bg-yes/12 text-yes" : "bg-no/12 text-no"}`}>
                        {trade.type}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-mono text-white self-center">${trade.amount.toFixed(2)}</div>
                    <div className="col-span-2 text-right font-mono text-muted-foreground self-center">{trade.shares.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
