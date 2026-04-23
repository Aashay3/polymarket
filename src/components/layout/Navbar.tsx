"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Menu, Search, Bell, ChevronDown, Wallet, LogIn } from "lucide-react";
import { NexoraWordmark, NexoraIcon } from "@/components/ui/NexoraLogo";
import { useDrawer } from "@/app/context/DrawerContext";
import { useWallet } from "@/app/context/WalletContext";
import { useIsClient } from "@/hooks/useIsClient";
import { useNotifications } from "@/hooks/useNotifications";
import { AccountDrawer } from "./AccountDrawer";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { BitsButton } from "../ui/bits/BitsButton";
import { SearchModal } from "../SearchModal";


export function Navbar() {
  const router = useRouter();
  const { toggleDrawer } = useDrawer();
  const { balance, isConnected, isLoading } = useWallet();
  const { data: session, status } = useSession();
  const isAuthed = status === "authenticated" && !!session?.user;
  const avatarSeed = session?.user?.username ?? session?.user?.email ?? session?.user?.id ?? "guest";
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 h-[60px] transition-all duration-300 border-b flex items-center px-4 md:px-6 
        ${scrolled 
          ? "bg-background/90 backdrop-blur-md border-white/10 shadow-lg" 
          : "bg-background border-white/6"
        }`}
    >
      {/* Left Section */}
      <div className="flex items-center gap-3 md:gap-4 flex-none">
        <button 
          onClick={toggleDrawer}
          className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="md:hidden">
            <NexoraIcon size={24} />
          </div>
          <div className="hidden md:block">
            <NexoraWordmark className="scale-90 origin-left" />
          </div>
        </Link>

        {mounted && (
          <div
            className="hidden sm:flex items-center gap-1.5 ml-1"
            role="status"
            aria-live="polite"
            aria-label={isConnected ? "Connected" : isLoading ? "Connecting" : "Offline"}
            title={isConnected ? "Live" : isLoading ? "Connecting…" : "Offline — reconnecting"}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-yes animate-pulse" : isLoading ? "bg-amber-400" : "bg-no"
              }`}
            />
            <span className="text-[9px] font-bold tracking-widest uppercase text-white/40">
              {isConnected ? "Live" : isLoading ? "…" : "Offline"}
            </span>
          </div>
        )}
      </div>

      {/* Center Section (Empty for now) */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        {/* Desktop Wallet Pill */}
        <div className="hidden sm:flex items-center bg-[#121217] border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10 group cursor-pointer hover:bg-white/2 transition-colors">
            <span className="text-sm font-bold text-white">
              ₹{mounted ? balance.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0.00"}
            </span>
            <span className="text-base" title="INR">🇮🇳</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white transition-colors" />
          </div>
          <BitsButton
            onClick={() => router.push("/wallet")}
            className="h-auto py-1.5 px-4 rounded-none border-none bg-primary hover:bg-primary/90"
          >
            Wallet
          </BitsButton>
        </div>

        {/* Mobile Wallet Pill (compact) */}
        <button
          onClick={() => router.push("/wallet")}
          aria-label="Open wallet"
          className="sm:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121217] border border-white/10 hover:bg-white/5 transition-colors"
        >
          <Wallet className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold text-white tabular-nums">
            ₹{mounted ? balance.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0"}
          </span>
        </button>

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          <BitsButton
            variant="ghost"
            size="sm"
            className="w-9 px-0 hidden xs:flex"
            aria-label="Search markets"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="w-[18px] h-[18px]" />
          </BitsButton>
          <div className="relative">
            <BitsButton
              variant="ghost"
              size="sm"
              className="w-9 px-0 relative"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
              onClick={() => setIsNotifOpen((v) => !v)}
            >
              <Bell className="w-[18px] h-[18px]" />
              {isAuthed && unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-primary rounded-full text-[9px] font-black text-white flex items-center justify-center ring-2 ring-background">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </BitsButton>
            {isAuthed && (
              <NotificationsDropdown isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            )}
          </div>
          {status === "loading" ? (
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse ml-1" aria-hidden />
          ) : isAuthed ? (
            <button
              onClick={() => setIsAccountOpen(!isAccountOpen)}
              aria-label="Open account menu"
              className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer ml-1 overflow-hidden hover:border-[#FF6A3D]/50 transition-colors relative"
            >
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`}
                alt=""
              />
            </button>
          ) : (
            <Link
              href="/auth/signin"
              className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sign in</span>
            </Link>
          )}
        </div>

        {/* Account Drawer — only mounted when signed in */}
        {isAuthed && (
          <div className="relative">
            <AccountDrawer
              isOpen={isAccountOpen}
              onClose={() => setIsAccountOpen(false)}
            />
          </div>
        )}
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
