"use client";

import { useState } from "react";
import {
  Share2,
  Bookmark,
  BookmarkCheck,
  Check,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Users,
  Droplet,
} from "lucide-react";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { useToast } from "@/app/context/ToastContext";

interface MarketDetailHeaderProps {
  title: string;
  category: string;
  volume: number;
  liquidity: number;
  endTime: string;
  yesChangeBps?: number | null;
  image?: string | null;
}

export function MarketDetailHeader({
  title,
  category,
  volume,
  liquidity,
  endTime,
  yesChangeBps,
  image,
}: MarketDetailHeaderProps) {
  const { toast } = useToast();
  const [bookmarked, setBookmarked] = useState(false);
  const [following, setFollowing] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ type: "success", title: "Link copied", description: "Market URL copied to your clipboard." });
    } catch {
      toast({ type: "error", title: "Share failed", description: "Could not copy the link." });
    }
  };

  const toggleBookmark = () => {
    setBookmarked((prev) => {
      const next = !prev;
      toast({ type: next ? "success" : "info", title: next ? "Bookmarked" : "Removed from bookmarks" });
      return next;
    });
  };

  const toggleFollow = () => {
    setFollowing((prev) => {
      const next = !prev;
      toast({ type: next ? "success" : "info", title: next ? "Following market" : "Unfollowed", description: next ? "You'll be notified of major changes." : undefined });
      return next;
    });
  };

  const change = yesChangeBps != null ? yesChangeBps / 100 : null;
  const changeUp = change != null && change >= 0;

  return (
    <div className="space-y-6">
      {/* ── Hero row: image + title + actions ──────────────── */}
      <div className="flex items-start gap-5">
        {image && (
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0 select-none">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Meta line — sits above the title */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              {category}
            </span>
            {change != null && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                  changeUp
                    ? "bg-yes/10 text-yes"
                    : "bg-no/10 text-no"
                }`}
              >
                {changeUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {changeUp ? "+" : ""}
                {change.toFixed(1)}%
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-[2.25rem] font-black text-white leading-[1.1] tracking-tight">
            {title}
          </h1>
        </div>

        {/* Actions — pinned right, can't get squeezed */}
        <div className="flex items-center gap-2 shrink-0">
          <BitsButton
            variant="secondary"
            onClick={handleShare}
            aria-label="Share this market"
            className="w-10 h-10 p-0 rounded-xl flex items-center justify-center"
          >
            <Share2 className="w-4 h-4 text-white/70" />
          </BitsButton>
          <BitsButton
            variant="secondary"
            onClick={toggleBookmark}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark market"}
            aria-pressed={bookmarked}
            className="w-10 h-10 p-0 rounded-xl flex items-center justify-center"
          >
            {bookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-primary" />
            ) : (
              <Bookmark className="w-4 h-4 text-white/70" />
            )}
          </BitsButton>
          <BitsButton
            variant={following ? "secondary" : "primary"}
            onClick={toggleFollow}
            aria-pressed={following}
            className="h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-widest hidden md:flex"
          >
            {following ? (
              <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Following</span>
            ) : (
              "Follow"
            )}
          </BitsButton>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          icon={<BarChart3 className="w-3.5 h-3.5" />}
          label="Volume"
          value={`$${formatCompact(volume)}`}
        />
        <Stat
          icon={<Droplet className="w-3.5 h-3.5" />}
          label="Liquidity"
          value={`$${formatCompact(liquidity)}`}
        />
        <Stat
          icon={<Users className="w-3.5 h-3.5" />}
          label="Traders"
          value={formatCompact(Math.max(1, Math.round(volume / 250)))}
        />
        <Stat
          icon={<Clock className="w-3.5 h-3.5" />}
          label="Resolves"
          value={resolvesIn(endTime)}
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
        {icon}
        {label}
      </div>
      <p className="text-base font-black text-white tabular-nums">{value}</p>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}

function resolvesIn(endTime: string): string {
  const end = new Date(endTime).getTime();
  if (Number.isNaN(end)) return "—";
  const diff = end - Date.now();
  if (diff <= 0) return "Resolved";
  const days = Math.floor(diff / 86_400_000);
  if (days >= 365) return `${Math.floor(days / 365)}y`;
  if (days >= 60) return `${Math.floor(days / 30)}mo`;
  if (days >= 7) return `${Math.floor(days / 7)}w`;
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(diff / 3_600_000);
  return `${hours}h`;
}
