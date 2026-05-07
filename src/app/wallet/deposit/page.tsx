"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  HelpCircle,
  Wallet as WalletIcon,
  Clock,
  CircleDollarSign,
} from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

/**
 * /wallet/deposit — fund the platform balance with USDC.
 *
 * Layout (lg+):
 *
 *   ┌───────────────── 8 ─────────────────┬──── 4 ─────┐
 *   │ Violet hero (network + address)     │ Security   │
 *   │ Stats strip (lifetime / pending)    │ Network    │
 *   │ Step 2 form (paste tx hash)         │ Help       │
 *   │ Recent deposits list                │            │
 *   └─────────────────────────────────────┴────────────┘
 *
 * The flow itself is unchanged — user sends USDC on-chain, pastes the
 * tx hash, server verifies via /api/deposits and credits the balance
 * once `minConfirmations` blocks have landed.
 */

interface DepositAddress {
  address: string;
  chainId: number;
  tokenAddress: string;
  minConfirmations: number;
}

interface DepositRow {
  id: string;
  txHash: string;
  amount: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  rejectionReason: string | null;
  fromAddress: string;
  createdAt: string;
  confirmedAt: string | null;
}

interface ApiFailure extends Error {
  code?: string;
  status?: number;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const body = await res.json().catch(() => ({ ok: false, error: { message: "Bad response" } }));
  if (!body.ok) {
    const e: ApiFailure = new Error(body?.error?.message ?? `HTTP ${res.status}`);
    e.code = body?.error?.code;
    e.status = res.status;
    throw e;
  }
  return body.data as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json();
  if (!payload.ok) throw new Error(payload?.error?.message ?? "Request failed");
  return payload.data as T;
}

function explorerUrl(chainId: number, txHash: string): string {
  return chainId === 137
    ? `https://polygonscan.com/tx/${txHash}`
    : `https://amoy.polygonscan.com/tx/${txHash}`;
}

