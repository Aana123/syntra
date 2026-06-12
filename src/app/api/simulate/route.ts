// src/app/api/simulate/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import { runSimulation } from "@/lib/simulator";
import { buildTwinContext } from "@/lib/aiContextBuilder";
import { calculateConfidence } from "@/lib/confidenceScore";
import { generateSimulatorInsight } from "@/lib/prompts/aisimulatorPrompt";
import { 
  preComputeWealthGoals, 
  calculateSIPFutureValue, 
  calculateCreditCardSavings, 
  calculateSIPDelayCost, 
  calculateMortgagePrepayment 
} from "@/lib/financeMath";
import { rl } from "@/lib/rateLimit";
import mongoose from "mongoose";
import { z } from "zod";


const ScenarioSchema = z.object({
  domain: z.enum(["health", "finance", "career"]),
  // Legacy absolute-percent payload
  percentageChange: z.number().optional(),
  // Modern absolute-value payload
  variable:       z.string().max(60).optional(),
  currentValue:   z.number().optional(),
  simulatedValue: z.number().optional(),
  customParams:   z.record(z.string(), z.any()).optional(),
});

// GET handler to fetch and compute baseline values for the simulator UI
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized neural link." }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "Twin architecture not found." }, { status: 404 });
    }



    const recentLogs = await Log.find({
      userId: new mongoose.Types.ObjectId(session.user.id),
    }).sort({ date: -1 }).limit(21).lean();

    const twinContext = buildTwinContext(recentLogs, {
      monthlyIncome: user.profile?.monthlyIncome,
      monthlyBudget: user.profile?.monthlyBudget,
    });

    const careerLogs = recentLogs.filter(l => l.domain === "career");
    const productivityValues = careerLogs
      .map(l => l.domainData?.productivityRating)
      .filter((v): v is number => typeof v === "number");
    const avgProductivity = productivityValues.length
      ? Math.round((productivityValues.reduce((a, b) => a + b, 0) / productivityValues.length) * 10) / 10
      : 7;

    return NextResponse.json({
      success: true,
      scores: {
        health: user.scores.health,
        finance: user.scores.finance,
        career: user.scores.career,
      },
      baselines: {
        sleep_hours: twinContext.weeklyAverages.sleep || 7.5,
        workout_frequency: twinContext.weeklyAverages.workout || 3,
        study_hours: parseFloat((twinContext.weeklyAverages.studyHours / 7).toFixed(1)) || 4,
        focus_rating: avgProductivity,
        savings_rate: twinContext.weeklyAverages.savingsRate || 20,
        monthly_income: user.profile?.monthlyIncome || 50000,
        monthly_budget: user.profile?.monthlyBudget || 40000,
      },
      goals: user.goals || [],
    }, { status: 200 });

  } catch (error: any) {
    console.error("SIMULATOR BASELINES GET ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST handler to execute scenario simulation
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized neural link." }, { status: 401 });
    }

    const limit = rl.simulate(session.user.id ?? session.user.email!);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Retry in ${limit.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const scenarioParsed = ScenarioSchema.safeParse(body?.scenario);
    if (!scenarioParsed.success) {
      return NextResponse.json({ error: "Invalid scenario payload." }, { status: 400 });
    }
    const scenario = scenarioParsed.data;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "Twin architecture not found." }, { status: 404 });
    }



    let percentageChange = 0;
    let variable = "";
    let currentValue = 0;
    let simulatedValue = 0;
    let customMath: any = null;
    let customScenarioDetails = "";

    const customFinanceVars = ["dining_redirect", "credit_card_clearance", "education_sip_delay", "mortgage_prepayment"];

    if (scenario.variable && customFinanceVars.includes(scenario.variable)) {
      variable = scenario.variable;
      currentValue = 50; // Neutral baseline
      simulatedValue = 50; // Will be set contextually
      
      const params = scenario.customParams || {};
      
      if (variable === "dining_redirect") {
        const redirectionAmount = Number(params.redirectionAmount) || 5000;
        const cagr = Number(params.cagr) || 12;
        
        const fv5 = calculateSIPFutureValue(redirectionAmount, cagr, 5);
        const fv15 = calculateSIPFutureValue(redirectionAmount, cagr, 15);
        
        customMath = {
          redirectionAmount,
          cagr,
          fv5: Math.round(fv5),
          invested5: redirectionAmount * 12 * 5,
          interestGained5: Math.round(fv5 - (redirectionAmount * 12 * 5)),
          fv15: Math.round(fv15),
          invested15: redirectionAmount * 12 * 15,
          interestGained15: Math.round(fv15 - (redirectionAmount * 12 * 15)),
        };
        
        customScenarioDetails = `Dining out redirection: Moving ₹${redirectionAmount.toLocaleString("en-IN")}/month from dining out budget to an education fund SIP at ${cagr}% CAGR.
- After 5 years: Accumulates ₹${customMath.fv5.toLocaleString("en-IN")} (Total Invested: ₹${customMath.invested5.toLocaleString("en-IN")}, Interest gained: ₹${customMath.interestGained5.toLocaleString("en-IN")}).
- After 15 years: Accumulates ₹${customMath.fv15.toLocaleString("en-IN")} (Total Invested: ₹${customMath.invested15.toLocaleString("en-IN")}, Interest gained: ₹${customMath.interestGained15.toLocaleString("en-IN")}).`;
        
        percentageChange = 0.25; 
        simulatedValue = 75;
      } else if (variable === "credit_card_clearance") {
        const balance = Number(params.balance) || 48000;
        const apr = Number(params.apr) || 36;
        const amortMonths = Number(params.amortMonths) || 12;
        
        const CCDetails = calculateCreditCardSavings(balance, apr, amortMonths);
        
        customMath = {
          balance,
          apr,
          amortMonths,
          interestSaved: Math.round(CCDetails.interestSaved),
          monthlyPayment: Math.round(CCDetails.monthlyPayment),
          totalPayment: Math.round(CCDetails.totalPayment),
          annualInterestCompounded: Math.round(CCDetails.annualInterestCompounded),
        };
        
        customScenarioDetails = `Debt Prepayment: Paying off ₹${balance.toLocaleString("en-IN")} credit card outstanding immediately (interest rate: ${apr}% APR).
- Interest saved over a ${amortMonths}-month standard repayment schedule: ₹${customMath.interestSaved.toLocaleString("en-IN")} (total payments would have been ₹${customMath.totalPayment.toLocaleString("en-IN")}, monthly EMI of ₹${customMath.monthlyPayment.toLocaleString("en-IN")}).
- Annual compounded interest cost prevented: ₹${customMath.annualInterestCompounded.toLocaleString("en-IN")}/year.`;
        
        percentageChange = 0.35;
        simulatedValue = 85;
      } else if (variable === "education_sip_delay") {
        const sipAmount = Number(params.sipAmount) || 10000;
        const delayYears = Number(params.delayYears) || 2;
        const tenureYears = Number(params.tenureYears) || 15;
        const cagr = Number(params.cagr) || 12;
        
        const delayDetails = calculateSIPDelayCost(sipAmount, delayYears, tenureYears, cagr);
        
        customMath = {
          sipAmount,
          delayYears,
          tenureYears,
          cagr,
          fvToday: Math.round(delayDetails.fvToday),
          fvDelayed: Math.round(delayDetails.fvDelayed),
          costOfDelay: Math.round(delayDetails.costOfDelay),
          requiredSIPDelayed: Math.round(delayDetails.requiredSIPDelayed),
          extraSIPMonthly: Math.round(delayDetails.extraSIPMonthly),
        };
        
        customScenarioDetails = `Compounding Cost of Delay: Starting a ₹${sipAmount.toLocaleString("en-IN")}/month education SIP today at ${cagr}% CAGR for ${tenureYears} years vs starting ${delayYears} years later (resulting in a ${tenureYears - delayYears}-year SIP).
- Corpus if started today: ₹${customMath.fvToday.toLocaleString("en-IN")} (Total Invested: ₹${(sipAmount * 12 * tenureYears).toLocaleString("en-IN")}).
- Corpus if started ${delayYears} years later: ₹${customMath.fvDelayed.toLocaleString("en-IN")} (Total Invested: ₹${(sipAmount * 12 * (tenureYears - delayYears)).toLocaleString("en-IN")}).
- Cost of delay (loss in wealth): ₹${customMath.costOfDelay.toLocaleString("en-IN")}.
- To reach the same ₹${customMath.fvToday.toLocaleString("en-IN")} target in ${tenureYears - delayYears} years, the required SIP increases to ₹${customMath.requiredSIPDelayed.toLocaleString("en-IN")}/month (an extra ₹${customMath.extraSIPMonthly.toLocaleString("en-IN")}/month needed, representing a +${Math.round(customMath.extraSIPMonthly / sipAmount * 100)}% budget commitment).`;
        
        percentageChange = -0.20;
        simulatedValue = 40;
      } else if (variable === "mortgage_prepayment") {
        const outstanding = Number(params.outstanding) || 4000000;
        const annualRate = Number(params.annualRate) || 8.5;
        const remainingYears = Number(params.remainingYears) || 20;
        const prepayment = Number(params.prepayment) || 200000;
        
        const prepayDetails = calculateMortgagePrepayment(outstanding, annualRate, remainingYears, prepayment);
        
        customMath = {
          outstanding,
          annualRate,
          remainingYears,
          prepayment,
          emi: Math.round(prepayDetails.emi),
          tenureReductionMonths: prepayDetails.tenureReductionMonths,
          interestSaved: Math.round(prepayDetails.interestSaved),
          totalWithoutPrepayment: Math.round(prepayDetails.totalWithoutPrepayment),
          totalWithPrepayment: Math.round(prepayDetails.totalWithPrepayment),
        };
        
        customScenarioDetails = `Mortgage Prepayment: Making a partial prepayment of ₹${prepayment.toLocaleString("en-IN")} on a ₹${outstanding.toLocaleString("en-IN")} home loan at ${annualRate}% interest with ${remainingYears} years remaining.
- Tenure reduction: Saves ${customMath.tenureReductionMonths} months (approx ${(customMath.tenureReductionMonths / 12).toFixed(1)} years) off the loan.
- Total interest saved over the lifetime of the loan: ₹${customMath.interestSaved.toLocaleString("en-IN")}.
- Monthly EMI remains unchanged at ₹${customMath.emi.toLocaleString("en-IN")}/month.`;
        
        percentageChange = 0.20;
        simulatedValue = 70;
      }
    } else {
      if (typeof scenario.percentageChange !== "undefined") {
        percentageChange = scenario.percentageChange;
        const variableMap: Record<string, string> = {
          health: "workout_frequency",
          finance: "savings_rate",
          career: "study_hours",
        };
        variable = variableMap[scenario.domain] || "variable";
        currentValue = user.scores[scenario.domain as keyof typeof user.scores] || 50;
        simulatedValue = Math.min(100, Math.round(currentValue * (1 + percentageChange)));
      } else {
        // Modern absolute value payload
        if (scenario.variable === undefined) {
          return NextResponse.json({ error: "Invalid scenario payload." }, { status: 400 });
        }
        variable = scenario.variable;
        currentValue = Number(scenario.currentValue);
        simulatedValue = Number(scenario.simulatedValue);

        if (isNaN(currentValue) || isNaN(simulatedValue)) {
          return NextResponse.json({ error: "Invalid scenario payload." }, { status: 400 });
        }

        percentageChange = currentValue !== 0 ? (simulatedValue - currentValue) / currentValue : 0;
      }
    }

    const simulationResult = runSimulation(
      user.scores.health,
      user.scores.finance,
      user.scores.career,
      { domain: scenario.domain as any, percentageChange }
    );

    const recentLogs = await Log.find({
      userId: new mongoose.Types.ObjectId(session.user.id),
    }).sort({ date: -1 }).limit(21).lean();

    const twinContext = buildTwinContext(recentLogs, {
      monthlyIncome: user.profile?.monthlyIncome,
      monthlyBudget: user.profile?.monthlyBudget,
    });

    const wealthGoals = preComputeWealthGoals(
      user.goals,
      user.profile?.monthlyIncome || 50000,
      user.profile?.monthlyBudget || 0,
      twinContext.weeklyAverages.savingsRate
    );

    (twinContext as any).finance = {
      wealthGoals,
      requiredMonthlySavings: wealthGoals[0]?.requiredMonthlySavings || 0,
      savingsDeficit: wealthGoals[0]?.deficit || 0,
      savingsDeficitText: wealthGoals[0]?.deficitText || "User is on track",
    };

    const confidence = calculateConfidence(twinContext.logCount);
    
    // Find the specific goal for the current domain to return in the POST response
    const domainGoal = user.goals?.find(
      (g: any) => g.domain?.toLowerCase() === scenario.domain?.toLowerCase()
    );

    let aiAnalysis;
    try {
      aiAnalysis = await generateSimulatorInsight(
        {
          domain: scenario.domain as any,
          variable: variable,
          currentValue: currentValue,
          simulatedValue: simulatedValue,
          percentChange: Math.round(percentageChange * 100),
        },
        twinContext,
        {
          health: user.scores.health,
          finance: user.scores.finance,
          career: user.scores.career,
        },
        confidence,
        customScenarioDetails
      );
    } catch (e) {
      aiAnalysis = { scenarioTitle: `${scenario.domain} projection`, primaryOutcome: "Projection calculated.", tradeOffs: [], timelineProjection: [], riskLevel: "medium", recommendedPath: "Continue monitoring.", confidence: 0 };
    }

    return NextResponse.json({
      success: true,
      simulation: simulationResult,
      aiAnalysis,
      goal: domainGoal || null,
      customMath,
    }, { status: 200 });

  } catch (error: any) {
    console.error("SIMULATION POST ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}