"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { TrendingUp, BarChart2, MessageSquare, Sparkles, ChevronDown } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { TradeModal } from "@/components/TradeModal";
import { Sparkline } from "@/components/ui/Sparkline";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Comments } from "@/components/social/Comments";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";

interface MarketCardProps {
  id?: string;
  title: string;
  category: string;
  volume: string;
  yesPrice: number;
  noPrice: number;
  image?: string;
}

export function MarketCard({ id = "sample", title, category, volume, yesPrice, noPrice, image }: MarketCardProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [isExpanded, setIsExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [tradeType, setTradeType] = useState<"YES" | "NO">("YES");
  
  const controls = useAnimation();

  const mockMarket: any = {
    id, question: title, category,
    yesShares: yesPrice, noShares: noPrice, status: "OPEN"
  };

  const trendData = useMemo(() => Array.from({ length: 40 }, () => Math.random() * 100), []);
  const chartColor = yesPrice > noPrice ? "#10b981" : "#ef4444";

  const handleDragEnd = (e: any, info: any) => {
    const { offset, velocity } = info;
    if (offset.x > 100 || velocity.x > 500) { setTradeType("YES"); setModalOpen(true); }
    else if (offset.x < -100 || velocity.x < -500) { setTradeType("NO"); setModalOpen(true); }
    controls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
  };

  const handleCardClick = () => {
    if (isDesktop || isTablet) setIsExpanded(!isExpanded);
    else { setTradeType("YES"); setModalOpen(true); }
  };

  const handleButtonClick = (e: React.MouseEvent, type: "YES" | "NO") => {
    e.stopPropagation();
    setTradeType(type);
    setModalOpen(true);
  };

  return (
    <>
      <BitsCard
        hover
        className="p-5 flex flex-col h-full group"
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {image && (
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/5 border border-white/5 shrink-0">
                <img src={image} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <div>
              <span className="text-[11px] font-bold text-muted-foreground tracking-[0.08em] uppercase block mb-0.5">
                {category}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40">
                <TrendingUp className="w-3 h-3" />
                <span>{volume}</span>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-15px md:text-16px font-semibold text-white leading-snug mb-6 flex-1">
          {title}
        </h3>

        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/5">
          <BitsButton
            variant="yes"
            onClick={(e) => handleButtonClick(e, "YES")}
            className="flex-1 justify-between h-9 px-4 rounded-xl"
          >
            <span>Yes</span><span>{yesPrice}¢</span>
          </BitsButton>
          <BitsButton
            variant="no"
            onClick={(e) => handleButtonClick(e, "NO")}
            className="flex-1 justify-between h-9 px-4 rounded-xl"
          >
            <span>No</span><span>{noPrice}¢</span>
          </BitsButton>
        </div>

        {isMobile && !isExpanded && (
          <div className="mt-3 flex justify-center text-[10px] font-bold text-white/20 uppercase tracking-widest">
            Tap to expand chart
          </div>
        )}

          {/* Expandable Chart (Tablet/Desktop) */}
          <AnimatePresence>
            {(isDesktop || isTablet) && isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: "120px", opacity: 1, marginTop: 16 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                className="border-t border-white/10 pt-4 overflow-hidden relative"
              >
                <div className="absolute inset-0 pt-4 pb-2 px-1">
                  <Sparkline data={trendData} color={chartColor} strokeWidth={2} fillOpacity={0.15} />
                </div>
                <div className="absolute top-4 left-2 flex items-center gap-1 text-xs text-muted-foreground opacity-50">
                  <BarChart2 className="w-3.5 h-3.5" /><span>24h Trend</span>
                </div>
              </motion.div>
            )}

            {/* Collapsible AI Insights (Mobile) */}
            {isMobile && (
              <div className="mt-3 border-t border-white/5 pt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setAiExpanded(!aiExpanded); }}
                  className="flex items-center justify-between w-full text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-2 rounded-lg hover:bg-indigo-500/20 transition-colors"
                >
                  <div className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Insight</div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${aiExpanded ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {aiExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 pb-1 px-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Prediction</span>
                          <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded">68% YES</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Based on sentiment analysis and historical data matching this trend, there is strong momentum supporting the YES outcome over the next 48h.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
      </BitsCard>

      {isMobile && (
        <BottomSheet isOpen={commentsOpen} onClose={() => setCommentsOpen(false)} title="Market Discussion">
          <Comments />
        </BottomSheet>
      )}

      {modalOpen && (
        <TradeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          market={mockMarket}
          initialType={tradeType}
        />
      )}
    </>
  );
}
