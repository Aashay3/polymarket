"use client";

import { useState } from "react";
import { Trophy, TrendingUp, TrendingDown, User, Medal } from "lucide-react";

const LEADERBOARD_DATA = [
  { id: 1, name: "0xAlphaMale", profit: 452100, winRate: "68%", avatar: "" },
  { id: 2, name: "CryptoKing99", profit: 128450, winRate: "72%", avatar: "" },
  { id: 3, name: "PredictionPro", profit: 89200, winRate: "59%", avatar: "" },
  { id: 4, name: "0xWhaleTracker", profit: 64100, winRate: "61%", avatar: "" },
  { id: 5, name: "DefiDegen", profit: 42800, winRate: "54%", avatar: "" },
  { id: 6, name: "TraderJoe", profit: 38200, winRate: "64%", avatar: "" },
  { id: 7, name: "MarketMaker", profit: 31500, winRate: "57%", avatar: "" },
  { id: 8, name: "AlphaSeeker", profit: -12400, profitLabel: "-$12,400", winRate: "42%", avatar: "" },
];

export function LeaderboardSection() {
  const [timeframe, setTimeframe] = useState("Weekly");

  return (
    <section className="mt-12 py-12 bg-[#0F0F14]/50 border-y border-white/5">
      <div className="max-w-[1248px] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" /> Top Traders
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Leading participants by total profit</p>
          </div>

          <div className="flex bg-[#121217] p-1 rounded-xl border border-white/6 self-start md:self-center">
            {["Daily", "Weekly", "All-time"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  timeframe === t 
                    ? "bg-[#8B5CF6] text-white" 
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#121217] border border-white/6 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/6 bg-white/2">
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest w-24">Rank</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">User</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-right">Profit</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {LEADERBOARD_DATA.map((trader, idx) => {
                  const isPositive = trader.profit >= 0;
                  
                  return (
                    <tr 
                      key={trader.id} 
                      className={`group hover:bg-white/2 transition-colors relative h-14 ${
                        idx === 0 ? "bg-yellow-500/3" : 
                        idx === 1 ? "bg-slate-400/3" : 
                        idx === 2 ? "bg-amber-700/3" : ""
                      }`}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-sm">
                          {idx === 0 ? <Medal className="w-5 h-5 text-yellow-500" /> :
                           idx === 1 ? <Medal className="w-5 h-5 text-slate-400" /> :
                           idx === 2 ? <Medal className="w-5 h-5 text-amber-700" /> :
                           <span className="text-muted-foreground">#{trader.id}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">{trader.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className={`flex items-center justify-end gap-1.5 font-mono font-bold text-sm ${isPositive ? "text-yes" : "text-no"}`}>
                          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {isPositive ? "+" : ""}${Math.abs(trader.profit).toLocaleString("en-US")}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className="text-sm font-medium text-white/70">{trader.winRate}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
