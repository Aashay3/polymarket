"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, PieChart, History, ChevronDown, X, Wallet, Activity } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { useWallet } from "@/app/context/WalletContext";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsTable, BitsTableRow, BitsTableCell } from "@/components/ui/bits/BitsTable";

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
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">Manage your active positions and review trade performance</p>
      </div>

      {/* Hero balance card */}
      <BitsCard className="p-8 lg:p-10 relative overflow-hidden">
        {/* Subtle Gradient Hint */}
        <div className="absolute inset-0 bg-linear-135 from-primary/10 to-transparent opacity-40 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          <div>
            <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Total Portfolio Value</p>
            <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            <div className="flex items-center gap-3 mt-4">
              <span className={`flex items-center gap-1 text-sm font-bold ${isUp ? "text-yes" : "text-no"}`}>
                {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isUp ? "+" : ""}₹{Math.abs(totalPnL).toLocaleString("en-IN")}
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

      {/* Active Positions */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-muted-foreground" /> Active Positions
          <span className="text-muted-foreground font-normal">({holdings.length})</span>
        </h2>

        {holdings.length === 0 ? (
          <BitsCard className="p-10 text-center text-muted-foreground text-sm border-white/5 bg-white/2">
            No active positions. Buy YES or NO to get started.
          </BitsCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {holdings.map(h => {
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
                          {isProfit ? "+" : ""}₹{pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </p>
                        <p className={`text-xs font-bold ${isProfit ? "text-yes" : "text-no"}`}>
                          {isProfit ? "+" : ""}{((pnl / h.invested) * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {[{ k: "Invested", v: `₹${h.invested.toLocaleString()}` }, { k: "Current", v: `₹${h.currentValue.toLocaleString()}` }, { k: "Shares", v: h.shares.toLocaleString() }].map(s => (
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
        )}
      </div>

      {/* Trade History */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" /> Trade History
          <span className="text-muted-foreground font-normal">({myTrades.length})</span>
        </h2>
        <BitsTable headers={["Market", "Type", "Amount", "Shares"]}>
          {myTrades.map(trade => (
            <BitsTableRow key={trade.id}>
              <BitsTableCell>
                <p className="font-bold text-white line-clamp-1">{trade.marketQuestion}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  {new Date(trade.timestamp).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                </p>
              </BitsTableCell>
              <BitsTableCell align="center">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${trade.type === "YES" ? "bg-yes/10 text-yes" : "bg-no/10 text-no"}`}>
                  {trade.type}
                </span>
              </BitsTableCell>
              <BitsTableCell align="right" className="font-bold">₹{trade.amount.toLocaleString()}</BitsTableCell>
              <BitsTableCell align="right" className="text-muted-foreground font-bold">{trade.shares.toFixed(2)}</BitsTableCell>
            </BitsTableRow>
          ))}
        </BitsTable>
      </div>
    </div>
  );
}
