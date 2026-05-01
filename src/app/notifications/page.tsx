"use client";

import { createElement, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Bell,
  Trophy,
  CheckCheck,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  CheckCircle,
  XCircle,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Full notifications inbox.
 *
 * Mirrors the data already powering the navbar dropdown but with no
 * truncation, filter tabs (All / Unread), per-day grouping, and a
 * footer link into the per-channel preferences page.
 *
 * The dropdown already optimistically marks rows read on click via
 * useNotifications; this page does the same against its own state
 * (kept local so the dropdown's polling doesn't fight it).
 */

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
}

// Stable empty array so useMemo deps don't churn on non-ready states.
const EMPTY_ITEMS: NotificationItem[] = [];

type FetchState =
  | { status: "loading" }
  | { status: "ready"; items: NotificationItem[]; unreadCount: number }
  | { status: "error"; message: string };

type Tab = "all" | "unread";

const ICON_FOR_TYPE: Record<string, LucideIcon> = {
  POSITION_WON: Trophy,
  POSITION_LOST: XCircle,
  TRADE_FILLED: Zap,
  DEPOSIT_CONFIRMED: ArrowDownLeft,
  WITHDRAWAL_PROCESSED: ArrowUpRight,
  MARKET_RESOLVED: CheckCircle,
};

const TINT_FOR_TYPE: Record<string, string> = {
  POSITION_WON: "text-yes bg-yes/10",
  POSITION_LOST: "text-no bg-no/10",
  TRADE_FILLED: "text-primary bg-primary/10",
  DEPOSIT_CONFIRMED: "text-yes bg-yes/10",
  WITHDRAWAL_PROCESSED: "text-no bg-no/10",
  MARKET_RESOLVED: "text-primary bg-primary/10",
};

function iconFor(type: string): LucideIcon {
  return ICON_FOR_TYPE[type] ?? Bell;
}

function tintFor(type: string): string {
  return TINT_FOR_TYPE[type] ?? "text-muted-foreground bg-white/5";
}

