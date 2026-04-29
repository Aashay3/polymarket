"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Flame,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { CategoryChips } from "@/components/markets/CategoryChips";
import { MarketCard } from "@/components/markets/MarketCard";
import { MarketCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Footer } from "@/components/layout/Footer";
import { useWallet, type Market } from "@/app/context/WalletContext";
import { useEffect, useRef } from "react";

/**
 * Dedicated Sports landing — Lucky-Star-style. Shares data with the
 * home feed (one source of truth in the wallet context) but presents
 * Sports markets in a more curated, themed layout: hero banner, league
 * carousel, sub-tab filters, and a market grid.
 */

type Tab = "top" | "live" | "upcoming" | "all";

const TABS: { id: Tab; label: string; icon: typeof Trophy }[] = [
  { id: "top",      label: "Top",      icon: Flame },
  { id: "live",     label: "Live",     icon: Sparkles },
  { id: "upcoming", label: "Upcoming", icon: Clock },
  { id: "all",      label: "All",      icon: Trophy },
];

interface League {
  id: string;
  name: string;
  /** Gradient is shown until the image loads, and stays as the fallback
   *  if the image is missing or 404s. */
  gradient: string;
  image?: string;
  // Optional keyword to match against market questions/slugs so the chip
  // pre-filters the feed. Keeps the UI honest — a league chip that
  // doesn't match anything is hidden via the live count below.
  match?: string;
}

const LEAGUES: League[] = [
  { id: "ipl",       name: "IPL 2026",         gradient: "from-blue-600 to-cyan-500",      image: "/brand/leagues/ipl.png",       match: "ipl"           },
  { id: "nba",       name: "NBA",              gradient: "from-orange-500 to-red-600",     image: "/brand/leagues/nba.png",       match: "nba"           },
  { id: "nfl",       name: "NFL",              gradient: "from-red-700 to-blue-800",       image: "/brand/leagues/nfl.png",       match: "nfl"           },
  { id: "wc",        name: "World Cup",        gradient: "from-emerald-500 to-teal-600",   image: "/brand/leagues/wc.png",        match: "world cup"     },
  { id: "epl",       name: "Premier League",   gradient: "from-purple-700 to-fuchsia-800", image: "/brand/leagues/epl.png",       match: "premier league"},
  { id: "mls",       name: "MLS",              gradient: "from-violet-600 to-fuchsia-600", image: "/brand/leagues/mls.png",       match: "mls"           },
  { id: "csk",       name: "CSK",              gradient: "from-amber-500 to-yellow-600",   image: "/brand/leagues/csk.jpeg",      match: "csk"           },
  { id: "champions", name: "Champions League", gradient: "from-blue-700 to-indigo-700",    image: "/brand/leagues/champions.png", match: "champions"     },
  { id: "ufc",       name: "UFC",              gradient: "from-neutral-800 to-red-800",    image: "/brand/leagues/ufc.png",       match: "ufc"           },
  { id: "olympics",  name: "Olympics",         gradient: "from-amber-400 to-orange-600",   image: "/brand/leagues/olympics.png",  match: "olympic"       },
  { id: "f1",        name: "Formula 1",        gradient: "from-red-600 to-rose-800",       image: "/brand/leagues/f1.png",        match: "formula"       },
  { id: "motogp",    name: "MotoGP",           gradient: "from-orange-600 to-red-700",     image: "/brand/leagues/motogp.png",    match: "motogp"        },
];

