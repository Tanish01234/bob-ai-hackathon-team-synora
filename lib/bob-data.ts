export const DISRUPTIONS: Disruption[] = [
  { id: 'DIS-01', type: 'Port Strike', location: 'Rotterdam, NL', severity: 'high', duration: '5 days', affected: 14, description: 'Dockworkers union strike halting all container operations at Rotterdam port.', start: 'Sep 14, 2026' },
  { id: 'DIS-02', type: 'Weather Event', location: 'Suez Canal', severity: 'high', duration: '3 days', affected: 22, description: 'Severe sandstorm causing temporary closure of Suez Canal transit lanes.', start: 'Sep 12, 2026' },
  { id: 'DIS-03', type: 'Geopolitical Crisis', location: 'Singapore', severity: 'medium', duration: '7 days', affected: 9, description: 'Regional trade tensions causing extended customs inspections at Singapore.', start: 'Sep 10, 2026' },
  { id: 'DIS-04', type: 'Port Strike', location: 'Los Angeles, US', severity: 'high', duration: '6 days', affected: 11, description: 'Longshoremen strike at Port of Los Angeles affecting west coast operations.', start: 'Sep 13, 2026' },
  { id: 'DIS-05', type: 'Weather Event', location: 'Hamburg, DE', severity: 'medium', duration: '2 days', affected: 6, description: 'Storm system causing rough North Sea conditions and port suspension.', start: 'Sep 11, 2026' },
  { id: 'DIS-06', type: 'Geopolitical Crisis', location: 'Shanghai, CN', severity: 'low', duration: '4 days', affected: 8, description: 'Export control measures causing cargo inspection delays at Shanghai.', start: 'Sep 09, 2026' },
];

