# Syntra — API Reference

All routes are under `/api`. Authentication uses NextAuth JWT sessions (cookie-based). Protected routes require a valid session; unauthenticated requests return `401`.

---

## Authentication

### `POST /api/auth/register`
Register a new user account.

**Auth Required**: No

**Request Body:**
```typescript
{
  name: string;              // Required
  email: string;             // Required, valid email format
  password: string;          // Required, min 8 chars, 1 uppercase, 1 number, 1 special char
  age?: number | string;     // Optional, coerced to number
  avatarId?: number;         // Optional (default: 1), 1–4
  monthlyIncome?: number;    // Optional, INR
  monthlyBudget?: number;    // Optional, INR
}
```

**Response (201):**
```json
{ "success": true, "message": "User registered successfully. Please sign in." }
```

**Errors:**
- `400` — Zod validation failure with `errors` field
- `409` — Email already registered
- `500` — Server error

---

### `POST /api/auth/[...nextauth]` / `GET /api/auth/[...nextauth]`
NextAuth.js handler. Provides login, logout, session, CSRF endpoints.

**Key endpoint: `POST /api/auth/callback/credentials`**

**Request Body:**
```json
{ "email": "user@example.com", "password": "plaintext" }
```

**Session Shape (client-accessible):**
```typescript
{
  user: {
    id: string;
    name: string;
    email: string;
    avatarId: number;
    streak: number;
    optimizationVector?: "health" | "finance" | "career";
  };
  expires: string; // ISO date, 30 days from login
}
```

---

## Profile & Onboarding

### `POST /api/profile/onboard`
Submit the 4-layer onboarding questionnaire and calibrate initial twin scores.

**Auth Required**: Yes

**Request Body:**
```typescript
{
  // Anatomical Layer
  age: number;
  sleepHours: number;       // Average sleep per night
  workoutFrequency: number; // Days per week
  healthConstraints?: string[]; // ["vegetarian", "diabetes", etc.]

  // Financial Layer
  incomeRange: string;      // "student" | "0-20k" | "20-50k" | "50-100k" | "100k+" | custom number
  monthlyExpenses: number;
  savingsGoal: number;      // Target monthly savings

  // Behavioral Layer
  studyHoursPerDay: number;
  focusRating: number;      // 1–10
  consistencyScore: number; // 1–10

  // Identity Layer
  archetype: string;        // Maps to optimizationVector
  personalMission?: string;
}
```

**Response (200):**
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

### `PATCH /api/profile/vector`
Update the user's optimization vector (primary focus domain).

**Auth Required**: Yes

**Request Body:**
```json
{ "optimizationVector": "health" }
```

**Response (200):**
```json
{ "success": true, "optimizationVector": "health" }
```

---

## Goals

### `POST /api/goals`
Create a new goal.

**Auth Required**: Yes

**Request Body:**
```typescript
{
  title: string;
  domain: "health" | "finance" | "career";
  priority: "high" | "medium" | "low";
  targetDate?: string;   // ISO date string
  milestones?: string[]; // Array of milestone text
}
```

**Response (201):**
```json
{ "success": true, "goals": [...] }
```

---

### `GET /api/goals`
Fetch all goals for the authenticated user.

**Auth Required**: Yes

**Response (200):**
```json
{ "success": true, "goals": [{ "_id": "...", "title": "...", "domain": "finance", ... }] }
```

---

### `DELETE /api/goals`
Delete a goal by ID.

**Auth Required**: Yes

**Request Body:**
```json
{ "goalId": "64abc123..." }
```

**Response (200):**
```json
{ "success": true, "goals": [...] }
```

---

### `POST /api/goals/milestone`
Add a milestone to an existing goal.

**Auth Required**: Yes

**Request Body:**
```json
{ "goalId": "64abc123...", "text": "Complete first module" }
```

---

### `PATCH /api/goals/milestone`
Update a milestone (mark complete or change text).

**Auth Required**: Yes

