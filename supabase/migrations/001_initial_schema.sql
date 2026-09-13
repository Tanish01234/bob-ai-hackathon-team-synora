-- ============================================================
-- Bob — Supply Chain Intelligence
-- Supabase PostgreSQL Schema Migration
-- Version: 001_initial_schema
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
-- gen_random_uuid() is available by default in Supabase

-- ── Helper: updated_at trigger function ──────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Helper: auto-create profile on signup ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TABLES
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Shipments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipment_id     TEXT NOT NULL,
  origin          TEXT NOT NULL,
  destination     TEXT NOT NULL,
  current_leg     TEXT NOT NULL DEFAULT '',
  route_waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  carrier         TEXT NOT NULL DEFAULT '',
  cargo_type      TEXT NOT NULL CHECK (cargo_type IN ('electronics', 'vaccine', 'frozen_goods', 'perishable', 'standard')),
  eta             DATE,
  status          TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit', 'delayed', 'delivered')),
  value_usd       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, shipment_id)
);

CREATE TRIGGER shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Disruptions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disruptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disruption_id           TEXT NOT NULL,
  type                    TEXT NOT NULL CHECK (type IN ('port_strike', 'weather_event', 'geopolitical_crisis')),
  location                TEXT NOT NULL,
  severity                TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  start_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_duration_days  INTEGER NOT NULL DEFAULT 1,
  description             TEXT NOT NULL DEFAULT '',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, disruption_id)
);

CREATE TRIGGER disruptions_updated_at
  BEFORE UPDATE ON public.disruptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Sensor Logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sensor_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  cargo_type  TEXT NOT NULL CHECK (cargo_type IN ('vaccine', 'frozen_goods', 'perishable')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Sensor Readings ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_log_id  UUID NOT NULL REFERENCES public.sensor_logs(id) ON DELETE CASCADE,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT now(),
  temp_c         NUMERIC(6,2) NOT NULL,
  leg            TEXT NOT NULL DEFAULT '',
  in_range       BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Disruption Recommendations (AI cache) ────────────────────
CREATE TABLE IF NOT EXISTS public.disruption_recommendations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disruption_id         UUID NOT NULL REFERENCES public.disruptions(id) ON DELETE CASCADE,
  shipment_id           UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  estimated_delay_days  INTEGER NOT NULL DEFAULT 0,
  risk_level            TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  recommended_action    TEXT NOT NULL CHECK (recommended_action IN ('reroute', 'hold', 'alternate_carrier')),
  justification         TEXT NOT NULL DEFAULT '',
  ai_provider           TEXT NOT NULL DEFAULT 'gemini' CHECK (ai_provider IN ('gemini', 'groq')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER disruption_recommendations_updated_at
  BEFORE UPDATE ON public.disruption_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Cold Chain Analyses (AI cache) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.cold_chain_analyses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipment_id               UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  excursion_status          TEXT NOT NULL CHECK (excursion_status IN ('critical', 'moderate', 'normal')),
  max_breach_temp           NUMERIC(6,2),
  breach_duration_hours     NUMERIC(6,2),
  leg                       TEXT,
  started_at                TIMESTAMPTZ,
  ended_at                  TIMESTAMPTZ,
  ai_summary                TEXT,
  severity_classification   TEXT,
  regulatory_note           TEXT,
  ai_provider               TEXT CHECK (ai_provider IN ('gemini', 'groq')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER cold_chain_analyses_updated_at
  BEFORE UPDATE ON public.cold_chain_analyses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_shipments_user_id     ON public.shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_shipment_id ON public.shipments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status      ON public.shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_cargo_type  ON public.shipments(cargo_type);

CREATE INDEX IF NOT EXISTS idx_disruptions_user_id       ON public.disruptions(user_id);
CREATE INDEX IF NOT EXISTS idx_disruptions_disruption_id ON public.disruptions(disruption_id);
CREATE INDEX IF NOT EXISTS idx_disruptions_location      ON public.disruptions(location);

CREATE INDEX IF NOT EXISTS idx_sensor_logs_user_id     ON public.sensor_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sensor_logs_shipment_id ON public.sensor_logs(shipment_id);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_log_id ON public.sensor_readings(sensor_log_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp     ON public.sensor_readings(timestamp);

CREATE INDEX IF NOT EXISTS idx_disruption_recs_user_id       ON public.disruption_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_disruption_recs_disruption_id ON public.disruption_recommendations(disruption_id);
CREATE INDEX IF NOT EXISTS idx_disruption_recs_shipment_id   ON public.disruption_recommendations(shipment_id);

CREATE INDEX IF NOT EXISTS idx_cold_chain_user_id     ON public.cold_chain_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_cold_chain_shipment_id ON public.cold_chain_analyses(shipment_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruptions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruption_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_chain_analyses       ENABLE ROW LEVEL SECURITY;

-- ── Profiles: users can read/update their own profile ────────
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Shipments: full CRUD for own records ─────────────────────
CREATE POLICY "Users can view own shipments"
  ON public.shipments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shipments"
  ON public.shipments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shipments"
  ON public.shipments FOR DELETE
  USING (auth.uid() = user_id);

-- ── Disruptions: full CRUD for own records ───────────────────
CREATE POLICY "Users can view own disruptions"
  ON public.disruptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disruptions"
  ON public.disruptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own disruptions"
  ON public.disruptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own disruptions"
  ON public.disruptions FOR DELETE
  USING (auth.uid() = user_id);

-- ── Sensor Logs: full CRUD for own records ───────────────────
CREATE POLICY "Users can view own sensor logs"
  ON public.sensor_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sensor logs"
  ON public.sensor_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sensor logs"
  ON public.sensor_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ── Sensor Readings: access via sensor_log ownership ─────────
CREATE POLICY "Users can view own sensor readings"
  ON public.sensor_readings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sensor_logs sl
      WHERE sl.id = sensor_readings.sensor_log_id
        AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sensor readings"
  ON public.sensor_readings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sensor_logs sl
      WHERE sl.id = sensor_readings.sensor_log_id
        AND sl.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sensor readings"
  ON public.sensor_readings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sensor_logs sl
      WHERE sl.id = sensor_readings.sensor_log_id
        AND sl.user_id = auth.uid()
    )
  );

-- ── Disruption Recommendations: own records ──────────────────
CREATE POLICY "Users can view own disruption recommendations"
  ON public.disruption_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disruption recommendations"
  ON public.disruption_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own disruption recommendations"
  ON public.disruption_recommendations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own disruption recommendations"
  ON public.disruption_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- ── Cold Chain Analyses: own records ─────────────────────────
CREATE POLICY "Users can view own cold chain analyses"
  ON public.cold_chain_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cold chain analyses"
  ON public.cold_chain_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cold chain analyses"
  ON public.cold_chain_analyses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cold chain analyses"
  ON public.cold_chain_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
