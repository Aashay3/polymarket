"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Activity, Wallet, BarChart2, Clock } from "lucide-react";
import { TradeModal } from "@/components/TradeModal";
import { useWallet } from "@/app/context/WalletContext";
import { Sparkline } from "@/components/ui/Sparkline";

const PORTFOLIO_SPARK = [820, 910, 870, 950, 890, 1050, 980, 1120, 1080, 1220, 1180, 1284];

const ACTIVITY = [
  { id: 1, action: "Bought YES", market: "Fed Rate Cut Q3", amount: "$500", time: "2m ago", win: true },
  { id: 2, action: "Bought YES", market: "Bitcoin $100k", amount: "$1,200", time: "15m ago", win: true },
  { id: 3, action: "Bought NO", market: "SpaceX Mars 2027", amount: "$300", time: "1h ago", win: false },
];

export default function DashboardPage() {
  const { trades, balance, markets } = useWallet();
  const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || "");
  const [tradeType, setTradeType] = useState<"YES" | "NO">("YES");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedMarket = markets.find(m => m.id === selectedMarketId) || markets[0];
  const activePositions = Array.from(new Set(trades.map(t => t.marketId))).length;
  const totalShares = selectedMarket ? selectedMarket.yesShares + selectedMarket.noShares : 1;
  const yesPrice = selectedMarket ? (selectedMarket.yesShares / totalShares * 100).toFixed(0) : "0";
  const noPrice  = selectedMarket ? (selectedMarket.noShares  / totalShares * 100).toFixed(0) : "0";

  const statCards = [
    { label: "Portfolio Value",   value: `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, icon: <Wallet className="w-4 h-4" />,    delta: "+12.4%", up: true },
    { label: "Active Positions",  value: `${activePositions}`,                                                  icon: <BarChart2 className="w-4 h-4" />, delta: null,     up: true },
    { label: "Total Trades",      value: `${trades.length}`,                                                    icon: <Activity className="w-4 h-4" />,  delta: null,     up: true },
    { label: "Total Markets",     value: `${markets.length}`,                                                   icon: <TrendingUp className="w-4 h-4" />,delta: null,     up: true },
  ];

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Markets Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your positions and trade</p>
        </div>
        <button
          className="text-sm font-semibold px-4 py-2 rounded-xl bg-[#FF6A3D] text-white hover:bg-[#e55a30] transition-colors"
          onClick={() => setIsModalOpen(true)}
        >
          New Order
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-[#121217] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground text-xs font-medium">{s.label}</span>
              <span className="text-muted-foreground">{s.icon}</span>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
            {s.delta && (
              <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${s.up ? "text-yes" : "text-no"}`}>
                {s.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {s.delta}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Portfolio chart */}
        <div className="lg:col-span-2 bg-[#121217] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Portfolio Balance</p>
              <p className="text-3xl font-bold text-white">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-yes font-medium mt-1">+$284.50 (12.4%) all time</p>
            </div>
            <div className="flex gap-1">
              {["1D", "1W", "1M"].map(t => (
                <button key={t} className="px-2.5 py-1 text-xs font-medium rounded-lg text-muted-foreground hover:text-white hover:bg-white/6 transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-40">
            <Sparkline data={PORTFOLIO_SPARK} color="#22C55E" strokeWidth={2} fillOpacity={0.15} />
          </div>
        </div>

        {/* Market quick-trade */}
        <div className="bg-[#121217] border border-white/8 rounded-2xl p-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-white">Quick Trade</p>
          <select
            value={selectedMarketId}
            onChange={e => setSelectedMarketId(e.target.value)}
            className="w-full bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none cursor-pointer"
          >
            {markets.map(m => (
              <option key={m.id} value={m.id}>{m.question}</option>
            ))}
          </select>

          {selectedMarket && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => { setTradeType("YES"); setIsModalOpen(true); }}
                  className="flex-1 py-3 rounded-xl bg-yes text-white text-sm font-bold hover:bg-[#16a34a] transition-colors"
                >
                  YES {yesPrice}¢
                </button>
                <button
                  onClick={() => { setTradeType("NO"); setIsModalOpen(true); }}
                  className="flex-1 py-3 rounded-xl bg-no text-white text-sm font-bold hover:bg-[#dc2626] transition-colors"
                >
                  NO {noPrice}¢
                </button>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-yes rounded-full transition-all" style={{ width: `${yesPrice}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-[#121217] border border-white/8 rounded-2xl">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="divide-y divide-white/5">
          {ACTIVITY.map(a => (
            <div key={a.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/2 transition-colors">
              <div>
                <p className="text-sm font-medium text-white">{a.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.market}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{a.amount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Markets list */}
      <div className="bg-[#121217] border border-white/8 rounded-2xl">
        <div className="px-6 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">All Markets</h2>
        </div>
        <div className="divide-y divide-white/5">
          {markets.map(m => {
            const pool = m.yesShares + m.noShares || 1;
            const yes = Math.round(m.yesShares / pool * 100);
            return (
              <div key={m.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/2 transition-colors cursor-pointer group"
                onClick={() => { setSelectedMarketId(m.id); setIsModalOpen(true); }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white line-clamp-1 group-hover:text-[#FF6A3D] transition-colors">{m.question}</p>
                  <p className="text-xs text-white/70 mt-0.5 uppercase tracking-wide">{m.category}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-20">
                    <div className="h-1 bg-white/8 rounded-full">
                      <div className="h-full bg-yes rounded-full" style={{ width: `${yes}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{yes}%</span><span>{100-yes}%</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={e => { e.stopPropagation(); setSelectedMarketId(m.id); setTradeType("YES"); setIsModalOpen(true); }}
                      className="px-2.5 py-1 rounded-lg bg-yes/12 text-yes text-xs font-semibold hover:bg-yes hover:text-white transition-colors">
                      YES
                    </button>
                    <button onClick={e => { e.stopPropagation(); setSelectedMarketId(m.id); setTradeType("NO"); setIsModalOpen(true); }}
                      className="px-2.5 py-1 rounded-lg bg-no/12 text-no text-xs font-semibold hover:bg-no hover:text-white transition-colors">
                      NO
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && selectedMarket && (
        <TradeModal isOpen market={selectedMarket as any} initialType={tradeType} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
