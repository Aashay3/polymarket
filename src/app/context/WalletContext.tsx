"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "./ToastContext";

// ─────────────────────────────────────────────────────────────
// Types — align with API DTOs in src/lib/serialize.ts but expressed
// as numbers where the UI renders them, for component ergonomics.
// Decimal precision is preserved server-side; UI uses 6-dec floats.
// ─────────────────────────────────────────────────────────────

export interface Market {
    id: string;
    slug: string;
    question: string;
    description: string;
    rules: string;
    category: string;
    imageUrl: string | null;
    yesShares: number;
    noShares: number;
    yesPrice: number;
    noPrice: number;
    endTime: string;
    volumeAmount: number; // denormalized on the detail fetch only
    feeBps: number;
    status: "OPEN" | "CLOSED" | "RESOLVED" | "VOIDED";
    winningOutcome?: "YES" | "NO";
    // 24h change in basis points (100 = 1.00%). null when no baseline is
    // available yet (market < 24h old, or snapshots not populated).
    yesChangeBps?: number | null;
    noChangeBps?: number | null;
}

export interface Trade {
    id: string;
    marketId: string;
    marketQuestion: string;
    type: "YES" | "NO";
    side: "BUY" | "SELL";
    amount: number;
    price: number;
    shares: number;
    timestamp: string;
    userId?: string;
}

interface MarketDTO {
    id: string;
    slug: string;
    question: string;
    description: string;
    rules: string;
    category: string;
    imageUrl: string | null;
    yesShares: string;
    noShares: string;
    yesPrice: string;
    noPrice: string;
    feeBps: number;
    status: "OPEN" | "CLOSED" | "RESOLVED" | "VOIDED";
    winningOutcome: "YES" | "NO" | null;
    endTime: string;
    yesChangeBps?: number | null;
    noChangeBps?: number | null;
}

interface TradeDTO {
    id: string;
    userId: string;
    marketId: string;
    outcome: "YES" | "NO";
    side: "BUY" | "SELL";
    shares: string;
    pricePerShare: string;
    amount: string;
    fee: string;
    netAmount: string;
    createdAt: string;
}

function marketFromDTO(d: MarketDTO, questionById?: Map<string, string>): Market {
    void questionById;
    return {
        id: d.id,
        slug: d.slug,
        question: d.question,
        description: d.description,
        rules: d.rules ?? "",
        category: d.category,
        imageUrl: d.imageUrl,
        yesShares: parseFloat(d.yesShares),
        noShares: parseFloat(d.noShares),
        yesPrice: parseFloat(d.yesPrice),
        noPrice: parseFloat(d.noPrice),
        feeBps: d.feeBps,
        endTime: d.endTime,
        volumeAmount: 0,
        status: d.status,
        winningOutcome: d.winningOutcome ?? undefined,
        yesChangeBps: d.yesChangeBps ?? null,
        noChangeBps: d.noChangeBps ?? null,
    };
}

function tradeFromDTO(d: TradeDTO, marketQuestion: string): Trade {
    return {
        id: d.id,
        marketId: d.marketId,
        marketQuestion,
        type: d.outcome,
        side: d.side,
        amount: parseFloat(d.amount),
        price: parseFloat(d.pricePerShare),
        shares: parseFloat(d.shares),
        timestamp: d.createdAt,
        userId: d.userId,
    };
}

