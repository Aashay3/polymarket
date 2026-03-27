"use client";

import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { useWallet, Market } from "@/app/context/WalletContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import { GlowButton } from "@/components/ui/GlowButton";

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
    const isMobile = useMediaQuery("(max-width: 639px)");
    const isDesktop = useMediaQuery("(min-width: 1024px)");

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
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="w-full max-w-sm bg-[#050505] border border-[#1a1a1a] rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl"
                >
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Trade Successful</h2>
                    <p className="text-neutral-400 text-sm">
                        You bought {simulatedShares.toFixed(2)} shares of {type} at {(price * 100).toFixed(1)}¢.
                    </p>
                </motion.div>
            </div>
        );
    }

    // Animation Variants per device
    const variants = isDesktop 
      ? { hidden: { x: "100%" }, visible: { x: 0 } }
      : isMobile
      ? { hidden: { y: "100%" }, visible: { y: 0 } }
      : { hidden: { scale: 0.95, opacity: 0 }, visible: { scale: 1, opacity: 1 } };

    // Container CSS per device
    const containerClasses = isDesktop
      ? "fixed top-0 right-0 bottom-0 w-96 z-100 bg-[#050505] border-l border-[#222] shadow-2xl flex flex-col"
      : isMobile
      ? "fixed inset-0 z-[100] bg-[#050505] flex flex-col"
      : "w-full max-w-md bg-[#050505] border border-[#222] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]";

    return (
        <AnimatePresence>
          {/* Backdrop for Center Modal and Mobile */}
          {!isDesktop && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-90 modal-backdrop" 
                onClick={onClose} 
            />
          )}

          <div className={`fixed inset-0 z-100 pointer-events-none ${!isDesktop && !isMobile ? 'flex items-center justify-center p-4' : ''}` }>
            <motion.div 
                variants={variants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={`${containerClasses} pointer-events-auto`}
            >
                <div className={`flex justify-between items-center p-4 border-b border-[#1a1a1a] ${isDesktop ? 'pt-6' : isMobile ? 'pt-safe-top' : ''}`}>
                    <h2 className="text-lg font-bold text-white">Place Order</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0a0a0a]">
                    <h3 className="text-base md:text-lg font-medium text-white mb-6 leading-tight">{market.question}</h3>

                    <div className="flex bg-[#111] p-1 rounded-xl mb-6">
                        <GlowButton
                            variant="yes"
                            onClick={() => setType("YES")}
                            className={`flex-1 py-3 rounded-lg transition-all text-sm ${type !== "YES" ? "opacity-30 shadow-none!" : ""}`}
                        >
                            Buy YES {(yesPrice * 100).toFixed(1)}¢
                        </GlowButton>
                        <GlowButton
                            variant="no"
                            onClick={() => setType("NO")}
                            className={`flex-1 py-3 rounded-lg transition-all text-sm ${type !== "NO" ? "opacity-30 shadow-none!" : ""}`}
                        >
                            Buy NO {(noPrice * 100).toFixed(1)}¢
                        </GlowButton>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-3">
                                <label className="text-neutral-400 font-medium">Amount ($)</label>
                                <span className="text-neutral-500 font-mono">Balance: ${balance.toFixed(2)}</span>
                            </div>
                            
                            <div className="relative mb-4">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-[#111] border border-[#222] rounded-xl py-4 pl-8 pr-4 text-white text-lg placeholder:text-neutral-600 focus:outline-none focus:border-white/30 transition-colors font-mono font-bold"
                                    autoFocus={!isMobile} // Disable autofocus on mobile to prevent keyboard popping up immediately
                                />
                            </div>

                            {/* Range Slider for Mobile/Tablet */}
                            <input 
                                type="range" 
                                min="0" 
                                max={Math.max(balance, 100)} 
                                step="1"
                                value={parseFloat(amount) || 0}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full h-2 bg-[#222] rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-2 font-mono">
                                <span>$0</span>
                                <span>50%</span>
                                <span>Max</span>
                            </div>

                            {error && <p className="text-red-500 text-xs mt-3 font-medium bg-red-500/10 p-2 rounded-lg">{error}</p>}
                        </div>

                        <div className="bg-[#111] border border-[#222] rounded-xl p-5 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Avg Price</span>
                                <span className="font-mono font-bold text-white">{(price * 100).toFixed(1)}¢</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Est. Shares</span>
                                <span className="font-mono font-bold text-white tracking-tight">{simulatedShares > 0 ? simulatedShares.toFixed(2) : "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium pt-3 border-t border-[#222]">
                                <span className="text-neutral-400">Potential Return</span>
                                <span className="font-mono text-green-500 font-bold text-base">${simulatedShares > 0 ? (simulatedShares * 1).toFixed(2) : "0.00"} (+{simulatedShares > 0 ? (((1 - price) / price) * 100).toFixed(1) : "0"}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`p-4 md:p-6 border-t border-[#1a1a1a] bg-[#050505] ${isMobile ? 'pb-safe' : ''}`}>
                <GlowButton
                    variant="primary"
                    pulse={!(!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance)}
                    disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
                    onClick={handleTrade}
                    className="w-full py-4 text-lg"
                >
                    Confirm Trade
                </GlowButton>
                </div>
            </motion.div>
          </div>
        </AnimatePresence>
    );
}
