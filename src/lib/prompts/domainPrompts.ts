// ================================================================
// SYNTRA — Production-Grade Domain Prompts (TASK 3)
// ================================================================
//
// What makes these INDUSTRY-LEVEL vs a normal chatbot:
//
//  1. EXPERT PERSONAS — each domain has a named expert identity
//     with specific credentials, not "you are an AI assistant"
//
//  2. CHAIN-OF-THOUGHT — model is forced to reason step by step
//     before producing output, improving accuracy significantly
//
//  3. FEW-SHOT EXAMPLES — real examples embedded in each prompt
//     so the model learns tone, specificity, and format by example
//
//  4. ANTI-HALLUCINATION RULES — explicit constraints prevent
//     the model from inventing numbers or giving generic advice
//
//  5. DOMAIN FRAMEWORKS — real analytical frameworks injected:
//     Health: Sleep Debt Formula, RPE scale, cortisol cascade
//     Finance: 50-30-20, FIRE number, 80C/80D tax logic
//     Career: Pareto skill analysis, T-shaped skills, hiring signals
//
//  6. SPECIFICITY ENFORCEMENT — every output must include
//     real numbers, real product names, real platform names
//
//  7. SELF-CRITIQUE STEP — model checks its own output before
//     returning (reduces hallucination significantly)
//
// ================================================================

import { callGemini } from "../gemini";
import { sanitizeForPrompt } from "../sanitize";
import { z } from "zod";

// ── Lightweight output schemas — enforce shape, not every field ──
const DomainBaseSchema = z.object({
  title:       z.string().min(1),
  insight:     z.string().min(10),
  recommendation: z.string().min(10),
  confidence:  z.number().int().min(0).max(100),
  reasoning:   z.string().min(10),
  supportingTrends: z.array(z.string()).min(1),
});

const SimulatorResponseSchema = z.object({
  scenarioTitle: z.string().min(1),
  primaryOutcome: z.string().min(10),
  tradeOffs: z.array(z.object({
    domain: z.enum(["health", "finance", "career"]),
    impact: z.enum(["positive", "negative", "neutral"]),
    magnitude: z.number(),
    explanation: z.string().min(1),
  })),
  timelineProjection: z.array(z.object({
    week: z.string(),
    projection: z.string(),
  })),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  recommendedPath: z.string().min(1),
  confidence: z.number().int().min(0).max(100),
});

// ================================================================
// SHARED UTILITIES
// ================================================================

function chainOfThought(steps: string[]): string {
  return `
INTERNAL REASONING STEPS (do this silently before writing JSON):
${steps.map((s, i) => `  Step ${i + 1}: ${s}`).join("\n")}

After completing these steps internally, output ONLY the final JSON.
Do NOT include your reasoning in the output.
`.trim();
}

const ANTI_HALLUCINATION_RULES = `
STRICT ACCURACY RULES:
X Never invent statistics not present in the user's data
X Never recommend a product, course, or tool that does not exist
X Never use vague language: "try to sleep more", "consider saving"
X Every recommendation must contain a specific number, time, or measurable target
X If data is insufficient for a field, write: "Insufficient data - log more entries"
V Every string value must be a complete, standalone sentence
V All rupee amounts must be realistic for the income/expense range provided
`.trim();

const SELF_CRITIQUE = `
BEFORE FINALISING YOUR JSON, check:
- Does every recommendation contain a specific number or deadline?
- Is every data point in supportingTrends pulled from the actual user data?
- Is the confidence score at or below the ceiling stated above?
- Are all string values complete sentences (not fragments)?
- Are product/resource names real and currently available?
If any check fails, fix it before outputting.
`.trim();

// ================================================================
// HEALTH DOMAIN PROMPT
// ================================================================

// ── Nutrition history entry (one per day logged) ────────────────
// Each entry captures what the user actually ate for nutrient gap analysis.
export interface DailyNutritionLog {
  date: string;                          // "YYYY-MM-DD"
  meals: Array<{
    meal: "breakfast" | "lunch" | "dinner" | "snack";
    foods: string[];                     // e.g. ["rice", "dal", "cucumber"]
    estimatedCalories?: number;
  }>;
  waterLitres?: number;
}

export interface HealthDomainInput {
  avgSleepHours: number;
  sleepConsistency: "consistent" | "irregular" | "very_irregular";
  weeklyWorkouts: number;
  workoutTypes: string[];
  avgStressLevel: number;
  avgMoodScore: number;
  nutritionAdherence: number;
  recentSymptoms?: string[];
  currentGoals: string[];
  logCount: number;
  confidence: number;
  age?: number;
  weight?: number;
  height?: number;
  activityLevel?: "sedentary" | "lightly_active" | "moderately_active" | "very_active";
  // ── NEW: past nutrition logs for personalised food gap analysis ──
  nutritionHistory?: DailyNutritionLog[];  // Last 7 days of meal logs
}

export interface HealthDomainResponse {
  title: string;
  insight: string;
  recommendation: string;
  confidence: number;
  domainImpact: {
    health:  { score: number; summary: string };
    finance: { score: number; summary: string };
    career:  { score: number; summary: string };
  };
  reasoning: string;
  supportingTrends: string[];
  sleepDebtAnalysis: {
    currentDebtHours: number;
    recoveryPlan: string;
    cognitiveImpactEstimate: string;
  };
  workoutPlan: {
    weeklySchedule: Array<{
      day: string;
      activity: string;
      duration: number;
      intensity: "low" | "moderate" | "high";
      rpeTarget: number;
      notes: string;
    }>;
    focusAreas: string[];
    estimatedCalorieBurn: number;
    progressionStrategy: string;
  };
  // ── NEW: personalised nutrient gap analysis from meal history ──
  nutrientGapAnalysis: {
    // What the AI detected was MISSING from the last 7 days of food logs
    deficiencies: Array<{
      nutrient: string;           // e.g. "Vitamin A", "Iron", "Protein"
      severity: "mild" | "moderate" | "significant";
      evidenceFromLogs: string;   // e.g. "No orange/yellow vegetables logged in 5 of 7 days"
      todaysFoodFix: string;      // e.g. "Eat one medium carrot today — 835mcg Vitamin A (93% daily target)"
      alternativeFoods: string[]; // e.g. ["sweet potato", "spinach", "mango"]
      whyItMatters: string;       // short physiological impact
    }>;
    todaysMealPlan: Array<{
      meal: "breakfast" | "lunch" | "dinner" | "snack";
      suggestion: string;         // specific Indian meal addressing the gap
      targetNutrient: string;     // what gap this meal fixes
      estimatedCalories: number;
      prepTimeMinutes: number;
    }>;
    weeklyNutritionSummary: string; // e.g. "Heavy in carbs, low in Vitamin A and Iron — 3 consecutive days without any leafy greens"
    hydrationAssessment: string;
  };
  nutritionPlan: {
    dailyCalorieTarget: number;
    macroSplit: { protein: number; carbs: number; fat: number };
    mealSuggestions: Array<{
      meal: "breakfast" | "lunch" | "dinner" | "snack";
      suggestion: string;
      estimatedCalories: number;
      prepTimeMinutes: number;
    }>;
    hydrationTarget: string;
    avoidList: string[];
    supplementConsiderations: string[];
  };
}

