# Syntra — AI Engine

## Overview

The AI engine is built around Google Gemini 2.5 Flash and uses a **deterministic-first** design philosophy: expensive AI calls only interpret cheap pre-computed structured context. The AI never parses raw data — it reasons over a curated `TwinContext` object.

## Architecture

```
Raw Logs (MongoDB)
      │
      ▼
buildTwinContext()          ← Zero AI cost. Pure computation.
      │ TwinContext
      ▼
computeWealthGoals()        ← Zero AI cost. Math only.
      │ PreComputedWealthGoal[]
      ▼
calculateConfidenceScore()  ← Zero AI cost. logCount/21×100
      │ confidence: 0–100
      ▼
Prompt Construction         ← Template fills in structured data
      │ prompt: string
      ▼
callGemini()                ← Single API call, PII-masked
      │ rawResponse: string
      ▼
parseGeminiResponse()       ← Extract JSON from markdown blocks
      │ parsed: object
      ▼
Zod Schema Validation       ← Enforce response shape
      │ validated: aitwinReflectionResponse
      ▼
Snapshot Storage            ← Cache in User.aiSnapshot
```

---

## Gemini Integration (`src/lib/gemini.ts`)

### Configuration
```typescript
Model: "gemini-2.5-flash"
Temperature: 0.4           // Low — deterministic, consistent output
MaxRetries: 2
BaseDelay: 500ms           // Exponential backoff
```

### `callGemini<T>(prompt: string): Promise<T>`
- Constructs Gemini API request with JSON output instruction
- Strips PII before sending (name, email, phone, address, ID numbers)
- Retries on transient failures with exponential backoff
- Parses JSON from markdown code blocks (```` ```json ``` ````)
- Returns typed `T` or throws on repeated failure

### PII Anonymization (before every Gemini call)
Fields stripped/replaced:
- User name → `"User"`
- Email addresses → `"[email]"`
- Phone numbers → `"[phone]"`
- Physical addresses → `"[address]"`
- Indian ID numbers (Aadhaar, PAN) → `"[id]"`

---

## Context Builder (`src/lib/aiContextBuilder.ts`)

### `buildTwinContext(logs: Log[]): TwinContext`

Processes the last 42 logs (2-week window, 3 domains × 7 days × 2 buffer) and produces:

#### Weekly Averages
```typescript
weeklyAverages: {
  sleep: number;               // Average sleepHours across health logs
  workout: number;             // Average workoutMinutes
  studyHours: number;          // Average hoursStudied
  savingsRate: number;         // Average (amountSaved / monthlyIncome)
  moodScore: number;           // Average moodScore (0 if not logged)
  stressLevel: number;         // Average stressLevel
  calorieAdherence: number;    // caloriesConsumed / calorieGoal (0–1)
  spendingVsBudget: number;    // discretionarySpent / monthlyBudget (0–1)
  waterIntake: number;         // Average waterGlasses
  mealConsistency: number;     // % days where skippedMeals = false
}
```

#### Trend Detection
```typescript
trends: {
  sleep: "improving" | "declining" | "stable";
  productivity: "improving" | "declining" | "stable";
  finance: "improving" | "declining" | "stable";
  health: "improving" | "declining" | "stable";
}
```
Method: Compares first-half vs second-half average of sorted logs. Change > 10% = trend.

#### Behavioral Flags
```typescript
behaviorFlags: {
  stressSpendingCorrelation: boolean;  // High stress days → higher spending
  sleepCareerCorrelation: boolean;     // Low sleep → reduced study hours
  workoutMoodCorrelation: boolean;     // Workout days → higher mood score
  lateNightSpending: boolean;          // Spending logged after 21:00
  weekendDropoff: boolean;             // Lower scores on weekend logs
}
```

