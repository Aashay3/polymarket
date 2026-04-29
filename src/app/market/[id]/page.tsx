"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Activity, PieChart as PieIcon, ArrowUpRight } from "lucide-react";
import { MarketDetailHeader } from "@/components/markets/detail/MarketDetailHeader";
import { TradeBox } from "@/components/markets/detail/TradeBox";
import { MarketTabs } from "@/components/markets/detail/MarketTabs";
import { SocialSection } from "@/components/markets/detail/SocialSection";
import { PriceHistoryChart } from "@/components/markets/PriceHistoryChart";
import { ProbabilityBar } from "@/components/markets/ProbabilityBar";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsProgress } from "@/components/ui/bits/BitsProgress";
import { EmptyState } from "@/components/ui/EmptyState";
import { Footer } from "@/components/layout/Footer";
import { useWallet } from "@/app/context/WalletContext";

/**
 * Market detail / bet page. Layout: a single 2-column grid where the
 * left column flows top-to-bottom (hero → stats → odds+chart → tabs →
 * comments → related/insights) and the right column is the sticky trade
 * panel. The previous 3-column layout squeezed the title; pinning the
 * trade box at 360px and moving Related/Insights into the main flow
 * gives the title room to breathe and the secondary content more space
 * than the old 240px rail allowed.
 */
