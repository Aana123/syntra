# Syntra — User Journey

The complete lifecycle from first visit to active daily use.

---

## 1. Signup

**Entry point**: `/signup`

The user arrives at the signup page and encounters four avatar choices before typing a single character. The avatar selection communicates what Syntra is before the form does — this is the identity commitment that sets tone for onboarding.

### What happens
1. User selects an avatar (Aether / Chronos / Apex / Nexus) — this sets `avatarId` (1–4)
2. Fills name, email, password
3. Password hints validate live: uppercase, number, special character, 8+ chars
4. `POST /api/auth/register` — Zod validation, duplicate email check, bcrypt hash, user created with scores `{50,50,50}`
5. `signIn("credentials")` is called immediately — JWT token minted
6. Redirect to `/onboarding`

### What the user has after this step
- Account in MongoDB
- Default scores (50/50/50 across all domains)
- No logs, no goals, no calibration
- Session JWT (30-day validity)

---

## 2. Onboarding

**Entry point**: `/onboarding`
**Protected**: requires session (middleware)

The four-step questionnaire is the first and most important data moment. It converts qualitative lifestyle answers into calibrated starting scores and creates three baseline log entries so the AI has initial context on first dashboard visit.

### Step 1 — Anatomical Layer
- Age, average sleep hours, workout frequency, health constraints (multi-select)
- Server computes `healthPotential` from sleep quality + workout frequency - constraint penalty

### Step 2 — Financial Layer
- Income range (preset buckets or custom number), monthly expenses, savings goal
- Server maps income to a number, computes `financePotential` from savings rate and expense ratio

### Step 3 — Behavioral Layer
- Daily study hours, focus rating (1–10), consistency self-score (1–10)
- Server computes `careerPotential` from study hours + focus + consistency bonus

### Step 4 — Identity Layer
- Archetype selection (maps to `optimizationVector`: health / finance / career)
- Personal mission statement (free text, optional)
- Initial goal seeds (optional)

### What happens on submit
- `POST /api/profile/onboard` calibrates all three scores
- `Log.insertMany()` creates 3 baseline log entries (one per domain)
- User document updated: scores, `optimizationVector`, `monthlyIncome`, `healthConstraints`, `onboardingComplete: true`
- Returns `{ healthPotential, financePotential, careerPotential, syncPercentage }`
- Completion animation shows the user's starting Sync %
- Redirect to `/dashboard`

### What the user has after this step
- Calibrated scores instead of flat 50/50/50
- 3 baseline logs (the AI can now build initial context)
- `optimizationVector` set — the dashboard prioritizes this domain
- Personal mission statement (if provided)

---

## 3. Dashboard

**Entry point**: `/dashboard`
**Protected**: requires session

The dashboard is the operating room. It renders all four twin layers simultaneously and is the surface where the AI delivers its daily intelligence.

### What loads on first visit
1. Session data (name, avatar, streak) — immediate, from JWT
2. `GET /api/log/latest` — scores and latest domain data (SWR)
3. `GET /api/ai/recommend` — AI reflection (SWR; first visit generates fresh, subsequent visits may hit cache)
4. `GET /api/goals` — active goals (SWR)

### Key dashboard moments
- **Twin Sync Ring** — the single animated number that tells the user how synchronized their three domains are
- **Twin State Badge** — Stable / Recovery Mode / Accelerating / Drifting (derived from score trends)
- **Daily Challenge** — AI-generated action tied to the user's weakest domain
- **Risk Alerts** — proactive flags (e.g., "2 nights <6h sleep — decision quality may be impaired")
- **Meal plan** — curated Indian meals addressing historical nutrient gaps
- **Study blocks** — time-boxed study schedule built from career log patterns
- **Wealth goals** — auto-computed deficit per financial goal

See [dashboard.md](dashboard.md) for the full component breakdown.

---

## 4. Logging

**Entry point**: `/ingestion`
**Protected**: requires session

The daily data input ritual. The user logs across three domains — health, finance, career — either individually or in a single unified submission.

### Preferred path: Unified Daily Log
`POST /api/log/daily` accepts all three domains + optional `dailyNote` in one request.

