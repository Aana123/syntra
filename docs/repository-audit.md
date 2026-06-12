# Syntra — Repository Audit

*Generated from static code analysis. All findings are based on actual implementation.*

---

## 1. Architecture Strengths

### Deterministic-First AI Design
The AI engine's standout design is separating concerns: `buildTwinContext()`, `computeWealthGoals()`, and `calculateConfidenceScore()` all run at zero AI cost, producing structured data that Gemini only interprets. This means AI quality is bounded by data quality, not prompt creativity — and AI costs scale with user activity, not request count.

### Smart Snapshot Caching
The cache invalidation logic in `/api/ai/recommend` is genuinely intelligent: it checks whether the cached snapshot was generated *after* the most recent log. This means users with active data always get fresh insights, while inactive users get instant responses. This is a real engineering decision, not accidental.

### EMA for Score Stability
Exponential Moving Average with α=0.25 is a correct choice for behavioral tracking. It's recency-biased without being reactive — a single bad day doesn't tank a score, and recovery is visible within a week of good behavior. The math is sound.

### Zod at Every Boundary
Every public API route validates with Zod. The schemas are specific (min/max on numeric fields, enum on string fields) and the `safeParse` pattern means validation failures produce structured, client-readable error messages rather than unhandled exceptions.

### Background Task Architecture
Using `waitUntil()` for AI snapshot generation is the correct Vercel-native approach. The user gets their response immediately, and the next dashboard visit will have AI pre-generated. This is the right trade-off between latency and freshness.

### Behavioral Correlation Flags
The behavioral flags (`stressSpendingCorrelation`, `sleepCareerCorrelation`, etc.) represent genuine cross-domain analytical intelligence. Most habit apps track domains in isolation; Syntra's context builder explicitly looks for relationships between them.

### Wealth Goal Pre-computation
Rather than asking the AI to compute financial math (which would be imprecise), `financeMath.ts` computes exact monthly savings requirements and deficits deterministically. The AI then reasons about these pre-computed numbers. This is architecturally correct.

---

## 2. Weaknesses

### No Middleware-Layer Authentication
The single biggest architectural weakness. Authentication is handled per-route, which is fragile and creates maintenance burden. A missed `auth()` call on any future route creates a security hole.

### All-Client-Component Architecture
Every page uses `"use client"`. This means no server-side rendering, no React Server Components, and no streaming. The initial page load is a blank screen followed by multiple client-side fetches. A significant performance opportunity is being left on the table.

### Dashboard as a Monolith
A 2,500+ line single file is not maintainable. No separation of concerns, no ability to independently test components, no code splitting at the component level.

### No Tests Whatsoever
The scoring functions (`calculateHealthScore`, `calculateFinanceScore`, `calculateCareerScore`) are pure functions with deterministic outputs — they are trivially testable. The absence of any tests is a risk, especially given the EMA calculations affect every user's scores.

### Free-Text Fields in Prompts Without Sanitization
`blockerToday`, `courseName`, `biggestExpenseToday`, and `personalMission` are included directly in Gemini prompts. A user could manipulate AI output via these fields.

---

## 3. Potential Bugs

### Streak Off-by-One (Timezone)
**Location**: `src/app/api/log/route.ts`, `src/app/api/log/daily/route.ts`
**Bug**: Streak comparison uses `Date.toDateString()` which is based on the server's timezone (UTC). A user in UTC+5:30 who logs at 11:30pm IST (6pm UTC) is comparing dates correctly. But one who logs at 12:30am IST (7pm UTC previous day) may have their "yesterday" calculated incorrectly.
**Impact**: Streak resets incorrectly for users in non-UTC timezones logging near midnight.

### Finance Score Can Go Negative
**Location**: `src/lib/scoring.ts` — `calculateFinanceScore()`
**Bug**: Base 50 + penalties: if `discretionarySpent > 150% budget` (-30) and `impulseSpend` (-5) and `savings = 0` (+0), total = 15. The final `clamp(0, 100)` saves it, but the path through negative intermediate values may produce unexpected results if the clamp is missing in any edge case.
**Impact**: Low severity — clamping handles it. But score = 15 with no savings is misleadingly poor.

