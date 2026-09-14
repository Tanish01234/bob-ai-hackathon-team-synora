# Setup & Deployment Guide — BOB Supply Chain Intelligence

This guide walks through configuring, running, testing, and deploying **BOB Supply Chain Intelligence** for both local development and production evaluation.

---

## 1. Prerequisites

Verify that your local workstation meets the following runtime requirements:

| Tool | Minimum Version | Recommended Version | Verification Command |
|---|---|---|---|
| **Node.js** | `v20.0.0` | `v24.8.0` (LTS) | `node -v` |
| **pnpm** | `v9.0.0` | `v10.5.0` | `pnpm -v` |
| **Python** | `3.11` | `3.13` | `python3 --version` |
| **Git** | `2.30+` | Latest | `git --version` |

---

## 2. Repository Setup

Clone the repository to your local workspace:

```bash
git clone https://github.com/Tanish01234/bob-ai-hackathon-team-synora.git
cd bob-ai-hackathon-team-synora
```

---

## 3. Environment Variables

The application strictly separates **Public Frontend Variables** (safe for client bundles) from **Private Backend Credentials** (server-side only).

### A. Frontend Environment (`.env.local`)
Create `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Configure the public variables:

```env
# Public Supabase credentials (client-side auth initialization)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Local API URL (only needed if running frontend separate from Vercel proxy)
# For local dev with separate ports, use http://localhost:8000
# For production or Vercel local dev, leave blank or omit to use same-origin /svc/api
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### B. Backend Environment (`backend/.env`)
Create `.env` in the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Configure the backend variables:

```env
# Database & Authentication (Private — Never commit to git)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# AI Intelligence Providers
GEMINI_API_KEY=your-google-gemini-api-key
GROQ_API_KEY=your-groq-api-key

# Meteorology API
OPENWEATHER_API_KEY=your-openweathermap-api-key

# CORS Security
FRONTEND_ORIGIN=http://localhost:3000
```

> [!CAUTION]
> Never commit `backend/.env`, `backend/.env.local`, or any actual API keys to Git. These files are excluded by `.gitignore`.

---

## 4. Supabase Database Setup

1. Create a free account at [Supabase](https://supabase.com) and create a new project.
2. Navigate to the **SQL Editor** in your Supabase project dashboard.
3. Execute the schema migration script located in the repository:
   - Copy the contents of [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql).
   - Paste into the Supabase SQL Editor and click **Run**.
4. Retrieve your project credentials from **Project Settings > API**:
   - `Project URL` → `SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT Secret` → `SUPABASE_JWT_SECRET`

---

## 5. Local Development Execution

### Terminal 1: Frontend Development Server

From the repository root:

```bash
# Install Node dependencies
pnpm install

# Start Next.js development server with Turbopack
pnpm dev
```
The frontend will be available at [http://localhost:3000](http://localhost:3000).

### Terminal 2: Backend Development Server

From the `backend/` directory:

```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI with hot-reload
uvicorn main:app --reload --port 8000
```
The FastAPI API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 6. Seeding Demo Telemetry (Local Only)

To populate your local Supabase database with the canonical **250 shipments**, **12 disruptions**, and sensor logs:

```bash
cd backend
python3 -m data.seed --user-id <YOUR_SUPABASE_USER_UUID>
```

*(Note: In the live production deployment, demo telemetry is already seeded and accessible via Judge Demo Mode).*

---

## 7. Production Evaluation (Zero Setup)

Evaluators do not need to run local servers. The application is continuously deployed to Vercel:

- **Production URL**: [https://bob-ai-hackathon-team-synora.vercel.app](https://bob-ai-hackathon-team-synora.vercel.app)
- **Routing**: Next.js and FastAPI run as co-located Vercel Services under the same domain. All backend API calls route through `/svc/api/*`, eliminating CORS restrictions and third-party host latency.

### The 7-Step Judge Evaluation Walkthrough:

1. Open [https://bob-ai-hackathon-team-synora.vercel.app](https://bob-ai-hackathon-team-synora.vercel.app).
2. Click **"Enter Demo Mode"** on the login page (or sign in with `judge@bob.ai` / `BOB2026Demo`).
3. You will immediately enter the Operations Center with **250 active shipments** and **12 disruptions**.
4. Click on an active disruption in the left panel (e.g., *Rotterdam Port Congestion*). Notice the instant algorithmic filtering of affected shipments.
5. Select an affected shipment (e.g., `SHP-1001` or `SHP-1003`). Review the live tracking map, waypoint sequence, real OpenWeatherMap atmospheric data, and cold-chain compliance status.
6. Open the floating **BOB AI panel** in the lower right or click **"✦ Analyze with AI"**.
7. Ask an operational question, such as: *"Why is SHP-1003 delayed, and what alternative routes are available?"* Review the verified reasoning, citations, and rerouting metrics.

---

## 8. Verification & Quality Checks

Run the following test commands to verify codebase health:

```bash
# 1. Frontend TypeScript typecheck
pnpm exec tsc --noEmit

# 2. Frontend production build
pnpm run build

# 3. Backend automated test suite (34 unit & integration tests)
PYTHONPATH=backend pytest backend/tests/

# 4. End-to-end stability & auth test
python3 scratch/test_ai_stability_e2e.py
```

---

## 9. Troubleshooting

### Issue: "Demo access is temporarily unavailable"
- **Cause**: Supabase credentials missing or invalid in production environment.
- **Resolution**: Verify that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured in Vercel project environment variables.

### Issue: Backend returns 401 on protected endpoints
- **Cause**: Request sent without valid Supabase JWT Bearer token.
- **Resolution**: Authenticate via the login screen or click **"Enter Demo Mode"** to provision a valid session.

### Issue: OpenWeatherMap returns unknown weather
- **Cause**: Rate limit or missing `OPENWEATHER_API_KEY`.
- **Resolution**: The system automatically degrades gracefully to default conditions without blocking vessel tracking or crashing the dashboard.
