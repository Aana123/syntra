# Syntra — Twin Engine

The Twin Engine is the conceptual and computational core of Syntra. It defines four synchronized layers that together represent a user's full life state.

---

## Twin Concept

A Digital Twin is a computational model of a real-world system that updates as the real system changes. In Syntra, the "system" is the user — their body, habits, finances, and identity.

The key distinction from a tracker: a tracker records what happened. A twin *models* what is happening and predicts what will happen. Every data point doesn't just store a value — it updates a living model.

### How the model updates
Every log submission triggers:
1. Score recomputation via domain-specific algorithms
2. EMA update: `newScore = stored × 0.75 + newEntry × 0.25`
3. Context rebuild: `buildTwinContext(last42Logs)` produces updated TwinContext
4. Background AI refresh via `generateAndStoreSnapshot()`

The twin is always one log entry behind real-time — the AI snapshot reflects the state as of the last submission.

### The four layers work together
No twin layer operates in isolation. The Behavioral Twin detects correlations *between* the Anatomical, Financial, and Identity layers. This is what separates Syntra from three separate trackers in a trenchcoat.

---

## Anatomical Twin

Tracks the user's physical and physiological state.

### Data inputs (per Health log)
| Field | Range | Weight in score |
|---|---|---|
| `sleepHours` | 0–24 | 40 pts (max at 7–9h) |
| `workoutMinutes` | 0–300 | 40 pts (max at 60m+) |
| `stressLevel` | 1–10 | 20 pts (inverted) |
| `waterGlasses` | 0–20 | 5 pts bonus (≥8) |
| `caloriesConsumed` vs `calorieGoal` | — | 5 pts bonus (±200 cal) |
| `moodScore` | 1–10 | Used for correlation, not score |
| `energyLevel` | 1–10 | Used for correlation, not score |
| `skippedMeals` | boolean | Used for meal consistency flag |

### AI outputs for Anatomical Twin
- Historical nutrient gap detection (from calorie adherence + meal skipping patterns)
- Today's curated Indian meal plan addressing detected gaps
- Physiological age delta estimation (long-term)
- Sleep consistency analysis (not just duration — variance matters)
- Constraint-aware recommendations (vegetarian, diabetic, etc.)

### Key metrics in TwinContext
```typescript
weeklyAverages.sleep            // Average sleepHours
weeklyAverages.workout          // Average workoutMinutes
weeklyAverages.stressLevel      // Average stressLevel
weeklyAverages.calorieAdherence // caloriesConsumed / calorieGoal
weeklyAverages.waterIntake      // Average waterGlasses
weeklyAverages.mealConsistency  // % days with skippedMeals = false
trends.sleep                    // improving | declining | stable
trends.health                   // composite health trend
```

---

## Financial Twin

Tracks wealth trajectory, spending patterns, and goal feasibility.

### Data inputs (per Finance log)
| Field | Purpose |
|---|---|
| `amountSaved` | Core savings signal |
| `discretionarySpent` | Spending discipline metric |
| `spendingCategory` | Pattern classification |
| `spendingTime` | Lateness-of-day spending detection (auto-injected) |
| `biggestExpenseToday` | Top expense tracking |
| `impulseSpend` | Unplanned purchase flag |

### Score formula
```
Base 50 + savings bonus (5–30) + discretionary penalty (0 to -30) + impulse penalty (0 or -5)
Range: 0–100 (clamped)
```

### AI outputs for Financial Twin
- Pre-computed wealth goal deficits (monthly savings gap per goal)
- Budget adherence rate
- Spending trend analysis (consistent vs volatile)
- Month-end savings projection
- Stress-spending correlation warnings

### Key metrics in TwinContext
```typescript
weeklyAverages.savingsRate         // amountSaved / monthlyIncome
weeklyAverages.spendingVsBudget    // discretionarySpent / monthlyBudget
behaviorFlags.stressSpendingCorrelation
behaviorFlags.lateNightSpending
qualitative.topExpenseNames
qualitative.impulseSpendRate
```

### Wealth goal pre-computation (`financeMath.ts`)
Finance-domain goals with amounts in their titles are parsed to produce:
```typescript
{
  goalType: "home" | "car" | "education" | "wedding" | "emergency_fund" | "retirement" | "other";
  targetAmount: number;
  requiredMonthlySavings: number;
  actualMonthlySavings: number;
  deficit: number;
  deficitText: string;           // e.g., "₹8,500/mo below target"
  monthsRemaining: number;
}
```

---

## Behavioral Twin

The Behavioral Twin is the meta-layer — it watches how the Anatomical, Financial, and Identity twins interact with each other.

### What it tracks
Not scores, but *patterns in behavior across domains*. It answers the question: "How do your habits in one area affect outcomes in another?"

### Behavioral flags (computed in `buildTwinContext()`)

| Flag | Detection method | Implication |
|---|---|---|
| `stressSpendingCorrelation` | High-stress days → above-avg spending on same day | Emotional spending pattern |
| `sleepCareerCorrelation` | Low-sleep days → reduced study hours on same day | Sleep is a career multiplier |
| `workoutMoodCorrelation` | Workout days → higher mood score | Exercise is a mood intervention |
| `lateNightSpending` | >30% of finance logs after 9pm | Late-night spending pattern |
| `weekendDropoff` | Weekend scores consistently < weekday by 10+ pts | Routine collapse on unstructured days |

### Drift detection (via `driftEngine.ts`)
The Behavioral Twin also powers drift detection — identifying when behavior is diverging from established patterns:
- **Sleep drift**: recent 7-day avg vs prior 7-day avg
- **Spending drift**: recent vs prior discretionary spending
- **Study inconsistency**: variance in daily study hours

Drift Index 0–100. If > 15, the AI generates intervention recommendations. If > 40, risk alerts are triggered.

### Trend detection
Each major metric has a trend label computed by comparing first-half vs second-half averages of recent logs:
```typescript
trends.sleep, trends.productivity, trends.finance, trends.health
// Each: "improving" | "declining" | "stable"
```

---

## Identity Twin

The Identity Twin is the strategic layer — it represents the user's goals, mission, and chosen optimization focus.

### Components
- **Personal mission statement** (`user.personalMission`) — the user's self-defined purpose, injected verbatim into AI prompts
- **Optimization vector** (`user.optimizationVector`) — the user's primary focus domain (health / finance / career), set during onboarding and adjustable via `PATCH /api/profile/vector`
- **Goals** (`user.goals[]`) — hierarchical goals with milestones, domain tags, and priorities
- **Health constraints** (`user.healthConstraints`) — dietary or medical constraints that gate AI recommendations

### How the Identity Twin influences AI
1. `personalMission` is included in every Gemini prompt — recommendations are framed toward the stated mission
2. `optimizationVector` determines which domain's recommendations are most detailed and prioritized on the dashboard
3. `goals[].title` for finance goals are parsed by `financeMath.ts` — financial AI is aware of specific targets
4. `healthConstraints` prevents incompatible meal plan recommendations

### Avatar and archetype
The avatar chosen at signup (Aether/Chronos/Apex/Nexus) is cosmetic, but the archetype chosen during onboarding maps directly to `optimizationVector`:
- Aether / health_optimizer / wellness_seeker → `"health"`
- Chronos / career_climber / deep_work → `"career"`
- Nexus / wealth_builder / entrepreneur → `"finance"`
- Apex / peak → mapped by secondary preference question
