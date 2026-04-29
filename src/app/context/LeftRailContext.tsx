"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Single source of truth for the sidebar.
 *
 * Two independent dimensions of state:
 *
 *   xl+ (persistent rail):
 *     isExpanded   true = wide panel with labels/promos
 *                  false = icon-only 64 px rail
 *     railPx       current rendered width — Navbar + AppLayout shift
 *                  their left edge to match.
 *     toggleExpand flip the persistent rail.
 *
 *   <xl (mobile / tablet drawer):
 *     isMobileOpen true = sidebar slid in over content with a backdrop
 *                  false = hidden off-canvas (default)
 *     openMobile / closeMobile / toggleMobile control it.
 *
 * Persistence: only the xl expand/collapse preference survives reloads;
 * mobile open state is ephemeral.
 */

const STORAGE_KEY = "nexora.leftRail.expanded";
const COLLAPSED_PX = 80;   // bumped from 64 — gives the icons room to breathe
const EXPANDED_PX = 280;

interface Ctx {
  // Desktop persistent rail
  isExpanded: boolean;
  railPx: number;
  toggleExpand: () => void;
  setExpanded: (v: boolean) => void;

  // Mobile off-canvas drawer
  isMobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
}

const LeftRailContext = createContext<Ctx | null>(null);

export function LeftRailProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setExpanded] = useState<boolean>(false);
  const [isMobileOpen, setMobileOpen] = useState<boolean>(false);

  // Hydrate persistent expand state from localStorage. setState-in-effect
  // is the canonical way to sync persisted UI preferences without a
  // hydration mismatch — SSR renders the default, client bumps after mount.
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v === "1") setExpanded(true);
    } catch { /* ignore */ }
  }, []);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isMobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [isMobileOpen]);

  const toggleExpand = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const openMobile  = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), []);

  const railPx = isExpanded ? EXPANDED_PX : COLLAPSED_PX;

  return (
    <LeftRailContext.Provider
      value={{
        isExpanded,
        railPx,
        toggleExpand,
        setExpanded,
        isMobileOpen,
        openMobile,
        closeMobile,
        toggleMobile,
      }}
    >
      {children}
    </LeftRailContext.Provider>
  );
}

export function useLeftRail(): Ctx {
  const ctx = useContext(LeftRailContext);
  if (!ctx) throw new Error("useLeftRail must be inside LeftRailProvider");
  return ctx;
}

export const LEFT_RAIL_COLLAPSED_PX = COLLAPSED_PX;
export const LEFT_RAIL_EXPANDED_PX = EXPANDED_PX;
