"use client";

import { useMemo, useState } from "react";
import { Flame, Search, SearchX, ArrowUpDown } from "lucide-react";
import { CategoryChips } from "@/components/markets/CategoryChips";
import { MarketCard } from "@/components/markets/MarketCard";
import { MarketCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useWallet, type Market } from "@/app/context/WalletContext";

/**
 * Trending markets — full filterable / sortable list. Pulls live data
 * from the wallet context (same SSE-fed source as the home feed) so
 * prices and volumes update in real time. Rendered with the global
 * MarketCard for consistency with the home grid.
 */

type SortKey = "volume" | "movers" | "ending" | "newest";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "volume", label: "Most traded" },
  { id: "movers", label: "Biggest movers" },
  { id: "ending", label: "Ending soonest" },
  { id: "newest", label: "Newest" },
];

export default function TrendingPage() {
  const { markets, isLoading } = useWallet();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("volume");
  const [search, setSearch] = useState<string>("");

  const filtered = useMemo<Market[]>(() => {
    const q = search.trim().toLowerCase();
    const open = markets.filter((m) => m.status === "OPEN");
    const byCategory =
      activeCategory === "All"
        ? open
        : open.filter(
            (m) => m.category?.toLowerCase() === activeCategory.toLowerCase(),
          );
    const bySearch = q
      ? byCategory.filter((m) => m.question.toLowerCase().includes(q))
      : byCategory;

    const arr = [...bySearch];
    switch (sort) {
      case "volume":
        arr.sort((a, b) => b.volumeAmount - a.volumeAmount);
        break;
      case "movers":
        arr.sort(
          (a, b) =>
            Math.abs(b.yesChangeBps ?? 0) - Math.abs(a.yesChangeBps ?? 0),
        );
        break;
      case "ending":
        arr.sort(
          (a, b) =>
            new Date(a.endTime).getTime() - new Date(b.endTime).getTime(),
        );
        break;
      case "newest":
        // No createdAt on Market — fall back to id order, which is roughly
        // creation order for cuid-style ids (lexical ≈ chronological).
        arr.sort((a, b) => (b.id < a.id ? -1 : 1));
        break;
    }
    return arr;
  }, [markets, activeCategory, sort, search]);

  const showingSkeleton = isLoading && markets.length === 0;
  const totalOpen = markets.filter((m) => m.status === "OPEN").length;

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Flame className="w-6 h-6 text-primary" /> Trending markets
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">
          {totalOpen} active {totalOpen === 1 ? "market" : "markets"} ·
          updated live
        </p>
      </div>

      {/* Search + sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prediction markets…"
            className="w-full bg-[#121217] border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:border-primary/30 transition-colors"
          />
        </div>

        {/* Sort selector — native select keeps it accessible and small. */}
        <div className="relative shrink-0">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none pl-9 pr-9 py-3 rounded-xl bg-[#121217] border border-white/5 hover:border-white/10 text-sm font-semibold text-white outline-none focus:border-primary/30 transition-colors cursor-pointer min-w-[180px]"
            aria-label="Sort markets"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#121217]">
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category chips */}
      <CategoryChips active={activeCategory} onChange={setActiveCategory} />

      {/* Grid */}
      {showingSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No markets match your filters"
          description="Try a different category or clear your search."
          action={
            search
              ? { label: "Clear search", onClick: () => setSearch("") }
              : activeCategory !== "All"
              ? { label: "Reset filters", onClick: () => setActiveCategory("All") }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <MarketCard
              key={m.id}
              id={m.id}
              slug={m.slug}
              title={m.question}
              category={m.category}
              volume={
                m.volumeAmount > 0
                  ? `$${formatCompact(m.volumeAmount)} vol`
                  : undefined
              }
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
      )}
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}
