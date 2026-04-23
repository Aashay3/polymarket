"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { BitsCard } from "@/components/ui/bits/BitsCard";
import { BitsButton } from "@/components/ui/bits/BitsButton";
import { BitsInput } from "@/components/ui/bits/BitsInput";
import { useToast } from "@/app/context/ToastContext";
import { useWallet } from "@/app/context/WalletContext";

interface WithdrawalRow {
  id: string;
  toAddress: string;
  amount: string;
  status: "PENDING" | "COMPLETED" | "REJECTED" | "CANCELLED";
  txHash: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  processedAt: string | null;
  chainId: number;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const body = await res.json();
  if (!body.ok) throw new Error(body?.error?.message ?? "Request failed");
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

function shortAddr(s: string): string {
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function StatusPill({ status }: { status: WithdrawalRow["status"] }) {
  const base = "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full";
  if (status === "COMPLETED") return <span className={`${base} bg-yes/10 text-yes border border-yes/20`}>Sent</span>;
  if (status === "REJECTED") return <span className={`${base} bg-no/10 text-no border border-no/20`}>Rejected</span>;
  if (status === "CANCELLED") return <span className={`${base} bg-white/5 text-muted-foreground border border-white/10`}>Cancelled</span>;
  return <span className={`${base} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`}>Processing</span>;
}

export default function WithdrawPage() {
  const { toast } = useToast();
  const { balance } = useWallet();
  const [history, setHistory] = useState<WithdrawalRow[]>([]);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<{ withdrawals: WithdrawalRow[] }>("/api/withdrawals?limit=20");
      setHistory(data.withdrawals);
    } catch (e) {
      toast({ type: "error", title: "Could not load withdrawal history", description: e instanceof Error ? e.message : undefined });
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ type: "error", title: "Enter a valid amount" });
      return;
    }
    if (amt > balance) {
      toast({ type: "error", title: "Insufficient balance", description: `You have $${balance.toFixed(2)} available` });
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      toast({ type: "error", title: "Invalid Ethereum address" });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/withdrawals", { toAddress, amount: amt.toFixed(6) });
      toast({
        type: "success",
        title: "Withdrawal requested",
        description: `${amt.toFixed(2)} USDC locked. Admin will process shortly.`,
      });
      setAmount("");
      setToAddress("");
      refresh();
    } catch (err) {
      toast({ type: "error", title: "Request failed", description: err instanceof Error ? err.message : undefined });
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
        <h1 className="text-xl font-bold text-white">Withdraw USDC</h1>
      </div>

      <BitsCard className="p-6 space-y-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-1">Available balance</p>
          <p className="text-3xl font-bold text-white font-mono">${balance.toFixed(2)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Destination address</label>
            <BitsInput
              placeholder="0x…"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value.trim())}
              className="font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Amount (USDC)</label>
            <BitsInput
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setAmount(balance.toFixed(2))}
              className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Use max
            </button>
          </div>

          <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3 text-[11px] text-yellow-400/90 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p>
              Withdrawals are reviewed by an operator and typically processed within 24 hours. The amount is locked from your balance immediately and returned if rejected.
            </p>
          </div>

          <BitsButton variant="primary" type="submit" disabled={submitting || !amount || !toAddress} className="w-full">
            {submitting ? "Submitting…" : "Request withdrawal"}
          </BitsButton>
        </form>
      </BitsCard>

      {/* History */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" /> Recent withdrawals
        </h2>
        {history.length === 0 ? (
          <BitsCard className="p-8 text-center text-sm text-muted-foreground">
            No withdrawals yet.
          </BitsCard>
        ) : (
          <div className="bg-[#121217] border border-white/8 rounded-2xl divide-y divide-white/5">
            {history.map((w) => (
              <div key={w.id} className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">−${parseFloat(w.amount).toFixed(2)}</p>
                  <StatusPill status={w.status} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[11px] font-mono text-muted-foreground">to {shortAddr(w.toAddress)}</p>
                  {w.txHash && (
                    <a
                      href={explorerUrl(w.chainId, w.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-mono text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      tx
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  <span className="text-[10px] text-white/30">{new Date(w.requestedAt).toLocaleString()}</span>
                </div>
                {w.rejectionReason && <p className="text-[11px] text-no mt-1">{w.rejectionReason}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
