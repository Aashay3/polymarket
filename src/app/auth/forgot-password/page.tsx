"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

/**
 * /auth/forgot-password — request a reset link by email.
 *
 * The API always returns 200 even when the email isn't on file (no
 * user enumeration), so the success state here is shown for every
 * submission. The "if it exists" wording is intentional.
 */

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body?.error?.message ?? `HTTP ${res.status}`);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

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
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Forgot your password?
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the email on your account and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="bg-yes/10 border border-yes/30 rounded-xl p-5 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-yes shrink-0 mt-0.5" />
            <div className="text-sm text-white/90">
              <p className="font-bold mb-1">Check your inbox.</p>
              <p className="text-xs text-white/70">
                If <span className="font-mono text-white">{email}</span> is on
                file, a reset link is on the way. The link expires in 30 minutes.
              </p>
              <p className="text-[11px] text-white/50 mt-3">
                Didn&apos;t get it? Check spam, or{" "}
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="text-white underline underline-offset-2 hover:text-primary transition-colors"
                >
                  try a different email
                </button>
                .
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40 mb-1.5 block">
                Email address
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder:text-white/20 outline-none focus:border-primary/40 transition-colors"
              />
            </label>

            {error && (
              <p className="text-xs text-no font-semibold">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !email.includes("@")}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-muted-foreground border-t border-white/5 pt-5">
          Remembered it?{" "}
          <Link href="/auth/signin" className="text-primary hover:underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
