"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BitsToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function BitsToggle({ 
  enabled, 
  onChange, 
  label, 
  description, 
  className,
  disabled = false
}: BitsToggleProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-bold text-white">{label}</span>}
          {description && <span className="text-[11px] text-muted-foreground mt-0.5">{description}</span>}
        </div>
      )}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed",
          enabled ? "bg-primary" : "bg-white/10"
        )}
      >
        <span className="sr-only">Toggle setting</span>
        <motion.span
          animate={{ x: enabled ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0"
          )}
        />
      </button>
    </div>
  );
}
