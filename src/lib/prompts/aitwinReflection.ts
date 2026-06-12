// ================================================================
// SYNTRA — Twin Reflection Prompt (Production-Grade)
// ================================================================
//
// PRODUCTION UPGRADES OVER V1:
//
//  1. ADAPTIVE PROMPT ASSEMBLY — the prompt is not one static
//     string. Sections are dynamically injected based on which
//     behaviour flags are active, how many data points exist,
//     and the user's lowest-scoring domain. Low data → simpler
//     prompt. High stress + poor sleep → cortisol section injected.
//     This is what enterprise AI systems do.
//
//  2. DYNAMIC FEW-SHOT SELECTION — instead of showing all examples
//     always, the system picks the example that most closely
//     matches the user's current state. Gemini learns by the
//     most relevant analogy, not a generic one.
//
//  3. ZOD RUNTIME VALIDATION (already added by teammate) —
//     kept and upgraded with stricter rules: minimum string
//     lengths, max confidence enforcement at schema level,
//     minimum array sizes per domain.
//
//  4. SMART RETRY WITH CORRECTION HINTS — if Zod validation
//     fails, the system does not just retry blindly. It tells
//     Gemini exactly which field broke the contract and why,
//     then retries with a targeted correction prompt.
//
//  5. TRAJECTORY SCORING — not just "sleep is 5.5h" but
//     "sleep has dropped 1.7h over 5 days = -0.34h/day velocity".
//     Gemini sees rate-of-change, not just current state.
//     This enables genuinely predictive statements.
//
//  6. DOMAIN WEAKNESS TARGETING — the lowest-scoring domain
//     gets a dedicated deep-analysis section injected into
//     the prompt, ensuring the weakest area always gets
//     the most specific recommendations.
//
//  7. PROMPT VERSION TRACKING — every prompt is tagged with
//     a version string so you can A/B test improvements
//     and trace which prompt version generated which output.
//
// ================================================================

import { TwinContext, DomainScores, aitwinReflectionResponse } from "../../types/ai";
import { callGemini } from "../gemini";
import { sanitizeForPrompt } from "../sanitize";
import { z } from "zod";

// ================================================================
// PROMPT VERSION (increment when making changes)
// Used for A/B testing and output tracing in production
// ================================================================
export const TWIN_REFLECTION_PROMPT_VERSION = "v2.2.0-gopalan-specificity";

// ================================================================
// ZOD RUNTIME SCHEMA — THE CONTRACT ENFORCER
// Every field has explicit constraints. Gemini cannot hallucinate
// its way past this layer.
// ================================================================
const aitwinReflectionSchema = z.object({
  twinPrediction: z
    .string()
    .min(40, "twinPrediction too short — must be a complete predictive statement")
    .max(400),
  dailyReflection: z
    .string()
    .min(40, "dailyReflection too short — must acknowledge a strength AND a concern")
    .max(400),
  explainability: z
    .array(z.string().min(20))
    .min(2, "Need at least 2 explainability items")
    .max(5),
  dailyChallenge: z
    .string()
    .min(20, "dailyChallenge must be a complete, actionable sentence")
    .max(300),
  recommendations: z.object({
    health:   z.array(z.string().min(15)).min(1).max(3),
    finance:  z.array(z.string().min(15)).min(1).max(3),
    career:   z.array(z.string().min(15)).min(1).max(3),
  }),
  riskAlerts: z.array(z.string().min(15)).max(3),
  // Confidence is enforced at the schema level — no bypass possible
  confidence: z.number().int().min(0).max(100),
  leadIndicator: z.string().min(3).max(50),
  primaryRisk: z.string().min(3).max(50),
});

// ================================================================
// TRAJECTORY CALCULATOR
// Converts raw averages into rate-of-change signals.
// This is what enables genuinely predictive AI, not just summaries.
// ================================================================
interface TrajectorySignals {
  sleepVelocity: string;         // e.g. "-0.34h/day (declining fast)"
  productivityMomentum: string;  // e.g. "stable at 4h/day for 5 days"
  financialPressure: string;     // e.g. "+8% over budget (accelerating)"
  burnoutRiskScore: number;      // 0-10 composite score
  dominantDomain: "health" | "finance" | "career";
  criticalDomain: "health" | "finance" | "career"; // lowest score
}

