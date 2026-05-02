"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Search, SearchX, ArrowUpDown } from "lucide-react";
import { CategoryChips } from "@/components/markets/CategoryChips";
import { MarketCard } from "@/components/markets/MarketCard";
import { MarketCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Trending markets — full filterable / sortable list with cursor-paginated
 * infinite scroll.
 *
 * Bypasses WalletContext (which only loads the first 100 markets at app
 * startup) and pages /api/markets directly so users can scroll past the
 * initial slice. Live SSE updates are sacrificed on rows past the first
 * page — fine for a discovery list since prices on a market detail page
 * are still authoritative.
 *
 * Sort mapping:
 *   volume / newest → API createdAt desc (volume isn't denormalised yet,
 *                     so this is a placeholder that matches the rest of
 *                     the app's behaviour)
 *   ending          → API endTime asc
 *   movers          → API createdAt desc + client-side re-sort by 24h
 *                     change magnitude across the loaded pages
 */

type SortKey = "volume" | "movers" | "ending" | "newest";

const SORTS: {
  id: SortKey;
  label: string;
  api: { sort: "createdAt" | "endTime"; order: "asc" | "desc" };
}[] = [
  { id: "volume", label: "Most traded",     api: { sort: "createdAt", order: "desc" } },
  { id: "movers", label: "Biggest movers",  api: { sort: "createdAt", order: "desc" } },
  { id: "ending", label: "Ending soonest",  api: { sort: "endTime",   order: "asc"  } },
  { id: "newest", label: "Newest",          api: { sort: "createdAt", order: "desc" } },
];

const PAGE_SIZE = 18;

interface MarketDTO {
  id: string;
  slug: string;
  question: string;
  description: string;
  rules: string;
  category: string;
  imageUrl: string | null;
  yesShares: string;
  noShares: string;
  yesPrice: string;
  noPrice: string;
  feeBps: number;
  status: "OPEN" | "CLOSED" | "RESOLVED" | "VOIDED";
  winningOutcome: "YES" | "NO" | null;
  endTime: string;
  yesChangeBps?: number | null;
  noChangeBps?: number | null;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function TrendingPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("volume");
  const [search, setSearch] = useState<string>("");
  const debouncedSearch = useDebounced(search, 300);

  // Composite key — when this changes, the fetched list resets.
  const fetchKey = `${sort}|${activeCategory}|${debouncedSearch}`;

  const [items, setItems] = useState<MarketDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pagingStatus, setPagingStatus] = useState<"idle" | "loading">("idle");

  // React-19 "derive during render" reset — when filters change, drop
  // the cached page list before the next render so the effect that
  // refetches sees an empty starting point.
  const [prevKey, setPrevKey] = useState(fetchKey);
  if (fetchKey !== prevKey) {
    setPrevKey(fetchKey);
    setItems([]);
    setCursor(null);
    setHasMore(true);
    setErrorMsg(null);
    setPagingStatus("idle");
  }

  // Cancel in-flight fetches when filters change mid-request.
  const fetchSeq = useRef(0);

  // First-page fetcher. setState only inside callbacks so the effect
  // body itself is side-effect-free at the React level (lints clean).
  useEffect(() => {
    const seq = ++fetchSeq.current;
    const sortDef = SORTS.find((s) => s.id === sort)!;
    const params = new URLSearchParams({
      status: "OPEN",
      sort: sortDef.api.sort,
      order: sortDef.api.order,
      limit: String(PAGE_SIZE),
    });
    if (activeCategory !== "All") params.set("category", activeCategory);
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

    fetch(`/api/markets?${params.toString()}`)
      .then((r) => r.json())
      .then((body) => {
        if (seq !== fetchSeq.current) return;
        if (!body.ok) {
          setErrorMsg(body.error?.message ?? "Failed to load");
          return;
        }
        setItems(body.data.markets);
        setCursor(body.data.nextCursor);
        setHasMore(body.data.nextCursor !== null);
      })
      .catch((e) => {
        if (seq !== fetchSeq.current) return;
        setErrorMsg(e instanceof Error ? e.message : "Network error");
      });
  }, [fetchKey, sort, activeCategory, debouncedSearch]);

  // Initial-loading is derived: nothing fetched yet, no error, and the
  // server might still have a page (hasMore stays true until a fetch
  // returns nextCursor=null).
  const initialLoading =
    items.length === 0 && hasMore && errorMsg === null;

  // IntersectionObserver-driven next-page fetcher. setState calls live
  // inside the IO callback (an event handler), which is allowed.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || !cursor || pagingStatus === "loading") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        const seq = ++fetchSeq.current;
        setPagingStatus("loading");
        const sortDef = SORTS.find((s) => s.id === sort)!;
        const params = new URLSearchParams({
          status: "OPEN",
          sort: sortDef.api.sort,
          order: sortDef.api.order,
          limit: String(PAGE_SIZE),
          cursor,
        });
        if (activeCategory !== "All") params.set("category", activeCategory);
        if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

        fetch(`/api/markets?${params.toString()}`)
          .then((r) => r.json())
          .then((body) => {
            if (seq !== fetchSeq.current) return;
            setPagingStatus("idle");
            if (!body.ok) {
              setErrorMsg(body.error?.message ?? "Failed to load");
              return;
            }
            // Dedupe by id in case the server returns overlap.
            setItems((prev) => {
              const seen = new Set(prev.map((m) => m.id));
              const incoming = (body.data.markets as MarketDTO[]).filter(
                (m) => !seen.has(m.id),
              );
              return [...prev, ...incoming];
            });
            setCursor(body.data.nextCursor);
            setHasMore(body.data.nextCursor !== null);
          })
          .catch((e) => {
            if (seq !== fetchSeq.current) return;
            setPagingStatus("idle");
            setErrorMsg(e instanceof Error ? e.message : "Network error");
          });
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, hasMore, pagingStatus, sort, activeCategory, debouncedSearch]);

  // "Movers" sort happens client-side across the loaded set — the API
  // doesn't expose change magnitude as a sort key.
  const displayed = useMemo(() => {
    if (sort !== "movers") return items;
    return [...items].sort(
      (a, b) =>
        Math.abs(b.yesChangeBps ?? 0) - Math.abs(a.yesChangeBps ?? 0),
    );
  }, [items, sort]);

  const isInitialLoading = initialLoading;
  const isLoadingMore = pagingStatus === "loading";

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Flame className="w-6 h-6 text-primary" /> Trending markets
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">
          {items.length}
          {hasMore ? "+" : ""} active{" "}
          {items.length === 1 ? "market" : "markets"} · scroll for more
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
      {isInitialLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : errorMsg && items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Couldn't load markets"
          description={errorMsg ?? "Try again in a moment."}
          action={{
            label: "Retry",
            onClick: () => {
              // Re-trigger the fetcher by bumping a dummy state — the
              // simplest way is to reapply the current sort.
              setSort((s) => s);
            },
          }}
        />
      ) : displayed.length === 0 ? (
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((m) => (
              <MarketCard
                key={m.id}
                id={m.id}
                slug={m.slug}
                title={m.question}
                category={m.category}
                yesPrice={parseFloat(m.yesPrice)}
                noPrice={parseFloat(m.noPrice)}
                yesChangeBps={m.yesChangeBps}
                noChangeBps={m.noChangeBps}
                status={m.status}
                winningOutcome={m.winningOutcome ?? undefined}
                endTime={m.endTime}
                image={m.imageUrl ?? undefined}
              />
            ))}

            {/* Skeleton row while paging in more */}
            {isLoadingMore &&
              Array.from({ length: 3 }).map((_, i) => (
                <MarketCardSkeleton key={`pg-${i}`} />
              ))}
          </div>

          {/* IntersectionObserver target */}
          {hasMore && (
            <div
              ref={sentinelRef}
              aria-hidden
              className="h-12 flex items-center justify-center text-xs text-muted-foreground"
            >
              {isLoadingMore ? "Loading more…" : ""}
            </div>
          )}

          {!hasMore && items.length >= PAGE_SIZE && (
            <div className="text-center py-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              · End of list ·
            </div>
          )}

          {errorMsg && items.length > 0 && (
            <div className="text-center py-4 text-xs text-no font-semibold">
              Couldn&apos;t load more: {errorMsg}
            </div>
          )}
        </>
      )}
    </div>
  );
}
