"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  X,
  Info,
  TrendingUp,
  Layers,
  DollarSign,
  Zap,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { CryptoIcon, type CryptoSymbol, getTokenName } from "@/components/ui/CryptoIcon";

const CURRENCIES: CryptoSymbol[] = ["USDC", "USDT", "DAI", "ETH", "BTC", "MATIC"];

interface TradeBoxProps {
  selectedOutcome: string;
  yesPrice: number;
  noPrice: number;
  maxStake?: number;
  onTrade: (amount: number, type: "YES" | "NO") => void;
}

const QUICK = [10, 50, 100];

/**
 * Compact trade panel. Keeps the "make your prediction" structure but
 * trimmed for vertical density — slider removed (chips drive the
 * value), tighter padding, smaller icon circles, less neon glow.
 */
export function TradeBox({
  selectedOutcome,
  yesPrice,
  noPrice,
  maxStake = 10_000,
  onTrade,
}: TradeBoxProps) {
  const [side, setSide] = useState<"YES" | "NO">(
    selectedOutcome === "NO" ? "NO" : "YES",
  );
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<CryptoSymbol>("USDC");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close the currency picker on outside click / Escape.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const stake = parseFloat(amount) || 0;
  const price = side === "YES" ? yesPrice : noPrice;
  const shares = price > 0 ? stake / price : 0;
  const potential = Math.max(0, shares - stake);
  const returnPct = stake > 0 ? (potential / stake) * 100 : 0;

  const yesPct = Math.round(yesPrice * 100);
  const noPct = 100 - yesPct;

  return (
    <div className="rounded-2xl bg-[#121217] border border-white/8 p-4 sticky top-[100px]">
      <div className="space-y-4">
        {/* Header */}
        <p className="text-[10px] font-black tracking-[0.28em] uppercase text-white/40 text-center">
          Make your prediction
        </p>

        {/* BUY YES / BUY NO */}
        <div className="grid grid-cols-2 gap-2">
          <SideButton
            tone="yes"
            label="BUY YES"
            icon={<Check className="w-3.5 h-3.5" strokeWidth={3} />}
            active={side === "YES"}
            onClick={() => setSide("YES")}
          />
          <SideButton
            tone="no"
            label="BUY NO"
            icon={<X className="w-3.5 h-3.5" strokeWidth={3} />}
            active={side === "NO"}
            onClick={() => setSide("NO")}
          />
        </div>

        {/* Stake input */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black tracking-[0.18em] uppercase text-white/40">
              Your stake
            </span>
            <Info className="w-3 h-3 text-white/25" />
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/30 ring-1 ring-white/8 focus-within:ring-primary/50 transition-colors">
            <span className="text-lg font-black text-white/30 select-none">$</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              min={0}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 min-w-0 w-0 bg-transparent border-none outline-none text-lg font-black text-white placeholder:text-white/30 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            {/* Currency picker */}
            <div ref={pickerRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 ring-1 ring-white/10 text-[10px] font-bold text-white/80 hover:bg-white/10 transition-colors"
              >
                <CryptoIcon symbol={currency} size={14} />
                {currency}
                <ChevronDown
                  className={`w-3 h-3 opacity-60 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                />
              </button>
              {pickerOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-white/10 bg-[#0F0B1F] shadow-2xl z-20 overflow-hidden"
                >
                  {CURRENCIES.map((sym) => {
                    const active = sym === currency;
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => {
                          setCurrency(sym);
                          setPickerOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold transition-colors ${
                          active
                            ? "bg-primary/15 text-primary"
                            : "text-white/80 hover:bg-white/5"
                        }`}
                      >
                        <CryptoIcon symbol={sym} size={16} />
                        <span className="flex-1 text-left">{sym}</span>
                        <span className="text-[9px] font-medium text-white/40 truncate">
                          {getTokenName(sym)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Slider — drag to set stake. Caps at maxStake; chips and the
              MAX button feed the same value so the thumb stays in sync. */}
          <input
            type="range"
            min={0}
            max={maxStake}
            step={1}
            value={Math.min(stake, maxStake)}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Stake amount"
            className="w-full h-1 accent-primary cursor-pointer mb-1"
          />

          {/* Quick chips */}
          <div className="grid grid-cols-4 gap-1.5 pt-2">
            {QUICK.map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                className="py-1.5 rounded-lg bg-white/3 ring-1 ring-white/8 text-[11px] font-bold text-white/70 hover:bg-white/8 hover:text-white transition-colors"
              >
                ${val}
              </button>
            ))}
            <button
              onClick={() => setAmount(maxStake.toString())}
              className="py-1.5 rounded-lg bg-white/5 ring-1 ring-white/10 text-[11px] font-black text-white/85 uppercase tracking-wider hover:bg-white/10 transition-colors"
            >
              Max
            </button>
          </div>
        </div>

        {/* Market odds — inline single row */}
        <div className="flex items-center gap-2 text-[11px] font-black tabular-nums">
          <span className="text-yes shrink-0">{yesPct}%</span>
          <div className="relative flex-1 h-1.5 rounded-full overflow-hidden bg-white/5 flex">
            <div className="h-full bg-yes/80" style={{ width: `${yesPct}%` }} />
            <div className="h-full bg-no/80" style={{ width: `${noPct}%` }} />
          </div>
          <span className="text-no shrink-0">{noPct}%</span>
        </div>

        {/* Stats — compact 3-up */}
        <div className="grid grid-cols-3 gap-2 px-3 py-3 rounded-xl bg-black/20 ring-1 ring-white/5">
          <Stat
            tone="muted"
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="Avg"
            value={`${(price * 100).toFixed(0)}¢`}
          />
          <Stat
            tone="muted"
            icon={<Layers className="w-3.5 h-3.5" />}
            label="Shares"
            value={shares.toFixed(2)}
          />
          <Stat
            tone="yes"
            icon={<DollarSign className="w-3.5 h-3.5" strokeWidth={3} />}
            label="Return"
            value={`+$${potential.toFixed(2)}`}
            sub={`${returnPct.toFixed(0)}%`}
            valueClass="text-yes"
          />
        </div>

        {/* Place bet */}
        <button
          onClick={() => stake > 0 && onTrade(stake, side)}
          disabled={stake <= 0}
          className="w-full px-4 py-3 rounded-xl bg-primary text-white text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          Place Bet
        </button>

        {/* Fee disclosure */}
        <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-white/35 uppercase tracking-widest">
          <ShieldCheck className="w-3 h-3" />
          0.5% Trading fee
        </div>
      </div>
    </div>
  );
}

