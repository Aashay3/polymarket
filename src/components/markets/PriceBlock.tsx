"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

/**
 * NEXORA's signature price element.
 *
 * One tall block: huge cents value + side label + 24h trend arrow, all
 * tinted with the side's colour (yes/no). Designed to be the visual
 * anchor of every market card — no separate price and trend pills.
 *
 *   ┌───────────────┐
 *   │      58¢      │
 *   │  YES  ↗ 3.2%  │
 *   └───────────────┘
 *
 * `price` is fractional (0..1); we render it as cents rounded.
 * `changeBps` is the 24h change in basis points (100 = 1.00%); null
 * renders a neutral "new" pill.
 */
export function PriceBlock({
  side,
  price,
  changeBps,
  onClick,
  size = "md",
  disabled = false,
}: {
  side: "YES" | "NO";
  price: number; // 0..1
  changeBps: number | null | undefined;
  onClick?: (e: React.MouseEvent) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}) {
  const isYes = side === "YES";
  // Colour scheme: token accent on the border + low-opacity background,
  // full token colour on the big number.
  const tint = isYes
    ? "border-yes/25 bg-yes/5 hover:bg-yes/10 hover:border-yes/40 text-yes"
    : "border-no/25 bg-no/5 hover:bg-no/10 hover:border-no/40 text-no";

  const cents = Math.round(Math.max(0, Math.min(1, price)) * 100);

  // Sizing scale — sm is for compact rows, lg is for the detail page.
  const numSize = size === "lg" ? "text-5xl" : size === "sm" ? "text-2xl" : "text-3xl";
  const pad = size === "lg" ? "px-5 py-4" : size === "sm" ? "px-3 py-2" : "px-4 py-3";
  const labelSize = size === "lg" ? "text-xs" : "text-[10px]";

  const trend = renderTrend(changeBps, size);

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={`${side} ${cents}¢, ${changeBps !== null && changeBps !== undefined ? (changeBps >= 0 ? "up" : "down") + " " + Math.abs(changeBps / 100).toFixed(1) + "%" : "new"}`}
      className={`group relative ${pad} w-full rounded-2xl border transition-all ${tint} disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
    >
      <div className={`font-bold font-mono tabular-nums leading-none ${numSize}`}>
        {cents}
        <span className={`${size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base"} opacity-60 ml-0.5`}>¢</span>
      </div>
      <div className={`mt-2 flex items-center justify-between gap-2 ${labelSize} font-black uppercase tracking-[0.18em]`}>
        <span>{side}</span>
        {trend}
      </div>
    </button>
  );
}

function renderTrend(changeBps: number | null | undefined, size: "sm" | "md" | "lg") {
  const iconSize = size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3";

  if (changeBps === null || changeBps === undefined) {
    return <span className="opacity-60 font-bold">NEW</span>;
  }
  if (changeBps === 0) {
    return <span className="opacity-60 font-bold">FLAT</span>;
  }
  const positive = changeBps > 0;
  const pct = (Math.abs(changeBps) / 100).toFixed(1);
  return (
    <span className="inline-flex items-center gap-0.5 font-bold">
      {positive ? <ArrowUp className={iconSize} /> : <ArrowDown className={iconSize} />}
      {pct}%
    </span>
  );
}
