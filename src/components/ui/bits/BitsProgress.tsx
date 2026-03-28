"use client";

import { motion } from "framer-motion";

interface BitsProgressProps {
  value: number; // 0 to 100
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export function BitsProgress({ value, color = "bg-primary", height = 4, showLabel = false }: BitsProgressProps) {
  return (
    <div className="w-full space-y-1.5">
      {showLabel && (
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <span>Progress</span>
          <span className="text-white">{Math.round(value)}%</span>
        </div>
      )}
      <div 
        className="w-full bg-white/5 rounded-full overflow-hidden"
        style={{ height }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}
