# Solution Overview — BOB Autonomous Supply Chain Intelligence

## Overview

**BOB** is an autonomous supply chain risk intelligence platform that bridges the gap between raw logistics signals and decisive operational action. Built specifically for high-velocity supply chain operations, BOB monitors a fleet of **250 active in-transit shipments** across global maritime shipping lanes, cross-references them against **12 live disruption events**, retrieves real marine meteorology, evaluates cold-chain sensor timeseries against strict regulatory duration thresholds, and empowers operators with a grounded operational AI copilot.

---

## The Core Problem BOB Solves

Supply chain operators are inundated with disconnected data points: vessel coordinates, weather maps, port advisories, and sensor logs. During crises, reconciling which shipments intersect disruption corridors requires hours of manual cross-referencing. For temperature-sensitive cargo like vaccines and perishables, temperature excursions are often discovered only post-delivery, resulting in total cargo loss.

BOB solves this by unifying all operational signals into a single, cohesive intelligence layer that evaluates risk deterministically and presents actionable mitigations immediately.

---

## How BOB Works

```
[250 Shipments] + [12 Disruptions] + [Live OpenWeatherMap API] + [Cold Chain Sensor Timeseries]
                                       │
                                       ▼
                     [Deterministic Intersection Engine]
                                       │
                                       ▼
                      [Multi-Factor Risk Scoring Engine]
                                       │
                                       ▼
                    [Grounded BOB AI Operational Copilot]
                                       │
                                       ▼
                  [Verified Actionable Mitigation & Rerouting]
```

1. **Ingest & Simulate**: BOB maintains a persistent fleet of 250 international shipments, simulating nautical progress and coordinates along real waypoints.
2. **Match**: Disruptions are matched to shipments algorithmically based on shared waypoints, current leg, and destination port.
3. **Enrich**: For each shipment, live weather at the exact coordinates is fetched via OpenWeatherMap, while sensor logs are scanned for temperature excursions.
4. **Evaluate**: A composite risk score (Normal, Moderate, High, Critical) is calculated based on multi-factor signals.
5. **Synthesize**: The operator interacts with BOB AI to interrogate delays, evaluate alternative routes, and generate cryptographic transit documentation.

---

## Detailed Capabilities

### 1. Shipment Intelligence
BOB tracks 250 synthetic shipments designed to mirror real-world commercial shipping lanes. Each shipment contains:
- Complete route waypoints (e.g., Shanghai → Singapore → Suez Canal → Rotterdam).
- Cargo classification (Standard, Perishable, Fragile, Hazard, Cold Chain: Vaccine, Frozen Goods).
- Financial cargo valuation ($50,000 to $2,500,000+ USD).
- Vessel cruising speed, departure timestamp, and original scheduled ETA.

### 2. Disruption Intelligence
BOB monitors 12 active global disruption events, including:
- Maritime choke-points (Suez Canal blockage, Malacca Strait congestion, Panama Canal drought).
- Port strikes and labor actions (Rotterdam, Hamburg, Los Angeles).
- Severe meteorological hazards (Typhoon Malakas, North Atlantic storms).
- Geopolitical tensions (Red Sea maritime advisories).

**Deterministic Matching**: The system cross-references disruption locations against shipment waypoints, destination ports, and current nautical legs in memory. Matching is 100% deterministic code—zero hallucinations.

### 3. Tracking Intelligence & Simulation Engine
- **Deterministic Math**: Vessel position is calculated from `departure_time`, `route_segments`, `cruising_speed_knots`, and elapsed simulation time.
- **Simulation Clock**: Supports configurable speed multipliers (1x to 100x), allowing operators and judges to observe multi-day journeys in minutes.
- **In-Memory Cache**: The simulation clock state is cached for 5 seconds, enabling position queries in **0.15 milliseconds**.

