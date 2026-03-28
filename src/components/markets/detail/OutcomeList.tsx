"use client";

import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsProgress } from "@/components/ui/bits/BitsProgress";

interface Outcome {
  id: string;
  label: string;
  probability: number;
  volume: string;
}

interface OutcomeListProps {
  outcomes: Outcome[];
  onTrade: (outcome: Outcome, type: "YES" | "NO") => void;
}

export function OutcomeList({ outcomes, onTrade }: OutcomeListProps) {
  return (
    <div className="space-y-1">
      {/* Table Header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5 mb-2">
        <span>Outcome</span>
        <span className="w-[100px] text-center">Probability</span>
        <span className="w-[180px] text-right">Actions</span>
      </div>

      <div className="space-y-0.5">
        {outcomes.map((outcome) => (
          <div 
            key={outcome.id} 
            className="group grid grid-cols-[1fr_auto_auto] items-center gap-4 p-4 rounded-xl hover:bg-white/[0.02] transition-all duration-200 border border-transparent hover:border-white/5"
          >
            <div className="space-y-2.5">
              <span className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">
                {outcome.label}
              </span>
              <div className="flex items-center gap-3">
                <div className="w-32 hidden sm:block">
                  <BitsProgress value={outcome.probability} height={3} />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none">
                  {outcome.volume} Vol.
                </span>
              </div>
            </div>

            <div className="w-[100px] flex flex-col items-center">
              <span className="text-lg font-black text-white leading-none">
                {outcome.probability}%
              </span>
              <span className="text-[10px] font-bold text-yes/60 uppercase tracking-widest mt-1">YES</span>
            </div>

            <div className="w-[180px] flex items-center justify-end gap-2">
              <BitsButton 
                variant="yes" 
                onClick={() => onTrade(outcome, "YES")}
                className="h-9 px-5 text-[11px] rounded-lg min-w-[75px]"
              >
                Buy Yes
              </BitsButton>
              <BitsButton 
                variant="no" 
                onClick={() => onTrade(outcome, "NO")}
                className="h-9 px-5 text-[11px] rounded-lg min-w-[75px]"
              >
                Buy No
              </BitsButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