const HEALTH_PERSONA = `
You are Dr. Arjun Mehta (virtual persona) - Syntra's Health Intelligence Engine.
Your analytical framework:
- Sleep science: sleep debt formula (deficit x 1.3 recovery multiplier), circadian alignment
- Exercise physiology: progressive overload, RPE-based training, EPOC calculations
- Nutritional biochemistry: cortisol-nutrition link, macronutrient partitioning
- Behavioural health: stress-cortisol-craving cascade, habit formation

You always find the ROOT CAUSE, not the surface symptom.
A low mood score is not just a mood issue - it is a cortisol signal linking to spending behaviour and career performance.
You never say "try to sleep more" - you say "set a 10:30pm screen cutoff for 7 days to recover 12.6h of sleep debt."
`.trim();

const HEALTH_FEW_SHOT = `
CALIBRATION EXAMPLE - match this specificity and tone:

INPUT: sleep 5.2h, very_irregular, 1 workout/week, stress 8/10, mood 4/10, nutrition 30%

GOOD output excerpt:
{
  "title": "Cortisol Overload is Stalling Every Domain",
  "insight": "Your stress-sleep-nutrition triad is in a compounding negative loop: 5.2h of fragmented sleep is elevating cortisol, which suppresses motivation to exercise and increases refined-carb cravings - directly explaining your 30% nutrition adherence. This is biochemistry, not willpower failure.",
  "sleepDebtAnalysis": {
    "currentDebtHours": 16.1,
    "recoveryPlan": "Target 7.5h/night for 12 consecutive nights to recover this deficit. Do not attempt to recover in one night as this causes circadian disruption.",
    "cognitiveImpactEstimate": "Current debt is equivalent to approximately 70% cognitive capacity - decision-making and emotional regulation are measurably impaired."
  }
}

BAD output (never do this):
{
  "title": "Improve Your Health",
  "insight": "You should try to sleep more and exercise regularly.",
  "recommendation": "Consider going to bed earlier and eating healthier."
}
`.trim();

// ── Nutrition history summariser ─────────────────────────────────
// Converts raw meal logs into a text summary Gemini can reason over.
// This is what enables "eat a carrot today for Vitamin A" style output.
function summariseNutritionHistory(history: DailyNutritionLog[]): string {
  if (!history || history.length === 0) {
    return "No meal history logged yet. Cannot perform nutrient gap analysis — advise user to log meals for 3+ days.";
  }

  const lines = history.map((day) => {
    const meals = day.meals.map((m) =>
      `  ${m.meal}: ${m.foods.join(", ")}${m.estimatedCalories ? ` (~${m.estimatedCalories} kcal)` : ""}`
    ).join("\n");
    const water = day.waterLitres ? ` | Water: ${day.waterLitres}L` : "";
    return `${day.date}${water}\n${meals}`;
  });

  return lines.join("\n\n");
}

