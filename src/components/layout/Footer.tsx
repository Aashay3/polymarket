"use client";

import Link from "next/link";
import { Globe, MessageSquare, Mail, Terminal, type LucideIcon } from "lucide-react";

const SOCIAL_ICONS: Record<string, LucideIcon> = { Globe, MessageSquare, Mail, Terminal };

const FOOTER_LINKS = [
  {
    title: "Markets",
    links: [
      { name: "Trending",  href: "/trending" },
      { name: "All Markets", href: "/dashboard/markets" },
      { name: "Leaderboard", href: "/leaderboard" },
      { name: "Activity", href: "/dashboard/activity" },
    ],
  },
  {
    title: "Account",
    links: [
      { name: "Portfolio",    href: "/portfolio" },
      { name: "Wallet",       href: "/wallet" },
      { name: "Profile",      href: "/profile" },
      { name: "Settings",     href: "/settings" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Help Center",  href: "/support" },
      { name: "Notifications", href: "/settings/notifications" },
      { name: "Admin",        href: "/dashboard/admin" },
      { name: "Status",       href: "/support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { name: "Terms of Service",  href: "/support" },
      { name: "Privacy Policy",    href: "/support" },
      { name: "Cookie Policy",     href: "/support" },
      { name: "Responsible Trading", href: "/support" },
    ],
  },
];

const SOCIAL_LINKS = [
  { Icon: "Globe",         href: "/support",   label: "Website" },
  { Icon: "MessageSquare", href: "/support",   label: "Community" },
  { Icon: "Mail",          href: "mailto:hello@nexora.io", label: "Email" },
  { Icon: "Terminal",      href: "/support",   label: "Developers" },
] as const;

export function Footer() {
  return (
    <footer className="mt-8 bg-background border-t border-white/6 pt-16 pb-8">
      <div className="max-w-[1248px] mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 md:gap-8 mb-16">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">NEXORA</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px]">
              The next generation prediction market platform for decentralized forecasting and trading.
            </p>
          </div>

          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">{section.title}</h3>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 order-2 md:order-1">
            <p className="text-xs text-muted-foreground">© 2026 Nexora Platform. All rights reserved.</p>
          </div>

          <div className="flex items-center gap-5 order-1 md:order-2">
            {SOCIAL_LINKS.map(({ Icon, href, label }) => {
              const IconCmp = SOCIAL_ICONS[Icon];
              return (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  className="text-muted-foreground hover:text-white transition-colors transform hover:scale-110 active:scale-95"
                >
                  <IconCmp className="w-5 h-5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}

// Minimal TrendingUp fallback if lucide-react doesn't have it (it does, but just in case)
function TrendingUp({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
