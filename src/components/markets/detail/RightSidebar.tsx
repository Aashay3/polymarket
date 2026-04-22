"use client";

import Link from "next/link";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { Sparkles, Activity, PieChart, ArrowUpRight } from "lucide-react";
import { BitsProgress } from "@/components/ui/bits/BitsProgress";

export function RightSidebar() {
  const liveTrades = [
    { id: "1", type: "YES", amount: "$1.2K", time: "12s ago" },
    { id: "2", type: "NO", amount: "$450", time: "45s ago" },
    { id: "3", type: "YES", amount: "$3.8K", time: "1m ago" },
  ];

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <BitsCard className="p-5 border-indigo-500/10 bg-indigo-500/2">
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" /> AI Analysis
        </h3>
        <p className="text-xs text-neutral-300 leading-relaxed font-medium italic">
          &ldquo;Based on recent volatility and sentiment shifts, the market is currently overpricing the NO outcome by approximately 8.4%.&rdquo;
        </p>
        <div className="mt-5 pt-4 border-t border-indigo-500/20 flex justify-between items-center">
            <span className="text-[10px] font-bold text-indigo-400/60 uppercase">Confidence</span>
            <span className="text-xs font-black text-white">82%</span>
        </div>
      </BitsCard>

      {/* Live Trades */}
      <BitsCard className="p-5">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
          <Activity className="w-4 h-4 text-primary" /> Live Trades
        </h3>
        <div className="space-y-4">
          {liveTrades.map(trade => (
            <div key={trade.id} className="flex justify-between items-center group">
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full ${trade.type === "YES" ? "bg-yes" : "bg-no"}`} />
                <div>
                  <p className="text-[11px] font-black text-white">{trade.amount}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-bold uppercase">{trade.type}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground/40">{trade.time}</span>
            </div>
          ))}
        </div>
        <Link
          href="/dashboard/activity"
          className="block text-center w-full mt-6 py-2 text-[10px] font-black text-muted-foreground hover:text-white transition-colors uppercase tracking-[0.1em] border-t border-white/5 pt-4"
        >
          View All Trades
        </Link>
      </BitsCard>

      {/* Sentiment */}
      <BitsCard className="p-5">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
          <PieChart className="w-4 h-4 text-blue-400" /> Sentiment
        </h3>
        <div className="space-y-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs font-bold text-white tracking-tight">Bullish (YES)</p>
              <p className="text-[10px] text-yes font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> +12% today
              </p>
            </div>
            <span className="text-sm font-black text-white">64%</span>
          </div>
          <BitsProgress value={64} color="bg-yes" />
          
          <div className="pt-2">
            <div className="flex justify-between items-end mb-2">
              <p className="text-xs font-bold text-white tracking-tight">Bearish (NO)</p>
              <span className="text-sm font-black text-white">36%</span>
            </div>
            <BitsProgress value={36} color="bg-no" />
          </div>
        </div>
      </BitsCard>
    </div>
  );
}
