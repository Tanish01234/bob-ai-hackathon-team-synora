# BOB Supply Chain Intelligence

**Autonomous Supply Chain Risk Intelligence with Grounded AI Reasoning & Cold-Chain Integrity Monitoring**  
*Submitted to the Bob AI Hackathon by **Team Synora** (Track: AI)*

[![Live Demo](https://img.shields.io/badge/Production-Live%20Demo-00D4FF?style=for-the-badge&logo=vercel)](https://bob-ai-hackathon-team-synora.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2016%20•%20FastAPI%20•%20Supabase-1E293B?style=for-the-badge)](https://github.com/Tanish01234/bob-ai-hackathon-team-synora)
[![AI Pipeline](https://img.shields.io/badge/AI-Gemini%201.5%20•%20Groq%20Llama%203.1-6366F1?style=for-the-badge)](https://github.com/Tanish01234/bob-ai-hackathon-team-synora)

---

## Team

- **Team Name**: Team Synora
- **Track**: AI
- **Project Lead**: Tanish Bedia ([GitHub: @Tanish01234](https://github.com/Tanish01234))
- **Repository**: [https://github.com/Tanish01234/bob-ai-hackathon-team-synora](https://github.com/Tanish01234/bob-ai-hackathon-team-synora)
- **Live Production URL**: [https://bob-ai-hackathon-team-synora.vercel.app](https://bob-ai-hackathon-team-synora.vercel.app)

---

## Problem Statement

Modern global logistics operations suffer from acute signal fragmentation:

1. **Information Overload during Disruptions**: When global maritime choke-points, port congestion, or extreme typhoons occur, logistics operators manage hundreds of in-transit shipments across disconnected carrier portals and spreadsheets. Determining which shipments intersect a disruption zone takes hours of manual waypoint cross-referencing.
2. **Invisible Cold-Chain Spoilage**: High-value temperature-sensitive cargo (vaccines, pharmaceuticals, biologics, perishables) requires strict compliance windows. In conventional operations, temperature excursions are only discovered at delivery when the manifest is signed—too late to take corrective or quarantine action.
3. **Disconnected Decision Making**: Even when telemetry exists, operators lack an autonomous intelligence layer capable of synthesizing vessel coordinates, live marine weather, active disruption events, sensor timeseries, and carrier contracts into immediate, legally grounded mitigation recommendations.

---

## Solution

**BOB** is an autonomous supply chain operations intelligence platform. Rather than acting as a superficial wrapper or a generic chatbot, BOB fuses real-time simulation math, live external weather APIs, deterministic disruption intersection algorithms, and dual-provider AI reasoning into a unified Operations Center:

- **250 Active In-Transit Shipments**: Monitored concurrently across global maritime corridors (Suez Canal, Malacca Strait, Panama Canal, Rotterdam, Shanghai, Singapore, Los Angeles, and Hamburg).
- **12 Real-Time Disruption Events**: Dynamically evaluated for route intersection, delay propagation, and severe weather impacts.
- **Strict Cold-Chain Regulatory Monitoring**: Real-time sensor reading analysis flagging brief spikes as *moderate* and sustained excursions (>2 hours) as *critical* compliance hazards.
- **Autonomous Rerouting & Mitigation**: Grounded AI reasoning providing verified route alternatives (e.g., Cape of Good Hope bypasses) with precise distance, transit days, and risk trade-offs.

---

## Key Features

- **Deterministic Disruption Matching**: Algorithmic intersection matching between disruption bounding areas/ports and shipment waypoints, legs, and destinations—completely eliminating hallucinated disruption associations.
- **Live Telemetry & Simulation Clock**: Deterministic vessel coordinate calculation based on departure timestamp, cruising speed, and nautical route segments, supporting 1x to 100x simulation speed.
- **Live OpenWeatherMap Marine Meteorology**: Real-time atmospheric conditions (wind speed, gusts, precipitation, condition) at the vessel's live coordinates, automatically applying speed reduction modifiers.
- **Regulatory Cold-Chain Excursion Engine**: Real-time sensor telemetry evaluation with interactive temperature charts and compliance status tracking.
- **Composite Risk Engine**: Multi-dimensional risk scoring combining weather severity, disruption severity, cold-chain status, and delay impact into a unified operational score.
- **Grounded BOB AI Copilot**: Load-bearing operational assistant powered by Google Gemini 1.5 Flash with automatic failover to Groq (Llama 3.1 8B), strictly constrained to live operational facts.
- **Cryptographic Transit Receipts**: Server-side PDF generation via ReportLab providing tamper-evident transit logs and compliance documentation.
- **Frictionless Judge Demo Flow**: Dedicated one-click guest access powered by Supabase Auth for immediate evaluation with zero configuration required.

---

## IBM Bob Integration & AI Architecture

BOB is fundamentally load-bearing to logistics operations, serving as the connective cognitive tissue between raw telemetry and operator decision-making.

### End-to-End Grounded Operational Flow

```
   ┌────────────────────────────────────────────────────────┐
   │ Operator Query: "Why is SHP-1003 delayed? Alternatives?"│
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 1. Operational Context Retrieval (FastAPI Engine)      │
   │    • Raw Shipment Data (Origin, Destination, Cargo)    │
   │    • Live Position & Route Segments (Simulation Clock) │
   │    • Live Weather at Coordinates (OpenWeatherMap API)  │
   │    • Matched Disruptions (Port Strike, Typhoon, Choke) │
   │    • Cold-Chain Sensor Log (Temp Timeseries, Excursion)│
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 2. Guardrail & Scope Verification (ai_guard.py)        │
   │    • Rejects out-of-scope queries (general trivia)     │
   │    • Enforces operational boundaries & citation schema │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 3. Dual-Provider AI Reasoning Pipeline                 │
   │    • Primary: Google Gemini 1.5 Flash (6s bounded)     │
   │    • Fallback: Groq Llama 3.1 8B (<1s ultra-low latency)│
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ 4. Grounded Output & Operational Action                │
   │    • Root cause explanation citing exact disruption    │
   │    • Concrete alternative routing options with km/days │
   │    • Regulatory compliance & quarantine instructions   │
   └────────────────────────────────────────────────────────┘
```

BOB never hallucinates shipment statuses or weather: if an API or sensor signal is missing, the system falls back gracefully to known simulation bounds and explicitly notes the signal source in the UI.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js 16 Frontend                           │
│     React 19 • Tailwind CSS 4 • Recharts • Leaflet Maps • Turbopack    │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
            Supabase Auth (JWT)             Same-Origin /svc/api/*
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│            Supabase Cloud            │  │       FastAPI Backend        │
│   PostgreSQL • Row-Level Security    │  │  Python 3.13 • Pydantic v2   │
│   250 Shipments • 12 Disruptions     │  │  Simulation • Weather • Risk │
└──────────────────────────────────────┘  └──────────────┬───────────────┘
                                                         │
                                        ┌────────────────┴───────────────┐
                                        ▼                                ▼
                         ┌─────────────────────────────┐  ┌──────────────┴──────────────┐
                         │      External Services      │  │     Resilient AI Engine     │
                         │ OpenWeatherMap API (Weather)│  │ Primary: Google Gemini      │
                         │ ReportLab (PDF Receipts)    │  │ Fallback: Groq (Llama 3.1)  │
                         └─────────────────────────────┘  └─────────────────────────────┘
```

---

## Tech Stack

| Domain | Technology | Key Libraries / Roles |
|---|---|---|
| **Frontend** | Next.js 16.3.3, React 19 | App Router, Turbopack, TypeScript 5.7, Tailwind CSS 4 |
| **Data Visualization** | Recharts, Leaflet | Interactive temperature charts, waypoint route rendering |
| **Backend** | FastAPI, Python 3.13 | High-concurrency async REST API, Pydantic v2 validation |
| **Database & Auth** | Supabase (PostgreSQL) | Row-Level Security (RLS), JWT validation, demo user session |
| **External APIs** | OpenWeatherMap | Real marine meteorology at vessel coordinates |
| **AI Providers** | Google Gemini, Groq | Gemini 1.5 Flash (primary), Groq Llama 3.1 8B (fallback) |
| **Document Engine** | ReportLab | Server-side PDF transit receipt generation |
| **Deployment** | Vercel Services | Production monorepo hosting Next.js + FastAPI under unified domain |

---

## Live Demo & Judge Walkthrough

**Production URL**: [https://bob-ai-hackathon-team-synora.vercel.app](https://bob-ai-hackathon-team-synora.vercel.app)

### Step-by-Step Evaluation Guide

1. **Enter Demo Mode**: Navigate to the production URL and click **"Enter Demo Mode"** on the login page. This provisions an authenticated Supabase session with pre-seeded demo telemetry.
2. **Review Operations Center**: Observe the fleet metrics banner displaying **250 total shipments**, **12 active disruptions**, **36 delayed shipments**, and cold-chain alert summaries.
3. **Inspect Disruption Feed**: Click on an active disruption in the left rail (e.g., *Rotterdam Port Congestion* or *Strait of Malacca Congestion*). Notice the instant algorithmic filtering of affected shipments.
4. **Drill into Shipment Intelligence**: Select an affected shipment (e.g., `SHP-1001` or `SHP-1003`):
   - **Route Progress**: Interactive waypoint sequence showing current leg and completed nautical segments.
   - **Live Tracking**: Real-time simulated coordinates, current vs. normal speed, progress percentage, and interactive map.
   - **Route Weather**: Real OpenWeatherMap data at the vessel's current position.
   - **Cold Chain Monitor**: For temperature-sensitive cargo, view the timeseries chart and regulatory compliance assessment.
5. **Ask BOB AI**: Open the persistent floating AI assistant in the lower right or click **"✦ Analyze with AI"** on any shipment detail:
   - Ask: *"Why is SHP-1003 delayed and what alternative routes are available?"*
   - Observe the multi-step reasoning indicator, grounded citations, and concrete rerouting recommendations.
6. **Download Transit Receipt**: Click **"Download Transit Receipt"** to generate a cryptographic PDF receipt for auditing.

*Detailed walkthrough instructions are documented in [demo/README.md](demo/README.md).*

---

## How to Run Locally

For full local development setup instructions, refer to [`docs/setup-guide.md`](docs/setup-guide.md).

### Quick Start

```bash
# 1. Clone repository
git clone https://github.com/Tanish01234/bob-ai-hackathon-team-synora.git
cd bob-ai-hackathon-team-synora

# 2. Frontend setup
cp .env.example .env.local
pnpm install
pnpm dev

# 3. Backend setup (in separate terminal)
cd backend
cp .env.example .env
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Known Limitations

1. **Simulated AIS Telemetry**: While weather data is fetched from live OpenWeatherMap APIs, vessel positions are derived from a high-precision deterministic simulation clock rather than live commercial satellite AIS transponders.
2. **Maritime Choke-Points**: Rerouting options (e.g., Cape of Good Hope detour) are pre-calculated against standard nautical corridors rather than dynamic oceanic bathymetry.
3. **AI Fallback Rate Limits**: In the event of extreme burst traffic, the system falls back from Gemini to Groq; if both fail, rule-based deterministic mitigation strategies are surfaced.

---

## What We're Most Proud Of

1. **Zero-Hallucination Disruption Engine**: Disruption matching is 100% deterministic code. An LLM is never allowed to guess whether a ship is affected by a storm; the geometry and routing math make that determination definitively.
2. **Sub-Second Intelligence Delivery**: With in-memory simulation clock caching, persistent HTTP connection pooling, and non-blocking weather evaluation, shipment tracking calculations execute in under **1 millisecond**.
3. **Production Stability & Monorepo Architecture**: Deployed seamlessly on Vercel Services uniting Next.js 16 with a native Python FastAPI backend over same-origin `/svc/api` routing, ensuring strict HTTPS and zero CORS friction.

---

## Submission Artifacts

- [`submission.yaml`](submission.yaml) — Official Hackathon metadata manifest
- [`docs/problem-statement.md`](docs/problem-statement.md) — Comprehensive problem framing
- [`docs/solution-overview.md`](docs/solution-overview.md) — Complete functional breakdown
- [`docs/architecture.md`](docs/architecture.md) — Architectural diagrams and data flows
- [`docs/setup-guide.md`](docs/setup-guide.md) — Step-by-step developer and judge setup guide
- [`demo/live-demo-url.txt`](demo/live-demo-url.txt) — Production deployment link
- [`demo/demo-video-link.txt`](demo/demo-video-link.txt) — Walkthrough video reference
- [`demo/README.md`](demo/README.md) — Judge demonstration guide
- [`demo/screenshots/`](demo/screenshots/) — Production interface captures
- [`presentation/slides.pdf`](presentation/slides.pdf) — Presentation slide deck
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — Contribution guidelines and security policies
