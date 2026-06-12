# Syntra — Telemetry

Telemetry is Syntra's internal audit trail and event system. It records significant system events asynchronously to MongoDB without blocking user-facing operations.

---

## Purpose

1. **Observability** — know what the system is doing and when
2. **Error tracking** — capture failures with context for debugging
3. **Performance monitoring** — baseline for future latency analysis
4. **Audit trail** — immutable record of user-impacting events

---

## Metrics Tracked

### Categories and their events

| Category | Events |
|---|---|
| `auth` | `user_registered`, `login_success`, `login_failed`, `session_expired` |
| `ingestion` | `log_created`, `daily_log_created`, `bulk_csv_imported`, `bulk_excel_imported` |
| `ai` | `snapshot_generated`, `snapshot_skipped` (stable path), `snapshot_cache_hit`, `gemini_error`, `gemini_retry` |
| `goals` | `goal_created`, `goal_deleted`, `milestone_added`, `milestone_completed` |
| `profile` | `onboarding_completed`, `vector_updated` |
| `error` | `unhandled_exception`, `validation_failure`, `db_connection_failed` |
| `performance` | `slow_query` (future), `high_drift_detected` |

---

## Storage

### Model: `Telemetry` (`src/models/Telemetry.ts`)

```typescript
{
  userId?:   ObjectId;               // Optional — system events have no userId
  action:    string;                 // Specific event name (e.g., "snapshot_generated")
  category:  string;                 // Event category (e.g., "ai")
  metadata?: Record<string, unknown>; // Arbitrary context
  timestamp: Date;                   // Default: Date.now
}
```

### Indexes
```typescript
{ userId: 1 }      // Per-user event history
{ action: 1 }      // Action-level queries ("all gemini_errors this week")
{ category: 1 }    // Category rollup
{ timestamp: -1 }  // Chronological queries (most recent first)
```

### Retention
Currently **append-only** — no TTL index, no archival. All events are kept indefinitely. For production, a TTL index of 90 days is recommended:
```javascript
db.telemetries.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
```

---

## Logger API (`src/lib/logger.ts`)

All telemetry is written through the `Logger` service — never directly to the Telemetry collection.

### Methods

```typescript
Logger.info(action: string, category: string, metadata?: object, userId?: string): void
Logger.warn(action: string, category: string, metadata?: object, userId?: string): void
Logger.error(action: string, category: string, metadata?: object, userId?: string): void
Logger.debug(action: string, category: string, metadata?: object, userId?: string): void
Logger.metric(action: string, category: string, metadata?: object, userId?: string): void
```

All methods are **fire-and-forget** — they return `void` and never throw. The write is async and non-blocking; if MongoDB is unavailable, the error is swallowed silently so the user request is never affected.

### Implementation pattern
```typescript
// Non-blocking — does not await
Logger.info("snapshot_generated", "ai", {
  userId,
  driftIndex,
  confidence,
  geminiLatencyMs: Date.now() - startTime,
});
```

### Internal write flow
```typescript
async function write(level, action, category, metadata, userId) {
  try {
    await connectDB();
    await Telemetry.create({
      userId: userId ? new ObjectId(userId) : undefined,
      action,
      category,
      metadata: { ...metadata, level },
      timestamp: new Date(),
    });
  } catch {
    // Silently swallowed — telemetry never blocks user requests
  }
}
```

---

## Performance Tracking

### What is currently tracked
- AI snapshot generation time (via `geminiLatencyMs` in metadata)
- Cache hit vs miss ratio (via `snapshot_cache_hit` vs `snapshot_generated` action counts)
- Gemini error rate (via `gemini_error` action count)
- High drift detection (via `high_drift_detected` metadata)

### How to query (MongoDB Atlas or mongosh)

**AI error rate this week:**
```javascript
db.telemetries.countDocuments({
  action: "gemini_error",
  timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
})
```

**Cache hit rate:**
```javascript
const hits = db.telemetries.countDocuments({ action: "snapshot_cache_hit" });
const misses = db.telemetries.countDocuments({ action: "snapshot_generated" });
// hitRate = hits / (hits + misses)
```

**Average Gemini latency:**
```javascript
db.telemetries.aggregate([
  { $match: { action: "snapshot_generated" } },
  { $group: { _id: null, avgLatency: { $avg: "$metadata.geminiLatencyMs" } } }
])
```

**Events for a specific user:**
```javascript
db.telemetries.find({ userId: ObjectId("...") }).sort({ timestamp: -1 }).limit(50)
```

---

## What Telemetry Does NOT Do

- **No client-side analytics** — no page views, no click tracking, no frontend events
- **No PII in metadata** — user IDs are stored, but names, emails, and passwords are never written to Telemetry
- **No real-time dashboard** — Telemetry data is queryable via MongoDB Atlas only; no admin UI exists yet
- **No alerting** — no automated alerts on error thresholds; monitoring is manual for now