#### Qualitative Fields
```typescript
qualitative: {
  recentDailyNotes: string[];        // Last 5 reflection notes
  recentCourseNames: string[];       // Last 5 distinct course names
  recentGoalFocus: string[];         // Last 5 goalWorkedOn values
  recentBlockers: string[];          // Last 5 blockerToday values
  topExpenseNames: string[];         // Most frequent biggestExpenseToday
  impulseSpendRate: number;          // % of finance logs with impulseSpend=true
  skippedMealPattern: boolean;       // skippedMeals true in majority of logs
}
```

---

## Prompt Pipeline

### Daily Reflection Prompt (`src/lib/prompts/aitwinReflection.ts`)

#### `generateaitwinReflection(context: TwinContext, confidence: number, wealthGoals: PreComputedWealthGoal[]): string`

Constructs a multi-section prompt containing:
1. **Role definition** — "You are Syntra AI, a deterministic life optimization engine..."
2. **Twin context block** — Full JSON-serialized `TwinContext`
3. **Confidence level** — Affects how assertive recommendations should be
4. **Wealth goals** — Pre-computed financial targets and deficits
5. **Output schema** — Exact JSON structure required
6. **Constraints** — Response must be valid JSON, no markdown prose outside JSON

#### Required Output Schema (enforced by `aitwinReflectionSchema`)
```typescript
{
  twinPrediction: string;        // Predictive statement about near-term trajectory
  dailyReflection: string;       // Personalized reflection (2–4 sentences)
  explainability: string[];      // 3–5 plain-language score explanations
  dailyChallenge: {
    title: string;
    description: string;
    domain: "health" | "finance" | "career";
    xpReward: number;
  };
  recommendations: {
    health: string[];            // 2–3 actionable recommendations
    finance: string[];
    career: string[];
  };
  riskAlerts: string[];          // 0–3 risk warnings
  confidence: number;            // 0–100 (capped by data density)

  // Extended fields (finance)
  wealthGoals?: PreComputedWealthGoal[];

  // Extended fields (health)
  historicalNutrientGaps?: string[];
  todaysMealPlan?: Array<{
    meal: "Breakfast" | "Lunch" | "Dinner" | "Snack";
    items: string[];
    calories: number;
  }>;

  // Extended fields (career)
  paretoSkills?: Array<{
    skill: string;
    impactScore: number;
    estimatedHours: number;
  }>;
  studyBlocks?: Array<{
    time: string;
    topic: string;
    duration: number;
  }>;
}
```

### Domain Analysis Prompt (`src/lib/prompts/domainPrompts.ts`)

Three separate prompt generators, one per domain:

**`generateHealthAnalysisPrompt(context, logs)`**
- Focuses on: sleep consistency, nutrition synthesis, workout adherence, stress patterns
- Computes physiological age delta (estimated)
- Synthesizes historical nutrient gaps from meal patterns

**`generateFinanceAnalysisPrompt(context, logs, goals, income)`**
- Focuses on: spending trend (inverted from savings), budget adherence, wealth projections
- Pre-computes savings deficit for each financial goal
- Categorizes spending patterns

**`generateCareerAnalysisPrompt(context, logs, goals)`**
- Focuses on: skill gap analysis, Pareto-prioritized learning paths
- Study block scheduling (time-boxed sessions)
- Career trajectory based on consistency metrics

### Simulator Prompt (`src/lib/prompts/simulatorPrompt.ts` / `aisimulatorPrompt.ts`)

**`generateSimulatorPrompt(scenario, context, currentScores)`**
- What-if scenario analysis
- Projects scores across 3-month timeline
- Identifies trade-offs between domains
- Returns narrative + structured timeline points

### Challenge Prompt (`src/lib/prompts/challengePrompt.ts`)

**`generateChallengePrompt(context, completedChallenges)`**
- Generates personalized daily challenges
- Difficulty calibrated to current domain weakness
- XP reward proportional to difficulty

---

## Snapshot Service (`src/lib/snapshotService.ts`)

### `generateAndStoreSnapshot(userId: string): Promise<void>`

Background function called via `waitUntil()` after every log submission.

