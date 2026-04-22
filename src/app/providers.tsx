"use client";

import { WalletProvider } from "./context/WalletContext";
import { DrawerProvider } from "./context/DrawerContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SessionProvider } from "@/components/SessionProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ErrorBoundary>
            <SessionProvider>
                <ThemeProvider>
                    <ToastProvider>
                        <DrawerProvider>
                            <WalletProvider>{children}</WalletProvider>
                        </DrawerProvider>
                    </ToastProvider>
                </ThemeProvider>
            </SessionProvider>
        </ErrorBoundary>
    );
}
