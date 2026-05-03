"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Shield, CreditCard, Bell, Save, CheckCircle2, Globe, Moon, Sun, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsInput } from "@/components/ui/bits/BitsInput";
import { BitsTabs } from "@/components/ui/bits/BitsTabs";
import { BitsToggle } from "@/components/ui/bits/BitsToggle";
import { useTheme } from "@/app/context/ThemeContext";
import { useToast } from "@/app/context/ToastContext";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("Account");
  const [saved, setSaved] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Form State (display-only on the overview tab; the security tab now
  // links to /settings/security where the real form lives + posts to
  // /api/me/password)
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [notifs, setNotifs] = useState({ email: true, push: false, sms: true });

  const handleSave = () => {
    setSaved(true);
    toast({ type: "success", title: "Settings saved", description: "Your preferences have been updated." });
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: "Account", label: "Account", icon: <User className="w-3.5 h-3.5" /> },
    { id: "Security", label: "Security", icon: <Shield className="w-3.5 h-3.5" /> },
    { id: "Preferences", label: "Preferences", icon: <Globe className="w-3.5 h-3.5" /> },
    { id: "Notifications", label: "Notifications", icon: <Bell className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-2 font-medium">Manage your profile, security, and global platform preferences.</p>
        </div>
        
        <BitsTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === "Account" && (
          <div className="space-y-8">
            <BitsCard className="p-8">
              <div className="flex items-center gap-6 mb-10 pb-8 border-b border-white/5">
                <div className="relative group">
                   <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 transition-all group-hover:border-primary/50 group-hover:text-white">
                      <User className="w-9 h-9" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center transition-opacity cursor-pointer">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Change</span>
                      </div>
                   </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Profile Picture</h3>
                  <p className="text-xs text-muted-foreground">Supported formats: JPG, PNG, GIF. Max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Display Name</label>
                  <BitsInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Email Address</label>
                  <BitsInput value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" />
                </div>
              </div>
            </BitsCard>
          </div>
        )}

        {activeTab === "Security" && (
          <div className="space-y-8">
            <BitsCard className="p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Two-Factor Authentication</h3>
                  <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                    TOTP enrollment + recovery codes ship in the next release.
                    Toggle below is a preview only.
                  </p>
                </div>
                <BitsToggle enabled={twoFactor} onChange={setTwoFactor} />
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-white">Change password</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verifies your current password before applying the new one.
                  </p>
                </div>
                <Link
                  href="/settings/security"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-colors"
                >
                  Open password form <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-white">Active sessions</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per-device session list — coming soon.
                  </p>
                </div>
                <Link
                  href="/settings/security"
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-colors"
                >
                  View <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </BitsCard>
          </div>
        )}

        {activeTab === "Preferences" && (
          <div className="space-y-8 text-white">
            <BitsCard className="p-8 space-y-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                   <CreditCard className="w-4 h-4 text-primary" />
                   <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40">Default Currency</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {["INR", "USD", "EUR"].map(curr => (
                    <button 
                      key={curr}
                      onClick={() => setCurrency(curr)}
                      className={cn(
                        "h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all border",
                        currency === curr 
                          ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(34,197,94,0.1)]" 
                          : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                   <Moon className="w-4 h-4 text-blue-400" />
                   <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/40">Interface Theme</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <button
                    type="button"
                    aria-pressed={theme === "dark"}
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "p-6 rounded-2xl flex flex-col items-center gap-4 border transition-all",
                      theme === "dark" ? "bg-primary/5 border-primary/50 text-white" : "bg-white/2 border-white/5 text-muted-foreground hover:bg-white/5"
                    )}
                   >
                     <div className="w-12 h-12 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center">
                        <Moon className="w-6 h-6" />
                     </div>
                     <span className="font-bold">Dark Protocol</span>
                   </button>
                   <button
                    type="button"
                    aria-pressed={theme === "light"}
                    onClick={() => setTheme("light")}
                    className={cn(
                      "p-6 rounded-2xl flex flex-col items-center gap-4 border transition-all",
                      theme === "light" ? "bg-primary/5 border-primary/50 text-white" : "bg-white/2 border-white/5 text-muted-foreground hover:bg-white/5"
                    )}
                   >
                     <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-900">
                        <Sun className="w-6 h-6" />
                     </div>
                     <span className="font-bold">Light Mode</span>
                   </button>
                </div>
              </div>
            </BitsCard>
          </div>
        )}

        {activeTab === "Notifications" && (
           <div className="space-y-8">
              <BitsCard className="p-8 space-y-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">Alert Preferences</h3>
                    <p className="text-xs text-muted-foreground">Manage order fills, market results, and system updates.</p>
                  </div>
                  <BitsButton variant="ghost" className="h-9 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
                     Configure All
                  </BitsButton>
                </div>

                <div className="space-y-4">
                  {([
                    { key: "email", label: "Email Alerts" },
                    { key: "push",  label: "Browser Push" },
                    { key: "sms",   label: "Mobile SMS" },
                  ] as const).map(n => (
                    <div key={n.key} className="flex items-center justify-between p-4 bg-white/2 border border-white/5 rounded-xl">
                      <span className="text-sm font-bold text-white/80">{n.label}</span>
                      <BitsToggle
                        enabled={notifs[n.key]}
                        onChange={(next) => setNotifs(prev => ({ ...prev, [n.key]: next }))}
                      />
                    </div>
                  ))}
                </div>
              </BitsCard>
           </div>
        )}

        {/* Global Save Button */}
        <div className="flex items-center justify-end pt-4">
           <BitsButton 
            variant="primary" 
            onClick={handleSave}
            className="h-12 px-10 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98]"
           >
             {saved ? (
               <div className="flex items-center gap-2">
                 <CheckCircle2 className="w-5 h-5" /> <span>Sync Complete</span>
               </div>
             ) : (
               <div className="flex items-center gap-2">
                 <Save className="w-5 h-5" /> <span>Save Changes</span>
               </div>
             )}
           </BitsButton>
        </div>
      </div>
    </div>
  );
}
