"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Info, Shield, MessageSquare, TrendingUp, ArrowRight } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";

interface Outcome {
  id: string;
  label: string;
  probability: number;
}

interface RelatedMarket {
  id: string;
  title: string;
  probability: number;
}

interface MultiOutcomeCardProps {
  id?: string;
  title: string;
  outcomes: Outcome[];
  description: string;
  rules: string;
  relatedMarkets: RelatedMarket[];
  category?: string;
  volume?: string;
}

export function MultiOutcomeCard({
  id = "featured",
  title,
  outcomes,
  description,
  rules,
  relatedMarkets,
  category = "Politics",
  volume = "$1.2M",
}: MultiOutcomeCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleOutcomes = isExpanded ? outcomes : outcomes.slice(0, 2);
  const hasMore = outcomes.length > 2;

  const handleCardClick = () => {
    router.push(`/market/${id}`);
  };

  const handleTradeClick = (e: React.MouseEvent, outcomeId: string, type: "YES" | "NO") => {
    e.stopPropagation();
    router.push(`/market/${id}?outcome=${outcomeId}&trade=${type}`);
  };

  return (
    <BitsCard 
      hover 
      className="bg-[#121217] border-white/5 overflow-hidden transition-all duration-300 cursor-pointer active:scale-[0.99]"
      onClick={handleCardClick}
    >
      <div className="p-5 lg:p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{category}</span>
            <div className="flex items-center gap-2 text-[10px] font-bold text-white/40">
              <TrendingUp className="w-3 h-3" />
              <span>{volume} Vol.</span>
            </div>
          </div>
        </div>

        <h3 className="text-16px md:text-17px font-bold text-white leading-tight mb-6 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Outcome Rows */}
        <div className="space-y-2">
          {visibleOutcomes.map((outcome) => (
            <div 
              key={outcome.id} 
              className="group/row flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-14px font-semibold text-white/90">{outcome.label}</span>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
                <span className="text-xs font-bold text-muted-foreground mr-1">{outcome.probability}%</span>
                <div className="flex items-center gap-1.5">
                  <BitsButton 
                    variant="yes" 
                    className="h-8 px-4 text-[11px] rounded-lg min-w-[64px]"
                    onClick={(e) => handleTradeClick(e, outcome.id, "YES")}
                  >
                    Yes {outcome.probability}¢
                  </BitsButton>
                  <BitsButton 
                    variant="no" 
                    className="h-8 px-4 text-[11px] rounded-lg min-w-[64px]"
                    onClick={(e) => handleTradeClick(e, outcome.id, "NO")}
                  >
                    No {100 - outcome.probability}¢
                  </BitsButton>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Expand Toggle */}
        {hasMore && (
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-[11px] font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest"
          >
            {isExpanded ? "Show Less" : `Show ${outcomes.length - 2} More Outcomes`}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
    </BitsCard>
  );
}
