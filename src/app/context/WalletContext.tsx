"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { useToast } from "./ToastContext";

export interface Market {
    id: string;
    question: string;
    yesShares: number;
    noShares: number;
    endTime: string;
    volumeAmount: number;
    category: string;
    status: "OPEN" | "RESOLVED";
    winningOutcome?: "YES" | "NO";
}

export interface Trade {
    id: string;
    marketId: string;
    marketQuestion: string;
    type: "YES" | "NO";
    amount: number;
    price: number;
    shares: number;
    timestamp: string;
    userId?: string;
}

interface WalletContextType {
    balance: number;
    trades: Trade[];
    myTrades: Trade[];
    markets: Market[];
    isLoading: boolean;
    isConnected: boolean;
    placeTrade: (marketId: string, type: "YES" | "NO", amount: number) => boolean;
    closePosition: (marketId: string, type: "YES" | "NO") => boolean;
    resolveMarket: (marketId: string, outcome: "YES" | "NO") => boolean;
    createNewMarket: (question: string, category: string, endTime: string) => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
    const [balance, setBalance] = useState<number>(1000.00);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [markets, setMarkets] = useState<Market[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const { toast } = useToast();
    const { data: session } = useSession();

    // Prefer the real session user id; fall back to an anonymous stable id so
    // public browsing still works before sign-in. Once Phase 3 replaces the
    // socket/mock store with API routes, trades will server-side-require auth
    // and the anon fallback will be read-only.
    const [anonId] = useState(() => Math.random().toString(36).substring(2, 9));
    const userId = session?.user?.id ?? `anon-${anonId}`;

    useEffect(() => {
        const socketInstance = io();

        socketInstance.on("connect", () => {
            setIsConnected(true);
        });

        socketInstance.on("disconnect", () => {
            setIsConnected(false);
        });

        socketInstance.on("initial_state", (data: { markets: Market[], trades: Trade[] }) => {
            setMarkets(data.markets);
            setTrades(data.trades);
            setIsLoading(false);
        });

        socketInstance.on("market_updated", (updatedMarket: Market) => {
            setMarkets(prev => {
                const exists = prev.some(m => m.id === updatedMarket.id);
                if (exists) {
                    return prev.map(m => m.id === updatedMarket.id ? updatedMarket : m);
                } else {
                    return [...prev, updatedMarket];
                }
            });
        });

        socketInstance.on("trade_executed", (newTrade: Trade) => {
            setTrades(prev => [newTrade, ...prev]);
        });

        socketInstance.on("market_resolved", (data: { marketId: string, outcome: "YES" | "NO" }) => {
            setMarkets(prev => {
                const resolved = prev.find(m => m.id === data.marketId);
                if (resolved) {
                    toast({
                        type: "info",
                        title: "Market resolved",
                        description: `"${resolved.question}" → ${data.outcome}`,
                    });
                }
                return prev.map(m =>
                    m.id === data.marketId ? { ...m, status: "RESOLVED", winningOutcome: data.outcome } : m
                );
            });

            setTrades(currentTrades => {
                const myWinningTrades = currentTrades.filter(t => t.userId === userId && t.marketId === data.marketId && t.type === data.outcome);
                const payout = myWinningTrades.reduce((sum, t) => sum + t.shares, 0);
                if (payout > 0) {
                    setBalance(b => b + payout);
                    toast({
                        type: "success",
                        title: "You won",
                        description: `$${payout.toFixed(2)} credited to your balance.`,
                    });
                }
                return currentTrades;
            });
        });

        socketRef.current = socketInstance;

        // Fallback: stop showing skeletons after 6s even if the server never responds
        const loadTimeout = setTimeout(() => setIsLoading(false), 6000);

        return () => {
            clearTimeout(loadTimeout);
            socketInstance.disconnect();
            socketRef.current = null;
        };
    }, [userId, toast]);

    const myTrades = trades.filter(t => t.userId === userId);

    const placeTrade = (marketId: string, type: "YES" | "NO", amount: number) => {
        if (amount <= 0) {
            toast({ type: "error", title: "Invalid amount", description: "Enter a positive amount to trade." });
            return false;
        }
        if (amount > balance) {
            toast({ type: "error", title: "Insufficient balance", description: `You have $${balance.toFixed(2)} available.` });
            return false;
        }

        const market = markets.find(m => m.id === marketId);
        if (market?.status === "RESOLVED") {
            toast({ type: "error", title: "Market closed", description: "This market has already resolved." });
            return false;
        }

        // Fall back to a neutral 50/50 pool if the market isn't in our local state
        // (e.g. mock-data pages that haven't been seeded via the WebSocket).
        const yesShares  = market?.yesShares  ?? 50;
        const noShares   = market?.noShares   ?? 50;
        const totalShares = yesShares + noShares;
        const currentPrice = type === "YES"
            ? yesShares / totalShares
            : noShares / totalShares;

        const estimatedShares = amount / currentPrice;

        setBalance(prev => prev - amount);

        socketRef.current?.emit("place_trade", {
            marketId,
            marketQuestion: market?.question ?? "Prediction market",
            type,
            amount,
            price: currentPrice,
            shares: estimatedShares,
            userId,
        });

        toast({
            type: "success",
            title: `${type} order placed`,
            description: `${estimatedShares.toFixed(2)} shares at ${(currentPrice * 100).toFixed(1)}¢`,
        });

        return true;
    };

    const closePosition = (marketId: string, type: "YES" | "NO") => {
        const market = markets.find(m => m.id === marketId);
        if (!market) {
            toast({ type: "error", title: "Market not found" });
            return false;
        }
        if (market.status === "RESOLVED") {
            toast({ type: "error", title: "Market already resolved", description: "Winners are paid out automatically — no need to close." });
            return false;
        }

        const myPositionTrades = trades.filter(t => t.userId === userId && t.marketId === marketId && t.type === type);
        const totalShares = myPositionTrades.reduce((s, t) => s + t.shares, 0);
        const totalInvested = myPositionTrades.reduce((s, t) => s + t.amount, 0);

        if (totalShares <= 0) {
            toast({ type: "error", title: "No position to close" });
            return false;
        }

        const poolTotal = market.yesShares + market.noShares;
        const currentPrice = type === "YES"
            ? market.yesShares / poolTotal
            : market.noShares / poolTotal;
        const proceeds = totalShares * currentPrice;
        const pnl = proceeds - totalInvested;

        setBalance(prev => prev + proceeds);

        // Emit an opposite synthetic trade to keep the server trade log consistent.
        // The AMM / pool update is best-effort; the real backend will handle settle.
        socketRef.current?.emit("place_trade", {
            marketId,
            marketQuestion: market.question,
            type,
            amount: -totalInvested,
            price: currentPrice,
            shares: -totalShares,
            userId,
        });

        toast({
            type: pnl >= 0 ? "success" : "info",
            title: `Position closed`,
            description: `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} realized`,
        });
        return true;
    };

    const resolveMarket = (marketId: string, outcome: "YES" | "NO") => {
        const socket = socketRef.current;
        if (!socket) {
            toast({ type: "error", title: "Not connected", description: "Reconnect and try again." });
            return false;
        }
        socket.emit("resolve_market", { marketId, outcome });
        return true;
    };

    const createNewMarket = (question: string, category: string, endTime: string) => {
        const socket = socketRef.current;
        if (!socket) {
            toast({ type: "error", title: "Not connected", description: "Reconnect and try again." });
            return false;
        }
        socket.emit("create_market", { question, category, endTime });
        toast({ type: "success", title: "Market created", description: question });
        return true;
    };

    return (
        <WalletContext.Provider value={{ balance, trades, myTrades, markets, isLoading, isConnected, placeTrade, closePosition, resolveMarket, createNewMarket }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
}