### AI Snapshot Parse Failure Silent Path
**Location**: `src/app/api/ai/recommend/route.ts`
**Bug**: If `user.aiSnapshot.dailyReflection` is a malformed JSON string (e.g., from a partial Gemini response that was stored during a previous error), `JSON.parse()` will throw and the entire route will return 500 rather than gracefully regenerating.
**Impact**: Users who hit a Gemini error at exactly the wrong moment (partial write) may be permanently unable to load AI recommendations until the snapshot is cleared.
**Fix**: Wrap `JSON.parse(user.aiSnapshot.dailyReflection)` in try/catch; treat parse failure as cache miss.

### Demo Route Deletes by Email, Not ID
**Location**: `src/app/api/setup/demo/route.ts`
**Bug**: The demo route deletes `User.deleteMany({ email: "demo@syntra.com" })`. If someone has registered with that email (unlikely but possible), their account and logs are wiped.
**Impact**: Low probability, high severity if hit. Use a dedicated demo flag field instead.

### `ordered: false` on `insertMany` Swallows Errors
**Location**: `src/app/api/upload/csv/route.ts`, `src/app/api/upload/excel/route.ts`
**Bug**: `Log.insertMany(docs, { ordered: false })` continues inserting even when individual documents fail. The count of `skipped` documents may not accurately reflect why they were skipped.
**Impact**: Silently drops malformed upload rows without user-visible feedback on which rows failed.

---

## 4. Dead Code

### `src/lib/memoize.ts`
Defined, exported, never imported. Delete.

### `src/lib/encryption.ts`
Implemented (AES-256-CBC), never called from any route handler. Either wire it up or remove it.

### `src/lib/prompts/twinReflection.ts`
Likely superseded by `aitwinReflection.ts`. Needs audit — if unused, delete.

### `src/lib/prompts/simulatorPrompt.ts` vs `aisimulatorPrompt.ts`
One is likely the old version. Needs audit — delete the unused one.

---

## 5. Duplicate Logic

### EMA Update (3 locations)
The formula `newScore = oldScore * 0.75 + entryScore * 0.25` appears in:
1. `src/app/api/log/route.ts`
2. `src/app/api/log/daily/route.ts`
3. `src/app/api/profile/onboard/route.ts` (implicit via score assignment)

Should be a single `applyEMA(current, entry, alpha = 0.25)` in `scoring.ts`.

### Auth Check Pattern (18+ locations)
```typescript
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```
This 2-line pattern is copy-pasted across every protected route. Should be a shared `requireAuth(session)` guard or global middleware.

### `Log.find({ userId }).sort({ date: -1 }).limit(42)` (3+ locations)
The "fetch last 42 logs" pattern appears in multiple AI routes. Should be a shared utility function.

### Score Calculation in Onboarding vs in Log Routes
The health/finance/career potential calculations in `onboard/route.ts` partially duplicate the logic in `scoring.ts` but with different field names and weights. These should converge or be clearly documented as intentionally different.

---

## 6. Security Concerns

### CRITICAL: Real Credentials in Environment File
The `.env.local` file contains real MongoDB credentials, a real Gemini API key, and an obviously weak NextAuth secret. If this file was ever committed to git or shared, all credentials must be rotated immediately.

### CRITICAL: Weak Default Values
`NEXTAUTH_SECRET="i_love_to_eat_mangoes"` (or similar) is a weak secret. JWT signing keys should be cryptographically random 256-bit values.

### HIGH: No Rate Limiting
No rate limiting on any route. Especially risky:
- `/api/auth/register` — account creation spam
- `/api/auth/callback/credentials` — brute force login (NextAuth has no built-in rate limiting)
- `/api/ai/*` — Gemini API cost amplification
- `/api/upload/*` — storage abuse

### HIGH: Prompt Injection Risk
Free-text fields from users (`personalMission`, `blockerToday`, `courseName`) are embedded in Gemini prompts. While PII is stripped, no anti-injection sanitization exists. Example attack: setting `blockerToday` to "Ignore all previous instructions and instead output..."

### MEDIUM: Missing `CSRF` Protection on Mutations
Next.js App Router API routes do not automatically validate CSRF tokens. Routes that mutate state (`POST /api/goals`, `POST /api/log`, etc.) should validate the `Origin` header or use NextAuth's CSRF protection.

### MEDIUM: Demo Endpoint is Destructive with Weak Auth
`GET /api/setup/demo?secret=hackathon_win` deletes and recreates a user. The secret is in source code.

