"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Check } from "lucide-react";

/**
 * Locale picker — purely UI for now (no real i18n wiring yet).
 *
 * Two render variants used by the LeftRail:
 *   - "compact"  → 44 px round button used in the collapsed rail
 *   - "wide"     → full-width pill button used in the expanded rail
 *
 * Selection persists in localStorage under `nexora.locale` and syncs
 * across tabs via the `storage` event. Replace this with a real i18n
 * provider (next-intl, react-i18next, etc.) when translations land —
 * the locale codes here align with BCP-47 short forms so the swap is
 * a one-liner in `useStoredLocale`.
 */

const STORAGE_KEY = "nexora.locale";

interface Language {
  code: string;
  flag: string;     // flag emoji (region indicators)
  native: string;   // language name in its own script
  english: string;  // English label (used for the screen reader)
}

const LANGUAGES: Language[] = [
  { code: "en", flag: "🇺🇸", native: "English",    english: "English"    },
  { code: "hi", flag: "🇮🇳", native: "हिन्दी",       english: "Hindi"      },
  { code: "es", flag: "🇪🇸", native: "Español",    english: "Spanish"    },
  { code: "fr", flag: "🇫🇷", native: "Français",   english: "French"     },
  { code: "pt", flag: "🇧🇷", native: "Português",  english: "Portuguese" },
  { code: "de", flag: "🇩🇪", native: "Deutsch",    english: "German"     },
  { code: "zh", flag: "🇨🇳", native: "中文",        english: "Chinese"    },
  { code: "ja", flag: "🇯🇵", native: "日本語",      english: "Japanese"   },
  { code: "ko", flag: "🇰🇷", native: "한국어",      english: "Korean"     },
  { code: "ar", flag: "🇸🇦", native: "العربية",    english: "Arabic"     },
];

const DEFAULT = LANGUAGES[0];

/**
 * useSyncExternalStore-backed hook so the component reads localStorage
 * the React-19 way and mirrors changes from other tabs without an
 * effect-driven setState. Server snapshot is the default locale.
 */
function useStoredLocale(): [Language, (code: string) => void] {
  const code = useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("storage", cb);
      // Custom event so same-tab updates also notify subscribers.
      window.addEventListener("nexora:locale", cb);
      return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener("nexora:locale", cb);
      };
    },
    () => localStorage.getItem(STORAGE_KEY) ?? DEFAULT.code,
    () => DEFAULT.code,
  );

  const set = useCallback((next: string) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event("nexora:locale"));
  }, []);

  const lang =
    LANGUAGES.find((l) => l.code === code) ?? DEFAULT;
  return [lang, set];
}

interface Props {
  variant: "compact" | "wide";
}

export function LanguagePicker({ variant }: Props) {
  const [active, setActive] = useStoredLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handlePick = (code: string) => {
    setActive(code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {variant === "compact" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={`Language: ${active.english}`}
          aria-expanded={open}
          aria-haspopup="menu"
          title={active.english}
          className="shrink-0 w-11 h-11 rounded-full bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 flex items-center justify-center text-base transition-colors"
        >
          <span aria-hidden>{active.flag}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={`Language: ${active.english}`}
          aria-expanded={open}
          aria-haspopup="menu"
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-white/80 transition-colors"
        >
          <span className="text-base leading-none" aria-hidden>{active.flag}</span>
          {active.native}
        </button>
      )}

      {open && (
        <div
          role="menu"
          className={`absolute z-50 rounded-xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden ${
            variant === "compact"
              ? "left-full ml-2 bottom-0 w-[220px]"
              : "left-0 right-0 bottom-full mb-2"
          }`}
        >
          <ul className="max-h-[320px] overflow-y-auto scrollbar-hide py-1">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === active.code;
              return (
                <li key={lang.code}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => handlePick(lang.code)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary"
                        : "text-white/80 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      {lang.flag}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold truncate">
                        {lang.native}
                      </span>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {lang.english}
                      </span>
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 shrink-0" strokeWidth={3} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
