"use client";

import React, { useEffect, useState } from "react";

interface DropRippleProps {
  x: number;
  y: number;
  onComplete?: () => void;
}

export function DropRipple({ x, y, onComplete }: DropRippleProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 650);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed pointer-events-none z-45 -translate-x-1/2 -translate-y-1/2 select-none"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {/* Outer expanding ripple ring */}
      <span className="absolute -inset-6 rounded-full border border-cyan-400/80 animate-[ping_0.6s_cubic-bezier(0,0,0.2,1)_forwards]" />

      {/* Inner secondary wave crest */}
      <span className="absolute -inset-3 rounded-full border border-sky-300/60 animate-[ping_0.45s_cubic-bezier(0,0,0.2,1)_forwards]" />

      {/* Center splash droplet burst */}
      <div className="w-4 h-4 rounded-full bg-cyan-400/30 blur-[2px] animate-pulse" />
    </div>
  );
}
