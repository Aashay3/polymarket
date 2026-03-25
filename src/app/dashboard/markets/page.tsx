"use client";

import { useState } from "react";
import { Clock, Search } from "lucide-react";
import { TradeModal } from "@/components/TradeModal";
import { useWallet, Market } from "@/app/context/WalletContext";

export default function MarketsPage() {
    const { markets } = useWallet();
    const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
    const [tradeType, setTradeType] = useState<"YES" | "NO">("YES");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredMarkets = markets.filter(m => m.question.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Markets</h1>
                    <p className="text-neutral-400 text-sm">Discover and trade active prediction markets</p>
                </div>

                <div className="relative w-full md:w-64 hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search markets..."
                        className="w-full bg-[#111] border border-[#222] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:text-neutral-500 text-white"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredMarkets.map((market) => {
                    const endDate = new Date(market.endTime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                    });

                    const totalShares = market.yesShares + market.noShares;
                    const yesPrice = market.yesShares / totalShares;
                    const noPrice = market.noShares / totalShares;

                    return (
                        <div key={market.id} className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 hover:border-[#333] transition-colors flex flex-col group cursor-pointer">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="bg-white/5 text-neutral-300 text-xs px-2 py-0.5 rounded font-medium border border-white/10">
                                        {market.category}
                                    </span>
                                    <span className="text-neutral-500 text-xs font-mono">
                                        Vol: ${(market.volumeAmount / 1000000).toFixed(1)}M
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-neutral-500 text-xs font-medium">
                                    <Clock className="w-3.5 h-3.5" />
                                    {endDate}
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-white mb-6 group-hover:text-blue-400 transition-colors line-clamp-2">
                                {market.question}
                            </h3>

                            {market.status === "RESOLVED" ? (
                                <div className="mt-auto">
                                    <div className="flex items-center justify-center bg-white/5 border border-white/10 rounded-lg py-3">
                                        <span className="text-sm font-bold tracking-wider text-neutral-400">RESOLVED: {market.winningOutcome}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-auto grid grid-cols-2 gap-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedMarket(market); setTradeType("YES"); }}
                                        className="flex flex-col items-center justify-center bg-green-500/5 hover:bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg py-2 transition-colors">
                                        <span className="text-xs font-bold uppercase tracking-wider mb-0.5">Yes</span>
                                        <span className="font-mono text-lg font-semibold">{(yesPrice * 100).toFixed(1)}¢</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedMarket(market); setTradeType("NO"); }}
                                        className="flex flex-col items-center justify-center bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg py-2 transition-colors">
                                        <span className="text-xs font-bold uppercase tracking-wider mb-0.5">No</span>
                                        <span className="font-mono text-lg font-semibold">{(noPrice * 100).toFixed(1)}¢</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedMarket && (
                <TradeModal
                    isOpen={true}
                    onClose={() => setSelectedMarket(null)}
                    market={selectedMarket}
                    initialType={tradeType}
                />
            )}
        </div>
    );
}
