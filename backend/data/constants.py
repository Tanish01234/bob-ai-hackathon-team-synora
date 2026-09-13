"""
Bob — Seed Data Constants
Routes, disruptions, and configuration for synthetic data generation.
Includes realistic coordinates, route segments, and distances.
"""

# ── Carriers ─────────────────────────────────────────────────
CARRIERS = [
    "Maersk", "MSC", "CMA CGM", "Evergreen",
    "Hapag-Lloyd", "COSCO", "ONE", "Yang Ming",
    "ZIM", "PIL", "Wan Hai", "HMM",
]

# ── Port / Waypoint Coordinates ──────────────────────────────
COORDINATES = {
    # Asia
    "Mumbai":         {"lat": 19.07,  "lng": 72.87},
    "Chennai":        {"lat": 13.08,  "lng": 80.27},
    "Singapore":      {"lat": 1.26,   "lng": 103.84},
    "Shanghai":       {"lat": 31.23,  "lng": 121.47},
    "Shenzhen":       {"lat": 22.54,  "lng": 114.06},
    "Tokyo":          {"lat": 35.65,  "lng": 139.84},
    "Busan":          {"lat": 35.10,  "lng": 129.03},
    "Colombo":        {"lat": 6.93,   "lng": 79.85},
    "Jeddah":         {"lat": 21.49,  "lng": 39.17},
    "Dubai":          {"lat": 25.27,  "lng": 55.30},
    "Kaohsiung":      {"lat": 22.61,  "lng": 120.30},

    # Europe
    "Rotterdam":      {"lat": 51.91,  "lng": 4.48},
    "Hamburg":         {"lat": 53.55,  "lng": 9.97},
    "Felixstowe":     {"lat": 51.96,  "lng": 1.35},
    "Antwerp":        {"lat": 51.22,  "lng": 4.40},
    "Bremerhaven":    {"lat": 53.55,  "lng": 8.58},
    "Piraeus":        {"lat": 37.94,  "lng": 23.63},

    # Americas
    "Los Angeles":    {"lat": 33.75,  "lng": -118.27},
    "Long Beach":     {"lat": 33.77,  "lng": -118.19},
    "New York":       {"lat": 40.68,  "lng": -74.04},
    "Savannah":       {"lat": 32.08,  "lng": -81.09},
    "Vancouver":      {"lat": 49.29,  "lng": -123.11},
    "Santos":         {"lat": -23.95, "lng": -46.30},

    # Africa
    "Durban":         {"lat": -29.87, "lng": 31.05},
    "Cape Town":      {"lat": -33.92, "lng": 18.42},

    # Strategic waterways
    "Suez Canal":     {"lat": 30.45,  "lng": 32.35},
    "Panama Canal":   {"lat": 9.08,   "lng": -79.68},
    "Gibraltar":      {"lat": 36.14,  "lng": -5.35},
    "Malacca Strait": {"lat": 2.50,   "lng": 101.80},
    "Cape of Good Hope": {"lat": -34.35, "lng": 18.49},
    "Bab el-Mandeb":  {"lat": 12.58,  "lng": 43.33},

    # Ocean midpoints (for interpolation)
    "Arabian Sea":    {"lat": 15.00,  "lng": 65.00},
    "Indian Ocean":   {"lat": -5.00,  "lng": 75.00},
    "Pacific Ocean":  {"lat": 30.00,  "lng": -170.00},
    "North Pacific":  {"lat": 40.00,  "lng": -160.00},
    "South Atlantic": {"lat": -20.00, "lng": -10.00},
    "North Atlantic": {"lat": 45.00,  "lng": -30.00},
    "North Sea":      {"lat": 55.00,  "lng": 5.00},
    "Mediterranean":  {"lat": 35.00,  "lng": 18.00},
    "Red Sea":        {"lat": 20.00,  "lng": 38.00},
    "Bay of Bengal":  {"lat": 12.00,  "lng": 85.00},
    "South China Sea":{"lat": 12.00,  "lng": 112.00},
    "East China Sea": {"lat": 28.00,  "lng": 125.00},
}

