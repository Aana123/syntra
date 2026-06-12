# Syntra — Drift Engine

The Drift Engine detects when a user's behavior is diverging from their established baseline — and tells the AI whether to intervene or stay quiet.

---

## Purpose

Two problems the Drift Engine solves:

1. **Proactive intervention**: Detect behavioral divergence before the user notices it in their scores. A score drop is a lagging indicator; drift is a leading indicator.

2. **AI cost control**: Gemini API calls are expensive. If nothing has changed and the user is stable, there's no need to regenerate the AI snapshot. The Drift Engine decides whether to call Gemini or skip it.

---

## Inputs

### Source: `analyzeBehavioralDrift(logs: ILog[]): DriftAnalysis`

**Location**: `src/lib/driftEngine.ts`

**Input**: Array of recent log documents, typically the last 14–28 per domain.

**Minimum requirement**: At least 6 logs across both the "recent" and "prior" windows for meaningful comparison.

### Data extracted per domain

**Health logs** → `sleepHours`, `stressLevel`
**Finance logs** → `discretionarySpent`
**Career logs** → `hoursStudied`

---

## Calculations

### Component 1: Sleep Drift (weight: 0.3)

```
recent7DayAvg  = mean(last 7 health logs, sleepHours)
prior7DayAvg   = mean(prev 7 health logs, sleepHours)

sleepDrift = max(0, (prior7DayAvg - recent7DayAvg) / prior7DayAvg × 100)
```

Only negative changes count — improving sleep does not increase drift. Sleep drift is zero if recent sleep ≥ prior sleep.

### Component 2: Spending Drift (weight: 0.3)

```
recentSpend = mean(last 7 finance logs, discretionarySpent)
priorSpend  = mean(prev 7 finance logs, discretionarySpent)

spendDrift = max(0, (recentSpend - priorSpend) / priorSpend × 100)
```

Only upward spending changes count — reducing spending does not increase drift.

### Component 3: Study Inconsistency (weight: 0.4)

```
studyHours = [last 14 career logs, hoursStudied]
variance   = standard deviation of studyHours

studyDrift = min(variance × 10, 100)
```

Unlike the other two components, this measures *inconsistency* rather than direction. High variance in study hours — alternating between 6h and 0h — indicates behavioral instability even if the average is acceptable.

Study inconsistency has the highest weight (0.4) because it's the strongest predictor of career score degradation.

### Composite Drift Index

```
driftIndex = (sleepDrift × 0.3) + (spendDrift × 0.3) + (studyDrift × 0.4)
```

**Range**: 0–100

---

## Outputs

### `DriftAnalysis` object

```typescript
{
  driftIndex: number;              // 0–100 composite score
  primaryDivergenceCause: string;  // Which component contributed most
  recommendations: string[];       // Immediate interventions (2–3 items)
  isStable: boolean;               // driftIndex < 15
}
```

### `primaryDivergenceCause` logic

The component with the highest weighted contribution wins:
```
if sleepDrift × 0.3 > spendDrift × 0.3 AND sleepDrift × 0.3 > studyDrift × 0.4:
  → "sleep_degradation"

if spendDrift × 0.3 > sleepDrift × 0.3 AND spendDrift × 0.3 > studyDrift × 0.4:
  → "spending_spike"

if studyDrift × 0.4 is dominant:
  → "study_inconsistency"

if no single component is clearly dominant:
  → "multi_domain_drift"
```

### Recommendation generation

Recommendations are heuristic (not AI-generated) — generated instantly with no API cost:

| Cause | Recommendations |
|---|---|
| `sleep_degradation` | "Protect 7h sleep tonight", "Move study sessions to morning to avoid late nights" |
| `spending_spike` | "No discretionary purchases today", "Review last 5 transactions" |
| `study_inconsistency` | "Set a fixed 2h study block today", "Remove decision-making from your study routine" |
| `multi_domain_drift` | Combination of the above |

---

## Thresholds

| Range | State | Action |
|---|---|---|
| 0–14 | **Stable** | Skip AI generation. Return lightweight snapshot. |
| 15–39 | **Moderate drift** | Generate full AI snapshot with drift-aware recommendations. |
| 40–100 | **High drift** | Generate full AI snapshot with risk alerts. Flag twin state as "Drifting". |

### The stable threshold (< 15) in practice

A drift index of 14 means:
- Sleep may have dropped slightly (within ~0.5h of baseline)
- Spending may have ticked up slightly
- Study hours are reasonably consistent

This is normal day-to-day variation. Calling Gemini for this wastes API quota and produces recommendations that aren't actionable. The `snapshotService.ts` skips the Gemini call entirely for `isStable = true` users and returns a lightweight math-only reflection instead.

---

## Integration Points

### After every log submission
`generateAndStoreSnapshot(userId)` (called via `waitUntil()`) runs `analyzeBehavioralDrift()` as its first step to decide whether a full AI call is needed.

### In the AI context
`driftIndex` and `primaryDivergenceCause` are passed into the Gemini prompt. This ensures the AI's recommendations directly address the detected divergence rather than generic advice.

### Dashboard twin state badge
The dashboard's "Twin State" badge uses the drift index:
- `driftIndex < 15` → "Stable"
- `driftIndex 15–39` → "Recovery Mode"
- `driftIndex ≥ 40` → "Drifting"
- All scores ≥ 80 and all trends "improving" → "Accelerating" (overrides drift)
