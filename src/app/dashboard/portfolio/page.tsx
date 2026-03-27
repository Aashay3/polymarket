"use client";

import { useWallet } from "@/app/context/WalletContext";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, PieChart, TrendingUp, History } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

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
    const { myTrades, markets, balance } = useWallet();

    const holdingsMap = new Map<string, Holding>();
    myTrades.forEach(trade => {
        const key = `${trade.marketId}-${trade.type}`;
        if (!holdingsMap.has(key)) {
            holdingsMap.set(key, { marketId: trade.marketId, marketQuestion: trade.marketQuestion, type: trade.type, shares: 0, invested: 0, currentValue: 0, currentPrice: 0, avgBuyPrice: 0 });
        }
        const h = holdingsMap.get(key)!;
        h.shares += trade.shares;
        h.invested += trade.amount;
    });

    const holdings = Array.from(holdingsMap.values())
        .filter(h => markets.find(m => m.id === h.marketId)?.status === "OPEN")
        .map(h => {
            const market = markets.find(m => m.id === h.marketId);
            if (market) {
                const totalPool = market.yesShares + market.noShares;
                h.currentPrice = h.type === "YES" ? market.yesShares / totalPool : market.noShares / totalPool;
                h.currentValue = h.shares * h.currentPrice;
            }
            h.avgBuyPrice = h.invested / h.shares;
            return h;
        })
        .sort((a, b) => b.currentValue - a.currentValue);

    const positionsValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPortfolioValue = balance + positionsValue;
    const totalPnL = totalPortfolioValue - 1000;
    const totalPnLPercent = (totalPnL / 1000) * 100;

    const statCards = [
        { label: "Total Value", value: `$${totalPortfolioValue.toFixed(2)}`, icon: <Wallet className="w-4 h-4" /> },
        { label: "Positions Value", value: `$${positionsValue.toFixed(2)}`, icon: <PieChart className="w-4 h-4" /> },
        { label: "Cash Balance", value: `$${balance.toFixed(2)}`, icon: <Activity className="w-4 h-4" /> },
    ];

    return (
        <div className="pb-20 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Portfolio</h1>
                <p className="text-muted-foreground text-sm">Analyze your performance and open positions</p>
            </div>

            {/* Stat Cards using GlassCard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((s) => (
                    <GlassCard key={s.label} hover className="p-5">
                        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                            {s.icon}
                            <span className="text-sm font-medium">{s.label}</span>
                        </div>
                        <span className="text-3xl font-bold text-white tracking-tight">{s.value}</span>
                    </GlassCard>
                ))}

                {/* PnL Card (special) */}
                <GlassCard hover className="p-5">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Total PnL</span>
                    </div>
                    <div className="flex items-end justify-between">
                        <span className={`text-3xl font-bold tracking-tight ${totalPnL >= 0 ? "text-primary" : "text-red-500"}`}>
                            {totalPnL >= 0 ? "+" : "-"}${Math.abs(totalPnL).toFixed(2)}
                        </span>
                        <span className={`flex items-center text-sm font-medium px-2 py-0.5 rounded ${totalPnL >= 0 ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-500"}`}>
                            {totalPnL >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {Math.abs(totalPnLPercent).toFixed(2)}%
                        </span>
                    </div>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
                {/* Active Positions */}
                <div className="lg:col-span-2 xl:col-span-3 space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-muted-foreground" /> Active Positions ({holdings.length})
                    </h2>
                    <GlassCard hover={false} className="overflow-hidden">
                        {holdings.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">You don&apos;t have any active positions yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-white/5 border-b border-white/10 text-muted-foreground font-medium">
                                        <tr>
                                            {["Market", "Position", "Shares", "Avg Price", "Current Price", "Value", "PnL"].map(h => (
                                                <th key={h} className={`px-5 py-4 ${h !== "Market" && h !== "Position" ? "text-right" : ""}`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {holdings.map((h, i) => {
                                            const pnl = h.currentValue - h.invested;
                                            const pnlPercent = (pnl / h.invested) * 100;
                                            return (
                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-5 py-4 max-w-[250px] truncate text-white">{h.marketQuestion}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${h.type === "YES" ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-500"}`}>{h.type}</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right font-mono text-foreground/80">{h.shares.toFixed(2)}</td>
                                                    <td className="px-5 py-4 text-right font-mono text-muted-foreground">{(h.avgBuyPrice * 100).toFixed(1)}¢</td>
                                                    <td className="px-5 py-4 text-right font-mono text-white">{(h.currentPrice * 100).toFixed(1)}¢</td>
                                                    <td className="px-5 py-4 text-right font-mono text-white font-medium">${h.currentValue.toFixed(2)}</td>
                                                    <td className={`px-5 py-4 text-right font-mono font-medium ${pnl >= 0 ? "text-primary" : "text-red-500"}`}>
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
                    </GlassCard>
                </div>

                {/* Trade History */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-muted-foreground" /> Trade History
                    </h2>
                    <GlassCard hover={false} className="h-[500px] overflow-y-auto scrollbar-hide p-4">
                        {myTrades.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No trading history.</p>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {myTrades.map((trade) => {
                                    const date = new Date(trade.timestamp);
                                    const fmt = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    return (
                                        <div key={trade.id} className="py-3 border-b border-white/5 last:border-0 hover:bg-white/5 rounded px-2 -mx-2 transition-colors">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-sm font-medium text-white flex items-center gap-1">
                                                    Bought <span className={trade.type === "YES" ? "text-primary" : "text-red-500"}>{trade.type}</span>
                                                </span>
                                                <span className="text-xs text-muted-foreground">{fmt}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mb-1 truncate">{trade.marketQuestion}</div>
                                            <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                                <span>{trade.shares.toFixed(2)} shares @ {(trade.price * 100).toFixed(1)}¢</span>
                                                <span className="text-white">${trade.amount.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
