"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BitsTableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export function BitsTable({ headers, children, className }: BitsTableProps) {
  return (
    <div className={cn("w-full overflow-x-auto custom-scrollbar rounded-xl border border-white/5 bg-[#0F0F14]", className)}>
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-white/5 bg-white/2">
            {headers.map((header) => (
              <th key={header} className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function BitsTableRow({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr 
      onClick={onClick}
      className={cn(
        "group transition-colors hover:bg-white/[0.03]", 
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function BitsTableCell({ children, className, align = "left" }: { children: React.ReactNode; className?: string; align?: "left" | "right" | "center" }) {
  const alignments = {
    left: "text-left",
    right: "text-right",
    center: "text-center"
  };

  return (
    <td className={cn("px-6 py-4 text-sm font-medium text-white/90", alignments[align], className)}>
      {children}
    </td>
  );
}
