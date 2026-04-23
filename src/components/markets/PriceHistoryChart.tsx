"use client";

import { useEffect, useState } from "react";
import { Sparkline } from "@/components/ui/Sparkline";

interface Point {
  ts: string;
  yesPrice: string;
  noPrice: string;
}

/**
 * Fetches PriceSnapshot history for a market and renders a YES-price
 * sparkline. Default window 24h; pass `hours` for other ranges.
 *
 * Shows a graceful "not enough history yet" card when the snapshot
 * scheduler hasn't had time to record at least two points (happens for
 * markets created in the last 15 minutes).
 */
export function PriceHistoryChart({
  marketId,
  hours = 24,
  height = 120,
}: {
  marketId: string;
  hours?: number;
  height?: number;
}) {
  const [points, setPoints] = useState<Point[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/markets/${marketId}/price-history?hours=${hours}`);
        const body = await res.json();
        if (!body.ok) throw new Error(body?.error?.message ?? "failed");
        if (!cancelled) setPoints(body.data.points);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketId, hours]);

  if (err) {
    return (
      <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-6 text-center text-xs text-muted-foreground">
        Couldn&apos;t load price history
      </div>
    );
  }

  if (points === null) {
    return (
      <div className="animate-pulse bg-white/2 border border-white/5 rounded-xl" style={{ height }} />
    );
  }

  if (points.length < 2) {
    return (
      <div className="bg-white/2 border border-white/5 rounded-xl px-4 py-6 text-center text-xs text-muted-foreground">
        Not enough history yet — snapshots are recorded every 15 minutes.
      </div>
    );
  }

  const series = points.map((p) => parseFloat(p.yesPrice));
  const first = series[0];
  const last = series[series.length - 1];
  const up = last >= first;
  const color = up ? "#4ade80" : "#f87171"; // yes / no tailwind colours

  const deltaPct = ((last - first) / first) * 100;
  const label = `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%`;

  return (
    <div className="bg-white/2 border border-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
            YES price · last {hours}h
          </p>
          <p className="text-lg font-bold font-mono text-white">
            {(last * 100).toFixed(1)}¢
          </p>
        </div>
        <span
          className={`text-xs font-black px-2 py-1 rounded-full ${
            up ? "bg-yes/10 text-yes border border-yes/20" : "bg-no/10 text-no border border-no/20"
          }`}
        >
          {label}
        </span>
      </div>
      <div style={{ height }}>
        <Sparkline data={series} color={color} strokeWidth={1.5} fillOpacity={0.25} height={height} />
      </div>
    </div>
  );
}
