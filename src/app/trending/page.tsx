"use client";

import { useState, useMemo } from "react";
import { Flame, TrendingUp, Clock, Search } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsTabs } from "@/components/ui/bits/BitsTabs";
import { Sparkline } from "@/components/ui/Sparkline";
import { TradeModal } from "@/components/TradeModal";
import { useWallet } from "@/app/context/WalletContext";

const CATEGORIES = ["All", "Crypto", "Sports", "Politics", "Tech", "Economy"];

const MARKETS = [
  { id: "t1", question: "Will Bitcoin exceed $100k before Dec 2025?", category: "Crypto",   yesProb: 42, volume: "$4.5M", tag: "trending", yesShares: 42, noShares: 58 },
  { id: "t2", question: "Will the Federal Reserve cut rates in Q3?",   category: "Economy",  yesProb: 71, volume: "$5.4M", tag: "ending",   yesShares: 71, noShares: 29 },
  { id: "t3", question: "Will OpenAI release GPT-5 this year?",        category: "Tech",     yesProb: 80, volume: "$6.1M", tag: "trending", yesShares: 80, noShares: 20 },
  { id: "t4", question: "Will SpaceX land on Mars by 2027?",           category: "Tech",     yesProb: 11, volume: "$890K", tag: "ending",   yesShares: 11, noShares: 89 },
  { id: "t5", question: "Who will win the 2026 NBA Championship?",     category: "Sports",   yesProb: 40, volume: "$3.2M", tag: "trending", yesShares: 40, noShares: 60 },
  { id: "t6", question: "Will Ethereum flip Bitcoin market cap?",       category: "Crypto",   yesProb: 25, volume: "$2.1M", tag: "trending", yesShares: 25, noShares: 75 },
  { id: "t7", question: "US GDP growth > 2.5% in 2026?",              category: "Economy",  yesProb: 55, volume: "$1.8M", tag: "ending",   yesShares: 55, noShares: 45 },
  { id: "t8", question: "Will Apple release an AR headset in 2025?",   category: "Tech",     yesProb: 50, volume: "$7.1M", tag: "trending", yesShares: 50, noShares: 50 },
  { id: "t9", question: "2026 Midterms: Democrats win the House?",     category: "Politics", yesProb: 48, volume: "$12.4M",tag: "trending", yesShares: 48, noShares: 52 },
];

function MarketCard({ market, onTrade }: { market: typeof MARKETS[0]; onTrade: (id: string, type: "YES" | "NO") => void }) {
  const spark = useMemo(() => Array.from({ length: 20 }, () => 20 + Math.random() * 60), []);
  const noProb = 100 - market.yesProb;

  return (
    <BitsCard hover className="p-5 flex flex-col h-full group" onClick={() => onTrade(market.id, "YES")}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <span className="text-[11px] font-bold text-muted-foreground tracking-[0.08em] uppercase block mb-1">{market.category}</span>
          {market.tag === "trending"
            ? <span className="flex items-center gap-1 text-[10px] font-bold text-primary"><Flame className="w-3 h-3" />Hot Now</span>
            : <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400"><Clock className="w-3 h-3" />Ending Soon</span>
          }
        </div>
        <div className="w-16 h-8 opacity-50 group-hover:opacity-100 transition-opacity">
          <Sparkline data={spark} color={market.yesProb > 50 ? "#22C55E" : "#EF4444"} strokeWidth={2} />
        </div>
      </div>

      {/* Question */}
      <p className="text-15px md:text-16px font-semibold text-white leading-snug mb-6 flex-1">{market.question}</p>

      {/* Probability */}
      <div className="mb-6">
        <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2.5">
          <div className="h-full bg-yes" style={{ width: `${market.yesProb}%` }} />
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold tracking-wider">
          <span className="text-yes uppercase">YES {market.yesProb}%</span>
          <span className="flex items-center gap-1 text-white/20"><TrendingUp className="w-3 h-3" />{market.volume} Volume</span>
          <span className="text-no uppercase">{noProb}% NO</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 border-t border-white/5 pt-4">
        <BitsButton
          variant="yes"
          onClick={(e) => { e.stopPropagation(); onTrade(market.id, "YES"); }}
          className="flex-1 h-9 rounded-xl flex items-center justify-between px-4"
        >
          <span>Yes</span> <span>{market.yesProb}¢</span>
        </BitsButton>
        <BitsButton
          variant="no"
          onClick={(e) => { e.stopPropagation(); onTrade(market.id, "NO"); }}
          className="flex-1 h-9 rounded-xl flex items-center justify-between px-4"
        >
          <span>No</span> <span>{noProb}¢</span>
        </BitsButton>
      </div>
    </BitsCard>
  );
}

export default function TrendingPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ market: typeof MARKETS[0]; type: "YES" | "NO" } | null>(null);
  const { markets: walletMarkets } = useWallet();

  const filtered = useMemo(() => MARKETS.filter(m =>
    (activeCategory === "All" || m.category === activeCategory) &&
    (!search || m.question.toLowerCase().includes(search.toLowerCase()))
  ), [activeCategory, search]);

  return (
    <div className="space-y-8 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Flame className="w-6 h-6 text-primary" /> Trending Markets
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">{MARKETS.length} active opportunities</p>
        </div>
        
        <BitsTabs 
          tabs={CATEGORIES.map(c => ({ id: c, label: c }))} 
          activeTab={activeCategory} 
          onChange={setActiveCategory} 
        />
      </div>

      {/* Search area */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search prediction markets…"
            className="w-full bg-[#121217] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/30 transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(m => (
          <MarketCard key={m.id} market={m} onTrade={(id, type) => setModal({ market: MARKETS.find(x => x.id === id)!, type })} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground text-sm">No markets found.</div>
        )}
      </div>

      {modal && (
        <TradeModal isOpen market={modal.market as any} initialType={modal.type} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
