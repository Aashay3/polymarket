"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, X } from "lucide-react";

/**
 * NotificationsPrompt — one-shot banner asking for browser notification
 * permission after a user signs in.
 *
 * Conditions to show:
 *   1. User is authenticated.
 *   2. Browser hasn't already been answered (Notification.permission ===
 *      "default"). If permission is already granted or denied, no point
 *      asking again — the browser blocks the prompt anyway.
 *   3. The user hasn't already dismissed our banner before
 *      (localStorage key `nexora.notif-prompt-seen`).
 *
 * Either clicking Allow OR dismissing the X sets the localStorage flag
 * so we never nag a second time. Sliding violet→fuchsia banner anchored
 * to the bottom-right.
 */

const STORAGE_KEY = "nexora.notif-prompt-seen";

export function NotificationsPrompt() {
  const { status } = useSession();
  const [show, setShow] = useState(false);

  // Decide whether to show. Runs on auth change.
  useEffect(() => {
    if (status !== "authenticated") return;
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined") return; // some browsers / iframes
    if (Notification.permission !== "default") return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch { /* ignore */ }

    // Tiny delay so the banner doesn't pop in mid-page-transition
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [status]);

  const persistSeen = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch { /* ignore */ }
    setShow(false);
  };

  const handleAllow = async () => {
    try {
      // Mark as seen first so even a slow / denied prompt doesn't loop.
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch { /* ignore */ }
      await Notification.requestPermission();
    } catch { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="nexora-notif-title"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100%-3rem)] sm:w-[360px] rounded-2xl shadow-[0_20px_50px_-12px_rgba(236,72,153,0.5)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      {/* Gradient surface */}
      <div className="relative bg-linear-to-br from-fuchsia-500 via-pink-500 to-rose-500 p-5">
        {/* Close */}
        <button
          type="button"
          onClick={persistSeen}
          aria-label="Dismiss"
          className="absolute top-3 right-3 w-7 h-7 rounded-full text-white/80 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 pr-6 mb-4">
          {/* Bell with badge */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-violet-600 rounded-full text-[11px] font-black text-white flex items-center justify-center ring-2 ring-pink-500">
              1
            </span>
          </div>

          <div className="min-w-0 pt-1">
            <p id="nexora-notif-title" className="text-base font-bold text-white leading-tight">
              Stay updated
            </p>
            <p className="text-xs text-white/85 mt-1.5 leading-snug">
              Allow notifications to be the first to know about market resolutions, payouts, and new launches.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAllow}
          className="w-full py-2.5 rounded-xl bg-white hover:bg-white/95 text-pink-600 text-sm font-bold transition-colors active:scale-[0.99]"
        >
          Allow
        </button>
      </div>
    </div>
  );
}
