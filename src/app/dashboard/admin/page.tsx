"use client";

import { useState } from "react";
import { useWallet } from "@/app/context/WalletContext";
import { Shield, CheckCircle2, Plus, Calendar, Tag, MessageSquare, AlertCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlowButton } from "@/components/ui/GlowButton";

export default function AdminPage() {
    const { markets, resolveMarket, createNewMarket } = useWallet();
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        question: "",
        category: "Crypto",
        endTime: ""
    });
    const [status, setStatus] = useState<{ type: "success" | "error", msg: string } | null>(null);

    const handleResolve = (marketId: string, outcome: "YES" | "NO") => {
        resolveMarket(marketId, outcome);
    };

    const handleCreateMarket = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.question || !formData.endTime) {
            setStatus({ type: "error", msg: "Please fill all required fields." });
            return;
        }
        
        const success = createNewMarket(formData.question, formData.category, formData.endTime);
        if (success) {
            setStatus({ type: "success", msg: "Market created successfully!" });
            setFormData({ question: "", category: "Crypto", endTime: "" });
            setIsCreating(false);
            setTimeout(() => setStatus(null), 3000);
        } else {
            setStatus({ type: "error", msg: "Failed to create market." });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Admin Operator Panel
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage markets and execute resolutions</p>
                </div>
                <GlowButton
                    variant="primary"
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    {isCreating ? "Cancel" : "Create New Market"}
                </GlowButton>
            </div>

            {status && (
                <div className={`p-4 rounded-xl flex items-center gap-3 border ${
                    status.type === "success" 
                        ? "bg-yes/10 border-yes/20 text-yes" 
                        : "bg-no/10 border-no/20 text-no"
                }`}>
                    {status.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="text-sm font-medium">{status.msg}</span>
                </div>
            )}

            {/* Create Market Form */}
            {isCreating && (
                <GlassCard className="p-6">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Create New Market
                    </h2>
                    <form onSubmit={handleCreateMarket} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Market Question</label>
                            <div className="relative">
                                <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={formData.question}
                                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                    placeholder="e.g. Will Bitcoin hit $100k before December?"
                                    className="w-full bg-background border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Category</label>
                            <div className="relative">
                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-background border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white appearance-none focus:outline-none focus:border-primary/50 transition-colors"
                                >
                                    <option>Crypto</option>
                                    <option>Sports</option>
                                    <option>Politics</option>
                                    <option>Technology</option>
                                    <option>Science</option>
                                    <option>Economy</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">End Date & Time</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="datetime-local"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    className="w-full bg-background border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                            <GlowButton variant="ghost" type="button" onClick={() => setIsCreating(false)}>
                                Cancel
                            </GlowButton>
                            <GlowButton variant="primary" type="submit" className="px-8">
                                Publish Market
                            </GlowButton>
                        </div>
                    </form>
                </GlassCard>
            )}

            {/* Markets Table */}
            <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/3 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">Market</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-widest text-[10px] text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Pool Size</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-widest text-[10px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {markets.map((market) => {
                                const totalShares = market.yesShares + market.noShares;
                                return (
                                    <tr key={market.id} className="hover:bg-white/2 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-white font-medium line-clamp-1">{market.question}</span>
                                                <span className="text-[10px] text-white/60 font-mono">ID: #{market.id} • {market.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                {market.status === "RESOLVED" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 text-white uppercase border border-white/10">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {market.winningOutcome} Wins
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary uppercase border border-primary/20">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right font-mono text-muted-foreground">
                                            {totalShares.toLocaleString("en-US")} <span className="text-[10px]">shares</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                {market.status === "OPEN" ? (
                                                    <>
                                                        <GlowButton
                                                            variant="yes"
                                                            onClick={() => handleResolve(market.id, "YES")}
                                                            className="px-3 py-1.5 text-[10px] h-8"
                                                        >
                                                            YES
                                                        </GlowButton>
                                                        <GlowButton
                                                            variant="no"
                                                            onClick={() => handleResolve(market.id, "NO")}
                                                            className="px-3 py-1.5 text-[10px] h-8"
                                                        >
                                                            NO
                                                        </GlowButton>
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground/50 uppercase font-semibold">Closed</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
