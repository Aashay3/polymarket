"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Mail,
  Smartphone,
  MessageSquare,
  Shield,
  Info,
  CheckCircle2,
  Save,
  ArrowLeft,
} from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { useToast } from "@/app/context/ToastContext";

/**
 * /settings/notifications — channel preferences, persisted via
 * GET/PATCH /api/me/notifications/preferences.
 *
 * Lazy-creates a NotificationPreference row on first GET. Defaults
 * are "important alerts on, marketing alerts off."
 *
 * The toggles update local state immediately; "Save preferences"
 * fires the PATCH. Optimistic UX would also work here but the page
 * is rare enough that the explicit save reads clearer.
 */

interface Preferences {
  emailTradeFills: boolean;
  emailMarketResolutions: boolean;
  emailSecurityAlerts: boolean;
  pushPriceAlerts: boolean;
  pushTrendingMarkets: boolean;
  pushSystemUpdates: boolean;
  smsSecurityAlerts: boolean;
}

const DEFAULTS: Preferences = {
  emailTradeFills: true,
  emailMarketResolutions: true,
  emailSecurityAlerts: true,
  pushPriceAlerts: false,
  pushTrendingMarkets: false,
  pushSystemUpdates: false,
  smsSecurityAlerts: false,
};

const EMAIL_FIELDS = [
  { key: "emailTradeFills",        label: "Trade confirmations", desc: "Get notified when your orders are filled" },
  { key: "emailMarketResolutions", label: "Market resolutions",  desc: "Results for markets you participated in" },
  { key: "emailSecurityAlerts",    label: "Security alerts",     desc: "Important changes to your account safety" },
] as const;

const PUSH_FIELDS = [
  { key: "pushPriceAlerts",     label: "Price alerts",     desc: "Large price movements in your watched markets" },
  { key: "pushTrendingMarkets", label: "Trending markets", desc: "Daily round-up of the hottest opportunities" },
  { key: "pushSystemUpdates",   label: "System updates",   desc: "New features and platform improvements" },
] as const;

const SMS_FIELDS = [
  { key: "smsSecurityAlerts", label: "Security alerts", desc: "Critical only — sign-ins, password changes, large withdrawals" },
] as const;

type FetchState =
  | { status: "loading" }
  | { status: "ready"; prefs: Preferences }
  | { status: "error"; message: string };

export default function NotificationsSettingsPage() {
  const { status: sessionStatus } = useSession();
  const { toast } = useToast();
  const [state, setState] = useState<FetchState>({ status: "loading" });
  const [draft, setDraft] = useState<Preferences>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    let cancelled = false;
    fetch("/api/me/notifications/preferences")
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (!body.ok) {
          setState({ status: "error", message: body.error?.message ?? "Failed to load" });
          return;
        }
        const prefs: Preferences = { ...DEFAULTS, ...body.data.preferences };
        setState({ status: "ready", prefs });
        setDraft(prefs);
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
  }, [sessionStatus]);

  const ready = state.status === "ready";
  const dirty =
    ready && JSON.stringify(state.prefs) !== JSON.stringify(draft);

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/notifications/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        toast({
          type: "error",
          title: "Couldn't save",
          description: body?.error?.message ?? `HTTP ${res.status}`,
        });
        return;
      }
      const updated: Preferences = { ...DEFAULTS, ...body.data.preferences };
      setState({ status: "ready", prefs: updated });
      setDraft(updated);
      toast({ type: "success", title: "Preferences saved" });
    } catch (err) {
      toast({
        type: "error",
        title: "Network error",
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof Preferences, value: boolean) =>
    setDraft((p) => ({ ...p, [key]: value }));

  if (sessionStatus !== "authenticated") {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-lg font-bold text-white mb-2">
          Sign in to manage notification preferences
        </p>
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="max-w-5xl mx-auto pb-20 pt-8 animate-pulse space-y-6">
        <div className="h-12 bg-white/5 rounded-xl w-1/3" />
        <div className="h-72 bg-white/5 rounded-2xl" />
        <div className="h-72 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <p className="text-sm text-no font-semibold">
          Couldn&apos;t load preferences: {state.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to settings
      </Link>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Notification settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">
          Control how and when you receive platform updates and trade alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <ChannelCard
            icon={<Mail className="w-4 h-4 text-primary" />}
            title="Email"
            fields={EMAIL_FIELDS}
            draft={draft}
            onSet={set}
          />
          <ChannelCard
            icon={<Smartphone className="w-4 h-4 text-blue-400" />}
            title="Browser push"
            fields={PUSH_FIELDS}
            draft={draft}
            onSet={set}
          />
          <ChannelCard
            icon={<MessageSquare className="w-4 h-4 text-emerald-400" />}
            title="SMS"
            fields={SMS_FIELDS}
            draft={draft}
            onSet={set}
          />
        </div>

        <div className="space-y-6">
          <BitsCard className="p-8 border-primary/20 bg-primary/2">
            <h3 className="text-base font-bold text-white mb-4">Save changes</h3>
            <p className="text-sm text-neutral-400 leading-relaxed mb-6">
              {dirty
                ? "You have unsaved changes. Hit save to persist them across sessions."
                : "All preferences are up to date."}
            </p>
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 mb-6">
              <Shield className="w-5 h-5 text-yes shrink-0" />
              <p className="text-xs font-bold text-neutral-300">
                Security alerts are always sent for sign-ins, password changes,
                and large withdrawals — even if the channel toggle is off.
              </p>
            </div>

            <BitsButton
              variant="primary"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="w-full h-11 rounded-xl"
            >
              {saving ? (
                "Saving…"
              ) : !dirty ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Saved
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save preferences
                </span>
              )}
            </BitsButton>
          </BitsCard>

          <div className="flex items-center gap-3 p-4 text-neutral-500">
            <Info className="w-4 h-4 shrink-0" />
            <p className="text-[11px] font-medium leading-normal">
              Email and SMS dispatchers aren&apos;t wired yet — the toggles
              persist, but actual delivery depends on a downstream provider
              (Resend / Twilio).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({
  icon,
  title,
  fields,
  draft,
  onSet,
}: {
  icon: React.ReactNode;
  title: string;
  fields: ReadonlyArray<{ key: keyof Preferences; label: string; desc: string }>;
  draft: Preferences;
  onSet: (key: keyof Preferences, value: boolean) => void;
}) {
  return (
    <BitsCard className="p-6">
      <h2 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="space-y-4">
        {fields.map((f) => (
          <div
            key={f.key}
            className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
          >
            <div className="min-w-0 pr-4">
              <p className="text-sm font-bold text-white">{f.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
            <Toggle
              on={draft[f.key]}
              onChange={(v) => onSet(f.key, v)}
            />
          </div>
        ))}
      </div>
    </BitsCard>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
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