### What logging triggers
1. Domain scores recomputed via scoring algorithms
2. EMA update: `newScore = stored × 0.75 + computed × 0.25`
3. XP awarded (10 / 25 / 50 based on score tier)
4. Streak incremented (or reset if day was skipped)
5. Badge evaluation (streak milestones, score thresholds)
6. Background: `waitUntil(generateAndStoreSnapshot())` — AI pre-generated for next dashboard visit
7. Response: updated scores, gamification state, any new badges

### Alternative paths
- **CSV upload** at `/ingestion` — bulk import historical data
- **Excel upload** — same as CSV with SheetJS parsing
- **Mock sync** — simulates Apple Health / bank / Coursera data pull

### What the user sees after logging
- Score cards on ingestion page update immediately (optimistic or SWR revalidation)
- Badge unlock animation if a new badge was earned
- Streak counter incremented

---

## 5. Goals

**Entry point**: `/goals`
**Protected**: requires session

Goals are the connective tissue between daily actions and long-term outcomes. They also feed the AI context — `goalWorkedOn` in career logs and financial goal titles drive AI recommendations.

### Creating a goal
1. User enters title, selects domain and priority, optionally sets target date
2. `POST /api/goals` — goal appended to `user.goals[]` array
3. Financial goals with target amounts are parsed by `financeMath.ts` to auto-compute monthly savings requirements

### Working with milestones
- Milestones are embedded within a goal (`goal.milestones[]`)
- `POST /api/goals/milestone` — add milestone text
- `PATCH /api/goals/milestone` — mark complete
- Progress percentage = `completed milestones / total milestones`

### Mission Control (dashboard panel)
The dashboard surfaces the single highest-priority incomplete goal as the active "mission". Shows milestone progress bar, days remaining, and estimated completion date.

### Goal completion
Currently manual — the user marks milestones complete individually. Overall goal completion is inferred from all milestones being marked done.

---

## 6. Insights

**Entry point**: `/insights`
**Protected**: requires session

Deep domain analysis. The user selects a domain tab and receives AI analysis generated specifically for that domain's 2-week history.

### How it works
1. User selects domain (Health / Finance / Career)
2. `GET /api/ai/domain?domain=X` — fetches 42 recent logs, builds context, calls Gemini
3. Returns domain-specific analysis: summary, key insights, trends, recommendations, risk factors
4. Trend charts rendered via Recharts (7-day and 30-day views)

### Cross-domain ripple effects
The `TwinContext` behavioral flags surface connections between domains:
- **Sleep → Career**: Low sleep nights correlated with lower study hours (flag: `sleepCareerCorrelation`)
- **Stress → Finance**: High stress days correlated with overspending (flag: `stressSpendingCorrelation`)
- **Workout → Mood**: Exercise days correlated with higher mood scores (flag: `workoutMoodCorrelation`)

These ripple effects appear in the Behavioral Twin section and are explained in plain language by the AI's `explainability[]` array.

---

## 7. Simulation

**Entry point**: `/simulator`
**Protected**: requires session

The what-if engine. The user poses a scenario in natural language and Syntra projects the outcome — including trade-offs between domains.

### How it works
1. User enters scenario text (e.g., "What if I cut sleep to 5 hours to study more?")
2. Optionally selects a domain focus and timeframe
3. `POST /api/simulate` — current `TwinContext` + scenario sent to Gemini via simulator prompt
4. Response: narrative, projected scores (3-month), trade-off analysis, timeline visualization

### What makes simulations meaningful
Because the simulator has the user's real `TwinContext` (actual sleep averages, spending patterns, study consistency), projections are personalized — not generic. A user who already sleeps 5h/night gets a different projection than one who sleeps 9h.

---

## 8. Mission Completion

Mission completion in Syntra is not a single event — it's a trajectory state.

### Score-based milestones
- All three domain scores ≥ 80 → twin enters "Accelerating" state
- AI shifts recommendations from correction to optimization
- Pareto skills shift to advanced topics
- Wealth goals shift from "deficit reduction" to "surplus allocation"

### Goal-based completion
When all milestones in a goal are marked complete:
- Goal marked complete
- XP bonus triggered
- New goal suggested by AI based on current domain focus

### Streak-based milestones
- 7 days → "Week Warrior" badge
- 30 days → "Month Master" badge
- These are surfaced as XP boosts and celebration moments on the dashboard
