'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CARGO_LABELS, COLD_CHAIN_CARGO, SENSOR_DATA, type Disruption, type Shipment, type SensorData } from '@/lib/bob-data';
import { ActionChip, Icon, SeverityBadge, StatusBadge } from './primitives';
import { AnalysisSkeleton, TemperatureMonitor } from './temperature-monitor';
import { getShipmentTracking } from '@/lib/api/tracking';
import { getShipmentWeather } from '@/lib/api/weather';
import { getShipmentRisk } from '@/lib/api/risk';
import { getShipmentAIAnalysis } from '@/lib/api/ai';
import { downloadTransitReceipt } from '@/lib/api/receipts';
import { TrackingMap } from './tracking-map';
import type { ApiTrackingResponse, ApiWeatherResponse, ApiRiskResponse, ApiAIAnalysisResponse } from '@/lib/types/api';

function ShipmentRoute({ shipment, tracking }: { shipment: Shipment; tracking?: ApiTrackingResponse | null }) {
  return <div className="border-t border-border pt-4">
    <div className="mb-5 flex items-center justify-between text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><Icon name="network" className="size-3.5" />Route</span><span><span className="font-mono">{shipment.waypoints.length}</span> waypoints</span></div>
    <ol className="flex items-start px-0 sm:px-3" aria-label="Shipment route">
      {shipment.waypoints.map((waypoint, index) => {
        const current = index === shipment.currentLeg;
        const completed = index < shipment.currentLeg;
        return <Fragment key={`${index}-${waypoint}`}>
          {index > 0 && <li aria-hidden="true" className={cn('mt-2 h-0 min-w-2 flex-1 border-t', index <= shipment.currentLeg ? 'border-primary/40' : 'border-dashed border-[#2A4070]')} />}
          <li aria-current={current ? 'step' : undefined} className="flex w-[54px] shrink-0 flex-col items-center gap-2.5 sm:w-[70px] lg:w-[76px]">
            <span className="relative flex size-4 items-center justify-center">
              {current && <span className="absolute inset-0 rounded-full border border-primary/50 bg-primary/10 motion-safe:animate-ping" />}
              <span className={cn('relative rounded-full', current ? 'size-2.5 bg-primary shadow-[0_0_8px_rgba(0,212,255,0.6)]' : completed ? 'size-2 bg-primary shadow-[0_0_8px_rgba(0,212,255,0.35)]' : 'size-2.5 border-2 border-muted-foreground bg-panel')} />
            </span>
            <span className={cn('text-center text-[10px] leading-4', current ? 'font-medium text-primary' : 'text-muted-foreground')}>{waypoint}<span className="sr-only"> — {current ? 'Current waypoint' : completed ? 'Completed' : 'Upcoming'}</span></span>
            {current && <span className="-mt-1 text-[9px] text-muted-foreground">Current location</span>}
          </li>
        </Fragment>;
      })}
    </ol>
  </div>;
}

