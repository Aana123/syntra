# Syntra — Personal Digital Twin & Life Operating System

Syntra is an intelligent, privacy-first life operating system designed for Texas Instruments Hackathon (Theme 2). It constructs a predictive **Digital Twin** that analyzes, projects, and optimizes your circadian rhythm, financial runway, and career acceleration vector.

---

## 🌟 Key Capabilities

### 🩺 Biometric Google Fit Sync & Health Scoring
- **Automated Telemetry Ingestion**: Seamlessly retrieves steps, average heart rate, Sleep sessions, oxygen saturation (SpO2), and Heart Rate Variability (HRV) directly from the Google Fitness API.
- **Explainable scoring**: Health index calculations map daily sleep, physical training, and hydration logs to a `0-100` score using deterministic formulas, smoothed with a `0.25` lag coefficient to prevent daily volatility.

### 🔮 Next-Gen Digital Twin Simulator
- **6-Month Multi-Domain Trajectory**: Projections of future health, career progress, and savings based on proposed behavioral shifts.
- **Cross-Domain Trade-Offs**: Proposing aggressive career study targets projects sleep loss and stress spikes; saving money aggressively displays potential impacts of stress on health scores.
- **Financial Presets & Math Engine**: Evaluates complex scenario projections such as CC prepayment savings, SIP delay cost of compound interest, and home loan prepayment tenure reductions.

### 📄 Document Intelligence (OCR Ingestion)
- **AI-Powered OCR Classifier**: Upload medical PDFs (blood reports, prescriptions, checkups) or financial docs (salary slips, credit statements, stock portfolios) for instant structured parsing.
- **Biomarker Analysis & Penalty Engine**: Blood report parameters (TSH, Vitamin D, HbA1c, Cholesterol) are parsed into Zod schemas. Any metrics flagged "high" or "low" subtract 3 points from the health score.

### 🔍 Deterministic Drift & Divergence Engine
- **Global Drift Index**: Calculates drift against target baselines across 42 days of history, providing a consolidated divergence index.
- **Circadian & Behavioral Analysis**: Pinpoints the primary cause of circadian rhythm or budget drift and issues real-time, explainable recommendations.

### 🎮 Habit Loops & Gamification
- **Logging Streaks**: Re-calculates and tracks logging consistency daily.
- **XP Progression Matrix**: Earn points for healthy score milestones and document ingestion to level up your Digital Twin.

---

## 📁 System Architecture & Directory Reorganization

The codebase is organized cleanly to separate routing, UI layouts, and logic:

### Directory Tree Overview

* [src/app/](file:///f:/AetherSyndicate/syntra-finals/src/app) — Next.js App Router folders defining pages, sub-layouts, and server API routes.
* [src/components/](file:///f:/AetherSyndicate/syntra-finals/src/components) — Reusable React elements divided into functional domains (charts, dashboard widgets, simulator inputs, shared UI).
* [src/models/](file:///f:/AetherSyndicate/syntra-finals/src/models) — Strict MongoDB schemas representing User profiles, Daily Log aggregates, Asset/Liability balances, and Telemetry.
* [src/lib/](file:///f:/AetherSyndicate/syntra-finals/src/lib) — The engine core, structured as:
  * [database/](file:///f:/AetherSyndicate/syntra-finals/src/lib/database) — Configures connection endpoints.
  * [logic/](file:///f:/AetherSyndicate/syntra-finals/src/lib/logic) — Formulas for streaks, financial projections, drift anomalies, and wellness scoring.
  * [services/](file:///f:/AetherSyndicate/syntra-finals/src/lib/services) — Background twin snapshots, Gemini LLM calls, and Google Fitness data ingestion sync.
  * [utils/](file:///f:/AetherSyndicate/syntra-finals/src/lib/utils) — Shared utilities for memoization, rate-limiting, and error-handling.
  * [validators/](file:///f:/AetherSyndicate/syntra-finals/src/lib/validators) — Validation constraints mapping API request payloads and document parsers.
  * [prompts/](file:///f:/AetherSyndicate/syntra-finals/src/lib/prompts) — Structured templates for generating explainable Gemini AI insights.

---

## 🚀 Local Setup & Installation

Follow these steps to run Syntra locally:

### 1. Prerequisite Environments
Make sure you have **Node.js v18+** and **npm** installed on your system.

### 2. Clone the Repository
```bash
git clone https://github.com/Aether-Syndicate/syntra.git
cd syntra
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Duplicate `.env.example`, rename it to `.env`, and populate the parameters:
```env
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
NEXTAUTH_SECRET=your_auth_secret_token
NEXTAUTH_URL=http://localhost:3000

# Google Fit OAuth Credentials
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Gemini AI Engine
GEMINI_API_KEY=your_gemini_api_key
```

### 5. Build and Verify
To check for syntax or type errors:
```bash
npx tsc --noEmit
```

To run a production build:
```bash
npm run build
```

### 6. Spin Up Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view your dashboard.