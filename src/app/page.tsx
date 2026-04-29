"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { MarketCard } from "@/components/markets/MarketCard";
import { CategoryChips } from "@/components/markets/CategoryChips";
import { LeaderboardSection } from "@/components/home/LeaderboardSection";
import { HeroStrip } from "@/components/home/HeroStrip";
import { CategoryCarousel } from "@/components/home/CategoryCarousel";
import { TradeTicker } from "@/components/home/TradeTicker";
import { TopMovers } from "@/components/home/TopMovers";
import { ClosingToday } from "@/components/home/ClosingToday";
import { CoinFlip } from "@/components/home/CoinFlip";
import { EditorialPicks } from "@/components/home/EditorialPicks";
import { CrowdVsReality } from "@/components/home/CrowdVsReality";
import { ForYou } from "@/components/home/ForYou";
import { PositionsMoving } from "@/components/home/PositionsMoving";
import { StreakBanner } from "@/components/home/StreakBanner";
import { Footer } from "@/components/layout/Footer";
import { SearchModal } from "@/components/SearchModal";
import { MarketCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWallet, type Market } from "@/app/context/WalletContext";

// Order in which category sections appear under "All". Mirrors the
// CategoryCarousel above so the page reads top-to-bottom consistently.
const CATEGORY_ORDER = [
  "Politics",
  "Sports",
  "Crypto",
  "Tech",
  "Economy",
  "Science",
  "Entertainment",
  "World",
];

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

export default function Home() {
  // useSearchParams needs a Suspense boundary so the page can stream
  // its initial render even when the param resolves later. The boundary
  // is invisible — same skeleton the feed shows on first paint.
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const { markets, isLoading } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Active category is driven by the URL `?category=X` so links from
  // the hero, category carousel, and per-section "View all" land on a
  // genuinely filtered feed. Unknown / missing param falls back to "All".
  const categoryParam = searchParams.get("category");
  const activeTab = useMemo(() => {
    if (!categoryParam) return "All";
    const found = [...CATEGORY_ORDER].find(
      (c) => c.toLowerCase() === categoryParam.toLowerCase(),
    );
    return found ?? "All";
  }, [categoryParam]);

  const setActiveTab = useCallback(
    (next: string) => {
      const target = next === "All" ? "/" : `/?category=${encodeURIComponent(next)}`;
      // replace, not push — avoids cluttering the back button with
      // every filter toggle. `scroll: false` keeps the user's spot.
      router.replace(target, { scroll: false });
    },
    [router],
  );

  // Whenever the active filter changes via URL, scroll the feed back
  // up so the user lands on the top of the filtered section instead
  // of mid-page from where they clicked.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (categoryParam) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [categoryParam]);

  const { hot, closing, byCategory, rest, hasAnyInCategory } = useMemo(() => {
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

    // Group remaining open markets by category (excluding already-shown
    // hot + closing). Used to render per-category sections under "All".
    const remaining = open.filter((m) => !topIds.has(m.id) && !closingIds.has(m.id));
    const grouped = new Map<string, Market[]>();
    for (const m of remaining) {
      const arr = grouped.get(m.category) ?? [];
      arr.push(m);
      grouped.set(m.category, arr);
    }

    return {
      hot: topByVolume,
      closing: closingSoon,
      byCategory: grouped,
      rest: resolved,
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

        <HeroStrip />

        <CategoryCarousel />

        {/* Main feed region — full-width, no sidebar. */}
        <div>
          <div className="space-y-6 min-w-0">
            <h2 className="text-xl font-bold text-white">Live markets</h2>
            <CategoryChips active={activeTab} onChange={setActiveTab} />

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
              <div className="space-y-12">
                {/* Personalized + alert sections — only render under "All"
                    so they don't appear twice when the user filters. They
                    silently hide themselves when there's nothing to show
                    or the user is signed out. */}
                {activeTab === "All" && (
                  <>
                    <PositionsMoving />
                    <ForYou />
                    <TradeTicker />
                    <TopMovers />
                    <ClosingToday />
                    <CoinFlip />
                    <EditorialPicks />
                  </>
                )}

                {hot.length > 0 && <FeedSection title="Most traded" markets={hot} />}
                {closing.length > 0 && (
                  <FeedSection title="Ending this week" markets={closing} />
                )}

                {/* Per-category sections — only when on "All". When the
                    user is filtering, these would just duplicate the
                    section title, so collapse into a single "More markets"
                    block below. */}
                {activeTab === "All"
                  ? CATEGORY_ORDER.flatMap((cat) => {
                      const ms = byCategory.get(cat);
                      if (!ms || ms.length === 0) return [];
                      // Inject the streak promo banner directly above the
                      // Tech section. Tied to the section so they appear
                      // and disappear together — avoids a stranded banner
                      // when Tech is empty.
                      const items: React.ReactNode[] = [];
                      if (cat === "Tech") {
                        items.push(<StreakBanner key="streak-banner" />);
                      }
                      items.push(
                        <FeedSection
                          key={cat}
                          title={cat}
                          markets={ms.slice(0, 3)}
                          viewAllHref={`/?category=${encodeURIComponent(cat)}`}
                        />,
                      );
                      return items;
                    })
                  : (() => {
                      const all = Array.from(byCategory.values()).flat();
                      return all.length > 0 ? (
                        <FeedSection
                          title={hot.length + closing.length > 0 ? "More markets" : null}
                          markets={all}
                        />
                      ) : null;
                    })()}

                {activeTab === "All" && <CrowdVsReality />}

                {rest.length > 0 && (
                  <FeedSection title="Resolved" markets={rest} />
                )}
              </div>
            )}
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
  viewAllHref,
}: {
  title: string | null;
  markets: Market[];
  viewAllHref?: string;
}) {
  return (
    <section className="space-y-4">
      {title && (
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-base font-semibold text-white/80">{title}</h3>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-0.5 text-xs font-bold text-white/50 hover:text-white transition-colors"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
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