# ── Routes with segments and distances ───────────────────────
ROUTES = [
    {
        "id": "ROUTE-01",
        "origin": "Shanghai, CN",
        "destination": "Rotterdam, NL",
        "waypoints": ["Shanghai", "East China Sea", "Singapore", "Malacca Strait", "Indian Ocean", "Red Sea", "Suez Canal", "Mediterranean", "Gibraltar", "Rotterdam"],
        "segments": [
            {"from": "Shanghai", "to": "Singapore", "distance_km": 4600},
            {"from": "Singapore", "to": "Suez Canal", "distance_km": 8400},
            {"from": "Suez Canal", "to": "Rotterdam", "distance_km": 6400},
        ],
        "total_distance_km": 19400,
    },
    {
        "id": "ROUTE-02",
        "origin": "Los Angeles, US",
        "destination": "Hamburg, DE",
        "waypoints": ["Los Angeles", "Panama Canal", "North Atlantic", "Hamburg"],
        "segments": [
            {"from": "Los Angeles", "to": "Panama Canal", "distance_km": 4800},
            {"from": "Panama Canal", "to": "Hamburg", "distance_km": 9200},
        ],
        "total_distance_km": 14000,
    },
    {
        "id": "ROUTE-03",
        "origin": "Mumbai, IN",
        "destination": "New York, US",
        "waypoints": ["Mumbai", "Arabian Sea", "Red Sea", "Suez Canal", "Mediterranean", "Gibraltar", "North Atlantic", "New York"],
        "segments": [
            {"from": "Mumbai", "to": "Suez Canal", "distance_km": 4400},
            {"from": "Suez Canal", "to": "Gibraltar", "distance_km": 3200},
            {"from": "Gibraltar", "to": "New York", "distance_km": 5800},
        ],
        "total_distance_km": 13400,
    },
    {
        "id": "ROUTE-04",
        "origin": "Shenzhen, CN",
        "destination": "Felixstowe, UK",
        "waypoints": ["Shenzhen", "South China Sea", "Singapore", "Indian Ocean", "Red Sea", "Suez Canal", "Mediterranean", "Gibraltar", "Felixstowe"],
        "segments": [
            {"from": "Shenzhen", "to": "Singapore", "distance_km": 3200},
            {"from": "Singapore", "to": "Suez Canal", "distance_km": 8400},
            {"from": "Suez Canal", "to": "Felixstowe", "distance_km": 6200},
        ],
        "total_distance_km": 17800,
    },
    {
        "id": "ROUTE-05",
        "origin": "Busan, KR",
        "destination": "Los Angeles, US",
        "waypoints": ["Busan", "North Pacific", "Pacific Ocean", "Los Angeles"],
        "segments": [
            {"from": "Busan", "to": "Pacific Ocean", "distance_km": 5200},
            {"from": "Pacific Ocean", "to": "Los Angeles", "distance_km": 4600},
        ],
        "total_distance_km": 9800,
    },
    {
        "id": "ROUTE-06",
        "origin": "Rotterdam, NL",
        "destination": "Singapore, SG",
        "waypoints": ["Rotterdam", "North Sea", "Gibraltar", "Mediterranean", "Suez Canal", "Red Sea", "Indian Ocean", "Singapore"],
        "segments": [
            {"from": "Rotterdam", "to": "Suez Canal", "distance_km": 6400},
            {"from": "Suez Canal", "to": "Singapore", "distance_km": 8400},
        ],
        "total_distance_km": 14800,
    },
    {
        "id": "ROUTE-07",
        "origin": "Hamburg, DE",
        "destination": "Shanghai, CN",
        "waypoints": ["Hamburg", "North Sea", "Gibraltar", "Mediterranean", "Suez Canal", "Red Sea", "Indian Ocean", "Singapore", "South China Sea", "Shanghai"],
        "segments": [
            {"from": "Hamburg", "to": "Suez Canal", "distance_km": 6800},
            {"from": "Suez Canal", "to": "Singapore", "distance_km": 8400},
            {"from": "Singapore", "to": "Shanghai", "distance_km": 4600},
        ],
        "total_distance_km": 19800,
    },
    {
        "id": "ROUTE-08",
        "origin": "Jeddah, SA",
        "destination": "Rotterdam, NL",
        "waypoints": ["Jeddah", "Red Sea", "Suez Canal", "Mediterranean", "Gibraltar", "North Atlantic", "Rotterdam"],
        "segments": [
            {"from": "Jeddah", "to": "Suez Canal", "distance_km": 1400},
            {"from": "Suez Canal", "to": "Rotterdam", "distance_km": 6400},
        ],
        "total_distance_km": 7800,
    },
    {
        "id": "ROUTE-09",
        "origin": "Tokyo, JP",
        "destination": "Vancouver, CA",
        "waypoints": ["Tokyo", "North Pacific", "Pacific Ocean", "Vancouver"],
        "segments": [
            {"from": "Tokyo", "to": "Pacific Ocean", "distance_km": 4400},
            {"from": "Pacific Ocean", "to": "Vancouver", "distance_km": 3900},
        ],
        "total_distance_km": 8300,
    },
    {
        "id": "ROUTE-10",
        "origin": "Durban, ZA",
        "destination": "Shanghai, CN",
        "waypoints": ["Durban", "Indian Ocean", "Colombo", "Malacca Strait", "Singapore", "South China Sea", "Shanghai"],
        "segments": [
            {"from": "Durban", "to": "Singapore", "distance_km": 8600},
            {"from": "Singapore", "to": "Shanghai", "distance_km": 4600},
        ],
        "total_distance_km": 13200,
    },
    {
        "id": "ROUTE-11",
        "origin": "Chennai, IN",
        "destination": "Rotterdam, NL",
        "waypoints": ["Chennai", "Bay of Bengal", "Colombo", "Arabian Sea", "Red Sea", "Suez Canal", "Mediterranean", "Gibraltar", "Rotterdam"],
        "segments": [
            {"from": "Chennai", "to": "Colombo", "distance_km": 1100},
            {"from": "Colombo", "to": "Suez Canal", "distance_km": 5200},
            {"from": "Suez Canal", "to": "Rotterdam", "distance_km": 6400},
        ],
        "total_distance_km": 12700,
    },
    {
        "id": "ROUTE-12",
        "origin": "Dubai, AE",
        "destination": "Hamburg, DE",
        "waypoints": ["Dubai", "Arabian Sea", "Red Sea", "Bab el-Mandeb", "Suez Canal", "Mediterranean", "Gibraltar", "North Atlantic", "Hamburg"],
        "segments": [
            {"from": "Dubai", "to": "Suez Canal", "distance_km": 3200},
            {"from": "Suez Canal", "to": "Hamburg", "distance_km": 6800},
        ],
        "total_distance_km": 10000,
    },
    {
        "id": "ROUTE-13",
        "origin": "Mumbai, IN",
        "destination": "Rotterdam, NL",
        "waypoints": ["Mumbai", "Arabian Sea", "Cape of Good Hope", "South Atlantic", "North Atlantic", "Rotterdam"],
        "segments": [
            {"from": "Mumbai", "to": "Cape of Good Hope", "distance_km": 9800},
            {"from": "Cape of Good Hope", "to": "Rotterdam", "distance_km": 11400},
        ],
        "total_distance_km": 21200,
    },
    {
        "id": "ROUTE-14",
        "origin": "Singapore, SG",
        "destination": "Los Angeles, US",
        "waypoints": ["Singapore", "South China Sea", "Pacific Ocean", "North Pacific", "Los Angeles"],
        "segments": [
            {"from": "Singapore", "to": "Pacific Ocean", "distance_km": 8800},
            {"from": "Pacific Ocean", "to": "Los Angeles", "distance_km": 5600},
        ],
        "total_distance_km": 14400,
    },
    {
        "id": "ROUTE-15",
        "origin": "Shanghai, CN",
        "destination": "New York, US",
        "waypoints": ["Shanghai", "East China Sea", "North Pacific", "Pacific Ocean", "Panama Canal", "North Atlantic", "New York"],
        "segments": [
            {"from": "Shanghai", "to": "Panama Canal", "distance_km": 16800},
            {"from": "Panama Canal", "to": "New York", "distance_km": 3400},
        ],
        "total_distance_km": 20200,
    },
    {
        "id": "ROUTE-16",
        "origin": "Busan, KR",
        "destination": "Rotterdam, NL",
        "waypoints": ["Busan", "East China Sea", "South China Sea", "Singapore", "Indian Ocean", "Suez Canal", "Mediterranean", "Gibraltar", "Rotterdam"],
        "segments": [
            {"from": "Busan", "to": "Singapore", "distance_km": 4600},
            {"from": "Singapore", "to": "Suez Canal", "distance_km": 8400},
            {"from": "Suez Canal", "to": "Rotterdam", "distance_km": 6400},
        ],
        "total_distance_km": 19400,
    },
]

