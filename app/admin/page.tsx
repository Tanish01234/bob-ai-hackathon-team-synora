'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  getAdminOverview,
  getSimulation,
  pauseSimulation,
  resumeSimulation,
  setSimulationSpeed,
  resetSimulation,
  triggerWeatherEvent,
  triggerColdChainEvent,
  triggerPortStrike,
  getAdminShipments,
  getAdminDisruptions,
  toggleDisruption,
  getAdminAIActivity,
  getAdminShipment,
} from '@/lib/api/admin';
import type { ApiSimulationState } from '@/lib/types/api';
import {
  Search,
  Filter,
  RefreshCw,
  Anchor,
  Clock,
  ShieldAlert,
  Thermometer,
  Sparkles,
  ChevronRight,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

type Tab = 'overview' | 'shipments' | 'disruptions' | 'simulation' | 'demo' | 'ai_activity';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [sim, setSim] = useState<ApiSimulationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Shipments tab state
  const [shipmentsList, setShipmentsList] = useState<any[]>([]);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cargoFilter, setCargoFilter] = useState('all');
  const [selectedShipmentDetail, setSelectedShipmentDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Disruptions tab state
  const [disruptionsList, setDisruptionsList] = useState<any[]>([]);

  // AI Activity tab state
  const [aiActivityList, setAiActivityList] = useState<any[]>([]);

  // Synchronize tab state with URL query parameter (?tab=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const initialTab = params.get('tab') as Tab | null;
      if (initialTab && ['overview', 'shipments', 'disruptions', 'simulation', 'demo', 'ai_activity'].includes(initialTab)) {
        setTab(initialTab);
      }
    }
  }, []);

  const handleSelectTab = (selectedTab: Tab) => {
    setTab(selectedTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', selectedTab);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3500);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, simState] = await Promise.all([getAdminOverview(), getSimulation()]);
      setOverview(ov);
      setSim(simState);
    } catch (err) {
      console.warn('Admin data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Load shipments when switching to shipments tab
  useEffect(() => {
    if (tab === 'shipments') {
      getAdminShipments()
        .then(setShipmentsList)
        .catch((e) => console.error('Failed to load admin shipments:', e));
    } else if (tab === 'disruptions') {
      getAdminDisruptions()
        .then(setDisruptionsList)
        .catch((e) => console.error('Failed to load admin disruptions:', e));
    } else if (tab === 'ai_activity') {
      getAdminAIActivity(30)
        .then(setAiActivityList)
        .catch((e) => console.error('Failed to load AI activity:', e));
    }
  }, [tab]);

  const handlePause = async () => {
    const s = await pauseSimulation();
    setSim(s);
    flash('Simulation paused');
  };

  const handleResume = async () => {
    const s = await resumeSimulation();
    setSim(s);
    flash('Simulation resumed');
  };

  const handleSpeed = async (speed: number) => {
    const s = await setSimulationSpeed(speed);
    setSim(s);
    flash(`Speed set to ${speed}×`);
  };

  const handleReset = async () => {
    await resetSimulation();
    await refresh();
    flash('Simulation reset to departure baseline');
  };

  const handleWeather = async () => {
    const result = await triggerWeatherEvent();
    flash(`Severe weather simulated on shipment ${result.shipment_id}`);
    refresh();
  };

  const handleColdChain = async () => {
    const result = await triggerColdChainEvent();
    flash(`Cold-chain excursion simulated on shipment ${result.shipment_id}`);
    refresh();
  };

  const handlePortStrike = async () => {
    const result = await triggerPortStrike('Port of Singapore');
    flash(`Port strike disruption triggered at ${result.port || 'Port of Singapore'}`);
    refresh();
  };

  const handleToggleDisruption = async (id: string, currentActive: boolean) => {
    try {
      const res = await toggleDisruption(id, !currentActive);
      setDisruptionsList((prev) =>
        prev.map((d) => (d.id === id || d.disruption_id === id ? { ...d, active: !currentActive } : d))
      );
      flash(`Disruption ${!currentActive ? 'activated' : 'deactivated'}`);
      refresh();
    } catch (e: any) {
      flash(`Toggle failed: ${e?.message || 'Server error'}`);
    }
  };

  const handleOpenShipmentModal = async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await getAdminShipment(id);
      setSelectedShipmentDetail(data);
    } catch (e: any) {
      flash(`Could not load shipment: ${e?.message || 'Error'}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'shipments', label: 'Shipments' },
    { id: 'disruptions', label: 'Disruptions' },
    { id: 'simulation', label: 'Simulation' },
    { id: 'demo', label: 'Demo Events' },
    { id: 'ai_activity', label: 'AI Activity' },
  ];

  // Filtered shipments
  const filteredShipments = shipmentsList.filter((s) => {
    const matchesSearch =
      !shipmentSearch ||
      s.shipment_id.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
      s.origin?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
      s.destination?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
      s.carrier?.toLowerCase().includes(shipmentSearch.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesCargo =
      cargoFilter === 'all'
        ? true
        : cargoFilter === 'cold_chain'
        ? ['vaccine', 'frozen_goods', 'perishable'].includes(s.cargo_type)
        : s.cargo_type === cargoFilter;

    return matchesSearch && matchesStatus && matchesCargo;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 font-bold">
              ✦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-white">Operations Center</h1>
                <span className="text-[9px] font-mono text-cyan-400/80">by Team Synora</span>
              </div>
              <p className="text-[10px] text-slate-400">Enterprise Fleet Intelligence, Disruption Control & Simulation Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/assistant"
              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              ✦ Bob AI Console
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-300 hover:text-white transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Operations Center Tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTab(t.id)}
                className={cn(
                  'px-3.5 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap',
                  tab === t.id
                    ? 'border-cyan-500 text-cyan-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Action Notification Message */}
      {actionMsg && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-3 animate-in fade-in duration-150">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-2 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {loading && !overview ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
            ))}
          </div>
        ) : (
          <>
            {/* 1. Overview Tab */}
            {tab === 'overview' && overview && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Total Fleet Shipments" value={overview.total_shipments} />
                  <StatCard label="Active In-Transit" value={overview.in_transit} color="text-blue-400" />
                  <StatCard label="Delayed Shipments" value={overview.delayed} color="text-amber-400" />
                  <StatCard label="Delivered" value={overview.delivered} color="text-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard
                    label="Active Disruptions"
                    value={overview.active_disruptions ?? overview.disruptions}
                    color="text-red-400"
                  />
                  <StatCard
                    label="Shipments Affected"
                    value={overview.affected_shipments ?? 0}
                    color="text-orange-400"
                  />
                  <StatCard
                    label="Simulation Engine"
                    value={sim?.is_running ? 'Running' : 'Paused'}
                    color={sim?.is_running ? 'text-emerald-400' : 'text-amber-400'}
                  />
                  <StatCard label="Engine Speed" value={`${sim?.speed_multiplier || 1}×`} />
                </div>

                {sim && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Active Simulation Epoch
                      </h3>
                      <p className="font-mono text-lg font-bold text-white">
                        {new Date(sim.current_time).toLocaleString()}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        Elapsed simulation hours: {(sim as any).elapsed_hours ?? 0} hrs
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={sim.is_running ? handlePause : handleResume}
                        className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                          sim.is_running
                            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                        }`}
                      >
                        {sim.is_running ? '⏸ Pause Simulation' : '▶ Resume Simulation'}
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-3.5 py-2 rounded-xl text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                      >
                        ↻ Reset Epoch
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Shipments Tab */}
            {tab === 'shipments' && (
              <div className="space-y-4">
                {/* Search & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={shipmentSearch}
                      onChange={(e) => setShipmentSearch(e.target.value)}
                      placeholder="Search ID, carrier, origin, destination..."
                      className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none"
                    >
                      <option value="all">Status: All</option>
                      <option value="in_transit">In Transit</option>
                      <option value="delayed">Delayed</option>
                      <option value="delivered">Delivered</option>
                    </select>

                    <select
                      value={cargoFilter}
                      onChange={(e) => setCargoFilter(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none"
                    >
                      <option value="all">Cargo: All</option>
                      <option value="cold_chain">Cold Chain Only</option>
                      <option value="standard">Standard</option>
                      <option value="electronics">Electronics</option>
                      <option value="vaccine">Vaccine</option>
                      <option value="frozen_goods">Frozen Goods</option>
                      <option value="perishable">Perishable</option>
                    </select>
                  </div>
                </div>

                {/* Shipments Table */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3.5">Shipment ID</th>
                          <th className="p-3.5">Route</th>
                          <th className="p-3.5">Carrier</th>
                          <th className="p-3.5">Cargo Type</th>
                          <th className="p-3.5">Declared Value</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {filteredShipments.slice(0, 50).map((s) => (
                          <tr key={s.shipment_id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5 font-mono font-semibold text-white">{s.shipment_id}</td>
                            <td className="p-3.5">
                              {s.origin} → {s.destination}
                            </td>
                            <td className="p-3.5">{s.carrier}</td>
                            <td className="p-3.5 capitalize">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  ['vaccine', 'frozen_goods', 'perishable'].includes(s.cargo_type)
                                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {s.cargo_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-emerald-400">
                              ${s.value_usd ? s.value_usd.toLocaleString() : '—'}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  s.status === 'delayed'
                                    ? 'bg-red-500/20 text-red-400'
                                    : s.status === 'delivered'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}
                              >
                                {s.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleOpenShipmentModal(s.shipment_id)}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition-colors"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
                    <span>Showing {Math.min(50, filteredShipments.length)} of {filteredShipments.length} matching shipments</span>
                    <span>Total fleet size: {shipmentsList.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Disruptions Tab */}
            {tab === 'disruptions' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Active Disruption Registry
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Toggle disruptions on or off. State affects real-time routing, ETA calculations, and alert counts.
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-800/60 text-xs">
                    {disruptionsList.map((d) => {
                      const isActive = d.active !== false;
                      const id = d.id || d.disruption_id;

                      return (
                        <div key={id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">{d.location}</span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  d.severity === 'critical'
                                    ? 'bg-red-500/20 text-red-400'
                                    : d.severity === 'high'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                {d.severity}
                              </span>
                              <span className="text-[10px] text-slate-400 uppercase font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                                {d.type.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-slate-400 text-xs">{d.description}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[11px] font-medium ${
                                isActive ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              {isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                            <button
                              onClick={() => handleToggleDisruption(id, isActive)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                isActive
                                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                              }`}
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Simulation Tab */}
            {tab === 'simulation' && sim && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
                  <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Clock Controls</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={sim.is_running ? handlePause : handleResume}
                      className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        sim.is_running
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                      }`}
                    >
                      {sim.is_running ? '⏸ Pause Simulation' : '▶ Resume Simulation'}
                    </button>
                    <button
                      onClick={handleReset}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs text-slate-300 hover:text-white transition-colors"
                    >
                      ↻ Reset Epoch
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
                  <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Speed Multiplier Acceleration
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {[1, 5, 10, 50, 100].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeed(speed)}
                        className={`rounded-xl px-4 py-2.5 text-xs font-mono font-medium transition-colors ${
                          sim.speed_multiplier === speed
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {speed}×
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
                  <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Engine Status & Telemetry
                  </h2>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <dt className="text-slate-400">Simulation Status</dt>
                      <dd className={`font-semibold mt-1 ${sim.is_running ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {sim.is_running ? 'Running' : 'Paused'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Speed Multiplier</dt>
                      <dd className="font-mono font-semibold text-white mt-1">{sim.speed_multiplier}×</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Elapsed Hours</dt>
                      <dd className="font-mono font-semibold text-white mt-1">{(sim as any).elapsed_hours ?? 0} hrs</dd>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="text-slate-400">Current Simulation Timestamp</dt>
                      <dd className="font-mono text-sm font-semibold text-blue-400 mt-1">
                        {new Date(sim.current_time).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* 5. Demo Events Tab */}
            {tab === 'demo' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
                  <div>
                    <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Interactive Simulation Injectors
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Inject live disruption and sensor breaches to demonstrate Bob&apos;s dual-tier AI reasoning and
                      instant recalculation.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <DemoButton
                      title="⛈ Severe Weather Alert"
                      description="Simulates violent storm on an active shipment. Knots drop by 35% and dynamic ETA extends."
                      color="warning"
                      onClick={handleWeather}
                    />
                    <DemoButton
                      title="🌡 Cold-Chain Excursion"
                      description="Injects a critical +8.5°C breach on a vaccine shipment, triggering WHO/FDA compliance warnings."
                      color="destructive"
                      onClick={handleColdChain}
                    />
                    <DemoButton
                      title="⚓ Port Strike (Singapore)"
                      description="Triggers dockworkers strike at Port of Singapore, intersecting East-West maritime legs."
                      color="primary"
                      onClick={handlePortStrike}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6. AI Activity Tab */}
            {tab === 'ai_activity' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                        AI Reasoning Audit Log
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Live audit log of Gemini Flash and Groq assessments generated across the network.
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/60 text-xs">
                    {aiActivityList.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">No recent AI assessments logged yet.</div>
                    ) : (
                      aiActivityList.map((item, idx) => (
                        <div key={idx} className="p-4 space-y-2 hover:bg-slate-800/30 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-400">{item.shipment_id}</span>
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  item.risk_level === 'critical'
                                    ? 'bg-red-500/20 text-red-400'
                                    : item.risk_level === 'high'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {item.risk_level}
                              </span>
                              <span className="text-[9px] uppercase font-semibold bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                Action: {item.recommended_action?.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                              <span>Model: {item.model || 'gemini'}</span>
                              <span>•</span>
                              <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">{item.explanation}</p>
                          {item.state_hash && (
                            <span className="text-[9px] font-mono text-slate-500 block">
                              Audit State Hash: {item.state_hash}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Shipment Detail Modal Slideover */}
      {selectedShipmentDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white font-mono">
                  {selectedShipmentDetail.shipment?.shipment_id}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                  {selectedShipmentDetail.shipment?.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedShipmentDetail(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 uppercase text-[10px]">Route</span>
                <p className="text-white font-semibold">
                  {selectedShipmentDetail.shipment?.origin} → {selectedShipmentDetail.shipment?.destination}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Carrier</span>
                  <p className="text-white">{selectedShipmentDetail.shipment?.carrier}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Cargo</span>
                  <p className="text-white capitalize">{selectedShipmentDetail.shipment?.cargo_type}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Value</span>
                  <p className="text-emerald-400 font-mono">
                    ${selectedShipmentDetail.shipment?.value_usd?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px]">Cruising Speed</span>
                  <p className="text-white font-mono">{selectedShipmentDetail.shipment?.cruising_speed_knots} kts</p>
                </div>
              </div>

              {selectedShipmentDetail.tracking && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-slate-300 font-semibold uppercase text-[10px]">Active Tracking</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span>Progress:</span>{' '}
                      <span className="text-white font-mono">
                        {selectedShipmentDetail.tracking.progress_percent}%
                      </span>
                    </div>
                    <div>
                      <span>Current Speed:</span>{' '}
                      <span className="text-white font-mono">
                        {selectedShipmentDetail.tracking.current_speed_knots} kts
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span>Coordinates:</span>{' '}
                      <span className="text-white font-mono text-[10px]">
                        {selectedShipmentDetail.tracking.current_position?.lat?.toFixed(3)}°,{' '}
                        {selectedShipmentDetail.tracking.current_position?.lng?.toFixed(3)}°
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <dt className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-medium">{label}</dt>
      <dd className={cn('text-xl font-bold font-mono text-white', color)}>{value}</dd>
    </div>
  );
}

function DemoButton({
  title,
  description,
  color,
  onClick,
}: {
  title: string;
  description: string;
  color: 'warning' | 'destructive' | 'primary';
  onClick: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all duration-150 cursor-pointer',
        color === 'warning'
          ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
          : color === 'destructive'
          ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/10'
          : 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
        loading && 'opacity-60 cursor-wait'
      )}
    >
      <span className="text-xs font-semibold text-white">{loading ? '⏳ Simulating...' : title}</span>
      <span className="text-[11px] text-slate-400 leading-relaxed">{description}</span>
    </button>
  );
}
