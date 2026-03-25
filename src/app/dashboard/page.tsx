"use client";

import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, Clock } from "lucide-react";
import { TradeModal } from "@/components/TradeModal";
import { useWallet } from "@/app/context/WalletContext";

const RECENT_ACTIVITY = [
    { id: 1, action: "Bought Yes", market: "Fed Rate Cut", amount: "$500.00", time: "2m ago" },
    { id: 2, action: "Placed Limit Order", market: "Bitcoin $100k", amount: "$1,200.00", time: "15m ago" },
    { id: 3, action: "Sold No", market: "SpaceX Mars", amount: "$300.00", time: "1h ago" },
];

export default function DashboardPage() {
    const { trades, balance, markets } = useWallet();
    const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || "");
    const selectedMarket = markets.find(m => m.id === selectedMarketId) || markets[0];

    const [tradeType, setTradeType] = useState<"YES" | "NO">("YES");
    const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

    const activePositions = Array.from(new Set(trades.map(t => t.marketId))).length;

    const totalShares = selectedMarket ? selectedMarket.yesShares + selectedMarket.noShares : 1;
    const yesPrice = selectedMarket ? selectedMarket.yesShares / totalShares : 0;
    const noPrice = selectedMarket ? selectedMarket.noShares / totalShares : 0;

    return (
        <div className="p-6 pb-20 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Markets Overview</h1>
                    <p className="text-neutral-400 text-sm">Track your portfolio and active markets</p>
                </div>

                <div className="flex gap-2">
                    <button className="bg-[#111] hover:bg-[#1a1a1a] text-white text-sm font-medium px-4 py-2 rounded-lg border border-[#222] transition-colors">
                        Filter
                    </button>
                    <button className="bg-white hover:bg-neutral-200 text-black text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                        New Order
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                {/* Main Chart Area */}
                <div className="lg:col-span-2 xl:col-span-3 space-y-6">
                    {/* Portfolio Summary Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between">
                            <span className="text-neutral-400 text-sm mb-2 font-medium">Portfolio Value</span>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-bold text-white tracking-tight">$4,250.00</span>
                                <span className="flex items-center text-green-500 text-sm font-medium bg-green-500/10 px-2 py-0.5 rounded">
                                    <ArrowUpRight className="w-3 h-3 mr-1" />
                                    +5.2%
                                </span>
                            </div>
                        </div>

                        <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between">
                            <span className="text-neutral-400 text-sm mb-2 font-medium">Cash Balance</span>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-bold text-white tracking-tight">$1,050.00</span>
                            </div>
                        </div>

                        <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between">
                            <span className="text-neutral-400 text-sm mb-2 font-medium">Open Positions</span>
                            <div className="flex items-end justify-between">
                                <span className="text-3xl font-bold text-white tracking-tight">{activePositions}</span>
                                <span className="text-neutral-500 text-sm font-medium">Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Active Market Detail */}
                    <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden flex flex-col h-[500px]">
                        <div className="p-5 border-b border-[#1a1a1a] flex justify-between items-center bg-[#0a0a0a]">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-white/10 text-white text-xs px-2 py-0.5 rounded font-medium">{selectedMarket?.category || "Finance"}</span>
                                    <span className="text-neutral-500 text-xs flex items-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        Vol: ${(selectedMarket?.volumeAmount / 1000000).toFixed(1)}M
                                    </span>
                                </div>
                                <h2 className="text-xl font-semibold text-white">{selectedMarket?.question}</h2>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-white">{(yesPrice * 100).toFixed(0)}%</div>
                                <div className="text-sm text-neutral-400 font-medium tracking-wide border border-white/20 px-2 py-1 rounded inline-block mt-1 bg-white/5">CHANCE OF YES</div>
                            </div>
                        </div>

                        {/* Mock Chart Area */}
                        <div className="flex-1 p-5 relative group">
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                <TrendingUp className="w-32 h-32 text-neutral-500" />
                            </div>
                            <div className="h-full w-full border border-dashed border-[#222] rounded-lg flex items-center justify-center bg-[#0a0a0a]/50">
                                <div className="text-center w-full h-full flex flex-col items-center justify-center">
                                    <p className="text-neutral-400 mb-6 font-mono text-sm uppercase tracking-widest">Market Visualization</p>
                                    <div className="w-[80%] h-32 relative">
                                        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full">
                                            <defs>
                                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
                                                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M0,40 L0,40 L20,35 L40,25 L60,30 L80,10 L100,15 L100,40 Z" fill="url(#gradient)" />
                                            <polyline points="0,40 20,35 40,25 60,30 80,10 100,15" fill="none" stroke="currentColor" strokeWidth="2" className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                                            <circle cx="100" cy="15" r="1.5" className="fill-white drop-shadow-[0_0_5px_rgba(255,255,255,1)]" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-16 border-t border-[#1a1a1a] flex">
                            <button className="flex-1 hover:bg-[#111] transition-colors border-r border-[#1a1a1a] flex items-center justify-center text-sm font-medium text-neutral-400 hover:text-white">
                                1H
                            </button>
                            <button className="flex-1 bg-white/5 text-white transition-colors border-r border-[#1a1a1a] flex items-center justify-center text-sm font-medium">
                                1D
                            </button>
                            <button className="flex-1 hover:bg-[#111] transition-colors border-r border-[#1a1a1a] flex items-center justify-center text-sm font-medium text-neutral-400 hover:text-white">
                                1W
                            </button>
                            <button className="flex-1 hover:bg-[#111] transition-colors border-r border-[#1a1a1a] flex items-center justify-center text-sm font-medium text-neutral-400 hover:text-white">
                                1M
                            </button>
                            <button className="flex-1 hover:bg-[#111] transition-colors flex items-center justify-center text-sm font-medium text-neutral-400 hover:text-white">
                                ALL
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-6">
                    {/* Order Book Mock */}
                    <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl flex flex-col h-[350px]">
                        <div className="p-4 border-b border-[#1a1a1a]">
                            <h3 className="font-semibold text-white">Order Book</h3>
                        </div>
                        <div className="p-4 flex-1 flex flex-col gap-1 overflow-auto text-sm font-mono">
                            <div className="grid grid-cols-2 text-neutral-500 mb-2 text-xs pb-2 border-b border-[#222]">
                                <span>Type</span>
                                <span className="text-center">Price</span>
                            </div>

                            {/* Asks */}
                            <div className="text-red-400 grid grid-cols-3 hover:bg-[#111] px-1 py-1 rounded cursor-pointer relative overflow-hidden group">
                                <div className="absolute right-0 top-0 bottom-0 bg-red-950/40 w-[80%] z-0 rounded-l"></div>
                                <span className="relative z-10">Ask</span>
                                <span className="text-center relative z-10">66¢</span>
                                <span className="text-right relative z-10">1,240</span>
                            </div>
                            <div className="text-red-400 grid grid-cols-3 hover:bg-[#111] px-1 py-1 rounded cursor-pointer relative overflow-hidden group">
                                <div className="absolute right-0 top-0 bottom-0 bg-red-950/40 w-[40%] z-0 rounded-l"></div>
                                <span className="relative z-10">Ask</span>
                                <span className="text-center relative z-10">67¢</span>
                                <span className="text-right relative z-10">540</span>
                            </div>

                            <div className="my-2 border-t border-dashed border-[#222] flex items-center justify-center">
                                <span className="bg-[#050505] px-2 text-white font-bold my-[-10px] text-lg">{(yesPrice * 100).toFixed(1)}¢</span>
                            </div>

                            {/* Bids */}
                            <div className="text-green-400 grid grid-cols-3 hover:bg-[#111] px-1 py-1 rounded cursor-pointer relative overflow-hidden group">
                                <div className="absolute right-0 top-0 bottom-0 bg-green-950/40 w-[60%] z-0 rounded-l"></div>
                                <span className="relative z-10">Bid</span>
                                <span className="text-center relative z-10">64¢</span>
                                <span className="text-right relative z-10">890</span>
                            </div>
                            <div className="text-green-400 grid grid-cols-3 hover:bg-[#111] px-1 py-1 rounded cursor-pointer relative overflow-hidden group">
                                <div className="absolute right-0 top-0 bottom-0 bg-green-950/40 w-[95%] z-0 rounded-l"></div>
                                <span className="relative z-10">Bid</span>
                                <span className="text-center relative z-10">63¢</span>
                                <span className="text-right relative z-10">2,100</span>
                            </div>
                        </div>

                        <div className="p-4 border-t border-[#1a1a1a] grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setTradeType("YES"); setIsTradeModalOpen(true); }}
                                className="bg-[#111] text-white hover:bg-[#1a1a1a] border border-[#222] font-semibold py-2 rounded-lg transition-colors">
                                Buy Yes
                            </button>
                            <button
                                onClick={() => { setTradeType("NO"); setIsTradeModalOpen(true); }}
                                className="bg-[#111] text-white hover:bg-[#1a1a1a] border border-[#222] font-semibold py-2 rounded-lg transition-colors">
                                Buy No
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl flex flex-col">
                        <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center">
                            <h3 className="font-semibold text-white">Recent Activity</h3>
                            <Clock className="w-4 h-4 text-neutral-500" />
                        </div>
                        <div className="px-4 py-2 flex flex-col gap-1">
                            {trades.length === 0 ? (
                                <p className="text-sm text-neutral-500 py-4 px-2">No recent activity.</p>
                            ) : trades.slice(0, 8).map((trade) => (
                                <div key={trade.id} className="py-3 border-b border-[#1a1a1a] last:border-0 hover:bg-[#0a0a0a] transition-colors rounded px-2 -mx-2">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-sm font-medium text-white flex items-center gap-1">
                                            Bought
                                            <span className={trade.type === "YES" ? "text-green-500" : "text-red-500"}>{trade.type}</span>
                                        </span>
                                        <span className="text-xs text-neutral-500">Just now</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-neutral-400 truncate pr-4">{trade.marketQuestion}</span>
                                        <span className="font-mono text-white">${trade.amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {isTradeModalOpen && selectedMarket && (
                <TradeModal
                    isOpen={true}
                    onClose={() => setIsTradeModalOpen(false)}
                    market={selectedMarket}
                    initialType={tradeType}
                />
            )}
        </div>
    );
}
