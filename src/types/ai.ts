// ================================================================
// SYNTRA — AI Type Definitions
// Matches the EXACT JSON contract agreed with the backend team.
// Do NOT change field names — the frontend depends on these.
// ================================================================

// ── Core Twin Context (built by backend's aiContextBuilder.ts) ──
export interface TwinContext {
  weeklyAverages: {
    sleep: number;          // hours
    workout: number;        // sessions/week
    studyHours: number;     // hours/week
    savingsRate: number;    // percentage
    moodScore: number;      // 1–10
    stressLevel: number;    // 1–10
    calorieAdherence: number; // % of days goal met
    spendingVsBudget: number; // % over/under budget
    waterIntake: number;    // avg glasses/day
    mealConsistency: number; // % of days with no skipped meals
    socialCount?: number;   // avg social meetings per week
    relationshipQuality?: number; // 1-5 rating of close relationships
  };
  trends: {
    sleep: "improving" | "declining" | "stable";
    productivity: "improving" | "declining" | "stable";
    finance: "improving" | "declining" | "stable";
    health: "improving" | "declining" | "stable";
  };
  behaviorFlags: {
    stressSpendingCorrelation: boolean;  // high stress → overspending
    sleepCareerCorrelation: boolean;     // poor sleep → low study output
    workoutMoodCorrelation: boolean;     // no workout → low mood
    lateNightSpending: boolean;          // spending spikes after 10pm
    weekendDropoff: boolean;             // habits drop on weekends
  };
  // Qualitative context — AI-only fields
  qualitative: {
    recentDailyNotes: string[];     // last 3 daily notes (raw text)
    recentCourseNames: string[];    // last 3 unique course names
    recentGoalFocus: string[];      // last 3 goal descriptions worked on
    recentBlockers: string[];       // last 3 blockers reported
    topExpenseNames: string[];      // most frequent biggestExpenseToday values
    impulseSpendRate: number;       // % of finance logs flagged as impulse
    skippedMealPattern: string;     // e.g. "skipped breakfast 4/7 days"
    recentMealsEaten: string[];     // last 5 daily food logs (raw text)
  };
  logCount: number; // total data points — drives confidence ceiling
  daysActive: number;
  relations?: any;
  supportNetwork?: any[];
  familyOutflows?: any;
}

export interface DomainScores {
  health: number;   // 0–100
  finance: number;  // 0–100
  career: number;   // 0–100
}

// ── STRICT JSON CONTRACT (Phase 4 of architecture doc) ──────────
// This is what aitwinReflection.ts MUST return from Gemini.
// The frontend will crash if any field is missing or renamed.
export interface aitwinReflectionResponse {
  twinPrediction: string;          // predictive statement about tomorrow
  dailyReflection: string;         // empathetic summary of current state
  explainability: string[];        // 2–4 data-backed reason strings
  dailyChallenge: string;          // one actionable challenge for today
  recommendations: {
    health: string[];              // 1–3 health actions
    finance: string[];             // 1–3 finance actions
    career: string[];              // 1–3 career actions
  };
  riskAlerts: string[];            // cross-domain warnings (can be empty [])
  confidence: number;              // integer 0–100, capped by confidenceScore.ts
  leadIndicator: string;           // 2-5 word label for the #1 success driver, e.g. "Sleep Consistency"
  primaryRisk: string;             // 2-5 word label for the top current risk, e.g. "Budget Overrun"
}

// ── Simulator Types ──────────────────────────────────────────────
export type SimulatorDomain = "health" | "finance" | "career";

export interface SimulatorScenario {
  domain: SimulatorDomain;
  variable: string;        // e.g. "workout_frequency", "savings_rate"
  currentValue: number;
  simulatedValue: number;
  percentChange: number;   // e.g. +30 means "+30%"
}

export interface SimulatorResponse {
  scenarioTitle: string;
  primaryOutcome: string;
  tradeOffs: TradeOff[];
  timelineProjection: TimelinePoint[];
  riskLevel: "low" | "medium" | "high" | "critical";
  recommendedPath: string;
  confidence: number;
}

export interface TradeOff {
  domain: SimulatorDomain;
  impact: "positive" | "negative" | "neutral";
  magnitude: number;       // 1–10
  explanation: string;
}

export interface TimelinePoint {
  week: string;            // e.g. "Week 2"
  projection: string;      // what happens at this point
}

// ── Challenge / Gamification Types ──────────────────────────────
export type MotivationStyle = "competitive" | "supportive" | "analytical";

export interface ChallengeContext {
  streaks: Record<string, number>;        // habit → consecutive days
  failedHabits: string[];
  dominantDomain: SimulatorDomain;
  motivationStyle: MotivationStyle;
  recentWins: string[];
  scores: DomainScores;
  weeklyLog: Record<string, boolean[]>;   // habit → 7-day boolean log
}

export interface ChallengeResponse {
  challenge: {
    title: string;
    description: string;
    domain: SimulatorDomain | "cross-domain";
    points: number;
    completionCriteria: string;
  };
  streakNudge: string;
  habitReinforcement: string;
  motivationMessage: string;
  nextBadge: {
    name: string;
    progress: number;
    required: number;
  };
}