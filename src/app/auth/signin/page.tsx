"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsInput } from "@/components/ui/bits/BitsInput";
import { NexoraWordmark } from "@/components/ui/NexoraLogo";
import { useToast } from "@/app/context/ToastContext";

function SignInForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { toast } = useToast();
  const callbackUrl = search.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Invalid email or password.");
      } else if (res?.ok) {
        toast({ type: "success", title: "Welcome back" });
        router.push(callbackUrl);
        router.refresh();
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
        <div className="flex justify-center mb-6">
          <NexoraWordmark size={36} />
        </div>
        <BitsCard className="p-8 md:p-10">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-8">Welcome back — trade on what you believe.</p>

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
              <div className="flex items-center justify-between ml-1">
                <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-[11px] font-bold text-primary hover:text-white transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 z-10" />
                <BitsInput
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </BitsButton>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-bold text-primary hover:underline">
              Create one
            </Link>
          </div>
        </BitsCard>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
