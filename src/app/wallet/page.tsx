"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Plus, Wallet, CreditCard, Zap, History, Eye, EyeOff, X, Check, RefreshCw } from "lucide-react";
import { Sparkline } from "@/components/ui/Sparkline";
import { useWallet } from "@/app/context/WalletContext";

const BALANCE_HISTORY = [920, 870, 950, 890, 1010, 980, 1060, 1020, 1140, 1090, 1180, 1000];

type TxType = "Deposit" | "Trade" | "Payout" | "Withdrawal";
const STATIC_TXS = [
  { id: "tx1", type: "Deposit" as TxType,    label: "Initial Deposit",            amount: +1000, date: "Mar 25, 2026", pending: false },
  { id: "tx2", type: "Trade" as TxType,      label: "Bought YES — Bitcoin $100k", amount: -200,  date: "Mar 25, 2026", pending: false },
  { id: "tx3", type: "Trade" as TxType,      label: "Bought NO — Fed Rate Cut",   amount: -150,  date: "Mar 26, 2026", pending: false },
  { id: "tx4", type: "Payout" as TxType,     label: "Payout — SpaceX Mars (YES)", amount: +340,  date: "Mar 26, 2026", pending: false },
  { id: "tx5", type: "Withdrawal" as TxType, label: "Withdrawal to Bank",         amount: -100,  date: "Mar 27, 2026", pending: true  },
];

const TX_COLOR: Record<TxType, string> = {
  Deposit:    "text-yes bg-yes/10",
  Payout:     "text-yes bg-yes/10",
  Trade:      "text-primary bg-primary/10",
  Withdrawal: "text-no bg-no/10",
};

function ActionModal({ mode, onClose, onConfirm }: { mode: "deposit" | "withdraw"; onClose: () => void; onConfirm: (amt: number) => void }) {
  const [amount, setAmount] = useState("");
  const presets = [50, 100, 250, 500];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 modal-backdrop" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121217] p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white capitalize">{mode === "deposit" ? "Add Funds" : "Withdraw"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
            className="w-full bg-white/4 border border-white/10 rounded-xl pl-9 pr-4 py-3.5 text-2xl font-bold text-white placeholder:text-white/20 outline-none focus:border-white/25 transition-colors" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {presets.map(p => (
            <button key={p} onClick={() => setAmount(String(p))}
              className={`py-2 rounded-xl text-sm font-semibold transition-colors border ${amount === String(p) ? "bg-primary/15 border-primary/40 text-primary" : "bg-white/4 border-white/10 text-muted-foreground hover:text-white"}`}>
              ${p}
            </button>
          ))}
        </div>
        <button
          disabled={!amount || parseFloat(amount) <= 0}
          onClick={() => { onConfirm(parseFloat(amount)); onClose(); }}
          className="w-full py-3.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> Confirm {mode === "deposit" ? "Deposit" : "Withdrawal"}
        </button>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { balance, myTrades } = useWallet();
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [modal, setModal] = useState<"deposit" | "withdraw" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const transactions = useMemo(() => [
    ...STATIC_TXS,
    ...myTrades.slice(0, 5).map(t => ({
      id: t.id, type: "Trade" as TxType, label: `Bought ${t.type} — ${t.marketQuestion}`,
      amount: -t.amount, date: new Date(t.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), pending: false,
    }))
  ], [myTrades]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };
  const sparkData = useMemo(() => [...BALANCE_HISTORY.slice(0, -1), balance], [balance]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Wallet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your funds and transactions</p>
        </div>
        <button onClick={() => showToast("Balance synced!")} className="p-2 rounded-xl bg-[#121217] border border-white/8 text-muted-foreground hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Balance card */}
      <div className="bg-[#121217] border border-white/8 rounded-2xl p-7">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Total Balance</p>
          <button onClick={() => setHidden(!hidden)} className="text-muted-foreground hover:text-white transition-colors">
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-end gap-1.5 mb-1">
          <span className="text-muted-foreground text-lg self-start mt-2">$</span>
          <span className="text-5xl font-bold tracking-tight text-white">
            {hidden ? "••••••" : balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-6 font-mono">Available for trading</p>
        <div className="h-14 mb-6">
          <Sparkline data={sparkData} color="#FF6A3D" strokeWidth={1.5} fillOpacity={0.12} />
        </div>
        <div className="h-px bg-white/6 mb-6" />
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Deposit",   icon: <ArrowDownLeft className="w-4 h-4" />, action: () => router.push("/wallet/deposit")  },
            { label: "Withdraw",  icon: <ArrowUpRight className="w-4 h-4" />,  action: () => router.push("/wallet/withdraw") },
            { label: "Add Funds", icon: <Plus className="w-4 h-4" />,          action: () => router.push("/wallet/deposit")  },
          ].map(btn => (
            <button key={btn.label} onClick={btn.action}
              className="py-3.5 rounded-xl border border-white/10 bg-white/3 text-white text-xs font-semibold hover:bg-white/6 hover:border-white/20 transition-colors flex flex-col items-center gap-1.5">
              {btn.icon}{btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Total Deposited", value: "$1,000.00", icon: <CreditCard className="w-4 h-4 text-muted-foreground" /> },
          { label: "Total Traded",    value: `$${myTrades.reduce((s, t) => s + t.amount, 0).toFixed(2)}`, icon: <Zap className="w-4 h-4 text-muted-foreground" /> },
        ].map(s => (
          <div key={s.label} className="bg-[#121217] border border-white/8 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs text-muted-foreground">{s.label}</span></div>
            <p className="text-xl font-bold font-mono text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><History className="w-4 h-4 text-muted-foreground" />Transaction History</h2>
        <div className="bg-[#121217] border border-white/8 rounded-2xl overflow-hidden divide-y divide-white/5">
          {transactions.map(tx => {
            const isGain = tx.amount > 0;
            return (
              <div key={tx.id}>
                <div className="flex items-center gap-3 px-5 py-4 hover:bg-white/2 transition-colors cursor-pointer" onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${TX_COLOR[tx.type]}`}>
                    {tx.type === "Deposit" || tx.type === "Payout" ? <ArrowDownLeft className="w-3.5 h-3.5" /> : tx.type === "Trade" ? <Zap className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white line-clamp-1">{tx.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] font-mono text-muted-foreground">{tx.date}</p>
                      {tx.pending && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/12 text-yellow-400 border border-yellow-500/20">Pending</span>}
                    </div>
                  </div>
                  <p className={`font-bold font-mono text-sm shrink-0 ${isGain ? "text-yes" : "text-no"}`}>
                    {isGain ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                  </p>
                </div>
                {expandedTx === tx.id && (
                  <div className="px-5 py-3 border-t border-white/5 bg-white/1 flex gap-4 text-xs">
                    {[{ k: "ID", v: `#${tx.id.toUpperCase()}` }, { k: "Status", v: tx.pending ? "Pending" : "Completed" }, { k: "Fee", v: tx.type === "Trade" ? "—" : "$0.00" }].map(({ k, v }) => (
                      <div key={k}><p className="text-muted-foreground uppercase tracking-widest text-[9px] mb-0.5">{k}</p><p className="font-mono font-semibold text-white">{v}</p></div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {modal && <ActionModal mode={modal} onClose={() => setModal(null)} onConfirm={amt => showToast(modal === "deposit" ? `+$${amt.toFixed(2)} deposited!` : `-$${amt.toFixed(2)} withdrawal initiated.`)} />}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#121217] border border-white/15 text-white text-sm font-semibold px-5 py-3 rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-[#FF6A3D]" /> {toast}
        </div>
      )}
    </div>
  );
}