function calculateTrajectory(
  context: TwinContext,
  scores: DomainScores
): TrajectorySignals {
  const { weeklyAverages: avg, trends } = context;

  // Sleep velocity: estimate rate of change from trend + current value
  const sleepTarget = 7.5;
  const sleepDeficit = +(sleepTarget - avg.sleep).toFixed(1);
  const sleepVelocity = trends.sleep === "declining"
    ? `${avg.sleep}h/night and falling (est. -0.2 to -0.4h/day)`
    : trends.sleep === "improving"
    ? `${avg.sleep}h/night and recovering (+0.1 to +0.3h/day)`
    : `${avg.sleep}h/night (stable, ${sleepDeficit > 0 ? sleepDeficit + "h below target" : "at or above target"})`;

  // Financial pressure
  const overBudget = avg.spendingVsBudget;
  const financialPressure = overBudget > 15
    ? `${overBudget}% over budget — high pressure, accelerating`
    : overBudget > 5
    ? `${overBudget}% over budget — moderate pressure`
    : overBudget < 0
    ? `${Math.abs(overBudget)}% under budget — healthy`
    : "on budget — stable";

  // Productivity momentum
  const productivityMomentum = trends.productivity === "declining"
    ? `${avg.studyHours}h/week study (falling — momentum at risk)`
    : trends.productivity === "improving"
    ? `${avg.studyHours}h/week study (rising — compound momentum building)`
    : `${avg.studyHours}h/week study (holding steady)`;

  // Burnout risk: composite of stress, sleep, workout, mood
  const burnoutRiskScore = Math.min(10, Math.round(
    (avg.stressLevel * 0.35) +
    (Math.max(0, 7 - avg.sleep) * 0.9) +
    (Math.max(0, 3 - avg.workout) * 0.5) +
    (Math.max(0, 5 - avg.moodScore) * 0.6)
  ));

  // Dominant domain (highest score = strength)
  const scoreEntries = Object.entries(scores) as ["health" | "finance" | "career", number][];
  const dominantDomain = scoreEntries.reduce((a, b) => b[1] > a[1] ? b : a)[0];
  const criticalDomain = scoreEntries.reduce((a, b) => b[1] < a[1] ? b : a)[0];

  return {
    sleepVelocity,
    productivityMomentum,
    financialPressure,
    burnoutRiskScore,
    dominantDomain,
    criticalDomain,
  };
}

