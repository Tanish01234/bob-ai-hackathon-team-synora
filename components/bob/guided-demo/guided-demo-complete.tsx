"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, RotateCcw, Compass, ArrowRight, X } from "lucide-react";

interface GuidedDemoCompleteProps {
  isOpen: boolean;
  onRestart: () => void;
  onClose: () => void;
  stats?: {
    total: number;
    inTransit: number;
    delayed: number;
    delivered: number;
    disruptions: number;
  };
}

export function GuidedDemoComplete({
  isOpen,
  onRestart,
  onClose,
  stats = {
    total: 250,
    inTransit: 188,
    delayed: 36,
    delivered: 26,
    disruptions: 12,
  },
}: GuidedDemoCompleteProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050A14]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0A0F1E] border border-[#1E2D4A] shadow-[0_0_60px_rgba(16,185,129,0.18)] overflow-hidden flex flex-col">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#1E2D4A]/60 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono tracking-wide">
                BOB Guided Demo Complete
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Supply Chain Intelligence · <span className="text-cyan-400/80">by Team Synora</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#162038] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Narrative Summary */}
        <div className="p-6 space-y-4 text-xs leading-relaxed text-slate-300">
          <p>
            You&apos;ve seen how BOB turns real shipment data, live simulation signals, and grounded dual-tier
            AI reasoning into actionable supply-chain intelligence.
          </p>

          {/* Live Synchronized Fleet KPIs */}
          <div className="p-3.5 rounded-xl bg-[#162038]/50 border border-[#1E2D4A]/60 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
              <span>Live Synchronized Fleet Status</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live State
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-1 font-mono text-center">
              <div className="p-2 rounded-lg bg-[#0A0F1E]/80 border border-[#1E2D4A]/60">
                <span className="text-base font-bold text-white block">{stats.total}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Total</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0A0F1E]/80 border border-[#1E2D4A]/60">
                <span className="text-base font-bold text-cyan-400 block">{stats.inTransit}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">In Transit</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0A0F1E]/80 border border-[#1E2D4A]/60">
                <span className="text-base font-bold text-amber-400 block">{stats.delayed}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Delayed</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0A0F1E]/80 border border-[#1E2D4A]/60">
                <span className="text-base font-bold text-emerald-400 block">{stats.delivered}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Delivered</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0A0F1E]/80 border border-[#1E2D4A]/60">
                <span className="text-base font-bold text-red-400 block">{stats.disruptions}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5">Disruptions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-6 pt-2 bg-[#162038]/30 border-t border-[#1E2D4A]/60 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)] cursor-pointer"
          >
            <span>Explore BOB Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <Link
            href="/dashboard/assistant"
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-[#162038] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-slate-200 hover:text-white font-medium text-xs transition-colors"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ocean AI</span>
          </Link>

          <button
            onClick={onRestart}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl hover:bg-[#1E2D4A] text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
            title="Restart tour from Step 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
