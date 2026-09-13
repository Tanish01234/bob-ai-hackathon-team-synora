import type { TourStep } from './types';

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'fleet-overview',
    stepNumber: 1,
    title: 'Your Fleet at a Glance',
    description:
      'BOB gives you a single operational view of your entire shipment network. Monitor total shipments, in-transit commercial cargo, schedule delays, and active operational risks.',
    targetSelector: '[data-tour="fleet-overview"]',
    preferredPlacement: 'bottom',
    quickMode: true,
  },
  {
    id: 'active-disruptions',
    stepNumber: 2,
    title: '1. Detect Supply-Chain Disruptions',
    description:
      'BOB continuously evaluates disruptions such as port strikes, canal restrictions, and severe weather to identify precisely which shipments and trade lanes are impacted.',
    targetSelector: '[data-tour="disruptions-feed"]',
    instruction: 'Click an active disruption to explore its affected fleet.',
    preferredPlacement: 'right',
    waitForAction: true,
    actionEvent: 'bob:disruption-selected',
    quickMode: true,
  },
  {
    id: 'affected-shipments',
    stepNumber: 3,
    title: '2. Explore the Affected Shipment',
    description:
      'Inspect an affected shipment to review its route waypoints, current simulated coordinates, cargo sensitivity, ETA variance, and risk signals.',
    targetSelector: '[data-tour="affected-shipments"]',
    instruction: 'Select any shipment from the list to load its workspace.',
    preferredPlacement: 'right',
    waitForAction: true,
    actionEvent: 'bob:shipment-selected',
    quickMode: true,
  },
  {
    id: 'shipment-summary',
    stepNumber: 4,
    title: '3. Understand the Shipment',
    description:
      'BOB consolidates the shipment operational dossier: origin, destination, carrier, cargo type, projected ETA, and cargo value in a single glance.',
    targetSelector: '[data-tour="shipment-summary"]',
    preferredPlacement: 'bottom',
    quickMode: false,
  },
  {
    id: 'live-tracking',
    stepNumber: 5,
    title: '4. Follow the Vessel in Motion',
    description:
      'The simulation engine models vessel movement along great-circle sea lanes. Real-time speed, progress percentage, distance remaining, and delay hours update as the simulation clock advances.',
    targetSelector: '[data-tour="tracking-map"]',
    preferredPlacement: 'bottom',
    quickMode: true,
  },
  {
    id: 'route-weather',
    stepNumber: 6,
    title: '5. Monitor Weather Along the Route',
    description:
      'Real-time atmospheric conditions are queried at the vessel simulated coordinates. Adverse sea swells or storms automatically adjust vessel speed and projected arrival times.',
    targetSelector: '[data-tour="route-weather"]',
    preferredPlacement: 'top',
    quickMode: false,
  },
  {
    id: 'cold-chain',
    stepNumber: 7,
    title: '6. Protect Temperature-Sensitive Cargo',
    description:
      'For cold-chain cargo (vaccines, perishables), BOB tracks simulated reefer sensors against strict pharmaceutical safe ranges (0–4°C / 2–8°C) to alert operators to thermal breaches.',
    targetSelector: '[data-tour="temperature-monitor"]',
    preferredPlacement: 'top',
    quickMode: true,
  },
  {
    id: 'bob-intelligence',
    stepNumber: 8,
    title: '7. Turn Signals Into Risk Intelligence',
    description:
      'Deterministic rules evaluate weather severity, port delays, route disruptions, and cold-chain excursions to classify overall risk without hallucination.',
    targetSelector: '[data-tour="bob-intelligence"]',
    preferredPlacement: 'top',
    quickMode: false,
  },
  {
    id: 'ai-analysis',
    stepNumber: 9,
    title: '8. Ask BOB to Reason About the Shipment',
    description:
      'BOB dual-tier AI (Gemini Flash + Groq LLaMA) synthesizes live telemetry to explain risk root causes and calculate optimal alternate reroutes (e.g. Colombo Bypass).',
    targetSelector: '[data-tour="ai-analysis-btn"]',
    instruction: 'Click Analyze with AI to see live grounded reasoning.',
    preferredPlacement: 'top',
    quickMode: true,
  },
  {
    id: 'ocean-ship-launcher',
    stepNumber: 10,
    title: '9. Meet BOB Ocean AI',
    description:
      'BOB AI travels with your operational workspace. Grab and drag the container ship anywhere across your screen to watch its hydrodynamic water wake.',
    targetSelector: '[data-tour="ocean-ship-launcher"]',
    instruction: 'Try dragging the floating ship across the screen.',
    preferredPlacement: 'top',
    waitForAction: true,
    actionEvent: 'bob:tour-ship-dragged',
    quickMode: true,
  },
  {
    id: 'bob-assistant-drawer',
    stepNumber: 11,
    title: '10. Ask BOB Anything About Your Supply Chain',
    description:
      'Ask conversational questions about active shipments, route disruptions, cold-chain status, or recommended actions. The Platform Scope Guard keeps reasoning strictly grounded in supply-chain intelligence.',
    targetSelector: '[data-tour="bob-assistant-drawer"]',
    preferredPlacement: 'left',
    quickMode: false,
  },
  {
    id: 'admin-receipt-controls',
    stepNumber: 12,
    title: '11. Control the Demo & Export Documentation',
    description:
      'The Admin Console gives you control over simulation speeds (1x to 100x), demo scenario triggers, and real-time AI audit logs. You can also export audit-grade Transit Receipt PDFs with one click.',
    targetSelector: '[data-tour="admin-link"]',
    preferredPlacement: 'bottom',
    quickMode: true,
  },
];
