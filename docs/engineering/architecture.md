# Syntra — Architecture

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                            │
│  Next.js App Router Pages (React 18, Framer Motion, Recharts)       │
│  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │Dashboard │ │ Onboarding │ │  Goals   │ │Simulator │ │Ingest  │ │
│  └──────────┘ └────────────┘ └──────────┘ └──────────┘ └────────┘ │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS / Next.js Server Actions
┌───────────────────────────▼─────────────────────────────────────────┐
│                     NEXT.JS API LAYER (Edge/Node)                    │
│                                                                      │
│  Auth          Goals         Logs          AI           Upload       │
│  /register     /goals        /log          /ai/domain   /csv         │
│  /nextauth     /milestone    /log/daily    /ai/recommend /excel      │
│                              /log/latest                             │
│                                                                      │
│  Profile       Dashboard     Simulation    Telemetry    Demo         │
│  /onboard      /dashboard    /simulate     /terminal    /setup/demo  │
│  /vector                                                /mock        │
└───────┬───────────────┬──────────────────┬──────────────────────────┘
        │               │                  │
┌───────▼──────┐ ┌──────▼──────┐ ┌────────▼───────────────────────────┐
│   MongoDB    │ │  Gemini API  │ │        LIBRARY LAYER               │
│  (Atlas)     │ │  2.5 Flash   │ │                                    │
│              │ │              │ │  Scoring    DriftEngine             │
│  User        │ │  Reflection  │ │  EMA calc   BehaviorFlags          │
│  Log         │ │  Domain AI   │ │  ConfScore  TrendDetect             │
│  Telemetry   │ │  Simulator   │ │                                    │
│              │ │              │ │  ContextBuilder  SnapshotService   │
│  Indexes:    │ │  PII-masked  │ │  FinanceMath     Encryption        │
│  userId,date │ │  requests    │ │  Validators      Logger            │
└──────────────┘ └─────────────┘ └────────────────────────────────────┘
```

## Complete Data Flow

### 1. User Registration Flow
```
Browser (signup/page.tsx)
  → POST /api/auth/register
    → SignupSchema.safeParse()          [Zod validation]
    → User.findOne({ email })           [duplicate check]
    → bcrypt.hash(password, 10)         [password hashing]
    → User.create({ scores: {50,50,50}, gamification: defaults })
    → Return success
  → signIn() via NextAuth
    → JWT token minted (30-day)
  → Redirect /onboarding
```

### 2. Onboarding Calibration Flow
```
Browser (onboarding/page.tsx) — 4-step questionnaire
  → POST /api/profile/onboard
    → Map income to number (student→0, ranges→midpoint, custom→parsed)
    → Calculate health potential (sleep score + workout score + constraint penalty)
    → Calculate finance potential (savings rate + runway + discretionary)
    → Calculate career potential (study hours + focus + consistency)
    → Calculate syntraCore = avg(health, finance, career)
    → Map archetype → optimizationVector (health/finance/career)
    → Log.insertMany([healthLog, financeLog, careerLog])  [3 baseline logs]
    → User.findByIdAndUpdate({ scores, financials, onboardingComplete })
    → Return { healthPotential, financePotential, careerPotential, syncPercentage }
  → Redirect /dashboard
```

### 3. Daily Logging Flow
```
Browser (ingestion/page.tsx)
  → POST /api/log/daily { health, finance, career, dailyNote? }
    → DailyLogSchema.safeParse()
    → calculateHealthScore(healthData)  → 0–100
    → calculateFinanceScore(finData)    → 0–100
    → calculateCareerScore(careerData)  → 0–100
    → EMA: newScore = oldScore × 0.75 + calcScore × 0.25
    → Log.insertMany([health, finance, career, reflection?])
    → User.findByIdAndUpdate({ scores, gamification, badges })
    → waitUntil(generateAndStoreSnapshot(userId))  [background, non-blocking]
    → Return { success, state: { scores, gamification, newBadges, computedScores } }
