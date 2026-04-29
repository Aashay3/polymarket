"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Flame,
  Radio,
  History,
  Trophy,
  Gamepad2,
  CalendarDays,
  Wallet,
  User,
  Settings as SettingsIcon,
  HelpCircle,
  Globe,
  LogOut,
  MessageCircle,
  LifeBuoy,
  Send,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useLeftRail,
  LEFT_RAIL_COLLAPSED_PX,
  LEFT_RAIL_EXPANDED_PX,
} from "@/app/context/LeftRailContext";

/**
 * NEXORA left rail — the only side navigation in the app.
 *
 *   xl+ (≥1280px): always visible as a fixed sidebar. Toggles between
 *     a 64 px icon-only collapsed view and a 280 px expanded view with
 *     labels + sections + promo. State persists via localStorage.
 *
 *   <xl: hidden by default. The Navbar hamburger opens it as an
 *     off-canvas drawer with a backdrop. Same content as the expanded
 *     desktop view (so mobile users see the full menu).
 *
 * Two menu sections, mirroring the screenshot:
 *
 *   Navigation     Home · Trending · Portfolio · Profile
 *   Support & Legal Settings · Notifications · Help / Support
 */

interface SubNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** When set, this image is rendered in place of `icon` in both the
   *  collapsed rail tile and the expanded row. The Lucide `icon` is
   *  still required as a fallback in case the image fails to load. */
  image?: string;
  accent?: boolean;
  /** When set, the row becomes collapsible and these children render
   *  underneath (indented). Auto-expands when the user is on a child
   *  route or on the parent's href. */
  children?: SubNavItem[];
}

const PRIMARY_ITEMS: NavItem[] = [
  {
    name: "Sports",
    href: "/sports",
    icon: Trophy,
    image: "/brand/icons/sports.png",
    children: [
      { name: "Top",         href: "/sports",                  icon: Flame        },
      { name: "Live",        href: "/sports?tab=live",         icon: Radio        },
      { name: "Esports",     href: "/sports/esports",          icon: Gamepad2     },
      { name: "Sports",      href: "/sports/all",              icon: CalendarDays },
      { name: "Bet history", href: "/portfolio",               icon: History      },
    ],
  },
  { name: "Trending",  href: "/trending",      icon: Flame },
  { name: "Portfolio", href: "/portfolio",     icon: Wallet },
  { name: "Profile",   href: "/profile",       icon: User },
];

const SUPPORT_ITEMS: NavItem[] = [
  { name: "Settings",       href: "/settings",                icon: SettingsIcon },
  // Highlighted as the get-help affordance — visually distinct from
  // the muted Settings row above it.
  { name: "Help / Support", href: "/support",                 icon: HelpCircle, accent: true },
];

export function LeftRail() {
  const { isExpanded, toggleExpand, isMobileOpen, closeMobile } = useLeftRail();
  const { data: session } = useSession();
  const pathname = usePathname();

  // Close the mobile drawer whenever the user navigates.
  useEffect(() => {
    if (isMobileOpen) closeMobile();
    // we intentionally only react to pathname changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on Escape (mobile drawer only).
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeMobile(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileOpen, closeMobile]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const displayName =
    session?.user?.username ??
    session?.user?.name ??
    session?.user?.email?.split("@")[0] ??
    "Log in";

  // Width of the desktop rail. Mobile drawer is always 280px wide.
  const desktopWidth = isExpanded ? LEFT_RAIL_EXPANDED_PX : LEFT_RAIL_COLLAPSED_PX;

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="xl:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      <aside
        // Desktop (xl+): always on-screen, width is set inline.
        // Mobile: 280px wide, slides in from the left when isMobileOpen.
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0a0a0e] border-r border-white/5 transition-transform duration-200 overflow-hidden xl:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          width: isMobileOpen ? LEFT_RAIL_EXPANDED_PX : desktopWidth,
        }}
        aria-label="Sidebar"
      >
        {/* Desktop: switch between collapsed and expanded views.
            Mobile: always render the expanded view. */}
        {isMobileOpen ? (
          <ExpandedView
            isActive={isActive}
            session={session}
            displayName={displayName}
            onCloseMobile={closeMobile}
            mobileMode
            toggleExpand={toggleExpand}
          />
        ) : (
          <div className="hidden xl:block h-full">
            {isExpanded ? (
              <ExpandedView
                isActive={isActive}
                session={session}
                displayName={displayName}
                onCloseMobile={closeMobile}
                toggleExpand={toggleExpand}
              />
            ) : (
              <CollapsedView
                toggle={toggleExpand}
                isActive={isActive}
                session={session}
              />
            )}
          </div>
        )}
      </aside>
    </>
  );
}

