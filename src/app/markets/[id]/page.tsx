"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { MarketDetailHeader } from "@/components/markets/detail/MarketDetailHeader";
import { OutcomeList } from "@/components/markets/detail/OutcomeList";
import { TradeBox } from "@/components/markets/detail/TradeBox";
import { MarketTabs } from "@/components/markets/detail/MarketTabs";
import { SocialSection } from "@/components/markets/detail/SocialSection";
import { RightSidebar } from "@/components/markets/detail/RightSidebar";
import { BitsAccordion } from "@/components/ui/bits/BitsAccordion";
import { HelpCircle } from "lucide-react";

// Mock Data
const MARKET_DATA = {
  id: "m1",
  title: "Will the Federal Reserve cut interest rates in Q4 2026?",
  category: "Economy",
  volume: "$14.2M",
  image: "/economy.png",
  description: "This market focuses on the Federal Open Market Committee (FOMC) meetings scheduled for November and December 2026. A 'cut' is defined as a reduction in the target range for the federal funds rate of at least 25 basis points from its level as of October 1, 2026.",
  rules: "Resolution will be based on the official statement released by the Federal Reserve after each meeting. If multiple cuts occur, the market resolves to the earliest date. Emergency cuts outside scheduled meetings also qualify if they occur within the Q4 window.",
  outcomes: [
    { id: "o1", label: "No Rate Cut in Q4", probability: 35, volume: "$2.1M" },
    { id: "o2", label: "25 bps Cut", probability: 48, volume: "$8.4M" },
    { id: "o3", label: "50+ bps Cut", probability: 17, volume: "$3.7M" },
  ],
  faqs: [
    { id: "f1", title: "What happens if rates are raised instead?", content: "The market will resolve to 'No Rate Cut in Q4' as a rate hike does not meet the specified criteria for a reduction." },
    { id: "f2", title: "When does this market officially close?", content: "Trading will be suspended exactly 5 minutes before the first FOMC statement release in November 2026, or immediately upon a pre-emptive cut." },
    { id: "f3", title: "Where can I find the official source?", content: "Official statements are published on the Federal Reserve's website (federalreserve.gov) under the 'Monetary Policy' section." },
  ]
};

export default function MarketDetailPage() {
  const params = useParams();
  const [selectedOutcome, setSelectedOutcome] = useState(MARKET_DATA.outcomes[1]); // Default to 25bps

  const handleTrade = (amount: number, type: "YES" | "NO") => {
    console.log(`Executing ${type} trade of $${amount} on ${selectedOutcome.label}`);
    alert(`Order Placed: ${type} $${amount} on "${selectedOutcome.label}"`);
  };

  const handleOutcomeSelect = (outcome: any) => {
    setSelectedOutcome(outcome);
    // On desktop, we could scroll to the trade box or just update it
  };

  return (
    <div className="max-container pt-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px_260px] gap-10 items-start">
        
        {/* Main Column (60%) */}
        <div className="space-y-12 lg:pr-4">
          <MarketDetailHeader 
            title={MARKET_DATA.title}
            category={MARKET_DATA.category}
            volume={MARKET_DATA.volume}
            image={MARKET_DATA.image}
          />

          <section className="space-y-6">
            <h2 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                Outcome Options
            </h2>
            <OutcomeList 
                outcomes={MARKET_DATA.outcomes} 
                onTrade={(outcome) => handleOutcomeSelect(outcome)}
            />
          </section>

          <section>
             <MarketTabs 
                description={MARKET_DATA.description} 
                rules={MARKET_DATA.rules} 
             />
          </section>

          <section className="pt-8 border-t border-white/5 space-y-6">
            <h2 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Frequently Asked Questions
            </h2>
            <BitsAccordion items={MARKET_DATA.faqs} />
          </section>

          <section className="pt-8 border-t border-white/5">
            <SocialSection />
          </section>
        </div>

        {/* Center Panel (Trade Box - 25%) */}
        <aside className="lg:border-l border-white/5 lg:pl-10 h-full">
            <TradeBox 
                selectedOutcome={selectedOutcome.label} 
                onTrade={handleTrade}
            />
        </aside>

        {/* Right Panel (Insights - 15%) */}
        <aside className="hidden xl:block h-full border-l border-white/5 pl-10">
            <RightSidebar />
        </aside>

      </div>
    </div>
  );
}
