"use client";

import { useState } from "react";
import { Share2, Bookmark, BookmarkCheck, TrendingUp, Check } from "lucide-react";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { useToast } from "@/app/context/ToastContext";

interface MarketDetailHeaderProps {
  title: string;
  category: string;
  volume: string;
  image?: string;
}

export function MarketDetailHeader({ title, category, volume, image }: MarketDetailHeaderProps) {
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
        // User cancelled — fall through to clipboard.
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

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
      <div className="flex items-start gap-5">
        {image && (
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/5 border border-white/5 shrink-0 select-none">
            <img src={image} alt="" className="w-full h-full object-cover opacity-90" />
          </div>
        )}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
              {category}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{volume} Total Volume</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight max-w-2xl tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
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
          {bookmarked ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4 text-white/70" />}
        </BitsButton>
        <BitsButton
          variant={following ? "secondary" : "primary"}
          onClick={toggleFollow}
          aria-pressed={following}
          className="h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-widest hidden md:flex"
        >
          {following ? (
            <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Following</span>
          ) : (
            "Follow Market"
          )}
        </BitsButton>
      </div>
    </div>
  );
}
