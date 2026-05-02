"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Shield,
  Lock,
  Smartphone,
  Monitor,
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

/**
 * /settings/security — password, 2FA, and active-session management.
 *
 * Currently:
 *   - Password change: real, hits POST /api/me/password
 *   - 2FA toggle: UI placeholder, backend TODO (TOTP enrollment +
 *     recovery codes will land with /api/me/2fa)
 *   - Sessions: UI placeholder, backend TODO (NextAuth sessions don't
 *     store device metadata by default — needs a small Session
 *     extension or a client-instrumented login)
 */

interface PasswordFormState {
  current: string;
  next: string;
  confirm: string;
  showCurrent: boolean;
  showNext: boolean;
}

const INITIAL_FORM: PasswordFormState = {
  current: "",
  next: "",
  confirm: "",
  showCurrent: false,
  showNext: false,
};

export default function SecuritySettingsPage() {
  const { status: sessionStatus } = useSession();
  const { toast } = useToast();
  const [form, setForm] = useState<PasswordFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [twoFactorOn, setTwoFactorOn] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (form.next.length < 12) {
      toast({ type: "error", title: "Password too short", description: "Minimum 12 characters." });
      return;
    }
    if (form.next !== form.confirm) {
      toast({ type: "error", title: "Passwords don't match" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        toast({
          type: "error",
          title: "Couldn't update password",
          description: body?.error?.message ?? `HTTP ${res.status}`,
        });
        return;
      }
      toast({ type: "success", title: "Password updated" });
      setForm(INITIAL_FORM);
    } catch (err) {
      toast({
        type: "error",
        title: "Network error",
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionStatus !== "authenticated") {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-60" />
        <p className="text-lg font-bold text-white mb-2">Sign in to manage security</p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to settings
      </Link>

      <header className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/15 rounded-2xl flex items-center justify-center border border-primary/30">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Security
          </h1>
          <p className="text-sm text-muted-foreground">
            Password, two-factor, and active sessions.
          </p>
        </div>
      </header>

      {/* Password change */}
      <section className="bg-[#121217] border border-white/8 rounded-2xl p-6 md:p-7">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-[0.22em] text-white/50">
            Password
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Use at least 12 characters. Mix letters, numbers, and symbols.
        </p>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <PasswordInput
            label="Current password"
            value={form.current}
            onChange={(v) => setForm((f) => ({ ...f, current: v }))}
            visible={form.showCurrent}
            onToggleVisible={() =>
              setForm((f) => ({ ...f, showCurrent: !f.showCurrent }))
            }
            autoComplete="current-password"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PasswordInput
              label="New password"
              value={form.next}
              onChange={(v) => setForm((f) => ({ ...f, next: v }))}
              visible={form.showNext}
              onToggleVisible={() =>
                setForm((f) => ({ ...f, showNext: !f.showNext }))
              }
              autoComplete="new-password"
              hint="≥ 12 characters"
            />
            <PasswordInput
              label="Confirm new password"
              value={form.confirm}
              onChange={(v) => setForm((f) => ({ ...f, confirm: v }))}
              visible={form.showNext}
              onToggleVisible={() =>
                setForm((f) => ({ ...f, showNext: !f.showNext }))
              }
              autoComplete="new-password"
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={submitting || !form.current || !form.next || !form.confirm}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                "Updating…"
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Update password
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* 2FA — UI placeholder */}
      <section className="bg-[#121217] border border-white/8 rounded-2xl p-6 md:p-7">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Two-factor authentication</h2>
              <p className="text-xs text-muted-foreground">
                Require a one-time code on every sign-in.
              </p>
            </div>
          </div>
          <Toggle
            on={twoFactorOn}
            onClick={() => {
              setTwoFactorOn((v) => !v);
              toast({
                type: "info",
                title: "Coming soon",
                description: "TOTP enrollment + recovery codes ship in the next release.",
              });
            }}
          />
        </div>
        {!twoFactorOn && (
          <div className="mt-4 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90">
              Your account is secured with a password only. Enable 2FA when it ships
              for an extra factor.
            </p>
          </div>
        )}
      </section>

      {/* Active sessions — UI placeholder */}
      <section className="bg-[#121217] border border-white/8 rounded-2xl p-6 md:p-7">
        <div className="flex items-center gap-2 mb-1">
          <Monitor className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-[0.22em] text-white/50">
            Active sessions
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Devices currently signed in to your account.
        </p>

        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-5 text-center">
          <Monitor className="w-6 h-6 text-muted-foreground mx-auto mb-3 opacity-60" />
          <p className="text-sm font-semibold text-white/70">
            Per-device session tracking is coming soon.
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            For now, signing out from the rail revokes only this browser. To revoke
            all sessions, change your password — that invalidates other tokens at the
            next refresh.
          </p>
        </div>
      </section>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40 mb-1.5 block">
        {label}
      </span>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 pr-11 py-3 text-sm font-medium text-white placeholder:text-white/20 outline-none focus:border-primary/40 transition-colors"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && (
        <span className="block text-[10px] text-muted-foreground mt-1">{hint}</span>
      )}
    </label>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
