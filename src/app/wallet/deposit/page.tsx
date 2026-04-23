"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, AlertCircle, ExternalLink, Clock } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsInput } from "@/components/ui/bits/BitsInput";
import { useToast } from "@/app/context/ToastContext";

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
  // Polygon mainnet 137, Amoy testnet 80002
  return chainId === 137
    ? `https://polygonscan.com/tx/${txHash}`
    : `https://amoy.polygonscan.com/tx/${txHash}`;
}

function shortHash(s: string): string {
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function StatusPill({ status }: { status: DepositRow["status"] }) {
  const base = "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full";
  if (status === "CONFIRMED") return <span className={`${base} bg-yes/10 text-yes border border-yes/20`}>Confirmed</span>;
  if (status === "REJECTED") return <span className={`${base} bg-no/10 text-no border border-no/20`}>Rejected</span>;
  return <span className={`${base} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`}>Pending</span>;
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
    // Settle each request independently so one failure doesn't kill the
    // other. The address endpoint is public; the history endpoint needs
    // auth. They fail for different reasons on a fresh setup.
    const [addrRes, listRes] = await Promise.allSettled([
      apiGet<DepositAddress>("/api/deposits/address"),
      apiGet<{ deposits: DepositRow[] }>("/api/deposits?limit=20"),
    ]);

    if (addrRes.status === "fulfilled") {
      setMeta(addrRes.value);
      setNotConfigured(false);
    } else {
      const e = addrRes.reason as ApiFailure;
      if (e?.code === "NOT_CONFIGURED") {
        setNotConfigured(true);
      } else {
        toast({ type: "error", title: "Could not load deposit address", description: e?.message });
      }
    }

    if (listRes.status === "fulfilled") {
      setDeposits(listRes.value.deposits);
      setNeedsSignin(false);
    } else {
      const e = listRes.reason as ApiFailure;
      if (e?.status === 401) {
        setNeedsSignin(true);
      } else {
        // Silent — empty history is fine, the main form still works.
        console.error("deposit history failed", e);
      }
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
        toast({ type: "info", title: `Status: ${res.deposit.status}`, description: res.deposit.rejectionReason ?? undefined });
      }
      setTxHash("");
      refresh();
    } catch (e) {
      toast({ type: "error", title: "Submission failed", description: e instanceof Error ? e.message : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="p-2 rounded-xl bg-[#121217] border border-white/8 text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-bold text-white">Deposit USDC</h1>
      </div>

      {notConfigured && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-yellow-400">Deposits not configured yet</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            The operator hasn&apos;t set up the deposit address. Add these to your <code className="font-mono text-yellow-400/80">.env.local</code> and restart the server:
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
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" />
            <p className="text-sm text-white">Sign in to see your deposit history and submit a deposit.</p>
          </div>
          <Link href="/auth/signin" className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors">
            Sign in
          </Link>
        </div>
      )}

      {/* Instructions */}
      <BitsCard className="p-6 space-y-5">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-2">Step 1 — Send USDC</p>
          <p className="text-sm text-muted-foreground">
            Send USDC from your linked wallet to the address below. The deposit will be credited to your balance once {meta?.minConfirmations ?? 12} block confirmations are reached.
          </p>
        </div>

        {meta ? (
          <div className="bg-[#0c0c10] border border-white/10 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Deposit Address</p>
              <p className="text-[10px] font-bold text-muted-foreground">
                {meta.chainId === 137 ? "Polygon Mainnet" : "Polygon Amoy (testnet)"}
              </p>
            </div>
            <p className="font-mono text-xs text-white break-all">{meta.address}</p>
            <BitsButton variant="outline" onClick={copyAddress} className="w-full gap-2">
              {copied ? <Check className="w-3.5 h-3.5 text-yes" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy address"}
            </BitsButton>
            <p className="text-[11px] text-yellow-400/80 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              Only send USDC on the {meta.chainId === 137 ? "Polygon" : "Polygon Amoy"} network. Sending other tokens or wrong-network funds will be lost.
            </p>
          </div>
        ) : (
          <div className="h-24 bg-white/2 rounded-xl animate-pulse" />
        )}

        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-2">Step 2 — Paste the transaction hash</p>
          <p className="text-sm text-muted-foreground">
            Copy the transaction hash from your wallet after sending, then paste below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <BitsInput
            placeholder="0x…"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value.trim())}
            className="font-mono text-xs"
          />
          <BitsButton variant="primary" type="submit" disabled={submitting || !txHash} className="w-full">
            {submitting ? "Verifying on-chain…" : "Submit deposit"}
          </BitsButton>
        </form>
      </BitsCard>

      {/* History */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" /> Recent deposits
        </h2>
        {deposits.length === 0 ? (
          <BitsCard className="p-8 text-center text-sm text-muted-foreground">
            No deposits yet. Your first deposit will appear here.
          </BitsCard>
        ) : (
          <div className="bg-[#121217] border border-white/8 rounded-2xl divide-y divide-white/5">
            {deposits.map((d) => (
              <div key={d.id} className="px-5 py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">
                      {d.status === "CONFIRMED" ? `+${parseFloat(d.amount).toFixed(2)} USDC` : d.status === "REJECTED" ? "Rejected" : "Pending"}
                    </p>
                    <StatusPill status={d.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {meta && (
                      <a
                        href={explorerUrl(meta.chainId, d.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-mono text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                      >
                        {shortHash(d.txHash)}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    <span className="text-[10px] text-white/30">{new Date(d.createdAt).toLocaleString()}</span>
                  </div>
                  {d.rejectionReason && <p className="text-[11px] text-no mt-1">{d.rejectionReason}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
