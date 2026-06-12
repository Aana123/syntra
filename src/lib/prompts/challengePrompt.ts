// ================================================================
// SYNTRA — Challenge & Gamification Prompt (TASK 6)
//
// Generates personalized daily challenges using:
//   • Behavioural psychology (habit loops, temptation bundling)
//   • Streak-aware nudging
//   • Motivation-style calibration
//   • Cross-domain momentum detection
//
// UPDATED TO GOPALAN STANDARD: Forces hyper-specific actions 
// (exact foods, exact rupees, exact course names).
// ================================================================

import { ChallengeContext, ChallengeResponse } from "../../types/ai";

// ── Badge Catalog ────────────────
export const BADGE_CATALOG = [
  { id: "week_warrior",      name: "Week Warrior",      domain: "health",       requirement: 7,   unit: "workout streak days",   points: 100 },
  { id: "sleep_champion",    name: "Sleep Champion",    domain: "health",       requirement: 7,   unit: "7h+ sleep nights",      points: 75  },
  { id: "nutrition_ninja",   name: "Nutrition Ninja",   domain: "health",       requirement: 14,  unit: "nutrition goal days",   points: 150 },
  { id: "savings_streak",    name: "Savings Streak",    domain: "finance",      requirement: 30,  unit: "under-budget days",     points: 200 },
  { id: "budget_boss",       name: "Budget Boss",       domain: "finance",      requirement: 21,  unit: "expense log days",      points: 120 },
  { id: "learning_machine",  name: "Learning Machine",  domain: "career",       requirement: 14,  unit: "study streak days",     points: 175 },
  { id: "project_builder",   name: "Project Builder",   domain: "career",       requirement: 1,   unit: "portfolio project",     points: 250 },
  { id: "syntra_elite",      name: "Syntra Elite",      domain: "cross-domain", requirement: 3,   unit: "active domain streaks", points: 500 },
] as const;

// ── Point Value System ────
export const POINT_VALUES = {
  LOG_MEAL:               10,
  LOG_WORKOUT:            15,
  LOG_EXPENSE:            10,
  LOG_STUDY_SESSION:      15,
  COMPLETE_DAILY_CHALLENGE: 50,
  STREAK_7_DAYS:          75,
  STREAK_30_DAYS:         200,
  COMPLETE_SMART_GOAL:    300,
} as const;

// ── Behavioural Science Nudge Patterns ───────────────────────────
// These teach Gemini WHICH technique to apply based on context.
const NUDGE_PATTERNS = `
BEHAVIOURAL SCIENCE TECHNIQUES TO USE (pick the most relevant):

1. IMPLEMENTATION INTENTION — "I will [habit] at [time] in [location]"
   Use when: habit is clear but consistency is low
   Example: "I will open my study notes at 9pm at my desk, right after dinner."

2. TEMPTATION BUNDLING — pair a habit with something enjoyable
   Use when: user avoids a habit they don't enjoy
   Example: "Only listen to your favourite playlist while logging expenses."

3. FRESH START EFFECT — frame a new week/month as a clean slate
   Use when: user broke a streak recently
   Example: "Monday resets the board. Last week's miss doesn't exist anymore."

4. LOSS AVERSION — focus on what's at risk, not what's to gain
   Use when: user has an existing streak worth protecting
   Example: "You're 4 days in. Breaking now costs you more than starting over."

5. SOCIAL PROOF — reference what people in similar situations do
   Use when: user is analytical or uncertain about approach
   Example: "Users who study in the 45 minutes post-workout retain 30% more."

6. TINY HABITS — reduce the habit to its smallest possible version
   Use when: user's failed habits have high friction
   Example: "Don't aim for 1 hour today. Just open the course and read one page."
`.trim();

// ── Streak analysis utility ──────────────────────────────────────
function getStreakStatus(streaks: Record<string, number>): string {
  const active = Object.entries(streaks).filter(([, days]) => days > 0);
  const endangered = active.filter(([, days]) => days > 0 && days < 3);
  const strong = active.filter(([, days]) => days >= 7);

  if (strong.length > 0) {
    return `STRONG STREAKS: ${strong.map(([h, d]) => `${h} (${d} days)`).join(", ")} — PROTECT THESE AT ALL COSTS.`;
  }
  if (endangered.length > 0) {
    return `FRAGILE STREAKS: ${endangered.map(([h, d]) => `${h} (${d} days)`).join(", ")} — these need a nudge to survive today.`;
  }
  if (active.length === 0) {
    return "No active streaks. User is in a fresh-start position — use the Fresh Start Effect.";
  }
  return `Active streaks: ${active.map(([h, d]) => `${h} (${d} days)`).join(", ")}`;
}

function getNextBadge(streaks: Record<string, number>, earnedBadges: string[]) {
  const unearnedBadges = BADGE_CATALOG.filter((b) => !earnedBadges.includes(b.id));

  let closest = unearnedBadges[0];
  let bestProgress = 0;

  for (const badge of unearnedBadges) {
    const relevantStreak = Object.entries(streaks).find(([habit]) =>
      habit.toLowerCase().includes(badge.domain) ||
      badge.domain === "cross-domain"
    );
    const current = relevantStreak ? relevantStreak[1] : 0;
    const progress = current / badge.requirement;
    if (progress > bestProgress) {
      bestProgress = progress;
      closest = badge;
    }
  }

  const relevantStreak = Object.entries(streaks).find(([habit]) =>
    habit.toLowerCase().includes(closest.domain)
  );

  return {
    badge: closest,
    current: relevantStreak ? relevantStreak[1] : 0,
  };
}