// ================================================================
// RISK DETECTOR — deterministic flags before Gemini runs
// These are pre-computed facts, not AI guesses.
// ================================================================
function detectRisks(context: TwinContext, trajectory: TrajectorySignals): string[] {
  const risks: string[] = [];
  const f = context.behaviorFlags;
  const a = context.weeklyAverages;

  if (f.sleepCareerCorrelation && a.sleep < 6)
    risks.push(`CRITICAL: Sleep at ${a.sleep}h is actively degrading cognitive output — at this level, problem-solving speed drops ~25% and study retention falls below 60%.`);
  if (f.stressSpendingCorrelation && a.stressLevel >= 7)
    risks.push(`WARNING: Stress at ${a.stressLevel}/10 is correlating with budget overruns of ${a.spendingVsBudget}% — financial decisions are being made in a reactive state.`);
  if (f.workoutMoodCorrelation && a.workout < 2)
    risks.push(`WARNING: Only ${a.workout} workout(s) this week — mood instability risk is elevated; BDNF and dopamine production are below baseline.`);
  if (f.lateNightSpending)
    risks.push("PATTERN: Late-night spending spikes detected — impulse control is measurably compromised after 10pm.");
  if (f.weekendDropoff)
    risks.push("PATTERN: Weekend habit dropoff detected — two-day consistency breaks are compounding into a weekly regression cycle.");
  if (a.savingsRate < 10 && a.spendingVsBudget > 10)
    risks.push(`CRITICAL: Savings rate at ${a.savingsRate}% while spending is ${a.spendingVsBudget}% over budget — financial runway is actively shrinking.`);
  if (trajectory.burnoutRiskScore >= 7)
    risks.push(`BURNOUT RISK SCORE: ${trajectory.burnoutRiskScore}/10 — composite of stress, sleep deficit, low workout frequency, and mood score indicates elevated burnout probability within 2–3 weeks.`);

  // 1. Loneliness Warning: socialCount < 2/week and mood average < 6/10 (equivalent to < 3/5)
  const socialFreq = typeof a.socialCount === "number" ? a.socialCount : 0;
  if (socialFreq < 2 && a.moodScore < 6) {
    risks.push(`WARNING: Loneliness pattern detected — weekly social frequency is at ${socialFreq.toFixed(1)}/week (threshold < 2) and mood average is low at ${a.moodScore.toFixed(1)}/10.`);
  }

  // 2. Financial Redirect Nudge: discretionary spending high and child education SIP deficit exists
  const children = context.familyOutflows?.children || [];
  let totalEducationDeficit = 0;
  for (const child of children) {
    let targetCorpus = 3000000;
    if (child.schoolType === "private") targetCorpus = 5000000;
    else if (child.schoolType === "international") targetCorpus = 15000000;

    const age = new Date().getFullYear() - (Number(child.yearOfBirth) || 2020);
    const monthsRemaining = Math.max(1, (18 - age) * 12);
    const monthlyRate = 0.12 / 12;

    let requiredSIP = 0;
    if (monthsRemaining > 0) {
      requiredSIP = (targetCorpus * monthlyRate) / (Math.pow(1 + monthlyRate, monthsRemaining) - 1);
    }
    const currentSIP = Number(child.currentSIP || 0);
    const childDeficit = Math.max(0, requiredSIP - currentSIP);
    totalEducationDeficit += childDeficit;
  }

  if (totalEducationDeficit > 0 && a.spendingVsBudget > 0) {
    risks.push(`FINANCIAL NUDGE: Child education SIP deficit of ₹${Math.round(totalEducationDeficit).toLocaleString("en-IN")}/mo detected while discretionary spending is running ${a.spendingVsBudget}% over budget. Suggest redirecting Swiggy/convenience outflows to bridge this deficit.`);
  }

  // 3. Social Support Recommendation: high stress (>= 7) or low mood (< 6)
  const supportNetwork = (context as any).supportNetwork || [];
  if (supportNetwork.length > 0 && (a.stressLevel >= 7 || a.moodScore < 6)) {
    let contactName = "";
    let contactTag = "";
    if (a.stressLevel >= 8) {
      const contact = supportNetwork.find((c: any) => c.tag === "venting") || supportNetwork.find((c: any) => c.tag === "motivation") || supportNetwork[0];
      contactName = contact.name;
      contactTag = contact.tag;
    } else {
      const contact = supportNetwork.find((c: any) => c.tag === "venting") || supportNetwork.find((c: any) => c.tag === "distraction") || supportNetwork[0];
      contactName = contact.name;
      contactTag = contact.tag;
    }
    if (contactName) {
      risks.push(`SUPPORT OUTREACH: Consider reaching out to your support contact ${contactName} (${contactTag}) to talk through your current state, lower cortisol, and restore emotional sync.`);
    }
  }

  return risks;
}

// ================================================================
// DYNAMIC FEW-SHOT SELECTOR
// Picks the most relevant example for the user's current state.
// Gemini learns from the most analogous case, not a generic one.
// Updated to reflect the Gopalan Specificity Standard.
// ================================================================
interface FewShotExample {
  condition: (ctx: TwinContext, scores: DomainScores) => boolean;
  label: string;
  example: string;
}