// ─── Collapsed (xl+ only) ────────────────────────────────────────

function CollapsedView({
  toggle,
  isActive,
  session,
}: {
  toggle: () => void;
  isActive: (href: string) => boolean;
  session: ReturnType<typeof useSession>["data"];
}) {
  return (
    // Scrollable inner column. Profile + USDC + collapse stay pinned at
    // the top, the nav stack scrolls if it ever overflows the viewport.
    <div className="flex flex-col items-center py-3 h-full overflow-y-auto scrollbar-hide">
      <Link
        href={session ? "/profile" : "/auth/signin"}
        title="Profile"
        className="shrink-0 w-12 h-12 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:border-primary/50 transition-colors"
      >
        <User className="w-5 h-5" />
      </Link>

      <Link
        href="/wallet/deposit"
        title="Free money"
        aria-label="Free money — deposit to start trading"
        className="relative shrink-0 mt-3 block w-[60px] hover:-translate-y-0.5 transition-transform"
      >
        <img
          src="/brand/free-money-tall.png"
          alt="Free money"
          className="block w-full h-auto"
        />
      </Link>

      {/* Drawer toggle — sits on a horizontal divider line, violet
          highlight so the affordance reads at a glance. */}
      <div className="w-full px-3 my-4 flex items-center gap-2 shrink-0">
        <span className="flex-1 h-px bg-white/10" />
        <button
          type="button"
          onClick={toggle}
          className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/40 text-primary hover:text-white flex items-center justify-center transition-colors shadow-[0_0_14px_-2px_rgba(139,92,246,0.5)]"
          aria-label="Expand sidebar"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
        <span className="flex-1 h-px bg-white/10" />
      </div>

      <div className="flex flex-col items-center gap-2.5 shrink-0">
        {PRIMARY_ITEMS.map((item) => (
          <RailIconLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>

      <Divider />

      <div className="flex flex-col items-center gap-2.5 shrink-0">
        {SUPPORT_ITEMS.map((item) => (
          <RailIconLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>

      {/* mt-auto pushes the bottom block down only when there's room.
          When content exceeds height, everything stays in flow and
          the column scrolls naturally. */}
      <div className="flex-1 min-h-4" />

      <div className="flex flex-col items-center gap-2.5 mb-3 shrink-0">
        <SocialIcon href="https://x.com" label="X (Twitter)" tint="bg-[#1a1a1a]">
          <XGlyph />
        </SocialIcon>
        <SocialIcon href="https://telegram.org" label="Telegram" tint="bg-sky-500">
          <Send className="w-[18px] h-[18px] -translate-x-0.5" />
        </SocialIcon>
        <SocialIcon href="https://discord.com" label="Discord" tint="bg-indigo-500">
          <MessageCircle className="w-[18px] h-[18px]" />
        </SocialIcon>
      </div>

      <button
        type="button"
        title="Language"
        className="shrink-0 w-11 h-11 rounded-full bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 flex items-center justify-center text-white/70 transition-colors"
      >
        <Globe className="w-[18px] h-[18px]" />
      </button>

      {session && (
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Sign out"
          aria-label="Sign out"
          className="shrink-0 mt-2 w-11 h-11 rounded-full bg-no/10 border border-no/30 hover:bg-no/20 flex items-center justify-center text-no transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      )}
    </div>
  );
}

function RailIconLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.name}
      aria-label={item.name}
      className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
        active
          ? "bg-primary text-white shadow-[0_4px_12px_-2px_rgba(139,92,246,0.5)]"
          : "bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10"
      }`}
    >
      {item.image ? (
        <img src={item.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <Icon className="w-5 h-5" />
      )}
    </Link>
  );
}

// ─── Expanded (xl+ panel and mobile drawer) ──────────────────────

function ExpandedView({
  isActive,
  session,
  displayName,
  onCloseMobile,
  mobileMode,
  toggleExpand,
}: {
  isActive: (href: string) => boolean;
  session: ReturnType<typeof useSession>["data"];
  displayName: string;
  onCloseMobile: () => void;
  mobileMode?: boolean;
  toggleExpand: () => void;
}) {
  return (
    // h-full + min-h-0 lets the inner scroll region take whatever room
    // the social/language footer doesn't claim. Without min-h-0, flex
    // children refuse to shrink below their content height and the
    // overflow rule never kicks in.
    <div className="flex flex-col h-full min-h-0">
      {/* Header: avatar + name + chevron (or X on mobile) */}
      <div className="p-4 flex items-center gap-3 shrink-0">
        <Link
          href={session ? "/profile" : "/auth/signin"}
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-white/80 group-hover:text-white group-hover:border-primary/50 transition-colors shrink-0">
            <User className="w-[18px] h-[18px]" />
          </div>
          <span className="flex-1 text-sm font-semibold text-white truncate">
            {displayName}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
        </Link>

        {mobileMode && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Free money promo */}
      <div className="px-4 shrink-0">
        <Link
          href="/wallet/deposit"
          aria-label="Free money — deposit to start trading"
          className="relative block hover:-translate-y-0.5 transition-transform"
        >
          <img
            src="/brand/free-money.png"
            alt="Free money"
            className="block w-full h-auto"
          />
        </Link>
      </div>

      {/* Collapse button (desktop only) — sits on the divider line. */}
      {!mobileMode ? (
        <div className="mx-4 my-4 flex items-center gap-2 shrink-0">
          <span className="flex-1 h-px bg-white/10" />
          <button
            type="button"
            onClick={toggleExpand}
            className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/40 text-primary hover:text-white flex items-center justify-center transition-colors shadow-[0_0_14px_-2px_rgba(139,92,246,0.5)]"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <span className="flex-1 h-px bg-white/10" />
        </div>
      ) : (
        <div className="my-4 h-px bg-white/5 mx-4 shrink-0" />
      )}

      {/* Scrolling middle: nav stacks. flex-1 + min-h-0 lets it shrink
          below content height so overflow-y-auto can take over. */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <nav className="px-3 space-y-0.5">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.22em] px-3 mb-2">
            Navigation
          </p>
          {PRIMARY_ITEMS.map((item) => (
            <ExpandedRow key={item.href} item={item} active={isActive(item.href)} isActive={isActive} />
          ))}
        </nav>

        <div className="my-4 h-px bg-white/5 mx-4" />

        <nav className="px-3 space-y-0.5 pb-2">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.22em] px-3 mb-2">
            Support &amp; Legal
          </p>
          {SUPPORT_ITEMS.map((item) => (
            <ExpandedRow key={item.href} item={item} active={isActive(item.href)} isActive={isActive} />
          ))}
        </nav>
      </div>

      {/* Social row */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex items-center justify-center gap-2">
          <SocialIcon href="https://x.com" label="X (Twitter)" tint="bg-[#1a1a1a]">
            <XGlyph />
          </SocialIcon>
          <SocialIcon href="https://telegram.org" label="Telegram" tint="bg-sky-500">
            <Send className="w-[16px] h-[16px] -translate-x-0.5" />
          </SocialIcon>
          <SocialIcon href="https://discord.com" label="Discord" tint="bg-indigo-500">
            <MessageCircle className="w-[16px] h-[16px]" />
          </SocialIcon>
        </div>
      </div>

      {/* Language + Sign out */}
      <div className="border-t border-white/5 p-3 shrink-0 space-y-2">
        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-white/80 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          English
        </button>

        {session && (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-no/10 border border-no/30 hover:bg-no/20 text-xs font-bold text-no transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

function ExpandedRow({
  item,
  active,
  isActive,
}: {
  item: NavItem;
  active: boolean;
  isActive: (href: string) => boolean;
}) {
  const Icon = item.icon;
  const hasChildren = !!item.children?.length;
  // A child route counts the parent as "active" too — drives the
  // open-by-default behaviour and the parent row's highlight.
  const childActive = hasChildren && item.children!.some((c) => isActive(c.href));
  const shouldAutoOpen = active || childActive;
  const [open, setOpen] = useState(shouldAutoOpen);

  // React-19 "derive state during render" pattern: when the route flips
  // to active/childActive (user navigated to a child via something other
  // than this row), force-open the parent — but don't fight a manual
  // toggle that happened after.
  const [prevAutoOpen, setPrevAutoOpen] = useState(shouldAutoOpen);
  if (shouldAutoOpen !== prevAutoOpen) {
    setPrevAutoOpen(shouldAutoOpen);
    if (shouldAutoOpen) setOpen(true);
  }

  // Children variant — collapsible parent + indented child links.
  if (hasChildren) {
    const parentLit = active || childActive;
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            parentLit
              ? "bg-primary/15 text-primary"
              : "text-white/70 hover:text-white hover:bg-white/5"
          }`}
        >
          {item.image ? (
            <img src={item.image} alt="" className="w-7 h-7 object-contain shrink-0" />
          ) : (
            <Icon className="w-[18px] h-[18px]" />
          )}
          <span className="flex-1 text-left">{item.name}</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="mt-1 ml-3 pl-3 border-l border-white/10 space-y-0.5">
            {item.children!.map((child) => {
              const ChildIcon = child.icon;
              const cActive = isActive(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    cActive
                      ? "bg-primary/15 text-primary"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <ChildIcon className="w-[16px] h-[16px]" />
                  {child.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Accent variant — used to draw the eye to a row that should read
  // as a CTA rather than just a nav target (e.g. Help / Support).
  if (item.accent && !active) {
    return (
      <Link
        href={item.href}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/15 ring-1 ring-primary/25 transition-colors"
      >
        <span className="w-7 h-7 rounded-md bg-primary/20 flex items-center justify-center">
          <Icon className="w-[16px] h-[16px]" />
        </span>
        <span className="flex-1">{item.name}</span>
        <ChevronRight className="w-3.5 h-3.5 text-primary/60" />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? "bg-primary/15 text-primary"
          : "text-white/70 hover:text-white hover:bg-white/5"
      }`}
    >
      {item.image ? (
        <img src={item.image} alt="" className="w-7 h-7 object-contain shrink-0" />
      ) : (
        <Icon className="w-[18px] h-[18px]" />
      )}
      {item.name}
    </Link>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function Divider() {
  return <div className="my-3.5 w-10 h-px bg-white/8 shrink-0" />;
}

function SocialIcon({
  href,
  label,
  children,
  tint,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  tint: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      className={`w-11 h-11 rounded-full flex items-center justify-center text-white transition-all hover:brightness-110 hover:-translate-y-0.5 ${tint}`}
    >
      {children}
    </a>
  );
}

// Suppress unused warning when LifeBuoy isn't directly used after the refactor.
void LifeBuoy;

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
