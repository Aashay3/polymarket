"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { CreditCard, Check, Info, ArrowLeft } from "lucide-react";

/**
 * /settings/currency — display-only currency preference.
 *
 * IMPORTANT: this only changes how amounts are FORMATTED in the UI.
 * Trading still settles in USDC (the chain & DB don't store FX rates).
 * When real-time FX lands, this preference is the one that drives it.
 *
 * Persists in localStorage under `nexora.currency`. Cross-tab sync via
 * the `storage` event (and a custom `nexora:currency` event for
 * same-tab updates). Mirrors the pattern in LanguagePicker.tsx.
 */

const STORAGE_KEY = "nexora.currency";

interface Currency {
  code: string;       // ISO 4217
  symbol: string;     // display prefix
  flag: string;       // region indicator emoji
  name: string;       // full English name
  approxRate: number; // 1 USDC ≈ N <currency>; demo placeholder
}

const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$",  flag: "🇺🇸", name: "US Dollar",       approxRate: 1.00 },
  { code: "INR", symbol: "₹",  flag: "🇮🇳", name: "Indian Rupee",    approxRate: 83.5 },
  { code: "EUR", symbol: "€",  flag: "🇪🇺", name: "Euro",            approxRate: 0.92 },
  { code: "GBP", symbol: "£",  flag: "🇬🇧", name: "British Pound",   approxRate: 0.79 },
  { code: "JPY", symbol: "¥",  flag: "🇯🇵", name: "Japanese Yen",    approxRate: 154 },
  { code: "BRL", symbol: "R$", flag: "🇧🇷", name: "Brazilian Real",  approxRate: 5.05 },
  { code: "AUD", symbol: "A$", flag: "🇦🇺", name: "Australian Dollar", approxRate: 1.52 },
  { code: "CAD", symbol: "C$", flag: "🇨🇦", name: "Canadian Dollar", approxRate: 1.36 },
];

const DEFAULT = CURRENCIES[0];

function useStoredCurrency(): [Currency, (code: string) => void] {
  const code = useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("storage", cb);
      window.addEventListener("nexora:currency", cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener("nexora:currency", cb);
      };
    },
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT.code,
    () => DEFAULT.code,
  );
  const set = useCallback((next: string) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event("nexora:currency"));
  }, []);
  return [CURRENCIES.find((c) => c.code === code) ?? DEFAULT, set];
}

export default function CurrencySettingsPage() {
  const [active, setActive] = useStoredCurrency();

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to settings
      </Link>

      <header className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/15 rounded-2xl flex items-center justify-center border border-primary/30">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Currency
          </h1>
          <p className="text-sm text-muted-foreground">
            How balances and prices are displayed across the app.
          </p>
        </div>
      </header>

      {/* Active card */}
      <section className="relative overflow-hidden rounded-2xl ring-1 ring-primary/20">
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-br from-violet-700/30 via-fuchsia-600/20 to-purple-900/30"
        />
        <div className="relative p-5 flex items-center gap-4">
          <span className="text-4xl leading-none" aria-hidden>
            {active.flag}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
              Active currency
            </p>
            <p className="text-2xl font-black text-white">
              {active.code}
              <span className="text-sm font-bold text-white/60 ml-2">{active.symbol}</span>
            </p>
            <p className="text-xs text-white/70 mt-0.5">{active.name}</p>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
              1 USDC ≈
            </p>
            <p className="text-base font-black font-mono text-white tabular-nums">
              {active.symbol}
              {active.approxRate.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>
      </section>

      {/* Picker */}
      <section className="bg-[#121217] border border-white/8 rounded-2xl overflow-hidden">
        <ul className="divide-y divide-white/5">
          {CURRENCIES.map((c) => {
            const isSelected = c.code === active.code;
            return (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => setActive(c.code)}
                  aria-pressed={isSelected}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                    isSelected
                      ? "bg-primary/10 hover:bg-primary/15"
                      : "hover:bg-white/5"
                  }`}
                >
                  <span className="text-2xl leading-none w-8 text-center" aria-hidden>
                    {c.flag}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-bold ${
                        isSelected ? "text-primary" : "text-white"
                      }`}
                    >
                      {c.code}
                      <span className="ml-2 text-xs font-medium text-muted-foreground">
                        {c.symbol}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.name}</p>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">
                    1 USDC ≈ {c.symbol}
                    {c.approxRate.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8">
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Display only — trades still settle in USDC. Real-time FX rates land
          when /api/fx is built; until then, the conversions above are
          indicative reference rates.
        </p>
      </div>
    </div>
  );
}
