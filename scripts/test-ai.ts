// ================================================================
// SYNTRA — AI Engine Test Script (TASK 1 verification)
// Run: npm run test:ai
//
// Tests every task:
//   Task 1 — Gemini connectivity
//   Task 2 — Strict JSON output
//   Task 3 — All prompt files
//   Task 4 — Cross-domain correlations
//   Task 5 — Explainability fields
//   Task 6 — Gamification engine
// ================================================================

import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { callGemini } from "../src/lib/gemini";
import { generateaitwinReflection } from "../src/lib/prompts/aitwinReflection";
import { generateSimulatorInsight } from "../src/lib/prompts/aisimulatorPrompt";
import { generateHealthAnalysis, generateFinanceAnalysis, generateCareerAnalysis } from "../src/lib/prompts/domainPrompts";
import type { TwinContext, DomainScores, ChallengeContext } from "../src/types/ai";
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
// ── Colour helpers ────────────────────────────────────────────────
const C = {
  green:  (s: string) => `\x1b[32m${s}\x1b[0m`,
  red:    (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s: string) => `\x1b[2m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function header(t: string) {
  console.log(`\n${"═".repeat(55)}`);
  console.log(C.bold(C.cyan(`  ${t}`)));
  console.log("═".repeat(55));
}

async function test(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(C.green("  ✓ ") + label);
    passed++;
  } catch (e) {
    console.log(C.red("  ✗ ") + label);
    console.log(C.red("    → " + String(e)));
    failed++;
  }
  await delay(4000);
}
// ── Shared test fixtures ──────────────────────────────────────────
const TEST_CONTEXT: TwinContext = {
  weeklyAverages: {
    sleep: 5.5, workout: 1, studyHours: 4,
    savingsRate: 18, moodScore: 4, stressLevel: 8,
    calorieAdherence: 35, spendingVsBudget: +15,
    waterIntake: 4, mealConsistency: 60,
  },
  trends: { sleep: "declining", productivity: "stable", finance: "declining", health: "declining" },
  behaviorFlags: {
    stressSpendingCorrelation: true,
    sleepCareerCorrelation: true,
    workoutMoodCorrelation: true,
    lateNightSpending: false,
    weekendDropoff: true,
  },
  qualitative: {
    recentDailyNotes: ["Felt exhausted after work, skipped gym"],
    recentCourseNames: ["React Advanced"],
    recentGoalFocus: ["Complete portfolio project"],
    recentBlockers: ["Context switching between tasks"],
    topExpenseNames: ["swiggy (3x)", "amazon (2x)"],
    impulseSpendRate: 40,
    skippedMealPattern: "skipped breakfast 4/7 days",
    recentMealsEaten: ["Oats with whey protein", "Brown rice with chicken breast & broccoli", "Paneer stir-fry with mixed greens"],
  },
  logCount: 28,
  daysActive: 14,
};

const TEST_SCORES: DomainScores = { health: 42, finance: 55, career: 61 };

const TEST_CHALLENGE_CTX: ChallengeContext = {
  streaks: { "expense logging": 4, "study session": 2 },
  failedHabits: ["daily step goal", "sleep before midnight"],
  dominantDomain: "finance",
  motivationStyle: "competitive",
  recentWins: ["logged expenses 4 days straight"],
  scores: TEST_SCORES,
  weeklyLog: {
    "expense logging": [true, true, false, true, true, false, true],
    "study session":   [true, false, true, false, false, true, false],
  },
};

// ── TASK 1: Gemini Connectivity ───────────────────────────────────
async function task1() {
  header("TASK 1 — Gemini API Connectivity");

  await test("GEMINI_API_KEY is loaded from .env", async () => {
    if (!process.env.GEMINI_API_KEY) throw new Error("Key missing — check your .env file");
  });

  await test("Raw callGemini() returns valid JSON", async () => {
    const r = await callGemini<{ status: string; message: string }>(
      `Return only this JSON: {"status": "ok", "message": "Syntra AI engine is online"}`,
      { maxTokens: 100 }
    );
    if (r.status !== "ok") throw new Error("Unexpected response: " + JSON.stringify(r));
    console.log(C.dim(`    → ${r.message}`));
  });
}

// ── TASK 2: Strict JSON ───────────────────────────────────────────
async function task2() {
  header("TASK 2 — Strict JSON Contract Validation");

  await test("aitwinReflection returns all 7 required fields", async () => {
    const r = await generateaitwinReflection(TEST_CONTEXT, TEST_SCORES, 5, 72);
    const required = ["twinPrediction", "dailyReflection", "explainability", "dailyChallenge", "recommendations", "riskAlerts", "confidence"];
    for (const field of required) {
      if (!(field in r)) throw new Error(`Missing field: ${field}`);
    }
  });

  await test("Confidence is capped at ceiling (72)", async () => {
    const r = await generateaitwinReflection(TEST_CONTEXT, TEST_SCORES, 5, 72);
    if (r.confidence > 72) throw new Error(`Confidence ${r.confidence} exceeds ceiling of 72`);
    console.log(C.dim(`    → confidence: ${r.confidence}`));
  });

  await test("recommendations has all 3 domain keys", async () => {
    const r = await generateaitwinReflection(TEST_CONTEXT, TEST_SCORES, 5, 72);
    if (!r.recommendations.health || !r.recommendations.finance || !r.recommendations.career)
      throw new Error("Missing domain key in recommendations");
  });
}

// ── TASK 3: Prompt Architecture ───────────────────────────────────
async function task3() {
  header("TASK 3 — Prompt Architecture (All Prompt Files)");

  await test("aitwinReflection.ts — generates daily twin card", async () => {
    const r = await generateaitwinReflection(TEST_CONTEXT, TEST_SCORES, 5, 72);
    if (!r.twinPrediction) throw new Error("No twinPrediction");
    console.log(C.dim(`    → "${r.twinPrediction.slice(0, 80)}..."`));
  });

  await test("simulatorPrompt.ts — generates trade-off analysis", async () => {
    const r = await generateSimulatorInsight(
      { domain: "career", variable: "study_hours", currentValue: 2, simulatedValue: 2.6, percentChange: 30 },
      TEST_CONTEXT, TEST_SCORES, 72
    );
    if (!r.tradeOffs || r.tradeOffs.length < 3) throw new Error("Need 3 trade-offs (one per domain)");
    console.log(C.dim(`    → riskLevel: ${r.riskLevel}, tradeOffs: ${r.tradeOffs.length}`));
  });

  await test("domainPrompts.ts (health) — workout + nutrition plan", async () => {
    const r = await generateHealthAnalysis({
      avgSleepHours: 5.5, sleepConsistency: "very_irregular", weeklyWorkouts: 1,
      workoutTypes: ["walking"], avgStressLevel: 8, avgMoodScore: 4, nutritionAdherence: 35,
      currentGoals: ["improve energy", "lose 5kg"], logCount: 28, confidence: 72,
    });
    if (!r.workoutPlan?.weeklySchedule?.length) throw new Error("Missing workout schedule");
    console.log(C.dim(`    → ${r.workoutPlan.weeklySchedule.length} workout days planned`));
  });

  await test("domainPrompts.ts (finance) — investment strategy", async () => {
    const r = await generateFinanceAnalysis({
      monthlyIncome: 75000, monthlyExpenses: { rent: 18000, food: 8000, entertainment: 6500 },
      currentSavingsRate: 18, totalSavings: 85000, totalDebt: 120000,
      financialGoals: ["emergency fund", "SIP"], spendingTrend: "increasing",
      logCount: 28, confidence: 72,
    });
    if (!r.investmentStrategy?.suggestedAllocation?.length) throw new Error("Missing investment allocation");
    console.log(C.dim(`    → ${r.investmentStrategy.suggestedAllocation.length} allocations, risk: ${r.investmentStrategy.riskLevel}`));
  });

  await test("domainPrompts.ts (career) — learning path + skill gaps", async () => {
    const r = await generateCareerAnalysis({
      currentRole: "Junior Frontend Developer", yearsOfExperience: 1.5,
      technicalSkills: ["React", "JavaScript"], weeklyStudyHours: 4,
      studyConsistency: "irregular", currentCourses: [],
      careerGoals: ["senior engineer"], targetSkills: ["TypeScript", "Node.js"],
      projectsCompleted: 2, portfolioStrength: "weak", logCount: 28, confidence: 72,
    });
    if (!r.learningPath?.phases?.length) throw new Error("Missing learning phases");
    console.log(C.dim(`    → ${r.skillGapAnalysis?.length} skill gaps, ${r.portfolioProjects?.length} projects`));
  });
}

// ── TASK 4: Cross-Domain Correlations ────────────────────────────
async function task4() {
  header("TASK 4 — Cross-Domain Insight Testing");

  const correlations = [
    { name: "Sleep ↔ Spending", ctx: { ...TEST_CONTEXT, behaviorFlags: { ...TEST_CONTEXT.behaviorFlags, stressSpendingCorrelation: true } } },
    { name: "Stress ↔ Savings", ctx: { ...TEST_CONTEXT, weeklyAverages: { ...TEST_CONTEXT.weeklyAverages, stressLevel: 9, savingsRate: 8 } } },
    { name: "Workout ↔ Mood/Productivity", ctx: { ...TEST_CONTEXT, weeklyAverages: { ...TEST_CONTEXT.weeklyAverages, workout: 0, moodScore: 3 } } },
    { name: "Productivity ↔ Study Consistency", ctx: { ...TEST_CONTEXT, trends: { ...TEST_CONTEXT.trends, productivity: "declining" as const }, weeklyAverages: { ...TEST_CONTEXT.weeklyAverages, studyHours: 1 } } },
  ];

  for (const { name, ctx } of correlations) {
    await test(`Correlation: ${name}`, async () => {
      const r = await generateaitwinReflection(ctx, TEST_SCORES, 3, 70);
      if (!r.riskAlerts) throw new Error("No riskAlerts field");
      const hasCorrelation = r.riskAlerts.length > 0 || r.explainability.length >= 2;
      if (!hasCorrelation) throw new Error("No cross-domain signal detected in output");
      console.log(C.dim(`    → confidence: ${r.confidence}%, alerts: ${r.riskAlerts.length}`));
    });
  }
}

// ── TASK 5: Explainability ────────────────────────────────────────
async function task5() {
  header("TASK 5 — Explainable AI Response Verification");

  await test("aitwinReflection has explainability array (min 2 items)", async () => {
    const r = await generateaitwinReflection(TEST_CONTEXT, TEST_SCORES, 5, 72);
    if (!r.explainability || r.explainability.length < 2) throw new Error("Need at least 2 explainability items");
    console.log(C.dim(`    → ${r.explainability.length} items: "${r.explainability[0].slice(0, 70)}..."`));
  });

  await test("simulator tradeOffs include quantified explanations", async () => {
    const r = await generateSimulatorInsight(
      { domain: "health", variable: "sleep_hours", currentValue: 5.5, simulatedValue: 7.5, percentChange: 36 },
      TEST_CONTEXT, TEST_SCORES, 72
    );
    const hasNumbers = r.tradeOffs.some((t) => /\d/.test(t.explanation));
    if (!hasNumbers) throw new Error("Trade-off explanations must contain numbers");
    console.log(C.dim(`    → primary outcome: "${r.primaryOutcome.slice(0, 70)}..."`));
  });
}

// ── TASK 6: Gamification ─────────────────────────────────────────
async function task6() {
  header("TASK 6 — Gamification Intelligence (via Twin Reflection)");

  await test("dailyChallenge is present in reflection response", async () => {
    const r = await generateaitwinReflection(TEST_CONTEXT, TEST_SCORES, 5, 72);
    if (!r.dailyChallenge) throw new Error("Missing dailyChallenge");
    console.log(C.dim(`    → dailyChallenge: "${r.dailyChallenge}"`));
  });
}

// ── Runner ────────────────────────────────────────────────────────
async function main() {
  console.log(C.bold("\n🧠 SYNTRA — AI ENGINE TEST SUITE"));
  console.log(C.dim("Member 3 | AI/ML Prompt Engineering Layer\n"));

  const start = Date.now();

  await task1();
  await delay(15000); // wait 15 seconds

  await task2();
  await delay(15000);

  await task3();
  await delay(15000);

  await task4();
  await delay(15000);

  await task5();
  await delay(15000);

  await task6();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n${"═".repeat(55)}`);
  console.log(C.bold(`  ${C.green(`${passed} passed`)}  ${failed > 0 ? C.red(`${failed} failed`) : ""}  in ${elapsed}s`));
  console.log("═".repeat(55) + "\n");

  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(C.red("Fatal:"), e); process.exit(1); });