export function buildHealthPrompt(input: HealthDomainInput): string {
  const nightlyDeficit = Math.max(0, 7.5 - input.avgSleepHours);
  const weeklyDebt = +(nightlyDeficit * 7).toFixed(1);
  const bmrNote = (input.weight && input.height && input.age)
    ? `Estimated BMR: ${Math.round(10 * input.weight + 6.25 * input.height - 5 * input.age + 5)} kcal/day`
    : "BMR: insufficient data (weight/height/age not logged)";

  const cot = chainOfThought([
    "Calculate sleep debt and identify the primary physiological consequence (cortisol, immune suppression, cognitive deficit)",
    "Identify which flag is the ROOT CAUSE vs a symptom - poor nutrition may be caused by sleep-elevated cortisol, not independent willpower failure",
    "Design workout plan calibrated to current fitness level - do NOT prescribe high intensity for someone doing fewer than 2 workouts per week",
    "Build nutrition around Indian staple foods first, supplements last",
    "Identify cross-domain impact: how does this health state affect spending patterns and cognitive output at work",
    "Run self-critique: are all recommendations specific and measurable? Is confidence within ceiling?",
  ]);

  return `
${HEALTH_PERSONA}

${cot}

USER HEALTH DATA:
Sleep: ${input.avgSleepHours}h average | Consistency: ${input.sleepConsistency}
Calculated weekly sleep debt: ~${weeklyDebt}h (vs 7.5h target)
Workouts: ${input.weeklyWorkouts}x/week (${input.workoutTypes.join(", ") || "not specified"})
Stress: ${input.avgStressLevel}/10 | Mood: ${input.avgMoodScore}/10
Nutrition adherence: ${input.nutritionAdherence}% of days
Reported symptoms: ${input.recentSymptoms?.join(", ") || "none"}
Goals: ${input.currentGoals.join(", ")}
${bmrNote}
Data points: ${input.logCount} | Confidence ceiling: ${input.confidence}%

━━━ PAST 7-DAY MEAL LOG (for nutrient gap analysis) ━━━
${summariseNutritionHistory(input.nutritionHistory ?? [])}

NUTRIENT GAP ANALYSIS INSTRUCTIONS:
Scan the meal log above and identify which vitamins, minerals, or macronutrients are
CONSISTENTLY ABSENT or under-represented across multiple days.

Key Indian diet gaps to check for:
- Vitamin A: found in carrots, sweet potato, mango, papaya, spinach — often missing from grain-heavy diets
- Iron: found in lentils, spinach, ragi, beetroot — often deficient, especially in vegetarian diets
- Vitamin C: found in amla, guava, lemon, tomato, capsicum — often low if no fresh produce logged
- Calcium: found in milk, curd, ragi, sesame — often missed if dairy is absent
- Protein: check if legumes/dal/eggs/paneer appear daily — gap very common in Indian diets
- Vitamin B12: found in dairy, eggs, paneer — near-zero in fully vegan diets; flag if no animal products logged
- Omega-3: found in flaxseed, walnuts, fish — almost always absent from typical Indian log
- Zinc: found in pumpkin seeds, chickpeas, cashews — often missed

For EACH deficiency you identify:
1. Cite the EXACT days from the log where the nutrient was absent
2. Give ONE specific food to eat TODAY that fixes it (be as specific as Mr. Gopalan's example: "eat a carrot for Vitamin A")
3. Give 2-3 alternative foods in case the suggested food is unavailable
4. Explain in one sentence WHY this nutrient matters for their health goals

ANALYTICAL FRAMEWORK:
SLEEP DEBT FORMULA: deficit_hours x 1.3 = recovery_hours_needed
RPE SCALE: prescribe RPE 4-5 for beginners (under 2 workouts/week), RPE 6-7 for intermediate
STRESS-CORTISOL CASCADE: stress 7+ triggers elevated cortisol, increasing cravings for refined carbs and reducing executive function
NUTRITION: Indian meal base template is dal + roti + sabzi, modify macros around this
CROSS-DOMAIN RULES:
- If stress 7+: note impact on financial impulse control and cognitive work quality
- If sleep under 6h: estimate cognitive capacity percentage and note career impact
- If workouts under 2/week: note mood instability risk and career/finance cascade

${HEALTH_FEW_SHOT}

${ANTI_HALLUCINATION_RULES}

${SELF_CRITIQUE}

RETURN ONLY THIS JSON - NO TEXT OUTSIDE THE BRACES:
{
  "title": "string - max 8 words, names root problem not symptom",
  "insight": "string - 2 sentences naming the biochemical or behavioural mechanism with actual numbers",
  "recommendation": "string - single highest-leverage action with specific time, number, and success criteria",
  "confidence": <integer max ${input.confidence}>,
  "domainImpact": {
    "health":  { "score": <-10 to 10>, "summary": "string - quantified health trajectory" },
    "finance": { "score": <-10 to 10>, "summary": "string - how this health state affects spending and financial decisions" },
    "career":  { "score": <-10 to 10>, "summary": "string - estimated cognitive capacity impact on work and study output" }
  },
  "reasoning": "string - causal chain explaining WHY this recommendation citing specific data points",
  "supportingTrends": ["specific data observation 1", "observation 2", "observation 3"],
  "sleepDebtAnalysis": {
    "currentDebtHours": <number - calculated weekly sleep debt>,
    "recoveryPlan": "string - specific nightly target and duration to recover",
    "cognitiveImpactEstimate": "string - estimated percentage cognitive capacity with explanation"
  },
  "nutrientGapAnalysis": {
    "deficiencies": [
      {
        "nutrient": "string - e.g. Vitamin A",
        "severity": "mild|moderate|significant",
        "evidenceFromLogs": "string - cite specific dates from the meal log where this nutrient was absent",
        "todaysFoodFix": "string - ONE specific food to eat today with portion and nutrient amount, e.g. 'Eat one medium carrot today — provides 835mcg Vitamin A (93% of daily target)'",
        "alternativeFoods": ["string - 2-3 alternative foods if primary is unavailable"],
        "whyItMatters": "string - one sentence on the physiological impact of this deficiency for this user's goals"
      }
    ],
    "todaysMealPlan": [
      {
        "meal": "breakfast|lunch|dinner|snack",
        "suggestion": "string - specific Indian meal that addresses the identified nutrient gaps",
        "targetNutrient": "string - which gap this meal primarily fixes",
        "estimatedCalories": <number>,
        "prepTimeMinutes": <number>
      }
    ],
    "weeklyNutritionSummary": "string - one sentence summarising the pattern across the 7-day log, e.g. 'Diet is carb-heavy with no orange/yellow vegetables in 5 of 7 days and protein below 40g/day'",
    "hydrationAssessment": "string - assessment of water intake from logs with specific target"
  },
  "workoutPlan": {
    "weeklySchedule": [
      { "day": "string", "activity": "string - specific exercise name", "duration": <minutes>, "intensity": "low|moderate|high", "rpeTarget": <1-10>, "notes": "string - form tip or modification" }
    ],
    "focusAreas": ["string"],
    "estimatedCalorieBurn": <number>,
    "progressionStrategy": "string - how to increase intensity over 4 weeks"
  },
  "nutritionPlan": {
    "dailyCalorieTarget": <number>,
    "macroSplit": { "protein": <pct>, "carbs": <pct>, "fat": <pct> },
    "mealSuggestions": [
      { "meal": "breakfast|lunch|dinner|snack", "suggestion": "string - specific Indian meal with portion size", "estimatedCalories": <number>, "prepTimeMinutes": <number> }
    ],
    "hydrationTarget": "string - specific ml target with timing guidance",
    "avoidList": ["string - specific food or habit to avoid with reason"],
    "supplementConsiderations": ["string - specific supplement if warranted, or state none needed"]
  }
}
`.trim();
}

export async function generateHealthAnalysis(input: HealthDomainInput): Promise<HealthDomainResponse> {
  const raw = await callGemini<unknown>(buildHealthPrompt(input), {
    temperature: 0.3,
    maxTokens: 2500,
  });
  const check = DomainBaseSchema.safeParse(raw);
  if (!check.success) {
    console.warn("[Health] Zod failed:", check.error.issues.map(e => `${e.path}: ${e.message}`).join("; "));
  }
  return raw as HealthDomainResponse;
}

