"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { useWallet, Market } from "@/app/context/WalletContext";

interface TradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    market: Market;
    initialType: "YES" | "NO";
}

export function TradeModal({ isOpen, onClose, market, initialType }: TradeModalProps) {
    const [type, setType] = useState<"YES" | "NO">(initialType);
    const [amount, setAmount] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<boolean>(false);
    const { balance, placeTrade } = useWallet();

    if (!isOpen) return null;

    const totalShares = market.yesShares + market.noShares;
    const yesPrice = market.yesShares / totalShares;
    const noPrice = market.noShares / totalShares;
    const price = type === "YES" ? yesPrice : noPrice;
    const simulatedShares = amount ? parseFloat(amount) / price : 0;

    const handleTrade = () => {
        setError("");
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount) || numAmount <= 0) {
            setError("Please enter a valid amount.");
            return;
        }

        if (numAmount > balance) {
            setError("Insufficient balance.");
            return;
        }

        const tradeOk = placeTrade(market.id, type, numAmount);
        if (tradeOk) {
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
                setAmount("");
            }, 1500);
        } else {
            setError("Trade failed to execute.");
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm bg-[#050505] border border-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Trade Successful</h2>
                    <p className="text-neutral-400 text-sm">
                        You bought {simulatedShares.toFixed(2)} shares of {type} at {(price * 100).toFixed(1)}¢.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#050505] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-[#1a1a1a]">
                    <h2 className="text-lg font-bold text-white">Place Order</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 bg-[#0a0a0a]">
                    <h3 className="text-sm font-medium text-white mb-4 line-clamp-2">{market.question}</h3>

                    <div className="flex bg-[#111] p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setType("YES")}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === "YES" ? "bg-green-500/20 text-green-500" : "text-neutral-500 hover:text-neutral-300"
                                }`}
                        >
                            Buy YES {(yesPrice * 100).toFixed(1)}¢
                        </button>
                        <button
                            onClick={() => setType("NO")}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === "NO" ? "bg-red-500/20 text-red-500" : "text-neutral-500 hover:text-neutral-300"
                                }`}
                        >
                            Buy NO {(noPrice * 100).toFixed(1)}¢
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <label className="text-neutral-400 font-medium">Amount ($)</label>
                                <span className="text-neutral-500 font-mono">Balance: ${balance.toFixed(2)}</span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-[#111] border border-[#222] rounded-xl py-3 pl-8 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-red-500 text-xs mt-2 font-medium">{error}</p>}
                        </div>

                        <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Avg Price</span>
                                <span className="font-mono text-white">{(price * 100).toFixed(1)}¢</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Est. Shares</span>
                                <span className="font-mono text-white tracking-tight">{simulatedShares > 0 ? simulatedShares.toFixed(2) : "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium pt-2 border-t border-[#222]">
                                <span className="text-neutral-400">Potential Return</span>
                                <span className="font-mono text-green-500">${simulatedShares > 0 ? (simulatedShares * 1).toFixed(2) : "0.00"} (+{simulatedShares > 0 ? (((1 - price) / price) * 100).toFixed(1) : "0"}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-[#1a1a1a] bg-[#050505]">
                    <button
                        onClick={handleTrade}
                        disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
                        className={`w-full py-3.5 rounded-xl font-bold transition-all ${!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance
                                ? "bg-[#111] text-neutral-600 cursor-not-allowed"
                                : type === "YES"
                                    ? "bg-green-500 text-black hover:bg-green-400"
                                    : "bg-red-500 text-white hover:bg-red-400"
                            }`}
                    >
                        Confirm Trade
                    </button>
                </div>
            </div>
        </div>
    );
}
