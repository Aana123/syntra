# Syntra — Future Roadmap

---

## Must Do Before Hackathon

These items are critical for a compelling, demo-ready submission.

### 1. Fix Vercel Function Timeout
**Why**: AI routes will silently fail in production under Vercel's default 10s timeout.
**What**: Add `vercel.json` with `"maxDuration": 30` for all `/api/ai/*` routes.
**Effort**: 15 minutes.

### 2. Rotate Exposed Credentials
**Why**: Real API keys and DB credentials appear to be in `.env.local`. Even if not committed, they should be rotated before any demo.
**What**: New MongoDB Atlas password, new Gemini API key, new NextAuth secret.
**Effort**: 30 minutes.

### 3. Move Demo Secret to Environment Variable
**Why**: Hardcoded `"hackathon_win"` in source is unprofessional for a demo.
**What**: `process.env.DEMO_SECRET` with fallback disable if not set.
**Effort**: 10 minutes.

### 4. Add Global `middleware.ts` for Auth
**Why**: Per-route auth checks are fragile. One missed check = unprotected endpoint.
**What**: `src/middleware.ts` using NextAuth's `withAuth` to protect all non-public routes.
**Effort**: 1 hour.

### 5. Seed Demo Account and Test Full Flow
**Why**: Hackathon judges will demo the app. The 14-day engineered scenario must look compelling.
**What**: Run `/api/setup/demo`, walk through entire dashboard, verify AI response quality.
**Effort**: 2 hours (including prompt tuning).

### 6. Test CSV/Excel Upload End-to-End
**Why**: Upload pipelines are complex with custom parsers. Edge cases around encoding, empty rows, and missing headers need verification.
**What**: Test with real CSV/Excel files for all three domains.
**Effort**: 2 hours.

### 7. Mobile Responsiveness Audit
**Why**: Judges may demo on mobile. Dashboard at 2,500+ lines has complex layouts.
**What**: Test on 375px (iPhone SE) and 390px (iPhone 14). Fix critical layout breaks.
**Effort**: 3–4 hours.

### 8. Loading State Polish
**Why**: AI recommendations take 5–15 seconds. Empty states look broken.
**What**: Ensure every SWR-powered section has a meaningful skeleton/shimmer while loading.
**Effort**: 2 hours.

---

## Nice To Have

These improve quality and demo impact but aren't blockers.

### A. Extract Dashboard into Components
Split `dashboard/page.tsx` (2,500+ lines) into `src/components/dashboard/` modules.
**Benefit**: Maintainability, potential for lazy loading of non-critical sections.

### B. Custom Hooks (`src/hooks/`)
Create `useAIRecommend()`, `useLatestLogs()`, `useGoals()` to centralize SWR calls.
**Benefit**: Eliminates URL duplication, single place to update endpoint paths.

### C. Insights Page Charts
The Recharts dependency is imported but the Insights page may not have fully built-out domain trend charts.
**What**: Add 7-day and 30-day trend lines for each domain in `/insights`.

### D. Goal Velocity Display
Add an estimated completion date on the dashboard Mission Control section based on milestone completion rate.

### E. Notification/Toast System
Post-log submission currently shows inline state. A toast notification system would improve UX for gamification events (badge unlock, streak milestone).

### F. Onboarding Skip Option
Allow users to skip to dashboard without completing onboarding (start with default scores 50/50/50).

### G. Simulator Visualization
The simulator route exists but the visualization of trade-offs and timeline projections needs UI polish.

### H. Daily Challenge Accept Flow
Challenge cards exist in the AI payload but accepting/completing a challenge should trigger an XP event and visual confirmation.

---

## Long-Term Vision

### Real External Integrations

| Integration | Purpose | Complexity |
|---|---|---|
| Apple Health API | Real sleep, workout, heart rate data | High |
| Google Fit | Android health data | High |
| Plaid / Open Banking | Real bank account spending data | Very High |
| Coursera API | Real course progress | Medium |
| Garmin / Fitbit | Wearable device data | High |
| Notion / Obsidian | Notes and PKM integration | Medium |

Mock sync endpoints (`/api/mock?action=sync`) are placeholders for these.

### Advanced Analytics

- **Causal inference engine**: Beyond correlation, detect which behaviors *cause* score changes
- **Cohort analysis**: Compare user trajectory to anonymized peers in same archetype
- **Monte Carlo simulations**: Probabilistic financial projections over 5–30 year horizons
- **Physiological age model**: Estimate biological age from health metrics over 90+ days

### Mobile Application

- React Native app with push notifications
- Offline-first architecture with background sync
- Wearable integration (HealthKit, Google Fit)
- Daily reminder notifications at optimal times

### Social & Community Features

- Opt-in performance sharing ("twin leaderboards" by archetype)
- Accountability partner pairing
- Goal challenges between users

### AI Enhancements

- **Multi-model routing**: Use a cheaper model for stable users, Gemini Pro only for drift recovery
- **Voice-input logging**: Speech-to-text for log entry
- **Predictive alerts**: "Based on your pattern, you will miss your savings goal by ₹12,000 this month unless you reduce discretionary spend this week"
- **Personalized prompt evolution**: AI learns user's preferred recommendation style over time

### Subscription & Monetization

- Free tier: 7-day window, 1 AI reflection/day
- Pro tier: Unlimited history, 5 AI calls/day, real integrations, simulator
- Enterprise: Team dashboards, HR analytics (anonymized), wellness program management

### Infrastructure Evolution

- **Event sourcing**: Replace EMA updates with event log for full auditability
- **Dedicated analytics service**: Move scoring/drift to a separate microservice
- **Read replica**: Separate read/write MongoDB connections for scale
- **WebSockets**: Real-time score updates when logs come in from integrations
- **CDN for static assets**: Currently relies on Vercel edge for everything
