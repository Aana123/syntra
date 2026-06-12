# Syntra — Database Documentation

## Overview

**Database**: MongoDB (Atlas)
**ODM**: Mongoose 8.4.0
**Connection**: Global cached singleton (Next.js pattern, `maxPoolSize: 10`)
**Models**: 3 collections — `users`, `logs`, `telemetries`

---

## Model: User (`src/models/User.ts`)

### Purpose
Primary entity. Stores authentication credentials, twin scores, gamification state, financial settings, goals, and AI snapshot cache.

### Interfaces

#### `IMilestone`
```typescript
{
  text: string;        // Milestone description
  completed: boolean;  // Completion flag
}
```

#### `IGoal`
```typescript
{
  _id: ObjectId;           // Auto-generated
  title: string;           // Goal title (also parsed for financial targets)
  domain: "health" | "finance" | "career";
  priority: "high" | "medium" | "low";
  targetDate?: Date;       // Optional deadline
  milestones: IMilestone[]; // Embedded subdocuments
  completed: boolean;      // Overall completion flag
  createdAt: Date;
}
```

#### `IUser` (extends `Document`)
```typescript
{
  // Authentication
  email: string;           // Unique, lowercased, trimmed
  name: string;
  password: string;        // bcrypt hash

  // Profile
  age?: number;
  avatarId: number;        // 1-4: Aether, Chronos, Apex, Nexus
  optimizationVector?: "health" | "finance" | "career"; // Primary focus domain
  personalMission?: string; // User-defined life mission statement
  healthConstraints?: string[]; // e.g., ["diabetes", "vegetarian"]

  // Twin Scores (0–100 each)
  scores: {
    health: number;    // EMA-updated on each health log
    finance: number;   // EMA-updated on each finance log
    career: number;    // EMA-updated on each career log
  };

  // Gamification
  gamification: {
    totalPoints: number;     // Accumulated XP
    currentStreak: number;   // Consecutive days logged
    lastLogDate?: Date;      // Used for streak calculation
  };
  badges: string[];          // Unlocked badge IDs

  // Financial Settings
  monthlyIncome?: number;    // In INR, set during onboarding or signup
  monthlyBudget?: number;    // Target monthly spend cap

  // Goals
  goals: IGoal[];            // Embedded goal array

  // AI Snapshot Cache
  aiSnapshot?: {
    dailyReflection: string; // Full JSON-stringified AI response
    lastGeneratedAt: Date;   // Timestamp for cache invalidation
  };

  // Onboarding State
  onboardingComplete?: boolean;

  // Timestamps (auto-managed by Mongoose)
  createdAt: Date;
  updatedAt: Date;
}
```

### Schema Definition
```typescript
const UserSchema = new mongoose.Schema<IUser>({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  name:     { type: String, required: true },
  password: { type: String, required: true },
  age:      { type: Number },
  avatarId: { type: Number, default: 1 },
  optimizationVector: { type: String, enum: ["health","finance","career"] },
  personalMission:    { type: String },
  healthConstraints:  { type: [String], default: [] },
  scores: {
    health:  { type: Number, default: 50 },
    finance: { type: Number, default: 50 },
    career:  { type: Number, default: 50 },
  },
  gamification: {
    totalPoints:   { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    lastLogDate:   { type: Date },
  },
  badges:         { type: [String], default: [] },
  monthlyIncome:  { type: Number },
  monthlyBudget:  { type: Number },
  goals:          { type: [GoalSchema], default: [] },
  aiSnapshot: {
    dailyReflection: { type: String },
    lastGeneratedAt: { type: Date },
  },
  onboardingComplete: { type: Boolean, default: false },
}, { timestamps: true });
```

### Indexes
- `email` — unique index (enforced by `unique: true`)
- Default `_id` ObjectId index

### Embedded Documents
- `goals[]` — IGoal array with nested `milestones[]`
- `aiSnapshot` — single subdocument (no array)
- `healthConstraints[]` — string array
- `badges[]` — string array

---

## Model: Log (`src/models/Log.ts`)

### Purpose
Stores individual domain activity records. One document per log entry. Multiple logs per day per domain are possible.

### Schema
```typescript
{
  userId: ObjectId;    // Ref: "User" — owner of this log
  date:   Date;        // Required — log date/time
  domain: "health" | "finance" | "career" | "reflection"; // Which domain
  domainData: Record<string, unknown>; // Flexible — shape varies per domain
}
```

### `domainData` Shapes by Domain