### 4. Weather Intelligence
- **Real OpenWeatherMap API**: Live weather data (temperature, wind speed, gusts, precipitation probability) is fetched for the vessel's current simulated latitude and longitude.
- **Non-Blocking Architecture**: Live tracking calculations check an in-memory weather cache (<0.01ms) to apply cruising speed modifiers without blocking on external HTTP calls.
- **Speed Reductions**: Severe storms apply realistic speed modifiers (e.g., 0.7x for high severity, 0.5x for critical storms), naturally propagating delays into the live ETA.

### 5. Cold-Chain Intelligence
- **Sensor Telemetry**: Temperature sensor readings are recorded across shipment legs.
- **Strict Excursion Thresholds**:
  - Excursions lasting **≤ 2 hours** are classified as *Moderate* (requiring monitoring).
  - Excursions lasting **> 2 hours** or exceeding critical thermal limits are classified as *Critical* (requiring immediate quarantine and inspection).
- **Regulatory Guidance**: Identifies potential violations of GDP (Good Distribution Practice) and FDA 21 CFR Part 205 regulations.

### 6. Risk Engine
Calculates an overall risk rating (`normal`, `medium`, `high`, `critical`) by synthesizing:
- Weather severity (Normal, Moderate, High, Critical).
- Disruption severity (Low, Medium, High).
- Cold-chain compliance state.
- Accumulated ETA delay hours.

### 7. Grounded BOB AI Copilot
BOB AI is an operational copilot embedded directly into the Operations Center:
- **Dual-Provider Resilience**: Uses Google Gemini 1.5 Flash as the primary reasoning engine with automatic failover to Groq (Llama 3.1 8B).
- **Operational Scope Guardrails**: `ai_guard.py` verifies incoming user prompts against logistics boundaries, rejecting general trivia and enforcing citation schemas.
- **Grounding on Live State**: Prompts inject live shipment coordinates, weather observations, disruption descriptions, and cold-chain status. BOB never invents transit data.

### 8. Recommendations & Alternative Rerouting
When a shipment is delayed or threatened by disruption:
- BOB AI evaluates concrete alternative routing options stored in the database.
- Example: For a vessel facing the Suez Canal advisory, BOB presents the *Cape of Good Hope* alternative, detailing extra nautical distance (+6,250 km), additional transit duration (+7.5 days), and financial trade-offs.

---

## What Makes BOB Different

| Dimension | Conventional Dashboards | BOB Supply Chain Intelligence |
|---|---|---|
| **Disruption Detection** | Manual notification review | Automatic algorithmic intersection matching |
| **Cold-Chain Monitoring** | Post-delivery logger download | Real-time excursion classification en route |
| **Weather Awareness** | Separate weather tab / third-party site | Live OpenWeatherMap data modifying vessel speeds |
| **AI Role** | Generic chatbot answering trivia | Operational copilot grounded in live telemetry |
| **Compliance Proof** | Unverified spreadsheets | Server-side cryptographic PDF transit receipts |

---

## Key Design Decisions

1. **Deterministic Core, Cognitive Edge**: Core operational calculations (coordinate simulation, disruption intersection, excursion duration) are implemented in pure, testable Python algorithms. AI is deployed at the cognitive edge to explain root causes and synthesize mitigation options.
2. **Same-Origin Monorepo Architecture**: Implemented using Vercel Services where Next.js 16 handles the frontend and FastAPI handles the Python backend under `/svc/api/*`, eliminating CORS complexity and third-party host latency.
3. **Sub-Second Response Times**: Implemented multi-tier caching (simulation state, database rows, weather queries, and client-side Promise deduplication) so complex fleet telemetry loads instantaneously.

---

## Frictionless Judge Demo Mode

To ensure effortless hackathon evaluation:
- The public root URL provides an **"Enter Demo Mode"** button.
- Clicking the button automatically provisions a genuine Supabase authenticated session for `judge@bob.ai`.
- Pre-seeds 250 shipments, 12 disruptions, and active cold-chain alerts, allowing evaluators to experience the full operational system with zero local setup.
