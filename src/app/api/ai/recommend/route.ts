// src/app/api/ai/recommend/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import AssetLiability from "@/models/AssetLiability";
import { buildTwinContext } from "@/lib/services/aiContextBuilder";
import { calculateConfidence } from "@/lib/logic/confidenceScore";
import { generateaitwinReflection } from "@/lib/prompts/aitwinReflection";
import { parseGemini } from "@/lib/services/parseGemini";
import { preComputeWealthGoals } from "@/lib/logic/financeMath";
import { rl } from "@/lib/utils/rateLimit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized neural link." }, { status: 401 });
    }

    const limit = rl.aiRecommend(session.user.id ?? session.user.email);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Retry in ${limit.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "Twin architecture not found." }, { status: 404 });
    }

    const recentLogs = await Log.find({ userId: user._id })
      .sort({ date: -1 })
      .limit(42)
      .lean();

    const twinContext = buildTwinContext(recentLogs, {
      monthlyIncome: user.profile?.monthlyIncome,
      monthlyBudget: user.profile?.monthlyBudget,
    });

    // Parse user's long-term financial targets into strongly-typed wealthGoals
    const wealthGoals = preComputeWealthGoals(
      user.goals,
      user.profile?.monthlyIncome || 50000,
      user.profile?.monthlyBudget || 0,
      twinContext.weeklyAverages.savingsRate
    );

    // Inject wealth goals into twinContext so prompt builder can reference them
    if (wealthGoals.length > 0) {
      const primaryGoal = wealthGoals[0];
      (twinContext.weeklyAverages as any).requiredMonthlySavings = primaryGoal.requiredMonthlySavings;
      (twinContext.weeklyAverages as any).savingsDeficit = primaryGoal.deficit;
      (twinContext.weeklyAverages as any).savingsDeficitText = primaryGoal.deficitText;
    }
    (twinContext as any).finance = {
      wealthGoals,
      requiredMonthlySavings: wealthGoals[0]?.requiredMonthlySavings || 0,
      savingsDeficit: wealthGoals[0]?.deficit || 0,
      savingsDeficitText: wealthGoals[0]?.deficitText || "User is on track",
    };

    // Compute health gaps and inject so prompt builder references them
    const historicalNutrientGaps: string[] = ["Vitamin A deficit", "Low protein"];
    if (twinContext.weeklyAverages.sleep < 6.5) {
      historicalNutrientGaps.push("Severe sleep debt (under 6.5h average)");
    }
    if (twinContext.weeklyAverages.calorieAdherence < 45) {
      historicalNutrientGaps.push("Calorie target misalignment");
    }
    (twinContext as any).health = { historicalNutrientGaps };

    const confidence = calculateConfidence(twinContext.logCount);

    // ── Smart Dynamic AI Snapshot Caching ──
    const cachedReflection = user.aiSnapshot?.dailyReflection as any;
    const hasValidSnapshot =
      cachedReflection &&
      user.aiSnapshot?.lastGeneratedAt &&
      new Date(user.aiSnapshot.lastGeneratedAt).toDateString() === new Date().toDateString();

    let isSnapshotStale = !hasValidSnapshot;
    if (hasValidSnapshot && user.aiSnapshot?.lastGeneratedAt) {
      const snapshotTime = new Date(user.aiSnapshot.lastGeneratedAt).getTime();
      
      // 1. Invalidate if any log was created/dated after the snapshot
      const logStale = recentLogs.some((log) => {
        const logTime = log.date ? new Date(log.date).getTime() : 0;
        const createdTime = (log as any).createdAt ? new Date((log as any).createdAt).getTime() : 0;
        return logTime > snapshotTime || createdTime > snapshotTime;
      });

      // 2. Invalidate if the user profile/goals have been modified since snapshot generation
      const profileStale = user.updatedAt && (new Date(user.updatedAt).getTime() - snapshotTime > 10000);

      isSnapshotStale = logStale || !!profileStale;
    }

    // Deterministic finance data (computed from DB, not AI) — always sent regardless of cache state
    const financePayload = {
      wealthGoals,
      requiredMonthlySavings: wealthGoals[0]?.requiredMonthlySavings || 0,
      savingsDeficit: wealthGoals[0]?.deficit || 0,
      savingsDeficitText: wealthGoals[0]?.deficitText || "User is on track",
    };

    // Serve cached snapshot if fresh and complete
    if (hasValidSnapshot && !isSnapshotStale) {
      return NextResponse.json(
        {
          success: true,
          ai: cachedReflection,
          finance: financePayload,
          health: { historicalNutrientGaps },
        },
        {
          status: 200,
          headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" },
        }
      );
    }

    // Cache is missing, stale — generate fresh AI response
    const portfolio = await AssetLiability.findOne({ userId: user._id }).lean();
    const familyOutflows = (portfolio as any)?.familyOutflows || null;

    const aiResponse = await generateaitwinReflection(
      twinContext,
      {
        health: user.scores.health,
        finance: user.scores.finance,
        career: user.scores.career,
      },
      user.gamification.currentStreak,
      confidence,
      user.personalMission || "Achieve Personal Optimization",
      user.healthConstraints || "none",
      user.relations,
      user.supportNetwork,
      familyOutflows
    );

    if (!aiResponse || !aiResponse.twinPrediction) {
      throw new Error("Gemini returned invalid structure.");
    }

    // Persist the AI snapshot to DB without overwriting widgets
    if (!user.aiSnapshot) {
      user.aiSnapshot = {
        dailyReflection: null,
        lastGeneratedAt: null,
      };
    }
    user.aiSnapshot.dailyReflection = aiResponse;
    user.aiSnapshot.lastGeneratedAt = new Date();
    await user.save();

    return NextResponse.json(
      {
        success: true,
        ai: aiResponse,
        finance: financePayload,
        health: { historicalNutrientGaps },
      },
      {
        status: 200,
        headers: { "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600" },
      }
    );

  } catch (error: any) {
    console.error("GEMINI INTEGRATION ERROR:", error);
    // Fallback: minimal sensible defaults — no hardcoded widget data, empty arrays for AI-driven fields
    return NextResponse.json({
      success: false,
      ai: {
        twinPrediction: "Your Twin is analysing your behavioural patterns. Check back shortly.",
        dailyReflection: "Keep your streak going — consistency is your strongest asset right now.",
        explainability: ["Insufficient data points for full analysis.", "Log more data to improve accuracy."],
        dailyChallenge: "Log all three domains today to unlock your full Twin Reflection.",
        recommendations: {
          health: ["Maintain your current sleep schedule."],
          finance: ["Avoid discretionary spending today."],
          career: ["Complete one focused work session."],
        },
        riskAlerts: [],
        confidence: 0,
        leadIndicator: "Daily Logging",
        primaryRisk: "Insufficient Data",
        domainWidgets: {
          health: { todaysMealPlan: [] },
          finance: { smartMoneyChecklist: [] },
          career: { paretoSkills: [], studyBlocks: [] },
        },
      },
      finance: {
        wealthGoals: [],
        requiredMonthlySavings: 0,
        savingsDeficit: 0,
        savingsDeficitText: "Calibration required.",
      },
      health: { historicalNutrientGaps: [] },
    }, { status: 200 });
  }
}