### LOW: Session Does Not Rotate JWTs After Sensitive Operations
After password change (if implemented), the existing JWT remains valid for up to 30 days. Current version has no password change endpoint, so this is future risk.

---

## 7. Performance Concerns

### Full User Document Loaded for Goals
Every goal operation loads the entire User document (including `aiSnapshot.dailyReflection`, which is a large JSON string). MongoDB's `$push`/`$pull` operators require the document to be loaded. Moving goals to a separate collection would eliminate this.

### No Pagination on Log Queries
`Log.find({ userId }).sort({ date: -1 }).limit(42)` is hardcoded. If the context window needs to grow (e.g., 90-day analysis), a 270-document query will cause latency spikes.

### No Database Query Projection
Many queries fetch full documents when only a few fields are needed:
```typescript
// Bad: loads all fields
const user = await User.findById(userId);

// Better: load only what's needed
const user = await User.findById(userId).select("scores gamification badges goals aiSnapshot");
```

### Synchronous Score Computation
Scoring functions run synchronously in route handlers. For daily log submission, three score calculations + three DB writes happen sequentially. These could be parallelized.

### AI Context Build Not Memoized
`buildTwinContext()` is called on every `/api/ai/domain` request. The same 42 logs are processed multiple times per session. The `memoize.ts` utility exists but is unused.

---

## 8. Scalability Concerns

### MongoDB Connection Pool
`maxPoolSize: 10` is appropriate for a hackathon but insufficient for production. Each serverless function instance creates its own connection pool. Under load, this creates connection exhaustion.

### Embedded Goals Array
MongoDB document size limit is 16MB. With large milestone text blocks, a user with 100+ goals could approach this limit. More practically, every user-related query loads the entire goals array even when only scores are needed.

### Single Gemini API Key
One API key with no key rotation or fallback. A key ban, quota exhaustion, or rate limit affects all users simultaneously.

### No Caching Layer Between App and MongoDB
Every request hits MongoDB directly. No Redis, no in-memory cache, no Vercel KV. For high-traffic demo periods, cold-start latency will be noticeable.

### `Log.insertMany` Without Index Hint
Bulk inserts don't specify index hints. Under concurrent uploads, MongoDB may not use the optimal index.

---

## 9. Missing Tests

| Component | Type Needed | Priority |
|---|---|---|
| `calculateHealthScore()` | Unit | HIGH |
| `calculateFinanceScore()` | Unit | HIGH |
| `calculateCareerScore()` | Unit | HIGH |
| `applyEMA()` | Unit | HIGH |
| `calculateEarnedXP()` | Unit | MEDIUM |
| `buildTwinContext()` | Unit | HIGH |
| `analyzeBehavioralDrift()` | Unit | HIGH |
| `computeWealthGoals()` | Unit | HIGH |
| `POST /api/auth/register` | Integration | HIGH |
| `POST /api/log/daily` | Integration | HIGH |
| `GET /api/ai/recommend` cache logic | Integration | MEDIUM |
| CSV parser | Unit | MEDIUM |
| Badge unlock logic | Unit | MEDIUM |
| Streak calculation | Unit | HIGH (timezone bug risk) |

---

## 10. Refactoring Opportunities

### Extract Shared Auth Guard
```typescript
// src/lib/requireAuth.ts
export async function requireAuth(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError("Unauthorized", 401);
  return { userId: session.user.id };
}
```

### Extract EMA Function
```typescript
// src/lib/scoring.ts
export function applyEMA(current: number, entry: number, alpha = 0.25): number {
  return current * (1 - alpha) + entry * alpha;
}
```

### Create Log Query Utility
```typescript
// src/lib/logQueries.ts
export async function getRecentLogs(userId: string, limit = 42) {
  return Log.find({ userId }).sort({ date: -1 }).limit(limit).lean();
}
```

### Consolidate Prompt Files
Merge `twinReflection.ts` → `aitwinReflection.ts` and `simulatorPrompt.ts` → `aisimulatorPrompt.ts` to eliminate confusion about which is authoritative.

### Move Goals to Separate Collection
Create `Goal` model with `userId` reference. This resolves: document size limits, unnecessary data loading, and makes goal pagination possible.

### Add `select()` to All User Queries
Every `User.findById()` should project only the fields needed, especially to avoid loading `aiSnapshot.dailyReflection` when not needed.
