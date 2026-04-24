"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  // Legacy props — silently ignored so existing imports don't break
  tilt?: boolean;
  glow?: boolean;
}

export function GlassCard({ children, className = "", hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        "relative group bg-[#121217] border border-white/8 rounded-[16px] overflow-hidden",
        "transition-all duration-300 ease-out",
        hover
          ? [
              "cursor-pointer",
              "hover:bg-[#1a1a21] hover:border-white/12",
              "hover:-translate-y-[3px] hover:shadow-[0_12px_24px_rgba(0,0,0,0.3)]",
              "active:scale-[0.98]",
            ].join(" ")
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Subtle 135deg Background Gradient Hint */}
      <div className="absolute inset-0 bg-linear-135 from-[#8B5CF6]/12 to-transparent opacity-60 pointer-events-none" />
      
      {/* Subtle Light Reflection (Top-Left) */}
      <div className="absolute inset-0 bg-linear-to-br from-white/4 to-transparent pointer-events-none" />
      
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