// ================================================================
// FINANCE DOMAIN PROMPT
// ================================================================

export interface FinanceDomainInput {
  monthlyIncome: number;
  monthlyExpenses: Record<string, number>;
  currentSavingsRate: number;
  totalSavings: number;
  totalDebt: number;
  creditScore?: number;
  financialGoals: string[];
  spendingTrend: "increasing" | "stable" | "decreasing";
  logCount: number;
  confidence: number;
  age?: number;
  hasTermInsurance?: boolean;
  hasHealthInsurance?: boolean;
  existingSIPs?: Array<{ fund: string; amount: number }>;
  taxRegime?: "old" | "new";
  // ── NEW: concrete wealth goals for goal-based spend planning ────
  // Directly addresses Mr. Gopalan's request: "based on income data,
  // recommend spend to achieve goal of buying home or dream car"
  wealthGoals?: Array<{
    goalType: "home" | "car" | "education" | "wedding" | "emergency_fund" | "retirement" | "other";
    goalLabel: string;          // e.g. "Buy a 3BHK in Hyderabad", "Mahindra Thar"
    targetAmount: number;       // total cost in INR
    downPaymentPercent?: number; // e.g. 20 for 20% down (rest via loan)
    targetYear?: number;        // e.g. 2028
    priority: "high" | "medium" | "low";
    monthsRemaining?: number;
    requiredMonthlySavings?: number;
    actualMonthlySavings?: number;
    deficit?: number;
    deficitText?: string;
  }>;
}

export interface FinanceDomainResponse {
  title: string;
  insight: string;
  recommendation: string;
  confidence: number;
  domainImpact: {
    health:  { score: number; summary: string };
    finance: { score: number; summary: string };
    career:  { score: number; summary: string };
  };
  reasoning: string;
  supportingTrends: string[];
  financialHealthScore: {
    emergencyFundMonths: number;
    debtToIncomeRatio: number;
    savingsRateGrade: "A" | "B" | "C" | "D" | "F";
    fireNumber: number;
    yearsToFIRE: number;
  };
  investmentStrategy: {
    suggestedAllocation: Array<{
      type: string;
      allocation: number;
      riskTolerance: "low" | "medium" | "high";
      monthlyAmount: number;
      specificProduct: string;
    }>;
    rationale: string;
    expectedMonthlyReturn: string;
    riskLevel: "low" | "medium" | "high";
    taxSavingOpportunity: string;
  };
  expenseOptimizations: Array<{
    category: string;
    currentSpend: number;
    suggestedSpend: number;
    savingsPerMonth: number;
    tip: string;
    implementationMethod: string;
  }>;
  creditCardRecommendation: string | null;
  insuranceSuggestions: string[];
  debtStrategy: string | null;
  // ── NEW: goal-by-goal wealth roadmap ──────────────────────────
  // For each wealth goal the user has specified, the AI calculates
  // exactly how much to save/invest per month and what to cut.
  wealthGoalPlan: Array<{
    goalLabel: string;           // e.g. "Buy a 3BHK in Hyderabad"
    goalType: string;
    targetAmount: number;
    downPaymentRequired: number; // what user needs to save before loan
    monthsToGoal: number;        // at current savings rate
    monthsToGoalOptimised: number; // with recommended changes
    requiredMonthlySaving: number; // how much to set aside each month
    currentMonthlySurplus: number; // what is available right now
    gap: number;                 // shortfall per month (0 if achievable)
    // Specific spend changes to close the gap:
    spendingAdjustments: Array<{
      category: string;           // e.g. "food delivery", "subscriptions"
      currentAmount: number;
      recommendedAmount: number;
      monthlySaving: number;
      suggestion: string;         // specific actionable tip
    }>;
    investmentVehicle: string;    // where to park the monthly savings
    loanDetails?: {               // if goal requires a loan (home/car)
      estimatedEMI: number;
      loanAmount: number;
      tenureYears: number;
      eligibilityNote: string;    // based on current income
    };
    milestones: Array<{
      label: string;              // e.g. "Down payment ready"
      targetDate: string;         // e.g. "March 2027"
      amountNeeded: number;
    }>;
    feasibilityVerdict: "achievable" | "achievable_with_cuts" | "needs_income_growth" | "not_feasible";
    oneLineSummary: string;       // e.g. "Save Rs.18,000/month for 28 months — cut food delivery by Rs.3,000 to close the gap."
  }>;
}

const FINANCE_PERSONA = `
You are Priya Nair (virtual persona) - Syntra's Financial Intelligence Engine.
Your analytical framework:
- Indian personal finance: SEBI-regulated instruments, 80C/80D tax optimisation, CIBIL scoring
- Behavioural finance: mental accounting bias, loss aversion in spending, present bias in savings
- Portfolio theory: FD + ELSS + index funds for retail Indian investors
- Debt management: debt avalanche vs snowball, EMI-to-income ratio thresholds
- FIRE movement: adapted for Indian cost-of-living using PPF + NPS + equity

You do not give generic advice.
You never say "consider investing" - you say "allocate rupees X to Y via Z by this date."
Every recommendation cites a specific rupee amount, a specific product name, and a timeline.
`.trim();

const FINANCE_FEW_SHOT = `
CALIBRATION EXAMPLE:

INPUT: Income 75000, savings rate 18%, debt 120000, no insurance, age 26

GOOD output excerpt:
{
  "title": "Insurance Gap is Your Biggest Financial Risk Right Now",
  "insight": "With 1.6x monthly income in debt and zero term or health insurance, a single medical emergency would wipe your entire savings and create a debt spiral. Your 18% savings rate is solid for your age but is being directed at the wrong priority.",
  "recommendation": "This week: buy a 50 lakh term policy at approximately 500 rupees per month via PolicyBazaar and a 5 lakh health floater at approximately 800 rupees per month. This closes your critical risk gap for under 1500 rupees per month."
}

BAD output (never do this):
{
  "title": "Manage Your Finances Better",
  "recommendation": "You should consider getting insurance and saving more money each month."
}
`.trim();

