"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { io, Socket } from "socket.io-client";

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
    placeTrade: (marketId: string, type: "YES" | "NO", amount: number) => boolean;
    resolveMarket: (marketId: string, outcome: "YES" | "NO") => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
    const [balance, setBalance] = useState<number>(1000.00);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [markets, setMarkets] = useState<Market[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);

    const userId = useRef(Math.random().toString(36).substring(2, 9)).current;

    useEffect(() => {
        const socketInstance = io();

        socketInstance.on("connect", () => {
            console.log("Connected to WebSocket Server");
        });

        socketInstance.on("initial_state", (data: { markets: Market[], trades: Trade[] }) => {
            setMarkets(data.markets);
            setTrades(data.trades);
        });

        socketInstance.on("market_updated", (updatedMarket: Market) => {
            setMarkets(prev => prev.map(m => m.id === updatedMarket.id ? updatedMarket : m));
        });

        socketInstance.on("trade_executed", (newTrade: Trade) => {
            setTrades(prev => [newTrade, ...prev]);
        });

        socketInstance.on("market_resolved", (data: { marketId: string, outcome: "YES" | "NO" }) => {
            setMarkets(prev => prev.map(m =>
                m.id === data.marketId ? { ...m, status: "RESOLVED", winningOutcome: data.outcome } : m
            ));

            setTrades(currentTrades => {
                const myWinningTrades = currentTrades.filter(t => t.userId === userId && t.marketId === data.marketId && t.type === data.outcome);
                const payout = myWinningTrades.reduce((sum, t) => sum + t.shares, 0);
                if (payout > 0) {
                    setBalance(b => b + payout);
                }
                return currentTrades;
            });
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [userId]);

    const myTrades = trades.filter(t => t.userId === userId);

    const placeTrade = (marketId: string, type: "YES" | "NO", amount: number) => {
        if (amount <= 0 || amount > balance) return false;

        const market = markets.find(m => m.id === marketId);
        if (!market || market.status === "RESOLVED") return false;

        const totalShares = market.yesShares + market.noShares;
        const currentPrice = type === "YES"
            ? market.yesShares / totalShares
            : market.noShares / totalShares;

        const estimatedShares = amount / currentPrice;

        setBalance(prev => prev - amount);

        if (socket) {
            socket.emit("place_trade", {
                marketId,
                marketQuestion: market.question,
                type,
                amount,
                price: currentPrice,
                shares: estimatedShares,
                userId
            });
        }

        return true;
    };

    const resolveMarket = (marketId: string, outcome: "YES" | "NO") => {
        if (socket) {
            socket.emit("resolve_market", { marketId, outcome });
        }
        return true;
    };

    return (
        <WalletContext.Provider value={{ balance, trades, myTrades, markets, placeTrade, resolveMarket }}>
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
