# Syntra — Simulator

The simulator is Syntra's what-if engine. It lets users run forward-looking scenarios against their actual behavioral data and see projected outcomes — including cross-domain trade-offs — before making a decision.

---

## Input

**Entry point**: `/simulator` page → `POST /api/simulate`

### Request shape
```typescript
{
  scenario: string;    // Natural language scenario description (required)
  domain?: string;     // Optional focus domain: "health" | "finance" | "career"
  timeframe?: string;  // e.g., "3 months", "6 weeks", "1 year"
}
```

### Example inputs
```
"What happens if I cut sleep to 5 hours to study more for the next month?"
"If I stop working out for 3 months and redirect that time to studying, what's the impact?"
"What if I increase my savings rate to 40% by cutting discretionary spend?"
"If I take on a second job for 6 months, how does it affect my health and career scores?"
```

The scenario is free-form — Gemini interprets the intent. The `domain` parameter focuses the analysis if the user wants depth on a specific twin.

---

## Math Engine

The simulator does not run a custom math model. It feeds the user's real `TwinContext` — the same structured data that powers daily recommendations — into a scenario-aware Gemini prompt.

### What makes it accurate (not generic)
The simulation is personalized because the prompt contains:
- **Current weekly averages**: actual sleep, study, savings, stress from the last 42 logs
- **Current trends**: whether each domain is improving, declining, or stable
- **Behavioral flags**: known correlations (sleep-career, stress-spending, etc.)
- **Current scores**: the actual EMA-smoothed domain scores
- **Wealth goals**: pre-computed targets and deficits
- **Confidence**: how much data backs the projections

### Prompt (`src/lib/prompts/aisimulatorPrompt.ts`)
The simulator prompt instructs Gemini to:
1. Interpret the scenario in the context of the user's current baselines
2. Project each domain score forward over the requested timeframe
3. Identify first-order effects (the intended outcome of the scenario)
4. Identify second-order effects (cross-domain ripple consequences)
5. Generate a timeline of projected state changes
6. Identify the breakeven point if applicable

### Gemini configuration
- **Model**: `gemini-2.5-flash`
- **Temperature**: 0.4 (low — consistent, deterministic projections)
- **Timeout**: 30s (covered by `vercel.json` maxDuration)

---

## Output

### Response shape
```typescript
{
  success: true;
  simulation: {
    narrative: string;                  // 3–5 paragraph plain-language analysis
    projectedScores: {
      health: number;                   // Projected score at end of timeframe (0–100)
      finance: number;
      career: number;
    };
    tradeoffs: Array<{
      gain: string;                     // What improves
      cost: string;                     // What suffers
      severity: "low" | "medium" | "high";
    }>;
    timeline: Array<{
      week: number;                     // Week number from today
      event: string;                    // Predicted state change
      domain: "health" | "finance" | "career";
    }>;
    breakeven?: string;                 // "Week 6 — career gains offset health losses"
    recommendation: string;            // Whether to proceed, modify, or avoid the scenario
  }
}
```

### Example output (sleep reduction scenario)
```json
{
  "narrative": "Cutting sleep to 5h while increasing study time creates a productivity paradox. Your current baseline of 6.8h already sits below the optimal range. At 5h, cognitive function drops measurably by week 2...",
  "projectedScores": { "health": 48, "finance": 79, "career": 74 },
  "tradeoffs": [
    { "gain": "Study hours increase from 3h to 5h daily", "cost": "Sleep debt compounds — decision quality drops ~18%", "severity": "high" },
    { "gain": "Career score rises initially", "cost": "Productivity gains reverse by week 3 due to fatigue", "severity": "medium" }
  ],
  "timeline": [
    { "week": 1, "event": "Study hours increase, short-term productivity spike", "domain": "career" },
    { "week": 2, "event": "Sleep debt accumulates, stress spikes to 8+", "domain": "health" },
    { "week": 3, "event": "Productivity rating drops despite study hours maintained", "domain": "career" },
    { "week": 4, "event": "Stress-spending correlation activates — discretionary spend rises", "domain": "finance" }
  ],
  "breakeven": "There is no breakeven — the scenario produces net negative return by week 3.",
  "recommendation": "Do not proceed. Consider a 6.5h sleep floor with a 4h focused study block instead."
}
```

---

## Risk Analysis

The simulator's most distinctive output is cross-domain risk — consequences that span multiple twins.

### How cross-domain risk is identified
The simulator prompt explicitly instructs Gemini to check the `behaviorFlags` from `TwinContext` before projecting:
- If `sleepCareerCorrelation = true` and the scenario involves sleep reduction → flag career degradation risk
- If `stressSpendingCorrelation = true` and the scenario increases workload → flag finance spillover risk
- If the scenario involves income changes → flag across all three domains

### Risk severity scoring
```
LOW    — effect is detectable but below 5-point score impact
MEDIUM — 5–15 point score impact, recoverable within 2 weeks
HIGH   — >15 point score impact or sustained multi-week consequence
```

### What the simulator will not do
- Promise exact scores (always framed as projections, not certainties)
- Ignore the user's actual data patterns (it never uses generic baselines)
- Generate recommendations that conflict with detected health constraints

---

## Usage Guidance

The simulator is designed for deliberate scenario planning — not daily use. It's most valuable when:

1. **Before a major lifestyle change** — new job, moving cities, starting a course
2. **Evaluating trade-offs** — "Should I sacrifice sleep to hit a career deadline?"
3. **Financial planning** — "If I increase savings to buy a house, what's the monthly lifestyle impact?"
4. **Recovery planning** — "How quickly can my health score recover if I restart workouts?"
