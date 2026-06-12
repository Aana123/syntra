# Syntra — Backend Structure

## Overview

The backend is a Next.js App Router API layer with 18+ route handlers. All routes follow a consistent pattern: Zod validation → auth check → business logic → MongoDB operation → response. No Express, no separate server process.

---

## Directory Structure

```
src/
├── app/api/                  ← Route handlers
│   ├── auth/
│   │   ├── register/route.ts
│   │   └── [...nextauth]/route.ts
│   ├── goals/
│   │   ├── route.ts          ← GET, POST, DELETE
│   │   └── milestone/route.ts ← POST, PATCH, DELETE
│   ├── log/
│   │   ├── route.ts          ← POST (single domain)
│   │   ├── daily/route.ts    ← POST (unified)
│   │   └── latest/route.ts   ← GET
│   ├── profile/
│   │   ├── onboard/route.ts  ← POST
│   │   └── vector/route.ts   ← PATCH
│   ├── ai/
│   │   ├── domain/route.ts   ← GET
│   │   └── recommend/route.ts ← GET
│   ├── upload/
│   │   ├── csv/route.ts      ← POST
│   │   └── excel/route.ts    ← POST
│   ├── dashboard/route.ts    ← GET
│   ├── simulate/route.ts     ← POST
│   ├── terminal/route.ts     ← POST
│   ├── mock/route.ts         ← GET, POST
│   └── setup/demo/route.ts   ← GET (protected by secret)
│
└── lib/                      ← Services and utilities
    ├── mongodb.ts            ← DB connection
    ├── auth.ts               ← NextAuth config
    ├── scoring.ts            ← Score calculations
    ├── validators.ts         ← Zod schemas
    ├── aiContextBuilder.ts   ← TwinContext factory
    ├── driftEngine.ts        ← Drift detection
    ├── snapshotService.ts    ← AI pre-generation
    ├── financeMath.ts        ← Wealth goal math
    ├── gemini.ts             ← Gemini API client
    ├── confidenceScore.ts    ← Data density metric
    ├── encryption.ts         ← AES-256-CBC
    ├── logger.ts             ← Structured logging
    ├── fetcher.ts            ← HTTP client
    ├── apiError.ts           ← Error class
    ├── apiHandler.ts         ← Route wrapper HOF
    ├── parseGemini.ts        ← Response parser
    ├── mockData.ts           ← Static test data
    ├── memoize.ts            ← Memoization helper
    └── prompts/
        ├── aitwinReflection.ts
        ├── domainPrompts.ts
        ├── simulatorPrompt.ts
        ├── aisimulatorPrompt.ts
        ├── challengePrompt.ts
        └── twinReflection.ts
```

---

## Services

### Database Service (`src/lib/mongodb.ts`)

**Pattern**: Global cached singleton for Next.js serverless compatibility
```typescript
// Prevents new connection on every hot-reload or serverless invocation
declare global {
  var mongoose: { conn: Mongoose | null; promise: Promise<Mongoose> | null };
}

async function connectDB(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;
  cached.promise = mongoose.connect(MONGODB_URI, { maxPoolSize: 10 });
  cached.conn = await cached.promise;
  return cached.conn;
}
```

### Authentication Service (`src/lib/auth.ts`)

**NextAuth configuration with three callbacks:**

```typescript
// authorize: Called on login attempt
async authorize(credentials) {
  const user = await User.findOne({ email: credentials.email.toLowerCase() });
  if (!user) return null;
  const valid = await bcrypt.compare(credentials.password, user.password);
  if (!valid) return null;
  return { id: user._id.toString(), name, email, avatarId, streak, optimizationVector };
}

// jwt: Extends token with custom fields
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.avatarId = user.avatarId;
    token.streak = user.streak;
    token.optimizationVector = user.optimizationVector;
  }
  return token;
}

// session: Exposes token fields to client
async session({ session, token }) {
  session.user.id = token.id;
  session.user.avatarId = token.avatarId;
  session.user.streak = token.streak;
  session.user.optimizationVector = token.optimizationVector;
  return session;
}
```

**Session config:**
```typescript
strategy: "jwt"
maxAge: 30 * 24 * 60 * 60  // 30 days
```

### Scoring Service (`src/lib/scoring.ts`)

Pure functions with no side effects:
- `calculateHealthScore(data) → number`
- `calculateFinanceScore(data, income?) → number`
- `calculateCareerScore(data) → number`
- `calculateEarnedXP(score) → number`
- `calculateSyntraCore(scores) → number`

### Context Builder (`src/lib/aiContextBuilder.ts`)

```typescript
function buildTwinContext(logs: ILog[], user: IUser): TwinContext
```

Aggregates 42 logs into weekly averages, trends, behavioral flags, and qualitative signals. See [ai-engine.md](ai-engine.md) for full details.

