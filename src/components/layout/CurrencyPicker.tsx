"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowDownLeft, ArrowUpRight, Info } from "lucide-react";
import { CryptoIcon, type CryptoSymbol, getTokenName } from "@/components/ui/CryptoIcon";
import { useIsClient } from "@/hooks/useIsClient";
import { useWallet } from "@/app/context/WalletContext";

/**
 * NEXORA crypto balance picker.
 *
 * Replaces the rupee-flag pill. Primary display is USDC (the platform's
 * trading currency — all markets settle in USDC). Click to open a
 * dropdown showing:
 *
 *   - The active platform balance (USDC with real number)
 *   - Deposit / Withdraw quick actions
 *   - The list of supported tokens. Only USDC is currently active;
 *     others show as "Coming soon" so users know what's planned without
 *     us lying about balances we don't track.
 *
 * Closes on outside click + Esc. All keyboard navigable.
 */

// Order matters — USDC first (active), then the roadmap of what we'll
// accept as deposits in future phases.
const SUPPORTED: { symbol: CryptoSymbol; status: "active" | "soon" }[] = [
  { symbol: "USDC",  status: "active" },
  { symbol: "USDT",  status: "soon"   },
  { symbol: "DAI",   status: "soon"   },
  { symbol: "ETH",   status: "soon"   },
  { symbol: "BTC",   status: "soon"   },
  { symbol: "MATIC", status: "soon"   },
];

export function CurrencyPicker() {
  const { balance } = useWallet();
  const mounted = useIsClient();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click / escape.
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isOpen]);

  const display = mounted ? balance.toFixed(2) : "0.00";

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger pill — mirrors the previous size/shape so Navbar layout stays stable */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 px-3 py-1.5 bg-[#121217] border border-white/10 rounded-xl hover:bg-white/3 hover:border-white/15 transition-colors group"
      >
        <CryptoIcon symbol="USDC" size={18} />
        <span className="text-sm font-bold text-white tabular-nums">{display}</span>
        <span className="text-[10px] font-black tracking-widest text-white/40 group-hover:text-white/60 transition-colors">
          USDC
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-white transition-all ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-[320px] max-h-[500px] overflow-hidden rounded-2xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col"
        >
          {/* Primary balance panel */}
          <div className="p-5 bg-gradient-to-br from-primary/5 to-transparent border-b border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <CryptoIcon symbol="USDC" size={36} />
              <div>
                <p className="text-[10px] font-black tracking-[0.22em] uppercase text-white/40">
                  Platform Balance
                </p>
                <p className="text-xs text-muted-foreground">USD Coin on Polygon</p>
              </div>
            </div>

            <p className="text-3xl font-bold text-white tabular-nums font-mono">
              {display}
              <span className="text-sm font-bold text-white/40 ml-1.5">USDC</span>
            </p>

            <div className="flex items-center gap-2 mt-4">
              <Link
                href="/wallet/deposit"
                onClick={() => setIsOpen(false)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Deposit
              </Link>
              <Link
                href="/wallet/withdraw"
                onClick={() => setIsOpen(false)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Withdraw
              </Link>
            </div>
          </div>

          {/* Supported tokens list */}
          <div className="overflow-y-auto">
            <div className="px-5 py-3 flex items-center justify-between">
              <p className="text-[10px] font-black tracking-[0.22em] uppercase text-white/40">
                Supported Tokens
              </p>
              <span
                className="group relative"
                title="All trading settles in USDC. Other tokens arrive in future phases via automatic on-chain swap."
              >
                <Info className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
              </span>
            </div>

            <ul className="divide-y divide-white/5">
              {SUPPORTED.map(({ symbol, status }) => (
                <li key={symbol}>
                  <TokenRow
                    symbol={symbol}
                    status={status}
                    balance={status === "active" ? display : null}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-white/5 p-2">
            <Link
              href="/wallet"
              onClick={() => setIsOpen(false)}
              className="block text-center py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
            >
              View full wallet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function TokenRow({
  symbol,
  status,
  balance,
}: {
  symbol: CryptoSymbol;
  status: "active" | "soon";
  balance: string | null;
}) {
  const active = status === "active";
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 ${
        active ? "bg-white/2" : "opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <CryptoIcon symbol={symbol} size={28} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{symbol}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {getTokenName(symbol)}
          </p>
        </div>
      </div>
      <div className="text-right">
        {active && balance !== null ? (
          <>
            <p className="text-sm font-bold text-white tabular-nums font-mono">{balance}</p>
            <p className="text-[9px] font-black tracking-widest uppercase text-yes">Active</p>
          </>
        ) : (
          <span className="text-[9px] font-black tracking-widest uppercase text-white/40 px-2 py-1 rounded-full border border-white/10">
            Soon
          </span>
        )}
      </div>
    </div>
  );
}
