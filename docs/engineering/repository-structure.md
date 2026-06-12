# Syntra — Repository Structure

Every folder has a single clear responsibility. This document maps the tree and explains why things live where they do.

---

## Top-Level Tree

```
syntra/
├── src/                    ← All application source code
├── docs/                   ← Project documentation (this directory)
├── scripts/                ← Developer utilities and test runners
├── public/                 ← Static assets served by Next.js
├── .env.local              ← Local secrets (gitignored)
├── .env.example            ← Env variable reference (safe to commit)
├── next.config.mjs         ← Next.js configuration
├── tsconfig.json           ← TypeScript configuration
├── vercel.json             ← Vercel function timeout configuration
├── package.json            ← Dependencies and npm scripts
└── .gitignore
```

---

## `src/` — Application Source

```
src/
├── app/                    ← Next.js App Router (pages + API routes)
│   ├── layout.tsx          ← Root layout wrapper (Providers)
│   ├── page.tsx            ← Landing page (public)
│   ├── Providers.tsx       ← SessionProvider wrapper
│   ├── login/
│   │   └── page.tsx
│   ├── signup/
│   │   └── page.tsx
│   ├── onboarding/
│   │   └── page.tsx        ← 4-step calibration questionnaire
│   ├── dashboard/
│   │   └── page.tsx        ← Main twin dashboard (2500+ lines)
│   ├── ingestion/
│   │   └── page.tsx        ← Daily log entry interface
│   ├── goals/
│   │   └── page.tsx        ← Goal & milestone management
│   ├── insights/
│   │   └── page.tsx        ← Domain analysis & twin insights
│   ├── simulator/
│   │   └── page.tsx        ← What-if scenario engine
│   └── api/                ← Backend API routes
│       ├── auth/
│       │   ├── register/route.ts
│       │   └── [...nextauth]/route.ts
│       ├── ai/
│       │   ├── domain/route.ts      ← GET /api/ai/domain?domain=X
│       │   └── recommend/route.ts   ← GET /api/ai/recommend
│       ├── goals/
│       │   ├── route.ts             ← GET, POST, DELETE
│       │   └── milestone/route.ts   ← POST, PATCH, DELETE
│       ├── log/
│       │   ├── route.ts             ← POST (single domain)
│       │   ├── daily/route.ts       ← POST (unified daily)
│       │   └── latest/route.ts      ← GET (latest per domain)
│       ├── profile/
│       │   ├── onboard/route.ts     ← POST (calibration)
│       │   └── vector/route.ts      ← PATCH (optimization vector)
│       ├── upload/
│       │   ├── csv/route.ts
│       │   └── excel/route.ts
│       ├── dashboard/route.ts
│       ├── simulate/route.ts
│       ├── terminal/route.ts
│       ├── mock/route.ts
│       └── setup/
│           └── demo/route.ts        ← Seeding endpoint (env-gated)
│
├── lib/                    ← Business logic and services
│   ├── mongodb.ts           ← DB connection (global cached singleton)
│   ├── auth.ts              ← NextAuth configuration + getSession()
│   ├── scoring.ts           ← Domain score calculations + EMA + XP
│   ├── validators.ts        ← Zod schemas (re-exports from types/schemas.ts)
│   ├── aiContextBuilder.ts  ← buildTwinContext() — structured AI input
│   ├── driftEngine.ts       ← analyzeBehavioralDrift()
│   ├── snapshotService.ts   ← generateAndStoreSnapshot() — background AI
│   ├── financeMath.ts       ← preComputeWealthGoals() — wealth projections
│   ├── gemini.ts            ← callGemini() — Gemini API client
│   ├── confidenceScore.ts   ← calculateConfidence()
│   ├── parseGemini.ts       ← JSON extraction from Gemini markdown output
│   ├── encryption.ts        ← AES-256-CBC (available, not yet wired)
│   ├── fetcher.ts           ← Type-safe HTTP client for client-side fetches
│   ├── logger.ts            ← Logger.info/warn/error → Telemetry collection
│   ├── apiError.ts          ← ApiError class (statusCode + message)
│   ├── apiHandler.ts        ← HOF route wrapper for error handling
│   ├── mockData.ts          ← Static mock objects for /api/mock
│   ├── memoize.ts           ← Memoization utility (unused — dead code)
│   └── prompts/             ← AI prompt template functions
│       ├── aitwinReflection.ts   ← Daily reflection prompt (primary)
│       ├── twinReflection.ts     ← (likely superseded — audit needed)
│       ├── domainPrompts.ts      ← Per-domain analysis prompts
│       ├── aisimulatorPrompt.ts  ← What-if scenario prompt (primary)
│       ├── simulatorPrompt.ts    ← (likely superseded — audit needed)
│       └── challengePrompt.ts    ← Daily challenge generation
│
├── models/                 ← Mongoose schema definitions
│   ├── User.ts             ← Main user document (scores, goals, snapshot, gamification)
│   ├── Log.ts              ← Domain activity log entry
│   └── Telemetry.ts        ← System event audit trail
│
├── types/                  ← TypeScript type definitions
│   ├── schemas.ts          ← Zod schemas (IngestionSchema, SignupSchema, DailyLogSchema)
│   ├── ai.ts               ← TwinContext, AI response types, simulator types
│   └── next-auth.d.ts      ← Session and JWT type augmentations
│
└── middleware.ts           ← Next.js route protection (NextAuth matcher)
```

