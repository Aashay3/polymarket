"use client";

import { Navbar } from "./Navbar";
import { NavigationDrawer } from "./NavigationDrawer";
import { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
      <Navbar />
      
      <NavigationDrawer />

      <main className="pt-[60px] max-container">
        <div className="py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
