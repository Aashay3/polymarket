"use client";

import { useRouter } from "next/navigation";
import { TrendingUp, Clock } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { ProbabilityBar } from "./ProbabilityBar";
import { PriceBlock } from "./PriceBlock";

/**
 * NEXORA MarketCard — the signature element.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │ [CATEGORY]      [volume]  ● LIVE   │   ← meta strip
 *   │                                     │
 *   │ Will Bitcoin hit $100k by Dec?     │   ← question
 *   │                                     │
 *   │ [======== probability bar ========] │   ← animated, flashes on SSE
 *   │                                     │
 *   │ ┌────────────┐ ┌────────────┐      │
 *   │ │    58¢     │ │    42¢     │      │   ← HUGE signature prices
 *   │ │ YES ↗3.2%  │ │ NO  ↘3.2%  │      │      with integrated trend
 *   │ └────────────┘ └────────────┘      │
 *   └─────────────────────────────────────┘
 *
 * On OPEN markets the whole card gets a subtle 2.4s orange pulse-ring so
 * at a glance you see "this is live". RESOLVED / CLOSED markets are static.
 */
export interface MarketCardProps {
  id?: string;
  slug?: string;
  title: string;
  category: string;
  volume: string;
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

  const isLive = status === "OPEN";
  const isResolved = status === "RESOLVED";
  const endLabel = endTime ? formatRelativeEnd(endTime) : null;

  return (
    <BitsCard
      hover
      onClick={handleCardClick}
      className={`group relative p-5 flex flex-col h-full cursor-pointer border-white/5 hover:border-white/15 transition-all ${
        isLive ? "nexora-pulse" : ""
      }`}
    >
      {/* Meta strip */}
      <div className="flex items-start justify-between mb-3 gap-2">
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
          <div className="min-w-0">
            <p className="text-[10px] font-black text-white/50 tracking-[0.18em] uppercase truncate">
              {category}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40">
              <TrendingUp className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{volume}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          {isLive ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-[0.18em] uppercase text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary nexora-live-dot" />
              Live
            </span>
          ) : isResolved ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-[0.18em] uppercase text-muted-foreground">
              {winningOutcome ? `${winningOutcome} WON` : "Resolved"}
            </span>
          ) : (
            <span className="text-[9px] font-black tracking-[0.18em] uppercase text-muted-foreground">
              {status}
            </span>
          )}
          {endLabel && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-white/30">
              <Clock className="w-2.5 h-2.5" />
              {endLabel}
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <h3 className="text-[15px] md:text-base font-semibold text-white leading-snug mb-4 flex-1 group-hover:text-primary transition-colors line-clamp-3">
        {title}
      </h3>

      {/* Animated probability bar — flashes on SSE updates */}
      <div className="mb-4">
        <ProbabilityBar yesPrice={yesFrac} noPrice={noFrac} size="sm" showLabels={false} />
      </div>

      {/* Signature price blocks */}
      {isResolved ? (
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/3 py-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">
            Resolved
          </p>
          <p className={`text-lg font-black ${winningOutcome === "YES" ? "text-yes" : "text-no"}`}>
            {winningOutcome ?? "VOID"}
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
 * "2d" / "3h" / "45m" relative future time. Falls back to date for >14d.
 */
function formatRelativeEnd(iso: string): string | null {
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return "ended";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
