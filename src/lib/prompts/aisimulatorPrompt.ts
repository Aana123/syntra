// ================================================================
// SYNTRA — Simulator Prompt (TASK 3 / Phase 3 of architecture)
//
// Purpose: Extracted from app/api/simulate/route.ts and upgraded.
// When user moves a slider (+30% Career time), Gemini must explain
// the mathematical trade-offs across ALL three domains.
// ================================================================

import { SimulatorScenario, SimulatorResponse, TwinContext, DomainScores } from "../../types/ai";
import { callGemini } from "../gemini";
import { sanitizeForPrompt } from "../sanitize";
import { z } from "zod";

const SimulatorResponseSchema = z.object({
  scenarioTitle: z.string().min(1),
  primaryOutcome: z.string().min(10),
  tradeOffs: z.array(z.object({
    domain: z.enum(["health", "finance", "career"]),
    impact: z.enum(["positive", "negative", "neutral"]),
    magnitude: z.number().min(1).max(10),
    explanation: z.string().min(10),
  })).min(1),
  timelineProjection: z.array(z.object({
    week: z.string().min(1),
    projection: z.string().min(5),
  })).min(1),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  recommendedPath: z.string().min(10),
  confidence: z.number().int().min(0).max(100),
});

// ── Domain trade-off knowledge base ─────────────────────────────
// These are real behavioural science correlations injected as context.
// This is what makes the simulator feel intelligent, not just random.
const DOMAIN_TRADEOFF_KNOWLEDGE = `
KNOWN CROSS-DOMAIN TRADE-OFF RULES (apply these when relevant):

TIME TRADE-OFFS (zero-sum):
- Adding +1h/day to career study typically removes ~45min from health or social recovery
- Increasing workout frequency from 2→4x/week requires ~3 additional hours/week from somewhere
- Budget cuts of >20% in entertainment typically increase stress score by 1–2 points

ENERGY TRADE-OFFS (diminishing returns):
- Sleep below 6h reduces cognitive performance by ~25% — career gains from extra study hours are offset
- Workout without adequate protein/calories increases cortisol and reduces workout ROI
- Financial stress (savings rate <10%) correlates with 15–20% reduction in study consistency

MOMENTUM TRADE-OFFS (compounding):
- Consistent sleep (same ±30min window) doubles the benefit of the same sleep duration
- Savings streaks compound: each week on-budget makes the next week 12% more likely to stay on-budget
- Study consistency matters more than study volume: 1h/day beats 7h one day/week for retention

RECOVERY TRADE-OFFS:
- Pushing career metrics aggressively (>6h/day) without matching health investment leads to burnout within 3–4 weeks
- Extreme calorie restriction reduces mood score and cognitive performance within 5 days
`.trim();

// ── NEW: Gopalan Specificity Rules ──────────────────────────────
const SIMULATOR_SPECIFICITY_RULES = `
CRITICAL SPECIFICITY RULES (Gopalan Standard):
1. Trade-offs MUST reference the user's specific long-term goals. If they lose/gain money, calculate exactly how many months it delays/accelerates their specific "Dream Car" or "Home" goal.
2. If they change health metrics (sleep/workouts/food), reference specific physiological gaps (e.g., Vitamin A deficit) or calculate exact sleep debt hours.
3. NEVER use vague words like "improves" or "worsens". Use hard numbers: "+Rs.4000/month", "-2.5h sleep debt", "Delays Thar down payment by 2 months".
`.trim();

