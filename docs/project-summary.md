# Syntra — Project Summary

## What Syntra Is

Syntra is a **Mission-Driven Digital Twin Operating System** — a full-stack web application that creates a living computational model of a user's life across three synchronized domains: **Health**, **Finance**, and **Career**. It is not a habit tracker or dashboard. It is a trajectory optimization engine that uses deterministic analytics, behavioral telemetry, AI reasoning, and personalized interventions to close the gap between where users are and where they want to be.

## Core Value Proposition

> "See your future. Shape it smarter."

Most productivity tools track what happened. Syntra models what *will* happen. Every data point logged updates a scoring system, triggers drift detection, recalculates wealth trajectories, and feeds an AI that generates context-aware daily guidance. The goal is not passive awareness — it is active trajectory correction.

## Four Twin Layers

| Layer | Focus | Primary Data |
|---|---|---|
| **Anatomical Twin** | Physical health, sleep, nutrition | Sleep hours, workouts, calories, hydration, stress |
| **Behavioral Twin** | Habit patterns, consistency, drift | Cross-domain correlations, mood, focus sessions |
| **Financial Twin** | Wealth trajectory, goals, spending | Savings rate, discretionary spend, budget adherence |
| **Identity Twin** | Mission, optimization vector, growth | Goals, milestones, personal mission statement |

## Main Features

### Core Tracking
- Daily unified log submission (Health + Finance + Career in one call)
- Domain-specific EMA scoring (Exponential Moving Average — responsive but stable)
- Global Syntra Core % — a single number representing overall life synchronization

### AI Intelligence
- **Daily AI Reflection** (Google Gemini 2.5 Flash) — personalized twin predictions, risk alerts, and recommendations
- **Domain Analysis Engine** — deep per-domain analysis (nutrition synthesis, wealth projections, skill paths)
- **Smart Snapshot Caching** — AI responses pre-generated in background after logging; served instantly on request
- **PII-anonymized Gemini calls** — personal identifiers stripped before API submission

### Behavioral Drift Detection
- **Global Drift Index** (0–100) — detects when behavior diverges from baseline
- **Correlation flags** — stress-spending, sleep-career, workout-mood, late-night spending, weekend dropoff
- AI re-generation only triggered when drift exceeds threshold (≥15), minimizing API costs

### Goal & Mission System
- Hierarchical goals with embedded milestones
- Domain-tagged (health/finance/career)
- Priority and target date tracking
- Completion velocity estimation

### Wealth Goal Automation
- Parses goal titles for type classification (home, car, education, wedding, emergency fund, retirement)
- Extracts target amounts from natural language (lakh notation, direct numbers)
- Auto-computes required monthly savings, deficit, and runway months

### Gamification
- XP points per logged session (tiered: 50/25/10 based on score)
- Daily streak tracking with automatic reset on missed days
- Badge unlock system (7-day streak, 30-day streak, 500 points, domain excellence)

### Data Ingestion
- Manual entry via structured forms
- CSV bulk upload (RFC-4180 compliant parser)
- Excel/XLSX bulk upload (SheetJS)
- Mock sync endpoints simulating Apple Health, banking, and Coursera integrations

### Simulation
- What-if scenario engine (Gemini-powered)
- Trade-off analysis across domains
- Timeline projection with AI narrative

## Technical Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14.2.3 (App Router) |
| **Language** | TypeScript (strict mode, ES2017 target) |
| **Database** | MongoDB via Mongoose 8.4.0 |
| **Authentication** | NextAuth 4.24.14 (JWT strategy, 30-day sessions) |
| **AI Provider** | Google Gemini 2.5 Flash |
| **Data Validation** | Zod 4.4.3 |
| **Password Hashing** | bcryptjs 2.4.3 |
| **Data Upload** | xlsx 0.18.5 (SheetJS) |
| **Animations** | Framer Motion 12.40.0 |
| **Charts** | Recharts 3.8.1 |
| **Data Fetching** | SWR 2.4.1 |
| **Icons** | lucide-react 1.16.0 |
| **Encryption** | Node.js crypto (AES-256-CBC) |
| **Deployment Target** | Vercel (uses @vercel/functions for background tasks) |

## What Makes It Different

1. **Scoring is not static** — every log runs through an EMA recalculation, so scores reflect recency-weighted reality
2. **AI context is deterministic** — the `TwinContext` object is built with zero AI cost; AI only interprets structured data
3. **Caching is intelligent** — the system checks log timestamps before deciding whether to regenerate AI responses
4. **Drift is proactive** — the system detects behavioral divergence before the user notices it
5. **Goals connect to math** — financial goals automatically convert into monthly savings requirements and deficit calculations
