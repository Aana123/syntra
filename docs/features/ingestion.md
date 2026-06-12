# Syntra — Ingestion Pipeline

## Overview

Syntra supports four distinct data ingestion paths: manual form entry, daily unified submission, CSV bulk upload, and Excel bulk upload. All paths converge on the same EMA score update and gamification logic.

---

## Pipeline Architecture

```
User Input
    │
    ├── Manual Entry (/api/log)
    ├── Unified Daily (/api/log/daily)  ← Preferred path
    ├── CSV Upload (/api/upload/csv)
    ├── Excel Upload (/api/upload/excel)
    └── Mock Sync (/api/mock?action=sync)
    │
    ▼
Zod Validation Layer
    │
    ▼
Score Computation (scoring.ts)
    │
    ▼
EMA Score Update
    │
    ▼
Log Document Creation (MongoDB)
    │
    ▼
User Document Update (scores, gamification, badges)
    │
    ▼
Background: waitUntil(generateAndStoreSnapshot())
    │
    ▼
Response to Client
```

---

## Manual Entry (`POST /api/log`)

### Entry Point
`src/app/api/log/route.ts`

### Validation Schema
`IngestionSchema` — discriminated union on `domain` field:

```typescript
z.discriminatedUnion("domain", [
  z.object({ domain: z.literal("health"), data: HealthDataSchema }),
  z.object({ domain: z.literal("finance"), data: FinanceDataSchema }),
  z.object({ domain: z.literal("career"), data: CareerDataSchema }),
])
```

### Field-Level Validation

**Health (`HealthDataSchema`):**
```typescript
sleepHours:       z.number().min(0).max(24)
workoutMinutes:   z.number().min(0).max(300)
stressLevel:      z.number().min(1).max(10)
moodScore?:       z.number().min(1).max(10)
energyLevel?:     z.number().min(1).max(10)
caloriesConsumed?: z.number().min(0)
calorieGoal?:     z.number().min(0)
waterGlasses?:    z.number().min(0).max(20)
skippedMeals?:    z.boolean()
```

**Finance (`FinanceDataSchema`):**
```typescript
amountSaved:         z.number().min(0)
discretionarySpent:  z.number().min(0)
spendingCategory?:   z.string()
biggestExpenseToday?: z.string()
impulseSpend?:       z.boolean()
// spendingTime: auto-injected server-side as new Date().getHours()
```

**Career (`CareerDataSchema`):**
```typescript
hoursStudied:       z.number().min(0).max(24)
productivityRating: z.number().min(1).max(10)
sessionsCompleted?: z.number().min(0)
courseName?:        z.string()
goalWorkedOn?:      z.string()
blockerToday?:      z.string()
```

### Processing Flow
1. `auth()` — Verify session, extract userId
2. `IngestionSchema.safeParse(body)` — Validate input
3. `calculateDomainScore(domain, data)` — Compute 0–100 score
4. **EMA update**: `newScore = stored × 0.75 + computed × 0.25`
5. `Log.create({ userId, date: now, domain, domainData: data })`
6. **Gamification**: XP += calculateEarnedXP(score), streak update, badge evaluation
7. `User.findByIdAndUpdate({ scores, gamification, badges })`
8. `waitUntil(generateAndStoreSnapshot(userId))` — non-blocking
9. Return `{ success, state }`

---

## Unified Daily Submission (`POST /api/log/daily`)

### Entry Point
`src/app/api/log/daily/route.ts`

### Validation Schema
```typescript
DailyLogSchema = z.object({
  health:    HealthDataSchema,
  finance:   FinanceDataSchema,
  career:    CareerDataSchema,
  dailyNote: z.string().optional(),
})
```

### Processing Flow
1. Validate all three domains simultaneously
2. Compute all three scores in parallel
3. Apply EMA for all three domains
4. Create 3–4 Log documents via `Log.insertMany()`:
   - Health log
   - Finance log
   - Career log
   - Reflection log (if `dailyNote` provided)
5. Single User update with all three new scores
6. Gamification: evaluate highest score for XP tier
7. Background snapshot generation

### Advantage over `/api/log`
- Single network round-trip for full day submission
- Atomic multi-log insertion
- One User document update (fewer DB writes)
- Preferred ingestion path for the ingestion page

---

## Latest Log Retrieval (`GET /api/log/latest`)

### Entry Point
`src/app/api/log/latest/route.ts`

### Query Pattern
```typescript
// Parallel queries for each domain
const [healthLog, financeLog, careerLog, reflectionLog] = await Promise.all([
  Log.findOne({ userId, domain: "health" }).sort({ date: -1 }).lean(),
  Log.findOne({ userId, domain: "finance" }).sort({ date: -1 }).lean(),
  Log.findOne({ userId, domain: "career" }).sort({ date: -1 }).lean(),
  Log.findOne({ userId, domain: "reflection" }).sort({ date: -1 }).lean(),
]);
```

### Returns
Latest `domainData` for each domain plus current scores, streak, and last log date.

---

## CSV Upload (`POST /api/upload/csv`)

### Entry Point
`src/app/api/upload/csv/route.ts`

### Parser
Custom RFC-4180 compliant CSV parser — does NOT use an external library:
```
- Handles quoted fields with embedded commas
- Handles quoted fields with embedded newlines
- Handles escaped quotes ("")
- Header row normalization: trim, lowercase, remove spaces/underscores
```

