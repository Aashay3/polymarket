"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight, Flame, Clock, Activity } from "lucide-react";
import { MarketCard } from "@/components/markets/MarketCard";
import { MultiOutcomeCard } from "@/components/markets/MultiOutcomeCard";
import { LeaderboardSection } from "@/components/home/LeaderboardSection";
import { Footer } from "@/components/layout/Footer";
import { SearchModal } from "@/components/SearchModal";
import { motion } from "framer-motion";
import { BitsTabs } from "@/components/ui/bits/BitsTabs";

const CATEGORIES = ["All", "Crypto", "Sports", "Politics", "Tech", "Economy"];

// Grouped dummy data
const SECTIONS = [
  {
    title: "Trending Now",
    icon: <Flame className="w-5 h-5 text-orange-500" />,
    markets: [
      { id: "1", question: "Will Bitcoin hit $100k before December?", yesProb: 42, noProb: 58, volume: "$4.5M", image: "/crypto.png", category: "Crypto" },
      { id: "2", question: "Will SpaceX land on Mars by 2026?", yesProb: 12, noProb: 88, volume: "$890K", image: "/space.png", category: "Science" },
      { id: "3", question: "US GDP growth > 2.5% in 2026?", yesProb: 55, noProb: 45, volume: "$1.8M", image: "/economy.png", category: "Economy" },
      { id: "4", question: "Will ETH flip BTC in market cap by 2028?", yesProb: 25, noProb: 75, volume: "$2.1M", image: "/crypto.png", category: "Crypto" }
    ]
  },
  {
    title: "Ending Soon",
    icon: <Clock className="w-5 h-5 text-blue-500" />,
    markets: [
      { id: "5", question: "Will the Fed cut rates in the next meeting?", yesProb: 65, noProb: 35, volume: "$5.4M", image: "/economy.png", category: "Economy" },
      { id: "6", question: "Who will win the NBA Finals?", yesProb: 40, noProb: 60, volume: "$3.2M", image: "/space.png", category: "Sports" },
      { id: "7", question: "Will OpenAI release GPT-5 this year?", yesProb: 80, noProb: 20, volume: "$6.1M", image: "/crypto.png", category: "Tech" },
      { id: "8", question: "Will crude oil hit $100/bbl before June?", yesProb: 30, noProb: 70, volume: "$1.1M", image: "/economy.png", category: "Commodities" }
    ]
  },
  {
    title: "High Volume",
    icon: <Activity className="w-5 h-5 text-green-500" />,
    markets: [
      { id: "9", question: "Will Apple announce a new AR headset?", yesProb: 50, noProb: 50, volume: "$10.5M", image: "/space.png", category: "Tech" },
      { id: "10", question: "US Presidential Election Winner?", yesProb: 48, noProb: 52, volume: "$20.4M", image: "/politics.png", category: "Politics" },
      { id: "11", question: "Will Solana flip Ethereum?", yesProb: 15, noProb: 85, volume: "$8.9M", image: "/crypto.png", category: "Crypto" },
      { id: "12", question: "Will Amazon split its stock in 2026?", yesProb: 35, noProb: 65, volume: "$4.2M", image: "/economy.png", category: "Finance" }
    ]
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("All");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const filteredSections = SECTIONS
    .map(section => ({
      ...section,
      markets: activeTab === "All"
        ? section.markets
        : section.markets.filter(m => m.category === activeTab),
    }))
    .filter(section => section.markets.length > 0);

  return (
    <>
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">

      {/* Search - Mobile/Tablet Only */}
      <div className="space-y-4 md:hidden">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="relative w-full bg-[#121217] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-neutral-500 text-left hover:border-white/10 transition-colors"
          aria-label="Open search"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          Search markets…
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Active Markets</h1>
        
        {/* Categories Tabs */}
        <BitsTabs 
          tabs={CATEGORIES.map(c => ({ id: c, label: c }))} 
          activeTab={activeTab} 
          onChange={setActiveTab} 
        />
      </div>

      {/* Featured Multi-Outcome Market */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" /> Featured Event
        </h2>
        <MultiOutcomeCard 
          id="us-forces-iran"
          title="When will US Forces enter Iran?"
          category="Geopolitics"
          volume="$2.4M"
          description="This market resolves to the date when any official branch of the United States Armed Forces enters the sovereign territory of the Islamic Republic of Iran for the purpose of military engagement, as confirmed by the DoD or White House."
          rules="Resolution requires official confirmation from the US Department of Defense or the White House. Cyber operations, non-combatant evacuations, or unauthorized incursions do not count towards resolution."
          outcomes={[
            { id: "o1", label: "By March 31, 2026", probability: 12 },
            { id: "o2", label: "By June 30, 2026", probability: 28 },
            { id: "o3", label: "By September 30, 2026", probability: 45 },
            { id: "o4", label: "By December 31, 2026", probability: 68 },
            { id: "o5", label: "Not in 2026", probability: 32 }
          ]}
          relatedMarkets={[
            { id: "r1", title: "Will Iran retaliate against US sanctions?", probability: 74 },
            { id: "r2", title: "Will global oil prices exceed $110/bbl?", probability: 56 },
            { id: "r3", title: "Will Israel launch preemptive strikes?", probability: 31 }
          ]}
        />
      </section>

      {/* Feed Sections */}
      <div className="space-y-8 md:space-y-12">
        {filteredSections.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-sm font-medium">No markets in {activeTab}.</p>
            <button
              onClick={() => setActiveTab("All")}
              className="mt-3 text-xs font-bold text-primary hover:underline uppercase tracking-wider"
            >
              Show all categories
            </button>
          </div>
        )}
        {filteredSections.map((section, sIdx) => (
          <div key={section.title} className="space-y-4 mt-8 first:mt-0">

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {section.icon}
                {section.title}
              </h2>
              <Link
                href="/trending"
                className="text-xs font-semibold text-muted-foreground hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider"
              >
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 
              Responsive Layout:
              - Mobile (< 640px): Vertical stack (`flex-col`)
              - Tablet (640px - 1024px): Horizontal scroll carousel (`overflow-x-auto snap-x`)
              - Desktop (> 1024px): Multi-column Grid (`grid-cols-3` or `grid-cols-4`)
            */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.1, duration: 0.4 }}
              className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            >
              {section.markets.map((market) => (
                <div 
                  key={market.id} 
                  className="sm:min-w-[320px] sm:snap-center sm:max-w-sm lg:min-w-0 lg:max-w-none"
                >
                  <MarketCard
                    id={market.id}
                    title={market.question}
                    category={market.category}
                    volume={market.volume}
                    yesPrice={market.yesProb}
                    noPrice={market.noProb}
                    image={market.image}
                  />
                </div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>

      </div>

      <LeaderboardSection />
      <Footer />

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