```

### 4. AI Recommendation Flow
```
Browser (dashboard/page.tsx) → GET /api/ai/recommend
  → Check user.aiSnapshot: { dailyReflection, lastGeneratedAt }
  → Cache valid if: sameDay(lastGeneratedAt) AND latestLog.date <= lastGeneratedAt
  → If CACHED: Return snapshot with cache headers (s-maxage=300)
  → If STALE:
      → Log.find({ userId, limit: 42 }).sort(-date)
      → buildTwinContext(logs)             [compute weeklyAverages, trends, flags]
      → calculateConfidenceScore(logCount) [logCount/21 × 100, max 100]
      → computeWealthGoals(goals, income)  [financeMath.ts]
      → generateaitwinReflection(context, confidence)
          → construct prompt (aitwinReflectionPrompt.ts)
          → callGemini(prompt) with retry + backoff
          → parse JSON response
          → validate against aitwinReflectionSchema
      → User.findByIdAndUpdate({ aiSnapshot })
      → Return structured AI payload
```

### 5. Drift Detection Flow
```
POST /api/log  (after each individual log entry)
  → analyzeBehavioralDrift(recentLogs)
      → Compare recent 7-day avg to previous 7-day avg per domain
      → Compute driftIndex (0–100)
      → Identify primaryDivergenceCause
  → If driftIndex >= 15: Flag for snapshot regeneration
  → snapshotService: Skip AI if drift < 15 AND trends stable
```

## User Lifecycle

```
ANONYMOUS
    │
    ▼ POST /api/auth/register
REGISTERED (scores: 50/50/50, no logs)
    │
    ▼ POST /api/profile/onboard
ONBOARDED (calibrated scores, 3 baseline logs, optimizationVector set)
    │
    ▼ Daily: POST /api/log or /api/log/daily
ACTIVE (EMA scores updating, streaks growing, AI snapshots caching)
    │
    ├─→ Goal creation/milestone completion
    ├─→ CSV/Excel bulk uploads
    ├─→ AI reflection consumption
    └─→ Simulator scenario testing
```

## Twin Lifecycle

```
TWIN BORN (onboarding calibration)
    │ baseline health/finance/career logs created
    ▼
TWIN STABILIZING (first 7 days, confidence growing)
    │ logCount/21 × 100 → confidence rising from ~0 to 100
    ▼
TWIN ACTIVE (full recommendations, confidence = 100)
    │ AI context has 21+ logs, full behavioral pattern visible
    ▼
TWIN DRIFTING (drift index ≥ 15)
    │ Primary divergence detected, AI generates intervention
    ▼
TWIN RECOVERING (drift decreasing over 3–7 days)
    │ Risk alerts resolve, trajectory normalizes
    ▼
TWIN ACCELERATING (scores ≥ 80 across domains)
    │ Pareto skill focus, wealth surplus re-allocation
    ▼
[cycle repeats with continuous EMA updates]
```

## AI Lifecycle

```
CONTEXT BUILD (zero AI cost)
    │ buildTwinContext(logs) → TwinContext object
    │ calculateConfidenceScore(count) → 0–100
    │ computeWealthGoals(goals) → PreComputedWealthGoal[]
    ▼
PROMPT CONSTRUCTION (aitwinReflectionPrompt.ts)
    │ Inject TwinContext + confidence + wealthGoals
    │ PII anonymization (strip name, email, phone, location)
    ▼
GEMINI API CALL (callGemini with retry)
    │ Temperature: 0.4 (deterministic)
    │ Model: gemini-2.5-flash
    │ Exponential backoff: 2 attempts, 500ms base
    ▼
RESPONSE VALIDATION (Zod schema enforcement)
    │ aitwinReflectionSchema.safeParse()
    │ If invalid: return safe defaults
    ▼
SNAPSHOT STORAGE (MongoDB)
    │ user.aiSnapshot = { dailyReflection, lastGeneratedAt: now }
    ▼
CACHE HIT (next request same day, no new logs)
    │ Skip Gemini entirely
    │ Serve cached snapshot
    ▼
STALENESS CHECK (new log after snapshot → invalidate)
    │ latestLog.date > lastGeneratedAt → regenerate
```

## Key Architectural Decisions

| Decision | Rationale |
|---|---|
| JWT over DB sessions | Stateless, scales horizontally, Vercel-friendly |
| EMA over simple average | Recency-weighted; recovery shows faster than averaging |
| Pre-compute context (no AI) | Expensive AI only interprets cheap deterministic output |
| Background snapshot generation | User gets instant response; AI pre-fetched for next visit |
| Confidence ceiling on AI | Prevents overconfident AI with sparse data |
| Smart cache invalidation | Log-timestamp comparison avoids stale AI responses |
| Zod schemas at every boundary | Runtime type safety matches TypeScript compile-time types |
| waitUntil() for background work | Vercel function lifetime extension for async tasks |
