"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  X,
  Sparkles,
  Send,
  Download,
  Crosshair,
  ExternalLink,
  ShieldAlert,
  CloudRain,
  Thermometer,
  Compass,
  ArrowRight,
  Clock,
  Anchor,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import type { VesselState } from "./types";
import type {
  TrackingResponse,
  ApiWeatherResponse,
  ApiRiskResponse,
  ApiAIAnalysisResponse,
  AlternativeRoute,
} from "@/lib/types/api";
import { getShipmentTracking } from "@/lib/api/tracking";
import { getShipmentWeather } from "@/lib/api/weather";
import { getShipmentRisk } from "@/lib/api/risk";
import { getShipmentAIAnalysis, chatWithBob, type AIChatResponse } from "@/lib/api/ai";
import { downloadTransitReceipt } from "@/lib/api/receipts";

interface VesselIntelligencePanelProps {
  shipmentId: string;
  onClose: () => void;
  followVessel: boolean;
  onToggleFollowVessel: () => void;
  onSelectAlternativeRoute?: (route: AlternativeRoute) => void;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  riskLevel?: string | null;
  recommendedAction?: string | null;
  sources?: any[];
  timestamp: string;
}

export function VesselIntelligencePanel({
  shipmentId,
  onClose,
  followVessel,
  onToggleFollowVessel,
  onSelectAlternativeRoute,
}: VesselIntelligencePanelProps) {
  const [loadingContext, setLoadingContext] = useState(true);
  const [syncSteps, setSyncSteps] = useState({
    tracking: false,
    weather: false,
    disruptions: false,
    coldChain: false,
    riskEngine: false,
    bobAI: false,
  });

  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [weather, setWeather] = useState<ApiWeatherResponse | null>(null);
  const [risk, setRisk] = useState<ApiRiskResponse | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ApiAIAnalysisResponse | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load live shipment data & sync sequence
  useEffect(() => {
    let isCancelled = false;
    setLoadingContext(true);
    setSyncSteps({
      tracking: false,
      weather: false,
      disruptions: false,
      coldChain: false,
      riskEngine: false,
      bobAI: false,
    });

    const loadAll = async () => {
      try {
        // Step 1: Tracking
        const t = await getShipmentTracking(shipmentId);
        if (isCancelled) return;
        setTracking(t);
        setSyncSteps((s) => ({ ...s, tracking: true }));

        // Step 2: Weather
        try {
          const w = await getShipmentWeather(shipmentId);
          if (!isCancelled) setWeather(w);
        } catch {}
        if (isCancelled) return;
        setSyncSteps((s) => ({ ...s, weather: true }));

        // Step 3: Disruptions & Cold Chain
        setSyncSteps((s) => ({ ...s, disruptions: true, coldChain: true }));

        // Step 4: Risk
        try {
          const r = await getShipmentRisk(shipmentId);
          if (!isCancelled) setRisk(r);
        } catch {}
        if (isCancelled) return;
        setSyncSteps((s) => ({ ...s, riskEngine: true }));

        // Step 5: AI Analysis
        try {
          const ai = await getShipmentAIAnalysis(shipmentId);
          if (!isCancelled) setAiAnalysis(ai);
        } catch {}
        if (isCancelled) return;
        setSyncSteps((s) => ({ ...s, bobAI: true }));

        // Settle into loaded state
        setTimeout(() => {
          if (!isCancelled) setLoadingContext(false);
        }, 300);
      } catch (err) {
        if (!isCancelled) setLoadingContext(false);
      }
    };

    loadAll();

    // Initial greeting for this shipment
    setMessages([
      {
        id: "msg-welcome",
        role: "assistant",
        content: `I've synchronized live telemetry, environmental conditions, and risk vectors for **${shipmentId}**. Ready to assist with operational analysis and rerouting decisions.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    return () => {
      isCancelled = true;
    };
  }, [shipmentId]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || isChatLoading) return;

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res: AIChatResponse = await chatWithBob(text, shipmentId, history);

      const assistantMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        riskLevel: res.risk_level,
        recommendedAction: res.recommended_action,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Bob AI is temporarily unavailable. Live shipment telemetry is still operating normally.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadTransitReceipt(shipmentId);
    } catch (e) {
      console.error("PDF download failed:", e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Compute Risk presentation
  const overallRisk = (risk?.overall_risk || "normal") as string;
  const riskBadgeMap: Record<string, { label: string; bg: string }> = {
    critical: { label: "🔴 Critical Risk", bg: "bg-red-500/20 text-red-400 border-red-500/40" },
    high: { label: "🟠 High Risk", bg: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
    moderate: { label: "🟡 Moderate Risk", bg: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
    medium: { label: "🟡 Moderate Risk", bg: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
    low: { label: "🟢 Low Risk", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
    normal: { label: "🟢 Normal State", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  };
  const riskBadgeConfig = riskBadgeMap[overallRisk] || riskBadgeMap.normal;

  return (
    <div className="w-[420px] h-full bg-[#0A0F1E]/95 border-l border-[#1E2D4A] shadow-2xl flex flex-col backdrop-blur-2xl z-30 transition-all">
      {/* ── Top Panel Header ────────────────────────────── */}
      <div className="p-4 border-b border-[#1E2D4A] flex items-center justify-between bg-[#162038]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white font-mono tracking-wider">{shipmentId}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${riskBadgeConfig.bg}`}>
                {riskBadgeConfig.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {tracking?.current_region || tracking?.current_leg || "Global Transit Corridor"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleFollowVessel}
            className={`p-1.5 rounded-lg border transition-colors ${
              followVessel
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                : "hover:bg-[#1E2D4A] border-transparent text-slate-400 hover:text-white"
            }`}
            title={followVessel ? "Unfollow vessel" : "Follow vessel camera"}
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <Link
            href={`/dashboard/shipments/${shipmentId}`}
            target="_blank"
            className="p-1.5 rounded-lg hover:bg-[#1E2D4A] text-slate-400 hover:text-white transition-colors"
            title="Open full shipment details page"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#1E2D4A] text-slate-400 hover:text-white transition-colors"
            title="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable Intelligence Body ────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E2D4A]/60">
        {/* Syncing checklist overlay if loading */}
        {loadingContext && (
          <div className="p-4 bg-[#0F1729]/80 border-b border-[#1E2D4A]">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                Syncing Vessel Telemetry...
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className={syncSteps.tracking ? "text-emerald-400" : "text-slate-600"}>✓</span>
                <span>Tracking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={syncSteps.weather ? "text-emerald-400" : "text-slate-600"}>✓</span>
                <span>Weather</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={syncSteps.disruptions ? "text-emerald-400" : "text-slate-600"}>✓</span>
                <span>Disruptions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={syncSteps.coldChain ? "text-emerald-400" : "text-slate-600"}>✓</span>
                <span>Cold Chain</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={syncSteps.riskEngine ? "text-emerald-400" : "text-slate-600"}>✓</span>
                <span>Risk Engine</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={syncSteps.bobAI ? "text-emerald-400" : "text-slate-600"}>✓</span>
                <span>BOB AI</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 1: Live Telemetry Inspection ─────── */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider font-mono text-[10px] text-slate-400">
              Live Transit Telemetry
            </span>
            <span className="font-mono text-[10px] text-cyan-400">
              Progress: {tracking?.progress_percent?.toFixed(1) ?? 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 rounded-full bg-[#162038] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, tracking?.progress_percent || 0)}%` }}
            />
          </div>

          {/* Grid of Key Metrics */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-2.5 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Speed</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold font-mono text-white">
                  {tracking?.current_speed_knots?.toFixed(1) ?? "--"}
                </span>
                <span className="text-xs text-slate-400">knots</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Standard: {tracking?.normal_speed_knots?.toFixed(1) ?? "--"} kn
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Distance Remaining</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold font-mono text-white">
                  {tracking?.distance_remaining_km ? Math.round(tracking.distance_remaining_km).toLocaleString() : "--"}
                </span>
                <span className="text-xs text-slate-400">km</span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Done: {tracking?.distance_travelled_km ? Math.round(tracking.distance_travelled_km).toLocaleString() : 0} km
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Projected ETA</span>
              <span suppressHydrationWarning className="text-xs font-semibold font-mono text-slate-200 mt-1 block">
                {tracking?.current_eta ? new Date(tracking.current_eta).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit" }) : "--"}
              </span>
              {tracking?.eta_delay_hours && tracking.eta_delay_hours > 0 ? (
                <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
                  +{Math.round(tracking.eta_delay_hours / 24)} days delay
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">On Schedule</span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Coordinates</span>
              <span className="text-xs font-mono text-slate-300 mt-1 block">
                {tracking?.current_position ? `${tracking.current_position.lat.toFixed(2)}°, ${tracking.current_position.lng.toFixed(2)}°` : "--"}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">WGS-84 Datum</span>
            </div>
          </div>
        </div>

        {/* ── Section 2: Real-time Weather at Coordinates ── */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-sky-400" />
              Environmental Conditions
            </span>
            <span className="text-[10px] font-mono text-slate-500">Live API</span>
          </div>

          {weather ? (
            <div className="p-3 rounded-lg bg-[#162038]/40 border border-[#1E2D4A] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {weather.condition?.toLowerCase().includes("rain") ? "🌧️" : weather.condition?.toLowerCase().includes("storm") ? "⛈️" : "☀️"}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-200 capitalize">{weather.condition}</span>
                    <span className="text-[10px] text-slate-400 block">{weather.temperature_c}°C Sea Ambient</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-cyan-400">{weather.wind_speed_kmh} km/h</span>
                  <span className="text-[10px] text-slate-500 block">Wind Velocity</span>
                </div>
              </div>

              {weather.severity !== "normal" && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center justify-between">
                  <span>Adverse Weather Speed Impact:</span>
                  <span className="font-bold font-mono">
                    {tracking?.weather_speed_modifier ? `${Math.round((1 - tracking.weather_speed_modifier) * 100)}% slowdown` : "-15% slowdown"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-[#162038]/30 border border-[#1E2D4A] text-xs text-slate-400 font-mono">
              Weather synchronization pending for coordinate vector.
            </div>
          )}
        </div>

        {/* ── Section 3: Cold-Chain Sensor Telemetry (if applicable) ── */}
        {risk?.cargo_sensitivity === "cold_chain" && (
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-slate-400 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
                Cold-Chain Telemetry
              </span>
              <span className="text-[10px] font-mono text-emerald-400">PHARMA SPEC</span>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Core Reefer Temp</span>
                <span className="text-base font-bold font-mono text-emerald-400">3.2°C</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Safe Envelope</span>
                <span className="text-xs font-mono text-slate-300">2.0°C — 8.0°C</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 4: Alternative Route Comparison ── */}
        {aiAnalysis?.alternative_routes && aiAnalysis.alternative_routes.length > 0 && (
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-amber-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                Recommended Route Bypass
              </span>
              <span className="text-[10px] font-mono text-slate-500">AI OPTIMIZED</span>
            </div>

            {aiAnalysis.alternative_routes.map((alt) => (
              <div
                key={alt.route_id}
                className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 space-y-2 hover:border-amber-400 transition-colors cursor-pointer"
                onClick={() => onSelectAlternativeRoute && onSelectAlternativeRoute(alt)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">{alt.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase">
                    Risk: {alt.risk_level}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">{alt.description}</p>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-amber-500/20">
                  <span>Dist: {alt.distance_km.toLocaleString()} km</span>
                  <span>Duration: {alt.estimated_duration_days} days</span>
                  <span className="text-amber-400 flex items-center gap-0.5">
                    View On Map <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Section 5: Transit Receipt Action ────────── */}
        <div className="p-4">
          <button
            onClick={handleDownloadReceipt}
            disabled={isDownloadingPdf}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#162038] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-xs text-slate-200 hover:text-white font-mono transition-all disabled:opacity-50"
          >
            {isDownloadingPdf ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                <span>Generating Transit Receipt...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Download Transit Receipt (PDF)</span>
              </>
            )}
          </button>
        </div>

        {/* ── Section 6: Contextual Bob AI Chat ───────── */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Bob AI Reasoning
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Data Grounded
            </span>
          </div>

          {/* Preset Question Chips */}
          <div className="flex flex-wrap gap-1.5">
            {[
              `Why is ${shipmentId} at risk?`,
              `Should I reroute this vessel?`,
              `What is the weather impact?`,
              `Explain ETA variance`,
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendMessage(chip)}
                disabled={isChatLoading}
                className="px-2 py-1 rounded bg-[#162038] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-[10px] text-slate-300 hover:text-cyan-300 font-mono transition-colors disabled:opacity-50 text-left"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Conversation Stream */}
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 ml-4"
                    : "bg-[#162038]/60 border border-[#1E2D4A] text-slate-200 mr-2"
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-[10px] font-mono text-slate-400">
                  <span className="font-bold">{m.role === "user" ? "OPERATOR" : "BOB AI"}</span>
                  <span>{m.timestamp}</span>
                </div>
                <div className="whitespace-pre-line">{m.content}</div>

                {m.recommendedAction && (
                  <div className="mt-2 pt-2 border-t border-[#1E2D4A] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Recommended Action:</span>
                    <span className="text-cyan-400 font-bold uppercase">{m.recommendedAction}</span>
                  </div>
                )}
              </div>
            ))}
            {isChatLoading && (
              <div className="p-2.5 rounded-lg bg-[#162038]/60 border border-[#1E2D4A] text-xs text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>Bob AI analyzing live context...</span>
              </div>
            )}
            <div ref={chatScrollRef} />
          </div>

          {/* Chat Input */}
          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={`Ask Bob about ${shipmentId}...`}
              className="flex-1 bg-[#162038]/80 border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isChatLoading || !chatInput.trim()}
              className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 disabled:hover:bg-cyan-500 transition-colors shadow-md"
              title="Send question"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
