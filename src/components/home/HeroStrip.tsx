"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ComponentType, SVGProps } from "react";
import {
  ArrowUpRight,
  Bitcoin,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Sparkles,
  Trophy,
  Vote,
} from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Hero — Lucky-Star-style lockup with an auto-rotating slideshow on
 * the main banner.
 *
 *   ┌──────────────────────────────────┬────────────┐
 *   │                                  │  USDC bonus│
 *   │   SLIDESHOW (curated topical     │            │
 *   │   featured markets)              ├────────────┤
 *   │                                  │  Trending  │
 *   └──────────────────────────────────┴────────────┘
 *
 * Slides are hand-curated (`SLIDES` below) so we can lead with whatever
 * is moving in the world right now — election cycles, geopolitical
 * flashpoints, sports calendars. Each slide deep-links to its category.
 *
 * Behaviour:
 *   - Auto-advances every 6s.
 *   - Pauses on pointer hover, on focus-within, and when the tab is
 *     hidden (Page Visibility) so we don't burn through slides while
 *     the user isn't watching.
 *   - Manual controls: chevrons + pagination dots.
 *   - Honours `prefers-reduced-motion` — auto-rotation disabled, user
 *     advances manually.
 */

interface HeroSlide {
  id: string;
  tag: string;
  title: string;
  blurb: string;
  cta: string;
  href: string;
  accent: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /**
   * Optional fully-designed background image. When set, the text/icon
   * overlay is suppressed (the artwork already contains the title,
   * blurb, etc.) and only the CTA pill is rendered on top.
   */
  image?: string;
  /**
   * Optional CSS RGB triplet (space-separated, e.g. "239 68 68") that
   * tints the CTA pill's ring + outer glow. Lets each slide's button
   * pick up its banner's hue instead of always reading violet.
   * Default: violet "139 92 246".
   */
  glow?: string;
}

const SLIDES: HeroSlide[] = [
  {
    id: "us-election",
    tag: "Hot · Politics",
    title: "Who takes the White House in 2028?",
    blurb: "Price the field months before the first primary debate.",
    cta: "Trade the race",
    href: "/?category=Politics",
    accent: "from-blue-700 via-indigo-600 to-blue-950",
    icon: Vote,
    image: "/brand/politics_banner.png",
    glow: "59 130 246",
  },
  {
    id: "us-iran",
    tag: "Breaking · World",
    title: "Will the US–Iran flashpoint escalate?",
    blurb: "Geopolitics priced live — by the crowd watching it unfold.",
    cta: "View markets",
    href: "/?category=World",
    accent: "from-rose-700 via-red-600 to-rose-950",
    icon: Landmark,
    image: "/brand/us_iran_banner.png",
    glow: "239 68 68",
  },
  {
    id: "ipl",
    tag: "Live · Sports",
    title: "Bet the IPL — every match, every over",
    blurb: "Crowd-priced odds on every fixture this season.",
    cta: "Open IPL markets",
    href: "/?category=Sports",
    accent: "from-emerald-700 via-teal-600 to-green-950",
    icon: Trophy,
    image: "/brand/ipl_banner.png",
    glow: "251 191 36",
  },
  {
    id: "crypto",
    tag: "Featured · Crypto",
    title: "Bet on the next crypto cycle",
    blurb: "BTC, ETH, and the calls everyone is whispering about.",
    cta: "Explore",
    href: "/?category=Crypto",
    accent: "from-violet-700 via-fuchsia-600 to-purple-950",
    icon: Bitcoin,
    image: "/brand/crypto_banner.png",
  },
];

const ROTATE_MS = 6000;

