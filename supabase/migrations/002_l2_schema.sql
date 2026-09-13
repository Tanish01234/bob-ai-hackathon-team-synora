-- ============================================================
-- BOB L2 — Schema additions for end-to-end intelligence
-- Run this migration AFTER the base schema is in place.
-- ============================================================

-- ── Add tracking columns to shipments ──────────────────────
ALTER TABLE shipments
    ADD COLUMN IF NOT EXISTS departure_time timestamptz,
    ADD COLUMN IF NOT EXISTS cruising_speed_knots float DEFAULT 18.0,
    ADD COLUMN IF NOT EXISTS route_segments jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS total_distance_km float DEFAULT 0,
    ADD COLUMN IF NOT EXISTS route_id text;

-- ── Add coordinate columns to disruptions ──────────────────
ALTER TABLE disruptions
    ADD COLUMN IF NOT EXISTS lat float,
    ADD COLUMN IF NOT EXISTS lng float,
    ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- ── Simulation state (singleton table) ─────────────────────
CREATE TABLE IF NOT EXISTS simulation_state (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    is_running boolean DEFAULT true,
    speed_multiplier float DEFAULT 1.0,
    base_time timestamptz DEFAULT now(),
    wall_time_at_base timestamptz DEFAULT now(),
    paused_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ── Weather snapshots ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS weather_snapshots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    latitude float NOT NULL,
    longitude float NOT NULL,
    temperature_c float,
    wind_speed_kmh float,
    wind_gust_kmh float,
    precipitation_probability float,
    precipitation_mm float,
    condition text,
    severity text DEFAULT 'normal',
    humidity float,
    visibility_km float,
    fetched_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- ── Alerts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    shipment_id text NOT NULL,
    type text NOT NULL,
    severity text NOT NULL DEFAULT 'medium',
    title text NOT NULL,
    message text,
    recommended_action text,
    acknowledged boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- ── AI Assessments (cached) ────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_assessments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    shipment_id text NOT NULL,
    state_hash text NOT NULL,
    model text,
    risk_level text,
    recommended_action text,
    explanation text,
    full_response jsonb,
    created_at timestamptz DEFAULT now()
);

-- ── Risk events log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risk_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    shipment_id text NOT NULL,
    previous_risk text,
    new_risk text,
    trigger_type text,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

-- ── Add role to profiles ───────────────────────────────────
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_weather_snapshots_shipment
    ON weather_snapshots(shipment_id, fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_shipment
    ON alerts(shipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_user
    ON alerts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_assessments_hash
    ON ai_assessments(shipment_id, state_hash);

CREATE INDEX IF NOT EXISTS idx_risk_events_shipment
    ON risk_events(shipment_id, created_at DESC);

-- ── RLS policies ───────────────────────────────────────────
-- In PostgreSQL, CREATE POLICY does not support IF NOT EXISTS.
-- DROP POLICY IF EXISTS followed by CREATE POLICY is the standard idempotent pattern.

-- Weather snapshots
ALTER TABLE weather_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own weather data" ON weather_snapshots;
CREATE POLICY "Users can view own weather data"
    ON weather_snapshots FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own weather data" ON weather_snapshots;
CREATE POLICY "Users can insert own weather data"
    ON weather_snapshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own alerts" ON alerts;
CREATE POLICY "Users can view own alerts"
    ON alerts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own alerts" ON alerts;
CREATE POLICY "Users can insert own alerts"
    ON alerts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
CREATE POLICY "Users can update own alerts"
    ON alerts FOR UPDATE
    USING (auth.uid() = user_id);

-- AI Assessments
ALTER TABLE ai_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own assessments" ON ai_assessments;
CREATE POLICY "Users can view own assessments"
    ON ai_assessments FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own assessments" ON ai_assessments;
CREATE POLICY "Users can insert own assessments"
    ON ai_assessments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Risk events
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own risk events" ON risk_events;
CREATE POLICY "Users can view own risk events"
    ON risk_events FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own risk events" ON risk_events;
CREATE POLICY "Users can insert own risk events"
    ON risk_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Simulation state
ALTER TABLE simulation_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated to view simulation_state" ON simulation_state;
CREATE POLICY "Allow authenticated to view simulation_state"
    ON simulation_state FOR SELECT
    TO authenticated
    USING (true);

-- ── Insert initial simulation state ────────────────────────
INSERT INTO simulation_state (is_running, speed_multiplier, base_time, wall_time_at_base)
SELECT true, 1.0, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM simulation_state);
