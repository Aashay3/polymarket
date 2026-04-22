"use client";

import { useWallet } from "@/app/context/WalletContext";
import { Activity, Clock, History } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableRowSkeleton } from "@/components/ui/Skeleton";

export default function ActivityPage() {
    const { trades, isLoading } = useWallet();

    return (
        <div className="p-6 pb-20 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mb-1">
                        <Activity className="w-6 h-6 text-blue-500" />
                        Global Activity
                    </h1>
                    <p className="text-neutral-400 text-sm">Real-time ledger of all platform trades</p>
                </div>
            </div>

            {isLoading && trades.length === 0 ? (
                <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden">
                    {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
                </div>
            ) : trades.length === 0 ? (
                <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl">
                    <EmptyState
                        icon={History}
                        title="No trades yet"
                        description="Live trades across the platform will appear here the moment they happen."
                        action={{ label: "Browse markets", href: "/dashboard/markets" }}
                    />
                </div>
            ) : (
            <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#0a0a0a] border-b border-[#1a1a1a] text-neutral-400 font-medium tracking-wide text-xs uppercase pt-2 pb-2">
                            <tr>
                                <th className="px-5 py-4 w-40">Time</th>
                                <th className="px-5 py-4 w-32">Type</th>
                                <th className="px-5 py-4">Market</th>
                                <th className="px-5 py-4 text-right">Shares</th>
                                <th className="px-5 py-4 text-right">Price</th>
                                <th className="px-5 py-4 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]">
                            {trades.map((trade) => {
                                    const isYes = trade.type === "YES";
                                    const date = new Date(trade.timestamp);
                                    return (
                                        <tr key={trade.id} className="hover:bg-[#0a0a0a]/50 transition-colors">
                                            <td className="px-5 py-4 text-neutral-500 font-mono text-xs flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5" />
                                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-bold leading-none uppercase ${isYes ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    Bought {trade.type}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-white font-medium max-w-md truncate" title={trade.marketQuestion}>
                                                {trade.marketQuestion}
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-neutral-300">
                                                {trade.shares.toFixed(2)}
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono text-neutral-300">
                                                {(trade.price * 100).toFixed(1)}¢
                                            </td>
                                            <td className="px-5 py-4 text-right font-mono font-medium text-white">
                                                ${trade.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
        </div>
    );
}