### Processing Flow
1. Extract `file` (FormData) and `domain` (query param or body)
2. `Buffer.toString("utf-8")` — decode file content
3. Parse CSV with custom parser → `Record<string, string>[]`
4. **Numeric coercion**: Detect numeric fields, parse as float
5. **Header normalization**: `"Sleep Hours"` → `"sleepHours"`, `"workout_minutes"` → `"workoutMinutes"`
6. Map rows to Log document shape: `{ userId, date: row.date || now, domain, domainData: row }`
7. `Log.insertMany(docs)` — bulk write
8. Background: `waitUntil(generateAndStoreSnapshot(userId))`

### Header Normalization Table (CSV → camelCase)
```
"sleep hours" / "sleep_hours"      → sleepHours
"workout minutes"                  → workoutMinutes
"stress level"                     → stressLevel
"amount saved"                     → amountSaved
"hours studied"                    → hoursStudied
"productivity rating"              → productivityRating
```

### Error Handling
- Empty file → `400 Bad Request`
- Invalid domain → `400 Bad Request`
- Parse failures on individual rows → skipped (counted in `skipped` field)
- `Log.insertMany` failure → `500`

---

## Excel Upload (`POST /api/upload/excel`)

### Entry Point
`src/app/api/upload/excel/route.ts`

### Library
`xlsx` (SheetJS) v0.18.5

### Processing Flow
1. Extract `file` (FormData) as `ArrayBuffer`
2. `XLSX.read(buffer, { type: "array" })` — parse workbook
3. Select first sheet: `workbook.Sheets[workbook.SheetNames[0]]`
4. `XLSX.utils.sheet_to_json(sheet)` → `Record<string, unknown>[]`
5. Same numeric coercion and header normalization as CSV pipeline
6. Map to Log documents
7. `Log.insertMany(docs)`
8. Background snapshot generation

### Supported File Types
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97–2003, via SheetJS compatibility)
- `.ods` (OpenDocument, via SheetJS)
- `.csv` (also parseable by SheetJS, but dedicated endpoint preferred)

---

## Mock Sync (`POST /api/mock?action=sync&source=health|bank|coursera`)

### Purpose
Simulates API integrations that don't exist yet. Generates realistic log entries as if pulled from Apple Health, banking APIs, or Coursera.

### Simulated Sources

**`source=health`** (Apple Health simulation)
```json
{
  "domain": "health",
  "data": { "sleepHours": 7.5, "workoutMinutes": 45, "stressLevel": 4 }
}
```

**`source=bank`** (Banking API simulation)
```json
{
  "domain": "finance",
  "data": { "amountSaved": 8000, "discretionarySpent": 3200 }
}
```

**`source=coursera`** (Coursera simulation)
```json
{
  "domain": "career",
  "data": { "hoursStudied": 2, "productivityRating": 8, "courseName": "System Design" }
}
```

### Processing
- Creates a single optimal log entry for the simulated source
- Runs through same EMA update
- Returns `{ success, synced: true, source, newScores, xpEarned }`

---

## Validation Layer (`src/lib/validators.ts`, `src/types/schemas.ts`)

### Zod Validation Approach
All route handlers call `.safeParse()` not `.parse()`:
```typescript
const result = IngestionSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json(
    { success: false, error: "Validation failed", details: result.error.flatten() },
    { status: 400 }
  );
}
// Use result.data (fully typed)
```

### Type Coercion Applied
```typescript
// SignupSchema uses coerce for fields that may arrive as strings
age: z.coerce.number().optional()
avatarId: z.coerce.number().default(1)
monthlyIncome: z.coerce.number().optional()
```

---

## Database Write Flow

### Single Log Entry
```typescript
await Log.create({
  userId: session.user.id,
  date: new Date(),
  domain: validatedData.domain,
  domainData: { ...validatedData.data, computedScore: calculatedScore },
});
```

### Bulk Insert (CSV/Excel)
```typescript
await Log.insertMany(logDocuments, { ordered: false });
// ordered: false — continue inserting even if individual documents fail
```

### User Score Update
```typescript
await User.findByIdAndUpdate(
  userId,
  {
    $set: {
      [`scores.${domain}`]: newEMAScore,
      "gamification.totalPoints": newTotalPoints,
      "gamification.currentStreak": newStreak,
      "gamification.lastLogDate": new Date(),
    },
    $addToSet: { badges: { $each: newBadges } }, // Prevent duplicate badges
  },
  { new: true }
);
```

---

## Onboarding Baseline Ingestion (`POST /api/profile/onboard`)

### Special Case
Onboarding creates 3 calibration logs (not regular log entries) that seed the EMA with meaningful baselines.

```typescript
await Log.insertMany([
  {
    userId,
    date: new Date(),
    domain: "health",
    domainData: { sleepHours: answers.sleepHours, workoutMinutes: answers.workoutFrequency * 60 / 7, ... }
  },
  {
    userId,
    date: new Date(),
    domain: "finance",
    domainData: { amountSaved: incomeNum * savingsRate, ... }
  },
  {
    userId,
    date: new Date(),
    domain: "career",
    domainData: { hoursStudied: answers.studyHoursPerDay, productivityRating: answers.focusRating, ... }
  }
]);
```

These baseline logs ensure the AI has initial context on first dashboard visit.
