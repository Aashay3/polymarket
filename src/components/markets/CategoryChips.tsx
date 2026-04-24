"use client";

import {
  Grid2x2,
  Bitcoin,
  Landmark,
  Trophy,
  Cpu,
  LineChart,
  FlaskConical,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

/**
 * Colorful horizontal-scrolling category chips for the home feed.
 *
 * Each chip has:
 *   - a solid colored icon badge (distinct per category)
 *   - a label
 *   - active state: full-color filled chip; inactive: muted pill
 *
 * Horizontally scrollable on small screens (overflow-x-auto), wraps
 * naturally on larger ones. No scrollbar (hidden via scrollbar-hide
 * in globals).
 */

interface ChipSpec {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  // Active-state background colour. Kept as explicit classes so Tailwind
  // keeps them in the production bundle.
  activeBg: string;
  // Icon color on its own chip background when inactive.
  iconColor: string;
}

const CHIPS: ChipSpec[] = [
  { id: "All",       label: "All",         icon: Grid2x2,      activeBg: "bg-primary",       iconColor: "text-primary"       },
  { id: "Crypto",    label: "Crypto",      icon: Bitcoin,      activeBg: "bg-orange-500",    iconColor: "text-orange-400"    },
  { id: "Politics",  label: "Politics",    icon: Landmark,     activeBg: "bg-blue-500",      iconColor: "text-blue-400"      },
  { id: "Sports",    label: "Sports",      icon: Trophy,       activeBg: "bg-emerald-500",   iconColor: "text-emerald-400"   },
  { id: "Tech",      label: "Tech",        icon: Cpu,          activeBg: "bg-cyan-500",      iconColor: "text-cyan-400"      },
  { id: "Economy",   label: "Economy",     icon: LineChart,    activeBg: "bg-amber-500",     iconColor: "text-amber-400"     },
  { id: "Science",   label: "Science",     icon: FlaskConical, activeBg: "bg-pink-500",      iconColor: "text-pink-400"      },
];

export function CategoryChips({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="relative -mx-4 md:mx-0">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 md:px-0 pb-1">
        {CHIPS.map((chip) => {
          const isActive = active === chip.id;
          const Icon = chip.icon;
          return (
            <button
              key={chip.id}
              onClick={() => onChange(chip.id)}
              className={`group shrink-0 inline-flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full border transition-all ${
                isActive
                  ? `${chip.activeBg} border-transparent text-white`
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                  isActive ? "bg-white/20" : "bg-white/10"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? "text-white" : chip.iconColor}`}
                />
              </span>
              <span className="text-sm font-semibold whitespace-nowrap">{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
