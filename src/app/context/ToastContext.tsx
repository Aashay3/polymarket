"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const ACCENT = {
  success: "border-green-500/30 bg-green-500/5",
  error: "border-red-500/30 bg-red-500/5",
  info: "border-blue-500/30 bg-blue-500/5",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-96 pointer-events-none"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 22, stiffness: 220 }}
              className={`pointer-events-auto backdrop-blur-xl border rounded-2xl p-4 pr-10 shadow-2xl bg-[#0a0a0a]/95 ${ACCENT[t.type]} relative`}
              role="status"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-none">{ICONS[t.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white leading-tight">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-white/60 mt-1 leading-snug">{t.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
