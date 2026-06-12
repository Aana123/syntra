# Syntra — Onboarding Flow

## Overview

Onboarding is a four-layer questionnaire (`src/app/onboarding/page.tsx`) that calibrates the digital twin before the user ever logs a single entry. It converts qualitative answers into quantitative baseline scores and creates three seed log entries in MongoDB.

Users arrive here via redirect from `/signup` upon successful registration.

---

## Flow Diagram

```
/signup (registration complete)
    │
    ▼
/onboarding (page.tsx)
    │
    ├── Step 1: Anatomical Layer (physical profile)
    ├── Step 2: Financial Layer (income, budget, savings)
    ├── Step 3: Behavioral Layer (study, focus, consistency)
    └── Step 4: Identity Layer (mission, archetype, goals)
    │
    ▼
POST /api/profile/onboard
    │
    ▼
Score calibration + 3 baseline logs created
    │
    ▼
/dashboard (redirect)
```

---

## Step 1: Anatomical Layer

### Fields Collected
```typescript
age: number;                  // Age in years
sleepHours: number;           // Average sleep per night
workoutFrequency: number;     // Days per week with exercise
healthConstraints?: string[]; // Multi-select: vegetarian, diabetic, lactose-intolerant, etc.
```

### Health Potential Calculation (server-side)
```
sleepScore    = [7–9h] → 40 | [6h/10h] → 30 | [5h/11h] → 20 | else → 5
workoutScore  = frequency × (40/7) × 2   (days/week normalized to daily minutes)
constraintPenalty = len(constraints) × 3  (each constraint reduces potential slightly)

healthPotential = min(sleepScore + workoutScore - constraintPenalty, 100)
```

---

## Step 2: Financial Layer

### Fields Collected
```typescript
incomeRange: string;      // "student" | "0-20k" | "20-50k" | "50-100k" | "100k+" | custom string
monthlyExpenses: number;  // Fixed monthly obligations
savingsGoal: number;      // Target monthly savings amount
```

### Income Mapping (server-side)
```typescript
const incomeMap: Record<string, number> = {
  "student":  0,
  "0-20k":    10000,
  "20-50k":   35000,
  "50-100k":  75000,
  "100k+":    125000,
};

// If incomeRange not in map, try parsing as a number:
const incomeNum = incomeMap[incomeRange] ?? parseFloat(incomeRange) ?? 0;
```

### Finance Potential Calculation (server-side)
```
savingsRate        = savingsGoal / incomeNum (0 if income = 0)
savingsScore       = [≥0.3] → 30 | [≥0.2] → 20 | [≥0.1] → 15 | else → 5
runway             = (monthlyExpenses / incomeNum) × 100 (expense ratio)
runwayPenalty      = runway > 80 ? -15 : runway > 60 ? -8 : 0
discretionaryBudget = incomeNum - monthlyExpenses - savingsGoal
discretionaryScore = max(0, min(20, discretionaryBudget / 1000))

financePotential   = min(50 + savingsScore + discretionaryScore + runwayPenalty, 100)
```

---

## Step 3: Behavioral Layer

### Fields Collected
```typescript
studyHoursPerDay: number;   // Daily study/skill development hours
focusRating: number;        // Self-assessed focus quality (1–10)
consistencyScore: number;   // Self-assessed habit consistency (1–10)
```

### Career Potential Calculation (server-side)
```
studyScore       = min(studyHoursPerDay × 10, 50)
focusScore       = focusRating × 5
consistencyBonus = consistencyScore >= 8 ? 10 : consistencyScore >= 6 ? 5 : 0

careerPotential = min(studyScore + focusScore + consistencyBonus, 100)
```

---

## Step 4: Identity Layer

### Fields Collected
```typescript
archetype: string;         // Determines optimizationVector
personalMission?: string;  // Free-text life mission statement
initialGoals?: string[];   // Optional goal seeds
```

