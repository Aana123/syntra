# Syntra — Analytics Engine

## Overview

The analytics engine is a fully deterministic, zero-AI-cost layer that transforms raw log data into meaningful scores, trends, and behavioral signals. It runs synchronously on every log submission and feeds structured output to the AI engine.

---

## Scoring System (`src/lib/scoring.ts`)

### Health Score — `calculateHealthScore(data: HealthData): number`

Produces a 0–100 score representing physiological wellbeing for a single log entry.

```
Component        Weight    Logic
─────────────────────────────────────────────────────────────────
Sleep            40 pts    [7–9h] = 40 pts, [6h or 10h] = 30 pts
                           [5h or 11h] = 20 pts, <5h or >11h = 5 pts
Workout          40 pts    ≥60 min = 40 pts, 30–59 min = 30 pts
                           15–29 min = 20 pts, 1–14 min = 10 pts
                           0 min = 0 pts
Stress           20 pts    (10 - stressLevel) × 2 pts
                           (inverted: stress=1 → 18 pts, stress=10 → 0 pts)
Hydration bonus   5 pts    waterGlasses ≥ 8 = +5 pts (additive)
Calorie bonus     5 pts    |caloriesConsumed - calorieGoal| ≤ 200 = +5 pts
```

**Maximum: 110 pts (capped at 100)**

---

### Finance Score — `calculateFinanceScore(data: FinanceData, monthlyIncome?: number): number`

Produces a 0–100 score representing financial discipline for a single log entry.

```
Component              Logic
──────────────────────────────────────────────────────────────────
Base score             50 pts
Savings bonus          amountSaved / monthlyIncome:
                       ≥30% → +30 pts
                       ≥20% → +20 pts
                       ≥10% → +15 pts
                       >0   → +5 pts
Discretionary penalty  discretionarySpent > 100% budget → -20 pts
                       discretionarySpent > 150% budget → -30 pts
Impulse penalty        impulseSpend = true → -5 pts
```

**Range: 0–100 (clamped)**

---

### Career Score — `calculateCareerScore(data: CareerData): number`

Produces a 0–100 score representing professional development for a single log entry.

```
Component           Weight    Logic
──────────────────────────────────────────────────────────────────
Study Hours         50 pts    hoursStudied × 10 (capped at 50)
                              e.g., 5h = 50 pts, 2h = 20 pts
Productivity        50 pts    productivityRating × 5
                              e.g., rating 10 = 50 pts, rating 5 = 25 pts
```

**Maximum: 100 pts**

---

### Syntra Core — `calculateSyntraCore(scores: DomainScores): number`

```typescript
function calculateSyntraCore(scores: DomainScores): number {
  return (scores.health + scores.finance + scores.career) / 3;
}
```

Single composite metric (0–100) representing overall life synchronization. Displayed as "Twin Sync %" on dashboard.

---

## Exponential Moving Average (EMA)

Every domain score update uses EMA rather than direct replacement or simple averaging.

### Formula
```
newScore = currentStoredScore × 0.75 + newEntryScore × 0.25
```

### Properties
- **Recency bias**: New data has 25% weight, historical baseline has 75%
- **Stability**: Prevents single bad day from collapsing scores
- **Recovery sensitivity**: Three consecutive good logs restore ~58% of a deficit
- **Decay behavior**: A score of 80 with daily 50-point entries stabilizes at ~65

### Application Points
Applied in:
- `POST /api/log` — single domain entry
- `POST /api/log/daily` — all three domains per submission

```typescript
const newHealthScore = user.scores.health * 0.75 + computedHealthScore * 0.25;
const newFinanceScore = user.scores.finance * 0.75 + computedFinanceScore * 0.25;
const newCareerScore = user.scores.career * 0.75 + computedCareerScore * 0.25;
```

---

## XP & Gamification Calculations (`src/lib/scoring.ts`)

### `calculateEarnedXP(score: number): number`

```
Score ≥ 80  → 50 XP   (Excellence tier)
Score ≥ 50  → 25 XP   (Active tier)
Score < 50  → 10 XP   (Participation tier)
```

### Streak Calculation

Applied in log endpoints:
```typescript
const today = new Date().toDateString();
const lastLog = user.gamification.lastLogDate?.toDateString();

if (lastLog === yesterday.toDateString()) {
  newStreak = currentStreak + 1;     // Consecutive — increment
} else if (lastLog === today) {
  newStreak = currentStreak;         // Same day — no change
} else {
  newStreak = 1;                     // Gap detected — reset to 1
}
```

### Badge Unlock Conditions

| Badge ID | Trigger |
|---|---|
| `week_warrior` | `streak >= 7` |
| `month_master` | `streak >= 30` |
| `rising_twin` | `totalPoints >= 500` |
| `health_champion` | `scores.health >= 80` |
| `finance_champion` | `scores.finance >= 80` |
| `career_champion` | `scores.career >= 80` |

Badges are additive (never removed) and stored in `user.badges[]`.

---

## Drift Engine (`src/lib/driftEngine.ts`)

### `analyzeBehavioralDrift(logs: Log[]): DriftAnalysis`

Detects when user behavior is diverging from established patterns.

#### Input Window
- 14 most recent logs per domain (28-day window max)
- Requires minimum 6 logs for meaningful comparison

