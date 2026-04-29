"use client";

import { WalletProvider } from "./context/WalletContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LeftRailProvider } from "./context/LeftRailContext";
import { SessionProvider } from "@/components/SessionProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary>
            <SessionProvider>
                <ThemeProvider>
                    <ToastProvider>
                        <LeftRailProvider>
                            <WalletProvider>{children}</WalletProvider>
                        </LeftRailProvider>
                    </ToastProvider>
                </ThemeProvider>
            </SessionProvider>
        </ErrorBoundary>
    );
}
