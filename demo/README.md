# Judge Demo Guide — BOB Supply Chain Intelligence

Welcome, Hackathon Evaluators! This guide outlines the 12-step evaluation journey for experiencing **BOB Supply Chain Intelligence** in live production.

- **Live Production URL**: [https://bob-ai-hackathon-team-synora.vercel.app](https://bob-ai-hackathon-team-synora.vercel.app)
- **Demo Mode Credentials**: Instant guest session via **"Enter Demo Mode"** button (or email: `judge@bob.ai`, password: `BOB2026Demo`)

---

## The 12-Step Judge Evaluation Journey

### Step 1: Open the Production Application
Navigate to [https://bob-ai-hackathon-team-synora.vercel.app](https://bob-ai-hackathon-team-synora.vercel.app). Notice that unauthenticated visitors are safely greeted with the clean, professional login page rather than an unauthenticated blank dashboard.

### Step 2: Enter Demo Mode
Click the prominent **"Enter Demo Mode"** button. This automatically establishes an authenticated Supabase session and attaches a genuine JWT Bearer token to all backend API calls.

### Step 3: View the Operations Center
You will land on the live Operations Center. Notice the responsive dark naval aesthetic, high-contrast indicators, and real-time operational status.

### Step 4: Review High-Level Fleet Metrics
Inspect the top metrics bar:
- **Total Shipments**: 250 in-transit commercial shipments.
- **Active Disruptions**: 12 critical global events.
- **Delayed Shipments**: 36 shipments currently impacted by adverse conditions.
- **Cold Chain Status**: 8 critical excursions and 12 moderate excursions detected.

### Step 5: Explore Active Disruptions
In the left-hand Disruption Feed, browse through the 12 active events:
- *Rotterdam Port Congestion* (Port strike, High severity)
- *Strait of Malacca Congestion* (Choke-point traffic, Medium severity)
- *Typhoon Malakas* (Severe marine weather, High severity)
- *Red Sea Maritime Advisory* (Geopolitical conflict, High severity)

### Step 6: Select an Affected Shipment
Click on **Rotterdam Port Congestion**. Notice how the list of shipments below the disruption immediately updates using deterministic intersection matching. Click on **`SHP-1003`** (or `SHP-1001`) to open the detailed intelligence view.

### Step 7: Review Live Tracking & Nautical Progress
In the main workspace:
- Observe the **Nautical Waypoint Sequence**: Shows completed waypoints, the current active leg, and upcoming ports.
- Review **Live Tracking**: Current speed (knots), normal cruising speed, distance travelled vs. remaining, and progress percentage.
- Inspect the **Interactive Leaflet Route Map**: Renders the complete planned path and live calculated vessel coordinate.

### Step 8: Verify Route Weather Integration
Inspect the **Route Weather** card:
- Displays real-time atmospheric data fetched directly from **OpenWeatherMap** at the vessel's current coordinates.
- Displays wind speed, gusts, precipitation, and condition.
- Notice that severe weather automatically applies speed reduction modifiers to the vessel, propagating realistic ETA delays.

### Step 9: Examine Cold-Chain Integrity & Risk
Scroll to the **Cold Chain Monitor** (for temperature-sensitive cargo such as vaccines or frozen goods):
- Interactive timeseries chart displaying temperature sensor readings across transit legs.
- Clear regulatory status indicators highlighting whether excursions stayed within acceptable limits (≤2 hours) or breached critical thresholds (>2 hours, GDP/FDA violation risk).

### Step 10: Launch the Grounded BOB AI Copilot
Open the persistent floating AI assistant in the lower-right corner (or click **"✦ Analyze with AI"** on the shipment card).

### Step 11: Ask an Operational Question
Type or select an operational question:
- *"Why is SHP-1003 delayed, and what are the alternative routes?"*
- *"What is the fleet status and which cold-chain shipments are in critical condition?"*

### Step 12: Review Grounded AI Output & Mitigation
Observe the response:
- Multi-step reasoning indicator (*"Checking location...", "Evaluating disruptions...", "Calculating alternatives..."*).
- Grounded explanation citing exact disruption names, weather conditions, and cold-chain sensor status.
- Concrete alternative routes with exact additional distance (+6,250 km), transit days (+7.5 days), and risk assessments.
- Verified sources section citing the exact operational records used.

---

## Understanding Real vs. Simulated Telemetry

To ensure complete transparency and academic integrity:

| Signal | Source Type | Implementation Details |
|---|---|---|
| **Atmospheric Marine Weather** | **Real External API** | Live calls to OpenWeatherMap API using vessel's current coordinates. |
| **AI Reasoning & Rerouting** | **Real Dual-Model AI** | Google Gemini 1.5 Flash (primary) + Groq Llama 3.1 8B (fallback). |
| **Vessel AIS Positions** | **Deterministic Simulation** | High-precision mathematical interpolation along real nautical waypoints. |
| **Disruption Events** | **Curated Operational Scenarios** | 12 realistic maritime bottleneck, storm, and strike scenarios. |
| **Cold-Chain Sensor Logs** | **Synthetic Telemetry** | Realistic temperature logs modeled after pharma IoT data loggers. |
| **PDF Transit Receipts** | **Real Server-Side Engine** | Dynamically generated PDF receipts compiled via ReportLab. |
