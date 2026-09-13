"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sparkles, Play, Zap, X, Shield, Clock, Compass } from "lucide-react";
import type { DemoMode } from "./types";

interface GuidedDemoWelcomeProps {
  isOpen: boolean;
  onStart: (mode: DemoMode) => void;
  onSkip: (dontShowAgain: boolean) => void;
}

export function GuidedDemoWelcome({ isOpen, onStart, onSkip }: GuidedDemoWelcomeProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050A14]/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0A0F1E] border border-[#1E2D4A] shadow-[0_0_50px_rgba(0,212,255,0.15)] overflow-hidden flex flex-col">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header with Vessel Thumbnail & Close */}
        <div className="p-6 pb-4 border-b border-[#1E2D4A]/60 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center p-1 shadow-inner overflow-hidden">
              <Image
                src="/bob-ocean-ship.png"
                alt="BOB Ocean Vessel"
                width={48}
                height={24}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-wide">
                  Welcome to BOB
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Supply Chain Intelligence Platform
              </p>
            </div>
          </div>

          <button
            onClick={() => onSkip(dontShowAgain)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162038] transition-colors"
            title="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Narrative & Value Proposition */}
        <div className="p-6 space-y-4 text-xs leading-relaxed text-slate-300">
          <p>
            Explore how BOB tracks 250 global commercial shipments, detects active sea-lane
            disruptions, monitors cold-chain cargo health, and uses grounded dual-tier AI to recommend
            optimal rerouting decisions.
          </p>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-[#162038]/50 border border-[#1E2D4A]/60 text-center">
              <Compass className="w-4 h-4 text-cyan-400 mx-auto mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200 block">250 Vessels</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Simulated Telemetry</span>
            </div>

            <div className="p-3 rounded-xl bg-[#162038]/50 border border-[#1E2D4A]/60 text-center">
              <Shield className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200 block">Rules Detect</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Deterministic Risk</span>
            </div>

            <div className="p-3 rounded-xl bg-[#162038]/50 border border-[#1E2D4A]/60 text-center">
              <Sparkles className="w-4 h-4 text-purple-400 mx-auto mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200 block">AI Reasons</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Grounded Analysis</span>
            </div>
          </div>
        </div>

        {/* Actions & Tour Mode Options */}
        <div className="p-6 pt-2 bg-[#162038]/30 border-t border-[#1E2D4A]/60 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => onStart("full")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-[0_0_20px_rgba(0,212,255,0.35)] cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Guided Demo (~60s)</span>
            </button>

            <button
              onClick={() => onStart("quick")}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-[#162038] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-slate-200 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              title="Fast-track 30-second tour"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Quick Demo (30s)</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#1E2D4A] bg-[#162038] text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer"
              />
              <span>Don&apos;t show this again</span>
            </label>

            <button
              onClick={() => onSkip(dontShowAgain)}
              className="text-slate-400 hover:text-slate-200 underline underline-offset-4 cursor-pointer"
            >
              Skip Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