function TrackingSection({ tracking, loading }: { tracking: ApiTrackingResponse | null; loading: boolean }) {
  if (loading) {
    return <section className="rounded-[14px] border border-border bg-panel p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold"><Icon name="activity" className="text-primary" />Live Tracking</h2>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-card" />)}
      </div>
    </section>;
  }

  if (!tracking) return null;

  const items = [
    { label: 'Current Speed', value: `${tracking.current_speed_knots} kn`, icon: 'activity', color: tracking.current_speed_knots < tracking.normal_speed_knots * 0.8 ? 'text-warning' : 'text-foreground' },
    { label: 'Normal Speed', value: `${tracking.normal_speed_knots} kn`, icon: 'ship' },
    { label: 'Distance Travelled', value: `${tracking.distance_travelled_km.toLocaleString()} km`, icon: 'network' },
    { label: 'Distance Remaining', value: `${tracking.distance_remaining_km.toLocaleString()} km`, icon: 'network' },
    { label: 'Progress', value: `${tracking.progress_percent.toFixed(1)}%`, icon: 'activity', color: 'text-primary' },
    { label: 'Current Region', value: tracking.current_region || tracking.current_leg, icon: 'pin' },
    { label: 'Original ETA', value: formatDate(tracking.original_eta), icon: 'calendar' },
    { label: 'Current ETA', value: formatDate(tracking.current_eta), icon: 'calendar', color: tracking.eta_delay_hours && tracking.eta_delay_hours > 12 ? 'text-warning' : 'text-foreground' },
  ];

  return <section data-tour="tracking-map" className="rounded-[14px] border border-border bg-panel p-4 sm:p-5">
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold"><Icon name="activity" className="text-primary" />Live Tracking</h2>
      <div className="flex items-center gap-2">
        {tracking.eta_delay_hours != null && tracking.eta_delay_hours > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-warning"><Icon name="clock" className="size-3" />+{Math.round(tracking.eta_delay_hours / 24 * 10) / 10} days delay</span>
        )}
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-background/40 px-2 py-0.5 text-[9px] text-muted-foreground"><span className="size-1.5 rounded-full bg-primary animate-pulse" />Live</span>
      </div>
    </div>
    {/* Progress bar */}
    <div className="mt-4 mb-4">
      <div className="h-2 w-full rounded-full bg-card border border-border overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700" style={{ width: `${Math.min(100, tracking.progress_percent)}%` }} />
      </div>
    </div>
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {items.map(item => (
        <div key={item.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
          <dt className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Icon name={item.icon as any} className="size-3.5" />{item.label}</dt>
          <dd className={cn('font-mono text-[13px] font-medium', item.color)}>{item.value}</dd>
        </div>
      ))}
    </dl>
    <div className="mt-4">
      <TrackingMap tracking={tracking} segments={tracking.route_segments} />
    </div>
    <p className="mt-3 flex items-center gap-1.5 text-[9px] text-muted-foreground"><Icon name="clock" className="size-3" />Sim: {new Date(tracking.simulation_time).toLocaleString()}<span className="ml-auto">Vessel position: Simulated</span></p>
  </section>;
}

function WeatherSection({ weather, loading }: { weather: ApiWeatherResponse | null; loading: boolean }) {
  if (loading) {
    return <section data-tour="route-weather" className="rounded-[14px] border border-border bg-panel p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold"><Icon name="activity" className="text-primary" />Route Weather</h2>
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-card" />)}
      </div>
    </section>;
  }

  if (!weather) return null;

  const severityColors: Record<string, string> = {
    normal: 'text-success', moderate: 'text-warning', high: 'text-destructive', critical: 'text-destructive',
  };

  return <section data-tour="route-weather" className="rounded-[14px] border border-border bg-panel p-4 sm:p-5">
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold"><Icon name="activity" className="text-primary" />Route Weather</h2>
      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-medium',
        weather.severity === 'normal' ? 'border-success/30 bg-success/10 text-success' :
        weather.severity === 'moderate' ? 'border-warning/30 bg-warning/10 text-warning' :
        'border-destructive/30 bg-destructive/10 text-destructive'
      )}>{weather.severity.toUpperCase()}</span>
    </div>
    <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <dt className="mb-1.5 text-[10px] text-muted-foreground">Condition</dt>
        <dd className="text-[13px] font-medium capitalize">{weather.condition.replace(/_/g, ' ')}</dd>
      </div>
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <dt className="mb-1.5 text-[10px] text-muted-foreground">Wind</dt>
        <dd className={cn('font-mono text-[13px]', severityColors[weather.severity])}>{weather.wind_speed_kmh} km/h</dd>
      </div>
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <dt className="mb-1.5 text-[10px] text-muted-foreground">Gust</dt>
        <dd className="font-mono text-[13px]">{weather.wind_gust_kmh ?? '—'} km/h</dd>
      </div>
      <div className="rounded-lg border border-border bg-card px-3 py-2.5">
        <dt className="mb-1.5 text-[10px] text-muted-foreground">Temp</dt>
        <dd className="font-mono text-[13px]">{weather.temperature_c}°C</dd>
      </div>
    </dl>
    <p className="mt-3 text-[9px] text-muted-foreground">Weather: External API (OpenWeatherMap) · Updated {new Date(weather.timestamp).toLocaleTimeString()}</p>
  </section>;
}

