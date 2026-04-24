"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MarketCard } from "@/components/markets/MarketCard";
import { LeaderboardSection } from "@/components/home/LeaderboardSection";
import { Footer } from "@/components/layout/Footer";
import { SearchModal } from "@/components/SearchModal";
import { BitsTabs } from "@/components/ui/bits/BitsTabs";
import { MarketCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWallet, type Market } from "@/app/context/WalletContext";

/**
 * NEXORA home feed.
 *
 * Pulls live markets from WalletContext (driven by /api/markets + SSE),
 * not the old hardcoded SECTIONS. Layout is hybrid by design:
 *
 *   - mobile (<640px): single column, big cards, one market per row
 *   - tablet (640-1024px): 2-column grid
 *   - desktop (1024-1280px): 3-column grid
 *   - wide (>1280px): 4-column grid — density matches Polymarket
 *
 * Two virtual sections, computed client-side from the live data:
 *   - Hot — top 4 by volume
 *   - Closing Soon — next 4 by nearest endTime
 * Everything else flows into a "More Markets" grid below.
 * Categories filter the entire feed.
 */

const CATEGORIES = ["All", "Crypto", "Sports", "Politics", "Tech", "Economy", "Science"];

export default function Home() {
  const { markets, isLoading } = useWallet();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Live-data-driven sections. Memoised so we don't re-sort on every
  // render of the (frequently updating) markets array.
  const { hot, closing, rest, hasAnyInCategory } = useMemo(() => {
    const filtered =
      activeTab === "All"
        ? markets
        : markets.filter((m) => m.category?.toLowerCase() === activeTab.toLowerCase());

    const open = filtered.filter((m) => m.status === "OPEN");
    const resolved = filtered.filter((m) => m.status !== "OPEN");

    const byVolume = [...open].sort((a, b) => b.volumeAmount - a.volumeAmount);
    const topByVolume = byVolume.slice(0, 4);
    const topIds = new Set(topByVolume.map((m) => m.id));

    const byEnd = [...open]
      .filter((m) => !topIds.has(m.id))
      .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
    const closingSoon = byEnd.slice(0, 4);
    const closingIds = new Set(closingSoon.map((m) => m.id));

    const remainder = [
      ...open.filter((m) => !topIds.has(m.id) && !closingIds.has(m.id)),
      ...resolved,
    ];

    return {
      hot: topByVolume,
      closing: closingSoon,
      rest: remainder,
      hasAnyInCategory: filtered.length > 0,
    };
  }, [markets, activeTab]);

  const showingSkeleton = isLoading && markets.length === 0;

  return (
    <>
      <div className="space-y-10 animate-in fade-in duration-500 pb-20">
        {/* Mobile search (desktop users use Cmd+K / header search) */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="relative w-full bg-[#121217] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-neutral-500 text-left hover:border-white/10 transition-colors"
            aria-label="Open search"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            Search markets…
          </button>
        </div>

        {/* Header + category tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Markets
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Prediction markets on crypto, sports, politics, and more.
            </p>
          </div>
          <BitsTabs
            tabs={CATEGORIES.map((c) => ({ id: c, label: c }))}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {showingSkeleton ? (
          <SkeletonGrid />
        ) : !hasAnyInCategory ? (
          <EmptyState
            icon={Search}
            title={`No ${activeTab.toLowerCase()} markets yet`}
            description={
              activeTab === "All"
                ? "Markets will appear here as admins create them."
                : `Nothing in ${activeTab} right now. Try another category.`
            }
            action={
              activeTab !== "All"
                ? { label: "Show all markets", onClick: () => setActiveTab("All") }
                : undefined
            }
          />
        ) : (
          <div className="space-y-10">
            {/* Show section headers only when the grid actually needs
                structuring — with very few markets total, one plain grid
                reads better than three labelled sections of 2 each. */}
            {hot.length + closing.length + rest.length < 6 ? (
              <FeedSection title={null} markets={[...hot, ...closing, ...rest]} />
            ) : (
              <>
                {hot.length > 0 && (
                  <FeedSection title="Most traded" markets={hot} />
                )}
                {closing.length > 0 && (
                  <FeedSection title="Ending this week" markets={closing} />
                )}
                {rest.length > 0 && (
                  <FeedSection title={hot.length + closing.length > 0 ? "All markets" : null} markets={rest} />
                )}
              </>
            )}
          </div>
        )}

        <LeaderboardSection />
      </div>

      <Footer />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

function FeedSection({
  title,
  markets,
}: {
  title: string | null;
  markets: Market[];
}) {
  return (
    <section className="space-y-4">
      {title && (
        <h2 className="text-base font-semibold text-white/70">{title}</h2>
      )}

      {/* Hybrid grid: mobile 1 col · tablet 2 · laptop 3 · wide 4 */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {markets.map((m) => (
          <MarketCard
            key={m.id}
            id={m.id}
            slug={m.slug}
            title={m.question}
            category={m.category}
            // Omit volume entirely when we don't have it — better than a
            // placeholder character on every single card.
            volume={m.volumeAmount > 0 ? `$${formatCompact(m.volumeAmount)} vol` : undefined}
            yesPrice={m.yesPrice}
            noPrice={m.noPrice}
            yesChangeBps={m.yesChangeBps}
            noChangeBps={m.noChangeBps}
            status={m.status}
            winningOutcome={m.winningOutcome}
            endTime={m.endTime}
            image={m.imageUrl ?? undefined}
          />
        ))}
      </div>
    </section>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <MarketCardSkeleton key={i} />
      ))}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}
