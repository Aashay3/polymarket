"use client";

import { useEffect, useRef } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import Link from "next/link";
import { useNotifications, type NotificationItem } from "@/hooks/useNotifications";

interface Props {
  isOpen: boolean;
  onClose: () => void;
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

function marketIdFromData(data: unknown): string | null {
  if (data && typeof data === "object" && "marketId" in data) {
    const v = (data as { marketId: unknown }).marketId;
    return typeof v === "string" ? v : null;
  }
  return null;
}

function NotificationRow({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: () => void;
}) {
  const marketId = marketIdFromData(item.data);
  const isUnread = item.readAt === null;
  const row = (
    <div
      className={`flex gap-3 px-4 py-3 transition-colors ${
        isUnread ? "bg-primary/5" : "bg-transparent"
      } hover:bg-white/5`}
    >
      <div className="mt-0.5">
        <div
          className={`w-2 h-2 rounded-full ${isUnread ? "bg-primary" : "bg-transparent"}`}
          aria-hidden
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.body}</p>
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-1.5">
          {relativeTime(item.createdAt)}
        </p>
      </div>
    </div>
  );

  return marketId ? (
    <Link href={`/market/${marketId}`} onClick={onClick} className="block">
      {row}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {row}
    </button>
  );
}

export function NotificationsDropdown({ isOpen, onClose }: Props) {
  const { items, unreadCount, markRead, isLoading } = useNotifications();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] overflow-hidden rounded-2xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col"
      role="dialog"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full font-black">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markRead("all")}
            className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-white transition-colors"
          >
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 divide-y divide-white/5">
        {isLoading && items.length === 0 ? (
          <div className="px-4 py-10 text-center text-muted-foreground text-xs">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 flex flex-col items-center gap-2 text-muted-foreground">
            <Inbox className="w-6 h-6 opacity-60" />
            <p className="text-xs">You&apos;re all caught up</p>
          </div>
        ) : (
          items.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onClick={() => {
                if (item.readAt === null) markRead([item.id]);
                onClose();
              }}
            />
          ))
        )}
      </div>

      <div className="border-t border-white/5 p-2">
        <Link
          href="/settings/notifications"
          onClick={onClose}
          className="block text-center py-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
        >
          Notification settings
        </Link>
      </div>
    </div>
  );
}