// ── Wealth goal summariser ───────────────────────────────────────
// Pre-calculates basic numbers for each goal so Gemini can reason
// precisely rather than doing arithmetic mid-response.
function summariseWealthGoals(
  goals: FinanceDomainInput["wealthGoals"],
  monthlyIncome: number,
  totalSavings: number,
  totalExpenses: number
): string {
  if (!goals || goals.length === 0) {
    return "No specific wealth goals logged. Provide general wealth-building advice.";
  }

  const disposable = monthlyIncome - totalExpenses;
  const lines = goals.map((g) => {
    const downPayment = g.targetAmount * ((g.downPaymentPercent ?? 20) / 100);
    const alreadySaved = Math.min(totalSavings, downPayment);
    const stillNeeded = Math.max(0, downPayment - alreadySaved);
    const monthsAtCurrentRate = disposable > 0 ? Math.ceil(stillNeeded / disposable) : 999;
    const yearsToGoal = g.targetYear ? g.targetYear - new Date().getFullYear() : null;
    const requiredMonthly = yearsToGoal && yearsToGoal > 0
      ? Math.ceil(stillNeeded / (yearsToGoal * 12))
      : null;

    // Use pre-computed calculations if available from the backend math helper
    const monthsRemaining = g.monthsRemaining ?? (yearsToGoal ? yearsToGoal * 12 : 24);
    const reqSavings = g.requiredMonthlySavings ?? requiredMonthly;
    const actualMonthlySavings = g.actualMonthlySavings ?? disposable;
    const deficitText = g.deficitText ?? (reqSavings && actualMonthlySavings < reqSavings ? `User is Rs. ${Math.max(0, reqSavings - actualMonthlySavings).toLocaleString("en-IN")} short` : "User is on track");

    return [
      `GOAL: "${g.goalLabel}" (${g.goalType}, priority: ${g.priority})`,
      `  Total Cost: Rs.${g.targetAmount.toLocaleString("en-IN")}`,
      `  Down Payment Needed (${g.downPaymentPercent ?? 20}%): Rs.${Math.round(downPayment).toLocaleString("en-IN")}`,
      `  Already Saved: Rs.${Math.round(alreadySaved).toLocaleString("en-IN")}`,
      `  Still Needed for Down Payment: Rs.${Math.round(stillNeeded).toLocaleString("en-IN")}`,
      `  Months Remaining to Target: ${monthsRemaining} months`,
      `  Required Monthly Savings (Down Payment Needed / Months Remaining): Rs.${reqSavings?.toLocaleString("en-IN")}/month`,
      `  Actual Monthly Savings Surplus: Rs.${actualMonthlySavings.toLocaleString("en-IN")}/month`,
      `  Pre-calculated Savings Deficit: ${deficitText}`,
      `  At current monthly surplus (Rs.${disposable.toLocaleString("en-IN")}): ${monthsAtCurrentRate} months`,
      yearsToGoal !== null
        ? `  Target Year: ${g.targetYear} (${yearsToGoal} years away)`
        : "  No target year set",
    ].join("\n");
  });

  return lines.join("\n\n");
}

