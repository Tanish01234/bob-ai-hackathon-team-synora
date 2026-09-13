# Bob — Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose an organization, name it (e.g., `bob-supply-chain`), set a database password, and select a region close to you.
4. Wait for the project to finish provisioning.

## 2. Enable Email/Password Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**.
2. Ensure **Email** is enabled (it is by default).
3. For the hackathon, you may want to disable **Confirm email** under **Authentication** → **Settings** → **Email Auth** to skip email verification.

## 3. Get Your Keys

From the Supabase dashboard → **Settings** → **API**:

| Key | Usage |
|-----|-------|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL` |
| **anon / public key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role key** | `SUPABASE_SERVICE_ROLE_KEY` (backend only, NEVER expose to browser) |

## 4. Run the SQL Migration

1. In the Supabase dashboard, go to **SQL Editor**.
2. Click **New Query**.
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` and paste it.
4. Click **Run**.
5. Verify all tables appear under **Table Editor**: `profiles`, `shipments`, `disruptions`, `sensor_logs`, `sensor_readings`, `disruption_recommendations`, `cold_chain_analyses`.

## 5. Configure Environment Variables

### Frontend (`bob-supply-chain-intelligence/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Backend (`backend/.env`)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
```

> **JWT Secret**: Find this under **Settings** → **API** → **JWT Secret** in Supabase dashboard.

## 6. Create Your First User

1. Go to the running frontend at `http://localhost:3000/register`.
2. Enter your name, email, and password.
3. Copy your user UUID from Supabase dashboard → **Authentication** → **Users**.

## 7. Seed Demo Data

```bash
cd backend
python -m data.seed --user-id YOUR_USER_UUID
```

This creates ~200 shipments, 12 disruptions, and cold-chain sensor data for the specified user.

## 8. Start the Application

```bash
# Terminal 1: Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd bob-supply-chain-intelligence
pnpm run dev
```

## 9. Open the Dashboard

Navigate to `http://localhost:3000` and log in with your registered credentials.
