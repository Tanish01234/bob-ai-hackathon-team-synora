# Bob — Autonomous Supply Chain Risk Intelligence

Bob is an autonomous supply chain risk intelligence platform that monitors global disruptions, matches them to affected shipments using deterministic algorithms, detects cold-chain excursions using strict duration-temperature thresholds, and delivers AI-powered mitigation strategies with primary (Gemini) and fallback (Groq) intelligence.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 Frontend                      │
│      React 19 • Tailwind CSS 4 • Recharts • Supabase Auth   │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       JWT / Auth Token              REST API Requests
               │                               │
               ▼                               ▼
┌─────────────────────────────┐  ┌────────────────────────────┐
│      Supabase Auth          │  │       FastAPI Backend      │
│  PostgreSQL with RLS & DB   │  │  Python 3.13 • Pydantic v2 │
└─────────────────────────────┘  └─────────────┬──────────────┘
                                               │
                                       AI Prompt & Fallback
                                               │
                                               ▼
                                 ┌────────────────────────────┐
                                 │ Primary: Google Gemini     │
                                 │ Fallback: Groq (Llama 3.1) │
                                 └────────────────────────────┘
```

---

## Features

1. **Deterministic Disruption Matching**: Matches disruptions to route waypoints, current legs, and destinations without AI hallucinations.
2. **Cold Chain Integrity Engine**: Rule-based excursion detection (≤2 hrs = moderate, >2 hrs = critical) with regulatory context.
3. **Resilient AI Pipeline**: Primary analysis via Gemini 1.5 Flash (6s timeout) with automatic failover to Groq (Llama 3.1 8B).
4. **Row-Level Security (RLS)**: Complete user data isolation backed by Supabase PostgreSQL.
5. **Real-Time Operational UI**: Responsive dashboard with active alerts, detailed waypoint tracking, interactive temperature charts, and reasoning drawer.

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v20+ with `pnpm`
- **Python**: 3.11+
- **Supabase Account**: (Cloud or local)
- **API Keys**: Google Gemini API key and/or Groq API key

---

### 2. Supabase Setup

1. Create a new project in [Supabase](https://supabase.com).
2. Navigate to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/migrations/001_initial_schema.sql` and run the script. This creates:
   - `profiles`, `shipments`, `disruptions`, `sensor_logs`, `sensor_readings`
   - AI recommendation and analysis cache tables
   - Row Level Security (RLS) policies and triggers
4. Copy your project URL, Anon Key, Service Role Key, and JWT Secret from **Project Settings > API**.

---

### 3. Backend Setup

1. Open a terminal in `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in `.env`:
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key (for administrative access and seeding)
   - `SUPABASE_JWT_SECRET`: JWT secret (for token verification)
   - `GEMINI_API_KEY`: Google AI Studio key
   - `GROQ_API_KEY`: Groq Console API key
   - `FRONTEND_ORIGIN`: `http://localhost:3000`

4. Run unit tests:
   ```bash
   python3 -m pytest tests/ -v
   ```

5. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   Interactive API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 4. Seed Demo Data

After registering an account on the frontend (or retrieving your user UUID from the Supabase `auth.users` table), seed 200 synthetic shipments, 12 disruptions, and sensor logs:

```bash
cd backend
python3 -m data.seed --user-id <YOUR_SUPABASE_USER_UUID>
```

---

### 5. Frontend Setup

1. Open a terminal in the root `bob-supply-chain-intelligence/`:
   ```bash
   cp .env.example .env.local
   ```
2. Configure `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. Install dependencies and run development server:
   ```bash
   pnpm install
   pnpm dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Testing

- **Backend Unit Tests**:
  ```bash
  cd backend && python3 -m pytest tests/ -v
  ```
- **Frontend Typecheck**:
  ```bash
  pnpm exec tsc --noEmit
  ```
- **Production Build**:
  ```bash
  pnpm build
  ```