#### Drift Index Components

**Sleep Drift (weight: 0.3)**
```
recent7DayAvg = avg(last 7 health logs, sleepHours)
prior7DayAvg  = avg(prev 7 health logs, sleepHours)
sleepDrift    = max(0, (prior7DayAvg - recent7DayAvg) / prior7DayAvg × 100)
```

**Spending Drift (weight: 0.3)**
```
recentSpend = avg(last 7 finance logs, discretionarySpent)
priorSpend  = avg(prev 7 finance logs, discretionarySpent)
spendDrift  = max(0, (recentSpend - priorSpend) / priorSpend × 100)
```

**Study Inconsistency (weight: 0.4)**
```
studyHours  = last 14 career logs, hoursStudied
variance    = stddev(studyHours)
studyDrift  = min(variance × 10, 100)
```

#### Composite Formula
```
driftIndex = (sleepDrift × 0.3) + (spendDrift × 0.3) + (studyDrift × 0.4)
isStable   = driftIndex < 15
```

#### `primaryDivergenceCause` Logic
Returns the component with the highest weighted contribution:
- `"sleep_degradation"` — sleep drift dominant
- `"spending_spike"` — spending drift dominant
- `"study_inconsistency"` — study drift dominant
- `"multi_domain_drift"` — no single dominant cause

---

## Trend Detection (`src/lib/aiContextBuilder.ts`)

### Method: First-Half vs Second-Half Average

For each domain metric within the last 42 logs:
1. Sort chronologically
2. Split in half
3. Compare first-half mean to second-half mean

```typescript
function detectTrend(values: number[]): "improving" | "declining" | "stable" {
  const midpoint = Math.floor(values.length / 2);
  const firstHalfMean = mean(values.slice(0, midpoint));
  const secondHalfMean = mean(values.slice(midpoint));
  const changePct = (secondHalfMean - firstHalfMean) / firstHalfMean;

  if (changePct > 0.10) return "improving";
  if (changePct < -0.10) return "declining";
  return "stable";
}
```

Tracked trends:
- `sleep` — from health logs
- `productivity` — from career logs (productivityRating)
- `finance` — from finance logs (amountSaved trend)
- `health` — composite of sleep + workout

---

## Behavioral Flag Detection (`src/lib/aiContextBuilder.ts`)

### `stressSpendingCorrelation`
```
For each day with both health and finance logs:
  highStressDay = stressLevel >= 7
  highSpendDay  = discretionarySpent > rollingAvg × 1.25
correlation = |days where both are true| / |totalDays| >= 0.4
```

### `sleepCareerCorrelation`
```
lowSleepDay  = sleepHours < 6
lowStudyDay  = hoursStudied < rollingAvg × 0.7
correlation  = |days where both are true| / |totalDays| >= 0.4
```

### `workoutMoodCorrelation`
```
workoutDay     = workoutMinutes > 0
elevatedMood   = moodScore >= 7
correlation    = |days where both are true| / |workoutDays| >= 0.5
```

### `lateNightSpending`
```
lateNightLog = spendingTime >= 21 (9 PM or later)
flag         = |lateNightLogs| / |totalFinanceLogs| >= 0.3
```

### `weekendDropoff`
```
weekendDays = logs where dayOfWeek in [0, 6]
weekdayAvg  = avg score on weekday logs
weekendAvg  = avg score on weekend logs
flag        = weekdayAvg - weekendAvg >= 10
```

---

## Wealth Goal Pre-computation (`src/lib/financeMath.ts`)

### `computeWealthGoals(goals: IGoal[], monthlyIncome?: number): PreComputedWealthGoal[]`

Filters finance-domain goals and computes monthly savings requirements.

#### Goal Type Classification (keyword matching)
```
"home", "house", "flat", "apartment", "property" → "home"
"car", "vehicle", "bike", "scooter"              → "car"
"education", "college", "mba", "course", "fees"  → "education"
"wedding", "marriage"                             → "wedding"
"emergency", "fund", "corpus"                    → "emergency_fund"
"retire", "retirement", "pension"                → "retirement"
(default)                                        → "other"
```

#### Amount Extraction (regex)
```
₹X lakh / X lakhs → X × 100,000
₹X,XXX,XXX        → parsed number
X crore            → X × 10,000,000
```

#### Deficit Calculation
```typescript
monthsRemaining        = months between now and targetDate
requiredMonthlySavings = targetAmount / monthsRemaining
actualMonthlySavings   = (monthlyIncome || 0) × user.avgSavingsRate
deficit                = requiredMonthlySavings - actualMonthlySavings
deficitText            = deficit > 0 ? `₹${deficit}/mo below target` : "On track"
```

---

## Confidence Score (`src/lib/confidenceScore.ts`)

```typescript
calculateConfidenceScore(logCount: number): number {
  // 21 = 1 week × 3 domains = full behavioral picture
  return Math.min(logCount / 21, 1.0) * 100;
}
```

| Logs | Confidence | Meaning |
|---|---|---|
| 0 | 0% | No data |
| 7 | 33% | 2–3 days |
| 21 | 100% | Full week across all domains |
| 42 | 100% (capped) | 2-week window |

Used as both: (1) AI response confidence ceiling, (2) Dashboard display metric.
