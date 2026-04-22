import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
          <Icon className="w-7 h-7 text-white/40" />
        </div>
      )}
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-white/50 max-w-sm mb-6 leading-relaxed">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
