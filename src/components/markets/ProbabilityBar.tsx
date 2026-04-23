"use client";

import { useEffect, useState } from "react";

/**
 * Probability bar that animates YES/NO widths smoothly and flashes a
 * brief highlight when the values update (SSE live updates).
 *
 * Accepts fractional prices in [0, 1]; they should sum to ~1. If
 * `yesPrice` jumps between renders we flash green; drops flash red.
 * Uses React's "derive state from previous render" pattern to detect
 * changes without a setState-in-effect (lint rule).
 */
export function ProbabilityBar({
  yesPrice,
  noPrice,
  size = "md",
  showLabels = true,
}: {
  yesPrice: number;
  noPrice: number;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}) {
  const [prevYes, setPrevYes] = useState(yesPrice);
  const [flashDir, setFlashDir] = useState<"up" | "down" | null>(null);

  if (yesPrice !== prevYes) {
    setPrevYes(yesPrice);
    setFlashDir(yesPrice > prevYes ? "up" : "down");
  }

  useEffect(() => {
    if (flashDir === null) return;
    const t = setTimeout(() => setFlashDir(null), 700);
    return () => clearTimeout(t);
  }, [flashDir]);

  const yesPct = Math.max(0, Math.min(100, yesPrice * 100));
  const noPct = Math.max(0, Math.min(100, noPrice * 100));

  const h = size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2";
  const label = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="w-full">
      <div
        className={`w-full ${h} rounded-full overflow-hidden bg-no/15 relative transition-shadow duration-500 ${
          flashDir === "up"
            ? "shadow-[0_0_12px_rgba(74,222,128,0.5)]"
            : flashDir === "down"
              ? "shadow-[0_0_12px_rgba(248,113,113,0.5)]"
              : ""
        }`}
        aria-label={`YES ${yesPct.toFixed(1)}% / NO ${noPct.toFixed(1)}%`}
      >
        <div
          className="h-full bg-yes transition-all duration-500 ease-out"
          style={{ width: `${yesPct}%` }}
        />
      </div>
      {showLabels && (
        <div className={`flex justify-between mt-1.5 font-mono font-bold ${label}`}>
          <span className="text-yes">YES {yesPct.toFixed(1)}%</span>
          <span className="text-no">NO {noPct.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
