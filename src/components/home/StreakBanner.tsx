"use client";

import Link from "next/link";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Home-feed promo banner: 5-day trading streak reward.
 *
 * Renders a wide art tile with the headline, progress dots, and a
 * "Receive" CTA pill overlaid on a generated background image
 * (`/brand/streak_banner.png`). Falls back to a violet→fuchsia
 * gradient if the image isn't present.
 *
 * Streak is read from WalletContext (which fetches it from /api/me,
 * computed on-demand from the Trade table — see src/lib/streak.ts).
 * Override via `streak` prop for storybook / static previews.
 */
export function StreakBanner({
  streak,
  target = 5,
  reward = "$5",
}: {
  streak?: number;
  target?: number;
  reward?: string;
}) {
  const ctx = useWallet();
  const live = streak ?? ctx.streak.days;
  const filled = Math.min(Math.max(0, live), target);
  const tradedToday = ctx.streak.tradedToday;

  return (
    <Link
      href="/wallet/deposit"
      className="group relative block overflow-hidden rounded-2xl ring-1 ring-white/10 hover:-translate-y-0.5 hover:ring-white/20 transition-all"
    >
      {/* Fallback gradient under the image — visible if the PNG is missing */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-violet-700 via-fuchsia-600 to-purple-900"
      />

      {/* Background image. Hidden via onError if the file isn't there yet. */}
      <img
        src="/brand/streak_banner.png"
        alt=""
        aria-hidden
        draggable={false}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover"
      />

      {/* Left-side dark fade so the headline reads cleanly over any artwork */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/50 via-black/15 to-transparent"
      />

      {/* Content */}
      <div className="relative px-6 py-6 md:px-8 md:py-8 flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-[1.05] drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            {target}-Day Streak
          </h2>
          <p className="text-sm md:text-base font-bold text-white/90 mt-1 max-w-md">
            {live >= target
              ? `${reward} bonus unlocked — claim below.`
              : tradedToday
                ? `Trade ${target} days in a row · ${target - live} to go for ${reward}.`
                : `Trade ${target} days in a row · unlock a ${reward} bonus.`}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-4">
            {Array.from({ length: target }).map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i < filled
                    ? "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.8)]"
                    : "bg-white/25 ring-1 ring-white/30"
                }`}
              />
            ))}
            <span className="ml-2 text-[11px] font-black text-white/90 tabular-nums">
              {filled} / {target}
            </span>
          </div>
        </div>

        <span className="shrink-0 inline-flex items-center justify-center px-7 py-2.5 rounded-full bg-white text-purple-900 text-sm font-black tracking-wide shadow-[0_6px_18px_-4px_rgba(0,0,0,0.4)] group-hover:shadow-[0_10px_24px_-4px_rgba(0,0,0,0.5)] group-hover:translate-y-[-1px] transition-all">
          Receive
        </span>
      </div>
    </Link>
  );
}
