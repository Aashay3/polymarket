"use client";

import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";

interface MarketCardProps {
  id?: string;
  title: string;
  category: string;
  volume: string;
  yesPrice: number;
  noPrice: number;
  image?: string;
}

export function MarketCard({ id = "1", title, category, volume, yesPrice, noPrice, image }: MarketCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/market/${id}`);
  };

  const handleTradeClick = (e: React.MouseEvent, type: "YES" | "NO") => {
    e.stopPropagation();
    router.push(`/market/${id}?trade=${type}`);
  };

  return (
    <BitsCard
      hover
      className="p-5 flex flex-col h-full group cursor-pointer border-white/5 hover:border-white/10 transition-all active:scale-[0.98]"
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          {image && (
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/5 border border-white/5 shrink-0">
              <img src={image} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
          <div>
            <span className="text-[11px] font-bold text-muted-foreground tracking-[0.08em] uppercase block mb-0.5">
              {category}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40">
              <TrendingUp className="w-3 h-3" />
              <span>{volume}</span>
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-15px md:text-16px font-semibold text-white leading-snug mb-6 flex-1 group-hover:text-primary transition-colors">
        {title}
      </h3>

      <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/5">
        <BitsButton
          variant="yes"
          onClick={(e) => handleTradeClick(e, "YES")}
          className="flex-1 justify-between h-9 px-4 rounded-xl font-bold"
        >
          <span>Yes</span><span>{yesPrice}¢</span>
        </BitsButton>
        <BitsButton
          variant="no"
          onClick={(e) => handleTradeClick(e, "NO")}
          className="flex-1 justify-between h-9 px-4 rounded-xl font-bold"
        >
          <span>No</span><span>{noPrice}¢</span>
        </BitsButton>
      </div>
    </BitsCard>
  );
}