export default function SportsPage() {
  const { markets, isLoading } = useWallet();
  const [tab, setTab] = useState<Tab>("top");
  const [activeLeague, setActiveLeague] = useState<string | null>(null);

  const sportsMarkets = useMemo(
    () => markets.filter((m) => m.category === "Sports"),
    [markets],
  );

  const filtered = useMemo<Market[]>(() => {
    let arr = sportsMarkets.filter((m) => m.status === "OPEN");

    // League filter — keyword match against question + slug.
    if (activeLeague) {
      const league = LEAGUES.find((l) => l.id === activeLeague);
      const kw = league?.match?.toLowerCase();
      if (kw) {
        arr = arr.filter(
          (m) =>
            m.question.toLowerCase().includes(kw) ||
            m.slug?.toLowerCase().includes(kw),
        );
      }
    }

    // Sub-tab filter — slices the same Sports list different ways.
    // Date.now() is intentionally read at memo time: the "upcoming"
    // window is "from now → next 7 days," which has to track the wall
    // clock; pinning it to mount would go stale.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    switch (tab) {
      case "top":
        arr = [...arr].sort((a, b) => b.volumeAmount - a.volumeAmount);
        break;
      case "live":
        // Use 24h change magnitude as a proxy for "moving right now."
        arr = arr.filter(
          (m) =>
            m.yesChangeBps !== null &&
            m.yesChangeBps !== undefined &&
            Math.abs(m.yesChangeBps) >= 50,
        );
        break;
      case "upcoming":
        arr = arr
          .filter((m) => {
            const end = new Date(m.endTime).getTime();
            return end > now && end - now <= weekMs;
          })
          .sort(
            (a, b) =>
              new Date(a.endTime).getTime() - new Date(b.endTime).getTime(),
          );
        break;
      case "all":
        arr = [...arr].sort(
          (a, b) =>
            new Date(a.endTime).getTime() - new Date(b.endTime).getTime(),
        );
        break;
    }
    return arr;
  }, [sportsMarkets, tab, activeLeague]);

  const showingSkeleton = isLoading && markets.length === 0;
  const totalOpen = sportsMarkets.filter((m) => m.status === "OPEN").length;

  return (
    <>
      <div className="space-y-8 pb-20">
      {/* ── Hero banner ──────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl ring-1 ring-emerald-400/20 bg-linear-to-br from-emerald-700 via-teal-700 to-green-950 p-7 md:p-10 min-h-[260px] flex flex-col justify-between">
        {/* Full-bleed sports artwork — multi-sport balls + trophy +
            stadium lights. Falls back to the gradient + lucide trophy
            below if the image is missing. */}
        <img
          src="/brand/sports_hero.png"
          alt=""
          aria-hidden
          draggable={false}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover"
        />
        {/* Left-side dark veil so the headline reads cleanly over the
            brightest part of the image. */}
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/60 via-black/20 to-transparent" />

        <div className="relative max-w-lg">
          <p className="text-[11px] font-black tracking-[0.25em] uppercase text-white/70 mb-3">
            Featured · Sports
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase leading-[0.95] tracking-tight mb-4">
            Bet every match,<br />every over
          </h1>
          <p className="text-sm md:text-base text-white/85 leading-snug max-w-md">
            Crowd-priced odds across cricket, football, basketball, and tennis —
            updated live by traders.
          </p>
        </div>

        <div className="relative mt-6">
          <span
            style={{ ["--glow" as string]: "52 211 153" }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-neutral-900 text-sm font-bold ring-2 ring-[rgb(var(--glow)/0.6)] shadow-[0_0_24px_4px_rgb(var(--glow)/0.55),0_0_48px_8px_rgb(var(--glow)/0.35)]"
          >
            {totalOpen} live markets
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </section>

      {/* ── League rail ──────────────────────────────────────── */}
      <LeagueRail active={activeLeague} onSelect={setActiveLeague} />

      {/* ── Sub-tabs — segmented control. Subtle gradient backdrop +
            inset shadow so the active tab reads like a raised pill in a
            recessed track. Inactive tabs get a soft hover state. */}
      <div
        role="tablist"
        aria-label="Filter sports markets"
        className="inline-flex items-center gap-1 p-1.5 rounded-full bg-linear-to-b from-white/[0.04] to-white/[0.02] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(0,0,0,0.4)] overflow-x-auto scrollbar-hide max-w-full"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.id)}
              className={`group shrink-0 relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-200 ${
                isActive
                  ? "bg-linear-to-b from-primary to-violet-700 text-white shadow-[0_4px_12px_-2px_rgba(139,92,246,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  : "text-white/55 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 transition-transform ${isActive ? "" : "group-hover:scale-110"}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Market grid ──────────────────────────────────────── */}
      {showingSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={
            activeLeague
              ? `No markets for ${LEAGUES.find((l) => l.id === activeLeague)?.name} yet`
              : `No ${tab} sports markets right now`
          }
          description={
            activeLeague
              ? "Clear the league filter to see all Sports markets."
              : "Try the other tabs or come back when markets are live."
          }
          action={
            activeLeague
              ? { label: "Show all sports", onClick: () => setActiveLeague(null) }
              : tab !== "top"
              ? { label: "Top markets", onClick: () => setTab("top") }
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

      {/* Discover other categories — keeps the nav loop tight. */}
      <div className="pt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3">
          Browse other categories
        </h3>
        <CategoryChips active="Sports" onChange={() => { /* nav handled by chip itself */ }} />
        <p className="text-[11px] text-white/40 mt-3">
          Want a different category?{" "}
          <Link href="/" className="text-primary hover:text-white transition-colors font-semibold">
            Back to home →
          </Link>
        </p>
      </div>
      </div>
      <Footer />
    </>
  );
}

// ─── League rail ─────────────────────────────────────────────────

function LeagueRail({
  active,
  onSelect,
}: {
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.85 : el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white">Featured leagues</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canLeft}
            aria-label="Scroll leagues left"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canRight}
            aria-label="Scroll leagues right"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        // py-2 gives the active chip's outer ring + shadow vertical
        // room so it doesn't get clipped by the scroll container.
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory py-2"
      >
          {/* All-leagues sentinel — NEXORA brand mark on a violet→blue
              gradient. Anchors the rail visually to the platform. */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 snap-start w-[88px] flex flex-col items-center gap-2 group focus:outline-none"
          >
            <span className="relative w-16 h-16 rounded-full overflow-hidden transition-all bg-linear-to-br from-neutral-800 to-neutral-950 ring-1 ring-white/10 flex items-center justify-center">
              <img
                src="/brand/leagues/all_sports.png"
                alt="All sports"
                draggable={false}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </span>
            <span
              className={`text-[11px] font-bold text-center leading-tight ${
                active === null ? "text-white" : "text-white/60 group-hover:text-white"
              }`}
            >
              All
            </span>
          </button>

          {LEAGUES.map((l) => {
            const isActive = l.id === active;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onSelect(isActive ? null : l.id)}
                className="shrink-0 snap-start w-[88px] flex flex-col items-center gap-2 group focus:outline-none"
              >
                <span className={`relative w-16 h-16 rounded-full overflow-hidden transition-all bg-linear-to-br ${l.gradient}`}>
                  {l.image && (
                    <img
                      src={l.image}
                      alt={l.name}
                      draggable={false}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </span>
                <span
                  className={`text-[11px] font-bold text-center leading-tight ${
                    isActive ? "text-white" : "text-white/60 group-hover:text-white"
                  }`}
                >
                  {l.name}
                </span>
              </button>
            );
          })}
      </div>
    </section>
  );
}

function formatCompact(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}