**Health:**
```typescript
{
  sleepHours: number;
  workoutMinutes: number;
  stressLevel: number;        // 1–10
  moodScore?: number;         // 1–10
  energyLevel?: number;       // 1–10
  caloriesConsumed?: number;
  calorieGoal?: number;
  waterGlasses?: number;
  skippedMeals?: boolean;
  computedScore?: number;     // Server-computed health score
}
```

**Finance:**
```typescript
{
  amountSaved: number;
  discretionarySpent: number;
  spendingCategory?: string;
  spendingTime?: number;      // Hour (0–23), auto-injected server-side
  biggestExpenseToday?: string;
  impulseSpend?: boolean;
  computedScore?: number;
}
```

**Career:**
```typescript
{
  hoursStudied: number;
  productivityRating: number; // 1–10
  sessionsCompleted?: number;
  courseName?: string;
  goalWorkedOn?: string;
  blockerToday?: string;
  computedScore?: number;
}
```

**Reflection:**
```typescript
{
  note: string;               // Free-text daily note
}
```

### Indexes
```typescript
LogSchema.index({ userId: 1, date: -1 });   // Primary query pattern
LogSchema.index({ domain: 1 });             // Domain filtering
LogSchema.index({ userId: 1, domain: 1 });  // Combined queries
```

### Timestamps
- `{ timestamps: true }` — adds `createdAt`, `updatedAt`

---

## Model: Telemetry (`src/models/Telemetry.ts`)

### Purpose
Audit trail and analytics events. Used by the Logger service to record system actions, errors, and performance metrics.

### Schema
```typescript
{
  userId?:   ObjectId;  // Optional — system events may not have a user
  action:    string;    // What happened (e.g., "log_created", "ai_generated")
  category:  string;    // Event category (e.g., "ingestion", "ai", "auth")
  metadata?: Record<string, unknown>; // Arbitrary event context
  timestamp: Date;      // Default: Date.now
}
```

### Indexes
```typescript
TelemetrySchema.index({ userId: 1 });
TelemetrySchema.index({ action: 1 });
TelemetrySchema.index({ category: 1 });
TelemetrySchema.index({ timestamp: -1 });
```

---

## Relationships

```
User (1) ──────────────── (N) Log
         userId ref

User (1) ──── (embedded) ──── Goal[]
                                └── Milestone[] (nested)

User (1) ──── (embedded) ──── aiSnapshot (0..1)

Telemetry ──── (optional ref) ──── User
               userId (nullable)
```

## Data Ownership Model

| Collection | Owner | Access Pattern |
|---|---|---|
| `users` | Individual user | Read/write own doc only; auth-gated via session |
| `logs` | Individual user | Query always filtered by `userId` from session |
| `telemetries` | System | Written by Logger service; no direct client read |

## Connection Management (`src/lib/mongodb.ts`)

```typescript
// Global cached pattern — Next.js serverless-safe
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

// First call: create connection
// Subsequent calls: return cached connection
// maxPoolSize: 10 — supports concurrent serverless invocations
```

## Common Query Patterns

```typescript
// Fetch recent logs for AI context (42 = 2-week window × 3 domains)
Log.find({ userId }).sort({ date: -1 }).limit(42).lean()

// Fetch latest log per domain for dashboard
Log.findOne({ userId, domain: "health" }).sort({ date: -1 }).lean()

// Insert multiple logs atomically
Log.insertMany([healthLog, financeLog, careerLog])

// Add goal with $push
User.findByIdAndUpdate(id, { $push: { goals: newGoal } }, { new: true })

// Remove goal with $pull
User.findByIdAndUpdate(id, { $pull: { goals: { _id: goalId } } }, { new: true })

// Update score with EMA
User.findByIdAndUpdate(id, {
  $set: {
    "scores.health": newHealthScore,
    "gamification.totalPoints": newPoints,
    "gamification.currentStreak": newStreak,
  }
}, { new: true })
```

## Notable Design Choices

1. **`domainData` as `Record<string, unknown>`** — flexible schema for evolving log fields without migrations, at the cost of no ODM-level type enforcement on sub-fields
2. **Embedded goals** — kept inside User document; avoids JOIN queries but caps goal count (MongoDB 16MB document limit)
3. **AI snapshot as stringified JSON** — `dailyReflection: string` stores JSON string rather than a typed subdocument, preserving flexibility but requiring `JSON.parse()` on read
4. **Lean queries** — `.lean()` used throughout for read-only operations; returns plain JS objects with ~3× less memory than Mongoose Documents
5. **No soft deletes** — goals use `$pull` (hard delete); logs have no deletion endpoint; Telemetry is append-only
