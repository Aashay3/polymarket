"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MarketDetailHeader } from "@/components/markets/detail/MarketDetailHeader";
import { OutcomeList } from "@/components/markets/detail/OutcomeList";
import { TradeBox } from "@/components/markets/detail/TradeBox";
import { MarketTabs } from "@/components/markets/detail/MarketTabs";
import { SocialSection } from "@/components/markets/detail/SocialSection";
import { RightSidebar } from "@/components/markets/detail/RightSidebar";
import { BitsAccordion } from "@/components/ui/bits/BitsAccordion";
import { Footer } from "@/components/layout/Footer";
import { HelpCircle, ArrowLeft } from "lucide-react";

// Mock Data - Representing a "Real" Market
const MARKET_DATA = {
  id: "fed-rate-cut-q4",
  title: "Will the Federal Reserve cut interest rates in Q4 2026?",
  category: "Economy",
  volume: "$14,203,892",
  image: "/economy.png",
  context: "This market focuses on the Federal Open Market Committee (FOMC) meetings scheduled for November and December 2026. A 'cut' is defined as a reduction in the target range for the federal funds rate of at least 25 basis points from its level as of October 1, 2026.",
  rules: "Resolution will be based on the official statement released by the Federal Reserve after each meeting. If multiple cuts occur, the market resolves to the earliest date. Emergency cuts outside scheduled meetings also qualify if they occur within the Q4 window.",
  outcomes: [
    { id: "o1", label: "No Rate Cut in Q4", probability: 35, volume: "$2,104,231" },
    { id: "o2", label: "25 bps Cut", probability: 48, volume: "$8,452,110" },
    { id: "o3", label: "50+ bps Cut", probability: 17, volume: "$3,647,551" },
  ],
  related: [
    { id: "r1", title: "US GDP Growth > 2.5% in 2026?", probability: 55 },
    { id: "r2", title: "Will the S&P 500 hit 6000 by YE 2026?", probability: 42 },
    { id: "r3", title: "Will the unemployment rate exceed 4.5%?", probability: 28 },
  ],
  faqs: [
    { id: "f1", title: "What happens if rates are raised instead?", content: "The market will resolve to 'No Rate Cut in Q4' as a rate hike does not meet the specified criteria for a reduction." },
    { id: "f2", title: "When does this market officially close?", content: "Trading will be suspended exactly 5 minutes before the first FOMC statement release in November 2026, or immediately upon a pre-emptive cut." },
    { id: "f3", title: "Where can I find the official source?", content: "Official statements are published on the Federal Reserve's website (federalreserve.gov) under the 'Monetary Policy' section." },
  ]
};

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [selectedOutcome, setSelectedOutcome] = useState(MARKET_DATA.outcomes[1]);

  const handleTrade = (amount: number, type: "YES" | "NO") => {
    console.log(`Executing ${type} trade of $${amount} on ${selectedOutcome.label}`);
    // Real logic would be integrated here
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Back Navigation */}
      <div className="max-container pt-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Markets
        </button>
      </div>

      <div className="max-container pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px_240px] gap-12 items-start">
          
          {/* LEFT: Main Content (60%) */}
          <div className="space-y-12">
            <MarketDetailHeader 
              title={MARKET_DATA.title}
              category={MARKET_DATA.category}
              volume={MARKET_DATA.volume}
              image={MARKET_DATA.image}
            />

            <section className="space-y-6">
              <h2 className="text-sm font-black text-white/30 uppercase tracking-[0.2em]">
                  Market Outcomes
              </h2>
              <OutcomeList 
                  outcomes={MARKET_DATA.outcomes} 
                  onTrade={(outcome) => setSelectedOutcome(outcome)}
              />
            </section>

            <section className="space-y-8 pt-8 border-t border-white/5">
               <MarketTabs 
                  description={MARKET_DATA.context} 
                  rules={MARKET_DATA.rules} 
               />
            </section>

            <section className="pt-12 border-t border-white/5 space-y-6">
              <h2 className="text-sm font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" /> Market FAQ
              </h2>
              <BitsAccordion items={MARKET_DATA.faqs} />
            </section>

            <section className="pt-12 border-t border-white/5">
              <SocialSection />
            </section>
          </div>

          {/* CENTER: Trading Panel (25%) */}
          <aside className="sticky top-24">
              <TradeBox 
                  selectedOutcome={selectedOutcome.label} 
                  onTrade={handleTrade}
              />
          </aside>

          {/* RIGHT: Related & Insights (15%) */}
          <aside className="hidden xl:block space-y-12">
              <div className="space-y-6">
                <h3 className="text-xs font-black text-white/30 uppercase tracking-[0.2em]">Related</h3>
                <div className="space-y-3">
                  {MARKET_DATA.related.map(m => (
                    <button 
                      key={m.id}
                      onClick={() => router.push(`/market/${m.id}`)}
                      className="w-full p-4 bg-white/2 border border-white/5 rounded-xl hover:border-white/10 transition-all text-left"
                    >
                      <p className="text-xs font-bold text-white mb-2 leading-relaxed">{m.title}</p>
                      <span className="text-xs font-black text-primary">{m.probability}%</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <RightSidebar />
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
