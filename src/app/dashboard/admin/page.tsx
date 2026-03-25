"use client";

import { useWallet } from "@/app/context/WalletContext";
import { Shield, CheckCircle2 } from "lucide-react";

export default function AdminPage() {
    const { markets, resolveMarket } = useWallet();

    const handleResolve = (marketId: string, outcome: "YES" | "NO") => {
        resolveMarket(marketId, outcome);
    };

    return (
        <div className="p-6 pb-20 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mb-1">
                        <Shield className="w-6 h-6 text-blue-500" />
                        Admin Operator Panel
                    </h1>
                    <p className="text-neutral-400 text-sm">Manage markets and execute resolutions</p>
                </div>
            </div>

            <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#0a0a0a] border-b border-[#1a1a1a] text-neutral-400 font-medium">
                            <tr>
                                <th className="px-5 py-4">Market ID</th>
                                <th className="px-5 py-4 max-w-[400px]">Question</th>
                                <th className="px-5 py-4 text-right">Pool Size (Shares)</th>
                                <th className="px-5 py-4 text-center">Status</th>
                                <th className="px-5 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]">
                            {markets.map((market) => {
                                const totalShares = market.yesShares + market.noShares;
                                return (
                                    <tr key={market.id} className="hover:bg-[#0a0a0a]/50 transition-colors">
                                        <td className="px-5 py-4 font-mono text-neutral-500">#{market.id}</td>
                                        <td className="px-5 py-4 text-white truncate max-w-[400px]" title={market.question}>
                                            {market.question}
                                        </td>
                                        <td className="px-5 py-4 text-right font-mono text-neutral-300">
                                            {totalShares.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {market.status === "RESOLVED" ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    RESOLVED: {market.winningOutcome}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400">
                                                    OPEN
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            {market.status === "OPEN" ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleResolve(market.id, "YES")}
                                                        className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 rounded font-bold text-xs transition-colors"
                                                    >
                                                        Resolve YES
                                                    </button>
                                                    <button
                                                        onClick={() => handleResolve(market.id, "NO")}
                                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded font-bold text-xs transition-colors"
                                                    >
                                                        Resolve NO
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-neutral-500 text-xs italic">Market Closed</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
