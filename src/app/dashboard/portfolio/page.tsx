"use client";

import { useWallet, Market, Trade } from "@/app/context/WalletContext";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, History, PieChart, TrendingUp } from "lucide-react";

interface Holding {
    marketId: string;
    marketQuestion: string;
    type: "YES" | "NO";
    shares: number;
    invested: number;
    currentValue: number;
    currentPrice: number;
    avgBuyPrice: number;
}

export default function PortfolioPage() {
    const { myTrades, trades, markets, balance } = useWallet();

    // Aggregate holdings
    const holdingsMap = new Map<string, Holding>();

    myTrades.forEach(trade => {
        const key = `${trade.marketId}-${trade.type}`;
        if (!holdingsMap.has(key)) {
            holdingsMap.set(key, {
                marketId: trade.marketId,
                marketQuestion: trade.marketQuestion,
                type: trade.type,
                shares: 0,
                invested: 0,
                currentValue: 0,
                currentPrice: 0,
                avgBuyPrice: 0
            });
        }
        const h = holdingsMap.get(key)!;
        h.shares += trade.shares;
        h.invested += trade.amount;
    });

    const holdings = Array.from(holdingsMap.values())
        .filter(h => {
            const market = markets.find(m => m.id === h.marketId);
            return market?.status === "OPEN";
        })
        .map(h => {
            const market = markets.find(m => m.id === h.marketId);
            if (market) {
                const totalPool = market.yesShares + market.noShares;
                h.currentPrice = h.type === "YES" ? market.yesShares / totalPool : market.noShares / totalPool;
                h.currentValue = h.shares * h.currentPrice;
            }
            h.avgBuyPrice = h.invested / h.shares;
            return h;
        });

    // Sort holdings by current value descending
    holdings.sort((a, b) => b.currentValue - a.currentValue);

    const totalInvested = holdings.reduce((sum, h) => sum + h.invested, 0);
    const positionsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPortfolioValue = balance + positionsValue;

    // Starting balance is $1000.00
    const totalPnL = totalPortfolioValue - 1000;
    const totalPnLPercent = (totalPnL / 1000) * 100;

    return (
        <div className="p-6 pb-20 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Portfolio</h1>
                    <p className="text-neutral-400 text-sm">Analyze your performance and open positions</p>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-400 text-sm font-medium">Total Value</span>
                    </div>
                    <span className="text-3xl font-bold text-white tracking-tight">${totalPortfolioValue.toFixed(2)}</span>
                </div>

                <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <PieChart className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-400 text-sm font-medium">Positions Value</span>
                    </div>
                    <span className="text-3xl font-bold text-white tracking-tight">${positionsValue.toFixed(2)}</span>
                </div>

                <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-400 text-sm font-medium">Cash Balance</span>
                    </div>
                    <span className="text-3xl font-bold text-white tracking-tight">${balance.toFixed(2)}</span>
                </div>

                <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-neutral-500" />
                        <span className="text-neutral-400 text-sm font-medium">Total PnL</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <span className={`text-3xl font-bold tracking-tight ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {totalPnL >= 0 ? "+" : "-"}${Math.abs(totalPnL).toFixed(2)}
                        </span>
                        <span className={`flex items-center text-sm font-medium px-2 py-0.5 rounded ${totalPnL >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                            {totalPnL >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {Math.abs(totalPnLPercent).toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
                {/* Active Positions Table */}
                <div className="lg:col-span-2 xl:col-span-3 space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-neutral-400" />
                        Active Positions ({holdings.length})
                    </h2>

                    <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden">
                        {holdings.length === 0 ? (
                            <div className="p-8 text-center text-neutral-500">
                                You don't have any active positions yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-[#0a0a0a] border-b border-[#1a1a1a] text-neutral-400 font-medium">
                                        <tr>
                                            <th className="px-5 py-4">Market</th>
                                            <th className="px-5 py-4">Position</th>
                                            <th className="px-5 py-4 text-right">Shares</th>
                                            <th className="px-5 py-4 text-right">Avg Price</th>
                                            <th className="px-5 py-4 text-right">Current Price</th>
                                            <th className="px-5 py-4 text-right">Value</th>
                                            <th className="px-5 py-4 text-right">PnL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1a1a1a]">
                                        {holdings.map((h, i) => {
                                            const pnl = h.currentValue - h.invested;
                                            const pnlPercent = (pnl / h.invested) * 100;
                                            return (
                                                <tr key={i} className="hover:bg-[#0a0a0a]/50 transition-colors">
                                                    <td className="px-5 py-4 max-w-[250px] truncate text-white">
                                                        {h.marketQuestion}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${h.type === "YES" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                                                            {h.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-mono text-neutral-300">
                                                        {h.shares.toFixed(2)}
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-mono text-neutral-500">
                                                        {(h.avgBuyPrice * 100).toFixed(1)}¢
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-mono text-white">
                                                        {(h.currentPrice * 100).toFixed(1)}¢
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-mono text-white font-medium">
                                                        ${h.currentValue.toFixed(2)}
                                                    </td>
                                                    <td className={`px-5 py-4 text-right font-mono font-medium ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                                                        <span className="block text-xs opacity-80">{pnl >= 0 ? "+" : ""}{pnlPercent.toFixed(1)}%</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Trade History Sidebar */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-neutral-400" />
                        Trade History
                    </h2>

                    <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl flex flex-col h-[500px]">
                        <div className="p-4 flex flex-col gap-1 overflow-auto">
                            {myTrades.length === 0 ? (
                                <p className="text-sm text-neutral-500 text-center py-8">No trading history.</p>
                            ) : (
                                myTrades.map((trade) => {
                                    const date = new Date(trade.timestamp);
                                    const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <div key={trade.id} className="py-3 border-b border-[#1a1a1a] last:border-0 hover:bg-[#0a0a0a] transition-colors rounded px-2 -mx-2">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-medium text-white flex items-center gap-1">
                                                    Bought
                                                    <span className={trade.type === "YES" ? "text-green-500" : "text-red-500"}>{trade.type}</span>
                                                </span>
                                                <span className="text-xs text-neutral-500">{formattedDate}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span className="text-neutral-400 truncate pr-4">{trade.marketQuestion}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs font-mono text-neutral-500">
                                                <span>{trade.shares.toFixed(2)} shares @ {(trade.price * 100).toFixed(1)}¢</span>
                                                <span className="text-white">${trade.amount.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
