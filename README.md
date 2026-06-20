# Syntra — Personal Digital Twin & Life Operating System

> **Syntra** constructs a predictive, AI-driven **Digital Twin** of you — analysing your biometrics, finances, and career trajectory to surface personalised projections, behavioural insights, and goal execution plans in one unified dashboard.

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Breakdown](#feature-breakdown)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Data Models](#data-models)
6. [API Reference](#api-reference)
7. [Environment Variables](#environment-variables)
8. [Local Setup](#local-setup)
9. [Deployment](#deployment)
10. [Project Structure](#project-structure)

---

## Overview

Syntra is a full-stack Next.js application that acts as your personal life operating system. It ingests structured health, finance, and career data — through manual logs, document uploads, and Google Fit sync — and feeds that data into a deterministic scoring engine and a Gemini-powered AI layer.

The result is a live **Digital Twin**: a continuously updated model of your current self, paired with a 12-month projection of your future self, cross-domain trade-off simulations, goal tracking with daily task execution, and explainable AI insights — all rendered in a fast, single-page dashboard.

**Core design principles:**
- **Privacy-first** — No data leaves the system except to Gemini (with PII stripped before every call)
- **Deterministic scoring** — Health, finance, and career scores are computed with transparent, auditable formulas — not black-box ML
- **Graceful degradation** — Every AI surface has static fallbacks; every API failure returns a clean error, never a raw stack trace
- **Single payload architecture** — The dashboard loads one God Payload from `/api/dashboard`, eliminating waterfall fetches

---

## Feature Breakdown

### Dashboard & Digital Twin Core
- **Syntra Core Score** — A unified 0–100 index derived from the weighted average of Health, Finance, and Career domain scores, displayed live with trend trajectory
- **CVF Scorecards** — Per-domain score cards (Circadian, Vault, Focus) with animated progress rings and formula tooltips
- **Active Goals Panel** — Expandable goal cards showing today's linked daily tasks with inline checkbox completion and `+20 XP` float animations
- **Trajectory Chart** — Interactive SVG chart showing task completion % vs 100% ideal target across selectable time ranges (1W / 2W / 1M / 3M / 6M), with hover tooltips, goal deadline markers, and a legend summary
- **Current Self vs Future Self** — Side-by-side comparison of today's biometrics/scores against 12-month AI projections, plus Anatomical Twin (biological vs chronological age)
- **AI Insight Feed** — Three-column real-time AI cards: Twin Prediction, Daily Reflection, and Daily Challenge

### Data Ingestion
- **Manual Domain Logs** — Structured forms for daily health (sleep, steps, HRV), finance (income, savings, expenses), and career (study hours, tasks, productivity) inputs
- **Document Intelligence (PDF / Image)** — Upload medical reports, salary slips, credit statements, resumes, or certifications; Gemini classifies and extracts structured data in a single merged API call, then merges it into the correct domain log and recalculates scores
- **Google Fit Sync** — OAuth2 integration fetching steps, sleep sessions, heart rate, SpO2, and HRV directly from the Google Fitness API, merged into health logs
- **CSV / Excel Import** — Batch financial or health data upload with column mapping
- **Family Relations & Support Network** — Structured input for dependents and accountability contacts stored on the user profile

### Goals & Daily Execution
- **Goal Wizard** — Create or edit goals across health, finance, and career domains with priority, target date, milestone steps, and a built-in daily task creator
- **Milestone Tracking** — Toggle milestones complete for `+100 XP`; Gemini suggests milestone steps from goal title and domain
- **Daily Tasks** — Per-goal tasks with date scoping, inline toggle (`+20 XP`), delete, and AI suggestion (3 specific, actionable tasks generated from pending milestones)
- **Gamification** — XP points, logging streaks, badge unlocks (Habit Builder, Focus Master, Goal Getter, Rising Twin, etc.), daily challenges, XP level progression ring, and achievement timeline

### AI Simulator
- **6-Month Multi-Domain Projection** — Input proposed behavioural changes (target sleep, savings rate, study hours) and see projected Health, Finance, and Career score trajectories
- **Cross-Domain Trade-Off Engine** — Modelling aggressive career targets showing downstream sleep loss; aggressive savings showing potential burnout signals
- **Financial Scenario Presets** — CC prepayment savings, SIP delay cost (compound interest), home loan prepayment tenure reduction

### Insights
- **Domain Intelligence Feed** — Gemini-generated health, finance, and career analyses surfaced with confidence scores and priority tags
- **Drift & Divergence Engine** — Calculates drift index against 42-day baselines, pinpoints the primary cause of circadian or budget divergence, and issues explainable recommendations
- **AI Twin Chat** — Conversational interface trained on your personal telemetry context for on-demand life coaching

### Profile & Identity
- **Twin Profile** — Editable biometrics, lifestyle settings, income/savings targets, optimization vector (Career / Health / Finance focus), avatar, mission statement, and skills
- **Anatomical Twin Diagnostics** — Recovery score, fatigue index, biological age estimation, and telemetry driver explanations
- **Credentials Management** — Secure password change with bcrypt verification

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| UI | React 18, CSS-in-JSX (no CSS modules), Lucide React icons |
| Animation | Framer Motion |
| Charts | Recharts, custom SVG trajectory chart |
| Database | MongoDB (Mongoose 8) |
| Authentication | NextAuth.js v4 (credentials + Google OAuth for Fit) |
| AI / LLM | Google Gemini 2.5 Flash Lite via REST API |
| Data Fetching | SWR (client), native fetch (server) |
| Validation | Zod 4 |
| OCR | Tesseract.js 7 |
| PDF Parsing | pdf-parse 2 |
| Spreadsheet | xlsx |
| Rate Limiting | Custom in-memory rate limiter (`src/lib/utils/rateLimit.ts`) |
| Deployment | Vercel (with `@vercel/functions` for background tasks) |
| Linting | ESLint (next/core-web-vitals) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│  Next.js App Router pages — SWR for data fetching   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────────────┐
│               Next.js API Routes (/api/*)            │
│  Auth · Dashboard · Goals · Ingestion · Simulate    │
│  AI Insights · Profile · Telemetry · Assets         │
└───────┬────────────────────────────┬────────────────┘
        │                            │
┌───────▼──────┐           ┌─────────▼──────────────┐
│   MongoDB    │           │   Google Gemini API     │
│  (Mongoose)  │           │  (Gemini 2.5 Flash)     │
│              │           │  PII stripped before    │
│  Users       │           │  every call, with       │
│  Logs        │           │  exponential backoff    │
│  Telemetry   │           │  and sentinel errors    │
│  Assets      │           └─────────────────────────┘
└──────────────┘
        │
┌───────▼──────────────────┐
│    Google Fitness API    │
│  (OAuth2 token exchange) │
└──────────────────────────┘
```

**Request lifecycle (dashboard):**
1. Client hits `/api/dashboard`
2. `dashboardService.ts` concurrently fetches User + 15 most recent Logs
3. Streak decay is checked and corrected if `lastLogDate > 48h`
4. `calculateSyntraCore()` computes the unified score
5. Single JSON payload returned — no waterfall, no N+1

**AI pipeline (ingestion):**
1. PDF text extracted (pdf-parse → Tesseract.js OCR fallback)
2. Single merged Gemini call: classify document type + extract structured data
3. Response validated against Zod `IngestionSchemaMap`
4. Data merged into the correct MongoDB domain log
5. Scores recalculated; `generateAndStoreSnapshot()` triggered in background via `waitUntil`

---

## Data Models

### `User`
Core user document with embedded sub-documents:
- `profile` — biometrics, income targets, learning profile, optimization vector, mission
- `scores` — `{ health, finance, career }` (0–100 each)
- `gamification` — `{ totalPoints, currentStreak, lastLogDate, lastChallengeDate }`
- `goals[]` — embedded goal objects with milestones and target dates
- `dailyTasks[]` — date-scoped tasks linked to goal IDs
- `badges[]` — array of unlocked badge IDs
- `googleFit` — OAuth tokens and sync metadata

### `Log`
Daily domain log per user:
- `domain` — `"health" | "finance" | "career"`
- `date` — log date (indexed)
- `domainData` — domain-specific structured object (sleep, savings, study hours, document sub-docs, etc.)
- `fileHash` — SHA-256 of uploaded document for deduplication

### `AssetLiability`
Financial balance sheet items:
- `type` — `"asset" | "liability"`
- `category` — savings, investment, property, loan, credit, etc.
- `value`, `currency`, `label`

### `Telemetry`
Raw Google Fit sync records:
- `steps`, `heartRate`, `sleepMinutes`, `spo2`, `hrv`
- `syncedAt` timestamp

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user with hashed password |
| ANY | `/api/auth/[...nextauth]` | NextAuth session management |
| GET | `/api/auth/google-fit/connect` | Initiate Google Fit OAuth flow |
| GET | `/api/auth/google-fit/callback` | Exchange OAuth code for tokens |
| POST | `/api/auth/google-fit/disconnect` | Remove Google Fit tokens |

### Dashboard & AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | God Payload — all dashboard data in one call |
| GET | `/api/ai/recommend` | AI Twin Prediction, Reflection, Challenge, Confidence |
| POST | `/api/ai/domain` | Domain-specific health/finance/career AI analysis |
| GET | `/api/ai/widgets` | Lightweight AI widget data |
| POST | `/api/chat` | AI Twin conversational interface |

### Goals & Gamification
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PATCH/DELETE | `/api/goals` | Full CRUD for user goals |
| PATCH | `/api/goals/milestone` | Toggle milestone completion (+100 XP) |
| POST | `/api/goals/milestones/suggest` | Gemini-generated milestone suggestions |
| GET/POST/PATCH/DELETE | `/api/goals/daily-tasks` | Daily task CRUD with XP on toggle |
| POST | `/api/goals/daily-tasks/suggest` | Gemini-generated daily task suggestions |
| POST | `/api/goals/gamification` | Complete daily challenge (+20 XP) |

### Data Ingestion
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ingestion/upload` | PDF/image document upload, classify, extract, merge |
| POST | `/api/upload/csv` | CSV batch import |
| POST | `/api/upload/excel` | Excel batch import |
| POST | `/api/telemetry/sync` | Google Fit telemetry sync |
| POST | `/api/log` | Manual domain log submission |
| GET | `/api/log/latest` | Latest log per domain |

### Profile & Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/api/profile` | User profile read and update |
| PUT | `/api/profile/vector` | Update optimization vector |
| POST | `/api/profile/family` | Sync family relations and support network |
| POST | `/api/profile/onboard` | Save onboarding data |
| GET/POST/DELETE | `/api/assets-liabilities` | Asset/liability balance sheet CRUD |

### Simulation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulate` | Run 6-month multi-domain scenario projection |

---

## Environment Variables

Create a `.env.local` file in the project root. All variables are required unless marked optional.

```env
# ── MongoDB ────────────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

# ── NextAuth ───────────────────────────────────────────────────────
NEXTAUTH_SECRET=<random 32+ character string>
NEXTAUTH_URL=http://localhost:3000

# ── Google OAuth (Google Fit sync) ────────────────────────────────
# Create credentials at https://console.cloud.google.com/apis/credentials
# Enable: Google Fitness API
# Authorised redirect URI: http://localhost:3000/api/auth/google-fit/callback
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>

# ── Gemini AI ─────────────────────────────────────────────────────
# Generate at https://aistudio.google.com/app/apikey
# Model in use: gemini-2.5-flash-lite
GEMINI_API_KEY=<your-gemini-api-key>
```

> **Note:** Google Fit sync is optional for local development. The app functions fully without it — Google Fit features will be disabled if the OAuth credentials are omitted.

---

## Local Setup

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **MongoDB** instance (Atlas free tier works)
- A **Gemini API key** (free tier available at Google AI Studio)

### 1. Clone the repository

```bash
git clone https://github.com/Aether-Syndicate/syntra.git
cd syntra
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your credentials as described in [Environment Variables](#environment-variables).

### 4. Type-check the codebase

```bash
npx tsc --noEmit --skipLibCheck
```

This should complete with no output (zero errors).

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. First-run flow

1. Navigate to `/signup` and create an account
2. Complete the onboarding wizard (age, biometrics, income, learning profile)
3. Go to **Ingestion** → log your first health, finance, and career entries
4. Return to **Dashboard** to see your Digital Twin initialise

### Running a production build locally

```bash
npm run build
npm start
```

---

## Deployment

Syntra is designed for **Vercel** deployment.

### Steps

1. Push the repository to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from [Environment Variables](#environment-variables) in the Vercel project settings
4. Deploy — Vercel auto-detects Next.js and configures the build

### MongoDB Atlas

- Use **Atlas** for the managed database
- Whitelist `0.0.0.0/0` (all IPs) in Network Access for Vercel's dynamic egress IPs, or use Vercel's IP ranges if on a paid Atlas plan
- Ensure the connection string uses `retryWrites=true&w=majority`

### Google OAuth for Fit

In the Google Cloud Console:
- Add your Vercel production URL to **Authorised JavaScript origins**: `https://your-app.vercel.app`
- Add the callback to **Authorised redirect URIs**: `https://your-app.vercel.app/api/auth/google-fit/callback`

### Rate limits

The in-memory rate limiter (`src/lib/utils/rateLimit.ts`) resets on server restart. For production with multiple serverless instances, replace it with a Redis-backed limiter (e.g. Upstash) if sustained load is expected.

---

## Project Structure

```
syntra/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Landing / root redirect
│   │   ├── login/                  # Login page
│   │   ├── signup/                 # Registration page
│   │   ├── onboarding/             # First-run profile wizard
│   │   ├── dashboard/              # Main Digital Twin dashboard
│   │   ├── goals/                  # Goals, milestones, daily tasks, gamification
│   │   ├── ingestion/              # Manual logs, PDF upload, Google Fit, CSV/Excel
│   │   ├── insights/               # AI domain insights feed
│   │   ├── simulator/              # 6-month scenario simulator
│   │   ├── profile/                # User profile and settings
│   │   ├── assets-liabilities/     # Financial balance sheet
│   │   └── api/                    # All API routes (see API Reference)
│   │
│   ├── models/                     # Mongoose schemas
│   │   ├── User.ts                 # Core user + embedded goals/tasks/gamification
│   │   ├── Log.ts                  # Daily domain logs
│   │   ├── AssetLiability.ts       # Balance sheet items
│   │   └── Telemetry.ts            # Google Fit raw sync records
│   │
│   ├── lib/
│   │   ├── auth.ts                 # NextAuth session helper
│   │   ├── database/
│   │   │   └── mongodb.ts          # Cached Mongoose connection
│   │   ├── logic/
│   │   │   ├── scoring.ts          # Syntra Core Score formula
│   │   │   ├── healthMath.ts       # Biological age, recovery, fatigue calculations
│   │   │   ├── financeMath.ts      # Runway, savings-rate, compound projections
│   │   │   ├── driftEngine.ts      # Drift index and divergence detection
│   │   │   ├── simulator.ts        # Scenario projection engine
│   │   │   ├── streak.ts           # Logging streak recalculation
│   │   │   └── confidenceScore.ts  # AI confidence scoring
│   │   ├── services/
│   │   │   ├── gemini.ts           # Unified Gemini gateway (retry, PII strip, sentinel errors)
│   │   │   ├── snapshotService.ts  # Background AI twin snapshot generation
│   │   │   ├── googleFitSync.ts    # Google Fitness API data fetch and merge
│   │   │   ├── aiContextBuilder.ts # Builds personalised context string for AI prompts
│   │   │   └── twinCopy.ts         # Typewriter and twin narrative copy
│   │   ├── prompts/
│   │   │   ├── twinReflection.ts   # Daily reflection prompt template
│   │   │   ├── aitwinReflection.ts # Extended twin analysis prompt
│   │   │   ├── domainPrompts.ts    # Per-domain AI insight prompts
│   │   │   ├── simulatorPrompt.ts  # Scenario simulation prompt
│   │   │   ├── aisimulatorPrompt.ts
│   │   │   ├── chatPrompt.ts       # Twin chat system prompt
│   │   │   └── challengePrompt.ts  # Daily challenge generation prompt
│   │   ├── validators/
│   │   │   ├── ingestionSchemas.ts # Zod schemas for all 11 document types
│   │   │   └── index.ts            # Shared validation exports
│   │   └── utils/
│   │       ├── rateLimit.ts        # In-memory per-user rate limiter
│   │       ├── apiError.ts         # Typed API error class
│   │       ├── apiHandler.ts       # Route handler wrapper with try/catch
│   │       ├── sanitize.ts         # PII sanitiser for AI prompts
│   │       ├── encryption.ts       # Utility encryption helpers
│   │       ├── fetcher.ts          # SWR-compatible fetch wrapper
│   │       ├── logger.ts           # Structured server logger
│   │       └── memoize.ts          # Generic memoization utility
│   │
│   └── services/
│       └── dashboardService.ts     # God Payload builder (concurrent User + Log fetch)
│
├── docs/                           # Internal documentation and design notes
├── .env.example                    # Environment variable template
├── next.config.js                  # Next.js configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json
```

---

## Supported Document Types (Ingestion)

| Document Type | Domain | Data Extracted |
|---|---|---|
| `blood_report` | Health | CBC, Lipid panel, Thyroid, HbA1c, Vitamin D, biomarker status flags |
| `prescription` | Health | Medicines, dosage, instructions, doctor name |
| `health_checkup` | Health | Vitals (BP, weight, height), general clinical findings |
| `fitness_assessment` | Health | VO2 max, strength benchmarks, gym test results |
| `salary_slip` | Finance | Gross, net take-home, deductions, employer |
| `loan_document` | Finance | Principal, EMI, interest rate, tenure |
| `credit_card` | Finance | Outstanding balance, minimum due, credit limit |
| `stock_portfolio` | Finance | Holdings, portfolio value, unrealised P&L |
| `insurance_policy` | Finance | Policy type, coverage, premium, expiry |
| `certification` | Career | Credential name, issuer, date, skills |
| `resume` | Career | Skills, education, experience, job titles |

All document data is validated against strict Zod schemas before being written to the database.