export function buildFinancePrompt(input: FinanceDomainInput): string {
  const totalExpenses = Object.values(input.monthlyExpenses).reduce((a, b) => a + b, 0);
  const disposable = input.monthlyIncome - totalExpenses;
  const emergencyFundMonths = +(input.totalSavings / Math.max(totalExpenses, 1)).toFixed(1);
  const dtiRatio = +(input.totalDebt / Math.max(input.monthlyIncome, 1)).toFixed(1);
  const fireNumber = totalExpenses * 12 * 25;
  const topExpenses = Object.entries(input.monthlyExpenses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([k, v]) => `${k}: Rs.${v}`)
    .join(", ");

  const cot = chainOfThought([
    "Calculate emergency fund months, debt-to-income ratio, and FIRE number from the raw data",
    "Check insurance gaps first - term life and health insurance are the number one financial risk for Indians under 35",
    "If debt exceeds 2x monthly income: prioritise debt avalanche before any investment recommendation",
    "Apply 50-30-20 rule analysis to identify if needs/wants/savings are in healthy proportions",
    "WEALTH GOAL ANALYSIS: For each goal in wealthGoals, calculate the required monthly saving, identify the gap vs current surplus, and name the specific expense categories to cut to close that gap",
    "Design investment allocation with specific Indian product names: ELSS fund names, specific index funds, PPF",
    "Calculate tax saving opportunity under 80C (1.5L limit) and 80D (health insurance premiums)",
    "Run self-critique: are all rupee amounts realistic? Are product names real Indian financial products? Does each wealth goal plan include a specific monthly savings number?",
  ]);

  return `
${FINANCE_PERSONA}

${cot}

USER FINANCIAL DATA:
Monthly Income: Rs.${input.monthlyIncome}
Total Monthly Expenses: Rs.${totalExpenses} | Disposable: Rs.${disposable}
Top Expense Categories: ${topExpenses}
Savings Rate: ${input.currentSavingsRate}%
Total Savings: Rs.${input.totalSavings} (~${emergencyFundMonths} months expenses)
Total Debt: Rs.${input.totalDebt} (${dtiRatio}x monthly income)
CIBIL Score: ${input.creditScore ?? "not provided"}
Spending Trend: ${input.spendingTrend}
Goals: ${input.financialGoals.join(", ")}
Term Insurance: ${input.hasTermInsurance ? "YES" : "NO - CRITICAL GAP"}
Health Insurance: ${input.hasHealthInsurance ? "YES" : "NO - CRITICAL GAP"}
Existing SIPs: ${input.existingSIPs?.map(s => `${s.fund} Rs.${s.amount}`).join(", ") || "none"}
Age: ${input.age ?? "not provided"}
Data Points: ${input.logCount} | Confidence Ceiling: ${input.confidence}%

━━━ WEALTH GOALS — GOAL-BASED SPEND PLANNING ━━━
${summariseWealthGoals(input.wealthGoals, input.monthlyIncome, input.totalSavings, totalExpenses)}

WEALTH GOAL ANALYSIS INSTRUCTIONS:
For EACH goal above, calculate:
1. Exactly how much the user needs to save per month to hit the down payment by their target date
2. Whether the current monthly surplus covers this — if not, identify the SPECIFIC expense categories to cut
3. Which savings vehicle to use (liquid fund for <3 years, equity SIP for >3 years)
4. If it's a home or car goal: estimate the loan EMI they'll face after the down payment
5. Break the path into 2-3 concrete milestones with dates and amounts
6. Give a one-line verdict: can they achieve this goal at current income? What is the single biggest lever?

Example of the specificity required:
"To buy a Mahindra Thar (Rs.17L) in 2 years: save Rs.8,500/month in a Zerodha Coin liquid fund.
 Cut Zomato/Swiggy from Rs.4,000 to Rs.1,500/month to close the Rs.2,500 monthly gap.
 By Month 8 you'll have Rs.68,000 — enough for road tax + insurance. By Month 24: full down payment."

PRE-CALCULATED METRICS:
Emergency Fund Coverage: ${emergencyFundMonths} months (target: 6 months minimum)
Debt-to-Income Ratio: ${dtiRatio}x (healthy: under 1x, danger zone: over 3x)
FIRE Number (4% rule): Rs.${fireNumber}

PRIORITY ORDER (always follow this sequence):
1. Close insurance gaps: term life + health cover
2. Emergency fund to 3 months minimum
3. High-interest debt clearance above 12% APR
4. Tax-saving investments: ELSS under 80C up to Rs.1.5L, health insurance under 80D
5. Wealth-building: Nifty 50 index fund, NPS, gold ETF

REAL INDIAN PRODUCTS TO REFERENCE:
Low risk: SBI FD, Post Office MIS, PPF at 7.1% tax-free
Medium risk: HDFC Balanced Advantage Fund, Mirae Asset Hybrid Fund
Higher risk: Nifty 50 Index Fund via Zerodha Coin or Groww, Nifty Next 50
Tax saving: Axis Long Term Equity Fund ELSS, 3 year lock-in, qualifies for 80C
Insurance: Rs.50L term via PolicyBazaar age 26 approximately Rs.500/month, Star Health for health cover

${FINANCE_FEW_SHOT}

${ANTI_HALLUCINATION_RULES}

${SELF_CRITIQUE}

RETURN ONLY THIS JSON:
{
  "title": "string - names the most critical financial insight in max 8 words",
  "insight": "string - 2 sentences citing actual rupee amounts and ratios from the data",
  "recommendation": "string - single most urgent action with rupee amount, product name, and this-week deadline",
  "confidence": <integer max ${input.confidence}>,
  "domainImpact": {
    "health":  { "score": <-10 to 10>, "summary": "string - financial stress physiological effect" },
    "finance": { "score": <-10 to 10>, "summary": "string - current financial trajectory" },
    "career":  { "score": <-10 to 10>, "summary": "string - how financial security affects career risk-taking capacity" }
  },
  "reasoning": "string - causal chain with specific numbers from the data",
  "supportingTrends": ["data observation 1", "observation 2", "observation 3"],
  "financialHealthScore": {
    "emergencyFundMonths": <number>,
    "debtToIncomeRatio": <number>,
    "savingsRateGrade": "A|B|C|D|F",
    "fireNumber": <number - annual expenses times 25>,
    "yearsToFIRE": <number - rough estimate>
  },
  "investmentStrategy": {
    "suggestedAllocation": [
      { "type": "string", "allocation": <pct>, "riskTolerance": "low|medium|high", "monthlyAmount": <INR>, "specificProduct": "string - exact fund or product name" }
    ],
    "rationale": "string - why this allocation for this specific user",
    "expectedMonthlyReturn": "Rs.X,XXX to Rs.X,XXX",
    "riskLevel": "low|medium|high",
    "taxSavingOpportunity": "string - specific 80C or 80D opportunity with rupee amount"
  },
  "expenseOptimizations": [
    {
      "category": "string",
      "currentSpend": <INR>,
      "suggestedSpend": <INR>,
      "savingsPerMonth": <INR>,
      "tip": "string - specific reduction strategy",
      "implementationMethod": "string - exact how-to with specific product or service names"
    }
  ],
  "creditCardRecommendation": "string - specific card name and benefit relevant to spending pattern, or null",
  "insuranceSuggestions": ["string - specific product, cover amount, estimated premium, and where to buy"],
  "debtStrategy": "string - avalanche or snowball with specific order and monthly allocation, or null if debt is under 0.5x income",
  "wealthGoalPlan": [
    {
      "goalLabel": "string - e.g. Buy a 3BHK in Hyderabad",
      "goalType": "string",
      "targetAmount": <number>,
      "downPaymentRequired": <number>,
      "monthsToGoal": <number - at current savings rate>,
      "monthsToGoalOptimised": <number - with recommended spending cuts>,
      "requiredMonthlySaving": <number - INR per month needed>,
      "currentMonthlySurplus": <number - what is available now>,
      "gap": <number - monthly shortfall, 0 if achievable>,
      "spendingAdjustments": [
        {
          "category": "string - e.g. Food Delivery",
          "currentAmount": <INR>,
          "recommendedAmount": <INR>,
          "monthlySaving": <INR>,
          "suggestion": "string - specific actionable tip with product/service name"
        }
      ],
      "investmentVehicle": "string - specific fund/product to park the monthly savings",
      "loanDetails": {
        "estimatedEMI": <INR per month>,
        "loanAmount": <INR>,
        "tenureYears": <number>,
        "eligibilityNote": "string - based on their income whether they qualify"
      },
      "milestones": [
        { "label": "string", "targetDate": "string - e.g. March 2027", "amountNeeded": <INR> }
      ],
      "feasibilityVerdict": "achievable|achievable_with_cuts|needs_income_growth|not_feasible",
      "oneLineSummary": "string - the whole plan in one specific sentence with rupee amounts and timeline"
    }
  ]
}
`.trim();
}

