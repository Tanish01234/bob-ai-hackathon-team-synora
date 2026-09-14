'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { STATS, DISRUPTIONS, AFFECTED_SHIPMENTS, SENSOR_DATA, COLD_CHAIN_CARGO, type Disruption, type Shipment, type SensorData } from '@/lib/bob-data';
import { BobMark, Globe, Icon } from './primitives';
import { DisruptionFeed } from './disruption-feed';
import { ShipmentDetail } from './shipment-detail';
import { ensureAuthSession, getAuthState, logoutUser, subscribeAuth, type AuthStatus } from '@/lib/auth-bootstrap';
import { getStats } from '@/lib/api/stats';
import { getDisruptions, matchDisruption } from '@/lib/api/disruptions';
import { getShipmentSensorCheck } from '@/lib/api/shipments';
import { getSimulationState } from '@/lib/api/tracking';
import { mapStats, mapDisruption, mapShipment, mapSensorCheck, type DashboardStats } from '@/lib/api/mappers';
import { getShipmentById } from '@/lib/api/shipments';
import { AlertCenter } from './alert-center';
import { BobAssistantPanel } from './bob-assistant-panel';
import { GuidedDemoProvider, useGuidedDemo } from './guided-demo';
import type { ApiSimulationState } from '@/lib/types/api';

function GuidedDemoButton() {
  const { startTour } = useGuidedDemo();
  return (
    <button
      type="button"
      onClick={() => startTour('full')}
      className="flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-[10px] text-cyan-300 font-medium transition-all hover:bg-cyan-500/20 hover:border-cyan-400/70 cursor-pointer shadow-[0_0_10px_rgba(0,212,255,0.15)]"
      title="Start Interactive Guided Demo Tour"
    >
      <span className="text-xs text-cyan-400">✦</span>
      <span className="hidden sm:inline">Guided Demo</span>
    </button>
  );
}

function Topbar({
  stats,
  onLogout,
  simulationState,
  onSelectShipment,
  userEmail,
}: {
  stats: typeof STATS;
  onLogout?: () => void;
  simulationState?: ApiSimulationState | null;
  onSelectShipment?: (shipmentId: string) => void;
  userEmail?: string | null;
}) {
  const isDemoUser = userEmail === (process.env.NEXT_PUBLIC_DEMO_EMAIL || 'judge@bob.ai');
  return <header className="z-50 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border bg-panel px-4 py-3 md:h-16 md:flex-nowrap md:px-6 md:py-0">
    <div className="flex shrink-0 items-center gap-2.5">
      <BobMark />
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline gap-2">
          <span className="text-[20px] font-bold leading-5 tracking-[-0.04em] text-white">BOB</span>
          <span className="text-[11px] font-medium leading-4 text-muted-foreground">Supply Chain Intelligence</span>
        </div>
        <span className="text-[9px] font-mono tracking-wider text-cyan-400/80">by Team Synora</span>
      </div>
    </div>
    <div className="ml-auto flex items-center gap-2">
      {/* Demo Mode Badge */}
      {isDemoUser && (
        <div
          className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-mono text-amber-300 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.15)]"
          title="Logged in as BOB Hackathon Judge Demo Account"
        >
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>JUDGE DEMO</span>
        </div>
      )}

      {/* Simulation status pill */}
      <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[10px] text-muted-foreground">
        <span className={cn('size-1.5 rounded-full', simulationState?.is_running ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
        <span>{simulationState?.is_running ? `Simulation ${simulationState.speed_multiplier}x` : 'Simulation Paused'}</span>
      </div>

      {/* Full Bob AI Console */}
      <Link
        href="/dashboard/assistant"
        className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] text-blue-400 transition-colors hover:bg-blue-500/20 cursor-pointer font-medium"
        title="Full Bob AI Intelligence Workspace"
      >
        <span className="text-xs">✦</span>
        <span className="hidden sm:inline">Bob AI Console</span>
      </Link>

      {/* Guided Demo Button */}
      <GuidedDemoButton />

      {/* Operations Center Link */}
      <Link
        href="/admin"
        data-tour="admin-link"
        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] text-primary transition-colors hover:bg-primary/20 cursor-pointer font-medium"
        title="Enterprise Operations Center"
      >
        <Icon name="network" className="size-3" />
        <span className="hidden sm:inline">Operations Center</span>
      </Link>

      {/* Alert Center */}
      <AlertCenter onSelectShipment={onSelectShipment} userEmail={userEmail || undefined} />

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:border-border/80 hover:bg-background/80 hover:text-white cursor-pointer"
        >
          Sign out
        </button>
      )}
    </div>
    <div data-tour="fleet-overview" aria-label="Network statistics" className="grid w-full grid-cols-[1fr_1fr_1.35fr] gap-2 md:flex md:w-auto md:gap-3">
      <div className="flex flex-col justify-center rounded-lg border border-border bg-[#1E2D4A]/50 px-2.5 py-1.5 md:min-w-[133px] md:px-4 md:py-1"><span className="font-mono text-[22px] font-semibold leading-6">{stats.total}</span><span className="text-[9px] leading-4 text-muted-foreground sm:text-[10px]">Total shipments</span></div>
      <div className="flex flex-col justify-center rounded-lg border border-warning/30 bg-warning/[0.08] px-2.5 py-1.5 shadow-[0_0_12px_rgba(245,158,11,0.1)] md:min-w-[139px] md:px-4 md:py-1"><span className="font-mono text-[22px] font-semibold leading-6 text-warning">{stats.affected}</span><span className="text-[9px] leading-4 text-warning/80 sm:text-[10px]">Disruption alerts</span></div>
      <div className="flex flex-col justify-center rounded-lg border border-destructive/30 bg-destructive/[0.08] px-2.5 py-1.5 shadow-[0_0_12px_rgba(239,68,68,0.1)] md:min-w-[227px] md:px-4 md:py-1"><div className="flex flex-wrap items-baseline gap-x-1.5 leading-6"><span className="text-[11px] font-semibold text-destructive sm:text-[13px]"><span className="font-mono text-[16px]">{stats.critical}</span> critical</span><span className="text-[9px] text-warning sm:text-[12px]">· <span className="font-mono">{stats.moderate}</span> moderate</span></div><span className="text-[9px] leading-4 text-destructive/80 sm:text-[10px]">Cold chain alerts</span></div>
    </div>
  </header>;
}

