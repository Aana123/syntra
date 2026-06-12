// src/app/api/ai/recommend/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import AssetLiability from "@/models/AssetLiability";
import { buildTwinContext } from "@/lib/aiContextBuilder";
import { calculateConfidence } from "@/lib/confidenceScore";
import { generateaitwinReflection } from "@/lib/prompts/aitwinReflection";
import { parseGemini } from "@/lib/parseGemini";
import { preComputeWealthGoals } from "@/lib/financeMath";
import { rl } from "@/lib/rateLimit";


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

    // Parse user's long-term financial targets into strongly-typed wealthGoals for the Twin Reflection Prompt using the pre-computation helper
    const wealthGoals = preComputeWealthGoals(
      user.goals,
      user.profile?.monthlyIncome || 50000,
      user.profile?.monthlyBudget || 0,
      twinContext.weeklyAverages.savingsRate
    );

    // Determine health nutrient and habit gaps based on average sleep or calorie metrics
    const historicalNutrientGaps = ["Vitamin A deficit", "Low protein"];
    if (twinContext.weeklyAverages.sleep < 6.5) {
      historicalNutrientGaps.push("Severe sleep debt (under 6.5h average)");
    }
    if (twinContext.weeklyAverages.calorieAdherence < 45) {
      historicalNutrientGaps.push("Calorie target misalignment");
    }

    // Inject calculations into twinContext weeklyAverages and finance payload
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
    (twinContext as any).health = { historicalNutrientGaps };

    const confidence = calculateConfidence(twinContext.logCount);

    // ── Smart Dynamic AI Snapshot Caching ──
    const hasValidSnapshot = 
      user.aiSnapshot?.dailyReflection && 
      user.aiSnapshot.lastGeneratedAt &&
      new Date(user.aiSnapshot.lastGeneratedAt).toDateString() === new Date().toDateString();

    let isSnapshotStale = false;
    if (hasValidSnapshot && user.aiSnapshot?.lastGeneratedAt) {
      const snapshotTime = new Date(user.aiSnapshot.lastGeneratedAt).getTime();
      // Invalidate if any biometric log is newer than our snapshot generation time
      isSnapshotStale = recentLogs.some(log => new Date(log.date).getTime() > snapshotTime);
    }

    if (hasValidSnapshot && !isSnapshotStale) {
      return NextResponse.json(
        { success: true, ai: user.aiSnapshot!.dailyReflection },
        { 
          status: 200,
          headers: {
            "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600",
          }
        }
      );
    }

    // Cache is missing or stale — invoke the AI Twin Reflection Core with Personal Mission & Health Constraints
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

    // Persist the pre-generated AI snapshot reflection to DB
    user.aiSnapshot = {
      dailyReflection: aiResponse,
      lastGeneratedAt: new Date(),
    };
    await user.save();

    return NextResponse.json(
      { 
        success: true, 
        ai: aiResponse,
        finance: {
          wealthGoals,
          requiredMonthlySavings: wealthGoals[0]?.requiredMonthlySavings || 0,
          savingsDeficit: wealthGoals[0]?.deficit || 0,
          savingsDeficitText: wealthGoals[0]?.deficitText || "User is on track",
        },
        health: {
          historicalNutrientGaps,
          todaysMealPlan: [
            { meal: "Breakfast", items: "Oats with almonds, banana & flaxseeds", prepTime: "10m", calories: 380, fix: "Iron & Fiber boost" },
            { meal: "Lunch", items: "Brown rice with dal, spinach subji & curd", prepTime: "25m", calories: 550, fix: "Protein + Calcium" },
            { meal: "Evening Snack", items: "Roasted chana with green tea", prepTime: "5m", calories: 150, fix: "Satiety & Energy stability" },
            { meal: "Dinner", items: "Grilled paneer/tofu salad with mixed greens", prepTime: "15m", calories: 420, fix: "Low-carb sleep aid" }
          ]
        },
        career: {
          paretoSkills: [
            { skill: "System Design", priority: "High", hoursRequired: "15h", source: "ByteByteGo" },
            { skill: "DSA & Leetcode", priority: "High", hoursRequired: "20h", source: "Leetcode 150" },
            { skill: "Next.js App Router", priority: "Medium", hoursRequired: "10h", source: "Next.js Dist Docs" }
          ],
          studyBlocks: [
            { day: "Mon-Fri", time: "7:00 AM - 8:30 AM", focus: "DSA Coding Drill" },
            { day: "Tue & Thu", time: "8:00 PM - 9:30 PM", focus: "System Design Review" },
            { day: "Saturday", time: "9:00 AM - 12:00 PM", focus: "Full Platform Build" }
          ]
        }
      },
      { 
        status: 200,
        headers: {
          "Cache-Control": "private, s-maxage=300, stale-while-revalidate=600",
        }
      }
    );

  } catch (error: any) {
    console.error("GEMINI INTEGRATION ERROR:", error);
    return NextResponse.json({
      success: false,
      ai: {
        twinPrediction: "Your Twin is analyzing your behavioral patterns. Check back shortly.",
        dailyReflection: "Keep your streak going — consistency is your strongest asset right now.",
        explainability: ["Insufficient data points for full analysis."],
        dailyChallenge: "Log all three domains today to unlock your full Twin Reflection.",
        recommendations: {
          health: ["Maintain your current sleep schedule."],
          finance: ["Avoid discretionary spending today."],
          career: ["Complete one focused work session."],
        },
        riskAlerts: [],
        confidence: 0,
      },
      finance: {
        wealthGoals: [],
        requiredMonthlySavings: 0,
        savingsDeficit: 0,
        savingsDeficitText: "Calibration required.",
      },
      health: {
        historicalNutrientGaps: [],
        todaysMealPlan: [
          { meal: "Breakfast", items: "Oats with almonds, banana & flaxseeds", prepTime: "10m", calories: 380, fix: "Iron & Fiber boost" },
          { meal: "Lunch", items: "Brown rice with dal, spinach subji & curd", prepTime: "25m", calories: 550, fix: "Protein + Calcium" },
          { meal: "Evening Snack", items: "Roasted chana with green tea", prepTime: "5m", calories: 150, fix: "Satiety & Energy stability" },
          { meal: "Dinner", items: "Grilled paneer/tofu salad with mixed greens", prepTime: "15m", calories: 420, fix: "Low-carb sleep aid" }
        ]
      },
      career: {
        paretoSkills: [
          { skill: "System Design", priority: "High", hoursRequired: "15h", source: "ByteByteGo" },
          { skill: "DSA & Leetcode", priority: "High", hoursRequired: "20h", source: "Leetcode 150" },
          { skill: "Next.js App Router", priority: "Medium", hoursRequired: "10h", source: "Next.js Dist Docs" }
        ],
        studyBlocks: [
          { day: "Mon-Fri", time: "7:00 AM - 8:30 AM", focus: "DSA Coding Drill" },
          { day: "Tue & Thu", time: "8:00 PM - 9:30 PM", focus: "System Design Review" },
          { day: "Saturday", time: "9:00 AM - 12:00 PM", focus: "Full Platform Build" }
        ]
      }
    }, { status: 200 });
  }
}