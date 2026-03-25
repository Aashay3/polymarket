"use client";

import { useState } from "react";
import { Mail, ArrowRight, Command } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep("otp");
    }, 800);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setIsLoading(true);
    // Simulate verification
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 800);
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-[#000000] pb-20">
      {/* Background ambient effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-800 to-neutral-600 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      <div className="w-full max-w-md px-8 pt-10 pb-12 relative z-10 bg-[#050505] border border-neutral-800/60 rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/10">
            <Command className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
            {step === "email" ? "Log in or Sign up" : "Enter Verification Code"}
          </h1>
          <p className="text-neutral-400 text-sm text-center">
            {step === "email"
              ? "Use your email or another service to continue"
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {step === "email" ? (
          <div className="space-y-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#111] hover:bg-[#1a1a1a] text-white font-medium py-3 px-4 rounded-xl border border-neutral-800 transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#050505] px-2 text-neutral-500">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all font-mono text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-neutral-200 text-black font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Continue"}
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5, 6].map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  value={otp[idx] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !/^\d+$/.test(val)) return;

                    const newOtp = otp.split("");
                    newOtp[idx] = val;
                    setOtp(newOtp.join(""));

                    if (val && idx < 5) {
                      const nextInput = document.getElementById(`otp-${idx + 1}`);
                      nextInput?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                      const prevInput = document.getElementById(`otp-${idx - 1}`);
                      prevInput?.focus();
                    }
                  }}
                  id={`otp-${idx}`}
                  className="w-12 h-14 bg-[#0a0a0a] border border-neutral-800 rounded-xl text-center text-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition-all font-mono"
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-neutral-200 text-black font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Verify & Login"}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Back to email
            </button>
          </form>
        )}
      </div>

      <div className="fixed bottom-6 flex items-center gap-2 text-xs text-neutral-600 font-mono tracking-widest">
        <div className="w-2 h-2 rounded-full bg-green-500/50 relative">
          <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
        </div>
        POLYMARKET CLONE TERMINAL
      </div>
    </div>
  );
}