// ── Simulator few-shot example ───────────────────────────────────
// Updated to reflect the Gopalan standard (specific cars, specific meals, specific rupees)
const SIMULATOR_EXAMPLE = `
EXAMPLE: User simulates "+30% Career study time" from 2h/day to 2.6h/day

OUTPUT:
{
  "scenarioTitle": "+30% Career Focus: The Momentum Cost",
  "primaryOutcome": "Your career score is projected to increase by 12–18 points over 3 weeks, but the 36 extra daily minutes will deduct directly from your recovery window, potentially stalling your 7kg weight loss goal.",
  "tradeOffs": [
    { "domain": "career", "impact": "positive", "magnitude": 8, "explanation": "An extra 36 minutes of daily focused study compounds significantly. Over 3 weeks, this adds ~12h of deliberate practice — enough to complete the advanced React module." },
    { "domain": "health", "impact": "negative", "magnitude": 5, "explanation": "The 36 extra minutes replace recovery time. If sleep drops below 6.5h, your cortisol will rise, triggering refined-carb cravings and risking your 7kg weight loss target." },
    { "domain": "finance", "impact": "negative", "magnitude": 3, "explanation": "Time pressure correlates with convenience spending. Expect a Rs. 1,500/month increase in Zomato orders, which delays your Mahindra Thar down payment by 0.5 months." }
  ],
  "timelineProjection": [
    { "week": "Week 1", "projection": "Adjustment phase — expect mild fatigue. Career output stays flat before rising." },
    { "week": "Week 2", "projection": "Career momentum builds. Risk of Rs. 500 convenience spending spike due to time pressure." },
    { "week": "Week 3", "projection": "Career score rises 12–18 points. Burnout risk elevates if sleep fell below 6.5h." }
  ],
  "riskLevel": "medium",
  "recommendedPath": "Set a hard cap of 2.6h/day study. To prevent the Rs. 1,500 food delivery tax, meal-prep on Sunday so your Thar down payment stays on track.",
  "confidence": 77
}
`.trim();

// ── Main prompt builder ──────────────────────────────────────────
export function buildSimulatorPrompt(
  scenario: SimulatorScenario,
  currentContext: TwinContext,
  currentScores: DomainScores,
  confidence: number,
  customScenarioDetails?: string
): string {
  const direction = scenario.percentChange > 0 ? "increase" : "decrease";
  const magnitude = Math.abs(scenario.percentChange);

  // Safely extract specific goals if they exist on the context with precomputed math
  const specificWealthGoals = (currentContext as any).finance?.wealthGoals?.map((g: any) => {
    const label = sanitizeForPrompt(g.goalLabel, 60);
    if (typeof g.requiredMonthlySavings === "number") {
      return `${label} (Requires Rs. ${g.requiredMonthlySavings.toLocaleString("en-IN")}/month, actual savings: Rs. ${g.actualMonthlySavings?.toLocaleString("en-IN")}/month, Deficit: ${g.deficitText})`;
    }
    return label;
  }).join(", ") || "Dream Car / Home Downpayment";
  const specificHealthGaps = (currentContext as any).health?.historicalNutrientGaps ? JSON.stringify((currentContext as any).health.historicalNutrientGaps) : "Nutrient gaps / Weight goals";

  return `
You are Syntra's What-If Simulator — the predictive engine of the Digital Twin system.

The user has adjusted a life variable in a simulation. Your job is to explain the
MATHEMATICAL AND BEHAVIOURAL TRADE-OFFS across all three domains with precision and honesty.
You are not giving generic advice — you are running a scenario against this specific user's data.

━━━ SIMULATION PARAMETERS ━━━
Domain being changed: ${scenario.domain.toUpperCase()}
Variable: ${scenario.variable}
Current value: ${scenario.currentValue}
Simulated value: ${scenario.simulatedValue}
Change: ${direction} of ${magnitude}% (${scenario.currentValue} → ${scenario.simulatedValue})
${customScenarioDetails ? `\n━━━ EXACT MATHEMATICAL CALCULATIONS (USE THESE EXACT NUMBERS IN YOUR RESPONSES) ━━━\n${customScenarioDetails}\n` : ""}
━━━ CURRENT USER BASELINE ━━━
Health Score: ${currentScores.health}/100 | Trend: ${currentContext.trends.health}
Finance Score: ${currentScores.finance}/100 | Trend: ${currentContext.trends.finance}
Career Score: ${currentScores.career}/100 | Trend: ${currentContext.trends.productivity}

Weekly Averages: Sleep ${currentContext.weeklyAverages.sleep}h, 
Workouts ${currentContext.weeklyAverages.workout}x/week, 
Study ${currentContext.weeklyAverages.studyHours}h/week,
Savings Rate ${currentContext.weeklyAverages.savingsRate}%,
Stress ${currentContext.weeklyAverages.stressLevel}/10

Active Wealth Goals: ${specificWealthGoals}
Active Health Gaps/Goals: ${specificHealthGaps}

━━━ TRADE-OFF KNOWLEDGE BASE ━━━
${DOMAIN_TRADEOFF_KNOWLEDGE}

━━━ RULES ━━━
1. Every trade-off must cite a specific NUMBER or timeframe — never vague language
2. The primaryOutcome must quantify the expected score change (e.g. "+12–18 points over 3 weeks")
3. Show all 3 domains in tradeOffs — even if one is neutral, explain WHY it's neutral
4. timelineProjection must have 3 distinct phases (Week 1, 2, 3)
5. riskLevel: "low" if change <15%, "medium" if 15–35%, "high" if 35–60%, "critical" if >60%
6. Confidence ceiling: ${confidence}%. Do not exceed this.
${SIMULATOR_SPECIFICITY_RULES}

━━━ EXAMPLE OUTPUT ━━━
${SIMULATOR_EXAMPLE}

━━━ RETURN ONLY THIS JSON ━━━
{
  "scenarioTitle": "string — punchy title for this simulation",
  "primaryOutcome": "string — quantified projection with timeframe",
  "tradeOffs": [
    { "domain": "health|finance|career", "impact": "positive|negative|neutral", "magnitude": <1-10>, "explanation": "string with specific numbers AND specific goal references" },
    { "domain": "health|finance|career", "impact": "positive|negative|neutral", "magnitude": <1-10>, "explanation": "string" },
    { "domain": "health|finance|career", "impact": "positive|negative|neutral", "magnitude": <1-10>, "explanation": "string" }
  ],
  "timelineProjection": [
    { "week": "Week 1", "projection": "string" },
    { "week": "Week 2", "projection": "string" },
    { "week": "Week 3", "projection": "string" }
  ],
  "riskLevel": "low|medium|high|critical",
  "recommendedPath": "string — the smart way to execute this change with risk mitigation referencing specific goals",
  "confidence": <integer max ${confidence}>
}
`.trim();
}