# ── Alternative route templates (for rerouting at-risk shipments) ─
ALTERNATIVE_ROUTES = {
    "suez_to_cape": {
        "name": "Cape of Good Hope Route",
        "description": "Bypass Suez Canal via Cape of Good Hope",
        "extra_distance_km": 6000,
        "extra_duration_days": 8,
    },
    "panama_alt": {
        "name": "Suez Alternative",
        "description": "Reroute via Suez Canal instead of Panama",
        "extra_distance_km": 4000,
        "extra_duration_days": 5,
    },
    "colombo_bypass": {
        "name": "Colombo Bypass Route",
        "description": "Bypass Singapore via Colombo and Indian Ocean",
        "extra_distance_km": 800,
        "extra_duration_days": 1,
    },
    "antwerp_diversion": {
        "name": "Antwerp Diversion",
        "description": "Divert to Antwerp instead of Rotterdam",
        "extra_distance_km": 60,
        "extra_duration_days": 0,
    },
    "bremerhaven_diversion": {
        "name": "Bremerhaven Diversion",
        "description": "Divert to Bremerhaven instead of Hamburg",
        "extra_distance_km": 100,
        "extra_duration_days": 0,
    },
    "long_beach_diversion": {
        "name": "Long Beach Diversion",
        "description": "Divert to Long Beach instead of Los Angeles",
        "extra_distance_km": 10,
        "extra_duration_days": 0,
    },
}

