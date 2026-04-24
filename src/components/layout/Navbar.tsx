"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Menu, Search, Bell, LogIn } from "lucide-react";
import { NexoraWordmark, NexoraIcon } from "@/components/ui/NexoraLogo";
import { useDrawer } from "@/app/context/DrawerContext";
import { useWallet } from "@/app/context/WalletContext";
import { useIsClient } from "@/hooks/useIsClient";
import { useNotifications } from "@/hooks/useNotifications";
import { AccountDrawer } from "./AccountDrawer";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { CurrencyPicker } from "./CurrencyPicker";
import { CryptoIcon } from "@/components/ui/CryptoIcon";
import { BitsButton } from "../ui/bits/BitsButton";
import { SearchModal } from "../SearchModal";

/**
 * Navbar layout (Polymarket-inspired, NEXORA-tuned):
 *
 *   [☰] [LOGO] | Markets · Activity · Leaderboard | [── search ──] | [USDC ▾] [Wallet] [🔔] [Avatar / Sign in]
 *
 * Inline nav links sit between the logo and the search bar; the search
 * bar fills the available middle space. Right cluster collapses
 * gracefully on smaller screens (USDC stays as a compact chip; Wallet
 * button hides; nav links collapse into the hamburger drawer).
 */

const NAV_LINKS = [
  { name: "Markets",     href: "/" },
  { name: "Activity",    href: "/dashboard/activity" },
  { name: "Leaderboard", href: "/leaderboard" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { toggleDrawer } = useDrawer();
  const { balance, isConnected, isLoading } = useWallet();
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated" && !!session?.user;
  const avatarSeed =
    session?.user?.username ?? session?.user?.email ?? session?.user?.id ?? "guest";
  const mounted = useIsClient();
  const [scrolled, setScrolled] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cmd/Ctrl+K and "/" both open search.
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-[60px] transition-all duration-300 border-b flex items-center px-4 md:px-6 gap-3 md:gap-5
        ${scrolled
          ? "bg-background/90 backdrop-blur-md border-white/10 shadow-lg"
          : "bg-background border-white/6"
        }`}
    >
      {/* ── Left: hamburger + logo + inline nav ─────────────── */}
      <div className="flex items-center gap-3 md:gap-4 flex-none min-w-0">
        <button
          onClick={toggleDrawer}
          className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="md:hidden">
            <NexoraIcon size={24} />
          </div>
          <div className="hidden md:block">
            <NexoraWordmark className="scale-90 origin-left" />
          </div>
        </Link>

        {/* Inline nav links — hidden on small screens (drawer covers them) */}
        <nav className="hidden lg:flex items-center gap-1 ml-2">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? "text-white bg-white/5"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Reconnecting indicator (only when SSE is actually disconnected) */}
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

      {/* ── Center: search bar ───────────────────────────────── */}
      <div className="flex-1 max-w-md mx-auto hidden md:block">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="group w-full flex items-center gap-2 h-9 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/15 transition-colors text-left"
          aria-label="Search markets"
        >
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground group-hover:text-white/70 transition-colors flex-1 truncate">
            Search markets…
          </span>
          <kbd className="hidden lg:inline-flex items-center justify-center px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono font-bold text-white/40">
            /
          </kbd>
        </button>
      </div>

      {/* ── Right cluster ────────────────────────────────────── */}
      <div className="flex items-center gap-2 ml-auto md:ml-0 flex-none">
        {/* Mobile-only search icon (the input above is hidden < md) */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
          aria-label="Search markets"
        >
          <Search className="w-5 h-5" />
        </button>

        {status === "loading" ? (
          // Avoid layout shift: reserve a small slot while session resolves.
          <div className="w-20 h-9 rounded-xl bg-white/5 animate-pulse" aria-hidden />
        ) : isAuthed ? (
          <>
            {/* USDC picker — hides on smallest screens, mobile gets compact chip */}
            <div className="hidden sm:block">
              <CurrencyPicker />
            </div>
            <button
              onClick={() => router.push("/wallet")}
              aria-label="Open wallet"
              className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121217] border border-white/10 hover:bg-white/5 transition-colors"
            >
              <CryptoIcon symbol="USDC" size={16} />
              <span className="text-xs font-bold text-white tabular-nums">
                {mounted ? balance.toFixed(0) : "0"}
              </span>
            </button>

            <BitsButton
              onClick={() => router.push("/wallet")}
              className="hidden sm:inline-flex h-9 px-4 rounded-xl border-none bg-primary hover:bg-primary/90"
            >
              Wallet
            </BitsButton>

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen((v) => !v)}
                aria-label={
                  unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"
                }
                className="relative w-9 h-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-primary rounded-full text-[9px] font-black text-white flex items-center justify-center ring-2 ring-background">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              <NotificationsDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>

            {/* Avatar */}
            <button
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              aria-label="Open account menu"
              className="w-9 h-9 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer overflow-hidden hover:border-primary/50 transition-colors"
            >
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`}
                alt=""
              />
            </button>
            <div className="relative">
              <AccountDrawer
                isOpen={isAccountOpen}
                onClose={() => setIsAccountOpen(false)}
              />
            </div>
          </>
        ) : (
          // Single signed-out CTA — covers both signin and signup;
          // the signin page links to signup for new users.
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-colors shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign in</span>
          </Link>
        )}
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
