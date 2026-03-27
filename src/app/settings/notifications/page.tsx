"use client";

import { useState } from "react";
import { Bell, Mail, Smartphone, Shield, Info, CheckCircle2 } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";

export default function NotificationsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Notification Settings</h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">Control how and when you receive platform updates and trade alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <BitsCard className="p-6">
            <h2 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Email Notifications
            </h2>
            <div className="space-y-4">
              {[
                { id: "e1", label: "Trade Confirmations", desc: "Get notified when your orders are filled" },
                { id: "e2", label: "Market Resolutions", desc: "Results for markets you participated in" },
                { id: "e3", label: "Security Alerts", desc: "Important changes to your account safety" }
              ].map(item => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-white">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary cursor-pointer" />
                </div>
              ))}
            </div>
          </BitsCard>

          <BitsCard className="p-6">
            <h2 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" /> Push Notifications
            </h2>
            <div className="space-y-4">
              {[
                { id: "p1", label: "Price Alerts", desc: "Large price movements in your watched markets" },
                { id: "p2", label: "Trending Markets", desc: "Daily round-up of the hottest opportunities" },
                { id: "p3", label: "System Updates", desc: "New features and platform improvements" }
              ].map(item => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-white">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5 accent-primary cursor-pointer" />
                </div>
              ))}
            </div>
          </BitsCard>
        </div>

        <div className="space-y-6">
          <BitsCard className="p-8 border-primary/20 bg-primary/2">
            <h3 className="text-base font-bold text-white mb-4">Notification Summary</h3>
            <p className="text-sm text-neutral-400 leading-relaxed mb-6">
              You will receive approximately <span className="text-white font-bold">4-6 updates</span> per day based on your current volume and preferences. We prioritize trade security and market resolutions above all else.
            </p>
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 mb-8">
              <Shield className="w-5 h-5 text-yes" />
              <p className="text-xs font-bold text-neutral-300">Your email is verified and secure.</p>
            </div>
            
            <BitsButton variant="primary" onClick={handleSave} className="w-full h-11 rounded-xl">
              {saved ? (
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Changes Saved</span>
              ) : (
                "Save Preferences"
              )}
            </BitsButton>
          </BitsCard>

          <div className="flex items-center gap-3 p-4 text-neutral-500">
            <Info className="w-4 h-4 shrink-0" />
            <p className="text-[11px] font-medium leading-normal">
              Changes to notification settings may take up to 10 minutes to propagate across all global servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
