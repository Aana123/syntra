# Syntra — Gamification

Gamification in Syntra is a behavioral reinforcement layer. It rewards consistency rather than perfection — the system is designed so that showing up every day matters more than posting a perfect score.

---

## XP System

XP (experience points) is earned on every log submission. The amount depends on how well the user performed, not just whether they logged.

### XP tiers (per domain log)

| Score range | XP awarded | Label |
|---|---|---|
| ≥ 80 | **50 XP** | Excellence |
| ≥ 50 | **25 XP** | Active |
| < 50 | **10 XP** | Participation |

**Source**: `calculateEarnedXP(score: number)` in `src/lib/scoring.ts`

### XP on unified daily log
When using `POST /api/log/daily` (all three domains at once), XP is evaluated on each domain independently. A user who scores 85 health, 45 finance, 72 career earns `50 + 10 + 25 = 85 XP` for that session.

### XP accumulation
`user.gamification.totalPoints` accumulates indefinitely. There is no level-up system currently — total points serve as a raw engagement metric and gate specific badge unlocks.

### XP display
Shown on the dashboard alongside the current streak. Badge unlock notifications fire when XP crosses badge thresholds.

---

## Streaks

A streak measures how many consecutive calendar days the user has logged at least one domain entry.

### Streak calculation

On every log submission:
```typescript
const today     = new Date().toDateString();
const yesterday = new Date(Date.now() - 86400000).toDateString();
const lastLog   = user.gamification.lastLogDate?.toDateString();

if (lastLog === yesterday) {
  newStreak = currentStreak + 1;   // Consecutive — increment
} else if (lastLog === today) {
  newStreak = currentStreak;       // Same day — no change
} else {
  newStreak = 1;                   // Gap detected — reset to 1
}

user.gamification.currentStreak = newStreak;
user.gamification.lastLogDate   = new Date();
```

### Streak rules
- Logging once per day (any domain) maintains the streak
- Logging multiple times in one day does not increase the streak beyond 1 for that day
- Missing a day resets to 1 (not 0 — the current log counts as day 1)
- Streak is surfaced in the session JWT so the navbar can display it without an API call

### Streak display
- Shown in the navbar next to the user avatar (e.g., "🔥 14" — using an emoji in the UI, not in code)
- Shown on the dashboard hero section
- Streak milestones trigger badge unlocks (see Badges)

---

## Badges

Badges are string identifiers stored in `user.badges[]`. They are additive — once earned, never removed. Duplicate prevention uses MongoDB `$addToSet`.

### Badge catalog

| Badge ID | Display name | Unlock condition |
|---|---|---|
| `week_warrior` | Week Warrior | `currentStreak >= 7` |
| `month_master` | Month Master | `currentStreak >= 30` |
| `rising_twin` | Rising Twin | `totalPoints >= 500` |
| `health_champion` | Health Champion | `scores.health >= 80` |
| `finance_champion` | Finance Champion | `scores.finance >= 80` |
| `career_champion` | Career Champion | `scores.career >= 80` |

### Badge evaluation

Badges are evaluated on every log submission after scores and gamification are updated:
```typescript
const newBadges: string[] = [];

if (newStreak >= 7 && !user.badges.includes("week_warrior"))
  newBadges.push("week_warrior");
if (newStreak >= 30 && !user.badges.includes("month_master"))
  newBadges.push("month_master");
if (newTotalPoints >= 500 && !user.badges.includes("rising_twin"))
  newBadges.push("rising_twin");
if (newHealthScore >= 80 && !user.badges.includes("health_champion"))
  newBadges.push("health_champion");
if (newFinanceScore >= 80 && !user.badges.includes("finance_champion"))
  newBadges.push("finance_champion");
if (newCareerScore >= 80 && !user.badges.includes("career_champion"))
  newBadges.push("career_champion");

// Write to DB
await User.findByIdAndUpdate(userId, {
  $addToSet: { badges: { $each: newBadges } }
});
```

`newBadges` is returned in the log response so the frontend can trigger unlock animations immediately.

### Badge storage
```typescript
// In User model
badges: { type: [String], default: [] }
```

Plain string array — no metadata like unlock date or display order. Badge UI is handled entirely client-side based on the `badges[]` array from the user profile.

---

## Daily Challenges

Daily challenges are AI-generated, personalized actions tied to the user's current weakest domain. They appear on the dashboard as part of the AI snapshot payload.

### Challenge shape (from AI response)
```typescript
dailyChallenge: {
  title: string;       // Short action title, e.g., "The 7-Hour Anchor"
  description: string; // What to do and the reasoning behind it
  domain: "health" | "finance" | "career";
  xpReward: number;    // XP for completing it (typically 25–100)
}
```

### Challenge generation (`src/lib/prompts/challengePrompt.ts`)

The challenge prompt feeds `TwinContext` to Gemini and instructs it to:
1. Identify the weakest domain from current scores
2. Generate one specific, completable action for today
3. Calibrate difficulty to current score — lower scores = easier challenges to encourage entry
4. Set XP proportional to difficulty

### Challenge cadence
Challenges are part of the daily AI snapshot — one new challenge is generated each time the snapshot regenerates. Users who log daily and trigger drift-aware regeneration get a fresh challenge every day.

### Challenge completion
Currently, the challenge is displayed but completion tracking is not wired to the backend. Pressing "Accept" / "Complete" is a UI-only state in `useState`. A future `POST /api/goals/challenge/complete` endpoint should:
1. Add XP to `user.gamification.totalPoints`
2. Log a completion event to Telemetry
3. Clear the challenge from the current snapshot
4. Trigger badge evaluation

---

## Gamification State in the Database

All gamification fields live in the User document:
```typescript
gamification: {
  totalPoints:   { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  lastLogDate:   { type: Date, default: null },
}
badges: { type: [String], default: [] }
```

### Session JWT propagation
`streak` (= `gamification.currentStreak`) is embedded in the JWT at login:
```typescript
// In auth.ts authorize callback
return { id, name, email, avatarId, streak: user.gamification?.currentStreak ?? 0 }
```

This means the streak shown in the navbar is always the value at login time — it does not live-update during a session. After logging, SWR revalidation on `/api/log/latest` returns the updated streak and the UI re-renders.

---

## Design Principles

1. **Consistency over perfection** — 10 XP for any log means a bad day is still worth logging
2. **No punishment** — there is no XP deduction; streak reset is the only "negative" outcome
3. **Transparent criteria** — every badge condition is deterministic and based on real behavior
4. **AI-personalized challenges** — challenges adapt to the user's actual weak point, not a generic task list