function marketIdFromData(data: unknown): string | null {
  if (data && typeof data === "object" && "marketId" in data) {
    const v = (data as { marketId: unknown }).marketId;
    return typeof v === "string" ? v : null;
  }
  return null;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/// Bucket a notification into "Today", "Yesterday", or absolute date.
function dayBucket(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({ ok: false }));
  if (!body.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return body.data as T;
}

export default function NotificationsPage() {
  const { status: sessionStatus } = useSession();
  const [tab, setTab] = useState<Tab>("all");
  const [state, setState] = useState<FetchState>({ status: "loading" });

  // Effect only updates `state` from inside async callbacks. The auth
  // gate is handled in render below — keeping it out of the effect body
  // avoids the React-19 "setState during effect" rule.
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    let cancelled = false;
    const params = new URLSearchParams({ limit: "100" });
    if (tab === "unread") params.set("unreadOnly", "true");
    apiFetch<{ notifications: NotificationItem[]; unreadCount: number }>(
      `/api/notifications?${params.toString()}`,
    )
      .then((data) => {
        if (cancelled) return;
        setState({
          status: "ready",
          items: data.notifications,
          unreadCount: data.unreadCount,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "Failed to load",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [tab, sessionStatus]);

  const items = state.status === "ready" ? state.items : EMPTY_ITEMS;
  const unreadCount = state.status === "ready" ? state.unreadCount : 0;
  const isUnauthed =
    sessionStatus !== "loading" && sessionStatus !== "authenticated";

  // Group by day for nicer scanning.
  const grouped = useMemo(() => {
    const m = new Map<string, NotificationItem[]>();
    for (const item of items) {
      const key = dayBucket(item.createdAt);
      const arr = m.get(key) ?? [];
      arr.push(item);
      m.set(key, arr);
    }
    return Array.from(m.entries());
  }, [items]);

  const markOne = async (id: string) => {
    if (state.status !== "ready") return;
    // Optimistic
    setState({
      ...state,
      items: state.items.map((n) =>
        n.id === id && n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    });
    try {
      await apiFetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {
      // Best-effort; the next fetch will reconcile.
    }
  };

  const markAll = async () => {
    if (state.status !== "ready" || state.unreadCount === 0) return;
    setState({
      ...state,
      items: state.items.map((n) =>
        n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n,
      ),
      unreadCount: 0,
    });
    try {
      await apiFetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ markAll: true }),
      });
    } catch {
      // Reconcile next fetch.
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121217] border border-white/10 text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          <Link
            href="/settings/notifications"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121217] border border-white/10 text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-colors"
          >
            <SettingsIcon className="w-3.5 h-3.5" /> Settings
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="inline-flex gap-1 p-1 rounded-xl bg-[#121217] border border-white/8 mb-4">
        {(["all", "unread"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${
              tab === t
                ? "bg-primary text-white shadow-[0_2px_10px_-2px_rgba(139,92,246,0.6)]"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {t === "all" ? "All" : `Unread${unreadCount > 0 ? ` · ${unreadCount}` : ""}`}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="bg-[#121217] border border-white/8 rounded-2xl overflow-hidden">
        {isUnauthed && (
          <div className="px-5 py-12 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="text-sm font-semibold text-white mb-1">Sign in to see your notifications</p>
            <p className="text-xs text-muted-foreground mb-4">
              Trade fills, payouts, and market resolutions land here.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              Sign in
            </Link>
          </div>
        )}

        {!isUnauthed && state.status === "loading" && (
          <ul className="divide-y divide-white/5">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-5 py-4 flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl bg-white/5 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isUnauthed && state.status === "error" && (
          <div className="px-5 py-12 text-center text-sm text-no font-semibold">
            Couldn&apos;t load notifications: {state.message}
          </div>
        )}

        {!isUnauthed && state.status === "ready" && items.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-60" />
            <p className="text-sm font-semibold text-white">
              {tab === "unread" ? "Nothing unread" : "No notifications yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === "unread"
                ? "Switch to the All tab to see your history."
                : "We'll ping you when there's something to know."}
            </p>
          </div>
        )}

        {!isUnauthed && state.status === "ready" && items.length > 0 && (
          <div>
            {grouped.map(([day, dayItems]) => (
              <div key={day}>
                <div className="px-5 py-2 border-b border-white/5 bg-white/[0.02]">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                    {day}
                  </p>
                </div>
                <ul className="divide-y divide-white/5">
                  {dayItems.map((item) => (
                    <NotificationRow key={item.id} item={item} onClick={() => markOne(item.id)} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationRow({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: () => void;
}) {
  const tint = tintFor(item.type);
  const marketId = marketIdFromData(item.data);
  const isUnread = item.readAt === null;

  // Use createElement so the lookup-then-render pattern doesn't trip
  // React 19's "components created during render" rule. The Lucide
  // icon refs are stable module-level constants — there's nothing
  // actually being created — but the lint rule can't tell.
  const iconNode = createElement(iconFor(item.type), { className: "w-4 h-4" });

  const inner = (
    <div
      className={`flex gap-3 px-5 py-4 transition-colors text-left ${
        isUnread ? "bg-primary/5" : "bg-transparent"
      } hover:bg-white/[0.04]`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
        {iconNode}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-bold text-white">{item.title}</p>
          {isUnread && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden />
          )}
        </div>
        <p className="text-xs text-white/70 mt-0.5">{item.body}</p>
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-2">
          {relativeTime(item.createdAt)}
        </p>
      </div>
    </div>
  );

  return marketId ? (
    <li>
      <Link href={`/market/${marketId}`} onClick={onClick} className="block">
        {inner}
      </Link>
    </li>
  ) : (
    <li>
      <button type="button" onClick={onClick} className="w-full">
        {inner}
      </button>
    </li>
  );
}
