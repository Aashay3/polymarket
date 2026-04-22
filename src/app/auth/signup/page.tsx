"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, User as UserIcon, Loader2, ArrowLeft } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsInput } from "@/components/ui/bits/BitsInput";
import { useToast } from "@/app/context/ToastContext";

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          username: username.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sign up failed.");
        return;
      }
      toast({ type: "success", title: "Account created", description: "Signing you in…" });
      const s = await signIn("credentials", { email, password, redirect: false });
      if (s?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/auth/signin");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-widest mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back home
        </Link>
        <BitsCard className="p-8 md:p-10">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Create account</h1>
          <p className="text-sm text-muted-foreground mb-8">Start trading on the markets that shape the future.</p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 z-10" />
                <BitsInput
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@nexora.io"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Username <span className="text-white/30 font-normal normal-case tracking-normal text-[10px]">(optional)</span></label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 z-10" />
                <BitsInput
                  type="text"
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_]+"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="trader_jane"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 z-10" />
                <BitsInput
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 12 characters"
                  className="pl-10"
                />
              </div>
              <p className="text-[10px] text-white/30 ml-1">12+ chars, mix of upper, lower, and a digit.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 z-10" />
                <BitsInput
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <BitsButton
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full h-12 rounded-xl font-black uppercase tracking-widest"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
            </BitsButton>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/signin" className="font-bold text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </BitsCard>
      </div>
    </div>
  );
}