// ── Convenience wrapper ──────────────────────────────────────────
export async function generateSimulatorInsight(
  scenario: SimulatorScenario,
  currentContext: TwinContext,
  currentScores: DomainScores,
  confidence: number,
  customScenarioDetails?: string
): Promise<SimulatorResponse> {
  const prompt = buildSimulatorPrompt(scenario, currentContext, currentScores, confidence, customScenarioDetails);
  const raw = await callGemini<unknown>(prompt, {
    temperature: 0.35,
    maxTokens: 2500,
  });
  const check = SimulatorResponseSchema.safeParse(raw);
  if (check.success) return check.data as SimulatorResponse;
  console.warn("[Simulator] Zod validation failed:", check.error.issues.map(e => `${e.path}: ${e.message}`).join("; "));
  // Deterministic fallback — guarantees a well-typed response even without AI
  return {
    scenarioTitle: `${scenario.domain} scenario projection`,
    primaryOutcome: `Simulating a ${Math.abs(scenario.percentChange)}% change in ${scenario.variable}.`,
    tradeOffs: [
      { domain: "health",   impact: "neutral", magnitude: 3, explanation: "Insufficient AI data — monitor health metrics." },
      { domain: "finance",  impact: "neutral", magnitude: 3, explanation: "Insufficient AI data — monitor budget adherence." },
      { domain: "career",   impact: "neutral", magnitude: 3, explanation: "Insufficient AI data — track study consistency." },
    ],
    timelineProjection: [
      { week: "Week 1", projection: "Adjustment phase — observe baseline changes." },
      { week: "Week 2", projection: "Early signals become visible across domains." },
      { week: "Week 3", projection: "Trend direction should be measurable." },
    ],
    riskLevel: Math.abs(scenario.percentChange) > 35 ? "high" : "medium",
    recommendedPath: "Monitor all three domains as changes take effect.",
    confidence: 0,
  };
}