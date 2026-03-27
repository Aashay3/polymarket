"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BitsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "yes" | "no";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function BitsButton({ 
  variant = "primary", 
  size = "md", 
  className, 
  children, 
  ...props 
}: BitsButtonProps) {
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary/90 shadow-sm",
    secondary: "bg-secondary text-white hover:bg-secondary/80 border border-white/10",
    outline: "bg-transparent border border-white/10 text-white hover:bg-white/5",
    ghost: "bg-transparent text-muted-foreground hover:text-white hover:bg-white/5",
    yes: "bg-yes text-white hover:bg-yes/90 shadow-sm",
    no: "bg-no text-white hover:bg-no/90 shadow-sm",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