**Request Body:**
```typescript
{
  goalId: string;
  milestoneId: string;
  completed?: boolean;
  text?: string;
}
```

---

### `DELETE /api/goals/milestone`
Remove a milestone from a goal.

**Auth Required**: Yes

**Request Body:**
```json
{ "goalId": "...", "milestoneId": "..." }
```

---

## Data Logging

### `POST /api/log`
Submit a single domain log entry.

**Auth Required**: Yes

**Request Body (discriminated union by `domain`):**

Health:
```typescript
{
  domain: "health";
  data: {
    sleepHours: number;
    workoutMinutes: number;
    stressLevel: number;       // 1–10
    moodScore?: number;        // 1–10
    energyLevel?: number;
    caloriesConsumed?: number;
    calorieGoal?: number;
    waterGlasses?: number;
    skippedMeals?: boolean;
  }
}
```

Finance:
```typescript
{
  domain: "finance";
  data: {
    amountSaved: number;
    discretionarySpent: number;
    spendingCategory?: string;
    biggestExpenseToday?: string;
    impulseSpend?: boolean;
    // spendingTime injected server-side (current hour)
  }
}
```

Career:
```typescript
{
  domain: "career";
  data: {
    hoursStudied: number;
    productivityRating: number; // 1–10
    sessionsCompleted?: number;
    courseName?: string;
    goalWorkedOn?: string;
    blockerToday?: string;
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "state": {
    "scores": { "health": 72, "finance": 65, "career": 80 },
    "gamification": { "totalPoints": 325, "currentStreak": 7 },
    "newBadges": ["week_warrior"],
    "computedScores": { "health": 78, "finance": 60, "career": 85 }
  }
}
```

---

### `POST /api/log/daily`
Submit all three domains in a single request (unified daily log).

**Auth Required**: Yes

**Request Body:**
```typescript
{
  health: HealthData;    // Same shape as /api/log health data
  finance: FinanceData;  // Same shape as /api/log finance data
  career: CareerData;    // Same shape as /api/log career data
  dailyNote?: string;    // Optional free-text reflection
}
```

**Response (200):** Same as `POST /api/log`

---

### `GET /api/log/latest`
Fetch the most recent log entry for each domain.

**Auth Required**: Yes

**Response (200):**
```json
{
  "latest": {
    "health": { "sleepHours": 7.5, "workoutMinutes": 45, ... },
    "finance": { "amountSaved": 5000, ... },
    "career": { "hoursStudied": 3, ... },
    "reflection": { "note": "Good day overall" }
  },
  "scores": { "health": 75, "finance": 68, "career": 82 },
  "streak": 5,
  "lastLogDate": "2026-05-30T14:00:00.000Z"
}
```

---

## AI Engine

### `GET /api/ai/recommend`
Get the AI daily reflection and recommendations. Served from cache if valid.

**Auth Required**: Yes

**Cache Headers:** `Cache-Control: private, s-maxage=300, stale-while-revalidate=600`

**Response (200):**
```json
{
  "success": true,
  "ai": {
    "twinPrediction": "Based on your current trajectory...",
    "dailyReflection": "Your sleep consistency has improved...",
    "explainability": ["Sleep quality driving health score up", "Discretionary spend 15% over budget"],
    "dailyChallenge": { "title": "...", "description": "...", "domain": "finance" },
    "recommendations": {
      "health": ["Aim for 7.5h sleep tonight"],
      "finance": ["Avoid discretionary purchases today"],
      "career": ["Block 2h for deep work before 10am"]
    },
    "riskAlerts": ["Sleep <6h detected 2 days — decision quality may be impaired"],
    "confidence": 87
  },
  "finance": {
    "wealthGoals": [{ "goalLabel": "Home Down Payment", "deficit": 8500, ... }],
    "requiredMonthlySavings": 25000,
    "savingsDeficit": 8500,
    "deficitText": "₹8,500/mo below target"
  },
  "health": {
    "historicalNutrientGaps": ["Iron", "Vitamin D"],
    "todaysMealPlan": [
      { "meal": "Breakfast", "items": ["Poha with peanuts", "Banana"], "calories": 380 }
    ]
  },
  "career": {
    "paretoSkills": [{ "skill": "System Design", "impactScore": 9, "estimatedHours": 20 }],
    "studyBlocks": [{ "time": "06:00–08:00", "topic": "DSA", "duration": 120 }]
  },
  "fromCache": false,
  "confidence": 87
}
```

