"use client";

import { useState } from "react";
import { useWallet } from "@/app/context/WalletContext";
import { Shield, CheckCircle2, Plus, Calendar, Tag, MessageSquare, AlertCircle, X, Activity } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsTable, BitsTableRow, BitsTableCell } from "@/components/ui/bits/BitsTable";

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

    const handleCreateMarket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.question || !formData.endTime) {
            setStatus({ type: "error", msg: "Please fill all required fields." });
            return;
        }

        const success = await createNewMarket(formData.question, formData.category, formData.endTime);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Shield className="w-6 h-6 text-primary" />
                        Admin Operator
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1.5 font-medium">Control center for market creation and automated resolution</p>
                </div>
                <BitsButton
                    variant={isCreating ? "secondary" : "primary"}
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2 h-11 px-6 rounded-xl"
                >
                    {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isCreating ? "Cancel Creation" : "Create New Market"}
                </BitsButton>
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
                <BitsCard className="p-8 border-primary/20 bg-primary/2 mb-10">
                    <h2 className="text-lg font-bold text-white mb-8 flex items-center gap-3">
                        <Plus className="w-5 h-5 text-primary" /> Create New Market Opportunity
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

                        <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-white/5">
                            <BitsButton variant="ghost" type="button" onClick={() => setIsCreating(false)} className="px-6">
                                Cancel
                            </BitsButton>
                            <BitsButton variant="primary" type="submit" className="px-10 h-11 rounded-xl">
                                Publish Market
                            </BitsButton>
                        </div>
                    </form>
                </BitsCard>
            )}

            {/* Markets Table */}
            <div>
              <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" /> Managed Markets
              </h2>
              <BitsTable headers={["Market", "Status", "Pool Size", "Actions"]}>
                  {markets.map((market) => {
                      const totalShares = market.yesShares + market.noShares;
                      return (
                          <BitsTableRow key={market.id}>
                              <BitsTableCell>
                                  <div className="flex flex-col gap-1">
                                      <span className="text-white font-bold line-clamp-1">{market.question}</span>
                                      <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">#{market.id} • {market.category}</span>
                                  </div>
                              </BitsTableCell>
                              <BitsTableCell align="center">
                                  {market.status === "RESOLVED" ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-white/60 uppercase border border-white/5">
                                          <CheckCircle2 className="w-3 h-3" />
                                          {market.winningOutcome} Wins
                                      </span>
                                  ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary uppercase border border-primary/20">
                                          Active
                                      </span>
                                  )}
                              </BitsTableCell>
                              <BitsTableCell align="right" className="font-mono text-muted-foreground">
                                  {totalShares.toLocaleString("en-IN")} <span className="text-[9px] uppercase font-bold text-white/20">shares</span>
                              </BitsTableCell>
                              <BitsTableCell align="right">
                                  <div className="flex items-center justify-end gap-2">
                                      {market.status === "OPEN" ? (
                                          <>
                                              <BitsButton
                                                  variant="yes"
                                                  onClick={() => handleResolve(market.id, "YES")}
                                                  className="px-4 py-1 text-[10px] h-8 rounded-lg"
                                              >
                                                  YES
                                              </BitsButton>
                                              <BitsButton
                                                  variant="no"
                                                  onClick={() => handleResolve(market.id, "NO")}
                                                  className="px-4 py-1 text-[10px] h-8 rounded-lg"
                                              >
                                                  NO
                                              </BitsButton>
                                          </>
                                      ) : (
                                          <span className="text-[10px] text-white/20 uppercase font-bold tracking-widest px-4">Settled</span>
                                      )}
                                  </div>
                              </BitsTableCell>
                          </BitsTableRow>
                      );
                  })}
              </BitsTable>
            </div>
        </div>
    );
}
