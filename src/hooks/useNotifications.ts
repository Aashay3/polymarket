"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  readAt: string | null;
  createdAt: string;
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

/**
 * Lightweight notifications hook: fetches on mount, polls every 30s while
 * the tab is visible, and exposes mutations that optimistically update
 * local state.
 */
export function useNotifications() {
  const { status } = useSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiFetch<{ notifications: NotificationItem[]; unreadCount: number }>(
        "/api/notifications?limit=20",
      );
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Leave whatever we have; don't clobber on transient failure
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  const markRead = useCallback(
    async (ids: string[] | "all") => {
      const body = ids === "all" ? { markAll: true } : { ids };
      // Optimistic update
      setItems((prev) =>
        prev.map((n) => {
          if (n.readAt) return n;
          if (ids === "all" || ids.includes(n.id)) return { ...n, readAt: new Date().toISOString() };
          return n;
        }),
      );
      setUnreadCount((c) =>
        ids === "all" ? 0 : Math.max(0, c - ids.length),
      );
      try {
        await apiFetch("/api/notifications", { method: "POST", body: JSON.stringify(body) });
      } catch {
        // Roll back on failure via refresh
        refresh();
      }
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
    if (status !== "authenticated") return;
    const interval = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30_000);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, refresh]);

  return { items, unreadCount, isLoading, refresh, markRead };
}