**Decision logic:**
```
1. Fetch user + recent logs
2. Compute driftIndex via analyzeBehavioralDrift()
3. If driftIndex < 15 AND all trends stable:
   → Generate math-only reflection (no Gemini call)
   → Store lightweight snapshot
4. Else:
   → buildTwinContext()
   → computeWealthGoals()
   → calculateConfidenceScore()
   → generateaitwinReflection() via Gemini
   → Store full AI snapshot
5. On any Gemini failure:
   → Store safe defaults
   → Log error to Telemetry
```

**Safe defaults structure** (returned on Gemini failure):
```json
{
  "twinPrediction": "Keep logging for better predictions.",
  "dailyReflection": "Your twin is stabilizing.",
  "explainability": [],
  "dailyChallenge": null,
  "recommendations": { "health": [], "finance": [], "career": [] },
  "riskAlerts": [],
  "confidence": 0
}
```

---

## Snapshot Caching (`/api/ai/recommend`)

### Cache Validity Check
```typescript
const snapshotDate = new Date(user.aiSnapshot.lastGeneratedAt);
const latestLog = await Log.findOne({ userId }).sort({ date: -1 }).lean();

const isSameDay = snapshotDate.toDateString() === new Date().toDateString();
const noNewerLogs = !latestLog || latestLog.date <= snapshotDate;

if (isSameDay && noNewerLogs) {
  // Serve from cache
  return JSON.parse(user.aiSnapshot.dailyReflection);
}
// Regenerate
```

### Cache Headers
```
Cache-Control: private, s-maxage=300, stale-while-revalidate=600
```
- `s-maxage=300` — CDN caches for 5 minutes
- `stale-while-revalidate=600` — Serve stale while revalidating for 10 minutes
- `private` — User-specific; not shared across CDN

---

## Confidence Score (`src/lib/confidenceScore.ts`)

```typescript
function calculateConfidenceScore(logCount: number): number {
  return Math.min(logCount / 21, 1.0) * 100;
}
```

- **21 logs** = 1 week of full tracking (7 days × 3 domains)
- **0 logs** = 0% confidence
- **21+ logs** = 100% confidence (capped)
- Used as a ceiling: AI confidence in recommendations cannot exceed data density

---

## Drift Interception (`src/lib/driftEngine.ts`)

### `analyzeBehavioralDrift(logs: Log[]): DriftAnalysis`

```typescript
{
  driftIndex: number;              // 0–100 composite drift score
  primaryDivergenceCause: string;  // Most significant drift driver
  recommendations: string[];       // Immediate interventions
  isStable: boolean;               // driftIndex < 15
}
```

**Drift Components:**
1. **Sleep drift** — Recent 7-day avg vs previous 7-day avg, weighted ×0.3
2. **Spending drift** — Discretionary spike detection, weighted ×0.3
3. **Study inconsistency** — Variance in hoursStudied, weighted ×0.4

**Drift thresholds:**
- `< 15` — Stable, skip full AI generation
- `15–40` — Moderate drift, generate recommendations
- `> 40` — High drift, generate risk alerts

---

## AI Response Validation (`src/types/ai.ts`)

```typescript
const aitwinReflectionSchema = z.object({
  twinPrediction:  z.string().min(20).max(300),
  dailyReflection: z.string().min(30).max(500),
  explainability:  z.array(z.string()).min(2).max(7),
  dailyChallenge:  z.object({ title, description, domain, xpReward }).nullable(),
  recommendations: z.object({
    health:  z.array(z.string()).min(1).max(4),
    finance: z.array(z.string()).min(1).max(4),
    career:  z.array(z.string()).min(1).max(4),
  }),
  riskAlerts:      z.array(z.string()).max(3),
  confidence:      z.number().min(0).max(100),
})
```

Schema enforcement ensures malformed Gemini responses don't reach clients. On parse failure, safe defaults are returned and error is logged to Telemetry.
