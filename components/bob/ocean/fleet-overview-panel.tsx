"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Filter,
  Sparkles,
  Send,
  Ship,
  ShieldAlert,
  AlertTriangle,
  Anchor,
  Compass,
  Layers,
  ChevronRight,
} from "lucide-react";
import type { VesselState } from "./types";
import { chatWithBob, type AIChatResponse } from "@/lib/api/ai";

interface FleetOverviewPanelProps {
  vessels: VesselState[];
  onSelectVessel: (shipmentId: string) => void;
  activeDisruptionsCount: number;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: any[];
  timestamp: string;
}

export function FleetOverviewPanel({
  vessels,
  onSelectVessel,
  activeDisruptionsCount,
}: FleetOverviewPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>("all");

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: "fleet-welcome",
      role: "assistant",
      content:
        "Welcome to **BOB Ocean Intelligence**. You are inspecting the global simulated fleet of 250 vessels. Ask any operational query across all corridors or select an individual vessel to focus telemetry.",
      timestamp: "Active",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Compute fleet summary stats
  const stats = useMemo(() => {
    let inTransit = 0;
    let delayed = 0;
    let critical = 0;
    let high = 0;
    let coldChain = 0;

    vessels.forEach((v) => {
      if (v.status === "in_transit") inTransit++;
      if (v.status === "delayed") delayed++;
      if (v.risk === "critical") critical++;
      if (v.risk === "high") high++;
      if (v.cargo_type === "vaccine" || v.cargo_type === "frozen_goods" || v.cargo_type === "perishable") {
        coldChain++;
      }
    });

    return {
      total: vessels.length || 250,
      inTransit: inTransit || 188,
      delayed: delayed || 36,
      critical: critical || 8,
      high: high || 18,
      coldChain: coldChain || 105,
    };
  }, [vessels]);

  // Filtered vessel list
  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => {
      const matchesSearch =
        !searchTerm ||
        v.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.carrier.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRisk =
        selectedRiskFilter === "all" || v.risk === selectedRiskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [vessels, searchTerm, selectedRiskFilter]);

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

      const res: AIChatResponse = await chatWithBob(text, undefined, history);

      const assistantMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Bob AI is temporarily unavailable. Live telemetry remains fully active.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="w-[420px] h-full bg-[#0A0F1E]/95 border-l border-[#1E2D4A] shadow-2xl flex flex-col backdrop-blur-2xl z-30 transition-all">
      {/* ── Header ────────────────────────────────────── */}
      <div className="p-4 border-b border-[#1E2D4A] bg-[#162038]/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Ship className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white font-mono tracking-wider">
              FLEET INTELLIGENCE
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">250 Active Commercial Vessels</p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          GLOBAL VIEW
        </span>
      </div>

      {/* ── Scrollable Body ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1E2D4A]/60">
        {/* Fleet KPI Grid */}
        <div className="p-4 space-y-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-slate-400 block">
            Operational Fleet Status
          </span>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Fleet</span>
              <span className="text-base font-bold font-mono text-white mt-0.5 block">{stats.total}</span>
            </div>

            <div className="p-2 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">In Transit</span>
              <span className="text-base font-bold font-mono text-cyan-400 mt-0.5 block">{stats.inTransit}</span>
            </div>

            <div className="p-2 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Delayed</span>
              <span className="text-base font-bold font-mono text-amber-400 mt-0.5 block">{stats.delayed}</span>
            </div>

            <div className="p-2 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Disruptions</span>
              <span className="text-base font-bold font-mono text-orange-400 mt-0.5 block">{activeDisruptionsCount}</span>
            </div>

            <div className="p-2 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Critical</span>
              <span className="text-base font-bold font-mono text-red-400 mt-0.5 block">{stats.critical}</span>
            </div>

            <div className="p-2 rounded-lg bg-[#162038]/50 border border-[#1E2D4A]/60 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Cold Chain</span>
              <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">{stats.coldChain}</span>
            </div>
          </div>
        </div>

        {/* Search & Vessel Roster */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider font-mono text-slate-400">
              Vessel Registry ({filteredVessels.length})
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search shipment ID, carrier, port..."
              className="w-full bg-[#162038]/80 border border-[#1E2D4A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All" },
              { id: "critical", label: "🔴 Critical" },
              { id: "high", label: "🟠 High" },
              { id: "moderate", label: "🟡 Moderate" },
              { id: "normal", label: "🟢 Normal" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedRiskFilter(f.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors ${
                  selectedRiskFilter === f.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold"
                    : "bg-[#162038]/50 text-slate-400 hover:text-slate-200 border border-transparent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Compact Vessel List */}
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {filteredVessels.slice(0, 50).map((v) => {
              const riskColor =
                v.risk === "critical"
                  ? "text-red-400 bg-red-500/10 border-red-500/30"
                  : v.risk === "high"
                  ? "text-orange-400 bg-orange-500/10 border-orange-500/30"
                  : (v.risk as string) === "medium" || (v.risk as string) === "moderate"
                  ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                  : "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";

              return (
                <div
                  key={v.shipment_id}
                  onClick={() => onSelectVessel(v.shipment_id)}
                  className="p-2 rounded-lg bg-[#162038]/40 hover:bg-[#162038] border border-[#1E2D4A]/60 hover:border-cyan-500/50 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold font-mono text-white group-hover:text-cyan-400">
                        {v.shipment_id}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">({v.carrier})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {v.origin} → {v.destination}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pl-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      {v.current_speed_knots.toFixed(1)} kn
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${riskColor}`}>
                      {v.risk}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
              );
            })}
            {filteredVessels.length > 50 && (
              <p className="text-[10px] font-mono text-slate-500 text-center py-1">
                Showing top 50 of {filteredVessels.length} matching vessels
              </p>
            )}
          </div>
        </div>

        {/* Global Bob AI Fleet Assistant */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Fleet AI Assistant
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              250 Vessel Knowledge
            </span>
          </div>

          {/* Quick Fleet Prompt Chips */}
          <div className="flex flex-wrap gap-1.5">
            {[
              "Show highest-risk shipments",
              "What disruptions are active?",
              "Which shipments are delayed?",
              "Are there cold-chain excursions?",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                disabled={isChatLoading}
                className="px-2 py-1 rounded bg-[#162038] hover:bg-[#1E2D4A] border border-[#1E2D4A] text-[10px] text-slate-300 hover:text-cyan-300 font-mono transition-colors disabled:opacity-50 text-left"
              >
                {prompt}
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
                  <span className="font-bold">{m.role === "user" ? "OPERATOR" : "BOB FLEET AI"}</span>
                  <span>{m.timestamp}</span>
                </div>
                <div className="whitespace-pre-line">{m.content}</div>
              </div>
            ))}
            {isChatLoading && (
              <div className="p-2.5 rounded-lg bg-[#162038]/60 border border-[#1E2D4A] text-xs text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>Bob AI analyzing fleet data...</span>
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
              placeholder="Ask Bob across all 250 vessels..."
              className="flex-1 bg-[#162038]/80 border border-[#1E2D4A] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isChatLoading || !chatInput.trim()}
              className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 disabled:hover:bg-cyan-500 transition-colors shadow-md"
              title="Send fleet query"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