export async function generateFinanceAnalysis(input: FinanceDomainInput): Promise<FinanceDomainResponse> {
  // Sanitize user-controlled goal labels before they enter the prompt
  const safeInput: FinanceDomainInput = {
    ...input,
    wealthGoals: input.wealthGoals?.map(g => ({
      ...g,
      goalLabel: sanitizeForPrompt(g.goalLabel, 60),
    })),
  };
  const raw = await callGemini<unknown>(buildFinancePrompt(safeInput), {
    temperature: 0.25,
    maxTokens: 2500,
  });
  const check = DomainBaseSchema.safeParse(raw);
  if (!check.success) {
    console.warn("[Finance] Zod failed:", check.error.issues.map(e => `${e.path}: ${e.message}`).join("; "));
  }
  return raw as FinanceDomainResponse;
}

// ================================================================
// CAREER DOMAIN PROMPT
// ================================================================

export interface CareerDomainInput {
  currentRole: string;
  yearsOfExperience: number;
  technicalSkills: string[];
  weeklyStudyHours: number;
  studyConsistency: "consistent" | "irregular" | "very_irregular";
  currentCourses: string[];
  careerGoals: string[];
  targetSkills: string[];
  projectsCompleted: number;
  portfolioStrength: "weak" | "moderate" | "strong";
  logCount: number;
  confidence: number;
  currentSalary?: number;
  targetSalary?: number;
  targetCompanyTier?: "tier1_product" | "tier2_service" | "startup" | "faang";
  leetcodeStats?: { easy: number; medium: number; hard: number };
  githubContributions?: number;
  softSkills?: string[];
}

export interface CareerDomainResponse {
  title: string;
  insight: string;
  recommendation: string;
  confidence: number;
  domainImpact: {
    health:  { score: number; summary: string };
    finance: { score: number; summary: string };
    career:  { score: number; summary: string };
  };
  reasoning: string;
  supportingTrends: string[];
  careerReadinessScore: {
    technicalReadiness: number;
    portfolioReadiness: number;
    consistencyScore: number;
    estimatedTimeToGoal: string;
    salaryGrowthPotential: string;
  };
  skillGapAnalysis: Array<{
    skill: string;
    currentLevel: "none" | "beginner" | "intermediate" | "advanced";
    requiredLevel: "beginner" | "intermediate" | "advanced" | "expert";
    priority: "low" | "medium" | "high" | "critical";
    paretoImpact: string;
    suggestedResource: string;
    estimatedHoursToLevel: number;
  }>;
  learningPath: {
    phases: Array<{
      week: string;
      focus: string;
      dailyTimeCommitment: string;
      resources: string[];
      milestoneGoal: string;
      checkpointTest: string;
    }>;
    totalTimelineWeeks: number;
    estimatedOutcome: string;
    consistencyRequirement: string;
  };
  portfolioProjects: Array<{
    title: string;
    description: string;
    techStack: string[];
    skillsTargeted: string[];
    estimatedDays: number;
    impact: string;
    hiringSignal: string;
    githubReadmeStructure: string;
  }>;
  weeklySchedule: {
    studyBlocks: Array<{ day: string; time: string; duration: string; focus: string }>;
    consistencyTip: string;
  };
}

const CAREER_PERSONA = `
You are Vikram Anand (virtual persona) - Syntra's Career Intelligence Engine.
Your analytical framework:
- Indian tech hiring: Tier 1 product company hiring bar (Flipkart, Razorpay, CRED, Meesho)
- Pareto skill analysis: identify the 20% of skills that unlock 80% of target role opportunities
- T-shaped skill architecture: one deep expertise plus broad adjacent knowledge
- Study science: spaced repetition, Feynman technique, Pomodoro for deep work
- Portfolio signals: what GitHub activity and project complexity signal to recruiters in 2025

You do not say "learn React" - you say "Complete Udemy React 18 course by Maximilian Schwarzmuller Sections 1 to 12 over 3 weeks at 1.5 hours per day. Build a CRUD app with auth by Week 3."
Everything is specific, sequenced, and time-bound.
`.trim();

const CAREER_FEW_SHOT = `
CALIBRATION EXAMPLE:

INPUT: Junior Frontend Dev, 1.5yr, skills React+JS, study 4h/week irregular, 2 projects weak portfolio

GOOD skillGapAnalysis item:
{
  "skill": "TypeScript",
  "currentLevel": "none",
  "requiredLevel": "intermediate",
  "priority": "critical",
  "paretoImpact": "TypeScript appears in 78% of Tier 1 Indian frontend job postings - without it you are filtered before human review.",
  "suggestedResource": "TypeScript Handbook at typescriptlang.org plus Matt Pocock Total TypeScript free workshops",
  "estimatedHoursToLevel": 40
}

GOOD portfolioProject item:
{
  "title": "Real-Time Expense Tracker with AI Categorisation",
  "description": "A full-stack app that auto-categorises bank transactions using a classifier, shows spending trends, and sends weekly budget alerts via email.",
  "techStack": ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "OpenAI API"],
  "hiringSignal": "Shows product thinking not just code execution. The AI categorisation shows you can integrate external APIs which is a key 2025 hiring signal at product companies.",
  "githubReadmeStructure": "Lead with a live demo GIF then: Problem solved, Solution approach, Tech stack, Local setup steps, API documentation. Pin this repo."
}
`.trim();