// useSyncExternalStore is the React-canonical way to read a browser
// MediaQueryList without setState-in-effect. Server snapshot is `false`
// so SSR matches the pre-mount state of clients without the preference.
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function HeroStrip() {
  const { markets } = useWallet();
  const totalOpen = markets.filter((m) => m.status === "OPEN").length;

  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const length = SLIDES.length;

  // Track tab visibility — don't auto-advance when nobody's watching.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Auto-advance — gated on hover/focus/visibility/motion preference.
  useEffect(() => {
    if (paused || tabHidden || reducedMotion) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, tabHidden, reducedMotion, length]);

  const goPrev = () => setIndex((i) => (i - 1 + length) % length);
  const goNext = () => setIndex((i) => (i + 1) % length);

  // Keyboard nav while the slideshow is focused.
  const stageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    stage.addEventListener("keydown", onKey);
    return () => stage.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
      {/* ── Featured slideshow ────────────────────────────────── */}
      <div
        ref={stageRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured markets"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        className="lg:col-span-2 relative overflow-hidden rounded-2xl min-h-[320px] sm:min-h-[360px] md:min-h-[380px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {SLIDES.map((s, i) => {
          const SIcon = s.icon;
          const active = i === index;
          const isImageSlide = !!s.image;
          return (
            <div
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${length}: ${s.title}`}
              aria-hidden={!active}
              className={`absolute inset-0 ${isImageSlide ? "bg-black" : `bg-linear-to-br ${s.accent}`} p-7 md:p-10 transition-opacity duration-700 ease-out ${active ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              {isImageSlide ? (
                /* ── Image-driven slide — artwork carries the message;
                      we only overlay the CTA pill. ────────────────── */
                <>
                  <img
                    src={s.image}
                    alt={s.title}
                    draggable={false}
                    className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover object-left"
                  />
                  <div className="relative flex flex-col h-full">
                    <div className="mt-auto">
                      <Link
                        href={s.href}
                        tabIndex={active ? 0 : -1}
                        // CSS var --glow drives both the ring and the dual-layer
                        // shadow so per-slide overrides flow through cleanly.
                        // Tailwind hover variants still work because the class
                        // strings are static; only the rgb() inputs are dynamic.
                        style={{ ["--glow" as string]: s.glow ?? "139 92 246" }}
                        className="group/cta relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-neutral-900 text-sm font-bold ring-2 ring-[rgb(var(--glow)/0.6)] hover:ring-[rgb(var(--glow)/0.85)] transition-all shadow-[0_0_24px_4px_rgb(var(--glow)/0.55),0_0_48px_8px_rgb(var(--glow)/0.35)] hover:shadow-[0_0_28px_6px_rgb(var(--glow)/0.75),0_0_56px_10px_rgb(var(--glow)/0.5)]"
                      >
                        {s.cta}
                        <ArrowUpRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                /* ── Standard slide — text + ambient icon ────────── */
                <>
                  <SIcon
                    aria-hidden
                    className="pointer-events-none absolute -right-10 top-1/2 -translate-y-1/2 w-64 h-64 md:w-80 md:h-80 text-white/10"
                  />
                  <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/15 blur-3xl opacity-50" />

                  <div className="relative max-w-lg flex flex-col h-full">
                    <p className="text-[11px] font-black tracking-[0.25em] uppercase text-white/70 mb-3">
                      {s.tag}
                    </p>
                    <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-black text-white uppercase leading-[0.95] tracking-tight mb-3">
                      {s.title}
                    </h2>
                    <p className="text-sm md:text-base text-white/85 leading-snug mb-5 max-w-md">
                      {s.blurb}
                    </p>
                    <div className="mt-auto">
                      <Link
                        href={s.href}
                        tabIndex={active ? 0 : -1}
                        // CSS var --glow drives both the ring and the dual-layer
                        // shadow so per-slide overrides flow through cleanly.
                        // Tailwind hover variants still work because the class
                        // strings are static; only the rgb() inputs are dynamic.
                        style={{ ["--glow" as string]: s.glow ?? "139 92 246" }}
                        className="group/cta relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-neutral-900 text-sm font-bold ring-2 ring-[rgb(var(--glow)/0.6)] hover:ring-[rgb(var(--glow)/0.85)] transition-all shadow-[0_0_24px_4px_rgb(var(--glow)/0.55),0_0_48px_8px_rgb(var(--glow)/0.35)] hover:shadow-[0_0_28px_6px_rgb(var(--glow)/0.75),0_0_56px_10px_rgb(var(--glow)/0.5)]"
                      >
                        {s.cta}
                        <ArrowUpRight className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Bottom-right control cluster — prev / dots / next. Sits
            opposite the CTA pill (bottom-left) so the two never crowd
            each other. focus-visible rings only on keyboard nav. */}
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-2 py-1.5 rounded-full bg-black/30 backdrop-blur-sm ring-1 ring-white/10">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous slide"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-1">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={`h-1.5 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                  i === index
                    ? "w-5 bg-white"
                    : "w-1.5 bg-white/45 hover:bg-white/75"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next slide"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Side stack (evergreen) ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
        <Link
          href="/wallet/deposit"
          className="group relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-400 via-emerald-600 to-green-900 p-5 transition-transform hover:-translate-y-0.5 min-h-[140px] flex items-center gap-3 ring-1 ring-emerald-300/30"
        >
          {/* Diagonal sheen — sweeps across on hover for a glossy feel. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[260%] transition-all duration-700 ease-out"
          />
          {/* Soft top sheen + bottom shadow for depth */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          {/* Radial spotlight behind the coin */}
          <span aria-hidden className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-amber-200/20 blur-2xl" />

          {/* ── Text column ─────────────────────────────── */}
          <div className="relative flex-1 min-w-0">
            {/* Amber pill replaces the plain "FREE" eyebrow — gives the
                offer a tangible-feeling hook. */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-300/95 text-[9px] font-black tracking-[0.2em] uppercase text-emerald-950 mb-2 shadow-[0_2px_8px_-1px_rgba(252,211,77,0.5)]">
              <Sparkles className="w-2.5 h-2.5" />
              Bonus
            </span>

            {/* Mixed-weight headline — tight italic "USDC" + heavy
                BONUS, gradient-clipped for a premium sheen. */}
            <h3 className="text-xl md:text-2xl font-black uppercase leading-[0.95] tracking-tight mb-2">
              <span className="italic font-extrabold text-amber-100/95 mr-1">USDC</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-emerald-100 drop-shadow-[0_1px_0_rgba(0,0,0,0.25)]">
                Bonus
              </span>
            </h3>

            <p className="text-[11px] font-medium text-white/85 leading-tight">
              Rewarded on first deposit
            </p>
          </div>

          {/* ── 3D NEXORA coin — visual anchor ──────────── */}
          <img
            src="/brand/Nexora-coin.png"
            alt=""
            aria-hidden
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            className="relative pointer-events-none select-none shrink-0 w-24 h-24 md:w-28 md:h-28 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)] group-hover:scale-110 group-hover:rotate-[10deg] transition-transform duration-500 ease-out"
          />
        </Link>

        <Link
          href="/trending"
          className="group relative overflow-hidden rounded-2xl p-5 transition-transform hover:-translate-y-0.5 min-h-[140px] ring-1 ring-violet-400/30 bg-linear-to-br from-blue-700 via-indigo-700 to-purple-900"
        >
          {/* Full-bleed glowing-chart background. Pinned to the right
              so the chart is the visual anchor on that side and the
              text gets a clean dark zone on the left. */}
          <img
            src="/brand/trending-art.png"
            alt=""
            aria-hidden
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover object-right scale-105 group-hover:scale-110 transition-transform duration-500 ease-out"
          />
          {/* Stronger left veil — keeps the headline crisp over the
              brightest part of the chart. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0f0a2a] via-[#0f0a2a]/70 to-transparent"
          />
          {/* Top sheen */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          {/* Tiny pulsing live dot — picks up the same vibe as the chart
              endpoint without competing. */}

          <div className="relative">
            {/* Glass pill instead of bright fuchsia — sits with the art
                instead of fighting it. */}
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur text-[9px] font-black tracking-[0.2em] uppercase text-white mb-2.5">
              <span className="relative inline-flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-fuchsia-400 animate-ping opacity-75" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
              </span>
              Live
            </span>
            <h3 className="text-2xl md:text-3xl font-black uppercase leading-[0.9] tracking-tight mb-2 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
              Trending
            </h3>
            <p className="text-[11px] font-semibold text-white/85 leading-tight">
              <span className="text-white">{totalOpen}</span> markets · highest volume
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
