"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ArrowLeft,
  Ship,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  ExternalLink,
  Layers,
  X,
  Wind,
  Waves,
  Clock,
  AlertTriangle,
  CloudRain,
} from "lucide-react";

import type {
  VesselState,
  WeatherZone,
  DisruptionZone,
  MapLayersConfig,
  ZoomPreset,
} from "./types";
import { OceanCanvas } from "./ocean-canvas";
import { OceanControls } from "./ocean-controls";
import { VesselIntelligencePanel } from "./vessel-intelligence-panel";
import { FleetOverviewPanel } from "./fleet-overview-panel";

import { getFleetTracking, getShipmentTracking, getSimulationState } from "@/lib/api/tracking";
import { getShipmentAIAnalysis } from "@/lib/api/ai";
import { setSimulationSpeed, pauseSimulation, resumeSimulation, resetSimulation } from "@/lib/api/admin";
import type { RouteSegment, AlternativeRoute, ApiSimulationState } from "@/lib/types/api";

interface OceanCommandCenterProps {
  initialShipmentId?: string | null;
}

export function OceanCommandCenter({ initialShipmentId }: OceanCommandCenterProps) {
  const router = useRouter();

  // Selected Vessel & Telemetry
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(initialShipmentId || null);
  const [vessels, setVessels] = useState<VesselState[]>([]);
  const [activeRouteSegments, setActiveRouteSegments] = useState<RouteSegment[]>([]);
  const [alternativeRoutes, setAlternativeRoutes] = useState<AlternativeRoute[]>([]);

  // Mounted state to prevent SSR hydration mismatches with clocks
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Simulation Clock state
  const [simState, setSimState] = useState<ApiSimulationState>({
    is_running: true,
    speed_multiplier: 1,
    current_time: "",
  });

  // Camera & Ocean Controls state
  const [zoomPreset, setZoomPreset] = useState<ZoomPreset>(100);
  const [followVessel, setFollowVessel] = useState(false);
  const [layers, setLayers] = useState<MapLayersConfig>({
    weather: true,
    disruptions: true,
    routes: true,
    labels: true,
  });

  // Selected weather or disruption inspection popups
  const [inspectedWeather, setInspectedWeather] = useState<WeatherZone | null>(null);
  const [inspectedDisruption, setInspectedDisruption] = useState<DisruptionZone | null>(null);

  // Status & Syncing
  const [isSynced, setIsSynced] = useState(true);
  const pollTimerRef = useRef<any>(null);

  // Fetch live fleet telemetry & simulation clock
  const fetchFleetData = useCallback(async () => {
    try {
      const [fleetData, simulationData] = await Promise.all([
        getFleetTracking(),
        getSimulationState().catch(() => null),
      ]);

      if (fleetData && Array.isArray(fleetData)) {
        setVessels(fleetData);
      }
      if (simulationData) {
        setSimState(simulationData);
      }
      setIsSynced(true);
    } catch (e) {
      console.warn("Fleet tracking poll failed:", e);
      setIsSynced(false);
    }
  }, []);

  // Initial load and periodic simulation sync (polls every 3.5s)
  useEffect(() => {
    fetchFleetData();
    pollTimerRef.current = setInterval(fetchFleetData, 3500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchFleetData]);

  // When selected shipment changes: load its route geometry & alternative routes
  useEffect(() => {
    if (!selectedShipmentId) {
      setActiveRouteSegments([]);
      setAlternativeRoutes([]);
      setFollowVessel(false);
      return;
    }

    let isMounted = true;

    // Load detailed route segments for this shipment
    getShipmentTracking(selectedShipmentId)
      .then((res) => {
        if (isMounted && res?.route_segments) {
          setActiveRouteSegments(res.route_segments);
        }
      })
      .catch(() => {});

    // Load AI alternative routes for this shipment
    getShipmentAIAnalysis(selectedShipmentId)
      .then((aiRes) => {
        if (isMounted && aiRes?.alternative_routes) {
          setAlternativeRoutes(aiRes.alternative_routes);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [selectedShipmentId]);

  // Handle selecting a vessel
  const handleSelectVessel = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    router.replace(`/dashboard/assistant?shipment_id=${shipmentId}`);
  };

  // Handle closing vessel panel back to global fleet mode
  const handleCloseVessel = () => {
    setSelectedShipmentId(null);
    setFollowVessel(false);
    router.replace("/dashboard/assistant");
  };

  // Simulation Controls
  const handleTogglePlayPause = async () => {
    try {
      if (simState.is_running) {
        const updated = await pauseSimulation();
        setSimState(updated);
      } else {
        const updated = await resumeSimulation();
        setSimState(updated);
      }
    } catch (err) {
      console.error("Simulation toggle failed:", err);
    }
  };

  const handleChangeSpeed = async (multiplier: number) => {
    try {
      const updated = await setSimulationSpeed(multiplier);
      setSimState(updated);
    } catch (err) {
      console.error("Simulation speed change failed:", err);
    }
  };

  const handleResetSimulation = async () => {
    try {
      const updated = await resetSimulation();
      setSimState(updated);
      fetchFleetData();
    } catch (err) {
      console.error("Simulation reset failed:", err);
    }
  };

  // Toggle map layers
  const handleToggleLayer = (key: keyof MapLayersConfig) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Reset ocean camera to default
  const handleResetView = () => {
    setZoomPreset(80);
    setFollowVessel(false);
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#070B14] overflow-hidden flex flex-col">
      {/* ── TOP OPERATIONAL HUD ────────────────────────────────────────── */}
      <header className="h-14 bg-[#0A0F1E]/95 border-b border-[#1E2D4A] px-4 flex items-center justify-between z-20 backdrop-blur-xl shrink-0">
        {/* Left Branding & Live Sync status */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#162038] text-slate-400 hover:text-white text-xs font-mono transition-colors"
            title="Return to operational dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-[#1E2D4A]" />

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(0,212,255,0.2)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-widest font-mono">BOB AI</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-semibold">
                  OCEAN INTELLIGENCE
                </span>
                <span className="hidden lg:inline text-[9px] font-mono text-cyan-400/80">
                  by Team Synora
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Maritime Digital Twin • Autonomous Reasoning
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-3 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{isSynced ? "LIVE DATA SYNCED" : "DATA RECONNECTING..."}</span>
          </div>
        </div>

        {/* Center: Authoritative Simulation Clock HUD */}
        <div className="hidden lg:flex items-center gap-2 bg-[#162038]/70 px-3 py-1.5 rounded-xl border border-[#1E2D4A] shadow-inner">
          <button
            onClick={handleTogglePlayPause}
            className={`p-1 rounded-md transition-colors ${
              simState.is_running
                ? "text-cyan-400 hover:bg-cyan-500/20"
                : "text-amber-400 hover:bg-amber-500/20"
            }`}
            title={simState.is_running ? "Pause simulation" : "Resume simulation"}
          >
            {simState.is_running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <div className="flex items-center gap-1">
            {[1, 10, 50, 100].map((speed) => (
              <button
                key={speed}
                onClick={() => handleChangeSpeed(speed)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                  simState.speed_multiplier === speed
                    ? "bg-cyan-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {speed}×
              </button>
            ))}
          </div>

          <div className="h-3.5 w-px bg-[#1E2D4A]" />

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span suppressHydrationWarning>
              {mounted && simState.current_time
                ? new Date(simState.current_time).toUTCString().replace("GMT", "UTC")
                : "--"}
            </span>
          </div>

          <button
            onClick={handleResetSimulation}
            className="p-1 rounded hover:bg-[#1E2D4A] text-slate-500 hover:text-slate-300 transition-colors"
            title="Reset simulation to base time"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Quick Telemetry Pills & Links */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-[#162038] border border-[#1E2D4A] text-slate-300">
              <strong className="text-white font-bold">{vessels.length || 250}</strong> Vessels
            </span>
            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400">
              <strong className="font-bold">8</strong> Critical
            </span>
          </div>

          <Link
            href="/admin"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#162038] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Admin</span>
          </Link>
        </div>
      </header>

      {/* ── MAIN INTERACTIVE WORKSPACE (CANVAS + DRAWER) ───────────────── */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* Ocean Map Canvas */}
        <div className="relative flex-1 h-full w-full">
          <OceanCanvas
            vessels={vessels}
            selectedShipmentId={selectedShipmentId}
            onSelectVessel={handleSelectVessel}
            onSelectWeather={setInspectedWeather}
            onSelectDisruption={setInspectedDisruption}
            activeRouteSegments={activeRouteSegments}
            alternativeRoutes={alternativeRoutes}
            followVessel={followVessel}
            zoomPreset={zoomPreset}
            onZoomChange={setZoomPreset}
            layers={layers}
          />

          {/* Floating Controls Bar at bottom center */}
          <OceanControls
            zoomPreset={zoomPreset}
            onZoomChange={setZoomPreset}
            followVessel={followVessel}
            onToggleFollowVessel={() => setFollowVessel(!followVessel)}
            hasSelectedVessel={Boolean(selectedShipmentId)}
            layers={layers}
            onToggleLayer={handleToggleLayer}
            onResetView={handleResetView}
          />

          {/* Floating Weather Zone Inspection Card */}
          {inspectedWeather && (
            <div className="absolute top-4 left-4 z-30 w-80 p-3.5 rounded-xl bg-[#0A0F1E]/95 border border-[#1E2D4A] shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2D4A]">
                <div className="flex items-center gap-1.5">
                  <CloudRain className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase">
                    Weather Intelligence
                  </span>
                </div>
                <button
                  onClick={() => setInspectedWeather(null)}
                  className="p-1 rounded hover:bg-[#162038] text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-2.5 space-y-2 text-xs">
                <div>
                  <h4 className="font-bold text-slate-200">{inspectedWeather.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{inspectedWeather.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded bg-[#162038]/60 border border-[#1E2D4A]/60">
                    <span className="text-[10px] text-slate-400 block">Condition</span>
                    <span className="font-bold uppercase text-sky-400">{inspectedWeather.condition}</span>
                  </div>
                  <div className="p-2 rounded bg-[#162038]/60 border border-[#1E2D4A]/60">
                    <span className="text-[10px] text-slate-400 block">Wind / Gusts</span>
                    <span className="font-bold text-slate-200">{inspectedWeather.wind_speed_kmh} / {inspectedWeather.wind_gust_kmh} km/h</span>
                  </div>
                  <div className="p-2 rounded bg-[#162038]/60 border border-[#1E2D4A]/60">
                    <span className="text-[10px] text-slate-400 block">Sea Swell / Waves</span>
                    <span className="font-bold text-slate-200">{inspectedWeather.wave_height_m}m Swell</span>
                  </div>
                  <div className="p-2 rounded bg-[#162038]/60 border border-[#1E2D4A]/60">
                    <span className="text-[10px] text-slate-400 block">Vessel Speed Impact</span>
                    <span className="font-bold text-red-400">-{inspectedWeather.speed_reduction_pct}% Slowdown</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-300 font-mono">
                  ⚠ Estimated transit impact: +{inspectedWeather.estimated_delay_hours} hours delay
                </div>
              </div>
            </div>
          )}

          {/* Floating Disruption Inspection Card */}
          {inspectedDisruption && (
            <div className="absolute top-4 left-4 z-30 w-80 p-3.5 rounded-xl bg-[#0A0F1E]/95 border border-[#1E2D4A] shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E2D4A]">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold text-white font-mono uppercase">
                    Disruption Intelligence
                  </span>
                </div>
                <button
                  onClick={() => setInspectedDisruption(null)}
                  className="p-1 rounded hover:bg-[#162038] text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="py-2.5 space-y-2 text-xs">
                <div>
                  <h4 className="font-bold text-slate-200">{inspectedDisruption.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{inspectedDisruption.location}</p>
                </div>

                <p className="text-[11px] text-slate-300 bg-[#162038]/60 p-2 rounded border border-[#1E2D4A]/60">
                  {inspectedDisruption.impact_summary}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div className="p-2 rounded bg-[#162038]/60 border border-[#1E2D4A]/60">
                    <span className="text-[10px] text-slate-400 block">Severity</span>
                    <span className="font-bold uppercase text-red-400">{inspectedDisruption.severity}</span>
                  </div>
                  <div className="p-2 rounded bg-[#162038]/60 border border-[#1E2D4A]/60">
                    <span className="text-[10px] text-slate-400 block">Affected Fleet</span>
                    <span className="font-bold text-white">{inspectedDisruption.affected_count} Shipments</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-mono">
                  ⚠ Typical transit delay: +{inspectedDisruption.delay_days} days
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Intelligence Panel: Either Focused Vessel or Global Fleet */}
        {selectedShipmentId ? (
          <VesselIntelligencePanel
            shipmentId={selectedShipmentId}
            onClose={handleCloseVessel}
            followVessel={followVessel}
            onToggleFollowVessel={() => setFollowVessel(!followVessel)}
          />
        ) : (
          <FleetOverviewPanel
            vessels={vessels}
            onSelectVessel={handleSelectVessel}
            activeDisruptionsCount={12}
          />
        )}
      </div>
    </div>
  );
}
