'use client';

import { useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import type { Reading, SensorData } from '@/lib/bob-data';
import { Chip, Icon } from './primitives';

function safeRange(data: SensorData) {
  return data.safeMin === null ? `≤ ${data.safeMax}°C` : `${data.safeMin}°C – ${data.safeMax}°C`;
}

function TemperatureTooltip({ active, payload }: { active?: boolean; payload?: readonly { payload: Reading }[] }) {
  const reading = payload?.[0]?.payload;
  if (!active || !reading) return null;
  return <div className="min-w-40 rounded-lg border border-border bg-card px-3.5 py-3 shadow-sm">
    <p className="mb-2 font-mono text-[11px] text-muted-foreground">{reading.time} UTC</p>
    <div className="flex items-center justify-between gap-5 text-[12px]"><span>Temperature</span><span className={cn('font-mono font-medium', reading.inRange ? 'text-primary' : 'text-destructive')}>{reading.temp.toFixed(1)}°C</span></div>
    <p className="mt-2 text-[10px] text-muted-foreground">{reading.leg}</p>
    <p className={cn('mt-1 text-[10px]', reading.inRange ? 'text-success' : 'text-destructive')}>{reading.inRange ? 'Within safe range' : 'Outside safe range'}</p>
  </div>;
}

export function AnalysisSkeleton() {
  return <div role="status" aria-label="Analyzing shipment data" className="flex min-h-44 flex-col gap-3 rounded-[10px] border border-border bg-panel p-5">
    <div className="mb-1 flex items-center gap-2 text-[12px] text-muted-foreground"><Icon name="sparkle" className="text-primary" />Analyzing shipment data<span className="sr-only">. Simulated analysis in progress.</span></div>
    {[100, 85, 60].map(width => <div key={width} className={cn('h-3.5 rounded bg-[linear-gradient(90deg,#162038_25%,#1E2D4A_50%,#162038_75%)] bg-size-[200%_100%] motion-safe:animate-shimmer', width === 100 ? 'w-full' : width === 85 ? 'w-[85%]' : 'w-3/5')} />)}
  </div>;
}

function ExcursionAssessment({ data }: { data: SensorData }) {
  const critical = data.excursionStatus === 'critical';
  const outOfRange = data.readings.filter(reading => !reading.inRange);
  const peak = Math.max(...data.readings.map(reading => reading.temp));
  if (data.excursionStatus === 'normal') return <div className="flex gap-3 rounded-[10px] border border-success/20 border-l-[3px] border-l-success bg-success/5 px-5 py-4">
    <Icon name="shield" className="mt-0.5 size-5 text-success" /><div><h3 className="text-[14px] font-medium text-success">All clear — No temperature excursions detected</h3><p className="mt-1.5 text-[12px] text-muted-foreground">All readings within safe range throughout transit.</p></div>
  </div>;
  return <section aria-label="Excursion assessment" className={cn('rounded-[10px] border border-l-[3px] px-5 py-4', critical ? 'border-destructive/20 border-l-destructive bg-destructive/5 shadow-[0_0_16px_rgba(239,68,68,0.08)]' : 'border-warning/20 border-l-warning bg-warning/5 shadow-[0_0_16px_rgba(245,158,11,0.08)]')}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className={cn('flex items-center gap-2 text-[14px] font-semibold', critical ? 'text-destructive' : 'text-warning')}><Icon name="warning" />{critical ? 'Critical' : 'Moderate'} excursion detected</h3>
      <Chip tone={critical ? 'red' : 'amber'}><Icon name="clock" className="size-3" /><span className="font-mono">{outOfRange.length}</span> hrs out of range</Chip>
    </div>
    <p className="mt-3 text-[13px] leading-[1.75] text-foreground">{data.aiSummary}</p>
    <div className={cn('mt-3 border-t pt-3', critical ? 'border-destructive/15' : 'border-warning/15')}>
      <h4 className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon name="shield" className="size-3" />Regulatory assessment</h4>
      <p className="mt-1.5 text-[12px] italic leading-[1.75] text-muted-foreground">{data.regulatoryNote}</p>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]"><p className={critical ? 'text-destructive' : 'text-warning'}>Max breach: <span className="font-mono">{peak.toFixed(1)}°C</span></p><p className="flex items-center gap-1.5 text-muted-foreground">via {data.aiProvider} AI <Icon name="sparkle" className="size-3 text-subtle" /><span className="text-subtle">·</span>Simulated</p></div>
  </section>;
}