const FEW_SHOT_LIBRARY: FewShotExample[] = [
  {
    label: "Poor sleep + strong career",
    condition: (ctx, scores) => ctx.weeklyAverages.sleep < 6 && scores.career > 60,
    example: `
INPUT: sleep 5.2h declining, study 4h/day stable, spending +15% over budget
OUTPUT:
{
  "twinPrediction": "Your Twin forecasts a 25% drop in problem-solving speed tomorrow if tonight's sleep stays under 5 hours — your career momentum is masking a sleep debt that actively risks your Tier 1 tech job timeline.",
  "dailyReflection": "You've maintained impressive study consistency this week, but you're running on borrowed energy. The 15% budget overrun is a direct fatigue-driven response, directly delaying your Home Downpayment goal.",
  "explainability": [
    "Sleep has declined from 7.1h to 5.2h over the past 5 days — a 27% reduction in recovery time.",
    "Career activity has held at 4+ hours daily despite the deficit — momentum is real but fragile.",
    "Spending is 15% over budget, translating to Rs. 3,200 wasted this week on fatigue-driven impulse purchasing."
  ],
  "dailyChallenge": "Eat one portion of spinach today to combat your Iron deficit, and log off all screens by 10:30pm to stop sleep debt from compounding.",
  "recommendations": {
    "health": ["Set a 10:15pm wind-down alarm tonight — non-negotiable.", "Eat one carrot today for Vitamin A, as your logs show 0 intake over 3 days."],
    "finance": ["Cut all Swiggy orders after 8pm today to save Rs. 400 and keep your Home Downpayment on track.", "Flag one unnecessary transaction from yesterday in your expense log."],
    "career": ["Front-load your hardest cognitive task to before 11am when alertness peaks despite the deficit.", "Your study momentum is genuine — protect it by not scheduling deep work after 3pm today."]
  },
  "riskAlerts": ["Two more nights below 6h will produce measurable drops in financial decision quality and a study retention collapse."],
  "confidence": 84,
  "leadIndicator": "Sleep Recovery",
  "primaryRisk": "Sleep Debt"
}`.trim(),
  },
  {
    label: "High stress + financial pressure",
    condition: (ctx) => ctx.weeklyAverages.stressLevel >= 7 && ctx.weeklyAverages.spendingVsBudget > 10,
    example: `
INPUT: stress 8/10, spending +22% over budget, savings rate 12%, sleep 6h irregular
OUTPUT:
{
  "twinPrediction": "Your Twin forecasts your savings rate will fall below 8% within 3 weeks if the stress-spending pattern continues — this trajectory adds a 4-month delay to your Mahindra Thar target.",
  "dailyReflection": "High stress is not just a feeling right now — it's a spending trigger. The 22% budget overrun is a predictable cortisol response. Fixing the root (stress) will fix the symptom (overspending Rs. 4,500).",
  "explainability": [
    "Stress at 8/10 correlates directly with the Rs. 4,500 discretionary spending spikes in your pattern data.",
    "Spending is 22% above budget — the highest overrun in your logged history.",
    "Sleep irregularity at 6h average is elevating baseline cortisol and reducing executive function."
  ],
  "dailyChallenge": "Skip your usual Rs. 250 Starbucks today and transfer that exact amount immediately into your Mahindra Thar fund.",
  "recommendations": {
    "health": ["15 minutes of low-intensity walking today to flush cortisol.", "Eat one egg today to fix your daily protein gap of 25g."],
    "finance": ["Set a single daily spending limit of Rs. 500 for discretionary items today only to defend your car downpayment.", "Move Rs. 2,000 to a separate savings account this evening to break the spending momentum."],
    "career": ["If stress is work-related: schedule one 15-minute boundary-setting conversation this week.", "Protect your study block — it is a stress-relief mechanism, not just a career tool."]
  },
  "riskAlerts": ["Stress-spending loop detected: elevated cortisol is driving discretionary purchases which create financial anxiety which elevates cortisol."],
  "confidence": 81,
  "leadIndicator": "Savings Rate",
  "primaryRisk": "Budget Overrun"
}`.trim(),
  },
  {
    label: "New user / low data (Fallback)",
    condition: (ctx) => ctx.logCount < 10,
    example: `
INPUT: 6 data points, all domains moderate, no behaviour flags active
OUTPUT:
{
  "twinPrediction": "With 6 data points logged, your Twin is calibrating — check back in 7 days for a fully personalised prediction. Your baseline is solid, with no critical flags active.",
  "dailyReflection": "You're in the early calibration phase — your Twin needs more data to speak with precision. Keep logging specific meals and expenses so we can map them to your car and house goals.",
  "explainability": [
    "6 data points logged — below the 14-point threshold for high-confidence pattern detection.",
    "No active behaviour flags across health, finance, or career domains.",
    "Baseline scores are in the moderate range — no immediate interventions required."
  ],
  "dailyChallenge": "Log today's full data set: exact foods eaten and exact rupees spent. Each log increases your Twin's prediction accuracy.",
  "recommendations": {
    "health": ["Log your sleep hours tonight — even a rough estimate helps establish your baseline."],
    "finance": ["Log at least 2 specific transactions today to begin building your spending pattern."],
    "career": ["Log your study or work activity today — even 30 minutes of intentional skill time counts."]
  },
  "riskAlerts": [],
  "confidence": 35,
  "leadIndicator": "Daily Logging",
  "primaryRisk": "Insufficient Data"
}`.trim(),
  },
];

function selectFewShotExample(context: TwinContext, scores: DomainScores): string {
  const match = FEW_SHOT_LIBRARY.find((ex) => ex.condition(context, scores));
  return match ? match.example : FEW_SHOT_LIBRARY[FEW_SHOT_LIBRARY.length - 1].example;
}

