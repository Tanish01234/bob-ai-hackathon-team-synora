"use client";

import React from "react";
import {
  ZoomIn,
  ZoomOut,
  Crosshair,
  CloudRain,
  ShieldAlert,
  Route,
  Tag,
  RotateCcw,
} from "lucide-react";
import type { ZoomPreset, MapLayersConfig } from "./types";

interface OceanControlsProps {
  zoomPreset: ZoomPreset;
  onZoomChange: (preset: ZoomPreset) => void;
  followVessel: boolean;
  onToggleFollowVessel: () => void;
  hasSelectedVessel: boolean;
  layers: MapLayersConfig;
  onToggleLayer: (key: keyof MapLayersConfig) => void;
  onResetView: () => void;
}

const PRESETS: ZoomPreset[] = [60, 80, 100, 120, 150];

export function OceanControls({
  zoomPreset,
  onZoomChange,
  followVessel,
  onToggleFollowVessel,
  hasSelectedVessel,
  layers,
  onToggleLayer,
  onResetView,
}: OceanControlsProps) {
  const currentIdx = PRESETS.indexOf(zoomPreset);

  const handleZoomStep = (delta: number) => {
    const nextIdx = Math.max(0, Math.min(PRESETS.length - 1, currentIdx + delta));
    onZoomChange(PRESETS[nextIdx]);
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0A0F1E]/90 border border-[#1E2D4A] shadow-2xl backdrop-blur-xl transition-all">
      {/* Zoom Preset Stepper */}
      <div className="flex items-center gap-1 bg-[#162038]/60 p-1 rounded-lg border border-[#1E2D4A]/60">
        <button
          onClick={() => handleZoomStep(-1)}
          disabled={currentIdx === 0}
          className="p-1 rounded hover:bg-[#1E2D4A] text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-0.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => onZoomChange(preset)}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors ${
                zoomPreset === preset
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#1E2D4A]/50"
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>

        <button
          onClick={() => handleZoomStep(1)}
          disabled={currentIdx === PRESETS.length - 1}
          className="p-1 rounded hover:bg-[#1E2D4A] text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-5 w-px bg-[#1E2D4A]" />

      {/* Follow Vessel Camera Lock */}
      {hasSelectedVessel && (
        <button
          onClick={onToggleFollowVessel}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
            followVessel
              ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.25)]"
              : "bg-[#162038]/60 border-[#1E2D4A] text-slate-300 hover:bg-[#1E2D4A] hover:text-white"
          }`}
          title="Locks camera to selected vessel position as simulation runs"
        >
          <Crosshair className={`w-3.5 h-3.5 ${followVessel ? "animate-spin text-cyan-400" : ""}`} />
          <span>Follow Vessel</span>
          <span className={`text-[10px] font-mono px-1 rounded ${followVessel ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-500"}`}>
            {followVessel ? "LOCKED" : "OFF"}
          </span>
        </button>
      )}

      {/* Layer Toggles */}
      <div className="flex items-center gap-1 bg-[#162038]/60 p-1 rounded-lg border border-[#1E2D4A]/60">
        <button
          onClick={() => onToggleLayer("weather")}
          className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
            layers.weather
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle weather regions layer"
        >
          <CloudRain className="w-3.5 h-3.5" />
          <span className="text-[11px]">Weather</span>
        </button>

        <button
          onClick={() => onToggleLayer("disruptions")}
          className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
            layers.disruptions
              ? "bg-red-500/20 text-red-300 border border-red-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle active disruption warnings"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="text-[11px]">Disruptions</span>
        </button>

        <button
          onClick={() => onToggleLayer("routes")}
          className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
            layers.routes
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle shipping corridors & route lines"
        >
          <Route className="w-3.5 h-3.5" />
          <span className="text-[11px]">Routes</span>
        </button>

        <button
          onClick={() => onToggleLayer("labels")}
          className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors ${
            layers.labels
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle vessel labels and telemetry tags"
        >
          <Tag className="w-3.5 h-3.5" />
          <span className="text-[11px]">Labels</span>
        </button>
      </div>

      <div className="h-5 w-px bg-[#1E2D4A]" />

      {/* Reset View Button */}
      <button
        onClick={onResetView}
        className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-[#162038]/60 hover:bg-[#1E2D4A] rounded-lg border border-[#1E2D4A]/60 transition-colors"
        title="Reset map view to global fleet"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span className="text-[11px]">Reset View</span>
      </button>
    </div>
  );
}