// ── Specificity Rules ─────────────────────────
const CHALLENGE_SPECIFICITY_RULES = `
CRITICAL SPECIFICITY RULES:
1. NEVER give generic challenges like "eat healthy" or "save money".
2. If a health/nutrient gap exists, the challenge MUST be to eat a specific food today (e.g., "Eat one carrot today").
3. If a wealth goal exists, the challenge MUST name a specific expense to cut (e.g., "Skip your Rs. 200 Swiggy order today and transfer it to your Thar downpayment").
4. If a career goal exists, name a specific resource (e.g., "Complete 1 module of Matt Pocock TypeScript today").
`.trim();

// ── Main prompt builder ──────────────────────────────────────────
export function buildChallengePrompt(ctx: ChallengeContext): string {
  const streakStatus = getStreakStatus(ctx.streaks);
  const { badge, current } = getNextBadge(ctx.streaks, []);
  const weeklyLogSummary = Object.entries(ctx.weeklyLog)
    .map(([h, log]) => `${h}: [${log.map((v) => (v ? "✓" : "✗")).join(" ")}]`)
    .join("\n");

  // Safely extract active goals/gaps to feed Gemini the exact context with precomputed math
  const specificWealthGoals = (ctx as any).finance?.wealthGoals?.map((g: any) => {
    if (typeof g.requiredMonthlySavings === "number") {
      return `${g.goalLabel} (Requires Rs. ${g.requiredMonthlySavings.toLocaleString("en-IN")}/month, actual savings: Rs. ${g.actualMonthlySavings?.toLocaleString("en-IN")}/month, Deficit: ${g.deficitText})`;
    }
    return g.goalLabel;
  }).join(", ") || "Dream Car / Home Downpayment";
  const specificHealthGaps = (ctx as any).health?.historicalNutrientGaps ? JSON.stringify((ctx as any).health.historicalNutrientGaps) : "Vitamin A deficit, Low protein";

  return `
You are Syntra's Gamification Intelligence engine.

Your job is to generate ONE hyper-personalized daily challenge and motivational messaging
that will actually change the user's behaviour today — not just inspire them momentarily.

━━━ USER STATE ━━━
Dominant Domain: ${ctx.dominantDomain}
Motivation Style: ${ctx.motivationStyle}
Domain Scores: Health ${ctx.scores.health} | Finance ${ctx.scores.finance} | Career ${ctx.scores.career}
Recent Wins: ${ctx.recentWins.length > 0 ? ctx.recentWins.join(", ") : "None logged recently"}
Failed Habits This Week: ${ctx.failedHabits.length > 0 ? ctx.failedHabits.join(", ") : "None — strong week"}

ACTIVE SPECIFIC GOALS (Reference these explicitly):
Wealth Goals: ${specificWealthGoals}
Health Gaps: ${specificHealthGaps}

STREAK STATUS:
${streakStatus}

7-DAY ACTIVITY LOG (✓ = completed, ✗ = missed):
${weeklyLogSummary || "No log data yet"}

NEXT BADGE OPPORTUNITY:
Badge: "${badge.name}" (${badge.domain})
Requirement: ${badge.requirement} ${badge.unit}
Current progress: ${current}/${badge.requirement}

━━━ TONE CALIBRATION ━━━
Motivation style is "${ctx.motivationStyle}". Apply this consistently:
- "competitive": Use challenge language. Reference personal bests. Make it feel like a contest with their past self.
- "supportive": Warm, encouraging. Celebrate small steps. Reduce pressure on the challenge.
- "analytical": Lead with data. Explain the science behind the recommendation. Avoid emotional language.

━━━ BEHAVIOURAL SCIENCE TOOLKIT ━━━
${NUDGE_PATTERNS}

━━━ CHALLENGE DESIGN RULES ━━━
1. Target the WEAKEST habit from failedHabits or the lowest ✗-count in the weekly log.
2. Challenge must be completable in ONE DAY — not "start a new habit", but "do X today".
3. streakNudge MUST reference exact streak numbers and connect it to their specific Active Goal.
4. habitReinforcement must apply ONE specific behavioural science technique from the toolkit.
5. motivationMessage must be calibrated to the "${ctx.motivationStyle}" style above.

${CHALLENGE_SPECIFICITY_RULES}

━━━ RETURN ONLY THIS JSON ━━━
{
  "challenge": {
    "title": "string — 5–8 word action-oriented title",
    "description": "string — EXACTLY what to do. MUST include specific foods, exact rupee amounts, or exact course names based on the user's specific goals.",
    "domain": "health|finance|career|cross-domain",
    "points": <integer 25–150 based on difficulty>,
    "completionCriteria": "string — how the user knows they've done it (e.g., 'Checked off after eating 1 carrot')"
  },
  "streakNudge": "string — reference EXACT streak numbers and tie it to their specific goal",
  "habitReinforcement": "string — one specific behavioural science technique for their weakest habit",
  "motivationMessage": "string — calibrated to '${ctx.motivationStyle}' style, 1–2 sentences",
  "nextBadge": {
    "name": "${badge.name}",
    "progress": ${current},
    "required": ${badge.requirement}
  }
}
`.trim();
}

// generateDailyChallenge removed — dailyChallenge is now generated as
// part of aitwinReflection (see src/lib/prompts/aitwinReflection.ts),
// eliminating a redundant Gemini call with overlapping context.