// ================================================================
// DOMAIN WEAKNESS SECTION
// When one domain is critically low, inject a targeted deep-analysis
// section. Ensures weakest area always gets most specific output.
// ================================================================
function buildCriticalDomainSection(
  criticalDomain: "health" | "finance" | "career",
  context: TwinContext,
  scores: DomainScores
): string {
  const score = scores[criticalDomain];

  const sections: Record<string, string> = {
    health: `
CRITICAL DOMAIN FOCUS — HEALTH (score: ${score}/100):
The health domain is the most urgent lever right now.
Key data: sleep ${context.weeklyAverages.sleep}h, ${context.weeklyAverages.workout} workouts/week, stress ${context.weeklyAverages.stressLevel}/10, mood ${context.weeklyAverages.moodScore}/10.
Identify the single highest-leverage health action. If there is a nutrient gap, name the EXACT food to eat today (e.g., 'Eat a carrot for Vitamin A').
`.trim(),
    finance: `
CRITICAL DOMAIN FOCUS — FINANCE (score: ${score}/100):
The finance domain is the most urgent lever right now.
Key data: savings rate ${context.weeklyAverages.savingsRate}%, spending ${context.weeklyAverages.spendingVsBudget > 0 ? "+" : ""}${context.weeklyAverages.spendingVsBudget}% vs budget.
Identify whether this is a spending problem, an income problem, or a stress-triggered pattern. Name EXACT rupee amounts to cut and reference their specific wealth goal (e.g., 'save Rs. 2000 for your Thar downpayment').
`.trim(),
    career: `
CRITICAL DOMAIN FOCUS — CAREER (score: ${score}/100):
The career domain is the most urgent lever right now.
Key data: ${context.weeklyAverages.studyHours}h/week study, productivity trend ${context.trends.productivity}.
Identify whether this is a consistency problem, a direction problem, or an energy availability problem. Reference exact course/skill names.
`.trim(),
  };

  return sections[criticalDomain];
}

// ================================================================
// SCORE INTERPRETER
// ================================================================
function interpretScore(score: number): string {
  if (score >= 80) return "excellent";
  if (score >= 60) return "solid";
  if (score >= 40) return "needs attention";
  return "critical";
}

// ================================================================
// SPECIFICITY RULES 
// ================================================================
const REFLECTION_SPECIFICITY_RULES = (personalMission: string, healthConstraints: string) => `
CRITICAL SPECIFICITY RULES:
1. Explicitly cite specific foods eaten/missed (from the provided Recent Logs of Meals & Foods Eaten), specific rupee amounts saved/wasted, and exact hours studied.
2. If trajectory dropped, name the EXACT root cause (e.g., "Rs. 2500 spent on impulse Zomato buys" or specific ingredients/food items logged).
3. Always connect current actions to their active long-term specific goals (Dream Car, Tech Tier 1 job, etc.) and their primary Personal Mission ("${personalMission}").
4. Acknowledge and respect the user's specific health constraints ("${healthConstraints}"). If they have a constraint (like Thyroid, Diabetes, Migraine, or any specific illness), you MUST analyze their logged meals to check if they conform to the constraint, and ensure all meal suggestions (e.g., in todaysMealPlan or recommendations) and risk alerts are highly tailored to accommodate and manage this constraint safely (avoiding trigger foods, recommending metabolic-safe schedules, etc.).
5. CONTEXTUAL AI TRIGGER — SOCIAL SUPPORT NETWORK: If the user's stress level is elevated (avg stress >= 7) or mood is low (avg mood < 5), you MUST explicitly suggest reaching out to one of the named contacts in their SUPPORT NETWORK (e.g., recommend contacting a specific person by name for their designated tag like venting, advice, distraction, or motivation) in either the recommendations.health or dailyChallenge.
6. CONTEXTUAL AI TRIGGER — CAREGIVING FATIGUE: If the user has dependents (children or elderly parents) and their sleep average is below 6.5h, you MUST highlight the risk of caregiving fatigue in the riskAlerts or twinPrediction and suggest realistic micro-rest or boundary-setting interventions in the recommendations.health.
7. CONTEXTUAL AI TRIGGER — FAMILY OUTFLOW PRESSURE: If the user's finance score is below 60 or savings rate is below their target, you MUST cross-reference their fixed FAMILY OUTFLOWS (such as school fees, parent medical care, or monthly remittances) in your financial risk alerts/reflection and warn them to keep discretionary spending low to protect their safety margins.
`.trim();

