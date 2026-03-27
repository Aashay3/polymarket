"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, Search, Bell, ChevronDown } from "lucide-react";
import { NexoraWordmark, NexoraIcon } from "@/components/ui/NexoraLogo";
import { useDrawer } from "@/app/context/DrawerContext";
import { useWallet } from "@/app/context/WalletContext";
import { AccountDrawer } from "./AccountDrawer";
import { BitsButton } from "../ui/bits/BitsButton";


export function Navbar() {
  const pathname = usePathname();
  const { toggleDrawer } = useDrawer();
  const { balance } = useWallet();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

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
      </div>

      {/* Center Section (Empty for now) */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        {/* Wallet Component (Modern Trading Style) */}
        <div className="hidden sm:flex items-center bg-[#121217] border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10 group cursor-pointer hover:bg-white/2 transition-colors">
            <span className="text-sm font-bold text-white">
              ₹{mounted ? balance.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0.00"}
            </span>
            <span className="text-base" title="INR">🇮🇳</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-white transition-colors" />
          </div>
          <BitsButton 
            className="h-auto py-1.5 px-4 rounded-none border-none bg-primary hover:bg-primary/90"
          >
            Wallet
          </BitsButton>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          <BitsButton variant="ghost" size="sm" className="w-9 px-0 hidden xs:flex">
            <Search className="w-[18px] h-[18px]" />
          </BitsButton>
          <BitsButton variant="ghost" size="sm" className="w-9 px-0 relative">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />
          </BitsButton>
          <button 
            onClick={() => setIsAccountOpen(!isAccountOpen)}
            className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white cursor-pointer ml-1 overflow-hidden hover:border-[#FF6A3D]/50 transition-colors relative"
          >
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
          </button>
        </div>

        {/* Account Drawer Component */}
        <div className="relative">
          <AccountDrawer 
            isOpen={isAccountOpen} 
            onClose={() => setIsAccountOpen(false)} 
          />
        </div>
      </div>
    </header>
  );
}
