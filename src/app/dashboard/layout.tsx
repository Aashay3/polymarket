"use client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 py-6">
            {children}
        </div>
    );
}
