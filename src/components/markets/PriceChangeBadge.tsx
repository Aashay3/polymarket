"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";

/**
 * Small pill showing a price's 24h percent change.
 *
 * Pass `bps` (basis points: 100 = 1.00%). `null` renders a neutral
 * "new" state since we don't have a 24h-old baseline yet. Zero renders
 * a flat grey pill.
 */
export function PriceChangeBadge({
  bps,
  size = "sm",
  className = "",
}: {
  bps: number | null | undefined;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const base =
    size === "md"
      ? "text-[11px] px-2 py-0.5"
      : size === "xs"
        ? "text-[9px] px-1.5 py-[1px]"
        : "text-[10px] px-1.5 py-0.5";
  const iconSize = size === "md" ? "w-3 h-3" : size === "xs" ? "w-2.5 h-2.5" : "w-2.5 h-2.5";

  if (bps === null || bps === undefined) {
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full font-bold tracking-wide bg-white/5 text-muted-foreground border border-white/10 ${base} ${className}`}>
        new
      </span>
    );
  }

  if (bps === 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full font-bold tracking-wide bg-white/5 text-muted-foreground border border-white/10 ${base} ${className}`}>
        <Minus className={iconSize} />0.0%
      </span>
    );
  }

  const positive = bps > 0;
  const pct = (Math.abs(bps) / 100).toFixed(1);
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-bold tracking-wide border ${base} ${className} ${
        positive
          ? "bg-yes/10 text-yes border-yes/20"
          : "bg-no/10 text-no border-no/20"
      }`}
    >
      {positive ? <ArrowUp className={iconSize} /> : <ArrowDown className={iconSize} />}
      {pct}%
    </span>
  );
}
