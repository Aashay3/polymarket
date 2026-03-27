"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, Search, Bell, ChevronDown } from "lucide-react";
import { NexoraWordmark, NexoraIcon } from "@/components/ui/NexoraLogo";
import { useDrawer } from "@/app/context/DrawerContext";
import { useWallet } from "@/app/context/WalletContext";


export function Navbar() {
  const pathname = usePathname();
  const { toggleDrawer } = useDrawer();
  const { balance } = useWallet();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 h-[60px] transition-all duration-300 border-b flex items-center px-4 md:px-6 
        ${scrolled 
          ? "bg-background/80 backdrop-blur-md border-white/10 shadow-lg shadow-black/20" 
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
      </div>

      {/* Center Section (Empty for now) */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        {/* Wallet Component (Stake Style) */}
        <div className="hidden sm:flex items-center bg-[#121217] border border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10 group cursor-pointer hover:bg-white/2 transition-colors">
            <span className="text-sm font-bold text-white">
              ₹{mounted ? balance.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0.00"}
            </span>
            <span className="text-base" title="INR">🇮🇳</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white transition-colors" />
          </div>
          <button className="px-4 py-1.5 bg-[#FF6A3D] text-white text-sm font-bold hover:bg-[#e55a30] transition-colors active:scale-95">
            Wallet
          </button>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-0.5 md:gap-1.5">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors hidden xs:block">
            <Search className="w-[18px] h-[18px]" />
          </button>
          <button className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors relative">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#FF6A3D] rounded-full border-2 border-background" />
          </button>
          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer ml-1 overflow-hidden hover:border-[#FF6A3D]/50 transition-colors">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
          </div>
        </div>
      </div>
    </header>
  );
}
