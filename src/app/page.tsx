"use client";

import { useState } from "react";
import { Search, ChevronRight, Flame, Clock, Activity } from "lucide-react";
import { MarketCard } from "@/components/markets/MarketCard";
import { LeaderboardSection } from "@/components/home/LeaderboardSection";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";

const CATEGORIES = ["Trending", "Breaking", "New", "Sports", "Crypto", "Politics"];

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
  const [activeTab, setActiveTab] = useState("Trending");

  return (
    <>
    <div className="max-w-[1248px] mx-auto px-4 md:px-6 space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* Search - Mobile/Tablet Only */}
      <div className="space-y-4 md:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input 
            type="text" 
            placeholder="Search markets, politicians, crypto..." 
            className="w-full bg-accent border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-neutral-500 shadow-sm"
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Active Markets</h1>
      </div>

      {/* Categories Carousel */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveTab(category)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-sm ${
              activeTab === category 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-accent/50 text-muted-foreground hover:bg-accent hover:text-white'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Feed Sections */}
      <div className="space-y-8 md:space-y-12">
        {SECTIONS.map((section, sIdx) => (
          <div key={section.title} className="space-y-4 mt-8 first:mt-0">
            
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {section.icon}
                {section.title}
              </h2>
              <button className="text-xs font-semibold text-muted-foreground hover:text-white transition-colors flex items-center gap-1 uppercase tracking-wider">
                View All <ChevronRight className="w-3 h-3" />
              </button>
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
              className="
                flex flex-col gap-5 
                sm:flex-row sm:overflow-x-auto sm:snap-x sm:snap-mandatory sm:pb-4 sm:-mx-4 sm:px-4 
                lg:grid lg:grid-cols-3 lg:overflow-visible lg:snap-none lg:mx-0 lg:px-0
                scrollbar-hide
              "
            >
              {section.markets.map((market) => (
                <div 
                  key={market.id} 
                  className="sm:min-w-[320px] sm:snap-center sm:max-w-sm lg:min-w-0 lg:max-w-none"
                >
                  <MarketCard
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
    </>
  );
}