export function TemperatureMonitor({ data, loading }: { data: SensorData; loading: boolean }) {
  const [showReadings, setShowReadings] = useState(false);
  const critical = data.excursionStatus === 'critical';
  const normal = data.excursionStatus === 'normal';
  const temps = data.readings.map(reading => reading.temp);
  const current = data.readings.at(-1)!;
  const peak = Math.max(...temps);
  const lower = Math.floor(Math.min(...temps, data.safeMin ?? Math.min(...temps)) - 2);
  const upper = Math.ceil(Math.max(...temps, data.safeMax) + 2);
  const excursions: { start: string; end: string }[] = [];
  data.readings.forEach((reading, index) => {
    if (reading.inRange) return;
    if (index === 0 || data.readings[index - 1].inRange) excursions.push({ start: reading.time, end: reading.time });
    else excursions[excursions.length - 1].end = reading.time;
  });
  return <section className="flex flex-col gap-4 rounded-[14px] border border-border bg-panel p-4 sm:p-5" aria-labelledby="temperature-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="temperature-title" className="flex items-center gap-2 text-[16px] font-semibold"><Icon name="thermometer" className="size-[18px] text-primary" />Temperature monitor</h2><p className="mt-1.5 text-[11px] text-muted-foreground">Cold chain integrity, across every leg.</p></div>
      <Chip tone={normal ? 'green' : critical ? 'red' : 'amber'} dot className="px-2.5 py-1 text-[11px]">{normal ? 'All clear' : critical ? 'Critical excursion' : 'Moderate excursion'}</Chip>
    </div>
    <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-background/50 py-3.5">
      <div className="flex flex-col gap-1.5 px-3 sm:px-4"><span className="text-[10px] text-muted-foreground">Latest reading</span><span className="font-mono text-[17px] font-medium text-primary sm:text-[21px]">{current.temp.toFixed(1)}<span className="ml-1 text-[12px] font-normal">°C</span></span><span className="font-mono text-[9px] text-muted-foreground">{current.time} UTC</span></div>
      <div className="flex flex-col gap-1.5 px-3 sm:px-4"><span className="text-[10px] text-muted-foreground">Safe range</span><span className="font-mono text-[17px] font-medium text-success sm:text-[21px]">{data.safeMin === null ? '≤ ' : `${data.safeMin}–`}{data.safeMax}<span className="ml-1 text-[12px] font-normal">°C</span></span><span className="text-[9px] text-muted-foreground">Cargo threshold</span></div>
      <div className="flex flex-col gap-1.5 px-3 sm:px-4"><span className="text-[10px] text-muted-foreground">Peak temperature</span><span className={cn('font-mono text-[17px] font-medium sm:text-[21px]', normal ? 'text-foreground' : critical ? 'text-destructive' : 'text-warning')}>{peak.toFixed(1)}<span className="ml-1 text-[12px] font-normal">°C</span></span><span className="text-[9px] text-muted-foreground">This transit window</span></div>
    </div>
    <div className="min-w-0 rounded-[10px] border border-border bg-background px-1 pb-3 pt-3 sm:px-3">
      <div className="mb-3 flex items-center justify-between px-3 text-[10px] text-muted-foreground"><span>Temperature over time</span><span><span className="font-mono">{data.readings.length}</span> readings · Hourly</span></div>
      <div className="h-[260px] min-w-0" role="group" aria-label={`Temperature chart. Safe range ${safeRange(data)}. Peak ${peak.toFixed(1)} degrees. ${data.readings.filter(reading => !reading.inRange).length} hourly readings outside safe range. Full data available under View sensor readings.`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={data.readings} margin={{ top: 12, right: 16, bottom: 8, left: 0 }} accessibilityLayer>
            <CartesianGrid strokeDasharray="3 4" stroke="#1E2D4A" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#7A8FAD', fontSize: 11, fontFamily: 'var(--font-jetbrains)' }} axisLine={{ stroke: '#1E2D4A' }} tickLine={false} tickMargin={12} minTickGap={20} />
            <YAxis tick={{ fill: '#7A8FAD', fontSize: 11, fontFamily: 'var(--font-jetbrains)' }} axisLine={false} tickLine={false} unit="°C" domain={[lower, upper]} width={51} tickCount={5} />
            <ReferenceArea y1={data.safeMin ?? lower} y2={data.safeMax} fill="#10B981" fillOpacity={0.07} strokeOpacity={0} />
            <ReferenceLine y={data.safeMax} stroke="#10B981" strokeOpacity={0.65} strokeDasharray="4 4" />
            {data.safeMin !== null && <ReferenceLine y={data.safeMin} stroke="#10B981" strokeOpacity={0.65} strokeDasharray="4 4" />}
            {excursions.map(excursion => <ReferenceArea key={excursion.start} x1={excursion.start} x2={excursion.end} fill="#EF4444" fillOpacity={0.11} strokeOpacity={0} />)}
            <Tooltip content={<TemperatureTooltip />} cursor={{ stroke: '#7A8FAD', strokeDasharray: '3 3', strokeOpacity: 0.5 }} />
            <Line type="monotone" dataKey="temp" name="Temperature" stroke="#00D4FF" strokeWidth={2} isAnimationActive={false} dot={({ cx, cy, payload }: { cx?: number; cy?: number; payload: Reading }) => <circle key={payload.time} cx={cx} cy={cy} r={payload.inRange ? 0 : 4} fill="#EF4444" stroke="#EF4444" strokeWidth={2} />} activeDot={{ r: 5, fill: '#00D4FF', stroke: '#0A0F1E', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-0 w-3 border-t border-dashed border-success" />Safe zone <span className="font-mono">({safeRange(data)})</span></span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-destructive" />Excursion point</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-primary" />Temperature</span>
      </div>
    </div>
    <div aria-live="polite" aria-busy={loading}>{loading ? <AnalysisSkeleton /> : <ExcursionAssessment data={data} />}</div>
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setShowReadings(value => !value)} aria-expanded={showReadings} aria-controls="sensor-readings" className="flex w-fit items-center gap-1.5 rounded text-[11px] text-muted-foreground hover:text-primary"><Icon name="list" className="size-3.5" />{showReadings ? 'Hide' : 'View'} sensor readings<Icon name="chevron" className={cn('size-3 transition-transform duration-150', showReadings ? '-rotate-90' : 'rotate-90')} /></button>
      {showReadings && <div id="sensor-readings" className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-left text-[11px]"><caption className="sr-only">Hourly temperature readings and safe-range status</caption><thead className="bg-card text-muted-foreground"><tr><th className="px-3 py-2.5 font-medium">Time (UTC)</th><th className="px-3 py-2.5 font-medium">Temperature</th><th className="px-3 py-2.5 font-medium">Route leg</th><th className="px-3 py-2.5 font-medium">Status</th></tr></thead><tbody>{data.readings.map(reading => <tr key={reading.time} className="border-t border-border"><td className="whitespace-nowrap px-3 py-2.5 font-mono text-muted-foreground">{reading.time}</td><td className={cn('px-3 py-2.5 font-mono', reading.inRange ? 'text-primary' : 'text-destructive')}>{reading.temp.toFixed(1)}°C</td><td className="px-3 py-2.5 text-muted-foreground">{reading.leg}</td><td className={cn('px-3 py-2.5', reading.inRange ? 'text-success' : 'text-destructive')}>{reading.inRange ? 'In range' : 'Excursion'}</td></tr>)}</tbody></table></div>}
    </div>
  </section>;
}