function EmptyWorkspace({
  disruption,
  stats,
  simulationState,
}: {
  disruption: Disruption | null;
  stats: DashboardStats;
  simulationState: ApiSimulationState | null;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Icon name="network" className="size-3.5 text-cyan-400" />
            Operations
            <Icon name="chevron" className="size-3 text-subtle" />
            <span className="text-foreground">Shipment intelligence</span>
          </div>
          <h1 className="mt-5 text-[20px] font-semibold tracking-tight">Your supply chain, in focus.</h1>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            Monitor disruptions. Protect your cargo. Make the next move.
          </p>
        </div>
        <span className="hidden items-center gap-1.5 self-end pb-1 text-[10px] text-muted-foreground lg:flex">
          <Icon name="shield" className="size-3.5 text-success" />
          Network overview
        </span>
      </div>

      <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center py-8 text-center">
        <div className="relative mb-6 flex size-32 shrink-0 items-center justify-center rounded-full border border-border/50">
          <span className="absolute inset-2.5 rounded-full border border-dashed border-border/70" />
          <span className="relative flex size-20 items-center justify-center rounded-full border border-border bg-panel">
            <Globe className="size-16 text-[#2A4070]" />
          </span>
          <span className="absolute right-1 top-4 flex size-6 items-center justify-center rounded-lg border border-primary/20 bg-panel">
            <Icon name="box" className="size-3 text-primary" />
          </span>
          <span className="absolute bottom-3 left-0 flex size-5 items-center justify-center rounded-md border border-border bg-panel">
            <Icon name="network" className="size-2.5 text-muted-foreground" />
          </span>
        </div>
        <span className="mb-2.5 rounded-md border border-border bg-panel px-2 py-0.5 text-[10px] text-muted-foreground">
          Shipment workspace
        </span>
        <h2 className="text-[17px] font-semibold tracking-tight">Select a shipment</h2>
        <p className="mt-2 max-w-[320px] text-[12px] leading-[1.7] text-muted-foreground">
          {disruption
            ? `Choose an affected shipment under ${disruption.location} to explore its route, risk, and cargo health.`
            : 'Click a disruption, then choose an affected shipment to view details.'}
        </p>
        <div className="mt-5 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full border font-mono text-[9px]',
                disruption ? 'border-success/30 bg-success/10 text-success' : 'border-primary/30 bg-primary/10 text-primary'
              )}
            >
              {disruption ? <Icon name="check" className="size-2.5" /> : '1'}
            </span>
            Select disruption
          </span>
          <Icon name="arrow" className="size-3 text-subtle" />
          <span className={cn('flex items-center gap-1.5', disruption && 'text-primary')}>
            <span
              className={cn(
                'flex size-4 items-center justify-center rounded-full border font-mono text-[9px]',
                disruption ? 'border-primary/30 bg-primary/10' : 'border-border'
              )}
            >
              2
            </span>
            Explore shipment
          </span>
        </div>
      </div>

      {/* Operations Center / Operational Intelligence Section */}
      <div className="mb-6 space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Operational Intelligence
            </span>
          </div>
          <Link
            href="/admin"
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium hover:underline flex items-center gap-1"
          >
            Operations Center <Icon name="chevron" className="size-2.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Card 1: Fleet Operations */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-[#131E35]/60 p-4 transition-all hover:border-primary/40 hover:bg-[#131E35]/90">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                    <Icon name="network" className="size-3.5" />
                  </span>
                  <h3 className="text-[13px] font-semibold text-white">Fleet Operations</h3>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                  {stats.total || 250} Total
                </span>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-slate-200">{stats.inTransit ?? 188}</span> in transit ·{' '}
                <span className="font-semibold text-amber-300">{stats.delayed ?? 36}</span> delayed
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Global fleet roster</span>
              <Link
                href="/admin?tab=shipments"
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                Open Operations →
              </Link>
            </div>
          </div>

          {/* Card 2: Disruption Intelligence */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-[#131E35]/60 p-4 transition-all hover:border-warning/40 hover:bg-[#131E35]/90">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg border border-warning/30 bg-warning/10 text-warning">
                    <Icon name="warning" className="size-3.5" />
                  </span>
                  <h3 className="text-[13px] font-semibold text-white">Disruption Intelligence</h3>
                </div>
                <span className="rounded-full bg-warning/10 px-2 py-0.5 font-mono text-[10px] font-bold text-warning">
                  {stats.affected || 12} Active
                </span>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                Risk visibility across affected shipments and alternative routing recommendations.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{stats.affected || 12} active events</span>
              <Link
                href="/admin?tab=disruptions"
                className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning hover:bg-warning/20 transition-colors"
              >
                View Disruptions →
              </Link>
            </div>
          </div>

          {/* Card 3: Simulation Engine */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-[#131E35]/60 p-4 transition-all hover:border-emerald-500/40 hover:bg-[#131E35]/90">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <Icon name="activity" className="size-3.5" />
                  </span>
                  <h3 className="text-[13px] font-semibold text-white">Simulation Engine</h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {simulationState?.is_running ? 'Running' : 'Active'}
                </span>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                Authoritative temporal clock running at{' '}
                <span className="font-semibold text-slate-200">{simulationState?.speed_multiplier || 1}×</span> speed multiplier.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Physics engine</span>
              <Link
                href="/admin?tab=simulation"
                className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                Open Simulation →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon name="shield" className="size-3 text-cyan-400" />
          BOB Supply Chain Intelligence · <span className="font-medium text-cyan-400/80">by Team Synora</span>
        </span>
        <span className="font-mono text-[9px] text-slate-500">v2.4-prod-judge</span>
      </div>
    </div>
  );
}

export function BobDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(STATS);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() => getAuthState().status);
  const hasAuthenticatedRef = useRef(getAuthState().status === 'AUTHENTICATED');
  const isLoggingOutRef = useRef(false);
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [affectedShipmentsMap, setAffectedShipmentsMap] = useState<Record<string, Shipment[]>>({});
  const [sensorDataMap, setSensorDataMap] = useState<Record<string, SensorData>>({});
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [expandedShipments, setExpandedShipments] = useState<Record<string, boolean>>({});
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingDisruptionId, setLoadingDisruptionId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'feed' | 'detail'>('feed');
  const [simulationState, setSimulationState] = useState<ApiSimulationState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeAuth((state) => {
      setAuthStatus(state.status);
      if (state.status === 'AUTHENTICATED') {
        hasAuthenticatedRef.current = true;
      }
      if (state.user?.email) {
        setUserEmail(state.user.email);
      } else {
        setUserEmail(null);
      }
      if (state.status === 'AUTH_UNAUTHENTICATED' && !isLoggingOutRef.current) {
        router.replace('/login');
      }
    });

    ensureAuthSession().then((authState) => {
      setAuthStatus(authState.status);
      if (authState.status !== 'AUTHENTICATED') {
        router.replace('/login');
        return;
      }
      hasAuthenticatedRef.current = true;
      setUserEmail(authState.user?.email || null);
      // Fetch authenticated backend data
      getStats().then((data) => setStats(mapStats(data))).catch(() => {});
      getDisruptions().then((data) => {
        if (data && data.length > 0) setDisruptions(data.map((d) => mapDisruption(d)));
        else setDisruptions(DISRUPTIONS);
      }).catch(() => setDisruptions(DISRUPTIONS));
      getSimulationState().then((data) => setSimulationState(data)).catch(() => {});
    });

    const simInterval = setInterval(() => {
      getSimulationState()
        .then((data) => setSimulationState(data))
        .catch(() => { });
    }, 15_000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      clearInterval(simInterval);
      unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    try {
      await logoutUser();
    } finally {
      router.replace('/login');
    }
  }

  async function selectDisruption(disruption: Disruption) {
    if (timer.current) clearTimeout(timer.current);
    if (selectedDisruption?.id === disruption.id) {
      setSelectedDisruption(null);
      setSelectedShipment(null);
      return;
    }
    setSelectedDisruption(disruption);
    setSelectedShipment(null);
    setLoadingAI(false);
    detailRef.current?.scrollTo({ top: 0 });

    if (!affectedShipmentsMap[disruption.id]) {
      setLoadingDisruptionId(disruption.id);
      try {
        const res = await matchDisruption(disruption.id);
        const mapped = res.affected_shipments.map((s) => mapShipment(s, disruption.severity));
        setAffectedShipmentsMap((prev) => ({ ...prev, [disruption.id]: mapped }));
        setDisruptions((prev) =>
          prev.map((d) => (d.id === disruption.id ? { ...d, affected: res.affected_count } : d))
        );
      } catch (err) {
        console.warn(`Failed to match disruption ${disruption.id}, using demo fallback:`, err);
        const fallback = AFFECTED_SHIPMENTS[disruption.id] || [];
        setAffectedShipmentsMap((prev) => ({ ...prev, [disruption.id]: fallback }));
      } finally {
        setLoadingDisruptionId(null);
      }
    }
  }

  async function selectShipment(shipment: Shipment) {
    if (timer.current) clearTimeout(timer.current);
    setSelectedShipment(shipment);
    setMobileView('detail');
    detailRef.current?.scrollTo({ top: 0 });

    const isColdChain = COLD_CHAIN_CARGO.includes(shipment.cargo);
    if (isColdChain && !sensorDataMap[shipment.id]) {
      setLoadingAI(true);
      try {
        const res = await getShipmentSensorCheck(shipment.id);
        const mapped = mapSensorCheck(res);
        setSensorDataMap((prev) => ({ ...prev, [shipment.id]: mapped }));
      } catch (err) {
        console.warn(`Failed to fetch sensor check for ${shipment.id}, using demo fallback:`, err);
        const fallback = SENSOR_DATA[shipment.id];
        if (fallback) {
          setSensorDataMap((prev) => ({ ...prev, [shipment.id]: fallback }));
        }
      } finally {
        setLoadingAI(false);
      }
    } else {
      setLoadingAI(false);
    }
  }

  async function handleSelectShipmentById(shipmentId: string) {
    // 1. Check if shipment is already in affectedShipmentsMap
    for (const [dId, sList] of Object.entries(affectedShipmentsMap)) {
      const found = sList.find((s) => s.id === shipmentId);
      if (found) {
        const d = disruptions.find((x) => x.id === dId) || DISRUPTIONS[0];
        setSelectedDisruption(d);
        selectShipment(found);
        return;
      }
    }

    // 2. Fetch shipment directly
    try {
      const sRaw = await getShipmentById(shipmentId);
      if (sRaw) {
        const mapped = mapShipment(sRaw, 'high');
        const d = disruptions[0] || DISRUPTIONS[0];
        setSelectedDisruption(d);
        selectShipment(mapped);
      }
    } catch (err) {
      console.warn('Could not select shipment by ID:', err);
    }
  }

  // Handle ?shipment= query parameter on mount or navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shipParam = params.get('shipment');
      if (shipParam) {
        handleSelectShipmentById(shipParam);
      }
    }
  }, [disruptions]);

  // Only display full-screen connecting state during initial cold boot before first authentication
  if (!hasAuthenticatedRef.current && authStatus === 'AUTH_INITIALIZING') {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-3">
        <BobMark className="text-[#00D4FF] mb-2 animate-pulse" />
        <div className="size-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        <span className="tracking-widest uppercase text-[11px] text-cyan-400/90 font-semibold">
          Connecting to BOB Intelligence...
        </span>
        <span className="text-[9px] text-slate-500">Autonomous Supply Chain Risk Intelligence</span>
      </div>
    );
  }

  if (authStatus === 'AUTH_UNAUTHENTICATED' || authStatus === 'AUTH_ERROR') {
    return (
      <div className="min-h-screen bg-[#070B14] flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-2">
        <BobMark className="text-[#00D4FF] mb-2" />
        <span className="tracking-widest uppercase text-[11px] text-slate-400">
          Redirecting to Login...
        </span>
      </div>
    );
  }

  const tourStats = {
    total: stats.total,
    inTransit: stats.inTransit ?? 188,
    delayed: stats.delayed ?? 36,
    delivered: stats.delivered ?? 26,
    disruptions: stats.affected || disruptions.length || 12,
  };

  return (
    <GuidedDemoProvider stats={tourStats}>
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background relative">
        <a href="#shipment-workspace" className="sr-only z-[60] rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4" onClick={() => setMobileView('detail')}>Skip to shipment workspace</a>
        <Topbar stats={stats} onLogout={handleLogout} simulationState={simulationState} onSelectShipment={handleSelectShipmentById} userEmail={userEmail} />
        <nav aria-label="Dashboard panels" className="grid shrink-0 grid-cols-2 border-b border-border bg-panel md:hidden"><button type="button" aria-pressed={mobileView === 'feed'} onClick={() => setMobileView('feed')} className={cn('flex items-center justify-center gap-2 border-b-2 px-4 py-3 text-[12px]', mobileView === 'feed' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}><Icon name="activity" className="size-3.5" />Disruptions</button><button type="button" aria-pressed={mobileView === 'detail'} onClick={() => setMobileView('detail')} className={cn('flex items-center justify-center gap-2 border-b-2 px-4 py-3 text-[12px]', mobileView === 'detail' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground')}><Icon name="box" className="size-3.5" />Shipment details</button></nav>
        <div className="flex min-h-0 flex-1">
          <aside aria-label="Disruption feed" className={cn('w-full shrink-0 flex-col overflow-hidden border-r border-border bg-panel md:flex md:w-80', mobileView === 'feed' ? 'flex' : 'hidden')}>
            <DisruptionFeed
              selectedDisruption={selectedDisruption}
              selectedShipment={selectedShipment}
              expandedShipments={expandedShipments}
              onSelectDisruption={selectDisruption}
              onSelectShipment={selectShipment}
              onToggleShipment={key => setExpandedShipments(previous => ({ ...previous, [key]: !previous[key] }))}
              disruptions={disruptions}
              affectedShipmentsMap={affectedShipmentsMap}
              loadingDisruptionId={loadingDisruptionId}
            />
          </aside>
          <main id="shipment-workspace" ref={detailRef} tabIndex={-1} aria-label="Shipment workspace" className={cn('min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 outline-none md:block md:p-6 xl:px-8', mobileView === 'detail' ? 'block' : 'hidden')}>
            {selectedShipment && selectedDisruption ? (
              <ShipmentDetail
                key={`${selectedDisruption.id}-${selectedShipment.id}`}
                shipment={selectedShipment}
                disruption={selectedDisruption}
                loading={loadingAI}
                sensor={sensorDataMap[selectedShipment.id]}
              />
            ) : (
              <EmptyWorkspace disruption={selectedDisruption} stats={stats} simulationState={simulationState} />
            )}
          </main>
        </div>

        {/* Floating Persistent Bob AI Drawer */}
        <BobAssistantPanel initialShipmentId={selectedShipment?.id} />
      </div>
    </GuidedDemoProvider>
  );
}
