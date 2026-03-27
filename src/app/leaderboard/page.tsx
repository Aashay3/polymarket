"use client";

import { useEffect, useState } from "react";
import { Trophy, TrendingUp, Medal } from "lucide-react";
import { motion } from "framer-motion";

const LEADERBOARD_DATA = [
  { rank: 1, user: "0xAlphaMale", profit: "+$452,100", winRate: "68%" },
  { rank: 2, user: "CryptoKing99", profit: "+$128,450", winRate: "72%" },
  { rank: 3, user: "PredictionPro", profit: "+$89,200", winRate: "59%" },
  { rank: 4, user: "0xWhaleTracker", profit: "+$64,100", winRate: "61%" },
  { rank: 5, user: "DefiDegen", profit: "+$42,800", winRate: "54%" },
];

export default function LeaderboardPage() {
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
          <Trophy className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Top Traders</h1>
          <p className="text-sm text-muted-foreground">Highest accumulated profits this month</p>
        </div>
      </div>

      <div className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-white/5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
          <div className="col-span-2 text-center">Rank</div>
          <div className="col-span-5">Trader</div>
          <div className="col-span-3 text-right">Profit</div>
          <div className="col-span-2 text-right">Win %</div>
        </div>
        
        <div className="divide-y divide-white/5">
          {LEADERBOARD_DATA.map((trader, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={trader.user} 
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="col-span-2 flex justify-center">
                {trader.rank === 1 ? <Medal className="w-6 h-6 text-yellow-400" /> :
                 trader.rank === 2 ? <Medal className="w-6 h-6 text-slate-300" /> :
                 trader.rank === 3 ? <Medal className="w-6 h-6 text-amber-600" /> :
                 <span className="font-bold text-muted-foreground">#{trader.rank}</span>}
              </div>
              <div className="col-span-5 font-bold font-mono text-sm">{trader.user}</div>
              <div className="col-span-3 text-right font-mono font-bold text-green-500">{trader.profit}</div>
              <div className="col-span-2 text-right text-sm text-foreground/80">{trader.winRate}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
