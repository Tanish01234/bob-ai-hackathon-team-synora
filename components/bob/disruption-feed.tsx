'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { DISRUPTIONS, AFFECTED_SHIPMENTS, type Disruption, type Shipment } from '@/lib/bob-data';
import { ActionChip, CargoBadge, Icon, SeverityBadge, SeverityDot } from './primitives';

type FeedProps = {
  selectedDisruption: Disruption | null;
  selectedShipment: Shipment | null;
  expandedShipments: Record<string, boolean>;
  onSelectDisruption: (disruption: Disruption) => void;
  onSelectShipment: (shipment: Shipment) => void;
  onToggleShipment: (key: string) => void;
  disruptions?: Disruption[];
  affectedShipmentsMap?: Record<string, Shipment[]>;
  loadingDisruptionId?: string | null;
};

export function DisruptionFeed({
  selectedDisruption,
  selectedShipment,
  expandedShipments,
  onSelectDisruption,
  onSelectShipment,
  onToggleShipment,
  disruptions,
  affectedShipmentsMap,
  loadingDisruptionId,
}: FeedProps) {
  const [showAllShipments, setShowAllShipments] = useState<Record<string, boolean>>({});
  const activeDisruptions = disruptions && disruptions.length > 0 ? disruptions : DISRUPTIONS;
  return <>
    <div className="flex flex-col gap-2 px-4 pb-4 pt-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">Active disruptions <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-medium text-primary">{activeDisruptions.length}</span></h2>
        <Icon name="activity" className="size-4 text-muted-foreground" />
      </div>
      <p className="text-[11px] text-muted-foreground">Global events. Local impact.</p>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-5">
      <div data-tour="disruptions-feed" className="flex flex-col gap-2.5">
        {activeDisruptions.map(disruption => {
          const selected = selectedDisruption?.id === disruption.id;
          const shipments = affectedShipmentsMap?.[disruption.id] ?? AFFECTED_SHIPMENTS[disruption.id] ?? [];
          const isLoadingThis = loadingDisruptionId === disruption.id;
          return <div key={disruption.id}>
            <button
              type="button"
              onClick={() => {
                onSelectDisruption(disruption);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('bob:disruption-selected', { detail: { disruptionId: disruption.id } }));
                }
              }}
              aria-expanded={selected}
              aria-controls={`shipments-${disruption.id}`}
              aria-label={`${disruption.type} in ${disruption.location}, ${disruption.severity} severity`}
              className={cn('group flex w-full flex-col gap-2.5 rounded-[10px] border bg-card p-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-[border-color,background-color,box-shadow] duration-150 hover:border-[#2A4070] hover:bg-[#192640]', selected ? 'border-primary shadow-[0_0_0_1px_#00D4FF,0_0_16px_rgba(0,212,255,0.12)] hover:border-primary' : 'border-border')}
            >
              <span className="flex w-full items-center gap-2">
                <SeverityDot severity={disruption.severity} />
                <span className="flex-1 text-[13px] font-semibold">{disruption.type.charAt(0) + disruption.type.slice(1).toLowerCase()}</span>
                <SeverityBadge severity={disruption.severity} />
              </span>
              <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><Icon name="pin" className="size-3.5" />{disruption.location}</span>
              <span className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground"><Icon name="calendar" className="size-3.5" /><span className="font-mono">{disruption.start}</span><span className="mx-0.5 text-subtle">·</span><span className="font-mono">{disruption.duration}</span></span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="font-mono text-primary">{disruption.affected}</span> shipments affected
                <Icon name="chevron" className={cn('ml-auto size-3.5 text-subtle transition-transform duration-200', selected ? 'rotate-90 text-primary' : '')} />
              </span>
              <span className="line-clamp-2 border-t border-border/80 pt-2.5 text-[11px] leading-[1.65] text-muted-foreground">{disruption.description}</span>
            </button>
            {selected && (() => {
              const isExpanded = !!showAllShipments[disruption.id];
              const displayedShipments = isExpanded ? shipments : shipments.slice(0, 5);
              return (
                <div id={`shipments-${disruption.id}`} data-tour="affected-shipments" className="ml-2.5 mt-3 border-l border-primary/25 pb-1 pl-3">
                  <div className="mb-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <h3 className="font-medium">Affected shipments</h3>
                    <span className="font-mono text-[10px]">
                      {shipments.length > 5 && !isExpanded ? `${shipments.length} affected · 5 shown` : `${shipments.length} shown`}
                    </span>
                  </div>
                  <div className={cn('flex flex-col gap-2', isExpanded && 'max-h-[420px] overflow-y-auto pr-1')}>
                    {displayedShipments.map(shipment => {
                      const key = `${disruption.id}-${shipment.id}`;
                      const expanded = !!expandedShipments[key];
                      const active = selectedShipment?.id === shipment.id;
                      return <article key={shipment.id} className={cn('overflow-hidden rounded-lg border bg-background/60 transition-[border-color] duration-150 hover:border-[#2A4070]', active ? 'border-primary/70 bg-primary/[0.035]' : 'border-border')}>
                        <button
                          type="button"
                          aria-label={`View shipment ${shipment.id}`}
                          aria-pressed={active}
                          onClick={() => {
                            onSelectShipment(shipment);
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new CustomEvent('bob:shipment-selected', { detail: { shipmentId: shipment.id } }));
                            }
                          }}
                          className="flex w-full flex-col gap-2 px-3 pb-1.5 pt-3 text-left"
                        >
                          <span className="flex w-full flex-wrap items-center justify-between gap-1.5"><span className="font-mono text-[12px] font-medium text-primary">{shipment.id}</span><CargoBadge cargo={shipment.cargo} /></span>
                          <span className="flex flex-wrap items-center gap-x-1 text-[10px] leading-5 text-muted-foreground"><span>{shipment.origin}</span><Icon name="arrow" className="size-3 text-subtle" /><span>{shipment.destination}</span></span>
                          <span className="flex flex-wrap items-center gap-1"><SeverityBadge severity={shipment.risk} risk /><ActionChip action={shipment.action} /></span>
                        </button>
                        <div className="flex items-center justify-between px-3 pb-2">
                          <span className="flex items-center gap-1 text-[10px] text-warning"><Icon name="clock" className="size-3" /><span className="font-mono">+{shipment.delay}</span> days</span>
                          <button type="button" aria-label={`${expanded ? 'Hide' : 'Show'} reasoning for ${shipment.id}`} aria-expanded={expanded} aria-controls={`reasoning-${key}`} onClick={() => onToggleShipment(key)} className="-mr-1 flex items-center gap-1 rounded px-1 py-1.5 text-[10px] text-muted-foreground hover:text-primary"><Icon name="sparkle" className="size-3" />Reasoning<Icon name="chevron" className={cn('size-3 transition-transform duration-150', expanded ? '-rotate-90' : 'rotate-90')} /></button>
                        </div>
                        <div id={`reasoning-${key}`} inert={!expanded} className={cn('overflow-hidden transition-[max-height,opacity] duration-200', expanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0')}>
                          <p className="mx-3 border-t border-border py-3 text-[11px] italic leading-relaxed text-muted-foreground">{shipment.justification}</p>
                        </div>
                      </article>;
                    })}
                  </div>
                  {shipments.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllShipments(prev => ({ ...prev, [disruption.id]: !prev[disruption.id] }))}
                      className="mt-2 w-full rounded-md border border-primary/20 bg-primary/5 py-1.5 text-center text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                    >
                      {isExpanded ? 'Show fewer (5)' : `View all ${shipments.length} affected shipments`}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>;
        })}
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 text-[10px] text-muted-foreground"><span className="size-1.5 rounded-full bg-success" />Demo feed connected<span className="ml-auto flex items-center gap-1"><Icon name="shield" className="size-3" />Bob intelligence</span></div>
  </>;
}