### Archetype → Optimization Vector Mapping
```typescript
const archetypeMap: Record<string, "health" | "finance" | "career"> = {
  "health_optimizer":   "health",
  "athlete":            "health",
  "wellness_seeker":    "health",
  "wealth_builder":     "finance",
  "entrepreneur":       "finance",
  "financial_freedom":  "finance",
  "career_climber":     "career",
  "knowledge_seeker":   "career",
  "deep_work":          "career",
};
```

---

## Syntra Core Calculation
```
syncPercentage = (healthPotential + financePotential + careerPotential) / 3
```
Displayed on completion screen as "Your Starting Sync %"

---

## Server-Side Processing (`POST /api/profile/onboard`)

### 1. Score Computation
All four calculations above run server-side, not in the browser.

### 2. Baseline Log Creation
```typescript
await Log.insertMany([
  {
    userId,
    date: new Date(),
    domain: "health",
    domainData: {
      sleepHours: answers.sleepHours,
      workoutMinutes: Math.round(answers.workoutFrequency * 60 / 7), // avg daily minutes
      stressLevel: 5,  // Neutral baseline
      computedScore: healthPotential,
    }
  },
  {
    userId,
    date: new Date(),
    domain: "finance",
    domainData: {
      amountSaved: Math.round(incomeNum * savingsRate),
      discretionarySpent: Math.round(incomeNum * 0.3), // Estimated
      computedScore: financePotential,
    }
  },
  {
    userId,
    date: new Date(),
    domain: "career",
    domainData: {
      hoursStudied: answers.studyHoursPerDay,
      productivityRating: answers.focusRating,
      computedScore: careerPotential,
    }
  }
]);
```

### 3. User Profile Update
```typescript
await User.findByIdAndUpdate(userId, {
  $set: {
    age: answers.age,
    healthConstraints: answers.healthConstraints || [],
    monthlyIncome: incomeNum,
    monthlyBudget: answers.monthlyExpenses,
    optimizationVector: archetypeMap[answers.archetype] || "career",
    personalMission: answers.personalMission || "",
    "scores.health": healthPotential,
    "scores.finance": financePotential,
    "scores.career": careerPotential,
    onboardingComplete: true,
  }
});
```

### 4. Response to Client
```json
{
  "success": true,
  "data": {
    "healthPotential": 72,
    "financePotential": 65,
    "careerPotential": 80,
    "syncPercentage": 72.3,
    "optimizationVector": "career"
  }
}
```

---

## Frontend UX Notes (`src/app/onboarding/page.tsx`)

### Multi-Step Navigation
- Progress indicator (4 steps, current step highlighted)
- "Back" and "Next" buttons per step
- Final step: "Complete Setup" triggers API call

### Step Validation
- Each step validates required fields before allowing "Next"
- Optional fields have clearly marked indicators
- Numeric inputs have min/max constraints matching server-side validation

### Completion Screen
- Animated sync percentage reveal
- Domain breakdown (three score cards)
- "Enter Your Dashboard" CTA → `/dashboard`

### Error Handling
- API errors displayed inline (not alert())
- Form resets to step 4 on failure (preserves prior step data)

---

## Avatar Selection (Signup → Carries through Onboarding)

Avatar is set during signup, not onboarding. The four options are:

| ID | Name | Theme | Color |
|---|---|---|---|
| 1 | Aether | Health & Wellness | Blue/Cyan |
| 2 | Chronos | Career & Time | Green |
| 3 | Apex | Peak Performance | Purple |
| 4 | Nexus | Wealth & Finance | Gold |

The `avatarId` is stored in the User document and surfaced in session JWT for immediate use throughout the app.

---

## Goal Initialization

If the user provides `initialGoals` in the identity layer:
- Goals are created with `domain` inferred from keyword matching
- Default priority: `"medium"`
- No target date set (user can add later)

Goals are optional at onboarding — users can create them from the Goals page post-onboarding.