# ── Cargo type distribution ──────────────────────────────────
# 40% standard, 20% electronics, 20% vaccine, 10% perishable, 10% frozen_goods
CARGO_MIX = (
    ["standard"] * 40
    + ["electronics"] * 20
    + ["vaccine"] * 20
    + ["perishable"] * 10
    + ["frozen_goods"] * 10
)

COLD_CHAIN_TYPES = {"vaccine", "perishable", "frozen_goods"}

SAFE_RANGES = {
    "vaccine":      {"min": 2.0, "max": 8.0},
    "frozen_goods": {"min": None, "max": -18.0},
    "perishable":   {"min": 0.0, "max": 4.0},
}

# ── Cargo value ranges (USD) ────────────────────────────────
CARGO_VALUE_RANGES = {
    "vaccine":      (180_000, 1_200_000),
    "frozen_goods": (120_000, 800_000),
    "perishable":   (45_000, 350_000),
    "electronics":  (250_000, 1_500_000),
    "standard":     (35_000, 500_000),
}

# ── Vessel speed ranges (knots) ──────────────────────────────
SPEED_RANGES = {
    "min_knots": 14.0,
    "max_knots": 22.0,
    "port_approach_knots": 8.0,
    "docked_knots": 0.0,
}

# 1 knot ≈ 1.852 km/h
KNOT_TO_KMH = 1.852

