"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, TrendingUp, PieChart, Wallet, User,
  Settings, Bell, HelpCircle
} from "lucide-react";
import { useDrawer } from "@/app/context/DrawerContext";
import { BitsDrawer } from "../ui/bits/BitsDrawer";

const MAIN_NAV = [
  { name: "Home",        href: "/",              icon: Home },
  { name: "Trending",   href: "/trending",      icon: TrendingUp },
  { name: "Portfolio",  href: "/portfolio",     icon: PieChart },
  { name: "Wallet",     href: "/wallet",        icon: Wallet },
  { name: "Profile",    href: "/profile",       icon: User },
];

const SECONDARY_NAV = [
  { name: "Settings",       href: "/settings",               icon: Settings },
  { name: "Notifications",  href: "/settings/notifications", icon: Bell },
  { name: "Help / Support", href: "/support",                icon: HelpCircle },
];

export function NavigationDrawer() {
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const pathname = usePathname();

  return (
    <BitsDrawer 
      isOpen={isDrawerOpen} 
      onClose={closeDrawer} 
      side="left"
      title="Navigation"
    >
      {/* Content Swiper/Scroll area */}
      <div className="py-6 px-3">
        <div className="space-y-1 mb-8">
          {MAIN_NAV.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeDrawer}
                className={`flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-semibold transition-all group
                  ${isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
              >
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? "text-primary" : "group-hover:text-white"}`} />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="h-px bg-white/5 mx-3 mb-8" />

        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em] mb-3">Support & Legal</p>
          {SECONDARY_NAV.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={closeDrawer}
              className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-white hover:bg-white/5 transition-all group"
            >
              <item.icon className="w-5 h-5 group-hover:text-white" />
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </BitsDrawer>
  );
}
