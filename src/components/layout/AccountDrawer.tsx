"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Wallet, PieChart, History, Activity, 
  BarChart3, Trophy, Settings, HelpCircle, LogOut, X,
  ChevronRight
} from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";
import { BitsDrawer } from "../ui/bits/BitsDrawer";
import { BitsButton } from "../ui/bits/BitsButton";

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { name: "Portfolio",    href: "/portfolio",     icon: PieChart },
  { name: "Wallet",       href: "/wallet",        icon: Wallet },
  { name: "Transactions", href: "#",              icon: History },
  { name: "My Trades",    href: "/portfolio",     icon: Activity },
  { name: "Analytics",    href: "#",              icon: BarChart3 },
  { name: "Leaderboard",  href: "/#leaderboard",  icon: Trophy },
];

const SECONDARY_ITEMS = [
  { name: "Settings",       href: "#", icon: Settings },
  { name: "Help & Support", href: "#", icon: HelpCircle },
];

export function AccountDrawer({ isOpen, onClose }: AccountDrawerProps) {
  const { balance } = useWallet();
  const [mounted, setMounted] = React.useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Close on click outside (for desktop dropdown)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        // We delay slightly to allow the trigger button to handle its own toggle logic if needed
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <BitsDrawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title="My Account"
    >
      {/* Header / User Info */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center overflow-hidden">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Felix Trader</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Pro Member</p>
          </div>
        </div>

        <div className="bg-white/3 rounded-xl p-3 border border-white/5">
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold mb-1" style={{ color: "rgba(255, 255, 255, 0.4)" }}>Total Balance</p>
          <p className="text-lg font-bold text-white">
            ₹{mounted ? balance.toLocaleString("en-IN") : "0.00"}
          </p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="py-2">
        <div className="px-2 space-y-0.5">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                {item.name}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors" />
            </Link>
          ))}
        </div>

        <div className="my-2 h-px bg-white/5 mx-5" />

        <div className="px-2 space-y-0.5">
          {SECONDARY_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href === "Settings" ? "/settings/notifications" : "/support"}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all group"
            >
              <item.icon className="w-4 h-4 text-muted-foreground group-hover:text-white/60 transition-colors" />
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Logout Section */}
      <div className="p-2 mt-4">
        <BitsButton 
          variant="ghost"
          className="w-full justify-start gap-3 text-no/80 hover:text-no hover:bg-no/5"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </BitsButton>
      </div>
    </BitsDrawer>
  );
}
