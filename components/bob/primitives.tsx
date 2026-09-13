import type { ReactNode, SVGProps } from 'react';
import { cn } from '@/lib/utils';
import { ACTION_LABELS, CARGO_LABELS, type Cargo, type Severity, type Shipment } from '@/lib/bob-data';

const ICON_PATHS = {
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2" /></>,
  box: <><path d="m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5" /></>,
  ship: <><path d="m3 14 9-4 9 4-3 6H6l-3-6ZM7 12V5h10v7M10 5V2h4v3M12 10v9M2 22c2 0 3-1 5-1s3 1 5 1 3-1 5-1 3 1 5 1" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  thermometer: <><path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z" /><path d="M12 7v10" /><circle cx="12" cy="18" r="1" /><path d="M18 5h3M18 9h2" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  reroute: <><path d="M5 20V9a4 4 0 0 1 4-4h10M14 1l5 4-5 4" /><path d="M10 20h9v-5" /></>,
  hold: <><path d="M8 5v14M16 5v14" /></>,
  alternate_carrier: <><path d="M3 7h17l-4-4M21 17H4l4 4" /></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 10-8 10S4 17 4 12V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  sparkle: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" /><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5L20 2Z" /></>,
  warning: <><path d="m10.3 4-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v5M12 17h.01" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  network: <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="12" cy="19" r="2" /><path d="M7 5h10M6 7l5 10M18 7l-5 10" /></>,
  activity: <path d="M2 12h4l3-8 6 16 3-8h4" />,
  list: <><path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1" /></>,
  dollar: <><path d="M12 2v20M17 6H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H6" /></>,
};

export function Icon({ name, className, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof ICON_PATHS }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={cn('size-4 shrink-0', className)} aria-hidden="true" {...props}>{ICON_PATHS[name]}</svg>;
}

export function BobMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 36 40" fill="none" className={cn('h-9 w-8 shrink-0 text-primary', className)} aria-hidden="true"><path d="m18 2 15.6 9v18L18 38 2.4 29V11L18 2Z" stroke="currentColor" strokeWidth="1.7" /><path d="m18 10 8.7 5v10L18 30l-8.7-5V15l8.7-5Z" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeWidth="1.3" /><path d="m9.3 15 8.7 5 8.7-5M18 20v10" stroke="currentColor" strokeWidth="1.3" /><circle cx="18" cy="20" r="2" fill="currentColor" /></svg>;
}

export function Globe({ className }: { className?: string }) {
  return <svg viewBox="0 0 100 100" fill="none" className={cn('size-20', className)} aria-hidden="true"><circle cx="50" cy="50" r="36" stroke="currentColor" /><ellipse cx="50" cy="50" rx="18" ry="36" stroke="currentColor" /><path d="M15 50h70M20 31c20 9 40 9 60 0M20 69c20-9 40-9 60 0" stroke="currentColor" /><path d="M20 64C35 26 68 21 80 44M24 30c30 0 42 28 45 48" stroke="#00D4FF" strokeOpacity=".5" strokeDasharray="3 4" /><circle cx="20" cy="64" r="3" fill="#00D4FF" /><circle cx="80" cy="44" r="3" fill="#00D4FF" /><circle cx="69" cy="78" r="2.5" fill="#00D4FF" fillOpacity=".5" /></svg>;
}

const TONES = {
  cyan: 'border-[#00D4FF]/25 bg-[#00D4FF]/10 text-[#00D4FF]',
  red: 'border-[#EF4444]/25 bg-[#EF4444]/10 text-[#EF4444]',
  amber: 'border-[#F59E0B]/25 bg-[#F59E0B]/10 text-[#F59E0B]',
  green: 'border-[#10B981]/25 bg-[#10B981]/10 text-[#10B981]',
  violet: 'border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#A78BFA]',
  muted: 'border-[#7A8FAD]/20 bg-[#7A8FAD]/10 text-[#7A8FAD]',
};
export type Tone = keyof typeof TONES;
const SEVERITY_TONE: Record<Severity, Tone> = { high: 'red', medium: 'amber', low: 'green' };
const CARGO_TONE: Record<Cargo, Tone> = { vaccine: 'green', frozen_goods: 'cyan', perishable: 'amber', electronics: 'violet', standard: 'muted' };
const ACTION_TONE: Record<Shipment['action'], Tone> = { reroute: 'cyan', hold: 'amber', alternate_carrier: 'violet' };

export function Chip({ children, tone = 'muted', className, dot = false }: { children: ReactNode; tone?: Tone; className?: string; dot?: boolean }) {
  return <span className={cn('inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium leading-4', TONES[tone], className)}>{dot && <span className="size-1.5 shrink-0 rounded-full bg-current" />}{children}</span>;
}
export function SeverityBadge({ severity, risk = false }: { severity: Severity; risk?: boolean }) {
  return <Chip tone={SEVERITY_TONE[severity]} className={cn(!risk && 'rounded-full')}><span>{severity.charAt(0).toUpperCase() + severity.slice(1)}{risk ? ' risk' : ''}</span></Chip>;
}
export function SeverityDot({ severity }: { severity: Severity }) {
  return <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', severity === 'high' ? 'bg-[#EF4444] shadow-[0_0_6px_#EF4444]' : severity === 'medium' ? 'bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]' : 'bg-[#10B981] shadow-[0_0_6px_#10B981]')} />;
}
export function CargoBadge({ cargo }: { cargo: Cargo }) {
  return <Chip tone={CARGO_TONE[cargo]}>{CARGO_LABELS[cargo]}</Chip>;
}
export function ActionChip({ action }: { action: Shipment['action'] }) {
  return <Chip tone={ACTION_TONE[action]}><Icon name={action} className="size-3" />{ACTION_LABELS[action]}</Chip>;
}
export function StatusBadge({ status }: { status: Shipment['status'] }) {
  return <Chip tone={status === 'in_transit' ? 'cyan' : status === 'delayed' ? 'red' : 'green'} dot className="px-2.5 py-1 text-[11px]">{status === 'in_transit' ? 'In transit' : status === 'delayed' ? 'Delayed' : 'Delivered'}</Chip>;
}
