"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Shield,
  ArrowLeft,
  Filter,
  Copy,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

/**
 * /dashboard/admin/audit-log — read-only viewer for the AuditLog stream.
 *
 * Surfaces things that other parts of the app intentionally don't
 * surface in the UI — most importantly the dev-mode password-reset
 * URL (logged when no email provider is configured) and incoming
 * support tickets. Filters mirror the API surface.
 *
 * Admin-only (the underlying /api/admin/audit-log endpoint enforces
 * via requireAdmin()).
 */

interface Actor {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  role: "USER" | "ADMIN";
}

interface AuditEntry {
  id: string;
  action: string;
  actor: Actor | null;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
}

interface ApiResponse {
  ok: true;
  data: { entries: AuditEntry[]; nextCursor: string | null };
}

const ACTION_PRESETS = [
  { value: "",                                      label: "All actions" },
  { value: "auth.password_reset.requested",        label: "Password reset requested" },
  { value: "auth.password_reset.completed",        label: "Password reset completed" },
  { value: "support.ticket",                       label: "Support tickets" },
  { value: "market.create",                        label: "Market create" },
  { value: "market.resolve",                       label: "Market resolve" },
  { value: "user.password.change",                 label: "Password change" },
  { value: "user.signup",                          label: "Signups" },
];

type FetchState =
  | { status: "loading" }
  | { status: "ready"; entries: AuditEntry[]; nextCursor: string | null }
  | { status: "error"; message: string };

export default function AuditLogPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { toast } = useToast();
  const [actionFilter, setActionFilter] = useState("");
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [expanded, setExpanded] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !isAdmin) return;
    let cancelled = false;
    const params = new URLSearchParams({ limit: "50" });
    if (actionFilter) params.set("action", actionFilter);

    fetch(`/api/admin/audit-log?${params.toString()}`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (!body.ok) {
          setState({ status: "error", message: body.error?.message ?? "Failed to load" });
          return;
        }
        const data = (body as ApiResponse).data;
        setState({
          status: "ready",
          entries: data.entries,
          nextCursor: data.nextCursor,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "Network error",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [actionFilter, sessionStatus, isAdmin]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ type: "success", title: "Copied" });
    } catch {
      toast({ type: "error", title: "Couldn't copy" });
    }
  };

  if (sessionStatus !== "authenticated") {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-lg font-bold text-white">Sign in to view the audit log</p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-60" />
        <p className="text-lg font-bold text-white mb-1">Admins only</p>
        <p className="text-sm text-muted-foreground">
          You need the ADMIN role to view the audit trail.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      <Link
        href="/dashboard/admin"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to admin
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/15 rounded-2xl flex items-center justify-center border border-primary/30">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Audit log
            </h1>
            <p className="text-sm text-muted-foreground">
              Append-only event stream. Useful in dev for fishing out
              password-reset URLs and incoming support tickets.
            </p>
          </div>
        </div>

        <div className="relative shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="appearance-none pl-9 pr-9 py-2.5 rounded-xl bg-[#121217] border border-white/10 text-sm font-semibold text-white outline-none focus:border-primary/30 transition-colors min-w-[260px]"
          >
            {ACTION_PRESETS.map((p) => (
              <option key={p.value} value={p.value} className="bg-[#121217]">
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="bg-[#121217] border border-white/8 rounded-2xl overflow-hidden">
        {state.status === "loading" && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}
        {state.status === "error" && (
          <div className="p-12 text-center text-sm text-no font-semibold">
            {state.message}
          </div>
        )}
        {state.status === "ready" && state.entries.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No entries for this filter.
          </div>
        )}
        {state.status === "ready" && state.entries.length > 0 && (
          <ul className="divide-y divide-white/5">
            {state.entries.map((entry) => {
              const isExpanded = expanded === entry.id;
              const resetUrl = extractResetUrl(entry);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <ChevronRight
                      className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <code className="text-xs font-mono font-bold text-primary">
                          {entry.action}
                        </code>
                        {entry.targetType && (
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {entry.targetType}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {entry.actor
                          ? `${entry.actor.email ?? entry.actor.username ?? entry.actor.id} · ${entry.actor.role}`
                          : "anonymous"}{" "}
                        ·{" "}
                        {new Date(entry.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {resetUrl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
                        Reset URL
                      </span>
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 border-t border-white/5 bg-white/[0.02] space-y-3">
                      {resetUrl && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/30">
                          <code className="flex-1 text-[11px] font-mono text-amber-200 truncate">
                            {resetUrl}
                          </code>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(resetUrl);
                            }}
                            className="p-1.5 rounded-md hover:bg-amber-500/20 text-amber-400 transition-colors"
                            title="Copy reset URL"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={resetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-md hover:bg-amber-500/20 text-amber-400 transition-colors"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                      <pre className="text-[10px] font-mono text-white/70 whitespace-pre-wrap break-words bg-black/30 rounded-lg p-3 max-h-64 overflow-auto">
                        {JSON.stringify(entry.metadata, null, 2) || "(no metadata)"}
                      </pre>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        id: {entry.id}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {state.status === "ready" && state.nextCursor && (
        <p className="text-center text-[11px] text-muted-foreground">
          {state.entries.length} shown · more available (pagination not wired
          yet — narrow with the action filter)
        </p>
      )}
    </div>
  );
}

/// Pulls a reset URL out of an audit entry's metadata. The
/// forgot-password endpoint stashes it under `resetUrlInDevOnly`.
function extractResetUrl(entry: AuditEntry): string | null {
  if (entry.action !== "auth.password_reset.requested") return null;
  const meta = entry.metadata;
  if (meta && typeof meta === "object" && "resetUrlInDevOnly" in meta) {
    const v = (meta as { resetUrlInDevOnly: unknown }).resetUrlInDevOnly;
    return typeof v === "string" ? v : null;
  }
  return null;
}
