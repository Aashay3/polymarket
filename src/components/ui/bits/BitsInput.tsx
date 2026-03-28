"use client";

import React from "react";

interface BitsInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: string;
}

export function BitsInput({ label, error, suffix, className = "", ...props }: BitsInputProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <input
          className={`
            w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600
            transition-all duration-200 outline-none
            focus:border-primary/40 focus:bg-white/[0.05]
            hover:border-white/10
            ${error ? "border-red-500/50" : ""}
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none group-focus-within:text-white transition-colors">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="text-[10px] text-red-400 ml-1 font-medium">{error}</p>}
    </div>
  );
}