---

## `docs/` — Documentation

```
docs/
├── project-summary.md        ← What Syntra is, tech stack, features
├── user-journey.md           ← End-to-end user flow (signup → mission completion)
├── dashboard.md              ← Dashboard architecture, sections, data sources
├── onboarding.md             ← 4-layer onboarding flow and calibration logic
├── goals.md                  ← Mission control, goal creation, milestones, progress
├── insights.md               ← AI reflection, recommendations, cross-domain effects
├── simulator.md              ← What-if engine: input, math, output, risk analysis
├── analytics-engine.md       ← Scoring formulas, EMA, drift, confidence
├── frontend-structure.md     ← Page hierarchy, state management, hooks
├── backend-structure.md      ← Services, middleware, error handling
├── technical-debt.md         ← Known issues, severities, and suggested fixes
├── future-roadmap.md         ← Pre-hackathon must-dos, nice-to-haves, long-term vision
├── repository-audit.md       ← Strengths, weaknesses, bugs, security, performance
│
├── features/                 ← Deep-dives on individual system features
│   ├── twin-engine.md        ← Four-twin concept and per-twin data model
│   ├── drift-engine.md       ← Drift detection: inputs, math, thresholds, outputs
│   ├── snapshot-engine.md    ← AI pre-generation: flow, caching, storage, refresh
│   ├── telemetry.md          ← Event tracking: metrics, storage, Logger API
│   ├── ingestion.md          ← All ingestion paths: manual, CSV, Excel, mock sync
│   ├── ai-engine.md          ← Context builder, prompt pipeline, validation, confidence
│   └── gamification.md       ← XP, streaks, badges, daily challenges
│
└── engineering/              ← Technical reference for developers
    ├── architecture.md       ← System diagram, data flows, lifecycle diagrams
    ├── api-reference.md      ← Every route: method, request, response, auth
    ├── database.md           ← Collections, schemas, relationships, query patterns
    ├── deployment.md         ← Vercel, MongoDB, env vars, deployment checklist
    └── repository-structure.md  ← This file
```

---

## `scripts/` — Developer Utilities

```
scripts/
└── test-ai.ts    ← Manual AI integration test runner
```

Used to test Gemini integration and prompt output outside the Next.js request cycle. Run with `npx ts-node scripts/test-ai.ts` or equivalent.

---

## `public/` — Static Assets

Next.js serves files from `public/` at the root URL path. Currently contains:
- Favicon and app icons
- Any static images used in the landing page

---

## Key Naming Conventions

### Files
- **Route files**: always `route.ts` (Next.js App Router convention)
- **Page files**: always `page.tsx`
- **Library files**: camelCase (`aiContextBuilder.ts`, `driftEngine.ts`)
- **Model files**: PascalCase (`User.ts`, `Log.ts`)
- **Prompt files**: camelCase describing the use case (`aitwinReflection.ts`)

### Exports
- **Models**: default export (`export default User`)
- **Library functions**: named exports (`export function buildTwinContext(...)`)
- **Types/interfaces**: named exports with `I` prefix for Mongoose interfaces (`IUser`, `IGoal`)
- **Zod schemas**: named exports with `Schema` suffix (`IngestionSchema`, `SignupSchema`)

### Path alias
All internal imports use `@/*` instead of relative paths:
```typescript
import { buildTwinContext } from "@/lib/aiContextBuilder";
import User from "@/models/User";
import type { TwinContext } from "@/types/ai";
```

Configured in `tsconfig.json`: `"@/*": ["./src/*"]`

---

## What Lives Where — Quick Reference

| Need to find... | Look in |
|---|---|
| A route handler | `src/app/api/<route>/route.ts` |
| A page component | `src/app/<page>/page.tsx` |
| Scoring algorithm | `src/lib/scoring.ts` |
| Zod validation schemas | `src/types/schemas.ts` or `src/lib/validators.ts` |
| Gemini prompt templates | `src/lib/prompts/` |
| MongoDB schema | `src/models/` |
| TypeScript types for AI | `src/types/ai.ts` |
| Session types | `src/types/next-auth.d.ts` |
| Auth configuration | `src/lib/auth.ts` |
| Route protection | `src/middleware.ts` |
| Background AI generation | `src/lib/snapshotService.ts` |
| Drift detection | `src/lib/driftEngine.ts` |
| Wealth goal math | `src/lib/financeMath.ts` |
