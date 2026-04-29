"use client";

import { Navbar } from "./Navbar";
import { LeftRail } from "./LeftRail";
import { NotificationsPrompt } from "@/components/NotificationsPrompt";
import { useLeftRail } from "@/app/context/LeftRailContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useIsClient } from "@/hooks/useIsClient";
import { ReactNode } from "react";

/**
 * App shell.
 *
 *   [LeftRail (xl+)] | [Navbar + main content]
 *
 * LeftRail is fixed to the left edge, full height, resizable between
 * 64 px (collapsed) and 280 px (expanded). Navbar + main shift their
 * left edge to match so nothing overlaps.
 */
export function AppLayout({ children }: { children: ReactNode }) {
  const { railPx } = useLeftRail();
  const isXl = useMediaQuery("(min-width: 1280px)");
  const mounted = useIsClient();
  const leftInset = mounted && isXl ? railPx : 0;

  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      <Navbar />
      <LeftRail />

      <main
        style={{ paddingLeft: leftInset }}
        className="pt-[64px] max-container transition-[padding] duration-200"
      >
        <div className="py-8">{children}</div>
      </main>

      {/* Once-per-user notification permission prompt. Renders nothing
          when the user is signed out, has already responded, or the
          browser already has a non-default permission state. */}
      <NotificationsPrompt />
    </div>
  );
}
