"use client";

import { useRouter } from "next/navigation";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { ProbabilityBar } from "./ProbabilityBar";
import { PriceBlock } from "./PriceBlock";

/**
 * NEXORA MarketCard.
 *
 * Deliberately restrained meta strip — category + optional volume on
 * the left, optional "ending soon" hint on the right. No status badge
 * (everything in the open grid is open; announcing "LIVE" on every
 * card is noise). Resolved markets replace the price blocks with a
 * clear winner panel.
 *
 * The liveness signal is the ProbabilityBar's flash-on-trade; no
 * resting pulse animation — if every card pulses, none does.
 */
export interface MarketCardProps {
  id?: string;
  slug?: string;
  title: string;
  category: string;
  /** Display string for volume. Omit (undefined) to hide the row entirely. */
  volume?: string;
  yesPrice: number; // accepts fractional 0..1 OR cents 0..100
  noPrice: number;
  yesChangeBps?: number | null;
  noChangeBps?: number | null;
  status?: "OPEN" | "CLOSED" | "RESOLVED" | "VOIDED";
  winningOutcome?: "YES" | "NO";
  endTime?: string;
  image?: string;
}

export function MarketCard({
  id,
  slug,
  title,
  category,
  volume,
  yesPrice,
  noPrice,
  yesChangeBps,
  noChangeBps,
  status = "OPEN",
  winningOutcome,
  endTime,
  image,
}: MarketCardProps) {
  const router = useRouter();
  const href = slug ?? id ?? "1";

  const handleCardClick = () => {
    router.push(`/market/${href}`);
  };

  const handleTradeClick = (e: React.MouseEvent, side: "YES" | "NO") => {
    e.stopPropagation();
    router.push(`/market/${href}?trade=${side}`);
  };

  // Accept both fractional (0..1) and cents (0..100) inputs.
  const yesFrac = yesPrice > 1 ? yesPrice / 100 : yesPrice;
  const noFrac = noPrice > 1 ? noPrice / 100 : noPrice;

  const isResolved = status === "RESOLVED";
  const endHint = endTime ? endingHint(endTime) : null;

  return (
    <BitsCard
      hover
      onClick={handleCardClick}
      className="group relative p-5 flex flex-col h-full cursor-pointer border-white/5 hover:border-white/15 transition-colors"
    >
      {/* Meta strip */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {image && (
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
              <img
                src={image}
                alt=""
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            </div>
          )}
          <div className="min-w-0 flex items-baseline gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{category}</span>
            {volume && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-xs text-white/40">{volume}</span>
              </>
            )}
          </div>
        </div>

        {endHint && (
          <span className={`shrink-0 text-[11px] font-medium ${endHint.urgent ? "text-amber-400" : "text-white/30"}`}>
            {endHint.label}
          </span>
        )}
      </div>

      {/* Question */}
      <h3 className="text-[15px] md:text-base font-semibold text-white leading-snug mb-4 flex-1 group-hover:text-primary transition-colors line-clamp-3">
        {title}
      </h3>

      {/* Probability bar — subtle at rest, flashes on live trades via SSE */}
      <div className="mb-4">
        <ProbabilityBar yesPrice={yesFrac} noPrice={noFrac} size="sm" showLabels={false} />
      </div>

      {/* Outcome blocks, or resolved panel */}
      {isResolved ? (
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/3 py-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Resolved</p>
          <p className={`text-base font-bold ${winningOutcome === "YES" ? "text-yes" : "text-no"}`}>
            {winningOutcome ?? "Voided"}
          </p>
        </div>
      ) : (
        <div className="mt-auto grid grid-cols-2 gap-2">
          <PriceBlock
            side="YES"
            price={yesFrac}
            changeBps={yesChangeBps}
            size="sm"
            disabled={status !== "OPEN"}
            onClick={(e) => handleTradeClick(e, "YES")}
          />
          <PriceBlock
            side="NO"
            price={noFrac}
            changeBps={noChangeBps}
            size="sm"
            disabled={status !== "OPEN"}
            onClick={(e) => handleTradeClick(e, "NO")}
          />
        </div>
      )}
    </BitsCard>
  );
}

/**
 * Show time-remaining ONLY when meaningful:
 *   - under 1h:  "43m left"   (amber, urgent)
 *   - under 24h: "7h left"    (amber)
 *   - under 7d:  "3d left"    (neutral)
 *   - further:   nothing      (a market ending in 8 months doesn't
 *                               need a badge on the card)
 */
function endingHint(iso: string): { label: string; urgent: boolean } | null {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return { label: "ended", urgent: false };

  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return { label: `${mins}m left`, urgent: true };

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { label: `${hrs}h left`, urgent: true };

  const days = Math.floor(hrs / 24);
  if (days < 7) return { label: `${days}d left`, urgent: false };

  return null;
}
