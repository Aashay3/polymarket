"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";

interface EarningsCardProps {
  amount?: number;
  changePercent?: number;
  label?: string;
  sublabel?: string;
}

export function EarningsCard({
  amount = 1284.5,
  changePercent = 12.4,
  label = "Total Earnings",
  sublabel = "All time",
}: EarningsCardProps) {
  // Animate gradient position for shimmer sweep
  const [gradientX, setGradientX] = useState(0);
  const timeRef = useRef(0);

  useAnimationFrame((t) => {
    timeRef.current = t;
    // Oscillate between 0-100 over ~4s
    setGradientX(50 + 50 * Math.sin(t / 4000));
  });

  const isPositive = changePercent >= 0;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden" style={{
      // Outer orange glow
      boxShadow: "0 0 60px rgba(255,84,27,0.18), 0 0 120px rgba(255,84,27,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
    }}>

      {/* Base glass layer */}
      <div className="absolute inset-0 bg-[rgba(255,255,255,0.04)] backdrop-blur-xl" />

      {/* Animated orange right-side glow blob */}
      <motion.div
        animate={{ opacity: [0.55, 0.75, 0.55], scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-12 -top-12 w-[55%] aspect-square pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,84,27,0.35) 0%, rgba(255,122,61,0.12) 50%, transparent 75%)",
          filter: "blur(30px)",
        }}
      />

      {/* Subtle deep inner shadow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: "inset 0 0 80px rgba(255,84,27,0.06), inset 0 -1px 0 rgba(255,255,255,0.04)",
        borderRadius: "inherit",
      }} />

      {/* Dark gradient base for depth */}
      <div className="absolute inset-0 bg-linear-to-br from-[#0d0d0d] via-[#0a0808] to-[#0d0805] pointer-events-none" />

      {/* Animated shimmer / light reflection sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(${120 + gradientX * 0.6}deg, transparent 30%, rgba(255,255,255,0.04) ${40 + gradientX * 0.2}%, rgba(255,255,255,0.07) ${50 + gradientX * 0.1}%, transparent 70%)`,
        }}
      />

      {/* Top edge highlight (glass reflection) */}
      <div className="absolute top-0 left-8 right-8 h-px bg-linear-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

      {/* Border */}
      <div className="absolute inset-0 rounded-3xl border border-white/[0.07] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-7 md:p-8">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,84,27,0.15)", boxShadow: "0 0 20px rgba(255,84,27,0.2), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
              <TrendingUp className="w-5 h-5 text-[#FF7A3D]" />
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-[0.15em]">{sublabel}</p>
              <p className="text-white/80 text-sm font-semibold">{label}</p>
            </div>
          </div>

          {/* Badge */}
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${isPositive
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
            : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
            <ArrowUpRight className={`w-3.5 h-3.5 ${!isPositive ? "rotate-180" : ""}`} />
            {isPositive ? "+" : ""}{changePercent.toFixed(1)}%
          </div>
        </div>

        {/* Main Amount */}
        <div className="mb-6">
          <div className="flex items-end gap-2">
            <span className="text-white/30 text-2xl font-light self-start mt-2">$</span>
            <span className="text-white font-black tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)", lineHeight: 1, textShadow: "0 0 40px rgba(255,84,27,0.25)" }}>
              {amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Divider with orange glow */}
        <div className="h-px mb-5 rounded-full"
          style={{ background: "linear-gradient(to right, transparent, rgba(255,84,27,0.4), rgba(255,122,61,0.6), rgba(255,84,27,0.4), transparent)" }} />

        {/* Footer stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Won", value: "34" },
            { label: "Win Rate", value: "68%" },
            { label: "Avg Gain", value: "+$37" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5">
              <span className="text-white/35 text-[10px] font-semibold uppercase tracking-widest">{stat.label}</span>
              <span className="text-white text-base font-bold">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
