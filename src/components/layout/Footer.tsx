"use client";

import Link from "next/link";
import { Send, MessageCircle, Mail } from "lucide-react";
import { NexoraWordmark } from "@/components/ui/NexoraLogo";
import type { ReactNode } from "react";

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

/**
 * Brand glyphs for socials lucide doesn't ship (X, Instagram, GitHub).
 * Inlined as small SVGs so they tint via `currentColor` and match the
 * lucide icons next to them. fill-rule on Instagram avoids a rendering
 * artifact at small sizes.
 */
function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.07 1.645.07 4.849 0 3.205-.012 3.584-.07 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.645.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function GithubGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

/**
 * Social icon spec: each entry has the rendered glyph, href, accessible
 * label, and a brand-colored hover tint that lights up on interaction.
 * Tint is the platform's actual brand color so each icon feels like
 * "the real thing" instead of a uniform white wash.
 */
interface Social {
  glyph: ReactNode;
  href: string;
  label: string;
  hoverTint: string; // Tailwind hover:text-* class
}

const SOCIALS: Social[] = [
  { glyph: <XGlyph />,                              href: "https://x.com/nexora",         label: "X (Twitter)", hoverTint: "hover:text-white"          },
  { glyph: <MessageCircle className="w-4 h-4" />,   href: "https://discord.gg/nexora",    label: "Discord",     hoverTint: "hover:text-indigo-400"     },
  { glyph: <Send className="w-4 h-4 -translate-x-px" />, href: "https://t.me/nexora",     label: "Telegram",    hoverTint: "hover:text-sky-400"        },
  { glyph: <InstagramGlyph />,                      href: "https://instagram.com/nexora", label: "Instagram",   hoverTint: "hover:text-pink-400"       },
  { glyph: <GithubGlyph />,                         href: "https://github.com/nexora",    label: "GitHub",      hoverTint: "hover:text-white"          },
  { glyph: <Mail className="w-4 h-4" />,            href: "mailto:hello@nexora.io",       label: "Email",       hoverTint: "hover:text-emerald-400"    },
];


export function Footer() {
  return (
    <footer className="mt-8 bg-background border-t border-white/6 pt-16 pb-8">
      <div className="max-w-[1248px] mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 md:gap-8 mb-16">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center mb-6" aria-label="Nexora home">
              <NexoraWordmark size={28} />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px]">
              Prediction markets on crypto, sports, politics, and more — powered by a transparent on-chain AMM.
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

          <div className="flex items-center gap-2 order-1 md:order-2">
            {SOCIALS.map(({ glyph, href, label, hoverTint }) => {
              const isMail = href.startsWith("mailto:");
              const isExternal = href.startsWith("http") || isMail;
              return (
                <a
                  key={label}
                  href={href}
                  target={isExternal && !isMail ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer noopener" : undefined}
                  aria-label={label}
                  title={label}
                  className={`w-9 h-9 inline-flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 text-muted-foreground transition-all hover:-translate-y-0.5 ${hoverTint}`}
                >
                  {glyph}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}

