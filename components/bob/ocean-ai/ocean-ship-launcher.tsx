"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { OceanWaterSurface } from "./ocean-water-surface";
import { OceanWaterTrail, type TrailPoint } from "./ocean-water-trail";
import { DropRipple } from "./drop-ripple";

interface OceanShipLauncherProps {
  onOpen: () => void;
  activeShipmentId?: string | null;
}

const SHIP_WIDTH = 130;
const SHIP_HEIGHT = 65;
const MARGIN = 16;
const DRAG_THRESHOLD = 8; // Pixels moved before considering it a drag vs click

export function OceanShipLauncher({ onOpen, activeShipmentId }: OceanShipLauncherProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tiltAngle, setTiltAngle] = useState(0);

  // Drop ripple coordinate
  const [dropRippleCoord, setDropRippleCoord] = useState<{ x: number; y: number } | null>(null);

  // Trail points array for wake rendering
  const [trailPoints, setTrailPoints] = useState<TrailPoint[]>([]);

  // Drag tracking refs (avoids re-render lag during rapid pointer events)
  const dragRef = useRef({
    isPointerDown: false,
    startX: 0,
    startY: 0,
    initialShipX: 0,
    initialShipY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    totalDistance: 0,
  });

  // Clamp coordinates inside viewport margins
  const clampPosition = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    const maxX = Math.max(MARGIN, window.innerWidth - SHIP_WIDTH - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - SHIP_HEIGHT - MARGIN);
    return {
      x: Math.min(Math.max(MARGIN, x), maxX),
      y: Math.min(Math.max(MARGIN, y), maxY),
    };
  }, []);

  // Initialize position from localStorage or default to bottom-right
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("bob-ship-launcher-pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition(clampPosition(parsed.x, parsed.y));
          return;
        }
      }
    } catch {}

    // Default: Bottom Right
    const defaultX = window.innerWidth - SHIP_WIDTH - 24;
    const defaultY = window.innerHeight - SHIP_HEIGHT - 24;
    setPosition(clampPosition(defaultX, defaultY));
  }, [clampPosition]);

  // Keep ship inside bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev.x, prev.y));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition]);

  // Pointer Down: Initialize tracking
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary mouse button / single touch
    if (e.button !== 0) return;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    dragRef.current = {
      isPointerDown: true,
      startX: e.clientX,
      startY: e.clientY,
      initialShipX: position.x,
      initialShipY: position.y,
      lastX: e.clientX,
      lastY: e.clientY,
      lastTime: performance.now(),
      totalDistance: 0,
    };
  };

  // Pointer Move: Drag ship & generate water trail
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.isPointerDown) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const dist = Math.hypot(dx, dy);
    d.totalDistance = dist;

    // Movement threshold: only activate drag physics after 8px
    if (dist >= DRAG_THRESHOLD) {
      if (!isDragging) {
        setIsDragging(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("bob:tour-ship-dragged"));
        }
      }

      const nextX = d.initialShipX + dx;
      const nextY = d.initialShipY + dy;
      const clamped = clampPosition(nextX, nextY);
      setPosition(clamped);

      // Compute velocity for physical tilt angle (-4° to +4°)
      const now = performance.now();
      const dt = Math.max(1, now - d.lastTime);
      const stepX = e.clientX - d.lastX;
      const stepY = e.clientY - d.lastY;
      const vx = stepX / dt;

      // Subtle dynamic tilt
      const targetTilt = Math.min(Math.max(vx * 8, -4), 4);
      setTiltAngle(targetTilt);

      // Add trail point for hydrodynamic wake canvas
      const movementAngle = Math.atan2(stepY, stepX);
      const centerPointX = clamped.x + SHIP_WIDTH / 2;
      const centerPointY = clamped.y + SHIP_HEIGHT - 6;

      setTrailPoints((prev) => {
        const newPoint: TrailPoint = {
          x: centerPointX,
          y: centerPointY,
          vx: stepX,
          vy: stepY,
          timestamp: now,
          angle: movementAngle,
        };
        // Cap point history for 60fps performance
        const trimmed = prev.length > 35 ? prev.slice(-34) : prev;
        return [...trimmed, newPoint];
      });

      d.lastX = e.clientX;
      d.lastY = e.clientY;
      d.lastTime = now;
    }
  };

  // Pointer Up: Release or Click
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.isPointerDown) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    d.isPointerDown = false;
    setTiltAngle(0);

    // If movement was less than threshold, treat as CLICK -> Open AI
    if (d.totalDistance < DRAG_THRESHOLD && !isDragging) {
      onOpen();
    } else {
      // It was a real DRAG!
      setIsDragging(false);

      // Persist dropped position in session
      try {
        localStorage.setItem("bob-ship-launcher-pos", JSON.stringify(position));
      } catch {}

      // Trigger drop water ripple
      setDropRippleCoord({
        x: position.x + SHIP_WIDTH / 2,
        y: position.y + SHIP_HEIGHT - 4,
      });
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  if (!mounted || position.x === -9999) return null;

  return (
    <>
      {/* Signature Animated Hydrodynamic Water Trail Canvas (rendered during drag) */}
      <OceanWaterTrail points={trailPoints} />

      {/* Hydrodynamic Drop Ripple Burst (on release) */}
      {dropRippleCoord && (
        <DropRipple
          x={dropRippleCoord.x}
          y={dropRippleCoord.y}
          onComplete={() => setDropRippleCoord(null)}
        />
      )}

      {/* Floating Draggable Vessel Container */}
      <div
        role="button"
        data-tour="ocean-ship-launcher"
        tabIndex={0}
        aria-label="Open BOB AI Ocean Intelligence"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragRef.current.isPointerDown = false;
          setIsDragging(false);
          setTiltAngle(0);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={handleKeyDown}
        className={`fixed z-45 touch-none select-none transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950 rounded-xl ${
          isDragging ? "cursor-grabbing scale-105" : isHovered ? "cursor-grab" : "cursor-pointer"
        }`}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${SHIP_WIDTH}px`,
          height: `${SHIP_HEIGHT}px`,
          transform: `rotate(${tiltAngle}deg)`,
          transition: isDragging ? "transform 0.08s ease-out" : "transform 0.25s ease-out, filter 0.25s",
        }}
      >
        {/* Subtle Ambient Cyan Glow Halo on Hover or Drag */}
        <div
          className="absolute inset-0 -inset-x-2 -inset-y-1 rounded-2xl bg-cyan-500/20 blur-[10px] pointer-events-none transition-opacity duration-300"
          style={{
            opacity: isDragging ? 0.9 : isHovered ? 0.75 : 0,
          }}
        />

        {/* Floating Context Pill (if shipment focused) */}
        {activeShipmentId && (
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#0A0F1E]/90 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 shadow-md whitespace-nowrap flex items-center gap-1 backdrop-blur-md pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>{activeShipmentId}</span>
          </div>
        )}

        {/* Hover Tooltip (if idle hover) */}
        {isHovered && !isDragging && !activeShipmentId && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#0A0F1E]/95 border border-[#1E2D4A] text-[10px] font-mono text-slate-200 shadow-xl whitespace-nowrap flex items-center gap-1.5 backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            <span className="text-cyan-400">✦</span>
            <span>BOB AI</span>
            <span className="text-[9px] text-slate-400">• Click to open</span>
          </div>
        )}

        {/* The Realistic Container Vessel on Animated Water */}
        <div
          className={`relative w-full h-full flex flex-col items-center justify-end ${
            isDragging ? "" : "animate-[ship-bobbing_3.8s_ease-in-out_infinite]"
          }`}
          style={{
            transform: isHovered && !isDragging ? "translateY(-3px)" : undefined,
            transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          {/* Real Container Ship Image Asset */}
          <div className="relative w-full h-[54px] filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]">
            <Image
              src="/bob-ocean-ship.png"
              alt="BOB Ocean Intelligence Vessel"
              fill
              sizes="130px"
              priority
              className="object-contain pointer-events-none"
            />
          </div>

          {/* Animated Water Surface Under Hull */}
          <OceanWaterSurface
            isHovered={isHovered}
            isDragging={isDragging}
            width={SHIP_WIDTH}
          />
        </div>
      </div>
    </>
  );
}