function SideButton({
  tone,
  label,
  icon,
  active,
  onClick,
}: {
  tone: "yes" | "no";
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  const activeRing = tone === "yes" ? "ring-yes" : "ring-no";
  const activeBg = tone === "yes" ? "bg-yes/10" : "bg-no/10";
  const iconActive = tone === "yes" ? "ring-yes text-yes" : "ring-no text-no";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-2.5 rounded-xl flex items-center gap-2 transition-colors ${
        active
          ? `${activeBg} ring-1 ${activeRing}`
          : "bg-white/3 ring-1 ring-white/8 hover:bg-white/5"
      }`}
    >
      <span
        className={`w-7 h-7 rounded-full flex items-center justify-center ring-1 transition-colors shrink-0 ${
          active ? `${iconActive} bg-white/2` : "ring-white/12 text-white/40 bg-white/3"
        }`}
      >
        {icon}
      </span>
      <span
        className={`text-[12px] font-black tracking-wider ${active ? "text-white" : "text-white/65"}`}
      >
        {label}
      </span>
    </button>
  );
}

function Stat({
  tone,
  icon,
  label,
  value,
  sub,
  valueClass = "text-white",
}: {
  tone: "muted" | "yes";
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  const ringClass =
    tone === "muted"
      ? "ring-white/12 bg-white/5 text-white/65"
      : "ring-yes/40 bg-yes/12 text-yes";

  return (
    <div className="text-center">
      <div
        className={`w-7 h-7 mx-auto rounded-full ring-1 flex items-center justify-center ${ringClass}`}
      >
        {icon}
      </div>
      <p className="text-[9px] font-black tracking-[0.16em] uppercase text-white/40 mt-1.5">
        {label}
      </p>
      <p className={`text-[12px] font-black tabular-nums mt-0.5 ${valueClass}`}>
        {value}
      </p>
      {sub && <p className="text-[9px] font-bold text-white/40">{sub}</p>}
    </div>
  );
}
