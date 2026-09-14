# Contributing to BOB — Autonomous Supply Chain Intelligence

Thank you for your interest in contributing to **BOB**, developed by **Team Synora** for the **Bob AI Hackathon 2026 (AI Track)**.

BOB is an enterprise-grade autonomous supply chain intelligence platform designed to eliminate operational fog-of-war, correlate multi-modal disruptions, predict cold-chain thermal excursions, and simulate reroute contingencies in real time.

---

## 1. Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Contributors are expected to uphold respectful, constructive, and professional communication at all times.

---

## 2. Repository Architecture & Core Rule

> [!IMPORTANT]
> **CRITICAL ARCHITECTURAL INTEGRITY RULE**
> Under NO circumstances should source code be reorganized or moved into a generic `src/` directory. BOB is intentionally organized into root-level domain directories matching Next.js App Router and FastAPI ASGI serverless conventions:
> - `app/` — Next.js 14 App Router pages, layouts, and route handlers.
> - `backend/` — FastAPI Python 3.11+ intelligence core, mathematical models, and AI engine.
> - `components/` — Modular React UI components (Leaflet maps, Recharts, design system).
> - `lib/` — Shared client utilities, API clients, Supabase browser client, and TypeScript types.
> - `supabase/` — Database schema, migration SQL files, and RLS policies.
> - `docs/` — Official architecture, problem statement, solution overview, and setup documentation.
> - `demo/` — Live evaluation links, walkthrough guide, and high-resolution platform screenshots.
> - `presentation/` — Official 5-slide PDF deck.

---

## 3. Getting Started & Local Development

### Prerequisites
- **Node.js**: v18.17.0+ (Node.js 20 or 22 LTS recommended)
- **Package Manager**: `pnpm` (preferred) or `npm`
- **Python**: 3.11+
- **Supabase Account**: Managed PostgreSQL instance (or local Supabase CLI)
- **AI Provider API Key**: Groq API Key (`GROQ_API_KEY`) or Google Gemini (`GEMINI_API_KEY`)

### Initial Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Tanish01234/bob-ai-hackathon-team-synora.git
   cd bob-ai-hackathon-team-synora
   ```

2. **Backend Setup**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

3. **Frontend Setup**:
   ```bash
   pnpm install
   ```

4. **Environment Configuration**:
   Copy `.env.example` to `.env.local` (and/or `.env` in the root):
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials and AI provider key.

5. **Running Concurrently in Development**:
   - Backend:
     ```bash
     cd backend
     python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
     ```
   - Frontend:
     ```bash
     pnpm run dev
     ```
   The frontend runs at `http://localhost:3000` and proxies `/svc/api/*` to the FastAPI backend.

---

## 4. Branching Strategy & Git Workflow

We follow a structured Git branching model:
- `main` — Production-ready code, directly deployed to Vercel production.
- `feature/<feature-name>` — New capabilities, models, or UI components.
- `fix/<issue-name>` — Bug fixes, auth reconciliations, or edge-case handling.
- `docs/<doc-name>` — Documentation updates and guides.

### Commit Conventions

We strictly follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add Arrhenius remaining shelf-life predictor`
- `fix: resolve parallel telemetry fetch race condition in shipment detail`
- `docs: update system architecture and evaluation guide`
- `refactor: optimize Monte Carlo rerouting vector operations`
- `test: add unit tests for disruption bounding-box collision`
- `chore: update dependencies and workflow validation`

---

## 5. Coding Standards

### TypeScript & React
- Use strict TypeScript types. Avoid `any` whenever possible; define domain types in `lib/types/` or component interfaces.
- Functional components with React Hooks.
- Design tokens and styles should adhere to the dark-navy glassmorphic theme defined in `tailwind.config.ts` and `app/globals.css`.
- Ensure responsive layouts and accessibility (ARIA labels on interactive controls).

### Python & FastAPI
- Follow PEP 8 guidelines.
- Use explicit type hints (`pydantic.BaseModel`, `typing.Optional`, `typing.List`).
- All asynchronous route handlers must be non-blocking (`async def`).
- Handle errors with explicit HTTP status codes (`HTTPException`) and structured JSON error envelopes.

---

## 6. Testing Guidelines

Before opening a pull request, verify that all test suites pass:

1. **Backend Tests**:
   ```bash
   PYTHONPATH=backend pytest backend/tests/ -v
   ```
2. **Frontend Typecheck & Build**:
   ```bash
   pnpm exec tsc --noEmit
   pnpm run build
   ```

---

## 7. Security Considerations

> [!CAUTION]
> **NEVER COMMIT SENSITIVE SECRETS**
> - Do NOT commit `.env`, `.env.local`, service role keys, private keys, or API tokens.
> - Ensure all `.env*` files (except `.env.example`) remain in `.gitignore`.
> - Always enforce Row Level Security (RLS) on new Supabase tables.
> - Sanitize user inputs passed to LLM prompts to prevent prompt injection.

---

## 8. Pull Request & Review Process

1. Ensure your branch is rebased on the latest `main`.
2. Verify that automated checks, tests, and builds pass locally.
3. Open a Pull Request with a clear summary:
   - What problem does this PR solve?
   - What approach was taken?
   - How was it tested? (Include screenshots or test terminal output for UI changes).
4. Solicit review from maintainers (`@Tanish01234`).
