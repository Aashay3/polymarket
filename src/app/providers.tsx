"use client";

import { WalletProvider } from "./context/WalletContext";
import { DrawerProvider } from "./context/DrawerContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <DrawerProvider>
            <WalletProvider>{children}</WalletProvider>
        </DrawerProvider>
    );
}
