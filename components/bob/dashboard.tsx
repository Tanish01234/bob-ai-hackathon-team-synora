'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { STATS, DISRUPTIONS, AFFECTED_SHIPMENTS, SENSOR_DATA, COLD_CHAIN_CARGO, type Disruption, type Shipment, type SensorData } from '@/lib/bob-data';
import { BobMark, Globe, Icon } from './primitives';
import { DisruptionFeed } from './disruption-feed';
import { ShipmentDetail } from './shipment-detail';
import { createClient } from '@/lib/supabase/client';
import { getStats } from '@/lib/api/stats';
import { getDisruptions, matchDisruption } from '@/lib/api/disruptions';
import { getShipmentSensorCheck } from '@/lib/api/shipments';
import { getSimulationState } from '@/lib/api/tracking';
import { mapStats, mapDisruption, mapShipment, mapSensorCheck } from '@/lib/api/mappers';
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
}: {
  stats: typeof STATS;
  onLogout?: () => void;
  simulationState?: ApiSimulationState | null;
  onSelectShipment?: (shipmentId: string) => void;
}) {
  return <header className="z-50 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-border bg-panel px-4 py-3 md:h-16 md:flex-nowrap md:px-6 md:py-0">
    <div className="flex shrink-0 items-center gap-2.5"><BobMark /><div className="flex items-baseline gap-3 md:flex-col md:gap-0"><span className="text-[21px] font-bold leading-6 tracking-[-0.04em]">Bob</span><span className="text-[11px] leading-4 text-muted-foreground">Supply Chain Intelligence</span></div></div>
    <div className="ml-auto flex items-center gap-2">
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

      {/* Admin Link */}
      <Link
        href="/admin"
        data-tour="admin-link"
        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] text-primary transition-colors hover:bg-primary/20 cursor-pointer font-medium"
      >
        <Icon name="activity" className="size-3" />
        <span className="hidden sm:inline">Admin</span>
      </Link>

      {/* Alert Center */}
      <AlertCenter onSelectShipment={onSelectShipment} />

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

function EmptyWorkspace({ disruption }: { disruption: Disruption | null }) {
  return <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
      <div><div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon name="network" className="size-3.5" />Operations<Icon name="chevron" className="size-3 text-subtle" /><span className="text-foreground">Shipment intelligence</span></div><h1 className="mt-5 text-[20px] font-semibold tracking-tight">Your supply chain, in focus.</h1><p className="mt-1.5 text-[12px] text-muted-foreground">Monitor disruptions. Protect your cargo. Make the next move.</p></div>
      <span className="hidden items-center gap-1.5 self-end pb-1 text-[10px] text-muted-foreground lg:flex"><Icon name="shield" className="size-3.5 text-success" />Network overview</span>
    </div>
    <div className="flex min-h-[450px] flex-1 flex-col items-center justify-center py-10 text-center">
      <div className="relative mb-7 flex size-36 shrink-0 items-center justify-center rounded-full border border-border/50"><span className="absolute inset-3 rounded-full border border-dashed border-border/70" /><span className="relative flex size-24 items-center justify-center rounded-full border border-border bg-panel"><Globe className="size-20 text-[#2A4070]" /></span><span className="absolute right-2 top-5 flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-panel"><Icon name="box" className="size-3.5 text-primary" /></span><span className="absolute bottom-4 left-0 flex size-6 items-center justify-center rounded-md border border-border bg-panel"><Icon name="network" className="size-3 text-muted-foreground" /></span></div>
      <span className="mb-3 rounded-md border border-border bg-panel px-2 py-0.5 text-[10px] text-muted-foreground">Shipment workspace</span>
      <h2 className="text-[18px] font-semibold tracking-tight">Select a shipment</h2>
      <p className="mt-2.5 max-w-[280px] text-[13px] leading-[1.8] text-muted-foreground">{disruption ? `Choose an affected shipment under ${disruption.location} to explore its route, risk, and cargo health.` : 'Click a disruption, then choose an affected shipment to view details.'}</p>
      <div className="mt-6 flex items-center gap-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className={cn('flex size-4 items-center justify-center rounded-full border font-mono text-[9px]', disruption ? 'border-success/30 bg-success/10 text-success' : 'border-primary/30 bg-primary/10 text-primary')}>{disruption ? <Icon name="check" className="size-2.5" /> : '1'}</span>Select disruption</span><Icon name="arrow" className="size-3 text-subtle" /><span className={cn('flex items-center gap-1.5', disruption && 'text-primary')}><span className={cn('flex size-4 items-center justify-center rounded-full border font-mono text-[9px]', disruption ? 'border-primary/30 bg-primary/10' : 'border-border')}>2</span>Explore shipment</span></div>
    </div>
    <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="flex items-start gap-3 rounded-[10px] border border-border bg-panel p-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card"><Icon name="network" className="text-primary" /></span><div><h3 className="text-[12px] font-medium">Disruption visibility</h3><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">See the events impacting your shipments.</p></div></div>
      <div className="flex items-start gap-3 rounded-[10px] border border-border bg-panel p-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card"><Icon name="thermometer" className="text-success" /></span><div><h3 className="text-[12px] font-medium">Cold chain monitoring</h3><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Catch excursions before cargo is compromised.</p></div></div>
      <div className="flex items-start gap-3 rounded-[10px] border border-border bg-panel p-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card"><Icon name="sparkle" className="text-warning" /></span><div><h3 className="text-[12px] font-medium">Intelligent response</h3><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Turn shipment risks into clear next steps.</p></div></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3 text-[10px] text-muted-foreground"><span className="flex items-center gap-1.5"><Icon name="shield" className="size-3" />Built for a more resilient supply chain</span><span></span></div>
  </div>;
}

export function BobDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(STATS);
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
    getStats()
      .then((data) => setStats(mapStats(data)))
      .catch((err) => {
        console.warn('Backend stats not available, using demo fallback:', err?.message || err);
      });

    getDisruptions()
      .then((data) => {
        if (data && data.length > 0) {
          setDisruptions(data.map((d) => mapDisruption(d)));
        } else {
          setDisruptions(DISRUPTIONS);
        }
      })
      .catch((err) => {
        console.warn('Backend disruptions not available, using demo fallback:', err?.message || err);
        setDisruptions(DISRUPTIONS);
      });

    // Fetch simulation state
    getSimulationState()
      .then((data) => setSimulationState(data))
      .catch(() => { });

    const simInterval = setInterval(() => {
      getSimulationState()
        .then((data) => setSimulationState(data))
        .catch(() => { });
    }, 15_000);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      clearInterval(simInterval);
    };
  }, []);

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.push('/login');
      router.refresh();
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

  const tourStats = {
    total: stats.total,
    inTransit: Math.max(0, stats.total - stats.affected - 12),
    delayed: stats.affected,
    delivered: 12,
    disruptions: disruptions.length || 12,
  };

  return (
    <GuidedDemoProvider stats={tourStats}>
      <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background relative">
        <a href="#shipment-workspace" className="sr-only z-[60] rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4" onClick={() => setMobileView('detail')}>Skip to shipment workspace</a>
        <Topbar stats={stats} onLogout={handleLogout} simulationState={simulationState} onSelectShipment={handleSelectShipmentById} />
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
              <EmptyWorkspace disruption={selectedDisruption} />
            )}
          </main>
        </div>

        {/* Floating Persistent Bob AI Drawer */}
        <BobAssistantPanel initialShipmentId={selectedShipment?.id} />
      </div>
    </GuidedDemoProvider>
  );
}