# ── Disruption seed data ─────────────────────────────────────
DISRUPTIONS_SEED = [
    {"disruption_id": "DIS-01", "type": "port_strike", "location": "Rotterdam, NL", "severity": "high", "start_date": "2026-09-14", "expected_duration_days": 5, "description": "Dockworkers union strike halting all container operations at Rotterdam port.", "lat": 51.91, "lng": 4.48},
    {"disruption_id": "DIS-02", "type": "weather_event", "location": "Suez Canal", "severity": "high", "start_date": "2026-09-12", "expected_duration_days": 3, "description": "Severe sandstorm causing reduced visibility and temporary closure of Suez Canal transit.", "lat": 30.45, "lng": 32.35},
    {"disruption_id": "DIS-03", "type": "geopolitical_crisis", "location": "Singapore", "severity": "medium", "start_date": "2026-09-10", "expected_duration_days": 7, "description": "Regional trade tensions causing extended customs inspections at Singapore port.", "lat": 1.26, "lng": 103.84},
    {"disruption_id": "DIS-04", "type": "port_strike", "location": "Los Angeles, US", "severity": "high", "start_date": "2026-09-13", "expected_duration_days": 6, "description": "Longshoremen strike at Port of Los Angeles affecting west coast operations.", "lat": 33.75, "lng": -118.27},
    {"disruption_id": "DIS-05", "type": "weather_event", "location": "Hamburg, DE", "severity": "medium", "start_date": "2026-09-11", "expected_duration_days": 2, "description": "Storm system causing rough North Sea conditions and port closure at Hamburg.", "lat": 53.55, "lng": 9.97},
    {"disruption_id": "DIS-06", "type": "geopolitical_crisis", "location": "Shanghai, CN", "severity": "medium", "start_date": "2026-09-09", "expected_duration_days": 4, "description": "Export control measures causing cargo inspection delays at Shanghai port.", "lat": 31.23, "lng": 121.47},
    {"disruption_id": "DIS-07", "type": "weather_event", "location": "Pacific Ocean", "severity": "low", "start_date": "2026-09-13", "expected_duration_days": 2, "description": "Tropical storm tracking across trans-Pacific routes causing vessel rerouting.", "lat": 30.00, "lng": -170.00},
    {"disruption_id": "DIS-08", "type": "geopolitical_crisis", "location": "Suez Canal", "severity": "high", "start_date": "2026-09-08", "expected_duration_days": 10, "description": "Security incidents in Red Sea forcing vessels to reroute around Cape of Good Hope.", "lat": 12.58, "lng": 43.33},
    {"disruption_id": "DIS-09", "type": "port_strike", "location": "Busan, KR", "severity": "medium", "start_date": "2026-09-12", "expected_duration_days": 3, "description": "Container terminal workers strike causing significant backlog at Busan port.", "lat": 35.10, "lng": 129.03},
    {"disruption_id": "DIS-10", "type": "weather_event", "location": "Mumbai, IN", "severity": "medium", "start_date": "2026-09-11", "expected_duration_days": 2, "description": "Monsoon intensification causing port operations suspension at Nhava Sheva.", "lat": 19.07, "lng": 72.87},
    {"disruption_id": "DIS-11", "type": "geopolitical_crisis", "location": "Panama Canal", "severity": "low", "start_date": "2026-09-10", "expected_duration_days": 5, "description": "Water level restrictions limiting daily vessel transits through Panama Canal.", "lat": 9.08, "lng": -79.68},
    {"disruption_id": "DIS-12", "type": "port_strike", "location": "Felixstowe, UK", "severity": "low", "start_date": "2026-09-14", "expected_duration_days": 2, "description": "Planned 48-hour walkout by Felixstowe port workers over pay dispute.", "lat": 51.96, "lng": 1.35},
]
