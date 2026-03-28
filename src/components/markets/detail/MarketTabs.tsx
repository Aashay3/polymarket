"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BitsTabs } from "@/components/ui/bits/BitsTabs";
import { BarChart, Info, Shield } from "lucide-react";

interface MarketTabsProps {
  description: string;
  rules: string;
}

export function MarketTabs({ description, rules }: MarketTabsProps) {
  const [activeTab, setActiveTab] = useState("Overview");

  const tabs = [
    { id: "Overview", label: "Overview", icon: <Info className="w-3.5 h-3.5" /> },
    { id: "Rules", label: "Rules", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "Analytics", label: "Analytics", icon: <BarChart className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-white/5 pb-1">
        <BitsTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "Overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-neutral-400 leading-relaxed max-w-3xl"
          >
            {description}
          </motion.div>
        )}

        {activeTab === "Rules" && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl text-sm text-neutral-400 leading-relaxed font-mono">
              {rules}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-2">
                <Shield className="w-3 h-3" /> All resolutions are final and based on official records.
            </p>
          </motion.div>
        )}

        {activeTab === "Analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="aspect-[2/1] w-full bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden group">
               {/* Mock SVG Chart */}
               <svg className="w-full h-full p-8" viewBox="0 0 400 200" preserveAspectRatio="none">
                 <path 
                   d="M0 150 Q 50 120, 100 140 T 200 80 T 300 110 T 400 40" 
                   fill="none" 
                   stroke="rgba(34, 197, 94, 0.4)" 
                   strokeWidth="3" 
                 />
                 <path 
                   d="M0 180 Q 50 160, 100 170 T 200 150 T 300 160 T 400 140" 
                   fill="none" 
                   stroke="rgba(255, 255, 255, 0.1)" 
                   strokeWidth="2" 
                   strokeDasharray="4 4"
                 />
               </svg>
               <div className="absolute inset-0 bg-linear-to-t from-background to-transparent opacity-20" />
               <div className="absolute top-6 left-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full backdrop-blur">
                  Probability History (7D)
               </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "24h Volume", value: "$450,231" },
                    { label: "Liquidity", value: "$1.2M" },
                    { label: "Open Interest", value: "14,203" }
                ].map(stat => (
                    <div key={stat.label} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-sm font-black text-white">{stat.value}</p>
                    </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
