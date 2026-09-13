"use client";

import React from "react";

interface OceanWaterSurfaceProps {
  isHovered: boolean;
  isDragging: boolean;
  width?: number;
}

export function OceanWaterSurface({
  isHovered,
  isDragging,
  width = 130,
}: OceanWaterSurfaceProps) {
  return (
    <div
      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 pointer-events-none select-none"
      style={{ width: `${width}px`, height: "30px" }}
    >
      {/* 1. Deep Ocean Bathymetric Shadow / Ambient Water Bed */}
      <div
        className="absolute inset-x-2 bottom-1 h-3.5 rounded-[100%] bg-[#050D1A]/90 blur-[4px] transition-opacity duration-300"
        style={{
          opacity: isDragging ? 0.95 : isHovered ? 0.85 : 0.7,
        }}
      />

      {/* 2. Hydrodynamic Cyan Water Reflection & Refraction */}
      <div
        className="absolute inset-x-4 bottom-2 h-2 rounded-[100%] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent blur-[2px] transition-all duration-300"
        style={{
          transform: isHovered ? "scaleX(1.15)" : "scaleX(1)",
          opacity: isDragging ? 0.9 : isHovered ? 0.75 : 0.5,
        }}
      />

      {/* 3. Multi-Layer Animated Water Waves SVG */}
      <svg
        viewBox="0 0 160 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full overflow-visible transition-all duration-300 ${
          isDragging ? "opacity-95" : isHovered ? "opacity-90" : "opacity-75"
        }`}
      >
        <defs>
          {/* Deep water gradient */}
          <linearGradient id="deepWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0" />
            <stop offset="30%" stopColor="#0284C7" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#00D4FF" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#0284C7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </linearGradient>

          {/* Foam highlight gradient */}
          <linearGradient id="foamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="25%" stopColor="#E0F2FE" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="75%" stopColor="#E0F2FE" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Primary Hydrodynamic Wave Curve */}
        <path
          d="M 5,14 Q 40,8 80,14 T 155,14"
          stroke="url(#deepWaveGrad)"
          strokeWidth={isDragging ? 2.5 : isHovered ? 2.2 : 1.8}
          strokeLinecap="round"
          className="animate-[water-swell_3.6s_ease-in-out_infinite]"
        />

        {/* Secondary Surface Ripple */}
        <path
          d="M 18,17 Q 50,12 85,17 T 142,17"
          stroke="url(#deepWaveGrad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="4 6"
          className="animate-[water-swell_2.8s_ease-in-out_infinite_reverse]"
          style={{ opacity: 0.65 }}
        />

        {/* Tertiary Crest Foam Stroke */}
        <path
          d="M 35,12 Q 65,10 95,12 T 130,12"
          stroke="url(#foamGrad)"
          strokeWidth="1"
          strokeLinecap="round"
          style={{ opacity: isHovered || isDragging ? 0.8 : 0.45 }}
        />

        {/* Lateral Wake Spray Highlights (Stern & Bow disturbance) */}
        <circle cx="22" cy="15" r="1.2" fill="#E0F2FE" opacity="0.7" />
        <circle cx="28" cy="18" r="0.8" fill="#38BDF8" opacity="0.6" />
        <circle cx="138" cy="15" r="1.2" fill="#E0F2FE" opacity="0.7" />
        <circle cx="144" cy="17" r="0.8" fill="#38BDF8" opacity="0.6" />
      </svg>
    </div>
  );
}
