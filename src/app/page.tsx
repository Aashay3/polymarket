"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MarketCard } from "@/components/markets/MarketCard";
import { LeaderboardSection } from "@/components/home/LeaderboardSection";
import { HeroStrip } from "@/components/home/HeroStrip";
import { HomeSidebar } from "@/components/home/HomeSidebar";
import { Footer } from "@/components/layout/Footer";
import { SearchModal } from "@/components/SearchModal";
import { BitsTabs } from "@/components/ui/bits/BitsTabs";
import { MarketCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWallet, type Market } from "@/app/context/WalletContext";

/**
 * NEXORA home feed.
 *
 * Structure:
 *   - HeroStrip — 3 gradient category banners, full-width
 *   - Main feed + sidebar (sidebar only on xl+ screens)
 *   - Leaderboard
 *
 * Feed columns collapse so the sidebar has room on xl+:
 *   - mobile: 1 col, no sidebar
 *   - tablet: 2 col, no sidebar
 *   - laptop: 3 col, no sidebar
 *   - xl:     3 col main + sidebar rail (1080px-1279px)
 *   - wide:   3 col main + sidebar rail (1280px+)
 */

const CATEGORIES = ["All", "Crypto", "Sports", "Politics", "Tech", "Economy", "Science"];

export default function Home() {
  const { markets, isLoading } = useWallet();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { hot, closing, rest, hasAnyInCategory } = useMemo(() => {
    const filtered =
      activeTab === "All"
        ? markets
        : markets.filter((m) => m.category?.toLowerCase() === activeTab.toLowerCase());

    const open = filtered.filter((m) => m.status === "OPEN");
    const resolved = filtered.filter((m) => m.status !== "OPEN");

    const byVolume = [...open].sort((a, b) => b.volumeAmount - a.volumeAmount);
    const topByVolume = byVolume.slice(0, 3);
    const topIds = new Set(topByVolume.map((m) => m.id));

    const byEnd = [...open]
      .filter((m) => !topIds.has(m.id))
      .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
    const closingSoon = byEnd.slice(0, 3);
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
        {/* Mobile search */}
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

        {/* Display headline + hero strip */}
        <div className="space-y-5">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.05]">
              Markets on anything<br className="hidden md:block" />
              <span className="text-white/40"> that matters.</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-xl">
              Prediction markets let the crowd price uncertainty. Buy the outcome you think is right. Get paid if you&apos;re correct.
            </p>
          </div>
          <HeroStrip />
        </div>

        {/* Main two-column region: feed + optional sidebar */}
        <div className="grid xl:grid-cols-[1fr_320px] gap-8">
          {/* ── Main column: tabs + feed ───────────────────────── */}
          <div className="space-y-6 min-w-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <h2 className="text-xl font-bold text-white">Live markets</h2>
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
                {hot.length + closing.length + rest.length < 6 ? (
                  <FeedSection title={null} markets={[...hot, ...closing, ...rest]} />
                ) : (
                  <>
                    {hot.length > 0 && <FeedSection title="Most traded" markets={hot} />}
                    {closing.length > 0 && <FeedSection title="Ending this week" markets={closing} />}
                    {rest.length > 0 && (
                      <FeedSection
                        title={hot.length + closing.length > 0 ? "All markets" : null}
                        markets={rest}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar (xl+ only) ──────────────────────────────── */}
          <div className="hidden xl:block">
            <div className="sticky top-[80px]">
              <HomeSidebar />
            </div>
          </div>
        </div>

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
      {title && <h3 className="text-base font-semibold text-white/70">{title}</h3>}
      {/* Fewer columns when sidebar is present — max 3 in main column */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {markets.map((m) => (
          <MarketCard
            key={m.id}
            id={m.id}
            slug={m.slug}
            title={m.question}
            category={m.category}
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
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
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