function shortHash(s: string): string {
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StatusPill({ status }: { status: DepositRow["status"] }) {
  const base = "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border";
  if (status === "CONFIRMED")
    return <span className={`${base} bg-yes/10 text-yes border-yes/20`}>Confirmed</span>;
  if (status === "REJECTED")
    return <span className={`${base} bg-no/10 text-no border-no/20`}>Rejected</span>;
  return <span className={`${base} bg-amber-400/10 text-amber-400 border-amber-400/20`}>Pending</span>;
}

export default function DepositPage() {
  const { toast } = useToast();
  const [meta, setMeta] = useState<DepositAddress | null>(null);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [needsSignin, setNeedsSignin] = useState(false);

  const refresh = useCallback(async () => {
    const [addrRes, listRes] = await Promise.allSettled([
      apiGet<DepositAddress>("/api/deposits/address"),
      apiGet<{ deposits: DepositRow[] }>("/api/deposits?limit=20"),
    ]);

    if (addrRes.status === "fulfilled") {
      setMeta(addrRes.value);
      setNotConfigured(false);
    } else {
      const e = addrRes.reason as ApiFailure;
      if (e?.code === "NOT_CONFIGURED") setNotConfigured(true);
      else toast({ type: "error", title: "Could not load deposit address", description: e?.message });
    }

    if (listRes.status === "fulfilled") {
      setDeposits(listRes.value.deposits);
      setNeedsSignin(false);
    } else {
      const e = listRes.reason as ApiFailure;
      if (e?.status === 401) setNeedsSignin(true);
      else console.error("deposit history failed", e);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const copyAddress = async () => {
    if (!meta) return;
    try {
      await navigator.clipboard.writeText(meta.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ type: "error", title: "Copy failed" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      toast({ type: "error", title: "Invalid transaction hash" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<{ deposit: DepositRow; duplicate?: boolean }>("/api/deposits", { txHash });
      if (res.duplicate) {
        toast({ type: "info", title: "Already submitted", description: `Status: ${res.deposit.status}` });
      } else if (res.deposit.status === "CONFIRMED") {
        toast({ type: "success", title: `+${parseFloat(res.deposit.amount).toFixed(2)} USDC credited` });
      } else {
        toast({
          type: "info",
          title: `Status: ${res.deposit.status}`,
          description: res.deposit.rejectionReason ?? undefined,
        });
      }
      setTxHash("");
      refresh();
    } catch (e) {
      toast({ type: "error", title: "Submission failed", description: e instanceof Error ? e.message : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  // Stats derived from history (lifetime, pending count, last activity)
  const stats = useMemo(() => {
    const confirmed = deposits.filter((d) => d.status === "CONFIRMED");
    const pending = deposits.filter((d) => d.status === "PENDING");
    const lifetime = confirmed.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);
    const last = deposits[0];
    return {
      lifetime,
      pendingCount: pending.length,
      lastIso: last?.createdAt ?? null,
    };
  }, [deposits]);

  const networkLabel = meta?.chainId === 137 ? "Polygon Mainnet" : "Polygon Amoy";
  const isTestnet = meta?.chainId !== 137;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Back + page heading */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/wallet"
          className="p-2 rounded-xl bg-[#121217] border border-white/8 text-muted-foreground hover:text-white hover:border-white/15 transition-colors"
          aria-label="Back to wallet"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Deposit</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fund your balance with on-chain USDC
          </p>
        </div>
      </div>

      {/* Top-level alerts */}
      {notConfigured && (
        <div className="mb-6 bg-amber-500/[0.06] border border-amber-500/25 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-400">Deposits not configured yet</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            The operator hasn&apos;t set up the deposit address. Add these to{" "}
            <code className="font-mono text-amber-400/80">.env.local</code> and restart:
          </p>
          <pre className="bg-black/30 border border-white/5 rounded-lg p-3 text-[11px] font-mono text-white/80 overflow-x-auto">{`DEPOSIT_ADDRESS=0x...                       # your ops wallet
USDC_CONTRACT_ADDRESS=0x41E94Eb019...       # Polygon Amoy USDC
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_RPC_URL=https://rpc-amoy.polygon.technology`}</pre>
          <p className="text-[11px] text-muted-foreground">
            Full setup docs: <code className="font-mono">docs/DEPLOY.md</code>
          </p>
        </div>
      )}

      {needsSignin && (
        <div className="mb-6 bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" />
            <p className="text-sm text-white">
              Sign in to see your deposit history and submit a transaction.
            </p>
          </div>
          <Link
            href="/auth/signin"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── Main column ───────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Hero — violet gradient with the deposit address */}
          <section
            aria-label="Deposit address"
            className="relative overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.6)]"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-linear-to-br from-violet-700 via-fuchsia-600 to-purple-900"
            />
            <div
              aria-hidden
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-fuchsia-400/30 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-violet-500/30 blur-3xl"
            />

            <div className="relative p-6 md:p-8 space-y-5">
              {/* Step indicator + network badge */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[10px] font-black tracking-[0.22em] uppercase text-white">
                  Step 1 · Send
                </span>
                {meta && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm border border-white/15 text-[11px] font-bold text-white">
                    <span className={`w-1.5 h-1.5 rounded-full ${isTestnet ? "bg-amber-400" : "bg-emerald-400"} shadow-[0_0_8px_currentColor]`} />
                    {networkLabel}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-[1.05]">
                  Send USDC to your deposit address
                </h2>
                <p className="text-sm md:text-[15px] text-white/85 mt-2 max-w-lg">
                  Once the network reaches{" "}
                  <span className="font-black text-white">{meta?.minConfirmations ?? 12} confirmations</span>,
                  the funds land in your platform balance.
                </p>
              </div>

              {/* Address tile */}
              {meta ? (
                <div className="rounded-2xl bg-black/35 backdrop-blur-sm border border-white/15 p-4 md:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                      Deposit Address
                    </p>
                    <p className="text-[10px] font-bold text-white/60 font-mono">USDC · ERC-20</p>
                  </div>

                  <p className="font-mono text-sm md:text-[15px] text-white break-all leading-relaxed select-all">
                    {meta.address}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyAddress}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-purple-900 text-sm font-black tracking-wide shadow-[0_6px_18px_-4px_rgba(0,0,0,0.4)] hover:translate-y-[-1px] hover:shadow-[0_10px_24px_-4px_rgba(0,0,0,0.5)] transition-all"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy address
                        </>
                      )}
                    </button>
                    <a
                      href={
                        meta.chainId === 137
                          ? `https://polygonscan.com/address/${meta.address}`
                          : `https://amoy.polygonscan.com/address/${meta.address}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-colors"
                      title="View on explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex items-start gap-2 px-1 pt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-white/85 leading-snug">
                      Only send <span className="font-black">USDC</span> on{" "}
                      <span className="font-black">{networkLabel}</span>. Other tokens or
                      wrong-network funds will be lost.
                    </p>
                  </div>
                </div>
              ) : !notConfigured ? (
                <div className="h-44 bg-white/10 rounded-2xl animate-pulse border border-white/10" />
              ) : null}
            </div>
          </section>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              icon={<CircleDollarSign className="w-3.5 h-3.5" />}
              label="Lifetime deposited"
              value={`$${stats.lifetime.toFixed(2)}`}
              accent="text-white"
            />
            <StatTile
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Pending"
              value={stats.pendingCount.toString()}
              accent={stats.pendingCount > 0 ? "text-amber-400" : "text-white"}
            />
            <StatTile
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Last activity"
              value={stats.lastIso ? relativeTime(stats.lastIso) : "—"}
              accent="text-white"
            />
          </div>

          {/* Step 2 — submit tx hash */}
          <section className="bg-[#121217] border border-white/8 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-black tracking-[0.22em] uppercase text-primary">
                Step 2 · Verify
              </span>
              <p className="text-[11px] text-muted-foreground">
                Paste the tx hash from your wallet after sending
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <input
                  placeholder="0x…"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value.trim())}
                  className="w-full font-mono text-sm bg-[#0c0c10] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-primary/40 transition-colors"
                />
                {txHash && /^0x[a-fA-F0-9]{64}$/.test(txHash) && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yes" />
                )}
              </div>
              <button
                type="submit"
                disabled={submitting || !txHash}
                className="w-full py-3 rounded-xl bg-primary text-white text-sm font-black tracking-wide hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Verifying on-chain…" : "Submit deposit"}
              </button>
            </form>
          </section>

          {/* Recent deposits */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Recent deposits
              </h2>
              {deposits.length > 0 && (
                <p className="text-[11px] font-bold text-muted-foreground">
                  {deposits.length} {deposits.length === 1 ? "entry" : "entries"}
                </p>
              )}
            </div>

            {deposits.length === 0 ? (
              <div className="bg-[#121217] border border-dashed border-white/10 rounded-2xl p-10 text-center">
                <WalletIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold text-white mb-1">No deposits yet</p>
                <p className="text-xs text-muted-foreground">
                  Your first deposit will show up here once it lands on-chain.
                </p>
              </div>
            ) : (
              <ul className="bg-[#121217] border border-white/8 rounded-2xl divide-y divide-white/5 overflow-hidden">
                {deposits.map((d) => (
                  <li
                    key={d.id}
                    className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.03] transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        d.status === "CONFIRMED"
                          ? "bg-yes/10 text-yes"
                          : d.status === "REJECTED"
                            ? "bg-no/10 text-no"
                            : "bg-amber-400/10 text-amber-400"
                      }`}
                    >
                      <CircleDollarSign className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white tabular-nums">
                          {d.status === "CONFIRMED"
                            ? `+${parseFloat(d.amount).toFixed(2)} USDC`
                            : d.status === "REJECTED"
                              ? "Rejected"
                              : "Pending confirmation"}
                        </p>
                        <StatusPill status={d.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {meta && (
                          <a
                            href={explorerUrl(meta.chainId, d.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-mono text-muted-foreground hover:text-white transition-colors inline-flex items-center gap-1"
                          >
                            {shortHash(d.txHash)}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        <span className="text-[10px] text-white/30">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {relativeTime(d.createdAt)}
                        </span>
                      </div>
                      {d.rejectionReason && (
                        <p className="text-[11px] text-no mt-1">{d.rejectionReason}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Security tips */}
          <div className="bg-[#121217] border border-white/8 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-black text-white">Before you send</h3>
            </div>
            <ul className="space-y-2 text-[12px] text-muted-foreground">
              <Tip>Double-check the address — copy, don&apos;t type.</Tip>
              <Tip>USDC only. Other tokens are unrecoverable.</Tip>
              <Tip>{networkLabel} only. Wrong network = lost funds.</Tip>
              <Tip>Test with a small amount on your first deposit.</Tip>
            </ul>
          </div>

          {/* Network details */}
          {meta && (
            <div className="bg-[#121217] border border-white/8 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-black text-white">Network</h3>
              </div>
              <dl className="text-[12px] space-y-2">
                <NetRow label="Chain" value={networkLabel} />
                <NetRow label="Token" value="USDC (ERC-20)" />
                <NetRow
                  label="Confirmations"
                  value={`${meta.minConfirmations} blocks`}
                />
                <NetRow label="Chain ID" value={meta.chainId.toString()} mono />
              </dl>
              {isTestnet && (
                <p className="text-[11px] text-amber-400/90 bg-amber-400/8 border border-amber-400/20 rounded-lg px-3 py-2">
                  Testnet mode — get free USDC from a{" "}
                  <a
                    href="https://faucet.circle.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline"
                  >
                    Circle faucet
                  </a>
                  .
                </p>
              )}
            </div>
          )}

          {/* Help */}
          <div className="bg-[#121217] border border-white/8 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-fuchsia-400" />
              </div>
              <h3 className="text-sm font-black text-white">Need help?</h3>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Stuck waiting for confirmation, or sent on the wrong network? Open a
              ticket and we&apos;ll trace the tx.
            </p>
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
            >
              Contact support →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="bg-[#121217] border border-white/8 rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-lg md:text-xl font-black tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

function NetRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-white font-bold ${mono ? "font-mono text-[11px]" : ""}`}>{value}</dd>
    </div>
  );
}
