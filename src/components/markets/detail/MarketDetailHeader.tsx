"use client";

import { Share2, Bookmark, TrendingUp } from "lucide-react";
import { BitsButton } from "@/components/ui/bits/BitsButton";

interface MarketDetailHeaderProps {
  title: string;
  category: string;
  volume: string;
  image?: string;
}

export function MarketDetailHeader({ title, category, volume, image }: MarketDetailHeaderProps) {
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
        <BitsButton variant="secondary" className="w-10 h-10 p-0 rounded-xl flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white/70" />
        </BitsButton>
        <BitsButton variant="secondary" className="w-10 h-10 p-0 rounded-xl flex items-center justify-center">
            <Bookmark className="w-4 h-4 text-white/70" />
        </BitsButton>
        <BitsButton variant="primary" className="h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-widest hidden md:flex">
            Follow Market
        </BitsButton>
      </div>
    </div>
  );
}