export function buildCareerPrompt(input: CareerDomainInput): string {
  const consistencyMultiplier = input.studyConsistency === "very_irregular" ? 0.4
    : input.studyConsistency === "irregular" ? 0.65 : 1.0;
  const effectiveWeeklyHours = +(input.weeklyStudyHours * consistencyMultiplier).toFixed(1);

  const leetcodeNote = input.leetcodeStats
    ? `LeetCode: ${input.leetcodeStats.easy} easy, ${input.leetcodeStats.medium} medium, ${input.leetcodeStats.hard} hard`
    : "LeetCode: not tracked";

  const cot = chainOfThought([
    "Apply Pareto analysis: which 2-3 skills from targetSkills appear most in Tier 1 Indian tech job postings? Mark these as critical priority.",
    "Calculate effective study hours using consistency multiplier and assess whether the user is on track for their goal timeline",
    "Assess portfolio gap: what is a recruiter missing when they look at this profile? GitHub activity, deployed projects, README quality",
    "If studyConsistency is irregular: design schedule around habit-stacking and attach study to existing daily anchors",
    "Design portfolio projects that demonstrate product thinking not just technical ability",
    "Run self-critique: are all resource names real platforms? Are time estimates realistic for the given study hours per week?",
  ]);

  return `
${CAREER_PERSONA}

${cot}

USER CAREER DATA:
Role: ${input.currentRole} (${input.yearsOfExperience} years experience)
Current Technical Skills: ${input.technicalSkills.join(", ") || "none logged"}
Soft Skills: ${input.softSkills?.join(", ") || "not logged"}
Weekly Study: ${input.weeklyStudyHours}h raw, ~${effectiveWeeklyHours}h effective (after consistency adjustment)
Study Consistency: ${input.studyConsistency}
Current Courses: ${input.currentCourses.join(", ") || "none"}
Career Goals: ${input.careerGoals.join(", ")}
Target Skills: ${input.targetSkills.join(", ")}
Portfolio: ${input.projectsCompleted} projects (strength: ${input.portfolioStrength})
Target Company Tier: ${input.targetCompanyTier ?? "not specified"}
${leetcodeNote}
GitHub 30-day contributions: ${input.githubContributions ?? "not tracked"}
Data Points: ${input.logCount} | Confidence Ceiling: ${input.confidence}%

INDIAN TECH MARKET CONTEXT 2025:
Tier 1 product companies (Razorpay, CRED, Meesho, Zepto, PhonePe) require:
  Frontend: TypeScript mandatory, React 18+, system design basics, strong GitHub
  Backend: Go or Node.js, PostgreSQL, Redis, Docker, AWS basics
  DSA bar: 50+ medium LeetCode for Tier 1, 20+ for Tier 2

PARETO RULE: 2-3 skills typically unlock 70-80% of target role postings. Find these first.

PORTFOLIO SIGNAL HIERARCHY (2025):
1. Live deployed URL - non-negotiable
2. Solves a real problem - not todo app or weather app
3. Has database plus authentication - shows full-stack awareness
4. README with demo GIF and clear problem statement
5. Clean git commit history - shows professional habits

${CAREER_FEW_SHOT}

${ANTI_HALLUCINATION_RULES}

${SELF_CRITIQUE}

RETURN ONLY THIS JSON:
{
  "title": "string - names the critical career bottleneck in max 8 words",
  "insight": "string - 2 sentences citing specific data points including hours and skills",
  "recommendation": "string - single highest-leverage action with specific resource name and 2-week deadline",
  "confidence": <integer max ${input.confidence}>,
  "domainImpact": {
    "health":  { "score": <-10 to 10>, "summary": "string - career pressure effect on stress and sleep" },
    "finance": { "score": <-10 to 10>, "summary": "string - projected salary growth from this skill trajectory" },
    "career":  { "score": <-10 to 10>, "summary": "string - current trajectory vs goal gap assessment" }
  },
  "reasoning": "string - Pareto analysis result and time-to-goal calculation with specific numbers",
  "supportingTrends": ["data observation 1", "observation 2", "observation 3"],
  "careerReadinessScore": {
    "technicalReadiness": <0-100>,
    "portfolioReadiness": <0-100>,
    "consistencyScore": <0-100>,
    "estimatedTimeToGoal": "string - e.g. 8-12 months at current pace, 5-6 months if consistency improves",
    "salaryGrowthPotential": "string - estimated percentage or rupee increase achievable in 18 months"
  },
  "skillGapAnalysis": [
    {
      "skill": "string",
      "currentLevel": "none|beginner|intermediate|advanced",
      "requiredLevel": "beginner|intermediate|advanced|expert",
      "priority": "low|medium|high|critical",
      "paretoImpact": "string - percentage of target role postings this skill appears in",
      "suggestedResource": "string - specific platform and exact course or resource name",
      "estimatedHoursToLevel": <number>
    }
  ],
  "learningPath": {
    "phases": [
      {
        "week": "string - e.g. Week 1-2",
        "focus": "string - specific skill or topic",
        "dailyTimeCommitment": "string - e.g. 1.5h per day",
        "resources": ["string - specific resource name and platform"],
        "milestoneGoal": "string - measurable output by end of phase",
        "checkpointTest": "string - how to verify achievement e.g. build X from scratch without docs"
      }
    ],
    "totalTimelineWeeks": <number>,
    "estimatedOutcome": "string - what the user can claim and do after completing this path",
    "consistencyRequirement": "string - minimum weekly hours needed to hit this timeline"
  },
  "portfolioProjects": [
    {
      "title": "string - specific project name",
      "description": "string - what it does and why it is non-trivial",
      "techStack": ["string"],
      "skillsTargeted": ["string"],
      "estimatedDays": <number>,
      "impact": "string - which skills it demonstrates to a recruiter",
      "hiringSignal": "string - exactly why a Tier 1 hiring manager would notice this project",
      "githubReadmeStructure": "string - what the README must include to maximise recruiter signal"
    }
  ],
  "weeklySchedule": {
    "studyBlocks": [
      { "day": "string", "time": "string - e.g. 9:00 to 10:30pm", "duration": "string", "focus": "string" }
    ],
    "consistencyTip": "string - one behavioural science technique to maintain this schedule"
  }
}
`.trim();
}

export async function generateCareerAnalysis(input: CareerDomainInput): Promise<CareerDomainResponse> {
  // Sanitize user-controlled text fields before they enter the prompt
  const safeInput: CareerDomainInput = {
    ...input,
    currentRole:    sanitizeForPrompt(input.currentRole, 80),
    careerGoals:    input.careerGoals.map(g => sanitizeForPrompt(g, 80)),
    targetSkills:   input.targetSkills.map(s => sanitizeForPrompt(s, 60)),
    currentCourses: input.currentCourses.map(c => sanitizeForPrompt(c, 60)),
  };
  const raw = await callGemini<unknown>(buildCareerPrompt(safeInput), {
    temperature: 0.35,
    maxTokens: 2500,
  });
  const check = DomainBaseSchema.safeParse(raw);
  if (!check.success) {
    console.warn("[Career] Zod failed:", check.error.issues.map(e => `${e.path}: ${e.message}`).join("; "));
  }
  return raw as CareerDomainResponse;
}