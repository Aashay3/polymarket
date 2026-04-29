"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Menu,
  Search,
  Bell,
  LogIn,
  Home,
  Activity as ActivityIcon,
  Trophy,
} from "lucide-react";
import { NexoraWordmark } from "@/components/ui/NexoraLogo";
import { useWallet } from "@/app/context/WalletContext";
import { useLeftRail } from "@/app/context/LeftRailContext";
import { useIsClient } from "@/hooks/useIsClient";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { CurrencyPicker } from "./CurrencyPicker";
import { CryptoIcon } from "@/components/ui/CryptoIcon";
import { BitsButton } from "../ui/bits/BitsButton";
import { SearchModal } from "../SearchModal";

/**
 * Navbar layout:
 *
 *   [LOGO] [📈 Markets] [📊 Activity] [🏆 Leaderboard] | [search] | [USDC ▾] [Wallet] [🔔] [Sign in?] [☰]
 *
 * - Nav links carry icons, follow an active-route highlight via pathname.
 * - Search bar sits center, narrow, opens modal on click / "/" / Cmd-K.
 * - Wallet + Bell are visible in every auth state. When signed out,
 *   clicking either one routes to /auth/signin. Users see what's there
 *   before they commit to signing up.
 * - Hamburger menu lives on the FAR RIGHT (Polymarket convention).
 */

const NAV_LINKS = [
  { name: "Markets",     href: "/",                     icon: Home },
  { name: "Activity",    href: "/dashboard/activity",   icon: ActivityIcon },
  { name: "Leaderboard", href: "/leaderboard",          icon: Trophy },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { balance, isConnected, isLoading } = useWallet();
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated" && !!session?.user;
  const mounted = useIsClient();
  const { railPx, openMobile } = useLeftRail();
  // Rail only exists on xl+ screens. Below that, Navbar spans full width
  // and the hamburger opens the mobile drawer instead of shifting the bar.
  const isXl = useMediaQuery("(min-width: 1280px)");
  const leftOffset = mounted && isXl ? railPx : 0;
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      } else if (e.key === "/" && !inField) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const goWallet = () => router.push(isAuthed ? "/wallet" : "/auth/signin");
  const goNotifs = () => {
    if (isAuthed) setIsNotifOpen((v) => !v);
    else router.push("/auth/signin");
  };

  return (
    <header
      // `left` matches the left-rail width on xl+ so the nav starts at
      // the rail's right edge rather than overlapping it. Below xl the
      // rail is hidden and left falls back to 0.
      style={{ left: leftOffset }}
      className={`fixed top-0 right-0 z-50 h-[64px] transition-[left,background] duration-200 flex items-center px-4 md:px-6 gap-3 md:gap-5
        ${scrolled
          ? "bg-background/90 backdrop-blur-md shadow-lg"
          : "bg-background"
        }`}
    >
      {/* ── Left: logo + inline nav ──────────────────────────── */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 justify-start">
        <Link href="/" className="flex items-center shrink-0 pr-2">
          <NexoraWordmark size={28} />
        </Link>

        {/* Circular icon-button navigation inside a pill container.
            Active route = filled violet circle. Inactive = subtle icon
            with a divider between slots. Tooltip shows the label. */}
        <nav
          className="hidden lg:inline-flex items-center gap-1 bg-[#121217] border border-white/10 rounded-full p-1"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link, idx) => {
            const active = isActive(link.href);
            const Icon = link.icon;
            return (
              <div key={link.href} className="flex items-center">
                <Link
                  href={link.href}
                  title={link.name}
                  aria-label={link.name}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                    active
                      ? "bg-primary text-white shadow-[0_4px_14px_-2px_rgba(139,92,246,0.5)]"
                      : "text-muted-foreground hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </Link>
                {/* Divider between inactive pills — hidden next to the active one */}
                {idx < NAV_LINKS.length - 1 && (
                  <span
                    className={`w-px h-4 mx-0.5 bg-white/10 transition-opacity ${
                      active || isActive(NAV_LINKS[idx + 1].href)
                        ? "opacity-0"
                        : "opacity-100"
                    }`}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </nav>

        {mounted && !isConnected && !isLoading && (
          <span
            className="hidden md:inline-flex items-center gap-1.5 ml-1 text-[11px] font-medium text-no/80"
            role="status"
            aria-live="polite"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-no" />
            Reconnecting…
          </span>
        )}
      </div>

      {/* ── Center: wallet cluster (USDC balance + Wallet CTA) ──
          Stake-style: balance pill + primary Wallet button grouped in
          the middle. Hidden when signed out (no balance to show). */}
      <div className="flex items-center gap-2 flex-none">
        {isAuthed && (
          <>
            {/* USDC picker — full pill on sm+, compact chip on mobile */}
            <div className="hidden sm:block">
              <CurrencyPicker />
            </div>
            <button
              onClick={() => router.push("/wallet")}
              aria-label="Open wallet"
              className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121217] border border-white/10 hover:bg-white/5 transition-colors"
            >
              <CryptoIcon symbol="USDC" size={22} />
              <span className="text-xs font-bold text-white tabular-nums">
                {mounted ? balance.toFixed(0) : "0"}
              </span>
            </button>

            <BitsButton
              onClick={goWallet}
              className="hidden sm:inline-flex h-9 px-4 rounded-xl border-none bg-primary hover:bg-primary/90"
            >
              Wallet
            </BitsButton>
          </>
        )}
      </div>

      {/* ── Right cluster: icons only ────────────────────────── */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        {/* Search — circular icon button at every breakpoint. Click,
            press "/", or Cmd/Ctrl+K to open the search modal. */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="w-9 h-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Search markets"
          title="Search markets (/)"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>

        {status === "loading" ? (
          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" aria-hidden />
        ) : (
          <>
            {/* Notifications — always visible. Signed-out opens signin. */}
            <div className="relative">
              <button
                type="button"
                onClick={goNotifs}
                aria-label={
                  isAuthed && unreadCount > 0
                    ? `Notifications (${unreadCount} unread)`
                    : "Notifications"
                }
                className="relative w-9 h-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" />
                {isAuthed && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-primary rounded-full text-[9px] font-black text-white flex items-center justify-center ring-2 ring-background">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {isAuthed && (
                <NotificationsDropdown
                  isOpen={isNotifOpen}
                  onClose={() => setIsNotifOpen(false)}
                />
              )}
            </div>

            {/* Sign-in button (guest only). Authed users access account
                via the LeftRail / hamburger drawer. */}
            {!isAuthed && (
              <Link
                href="/auth/signin"
                aria-label="Sign in"
                title="Sign in"
                className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-white transition-colors shadow-[0_4px_14px_-2px_rgba(139,92,246,0.5)]"
              >
                <LogIn className="w-[18px] h-[18px]" />
              </Link>
            )}
          </>
        )}

        {/* Hamburger — opens the LeftRail as a mobile drawer below xl.
            Hidden on xl+ where the rail is always on-screen. */}
        <button
          onClick={openMobile}
          className="xl:hidden w-9 h-9 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
