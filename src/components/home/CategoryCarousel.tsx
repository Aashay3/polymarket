"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Vote,
  Trophy,
  Bitcoin,
  Cpu,
  LineChart,
  FlaskConical,
  Film,
  Globe2,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Category carousel — horizontal scrolling row of vibrant gradient
 * tiles, one per category. Lucky-Star-style "ALL GAMES" lockup adapted
 * for prediction markets.
 *
 * Each tile is a real <Link> so right-click and Cmd-click work. Live
 * market counts come from the wallet context. Chevron buttons scroll
 * the row programmatically and disable themselves at the ends.
 */

interface Category {
  name: string;
  icon: LucideIcon;
  gradient: string;
  /**
   * Optional fully-designed tile artwork. When set, the gradient + icon
   * + title block are suppressed (the image already contains them) and
   * only the dynamic LIVE count chip is rendered on top.
   */
  image?: string;
}

const CATEGORIES: Category[] = [
  { name: "Politics",      icon: Vote,         gradient: "from-blue-600 via-indigo-600 to-blue-900"      },
  { name: "Sports",        icon: Trophy,       gradient: "from-emerald-500 via-teal-600 to-green-900"    },
  { name: "Crypto",        icon: Bitcoin,      gradient: "from-amber-500 via-orange-600 to-red-700"      },
  { name: "Tech",          icon: Cpu,          gradient: "from-cyan-500 via-blue-600 to-indigo-800"      },
  { name: "Economy",       icon: LineChart,    gradient: "from-violet-600 via-fuchsia-600 to-purple-900" },
  { name: "Science",       icon: FlaskConical, gradient: "from-pink-500 via-rose-600 to-red-800"         },
  { name: "Entertainment", icon: Film,         gradient: "from-fuchsia-500 via-pink-600 to-rose-800"     },
  { name: "World",         icon: Globe2,       gradient: "from-sky-500 via-blue-600 to-indigo-900"       },
];

export function CategoryCarousel() {
  const { markets } = useWallet();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Live market count per category, used in the corner pulsing chip.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const market of markets) {
      if (market.status !== "OPEN") continue;
      m.set(market.category, (m.get(market.category) ?? 0) + 1);
    }
    return m;
  }, [markets]);

  // Update chevron enabled-state whenever the scroll position changes.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amt = el.clientWidth * 0.85;
    el.scrollBy({ left: direction === "left" ? -amt : amt, behavior: "smooth" });
  };

  return (
    <section className="space-y-4">
      {/* ── Header: brand chip + title + controls ─────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-linear-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-[0_4px_14px_-2px_rgba(139,92,246,0.55)] shrink-0">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white truncate">
            All categories
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/trending"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white/80 hover:text-white transition-colors"
          >
            View all
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrolling tile row ───────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2"
      >
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const count = counts.get(c.name) ?? 0;
          const hasImage = !!c.image;
          return (
            <Link
              key={c.name}
              href={`/?category=${encodeURIComponent(c.name)}`}
              aria-label={`Browse ${c.name} markets`}
              // Width is calc'd so exactly N tiles fit per breakpoint:
              //   < sm: 2-up, sm: 3-up, md: 4-up, lg+: 5-up
              // gap-3 = 0.75rem between tiles, so total gap is (N-1) * 0.75rem.
              className={`group relative shrink-0 snap-start w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3rem)/5)] aspect-3/4 rounded-2xl overflow-hidden isolate bg-linear-to-br ${c.gradient} transition-transform hover:-translate-y-1 hover:duration-200 ring-1 ring-white/10`}
            >
              {hasImage ? (
                /* ── Image-driven tile — artwork is the background; we
                      still overlay the same title + count block as the
                      standard tiles so the row reads consistently. ─── */
                <>
                  <img
                    src={c.image}
                    alt={c.name}
                    draggable={false}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />

                  {/* Bottom veil so the title block always reads cleanly
                      regardless of the image's brightness in that zone. */}
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/85 via-black/40 to-transparent" />

                  {count > 0 && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur ring-1 ring-white/20 text-[9px] font-black tracking-[0.2em] uppercase text-white z-10">
                      <span className="relative inline-flex w-1.5 h-1.5">
                        <span className="absolute inset-0 rounded-full bg-emerald-300 animate-ping opacity-75" />
                        <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-300" />
                      </span>
                      Live
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-4 z-10">
                    <h3 className="text-xl sm:text-2xl font-black uppercase leading-[0.9] tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                      {c.name}
                    </h3>
                    <p className="text-[10px] font-semibold text-white/75 mt-1.5 tracking-wide">
                      {count > 0 ? `${count} ${count === 1 ? "market" : "markets"}` : "Browse"}
                    </p>
                  </div>
                </>
              ) : (
                /* ── Standard tile — icon + title rendered on the
                      gradient. ──────────────────────────────────────── */
                <>
                  <Icon
                    aria-hidden
                    className="absolute -top-3 -right-3 w-36 h-36 sm:w-44 sm:h-44 text-white/15 group-hover:text-white/25 transition-colors -rotate-12"
                  />

                  <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/85 via-black/45 to-transparent" />

                  {count > 0 && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur ring-1 ring-white/20 text-[9px] font-black tracking-[0.2em] uppercase text-white">
                      <span className="relative inline-flex w-1.5 h-1.5">
                        <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />
                        <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                      Live
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-xl sm:text-2xl font-black uppercase leading-[0.9] tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                      {c.name}
                    </h3>
                    <p className="text-[10px] font-semibold text-white/75 mt-1.5 tracking-wide">
                      {count > 0 ? `${count} ${count === 1 ? "market" : "markets"}` : "Browse"}
                    </p>
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
