"use client";

import { useState } from "react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsInput } from "@/components/ui/bits/BitsInput";
import { Wallet, Info, ArrowUpRight } from "lucide-react";

interface TradeBoxProps {
  selectedOutcome: string;
  onTrade: (amount: number, type: "YES" | "NO") => void;
}

export function TradeBox({ selectedOutcome, onTrade }: TradeBoxProps) {
  const [tradeType, setTradeType] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState<string>("");

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  return (
    <BitsCard className="bg-[#121217] border-white/10 p-5 sticky top-[100px] shadow-2xl">
      <div className="space-y-6">
        {/* Toggle YES/NO */}
        <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
          <button
            onClick={() => setTradeType("YES")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              tradeType === "YES" 
                ? "bg-yes text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]" 
                : "text-muted-foreground hover:text-white"
            }`}
          >
            BUY YES
          </button>
          <button
            onClick={() => setTradeType("NO")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
              tradeType === "NO" 
                ? "bg-no text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]" 
                : "text-muted-foreground hover:text-white"
            }`}
          >
            BUY NO
          </button>
        </div>

        {/* Selected Outcome Info */}
        <div className="space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1">Selected Outcome</span>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <p className="text-xs font-bold text-white line-clamp-1">{selectedOutcome || "Select an outcome..."}</p>
            </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-4">
          <BitsInput
            label="Investment Amount"
            placeholder="0.00"
            suffix="USD"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          
          <div className="grid grid-cols-3 gap-2">
            {[10, 50, 100].map((val) => (
              <button
                key={val}
                onClick={() => handleQuickAmount(val)}
                className="py-2 bg-white/5 border border-white/5 rounded-lg text-[10px] font-bold text-white/60 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
              >
                ${val}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/5 text-[11px] font-bold">
            <div className="flex justify-between items-center text-muted-foreground">
                <span>Avg. Price</span>
                <span className="text-white">0.42¢</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
                <span>Shares Purchased</span>
                <span className="text-white">0.00</span>
            </div>
            <div className="border-t border-white/5 pt-3 flex justify-between items-center text-muted-foreground">
                <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Est. Return</span>
                <span className="text-yes">+$0.00 (0%)</span>
            </div>
        </div>

        {/* Action Button */}
        <BitsButton 
            variant="primary" 
            className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs group"
            onClick={() => onTrade(Number(amount), tradeType)}
        >
            Execute Trade
            <ArrowUpRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </BitsButton>

        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <Info className="w-3.5 h-3.5" /> 0.5% Trading Fee Applies
        </div>
      </div>
    </BitsCard>
  );
}
