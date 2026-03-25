"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    TrendingUp,
    Wallet,
    Activity,
    Settings,
    LogOut,
    Menu,
    Command,
    Bell,
    Search,
    Shield
} from "lucide-react";
import { useWallet } from "@/app/context/WalletContext";

const navigation = [
    { name: "Overview", href: "/dashboard", icon: TrendingUp },
    { name: "Markets", href: "/dashboard/markets", icon: Search },
    { name: "Portfolio", href: "/dashboard/portfolio", icon: Wallet },
    { name: "Activity", href: "/dashboard/activity", icon: Activity },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
    { name: "Admin", href: "/dashboard/admin", icon: Shield },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { balance } = useWallet();

    return (
        <div className="flex h-screen bg-[#000000] text-white overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? "w-64" : "w-20"
                    } transition-all duration-300 border-r border-[#1a1a1a] flex flex-col bg-[#050505]`}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-[#1a1a1a]">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
                            <Command className="w-5 h-5 text-black" />
                        </div>
                        {isSidebarOpen && (
                            <span className="font-semibold text-sm tracking-wide whitespace-nowrap">
                                POLYMARKET
                            </span>
                        )}
                    </div>
                    {isSidebarOpen && (
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-neutral-400 hover:text-white">
                            <Menu className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative ${isActive
                                    ? "bg-[#1a1a1a] text-white"
                                    : "text-neutral-400 hover:bg-[#111] hover:text-white"
                                    }`}
                                title={!isSidebarOpen ? item.name : undefined}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                                )}
                                <item.icon className="w-5 h-5 shrink-0" />
                                {isSidebarOpen && <span className="text-sm font-medium">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#1a1a1a]">
                    <Link
                        href="/"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-[#111] hover:text-white transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        {isSidebarOpen && <span className="text-sm font-medium">Log out</span>}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-[#1a1a1a] flex items-center justify-between px-6 bg-[#050505]">
                    <div className="flex items-center gap-4 flex-1">
                        {!isSidebarOpen && (
                            <button onClick={() => setIsSidebarOpen(true)} className="text-neutral-400 hover:text-white">
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="relative max-w-md w-full hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Search markets..."
                                className="w-full bg-[#111] border border-[#222] rounded-lg py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:text-neutral-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative text-neutral-400 hover:text-white transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute 0 top-0 right-0 w-2 h-2 bg-white rounded-full border-2 border-[#050505]"></span>
                        </button>
                        <div className="h-6 w-px bg-[#222]"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-medium text-white">${balance.toFixed(2)}</div>
                                <div className="text-xs text-neutral-500">Available</div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-600 border border-[#333]"></div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto bg-[#000]">
                    {children}
                </main>
            </div>
        </div>
    );
}
