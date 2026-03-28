"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BitsCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function BitsCard({ children, className, hover = false, onClick }: BitsCardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? { y: -4 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      className={cn(
        "bg-[#121217] border border-white/8 rounded-xl overflow-hidden transition-colors",
        hover && "hover:border-white/20",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
