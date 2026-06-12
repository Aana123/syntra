# Syntra — Technical Debt

---

## CRITICAL

### TD-001: Real Credentials in `.env.local` (Possibly Committed)
- **Location**: `.env.local`
- **Severity**: CRITICAL
- **Reason**: The scan revealed that `.env.local` contains a real MongoDB Atlas connection string (with username and password), a real Gemini API key, and a real NextAuth secret. If this file is or ever was committed to git, these credentials are exposed.
- **Suggested Fix**:
  1. Immediately check `git log -- .env.local` to confirm it was never committed
  2. Rotate ALL credentials (MongoDB password, Gemini API key, NextAuth secret, encryption key)
  3. Verify `.gitignore` contains `.env.local`
  4. Create `.env.example` with placeholder values for documentation

---

### TD-002: Hardcoded Demo Secret
- **Location**: `src/app/api/setup/demo/route.ts`
- **Severity**: HIGH
- **Reason**: The demo endpoint is gated by a hardcoded string `"hackathon_win"` in source code. Anyone who reads the source can wipe and re-seed the demo account.
- **Suggested Fix**: Move to `process.env.DEMO_SECRET`. If not set, disable the endpoint entirely.

---

### TD-003: No Global Authentication Middleware
- **Location**: All protected routes (goals, log, ai, dashboard, profile, upload)
- **Severity**: HIGH
- **Reason**: Each route handler independently calls `auth()` and checks `session?.user?.id`. There is no Next.js middleware (`middleware.ts`) enforcing authentication at the routing layer. A missed check on any route creates an unprotected endpoint.
- **Suggested Fix**: Add `src/middleware.ts` using NextAuth's `withAuth` matcher to protect all `/api` routes except `/api/auth/*` and `/api/mock`.

---

## HIGH

### TD-004: `domainData` is Untyped at the Database Level
- **Location**: `src/models/Log.ts`
- **Severity**: HIGH
- **Reason**: `domainData: Record<string, unknown>` stores health, finance, and career data without schema enforcement at the MongoDB level. Invalid data written to `domainData` won't be caught by Mongoose.
- **Suggested Fix**: Use Mongoose discriminators or subdocument schemas per domain. Or add a Zod validation layer in a pre-save hook.

---

### TD-005: AI Snapshot Stored as Raw JSON String
- **Location**: `src/models/User.ts` — `aiSnapshot.dailyReflection: string`
- **Severity**: HIGH
- **Reason**: The full AI response is stored as a `JSON.stringify()` string inside a string field. This means: no field-level MongoDB queries, no partial updates, forced full-document parse on every read, and no schema enforcement.
- **Suggested Fix**: Define `aiSnapshot.dailyReflection` as a typed Mongoose subdocument matching `aitwinReflectionResponse`. Enables targeted updates and queries.

---

### TD-006: `apiHandler` Wrapper Not Used Consistently
- **Location**: Most route files in `src/app/api/`
- **Severity**: HIGH
- **Reason**: `apiHandler.ts` exists as a HOF for standardized error handling, but not all routes wrap their handlers with it. Routes that don't use it have inconsistent error response shapes.
- **Suggested Fix**: Enforce `apiHandler` on all routes or replace with a shared `try/catch` pattern. Consider an ESLint rule.

---

### TD-007: Vercel Function Timeout for AI Routes
- **Location**: `src/app/api/ai/recommend/route.ts`, `src/app/api/ai/domain/route.ts`
- **Severity**: HIGH
- **Reason**: Gemini API calls can take 5–15 seconds. Vercel's default function timeout is 10 seconds on Hobby tier. Production AI requests will time out silently.
- **Suggested Fix**: Add `vercel.json` with `"maxDuration": 30` for API routes. Or move to Pro plan.

---

## MEDIUM

### TD-008: Dashboard is a 2,500+ Line Monolith
- **Location**: `src/app/dashboard/page.tsx`
- **Severity**: MEDIUM
- **Reason**: All dashboard components (hero, scorecard, mission control, twin sections, AI recommendations) are inline in a single file. This makes the file extremely hard to navigate, test, or maintain.
- **Suggested Fix**: Extract into component files: `<TwinSyncRing>`, `<ScoreCard>`, `<WealthGoalsList>`, `<MealPlan>`, `<StudySchedule>`, `<AIRecommendations>`. Group in `src/components/dashboard/`.

---

### TD-009: No Custom Hooks — SWR Used Inline in Every Page
- **Location**: `src/app/dashboard/page.tsx`, other pages
- **Severity**: MEDIUM
- **Reason**: SWR calls are duplicated inline across pages with no shared hook. If the endpoint URL or response shape changes, every page must be updated.
- **Suggested Fix**: Create `src/hooks/` directory with: `useAIRecommend()`, `useLatestLogs()`, `useGoals()`, `useDashboard()`.

---

