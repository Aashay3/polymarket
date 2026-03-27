"use client";

import { useRef, useState, useCallback } from "react";

interface GlowPosition {
  x: number;
  y: number;
}

export function useCursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState<GlowPosition | null>(null);
  const [tapBurst, setTapBurst] = useState<GlowPosition | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setGlow({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setGlow(null);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const touch = e.touches[0];
    const rect = el.getBoundingClientRect();
    const pos = {
      x: ((touch.clientX - rect.left) / rect.width) * 100,
      y: ((touch.clientY - rect.top) / rect.height) * 100,
    };
    setTapBurst(pos);
    // Clear burst after animation
    setTimeout(() => setTapBurst(null), 700);
  }, []);

  const glowStyle = glow
    ? {
        background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(255,84,27,0.12) 0%, rgba(255,84,27,0.04) 40%, transparent 65%)`,
      }
    : null;

  const tapBurstStyle = tapBurst
    ? {
        background: `radial-gradient(circle at ${tapBurst.x}% ${tapBurst.y}%, rgba(255,120,50,0.30) 0%, rgba(255,84,27,0.08) 40%, transparent 70%)`,
      }
    : null;

  return {
    ref,
    glowStyle,
    tapBurstStyle,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
    },
  };
}
