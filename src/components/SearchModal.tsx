"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, TrendingUp } from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const { markets } = useWallet();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return markets.slice(0, 8);
    const q = query.toLowerCase();
    return markets
      .filter((m) => m.question.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, markets]);

  // Reset query + selection when the modal opens. Done by comparing against
  // previous render state (React's "derive state from props" pattern) so we
  // avoid a setState-in-effect.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setActiveIdx(0);
    }
  }
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setActiveIdx(0);
  }

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const go = useCallback((id: string) => {
    router.push(`/market/${id}`);
    onClose();
  }, [router, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[activeIdx]) {
        e.preventDefault();
        go(results[activeIdx].id);
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter((el) => !el.hasAttribute("disabled"));
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, results, activeIdx, onClose, go]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] modal-backdrop"
          />
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
            className="fixed z-[160] top-[10vh] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl"
            role="dialog"
            aria-label="Search markets"
            aria-modal="true"
          >
            <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <Search className="w-4 h-4 text-white/40 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search markets…"
                  className="flex-1 bg-transparent text-white placeholder:text-white/30 text-sm outline-none"
                  aria-label="Search markets"
                />
                <kbd className="hidden sm:inline text-[10px] font-mono text-white/30 border border-white/10 rounded px-1.5 py-0.5">
                  ESC
                </kbd>
                <button
                  onClick={onClose}
                  aria-label="Close search"
                  className="sm:hidden text-white/40 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {results.length === 0 ? (
                  <div className="p-10 text-center text-white/40 text-sm">
                    No markets match &ldquo;{query}&rdquo;.
                  </div>
                ) : (
                  <ul className="p-2">
                    {results.map((m, i) => (
                      <li key={m.id}>
                        <button
                          onClick={() => go(m.id)}
                          onMouseEnter={() => setActiveIdx(i)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                            i === activeIdx ? "bg-white/10" : "hover:bg-white/5"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white line-clamp-1">{m.question}</p>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                              {m.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-primary shrink-0">
                            <TrendingUp className="w-3 h-3" />
                            {Math.round((m.yesShares / (m.yesShares + m.noShares)) * 100)}%
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[10px] text-white/30 font-mono">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