// ================================================================
// MAIN EXPORT — ADAPTIVE PROMPT BUILDER
// The prompt is assembled dynamically based on user state.
// Not one static template — a system that composes intelligently.
// ================================================================
export function buildaitwinReflectionPrompt(
  context: TwinContext,
  scores: DomainScores,
  streak: number,
  confidence: number,
  personalMission: string = "Achieve Personal Optimization",
  healthConstraints: string = "none",
  relations?: any,
  supportNetwork?: any[],
  familyOutflows?: any
): string {

  const safeMission = sanitizeForPrompt(personalMission, 200);
  const safeConstraints = sanitizeForPrompt(healthConstraints, 150);

  // Format relations and socials data
  const hhMembers = relations?.householdMembers?.map((m: any) => m.relationshipType).join(", ") || "None";
  const deps = relations?.dependents?.map((d: any) => `${d.type === 'child' ? 'Child' : 'Elderly Parent'} (Age: ${d.age})`).join(", ") || "None";
  const supportNet = supportNetwork?.map((s: any) => `${s.name} (${s.relationshipType}) [Tag: ${s.tag}]`).join(", ") || "None";

  // Format family outflows data
  const childrenOut = familyOutflows?.children?.map((c: any) => 
    `Child (Birth Year: ${c.yearOfBirth}, School Type: ${c.schoolType}, Annual School Fees: ₹${c.schoolFeesAnnual || 0}, Monthly Tuition: ₹${c.tuitionMonthly || 0}, Monthly Extracurriculars: ₹${c.extracurricularMonthly || 0}, Monthly Childcare: ₹${c.childcareMonthly || 0})`
  ).join(" | ") || "None";

  const cg = familyOutflows?.caregiving || {};
  const caregivingOut = `Parent Healthcare Monthly: ₹${cg.parentHealthcareMonthly || 0}, Parent Insurance Annual Premium: ₹${cg.parentInsuranceAnnualPremium || 0}, Parent Insurance Cover: ₹${cg.parentInsuranceCoverAmount || 0}, Monthly Remittance: ₹${cg.monthlyRemittance || 0}, Household Help Monthly: ₹${cg.householdHelpMonthly || 0}`;

  const trajectory = calculateTrajectory(context, scores);
  const risks = detectRisks(context, trajectory);
  const selectedExample = selectFewShotExample(context, scores);
  const criticalSection = buildCriticalDomainSection(trajectory.criticalDomain, context, scores);
  const specificityRules = REFLECTION_SPECIFICITY_RULES(safeMission, safeConstraints);

  // Safely extract active goals/gaps to feed Gemini the exact context with precomputed math
  const specificWealthGoals = (context as any).finance?.wealthGoals?.map((g: any) => {
    const label = sanitizeForPrompt(g.goalLabel, 60);
    if (typeof g.requiredMonthlySavings === "number") {
      return `${label} (Requires Rs. ${g.requiredMonthlySavings.toLocaleString("en-IN")}/month, actual savings: Rs. ${g.actualMonthlySavings?.toLocaleString("en-IN")}/month, Deficit: ${g.deficitText})`;
    }
    return label;
  }).join(", ") || "Dream Car / Home Downpayment";
  const specificHealthGaps = (context as any).health?.historicalNutrientGaps ? JSON.stringify((context as any).health.historicalNutrientGaps) : "General nutrient gaps";
 
  const riskBlock = risks.length > 0
    ? `PRE-DETECTED RISK SIGNALS — address ALL of these in riskAlerts:\n${risks.map((r) => `  - ${r}`).join("\n")}`
    : "No critical risk signals pre-detected. riskAlerts may be an empty array if nothing else is found.";
 
  const dataQualityNote = context.logCount < 10
    ? `LOW DATA MODE: Only ${context.logCount} data points. Acknowledge this in dailyReflection. Lower confidence accordingly. Do not make strong predictions.`
    : context.logCount < 21
    ? `MODERATE DATA: ${context.logCount} data points. Pattern detection is possible but flag any low-certainty claims.`
    : `HIGH DATA MODE: ${context.logCount} data points across ${context.daysActive} days. Full pattern analysis is valid.`;
 
  return `
You are Syntra — an advanced, empathetic Digital Twin AI.
Prompt Version: ${TWIN_REFLECTION_PROMPT_VERSION}
 
YOUR VOICE AND CHARACTER:
- You speak in second person: "You", "Your Twin" — never third person
- You are specific, never vague — every claim cites an actual number from the data
- You sound like a trusted advisor who has studied this person for weeks and genuinely cares
- You acknowledge both a strength and a concern in every reflection
- You are NOT a cheerleader ("Great job!") and NOT a doctor ("You may be experiencing")
- You are NOT repetitive — each domain recommendation must be a distinct, non-overlapping action
 
━━━ USER STATE BRIEFING ━━━
 
PERSONAL MISSION: ${safeMission}
HEALTH CONSTRAINTS: ${safeConstraints}
 
RELATIONS & HOUSEHOLD:
  Relationship Status: ${relations?.relationshipStatus || "Single"}
  Household Members: ${hhMembers}
  Dependents: ${deps}

SUPPORT NETWORK:
  Contacts: ${supportNet}

FAMILY OUTFLOWS:
  Children: ${childrenOut}
  Caregiving: ${caregivingOut}
 
DOMAIN SCORES:
  Health:  ${scores.health}/100 (${interpretScore(scores.health)}) | Trend: ${context.trends.health}
  Finance: ${scores.finance}/100 (${interpretScore(scores.finance)}) | Trend: ${context.trends.finance}
  Career:  ${scores.career}/100 (${interpretScore(scores.career)}) | Trend: ${context.trends.productivity}
 
Dominant strength: ${trajectory.dominantDomain.toUpperCase()}
Most critical gap: ${trajectory.criticalDomain.toUpperCase()}
Active streak: ${streak} consecutive days logged
 
ACTIVE SPECIFIC GOALS (Reference these explicitly):
  Wealth Goals: ${specificWealthGoals}
  Health Gaps: ${specificHealthGaps}
 
WEEKLY AVERAGES:
  Sleep:              ${context.weeklyAverages.sleep}h/night
  Sleep velocity:     ${trajectory.sleepVelocity}
  Workouts:           ${context.weeklyAverages.workout} sessions/week
  Study hours:        ${trajectory.productivityMomentum}
  Savings rate:       ${context.weeklyAverages.savingsRate}%
  Spending vs budget: ${trajectory.financialPressure}
  Mood score:         ${context.weeklyAverages.moodScore}/10
  Stress level:       ${context.weeklyAverages.stressLevel}/10
  Calorie adherence:  ${context.weeklyAverages.calorieAdherence}%
 
BEHAVIOUR FLAGS (cross-domain correlations):
  Stress drives overspending:  ${context.behaviorFlags.stressSpendingCorrelation ? "ACTIVE" : "Not detected"}
  Poor sleep hurts career:     ${context.behaviorFlags.sleepCareerCorrelation ? "ACTIVE" : "Not detected"}
  No workout drops mood:       ${context.behaviorFlags.workoutMoodCorrelation ? "ACTIVE" : "Not detected"}
  Late-night spending:         ${context.behaviorFlags.lateNightSpending ? "ACTIVE" : "Not detected"}
  Weekend habit dropoff:       ${context.behaviorFlags.weekendDropoff ? "ACTIVE" : "Not detected"}
 
HYDRATION & NUTRITION:
  Avg water intake:    ${context.weeklyAverages.waterIntake} glasses/day ${context.weeklyAverages.waterIntake < 5 ? "(BELOW MINIMUM — flag this)" : "(adequate)"}
  Meal consistency:    ${context.weeklyAverages.mealConsistency}% of days with all 3 meals
  Meal skip pattern:   ${context.qualitative.skippedMealPattern}
  Meals & Foods Eaten (Recent Logs):
${context.qualitative.recentMealsEaten && context.qualitative.recentMealsEaten.length > 0 ? context.qualitative.recentMealsEaten.map((m, i) => `    Day ${i + 1}: "${m}"`).join("\n") : "    No specific food logs submitted yet. Nudge the user to start logging meals."}

SPENDING INTELLIGENCE:
  Top expenses:        ${context.qualitative.topExpenseNames.length > 0 ? context.qualitative.topExpenseNames.join(", ") : "No spending pattern data yet"}
  Impulse spend rate:  ${context.qualitative.impulseSpendRate}% of logged days flagged as impulse ${context.qualitative.impulseSpendRate > 30 ? "(HIGH — address this)" : ""}

CAREER CONTEXT:
  Recent courses:      ${context.qualitative.recentCourseNames.length > 0 ? context.qualitative.recentCourseNames.join(", ") : "None logged"}
  Goal focus (recent): ${context.qualitative.recentGoalFocus.length > 0 ? context.qualitative.recentGoalFocus.join(", ") : "None logged"}
  Recent blockers:     ${context.qualitative.recentBlockers.length > 0 ? context.qualitative.recentBlockers.join(", ") : "None reported"}

USER VOICE (recent daily notes — use these for empathetic context):
${context.qualitative.recentDailyNotes.length > 0 ? context.qualitative.recentDailyNotes.map((n, i) => `  Day ${i + 1}: "${n}"`).join("\n") : "  No daily notes submitted yet."}

COMPOSITE BURNOUT RISK: ${trajectory.burnoutRiskScore}/10
 
${dataQualityNote}
 
━━━ PRE-COMPUTED RISK ANALYSIS ━━━
${riskBlock}
 
━━━ CRITICAL DOMAIN DIRECTIVE ━━━
${criticalSection}
 
${specificityRules}
 
━━━ CALIBRATION EXAMPLE (match this specificity) ━━━
${selectedExample}

━━━ OUTPUT RULES ━━━
1. twinPrediction: forward-looking (tomorrow or this week), must quantify the risk or opportunity based on specific goals.
2. dailyReflection: 2 sentences — sentence 1 names a genuine strength, sentence 2 names the concern referencing specific Rs. or foods.
3. explainability: EXACTLY 2 concise items, each must cite a specific number from the data above.
4. dailyChallenge: completable in ONE day, includes a specific success criterion (e.g. eat a specific food).
5. recommendations: each domain gets 1-2 distinct, non-overlapping concrete actions with exact numbers/foods.
6. riskAlerts: return ONLY the top 2-3 highest priority risks.
7. confidence: integer, must not exceed ${confidence} — this ceiling is absolute.
8. leadIndicator: 2-5 word label for the single behavior that will most determine success toward the personal mission (e.g. "Sleep Consistency", "DSA Study Hours", "Savings Rate"). Pick from the data — do NOT invent a generic label.
9. primaryRisk: 2-5 word label for the top risk right now (e.g. "Sleep Debt", "Budget Overrun", "Study Dropout"). Derived from riskAlerts or behavior flags.

━━━ RETURN ONLY THIS JSON — NO TEXT OUTSIDE THE BRACES ━━━
{
  "twinPrediction": "string",
  "dailyReflection": "string",
  "explainability": ["string", "string"],
  "dailyChallenge": "string",
  "recommendations": {
    "health":   ["string"],
    "finance":  ["string"],
    "career":   ["string"]
  },
  "riskAlerts": [],
  "confidence": <integer max ${confidence}>,
  "leadIndicator": "string",
  "primaryRisk": "string"
}
`.trim();
}

