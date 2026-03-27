"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

type ButtonVariant = "yes" | "no" | "primary" | "ghost";

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
  pulse?: boolean; // legacy prop, ignored
  className?: string;
}

const STYLES: Record<ButtonVariant, string> = {
  yes:     "bg-[#22C55E] text-white hover:bg-[#16a34a] active:bg-[#15803d]",
  no:      "bg-[#EF4444] text-white hover:bg-[#dc2626] active:bg-[#b91c1c]",
  primary: "bg-primary text-white hover:bg-[#e55a30] active:bg-[#cc4f29]",
  ghost:   "bg-transparent text-white border border-white/15 hover:bg-white/6 hover:border-white/25 active:bg-white/10",
};

export function GlowButton({
  variant = "ghost",
  children,
  className = "",
  disabled,
  pulse: _pulse,
  ...props
}: GlowButtonProps) {
  return (
    <button
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-[8px] px-3 py-1 text-xs font-bold h-8",
        "transition-all duration-150 select-none",
        /* Subtle press micro-interaction */
        "active:scale-[0.97]",
        STYLES[variant],
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