---

### `GET /api/ai/domain?domain=health|finance|career`
Get deep domain-specific AI analysis.

**Auth Required**: Yes

**Query Parameters:**
- `domain` — Required. `"health"` | `"finance"` | `"career"`

**Cache Headers:** `Cache-Control: private, s-maxage=300, stale-while-revalidate=600`

**Response (200):**
```json
{
  "success": true,
  "domain": "health",
  "analysis": {
    "summary": "...",
    "keyInsights": [...],
    "trends": { "direction": "improving", "detail": "..." },
    "recommendations": [...],
    "riskFactors": [...]
  },
  "confidence": 72
}
```

---

## Data Upload

### `POST /api/upload/csv`
Bulk import logs from CSV file.

**Auth Required**: Yes

**Request:** `multipart/form-data`
- `file` — CSV file
- `domain` — `"health"` | `"finance"` | `"career"`

**Response (200):**
```json
{ "success": true, "imported": 14, "skipped": 0 }
```

---

### `POST /api/upload/excel`
Bulk import logs from Excel/XLSX file.

**Auth Required**: Yes

**Request:** `multipart/form-data`
- `file` — `.xlsx` file
- `domain` — `"health"` | `"finance"` | `"career"`

**Response (200):**
```json
{ "success": true, "imported": 21, "skipped": 2 }
```

---

## Dashboard & Aggregation

### `GET /api/dashboard`
Fetch the complete aggregated dashboard payload.

**Auth Required**: Yes

**Response (200):**
```json
{
  "success": true,
  "dashboard": {
    "scores": { "health": 75, "finance": 68, "career": 82 },
    "syntraCore": 75,
    "gamification": { "totalPoints": 1250, "currentStreak": 12 },
    "goals": [...],
    "timeline": [...]
  }
}
```

---

## Simulation

### `POST /api/simulate`
Run a what-if scenario simulation.

**Auth Required**: Yes

**Request Body:**
```typescript
{
  scenario: string;    // Natural language scenario description
  domain?: string;     // Optional focus domain
  timeframe?: string;  // e.g., "3 months"
}
```

**Response (200):**
```json
{
  "success": true,
  "simulation": {
    "narrative": "...",
    "projectedScores": { "health": 82, "finance": 71, "career": 88 },
    "tradeoffs": [...],
    "timeline": [...]
  }
}
```

---

## Utilities

### `GET /api/mock?type=profile|logs|ai`
Returns static mock data for development/demo.

**Auth Required**: No

---

### `POST /api/mock?action=sync&source=health|bank|coursera`
Simulate a data sync from an external source.

**Auth Required**: Yes

**Response (200):**
```json
{
  "success": true,
  "synced": true,
  "source": "health",
  "newScores": { "health": 76, "finance": 68, "career": 82 },
  "xpEarned": 25
}
```

---

### `GET /api/setup/demo?secret=<value>`
Seed demo account with 14 days of engineered log data.

**Auth Required**: No (protected by secret query param)

**Response (200):**
```json
{ "success": true, "message": "Demo data seeded for demo@syntra.com" }
```

---

### `POST /api/terminal`
Execute terminal-style commands for advanced queries.

**Auth Required**: Yes

**Request Body:**
```json
{ "command": "show health last 7 days" }
```

---

## Error Response Shape

All endpoints follow this error structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": { ... }  // Optional additional context
}
```

| Status | Meaning |
|---|---|
| `400` | Validation error (Zod) |
| `401` | Not authenticated |
| `404` | Resource not found |
| `409` | Conflict (duplicate email) |
| `500` | Internal server error |