interface WalletContextType {
    balance: number;
    /// Per-token balance map (e.g. { USDT: "12.34", DAI: "0" }). USDC
    /// stays canonical in `balance` — non-USDC tokens populate when
    /// multi-token deposits ship. Pass through to the wallet page.
    tokenBalances: Record<string, string>;
    /// Trading streak — consecutive UTC days with at least one trade,
    /// ending today or yesterday. Powers the home StreakBanner.
    streak: { days: number; tradedToday: boolean };
    trades: Trade[];
    myTrades: Trade[];
    markets: Market[];
    isLoading: boolean;
    isConnected: boolean;
    placeTrade: (marketId: string, type: "YES" | "NO", amount: number) => Promise<boolean>;
    closePosition: (marketId: string, type: "YES" | "NO") => Promise<boolean>;
    resolveMarket: (marketId: string, outcome: "YES" | "NO") => Promise<boolean>;
    createNewMarket: (question: string, category: string, endTime: string) => Promise<boolean>;
    refreshMarkets: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────
// API helper — unwraps our { ok, data } | { ok, error } envelope.
// ─────────────────────────────────────────────────────────────
async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
        ...init,
        headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => ({ ok: false, error: { message: "Bad response" } }));
    if (!body.ok) {
        const msg = body?.error?.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return body.data as T;
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const [balance, setBalance] = useState<number>(0);
    const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
    const [streak, setStreak] = useState<{ days: number; tradedToday: boolean }>({
        days: 0,
        tradedToday: false,
    });
    const [trades, setTrades] = useState<Trade[]>([]);
    const [markets, setMarkets] = useState<Market[]>([]);
    const marketsRef = useRef<Market[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const { toast } = useToast();
    const { data: session, status: sessionStatus } = useSession();
    const userId = session?.user?.id;

    const refreshMarkets = useCallback(async () => {
        try {
            const data = await api<{ markets: MarketDTO[] }>(`/api/markets?limit=100`);
            setMarkets(data.markets.map((m) => marketFromDTO(m)));
            setIsConnected(true);
        } catch (e) {
            setIsConnected(false);
            console.error("refreshMarkets failed", e);
        }
    }, []);

    const refreshMyTrades = useCallback(async (marketQuestions: Map<string, string>) => {
        try {
            const data = await api<{ trades: TradeDTO[] }>(`/api/trades?limit=100`);
            setTrades(data.trades.map((t) => tradeFromDTO(t, marketQuestions.get(t.marketId) ?? "")));
        } catch (e) {
            console.error("refreshMyTrades failed", e);
        }
    }, []);

    const refreshBalance = useCallback(async () => {
        try {
            const data = await api<{
                balance: { available: string; tokens?: Record<string, string> };
                streak?: { days: number; tradedToday: boolean };
            }>(`/api/me`);
            setBalance(parseFloat(data.balance.available));
            setTokenBalances(data.balance.tokens ?? {});
            setStreak(data.streak ?? { days: 0, tradedToday: false });
        } catch {
            setBalance(0);
            setTokenBalances({});
            setStreak({ days: 0, tradedToday: false });
        }
    }, []);

    // Keep the ref in sync with markets so other effects can read the
    // latest mapping without depending on `markets` (which changes on every
    // pool update — we don't want to refetch trades then).
    useEffect(() => {
        marketsRef.current = markets;
    }, [markets]);

    // Initial load
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setIsLoading(true);
            await refreshMarkets();
            if (cancelled) return;
            setIsLoading(false);
        })();
        return () => { cancelled = true; };
    }, [refreshMarkets]);

    // Live updates: subscribe to /api/stream via EventSource. The server
    // pushes market.updated / trade.executed / balance.changed etc. the
    // moment they happen. EventSource handles automatic reconnection.
    useEffect(() => {
        if (typeof window === "undefined" || typeof EventSource === "undefined") return;

        const source = new EventSource("/api/stream");

        const mergeMarket = (dto: MarketDTO) => {
            setMarkets((prev) => {
                const idx = prev.findIndex((m) => m.id === dto.id);
                if (idx === -1) return [marketFromDTO(dto), ...prev];
                const next = prev.slice();
                next[idx] = marketFromDTO(dto);
                return next;
            });
        };

        source.addEventListener("open", () => setIsConnected(true));
        source.addEventListener("error", () => setIsConnected(false));

        source.addEventListener("market.updated", (e) => {
            try {
                const payload = JSON.parse((e as MessageEvent).data) as { market: MarketDTO };
                mergeMarket(payload.market);
            } catch { /* ignore malformed frame */ }
        });

        source.addEventListener("market.created", (e) => {
            try {
                const payload = JSON.parse((e as MessageEvent).data) as { market: MarketDTO };
                mergeMarket(payload.market);
            } catch { /* ignore */ }
        });

        source.addEventListener("market.resolved", (e) => {
            try {
                const payload = JSON.parse((e as MessageEvent).data) as { market: MarketDTO };
                mergeMarket(payload.market);
            } catch { /* ignore */ }
        });

        source.addEventListener("balance.changed", (e) => {
            try {
                const payload = JSON.parse((e as MessageEvent).data) as { available: string };
                setBalance(parseFloat(payload.available));
            } catch { /* ignore */ }
        });

        // Every trade (anyone's) lands here. We keep the last 20 as a
        // rolling ticker for the home-page Recent Activity widget. The
        // userId is already anonymised by the server for public events —
        // we just display it as "user_xxxxxx".
        source.addEventListener("trade.executed", (e) => {
            try {
                const payload = JSON.parse((e as MessageEvent).data) as {
                    trade: TradeDTO;
                    market: MarketDTO;
                };
                const t = tradeFromDTO(payload.trade, payload.market.question);
                setTrades((prev) => [t, ...prev].slice(0, 50));
            } catch { /* ignore */ }
        });

        return () => {
            source.close();
        };
    }, []);

    // Reset local state when the session transitions to signed-out, using
    // React's "derive from prev state during render" pattern to avoid a
    // setState-in-effect (which React 19 now flags).
    const [prevSession, setPrevSession] = useState(sessionStatus);
    if (prevSession !== sessionStatus) {
        setPrevSession(sessionStatus);
        if (sessionStatus !== "authenticated") {
            setBalance(0);
            setTokenBalances({});
            setStreak({ days: 0, tradedToday: false });
            setTrades([]);
        }
    }

    // Reload balance + trades when the user signs in. Reading market state
    // via `marketsRef` means the effect doesn't depend on `markets` — we
    // don't want to refetch trades every time the pool updates. The fetches
    // are wrapped in an async IIFE so the setState calls inside them run
    // off the effect's sync path.
    useEffect(() => {
        if (sessionStatus !== "authenticated") return;
        void (async () => {
            await refreshBalance();
            const mapping = new Map(marketsRef.current.map((m) => [m.id, m.question]));
            await refreshMyTrades(mapping);
        })();
    }, [sessionStatus, userId, refreshBalance, refreshMyTrades]);

    const myTrades = trades.filter((t) => t.userId === userId);

    const placeTrade = useCallback(
        async (marketId: string, type: "YES" | "NO", amount: number): Promise<boolean> => {
            if (amount <= 0) {
                toast({ type: "error", title: "Invalid amount", description: "Enter a positive amount to trade." });
                return false;
            }
            if (sessionStatus !== "authenticated") {
                toast({ type: "error", title: "Please sign in", description: "You need an account to place trades." });
                return false;
            }
            try {
                const data = await api<{
                    trade: TradeDTO;
                    market: MarketDTO;
                    balance: { available: string };
                }>("/api/trades", {
                    method: "POST",
                    body: JSON.stringify({ marketId, outcome: type, amount: amount.toFixed(6) }),
                });

                const updated = marketFromDTO(data.market);
                setMarkets((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
                setBalance(parseFloat(data.balance.available));
                setTrades((prev) => [tradeFromDTO(data.trade, updated.question), ...prev]);
                // Optimistic streak bump for the first trade of the
                // UTC day. Server-side recompute happens on the next
                // /api/me; we won't double-count if user trades again
                // because tradedToday is sticky.
                setStreak((s) =>
                    s.tradedToday ? s : { days: s.days + 1, tradedToday: true },
                );

                toast({
                    type: "success",
                    title: `${type} order filled`,
                    description: `${parseFloat(data.trade.shares).toFixed(2)} shares @ ${(parseFloat(data.trade.pricePerShare) * 100).toFixed(1)}¢`,
                });
                return true;
            } catch (e) {
                toast({ type: "error", title: "Trade failed", description: e instanceof Error ? e.message : "Unknown error" });
                return false;
            }
        },
        [sessionStatus, toast],
    );

    const closePosition = useCallback(
        async (marketId: string, type: "YES" | "NO"): Promise<boolean> => {
            if (sessionStatus !== "authenticated") {
                toast({ type: "error", title: "Please sign in" });
                return false;
            }
            try {
                const data = await api<{
                    trade: TradeDTO;
                    market: MarketDTO;
                    balance: { available: string };
                    realizedPnl: string;
                }>("/api/positions/close", {
                    method: "POST",
                    body: JSON.stringify({ marketId, outcome: type }),
                });

                const updated = marketFromDTO(data.market);
                setMarkets((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
                setBalance(parseFloat(data.balance.available));
                setTrades((prev) => [tradeFromDTO(data.trade, updated.question), ...prev]);

                const pnl = parseFloat(data.realizedPnl);
                toast({
                    type: pnl >= 0 ? "success" : "info",
                    title: "Position closed",
                    description: `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} realized`,
                });
                return true;
            } catch (e) {
                toast({ type: "error", title: "Close failed", description: e instanceof Error ? e.message : "Unknown error" });
                return false;
            }
        },
        [sessionStatus, toast],
    );

    const resolveMarket = useCallback(
        async (marketId: string, outcome: "YES" | "NO"): Promise<boolean> => {
            try {
                const data = await api<{ market: MarketDTO; winnersCount: number; totalPaid: string }>(
                    `/api/admin/markets/${marketId}/resolve`,
                    { method: "POST", body: JSON.stringify({ outcome }) },
                );
                const updated = marketFromDTO(data.market);
                setMarkets((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
                toast({
                    type: "success",
                    title: "Market resolved",
                    description: `${data.winnersCount} winners paid $${parseFloat(data.totalPaid).toFixed(2)}`,
                });
                return true;
            } catch (e) {
                toast({ type: "error", title: "Resolve failed", description: e instanceof Error ? e.message : "Unknown error" });
                return false;
            }
        },
        [toast],
    );

    const createNewMarket = useCallback(
        async (question: string, category: string, endTime: string): Promise<boolean> => {
            try {
                const data = await api<{ market: MarketDTO }>("/api/admin/markets", {
                    method: "POST",
                    body: JSON.stringify({
                        question,
                        description: question, // default description = question until UI adds a field
                        rules: "Resolved YES if the described event occurs before endTime.",
                        category,
                        endTime,
                        initialLiquidity: "10000",
                        feeBps: 200,
                    }),
                });
                setMarkets((prev) => [marketFromDTO(data.market), ...prev]);
                toast({ type: "success", title: "Market created", description: question });
                return true;
            } catch (e) {
                toast({ type: "error", title: "Create failed", description: e instanceof Error ? e.message : "Unknown error" });
                return false;
            }
        },
        [toast],
    );

    return (
        <WalletContext.Provider
            value={{
                balance,
                tokenBalances,
                streak,
                trades,
                myTrades,
                markets,
                isLoading,
                isConnected,
                placeTrade,
                closePosition,
                resolveMarket,
                createNewMarket,
                refreshMarkets,
            }}
        >
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
