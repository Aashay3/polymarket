import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const ROUNDED_MAP = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
} as const;

export function Skeleton({ className, rounded = "lg", ...rest }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white/5 border border-white/5",
        ROUNDED_MAP[rounded],
        "before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent",
        className
      )}
      aria-hidden="true"
      {...rest}
    />
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-white/2 border border-white/5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-16" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="pt-2 space-y-2">
        <Skeleton className="h-2 w-full" />
        <div className="flex justify-between gap-2">
          <Skeleton className="h-8 w-full" rounded="lg" />
          <Skeleton className="h-8 w-full" rounded="lg" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-1/3" : "w-1/6")} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-white/2 border border-white/5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  );
}
