# Syntra — Snapshot Engine

The Snapshot Engine pre-generates AI reflections in the background after every log submission so dashboard loads are instant rather than waiting on a live Gemini call.

---

## Purpose

Without the snapshot engine, every visit to `/dashboard` or `/insights` would wait 5–15 seconds for Gemini to respond. The snapshot engine inverts this: AI is generated *after* logging (when the user is done interacting), and *consumed* on the next dashboard visit (instant).

---

## Generation Flow

### Trigger
Every successful log submission to `POST /api/log` or `POST /api/log/daily` ends with:

```typescript
import { waitUntil } from "@vercel/functions";
waitUntil(generateAndStoreSnapshot(userId));
return NextResponse.json({ success: true, state: { ... } });
```

`waitUntil()` keeps the Vercel function alive after the HTTP response is sent — the user gets their response immediately, and the background work continues.

### `generateAndStoreSnapshot(userId)` — full decision tree

**Location**: `src/lib/snapshotService.ts`

```
1. connectDB()
2. User.findById(userId) — fetch current user + goals
3. Log.find({ userId }).sort(-date).limit(42) — fetch recent logs
4. analyzeBehavioralDrift(logs) → { driftIndex, isStable }

5. IF isStable (driftIndex < 15) AND all trends stable:
   → Build lightweight reflection (math only, no Gemini)
   → Store: { twinPrediction: "Stable trajectory...", confidence: calculated, ... }
   → SKIP Gemini call

6. ELSE (drift detected or trends shifting):
   → buildTwinContext(logs, user)
   → calculateConfidence(logCount)
   → preComputeWealthGoals(user.goals, user.profile.monthlyIncome)
   → generateaitwinReflection(context, scores, streak, confidence, mission, constraints)
       → Gemini API call (gemini-2.5-flash, temp: 0.4)
       → Retry once on failure (500ms delay)
   → Validate response (Zod schema check)

7. ON SUCCESS:
   → user.aiSnapshot = { dailyReflection: aiResponse, lastGeneratedAt: new Date() }
   → user.save()
   → Logger.info("snapshot_generated", "ai", { userId, driftIndex, confidence })

8. ON GEMINI FAILURE:
   → Store safe defaults (see below)
   → Logger.error("snapshot_failed", "ai", { userId, error })
```

### Safe defaults (stored on any failure)
```json
{
  "twinPrediction": "Your Twin is analyzing your behavioral patterns. Check back shortly.",
  "dailyReflection": "Keep your streak going — consistency is your strongest asset right now.",
  "explainability": ["Insufficient data points for full analysis."],
  "dailyChallenge": "Log all three domains today to unlock your full Twin Reflection.",
  "recommendations": {
    "health": ["Maintain your current sleep schedule."],
    "finance": ["Avoid discretionary spending today."],
    "career": ["Complete one focused work session."]
  },
  "riskAlerts": [],
  "confidence": 0
}
```

Safe defaults are meaningful enough to be useful — not blank — but clearly signal that the twin hasn't generated a full reflection yet.

---

## Caching

### Cache validity check (in `GET /api/ai/recommend`)

```typescript
const hasValidSnapshot =
  user.aiSnapshot?.dailyReflection &&
  user.aiSnapshot.lastGeneratedAt &&
  new Date(user.aiSnapshot.lastGeneratedAt).toDateString() === new Date().toDateString();

let isSnapshotStale = false;
if (hasValidSnapshot && user.aiSnapshot?.lastGeneratedAt) {
  const snapshotTime = new Date(user.aiSnapshot.lastGeneratedAt).getTime();
  isSnapshotStale = recentLogs.some(log => new Date(log.date).getTime() > snapshotTime);
}

if (hasValidSnapshot && !isSnapshotStale) {
  return NextResponse.json(
    { success: true, ai: user.aiSnapshot.dailyReflection },
    { headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" } }
  );
}
```

### Two-condition cache validity
Both must be true for cache to be served:

| Condition | Check | Reason |
|---|---|---|
| **Same calendar day** | `snapshotDate.toDateString() === today` | Snapshots are daily — yesterday's is stale |
| **No newer logs** | No log has `date > lastGeneratedAt` | Logging after snapshot generation invalidates it |

If either condition fails → regenerate live on the request.

### HTTP cache headers
```
Cache-Control: private, s-maxage=300, stale-while-revalidate=600
```
- `private` — Never shared between users at CDN layer
- `s-maxage=300` — CDN serves from cache for 5 minutes
- `stale-while-revalidate=600` — Continue serving stale while background revalidation runs for up to 10 minutes

---

## Storage

### Where it lives
The snapshot is stored in the User document:

```typescript
// src/models/User.ts
aiSnapshot: {
  dailyReflection: { type: Object, default: null },  // Full AI response as JS object
  lastGeneratedAt: { type: Date, default: null },
}
```

**`dailyReflection` is stored as a plain JavaScript object** (Mongoose `Object` type), not a JSON string. It is read and returned directly without `JSON.parse()`.

### What is stored
The complete AI response object including all extended fields:
```typescript
{
  twinPrediction, dailyReflection, explainability[], dailyChallenge,
  recommendations: { health[], finance[], career[] },
  riskAlerts[], confidence,
  // Extended:
  wealthGoals[], requiredMonthlySavings, savingsDeficit,
  historicalNutrientGaps[], todaysMealPlan[],
  paretoSkills[], studyBlocks[]
}
```

### Size considerations
A typical AI snapshot object is 2–5 KB. This is negligible in MongoDB context, but is loaded with every `User.findById()` call regardless of whether the snapshot is needed. Routes that don't need the snapshot should use `.select("-aiSnapshot")` projection to avoid the overhead.

---

## Refresh Logic

### When a new snapshot is generated
1. **After any log submission** — triggered via `waitUntil()`
2. **On direct cache miss** — `GET /api/ai/recommend` with no valid snapshot triggers live generation synchronously (the user waits)
3. **After bulk upload** — CSV/Excel uploads also trigger `waitUntil(generateAndStoreSnapshot())`

### When the snapshot is intentionally skipped (stable path)
If `driftIndex < 15` and all trends are "stable", the snapshot engine stores a math-only lightweight object rather than calling Gemini. This is the most common path for consistent users — they never need a Gemini call because their behavior hasn't changed.

### Regeneration cadence in practice
| User behavior | Regeneration frequency |
|---|---|
| Logs daily, stable behavior | Once per day (after daily log) |
| Logs daily, drift detected | Once per day, full AI call |
| Logs erratically, drift builds | On each log submission while drifting |
| No logs today, visits dashboard | Cache hit if yesterday's snapshot is still today's (edge case) |
| Bulk CSV upload | Once after upload completes |