### TD-010: Streak Reset Logic Has Off-by-One Risk
- **Location**: `src/app/api/log/route.ts`, `src/app/api/log/daily/route.ts`
- **Severity**: MEDIUM
- **Reason**: Streak logic compares `lastLogDate.toDateString()` with `yesterday.toDateString()`. This is timezone-naive — if a user logs at 11:58pm UTC but is in UTC+5:30, the "yesterday" comparison may be wrong, causing incorrect streak resets.
- **Suggested Fix**: Store and compare dates in the user's local timezone, or accept a `clientTimezone` parameter and normalize on server.

---

### TD-011: EMA Formula Hardcoded (Not Configurable)
- **Location**: All log route handlers
- **Severity**: MEDIUM
- **Reason**: `newScore = oldScore × 0.75 + newScore × 0.25` is hardcoded at every log creation point. Changing the smoothing factor requires updates in multiple places.
- **Suggested Fix**: Extract to `scoring.ts` as `applyEMA(current, newEntry, alpha = 0.25)`.

---

### TD-012: No Rate Limiting on Any Route
- **Location**: All API routes
- **Severity**: MEDIUM
- **Reason**: There is no rate limiting on auth routes (brute-force risk), AI routes (cost amplification risk), or upload routes (storage abuse risk).
- **Suggested Fix**: Use Vercel's built-in rate limiting or `upstash/ratelimit` middleware.

---

### TD-013: No Input Sanitization Beyond Zod
- **Location**: Free-text fields: `personalMission`, `blockerToday`, `courseName`, `biggestExpenseToday`
- **Severity**: MEDIUM
- **Reason**: These strings are passed to Gemini prompts without sanitization. A malicious user could attempt prompt injection via these fields.
- **Suggested Fix**: Sanitize free-text fields before including in prompts. The existing PII anonymization in `gemini.ts` does not strip injection attempts.

---

### TD-014: Goals Stored as Embedded Subdocuments (Scale Limit)
- **Location**: `src/models/User.ts` — `goals: IGoal[]`
- **Severity**: MEDIUM
- **Reason**: MongoDB has a 16MB document size limit. With many milestones and goals, users could theoretically hit this limit. More practically, fetching goals requires loading the full User document.
- **Suggested Fix**: Move goals to a separate `Goal` collection with `userId` reference. Short-term: add `maxItems` validation in Zod.

---

## LOW

### TD-015: `memoize.ts` Unused
- **Location**: `src/lib/memoize.ts`
- **Severity**: LOW
- **Reason**: A memoization utility is defined but not imported or used anywhere in the codebase.
- **Suggested Fix**: Delete the file, or document which function it was intended to memoize.

---

### TD-016: `encryption.ts` Unused in Active Routes
- **Location**: `src/lib/encryption.ts`
- **Severity**: LOW
- **Reason**: AES-256-CBC encryption is implemented but not called from any route handler. Was likely intended for sensitive field storage.
- **Suggested Fix**: Either wire it up to the planned use case (PII fields, financial data) or remove it with a comment in git history explaining the intention.

---

### TD-017: `twinReflection.ts` and `aitwinReflection.ts` Appear Duplicated
- **Location**: `src/lib/prompts/twinReflection.ts` vs `src/lib/prompts/aitwinReflection.ts`
- **Severity**: LOW
- **Reason**: Two prompt files with very similar names exist. If one is a newer version of the other, the old one should be deleted.
- **Suggested Fix**: Audit both files. Delete the older/unused version.

---

### TD-018: `simulatorPrompt.ts` and `aisimulatorPrompt.ts` Appear Duplicated
- **Location**: `src/lib/prompts/simulatorPrompt.ts` vs `src/lib/prompts/aisimulatorPrompt.ts`
- **Severity**: LOW
- **Reason**: Same duplication pattern as the reflection prompts.
- **Suggested Fix**: Same resolution.

---

### TD-019: No Tests
- **Location**: Entire codebase
- **Severity**: LOW (for hackathon, medium for production)
- **Reason**: No unit tests, integration tests, or E2E tests exist. The scoring algorithms, EMA calculations, drift engine, and financial math have no test coverage.
- **Suggested Fix**: At minimum, add Jest unit tests for `scoring.ts`, `financeMath.ts`, and `driftEngine.ts` — these are pure functions with deterministic outputs.

---

### TD-020: Demo Route Has No Protection Against Abuse
- **Location**: `src/app/api/setup/demo/route.ts`
- **Severity**: LOW
- **Reason**: The route deletes and recreates a specific user (`demo@syntra.com`) on every call. A bad actor calling this repeatedly could cause DB churn.
- **Suggested Fix**: Add rate limiting (once per hour per IP) and move secret to env.

---

### TD-021: `fetcherError` Class Not Wired to Error Boundaries
- **Location**: `src/lib/fetcher.ts`
- **Severity**: LOW
- **Reason**: A `FetcherError` class is defined but frontend pages don't have React error boundaries to catch it. Failed fetches show the raw error in console, not a user-friendly message.
- **Suggested Fix**: Add an `ErrorBoundary` component or SWR's `onError` callback to pages.