export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { placeTrade, markets, isLoading } = useWallet();

  const marketKey = (Array.isArray(params?.id) ? params.id[0] : params?.id) ?? "";

  const market = useMemo(
    () => markets.find((m) => m.id === marketKey || m.slug === marketKey),
    [markets, marketKey],
  );

  const related = useMemo(() => {
    if (!market) return [];
    return markets
      .filter((m) => m.category === market.category && m.id !== market.id)
      .filter((m) => m.status === "OPEN")
      .slice(0, 4);
  }, [markets, market]);

  const initialSide = searchParams.get("trade") === "NO" ? "NO" : "YES";
  const [selectedSide, setSelectedSide] = useState<"YES" | "NO">(initialSide);

  const handleTrade = (amount: number, type: "YES" | "NO") => {
    if (!market) return;
    placeTrade(market.id, type, amount);
  };

  // ── Loading state ─────────────────────────────────────────────
  if (isLoading && markets.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="max-container pt-6 pb-24 space-y-6">
          <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
          <div className="h-12 w-3/4 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
            <div className="space-y-6">
              <div className="h-32 bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-72 bg-white/5 rounded-2xl animate-pulse" />
            </div>
            <div className="h-96 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────
  if (!market) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="max-container pt-6 pb-24">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <EmptyState
            title="Market not found"
            description="This market may have been removed or the link is invalid."
            action={{ label: "Browse markets", onClick: () => router.push("/") }}
          />
        </div>
        <Footer />
      </div>
    );
  }

  const yesCents = Math.round(market.yesPrice * 100);
  const noCents = Math.round(market.noPrice * 100);
  const liquidity = parseFloat(String(market.yesShares)) + parseFloat(String(market.noShares));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Back navigation */}
      <div className="max-container pt-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to markets
        </button>
      </div>

      <div className="max-container pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          {/* LEFT: main content */}
          <div className="space-y-8 min-w-0">
            <MarketDetailHeader
              title={market.question}
              category={market.category}
              volume={market.volumeAmount}
              liquidity={liquidity}
              endTime={market.endTime}
              yesChangeBps={market.yesChangeBps}
              image={market.imageUrl ?? "/economy.png"}
            />

            {/* ── Odds + price history (combined) ───────────────── */}
            <section className="bg-white/2 border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-6 pb-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.22em]">
                    Current odds
                  </h2>
                </div>
                <ProbabilityBar
                  yesPrice={market.yesPrice}
                  noPrice={market.noPrice}
                  size="lg"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-yes/10 ring-1 ring-yes/20 py-3 text-center">
                    <p className="font-mono tabular-nums text-2xl font-black text-yes">
                      {yesCents}
                      <span className="text-sm opacity-70 ml-0.5">¢</span>
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-yes/80 mt-0.5">
                      Yes
                    </p>
                  </div>
                  <div className="rounded-xl bg-no/10 ring-1 ring-no/20 py-3 text-center">
                    <p className="font-mono tabular-nums text-2xl font-black text-no">
                      {noCents}
                      <span className="text-sm opacity-70 ml-0.5">¢</span>
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-no/80 mt-0.5">
                      No
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-white/5 px-2 pb-2 pt-4">
                <div className="px-4 mb-3 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.22em]">
                    Price history
                  </h3>
                </div>
                <PriceHistoryChart marketId={market.id} />
              </div>
            </section>

            {/* ── Overview / Rules / Analytics tabs ─────────────── */}
            <section className="pt-2">
              <MarketTabs description={market.description} rules={market.rules} />
            </section>

            {/* ── Comments / Positions / Activity ───────────────── */}
            <section className="pt-8 border-t border-white/5">
              <SocialSection />
            </section>

            {/* ── Insights row (AI · Live · Sentiment) ──────────── */}
            <section className="pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <AIAnalysisCard />
              <LiveTradesCard />
              <SentimentCard />
            </section>

            {/* ── Related markets ───────────────────────────────── */}
            {related.length > 0 && (
              <section className="space-y-4 pt-8 border-t border-white/5">
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.22em]">
                  Related markets
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {related.map((m) => {
                    const cents = Math.round(m.yesPrice * 100);
                    return (
                      <Link
                        key={m.id}
                        href={`/market/${m.slug ?? m.id}`}
                        className="group block p-4 bg-white/2 border border-white/5 rounded-xl hover:border-white/15 hover:bg-white/3 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <p className="text-sm font-bold text-white leading-snug line-clamp-2 flex-1">
                            {m.question}
                          </p>
                          <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors shrink-0" />
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                            {m.category}
                          </span>
                          <span className="font-mono tabular-nums text-sm font-black text-primary">
                            {cents}
                            <span className="text-[10px] opacity-60 ml-0.5">¢ YES</span>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT: trading panel */}
          <aside className="lg:sticky lg:top-24">
            <TradeBox
              selectedOutcome={selectedSide}
              yesPrice={market.yesPrice}
              noPrice={market.noPrice}
              onTrade={(amount, type) => {
                setSelectedSide(type);
                handleTrade(amount, type);
              }}
            />
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ─── Insights cards (inlined so the row layout is fully under page control) ─

function AIAnalysisCard() {
  return (
    <BitsCard className="p-5 border-indigo-500/15 bg-indigo-500/2">
      <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4" /> AI Analysis
      </h3>
      <p className="text-xs text-neutral-300 leading-relaxed font-medium italic">
        &ldquo;Based on recent volatility and sentiment shifts, the market is currently overpricing the NO outcome by ~8.4%.&rdquo;
      </p>
      <div className="mt-4 pt-3 border-t border-indigo-500/20 flex justify-between items-center">
        <span className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest">Confidence</span>
        <span className="text-xs font-black text-white">82%</span>
      </div>
    </BitsCard>
  );
}

function LiveTradesCard() {
  const liveTrades = [
    { id: "1", type: "YES" as const, amount: "$1.2K", time: "12s ago" },
    { id: "2", type: "NO" as const, amount: "$450", time: "45s ago" },
    { id: "3", type: "YES" as const, amount: "$3.8K", time: "1m ago" },
  ];

  return (
    <BitsCard className="p-5">
      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" /> Live Trades
      </h3>
      <div className="space-y-3">
        {liveTrades.map((t) => (
          <div key={t.id} className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full ${t.type === "YES" ? "bg-yes" : "bg-no"}`} />
              <div>
                <p className="text-[11px] font-black text-white">{t.amount}</p>
                <p className="text-[9px] text-muted-foreground/60 font-bold uppercase">{t.type}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground/40">{t.time}</span>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/activity"
        className="block text-center w-full mt-4 pt-3 text-[10px] font-black text-muted-foreground hover:text-white transition-colors uppercase tracking-[0.1em] border-t border-white/5"
      >
        View all
      </Link>
    </BitsCard>
  );
}

function SentimentCard() {
  return (
    <BitsCard className="p-5">
      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
        <PieIcon className="w-4 h-4 text-blue-400" /> Sentiment
      </h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <p className="text-[11px] font-bold text-white/80">Bullish (YES)</p>
            <span className="text-xs font-black text-white">64%</span>
          </div>
          <BitsProgress value={64} color="bg-yes" />
        </div>
        <div>
          <div className="flex justify-between items-end mb-1.5">
            <p className="text-[11px] font-bold text-white/80">Bearish (NO)</p>
            <span className="text-xs font-black text-white">36%</span>
          </div>
          <BitsProgress value={36} color="bg-no" />
        </div>
      </div>
    </BitsCard>
  );
}