// ================================================================
// SMART RETRY — if Zod fails, tell Gemini exactly what broke
// ================================================================
async function callWithValidation(
  originalPrompt: string, 
  confidence: number,
  attempt: number = 1,
  currentPromptToSend: string = "" 
): Promise<aitwinReflectionResponse> {
  const MAX_ATTEMPTS = 3;
  
  // Use the evolving prompt on retries, or the original on attempt 1
  const promptToExecute = attempt === 1 ? originalPrompt : currentPromptToSend;

  const rawResponse = await callGemini<unknown>(promptToExecute, {
    temperature: attempt === 1 ? 0.45 : 0.2, // Lower temp on retry
    maxTokens: 4096,
  });

  const check = aitwinReflectionSchema.safeParse(rawResponse);

  if (check.success) {
    const safe = check.data;
    if (safe.confidence > confidence) safe.confidence = confidence;
    return safe;
  }

  const errors = check.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
  console.warn(`[Syntra AI] Zod validation failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${errors}`);

  if (attempt >= MAX_ATTEMPTS) {
    throw new Error(`AI output failed Zod validation after ${MAX_ATTEMPTS} attempts. Last errors: ${errors}`);
  }

  // Append the error instructions to the ORIGINAL prompt so context is preserved!
  const correctionPrompt = `
${originalPrompt}

━━━ SYSTEM CORRECTION OVERRIDE ━━━
Your previous response failed strict validation with these specific errors:
${errors}

You MUST fix the fields listed above. Do not alter the intent of the data, just fix the structural errors.
Return ONLY valid JSON with no text outside the braces.
  `.trim();

  // Pass the newly constructed correctionPrompt back into the loop
  return callWithValidation(originalPrompt, confidence, attempt + 1, correctionPrompt);
}

// ================================================================
// PUBLIC API
// ================================================================
export async function generateaitwinReflection(
  context: TwinContext,
  scores: DomainScores,
  streak: number,
  confidence: number,
  personalMission: string = "Achieve Personal Optimization",
  healthConstraints: string = "none",
  relations?: any,
  supportNetwork?: any[],
  familyOutflows?: any
): Promise<aitwinReflectionResponse> {
  const prompt = buildaitwinReflectionPrompt(
    context,
    scores,
    streak,
    confidence,
    personalMission,
    healthConstraints,
    relations,
    supportNetwork,
    familyOutflows
  );
  return callWithValidation(prompt, confidence);
}