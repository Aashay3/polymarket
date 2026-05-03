"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";

/**
 * /auth/reset-password?token=… — consume a reset token, set a new password.
 *
 * The page reads the token from the URL once (no hot-reading on every
 * keystroke). Submission posts to /api/auth/reset-password; the
 * server validates expiry, mark-as-used, and the password policy. On
 * success the user is bounced to /auth/signin with a callback so they
 * can sign in immediately.
 *
 * Wrapped in Suspense per Next 16 — useSearchParams suspends the
 * client tree until the URL is resolved.
 */

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      setDone(true);
      // Bounce after a beat so the user sees confirmation.
      setTimeout(() => {
        router.replace("/auth/signin?reset=ok");
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto pt-16 pb-12 px-4">
        <div className="bg-[#121217] border border-white/8 rounded-3xl p-7 md:p-8 text-center">
          <p className="text-base font-bold text-white mb-2">
            Missing reset token
          </p>
          <p className="text-sm text-muted-foreground mb-5">
            This page needs a token in the URL. If you got here from an
            email, the link may be malformed.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
          >
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-16 pb-12 px-4">
      <Link
        href="/auth/signin"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
      </Link>

      <div className="bg-[#121217] border border-white/8 rounded-3xl p-7 md:p-8 space-y-6">
        <div>
          <div className="w-12 h-12 mb-4 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Choose a new password
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            At least 12 characters. Mix letters, numbers, and symbols.
          </p>
        </div>

        {done ? (
          <div className="bg-yes/10 border border-yes/30 rounded-xl p-5 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-yes shrink-0 mt-0.5" />
            <div className="text-sm text-white/90">
              <p className="font-bold mb-1">Password updated.</p>
              <p className="text-xs text-white/70">
                Redirecting you to sign in…
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              show={showPw}
              onToggleShow={() => setShowPw((s) => !s)}
              autoComplete="new-password"
              hint="≥ 12 characters"
            />
            <PasswordField
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              show={showPw}
              onToggleShow={() => setShowPw((s) => !s)}
              autoComplete="new-password"
            />

            {error && (
              <p className="text-xs text-no font-semibold">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !password || !confirm}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
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
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 pr-11 py-3 text-sm font-medium text-white placeholder:text-white/20 outline-none focus:border-primary/40 transition-colors"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && (
        <span className="block text-[10px] text-muted-foreground mt-1">{hint}</span>
      )}
    </label>
  );
}