export const AFFECTED_SHIPMENTS: Record<string, Shipment[]> = {
  'DIS-01': [
    { id: 'SHP-1042', origin: 'Shanghai, CN', destination: 'Rotterdam, NL', carrier: 'Maersk', cargo: 'vaccine', value: 280000, status: 'in_transit', waypoints: ['Shanghai', 'Singapore', 'Suez Canal', 'Rotterdam'], currentLeg: 2, risk: 'high', action: 'reroute', delay: 4, justification: 'High-value vaccine cargo approaching struck port; reroute via Hamburg to avoid spoilage risk.' },
    { id: 'SHP-1087', origin: 'Shenzhen, CN', destination: 'Rotterdam, NL', carrier: 'Evergreen', cargo: 'electronics', value: 420000, status: 'delayed', waypoints: ['Shenzhen', 'Singapore', 'Suez Canal', 'Rotterdam'], currentLeg: 3, risk: 'high', action: 'alternate_carrier', delay: 5, justification: 'Electronics shipment already delayed; switch to air freight to meet customer SLA.' },
    { id: 'SHP-1103', origin: 'Mumbai, IN', destination: 'Rotterdam, NL', carrier: 'MSC', cargo: 'standard', value: 95000, status: 'in_transit', waypoints: ['Mumbai', 'Suez Canal', 'Rotterdam'], currentLeg: 1, risk: 'medium', action: 'hold', delay: 5, justification: 'Standard cargo with no time sensitivity; hold at Suez anchorage until strike resolves.' },
    { id: 'SHP-1118', origin: 'Hamburg, DE', destination: 'Rotterdam, NL', carrier: 'Hapag-Lloyd', cargo: 'perishable', value: 175000, status: 'in_transit', waypoints: ['Hamburg', 'Rotterdam'], currentLeg: 0, risk: 'high', action: 'reroute', delay: 3, justification: 'Perishable cargo with 6-day shelf life; immediate reroute to Antwerp required.' },
    { id: 'SHP-1155', origin: 'Jeddah, SA', destination: 'Rotterdam, NL', carrier: 'CMA CGM', cargo: 'frozen_goods', value: 310000, status: 'in_transit', waypoints: ['Jeddah', 'Suez Canal', 'Rotterdam'], currentLeg: 1, risk: 'high', action: 'reroute', delay: 6, justification: 'Frozen goods require uninterrupted cold chain; reroute via Bremerhaven immediately.' },
  ],
  'DIS-02': [
    { id: 'SHP-1042', origin: 'Shanghai, CN', destination: 'Rotterdam, NL', carrier: 'Maersk', cargo: 'vaccine', value: 280000, status: 'in_transit', waypoints: ['Shanghai', 'Singapore', 'Suez Canal', 'Rotterdam'], currentLeg: 2, risk: 'high', action: 'reroute', delay: 7, justification: 'Vaccine cargo must avoid extended anchorage; reroute via Cape of Good Hope.' },
    { id: 'SHP-1201', origin: 'Mumbai, IN', destination: 'Hamburg, DE', carrier: 'ONE', cargo: 'electronics', value: 380000, status: 'in_transit', waypoints: ['Mumbai', 'Suez Canal', 'Hamburg'], currentLeg: 1, risk: 'high', action: 'reroute', delay: 9, justification: 'High-value electronics mid-canal; suspend transit and anchor until conditions clear.' },
    { id: 'SHP-1067', origin: 'Jeddah, SA', destination: 'Rotterdam, NL', carrier: 'COSCO', cargo: 'standard', value: 110000, status: 'in_transit', waypoints: ['Jeddah', 'Suez Canal', 'Rotterdam'], currentLeg: 1, risk: 'medium', action: 'hold', delay: 3, justification: 'Standard cargo; hold at Port Said anchorage, disruption expected to clear in 3 days.' },
  ],
  'DIS-03': [
    { id: 'SHP-1188', origin: 'Shanghai, CN', destination: 'Los Angeles, US', carrier: 'Yang Ming', cargo: 'electronics', value: 520000, status: 'in_transit', waypoints: ['Shanghai', 'Singapore', 'Pacific Ocean', 'Los Angeles'], currentLeg: 1, risk: 'medium', action: 'alternate_carrier', delay: 2, justification: 'High-value cargo facing customs delays; switch to expedited carrier with pre-clearance.' },
    { id: 'SHP-1209', origin: 'Busan, KR', destination: 'Rotterdam, NL', carrier: 'Hapag-Lloyd', cargo: 'frozen_goods', value: 240000, status: 'in_transit', waypoints: ['Busan', 'Singapore', 'Suez Canal', 'Rotterdam'], currentLeg: 1, risk: 'high', action: 'reroute', delay: 4, justification: 'Frozen goods cannot sustain inspection delays; reroute via Colombo to bypass Singapore.' },
  ],
  'DIS-04': [
    { id: 'SHP-1145', origin: 'Tokyo, JP', destination: 'Los Angeles, US', carrier: 'ONE', cargo: 'electronics', value: 670000, status: 'in_transit', waypoints: ['Tokyo', 'Pacific Ocean', 'Los Angeles'], currentLeg: 1, risk: 'high', action: 'alternate_carrier', delay: 6, justification: 'Critical electronics shipment; divert to Long Beach or switch to air freight.' },
    { id: 'SHP-1167', origin: 'Busan, KR', destination: 'Los Angeles, US', carrier: 'COSCO', cargo: 'standard', value: 88000, status: 'in_transit', waypoints: ['Busan', 'Pacific Ocean', 'Los Angeles'], currentLeg: 1, risk: 'medium', action: 'hold', delay: 6, justification: 'Standard cargo; anchor offshore and await strike resolution before port entry.' },
  ],
  'DIS-05': [
    { id: 'SHP-1033', origin: 'Rotterdam, NL', destination: 'Singapore, SG', carrier: 'Maersk', cargo: 'standard', value: 72000, status: 'delayed', waypoints: ['Rotterdam', 'Hamburg', 'Suez Canal', 'Singapore'], currentLeg: 0, risk: 'low', action: 'hold', delay: 2, justification: 'Standard cargo already at port; hold 48 hours until storm system passes Hamburg.' },
  ],
  'DIS-06': [
    { id: 'SHP-1220', origin: 'Shanghai, CN', destination: 'New York, US', carrier: 'MSC', cargo: 'electronics', value: 445000, status: 'in_transit', waypoints: ['Shanghai', 'Pacific Ocean', 'New York'], currentLeg: 0, risk: 'medium', action: 'hold', delay: 3, justification: 'Export control inspection required; hold at Shanghai warehouse pending clearance.' },
  ],
};