function AIReasoningSection({
  shipmentId,
  risk,
  loading,
}: {
  shipmentId: string;
  risk: ApiRiskResponse | null;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<ApiAIAnalysisResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const triggerAnalysis = useCallback(async () => {
    setAiLoading(true);
    setExpanded(true);
    setAiError(null);
    try {
      const result = await getShipmentAIAnalysis(shipmentId);
      if (result && result.analysis) {
        setAiResult(result);
      } else {
        setAiError(result?.ai_error || "Bob couldn't complete the analysis right now.");
      }
    } catch (err: any) {
      console.warn('AI analysis failed:', err);
      setAiError(err?.message || "Bob couldn't complete the analysis right now.");
    } finally {
      setAiLoading(false);
    }
  }, [shipmentId]);

  const riskColor = risk?.overall_risk === 'critical' || risk?.overall_risk === 'high' ? 'text-destructive' :
    risk?.overall_risk === 'medium' ? 'text-warning' : 'text-success';

  return <section data-tour="bob-intelligence" className="rounded-[14px] border border-border bg-panel p-4 sm:p-5">
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold"><Icon name="sparkle" className="text-primary" />Bob Intelligence</h2>
      {risk && <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase',
        risk.overall_risk === 'high' || risk.overall_risk === 'critical' ? 'border-destructive/30 bg-destructive/10 text-destructive' :
        risk.overall_risk === 'medium' ? 'border-warning/30 bg-warning/10 text-warning' :
        'border-success/30 bg-success/10 text-success'
      )}>{risk.overall_risk} risk</span>}
    </div>

    {/* Risk signals */}
    {risk && risk.signals && <div className="mt-3 flex flex-wrap gap-2">
      {Object.entries(risk.signals).map(([key, val]) => (
        <span key={key} className={cn('rounded-md border px-2 py-0.5 text-[10px]',
          val === 'normal' ? 'border-border text-muted-foreground' :
          val === 'moderate' || val === 'medium' || val === 'low' ? 'border-warning/30 text-warning' :
          'border-destructive/30 text-destructive'
        )}>{key}: {val}</span>
      ))}
    </div>}

    {/* Risk reasons */}
    {risk && risk.reasons && risk.reasons.length > 0 && <ul className="mt-3 space-y-1">
      {risk.reasons.map((r, i) => <li key={i} className="flex items-start gap-2 text-[12px] text-muted-foreground">
        <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', riskColor.replace('text-', 'bg-'))} />{r}
      </li>)}
    </ul>}

    {/* AI Reasoning trigger */}
    {!expanded ? (
      <button
        type="button"
        data-tour="ai-analysis-btn"
        onClick={triggerAnalysis}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/10 cursor-pointer"
      >
        <Icon name="sparkle" className="size-4" />✦ Analyze with AI
      </button>
    ) : aiLoading ? (
      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-[12px] text-primary mb-3"><span className="size-2 rounded-full bg-primary animate-pulse" />Bob is analyzing this shipment...</div>
        <div className="space-y-2">
          {['Current location checked', 'Weather checked', 'Disruptions checked', 'ETA evaluated', 'Alternatives evaluated'].map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="size-3.5 rounded-full border border-border flex items-center justify-center">
                {i < 3 ? <Icon name="check" className="size-2 text-success" /> : <span className="size-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />}
              </span>
              {step}
            </div>
          ))}
        </div>
      </div>
    ) : aiError ? (
      <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-[12px] text-destructive mb-1 font-medium">Bob couldn&apos;t complete the analysis right now.</p>
        {risk && <p className="text-[11px] text-muted-foreground mb-3">Current rule-based risk: <span className="font-semibold uppercase text-foreground">{risk.overall_risk}</span></p>}
        <button
          type="button"
          onClick={triggerAnalysis}
          className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20 cursor-pointer"
        >
          Retry Analysis
        </button>
      </div>
    ) : aiResult && aiResult.analysis ? (
      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-primary">Bob Recommendation</div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase',
              aiResult.analysis.risk_level === 'high' || aiResult.analysis.risk_level === 'critical' ? 'bg-destructive/20 text-destructive' :
              aiResult.analysis.risk_level === 'medium' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
            )}>{aiResult.analysis.risk_level || 'UNKNOWN'}</span>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary uppercase">
              {(aiResult.analysis.recommended_action || 'monitor').replace(/_/g, ' ')}
            </span>
            {aiResult.analysis.estimated_delay_days != null && (
              <span className="flex items-center gap-1 text-[11px] text-warning"><Icon name="clock" className="size-3" />+{aiResult.analysis.estimated_delay_days} days</span>
            )}
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{aiResult.analysis.justification}</p>
          {aiResult.analysis.summary && <p className="mt-2 text-[12px] text-foreground/80">{aiResult.analysis.summary}</p>}
        </div>

        {/* Alternative routes */}
        {aiResult.alternative_routes && aiResult.alternative_routes.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-[12px] font-medium mb-2">Alternative Routes</h3>
            <div className="space-y-2">
              {aiResult.alternative_routes.map(route => (
                <div key={route.route_id} className={cn('flex items-center justify-between rounded-md border p-2.5 text-[11px]',
                  route.route_id === 'CURRENT' ? 'border-destructive/20 bg-destructive/5' : 'border-border'
                )}>
                  <div>
                    <div className="font-medium">{route.name}</div>
                    <div className="text-muted-foreground">{route.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{route.distance_km?.toLocaleString()} km</div>
                    <div className="text-muted-foreground">{route.estimated_duration_days} days</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground">AI: {aiResult.analysis.ai_provider === 'gemini' ? 'Gemini' : aiResult.analysis.ai_provider === 'groq' ? 'Groq' : 'Fallback'} · Simulated recommendation</p>
      </div>
    ) : null}
  </section>;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.split('T')[0] || dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

export function ShipmentDetail({
  shipment,
  disruption,
  loading,
  sensor: propSensor,
}: {
  shipment: Shipment;
  disruption: Disruption;
  loading: boolean;
  sensor?: SensorData | null;
}) {
  const sensor = propSensor !== undefined ? propSensor : SENSOR_DATA[shipment.id];
  const coldChain = COLD_CHAIN_CARGO.includes(shipment.cargo);

  const [tracking, setTracking] = useState<ApiTrackingResponse | null>(null);
  const [weather, setWeather] = useState<ApiWeatherResponse | null>(null);
  const [risk, setRisk] = useState<ApiRiskResponse | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(true);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fetch tracking
    setTrackingLoading(true);
    getShipmentTracking(shipment.id)
      .then(data => { if (!cancelled) setTracking(data); })
      .catch(err => console.warn('Tracking failed:', err))
      .finally(() => { if (!cancelled) setTrackingLoading(false); });

    // Fetch weather
    setWeatherLoading(true);
    getShipmentWeather(shipment.id)
      .then(data => { if (!cancelled) setWeather(data); })
      .catch(err => console.warn('Weather failed:', err))
      .finally(() => { if (!cancelled) setWeatherLoading(false); });

    // Fetch risk
    getShipmentRisk(shipment.id)
      .then(data => { if (!cancelled) setRisk(data); })
      .catch(err => console.warn('Risk failed:', err));

    // Auto-refresh tracking every 10 seconds
    const interval = setInterval(() => {
      getShipmentTracking(shipment.id)
        .then(data => { if (!cancelled) setTracking(data); })
        .catch(() => {});
    }, 10_000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [shipment.id]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadTransitReceipt(shipment.id);
    } catch (err: any) {
      alert(`Failed to download transit receipt: ${err?.message || 'Server error'}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleAskBob = (prompt?: string) => {
    window.dispatchEvent(
      new CustomEvent('bob:open-chat', {
        detail: { shipmentId: shipment.id, prompt },
      })
    );
  };

  const currentEta = tracking ? formatDate(tracking.current_eta) : (shipment as any).eta || '—';

  return <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
      <div className="flex flex-wrap items-center gap-1.5"><Icon name="box" className="size-3.5" /><span>Shipments</span><Icon name="chevron" className="size-3 text-subtle" /><span>{disruption.location}</span><Icon name="chevron" className="size-3 text-subtle" /><span className="font-mono text-foreground">{shipment.id}</span></div>
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 sm:flex"><span className="size-1.5 rounded-full bg-primary" />Shipment intelligence</span>
        <span className="rounded-full border border-border bg-background/40 px-2 py-0.5 text-[9px]">Demo Simulation Active</span>
      </div>
    </div>

    {/* Shipment header */}
    <section data-tour="shipment-summary" className="flex flex-col gap-5 rounded-[14px] border border-border bg-panel p-4 sm:p-5" aria-labelledby="shipment-title">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/15 bg-primary/5">
              <Icon name="box" className="size-[18px] text-primary" />
            </span>
            <h1 id="shipment-title" className="font-mono text-[20px] font-semibold tracking-tight text-primary sm:text-[22px]">
              {shipment.id}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAskBob()}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
              title="Ask Bob AI about this shipment"
            >
              <Icon name="sparkle" className="size-3" />
              <span>Ask Bob</span>
            </button>
            <button
              data-tour="transit-receipt-btn"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-panel transition-colors cursor-pointer disabled:opacity-50"
              title="Download Audit-Grade Transit Receipt PDF"
            >
              <Icon name="arrow" className="size-3 rotate-90" />
              <span>{isDownloadingPdf ? 'Generating...' : 'Transit Receipt'}</span>
            </button>
            <StatusBadge status={shipment.status} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[18px] font-semibold tracking-[-0.025em]"><span>{shipment.origin}</span><Icon name="arrow" className="size-5 text-primary" /><span>{shipment.destination}</span></div>
      </div>
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card px-3 py-2.5"><dt className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Icon name="ship" className="size-3.5" />Carrier</dt><dd className="text-[13px] font-medium">{shipment.carrier}</dd></div>
        <div className="rounded-lg border border-border bg-card px-3 py-2.5"><dt className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Icon name="box" className="size-3.5" />Cargo</dt><dd className="text-[13px] font-medium">{CARGO_LABELS[shipment.cargo]}</dd></div>
        <div className="rounded-lg border border-border bg-card px-3 py-2.5"><dt className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Icon name="calendar" className="size-3.5" />Current ETA</dt><dd className="font-mono text-[13px]">{currentEta}</dd></div>
        <div className="rounded-lg border border-border bg-card px-3 py-2.5"><dt className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Icon name="dollar" className="size-3.5" />Cargo value</dt><dd className="font-mono text-[13px] text-success">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(shipment.value)}</dd></div>
      </dl>
      <ShipmentRoute shipment={shipment} tracking={tracking} />
    </section>

    {/* Live Tracking */}
    <TrackingSection tracking={tracking} loading={trackingLoading} />

    {/* Weather */}
    <WeatherSection weather={weather} loading={weatherLoading} />

    {/* Cold Chain */}
    {coldChain && (sensor ? (
      <div data-tour="temperature-monitor">
        <TemperatureMonitor key={shipment.id} data={sensor} loading={loading} />
      </div>
    ) : (
      <section data-tour="temperature-monitor" className="rounded-[14px] border border-border bg-panel p-5">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold"><Icon name="thermometer" className="text-primary" />Temperature monitor</h2>
        <div className="mt-4 flex items-start gap-3 rounded-[10px] border border-warning/20 bg-warning/5 p-4">
          <Icon name="warning" className="mt-0.5 text-warning" />
          <div>
            <h3 className="text-[13px] font-medium text-warning">Sensor data unavailable</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">No temperature readings are included for this shipment in the demo dataset. Cold chain integrity cannot be assessed.</p>
          </div>
        </div>
      </section>
    ))}

    {/* Bob Intelligence / AI Reasoning */}
    <AIReasoningSection shipmentId={shipment.id} risk={risk} loading={loading} />

    {/* Interactive Ask Bob Query Bar */}
    <div className="rounded-[14px] border border-primary/25 bg-primary/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
          <Icon name="sparkle" className="size-3.5" />
          Ask Bob about {shipment.id}
        </span>
        <span className="text-[10px] text-muted-foreground">Dual Gemini/Groq • Grounded Telemetry</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {['Why is it delayed?', 'Should I reroute?', 'What is the alternative route?', 'Is cold-chain safe?'].map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleAskBob(p)}
            className="rounded-full border border-primary/30 bg-background/80 px-3 py-1 text-[11px] text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
          >
            {p} →
          </button>
        ))}
      </div>
    </div>

    {/* Data source disclosure */}
    <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-[9px] text-muted-foreground">
      <div className="flex flex-wrap gap-3">
        <span>Vessel position: Simulated</span>
        <span>Cold-chain telemetry: Simulated</span>
        <span>Weather: External API</span>
        <span>AI: Gemini/Groq</span>
      </div>
      <span>Operational decisions require independent review.</span>
    </div>
  </div>;
}
