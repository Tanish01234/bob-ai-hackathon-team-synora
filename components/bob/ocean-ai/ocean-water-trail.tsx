"use client";

import React, { useEffect, useRef } from "react";

export interface TrailPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  timestamp: number;
  angle: number;
}

interface OceanWaterTrailProps {
  points: TrailPoint[];
}

const MAX_LIFETIME_MS = 950; // Wake fades out smoothly over ~1 second

export function OceanWaterTrail({ points }: OceanWaterTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePointsRef = useRef<TrailPoint[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Sync incoming points to ref
  useEffect(() => {
    activePointsRef.current = points;
  }, [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI displays
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Animation render loop
    const render = () => {
      const now = performance.now();
      const currentPoints = activePointsRef.current;

      // Filter out points older than lifetime
      activePointsRef.current = currentPoints.filter(
        (p) => now - p.timestamp < MAX_LIFETIME_MS
      );
      const alive = activePointsRef.current;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (alive.length > 1) {
        // 1. Draw Primary Center Wake Spine
        ctx.beginPath();
        ctx.moveTo(alive[0].x, alive[0].y);

        for (let i = 1; i < alive.length; i++) {
          const xc = (alive[i].x + alive[i - 1].x) / 2;
          const yc = (alive[i].y + alive[i - 1].y) / 2;
          ctx.quadraticCurveTo(alive[i - 1].x, alive[i - 1].y, xc, yc);
        }

        ctx.strokeStyle = "rgba(0, 212, 255, 0.4)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // 2. Draw Hydrodynamic Expanding Wake Ribs (V-Shape fan)
        alive.forEach((p, idx) => {
          const age = now - p.timestamp;
          const progress = age / MAX_LIFETIME_MS; // 0 (new) to 1 (faded)
          const alpha = Math.max(0, 1 - progress);

          // Wake expands outward as it ages (from 10px up to 38px width)
          const spread = 12 + progress * 26;

          // Normal perpendicular vector to motion direction
          const perpAngle = p.angle + Math.PI / 2;
          const cos = Math.cos(perpAngle);
          const sin = Math.sin(perpAngle);

          const leftX = p.x + cos * spread;
          const leftY = p.y + sin * spread;
          const rightX = p.x - cos * spread;
          const rightY = p.y - sin * spread;

          // Lateral wave ripple strokes
          ctx.beginPath();
          ctx.moveTo(leftX, leftY);
          ctx.quadraticCurveTo(p.x, p.y, rightX, rightY);

          // Color shifts from bright turquoise to deep azure as it dissipates
          const r = Math.round(0 * (1 - progress) + 2 * progress);
          const g = Math.round(212 * (1 - progress) + 132 * progress);
          const b = Math.round(255 * (1 - progress) + 199 * progress);

          ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.65})`;
          ctx.lineWidth = Math.max(1, 2.5 * (1 - progress));
          ctx.lineCap = "round";
          ctx.stroke();

          // 3. Ambient Foam Droplets along lateral boundary
          if (idx % 2 === 0 && alpha > 0.3) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.75})`;
            ctx.beginPath();
            ctx.arc(leftX, leftY, 1.2 * (1 - progress * 0.5), 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(rightX, rightY, 1.2 * (1 - progress * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40 select-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