### Drift Engine (`src/lib/driftEngine.ts`)

```typescript
function analyzeBehavioralDrift(logs: ILog[]): DriftAnalysis
```

Computes Global Drift Index from sleep, spending, and study consistency. See [analytics-engine.md](analytics-engine.md).

### Snapshot Service (`src/lib/snapshotService.ts`)

```typescript
async function generateAndStoreSnapshot(userId: string): Promise<void>
```

Background service that pre-generates AI responses after logging. Called via `waitUntil()`.

### Finance Math (`src/lib/financeMath.ts`)

```typescript
function computeWealthGoals(goals: IGoal[], monthlyIncome?: number): PreComputedWealthGoal[]
```

Parses goal titles, extracts amounts, computes monthly savings requirements and deficits.

### Gemini Client (`src/lib/gemini.ts`)

```typescript
async function callGemini<T>(prompt: string): Promise<T>
```

Handles PII stripping, API call, retry with exponential backoff, JSON extraction, and type casting.

### Encryption (`src/lib/encryption.ts`)

```typescript
function encryptData(text: string): string   // Returns "IV:encryptedHex"
function decryptData(text: string): string   // Reverses encryption
```

AES-256-CBC using Node.js `crypto`. Key derived from `ENCRYPTION_KEY` env var via SHA256.

*Note: Not currently used in active route handlers — available for future sensitive data storage.*

### Logger (`src/lib/logger.ts`)

```typescript
Logger.info(action, category, metadata?, userId?)
Logger.warn(action, category, metadata?, userId?)
Logger.error(action, category, metadata?, userId?)
Logger.debug(action, category, metadata?, userId?)
Logger.metric(action, category, metadata?, userId?)
```

Async, non-blocking writes to `Telemetry` collection. Falls back gracefully if DB unavailable.

### Fetcher (`src/lib/fetcher.ts`)

Type-safe HTTP client for client-side API calls:
```typescript
async function fetcher<T>(url: string, options?: RequestInit): Promise<T>
```

Handles JSON serialization, `credentials: "include"`, safe 204 responses, and `FetcherError` class.

---

## Middleware

### Route Wrapper (`src/lib/apiHandler.ts`)

HOF that standardizes error handling for all route handlers:
```typescript
function apiHandler(handler: RouteHandler): RouteHandler {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { success: false, error: error.message, details: error.details },
          { status: error.statusCode }
        );
      }
      Logger.error("unhandled_exception", "api", { error });
      return NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
```

*Note: Not all routes use this wrapper — adoption is partial.*

### Authentication Middleware (Per-Route)

No global middleware file. Each protected route calls:
```typescript
import { auth } from "@/lib/auth";
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

## Error Handling

### `ApiError` Class (`src/lib/apiError.ts`)
```typescript
class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

### Throw Pattern
```typescript
if (!user) throw new ApiError("User not found", 404);
if (existing) throw new ApiError("Email already registered", 409);
```

---

## Telemetry System (`src/models/Telemetry.ts`)

All significant system events write to the `telemetries` collection:

| Category | Events Logged |
|---|---|
| `auth` | login, register, logout |
| `ingestion` | log_created, bulk_import |
| `ai` | snapshot_generated, cache_hit, gemini_error |
| `goals` | goal_created, milestone_completed |
| `error` | unhandled_exception, validation_failure |
| `performance` | slow_query (future) |

Telemetry writes are **non-blocking** — they never fail a user request if the write fails.

---

## Background Processing

### `waitUntil()` Pattern
```typescript
import { waitUntil } from "@vercel/functions";

// In route handler (after response sent):
waitUntil(generateAndStoreSnapshot(userId));
return NextResponse.json({ success: true, ... });
```

This keeps the Vercel function alive after response delivery to complete background work. On non-Vercel environments, `waitUntil` falls back to a regular Promise.

---

## Request/Response Conventions

### All Successful Responses
```json
{ "success": true, [data fields] }
```

### All Error Responses
```json
{ "success": false, "error": "message", "details": {} }
```

### HTTP Status Codes Used
- `200` — Success (most routes)
- `201` — Resource created (register, goal creation)
- `400` — Validation error
- `401` — Unauthenticated
- `404` — Not found
- `409` — Conflict (duplicate)
- `500` — Server error

---

## Key Libraries & Their Roles

| Library | Version | Role |
|---|---|---|
| mongoose | 8.4.0 | MongoDB ODM |
| next-auth | 4.24.14 | Authentication |
| zod | 4.4.3 | Runtime validation |
| bcryptjs | 2.4.3 | Password hashing |
| xlsx | 0.18.5 | Excel parsing |
| @vercel/functions | latest | Background task support |
| @google/generative-ai | latest | Gemini API client |