export const SENSOR_DATA: Record<string, SensorData> = {
  'SHP-1042': {
    cargoType: 'vaccine', safeMin: 2, safeMax: 8, excursionStatus: 'critical',
    readings: [
      { time: '08:00', temp: 4.2, leg: 'Shanghai–Singapore', inRange: true },
      { time: '09:00', temp: 4.8, leg: 'Shanghai–Singapore', inRange: true },
      { time: '10:00', temp: 5.1, leg: 'Shanghai–Singapore', inRange: true },
      { time: '11:00', temp: 5.3, leg: 'Shanghai–Singapore', inRange: true },
      { time: '12:00', temp: 9.8, leg: 'Shanghai–Singapore', inRange: false },
      { time: '13:00', temp: 12.4, leg: 'Shanghai–Singapore', inRange: false },
      { time: '14:00', temp: 11.9, leg: 'Shanghai–Singapore', inRange: false },
      { time: '15:00', temp: 10.2, leg: 'Shanghai–Singapore', inRange: false },
      { time: '16:00', temp: 7.8, leg: 'Singapore–Suez', inRange: true },
      { time: '17:00', temp: 5.9, leg: 'Singapore–Suez', inRange: true },
      { time: '18:00', temp: 5.2, leg: 'Singapore–Suez', inRange: true },
      { time: '19:00', temp: 4.9, leg: 'Singapore–Suez', inRange: true },
    ],
    aiSummary: 'Temperature exceeded safe vaccine storage range by 4.4°C for 4 hours during the Shanghai–Singapore leg, risking significant potency loss and batch compromise.',
    regulatoryNote: 'Per standard cold-chain guidelines, excursions exceeding 2 hours outside 2–8°C require mandatory batch review and quarantine before distribution.',
    aiProvider: 'Gemini',
  },
  'SHP-1155': {
    cargoType: 'frozen_goods', safeMin: null, safeMax: -18, excursionStatus: 'moderate',
    readings: [
      { time: '06:00', temp: -21.2, leg: 'Jeddah–Suez', inRange: true },
      { time: '07:00', temp: -20.8, leg: 'Jeddah–Suez', inRange: true },
      { time: '08:00', temp: -20.1, leg: 'Jeddah–Suez', inRange: true },
      { time: '09:00', temp: -19.4, leg: 'Jeddah–Suez', inRange: true },
      { time: '10:00', temp: -16.2, leg: 'Jeddah–Suez', inRange: false },
      { time: '11:00', temp: -15.8, leg: 'Jeddah–Suez', inRange: false },
      { time: '12:00', temp: -19.1, leg: 'Suez–Rotterdam', inRange: true },
      { time: '13:00', temp: -20.3, leg: 'Suez–Rotterdam', inRange: true },
      { time: '14:00', temp: -21.0, leg: 'Suez–Rotterdam', inRange: true },
      { time: '15:00', temp: -21.4, leg: 'Suez–Rotterdam', inRange: true },
    ],
    aiSummary: 'Frozen goods temperature rose above -18°C threshold by 2.2°C for 2 hours during the Jeddah–Suez leg, indicating a potential reefer unit malfunction.',
    regulatoryNote: 'Brief excursion classified as moderate; goods require visual inspection and temperature log review per standard frozen cargo handling protocols.',
    aiProvider: 'Groq',
  },
  'SHP-1118': {
    cargoType: 'perishable', safeMin: 0, safeMax: 4, excursionStatus: 'normal',
    readings: [
      { time: '08:00', temp: 2.1, leg: 'Hamburg–Rotterdam', inRange: true },
      { time: '09:00', temp: 2.4, leg: 'Hamburg–Rotterdam', inRange: true },
      { time: '10:00', temp: 2.8, leg: 'Hamburg–Rotterdam', inRange: true },
      { time: '11:00', temp: 3.1, leg: 'Hamburg–Rotterdam', inRange: true },
      { time: '12:00', temp: 3.3, leg: 'Hamburg–Rotterdam', inRange: true },
      { time: '13:00', temp: 3.0, leg: 'Hamburg–Rotterdam', inRange: true },
      { time: '14:00', temp: 2.7, leg: 'Hamburg–Rotterdam', inRange: true },
      { time: '15:00', temp: 2.5, leg: 'Hamburg–Rotterdam', inRange: true },
    ],
    aiSummary: null, regulatoryNote: null, aiProvider: null,
  },
};

export const STATS = { total: 250, inTransit: 188, delayed: 36, delivered: 26, affected: 12, critical: 8, moderate: 12 };
export const DEMO_ETA = 'Sep 20';
export const CARGO_LABELS = { vaccine: 'Vaccine', electronics: 'Electronics', standard: 'Standard', perishable: 'Perishable', frozen_goods: 'Frozen goods' };
export const ACTION_LABELS = { reroute: 'Reroute', hold: 'Hold', alternate_carrier: 'Alt. carrier' };
export const COLD_CHAIN_CARGO = ['vaccine', 'frozen_goods', 'perishable'];

export type Severity = 'high' | 'medium' | 'low';
export type Disruption = {
  id: string;
  type: string;
  location: string;
  severity: Severity;
  duration: string;
  affected: number;
  description: string;
  start: string;
};
export type Cargo = keyof typeof CARGO_LABELS;
export type Shipment = {
  id: string; origin: string; destination: string; carrier: string; cargo: Cargo;
  value: number; status: 'in_transit' | 'delayed' | 'delivered'; waypoints: string[];
  currentLeg: number; risk: Severity; action: keyof typeof ACTION_LABELS;
  delay: number; justification: string;
};
export type Reading = { time: string; temp: number; leg: string; inRange: boolean };
export type SensorData = {
  cargoType: Cargo; safeMin: number | null; safeMax: number;
  excursionStatus: 'critical' | 'moderate' | 'normal'; readings: Reading[];
  aiSummary: string | null; regulatoryNote: string | null; aiProvider: string | null;
};
