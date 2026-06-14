// src/app/api/ai/widgets/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import AssetLiability from "@/models/AssetLiability";
import { buildTwinContext } from "@/lib/aiContextBuilder";
import { generateDomainWidgets } from "@/lib/prompts/aitwinReflection";
import { preComputeWealthGoals } from "@/lib/financeMath";
import { rl } from "@/lib/rateLimit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized neural link." }, { status: 401 });
    }

    const limit = rl.aiDomain(session.user.id ?? session.user.email);
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

    // Inject wealth goals into twinContext
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

    // Compute health gaps
    const historicalNutrientGaps: string[] = ["Vitamin A deficit", "Low protein"];
    if (twinContext.weeklyAverages.sleep < 6.5) {
      historicalNutrientGaps.push("Severe sleep debt (under 6.5h average)");
    }
    if (twinContext.weeklyAverages.calorieAdherence < 45) {
      historicalNutrientGaps.push("Calorie target misalignment");
    }
    (twinContext as any).health = { historicalNutrientGaps };

    // Cache logic: check if cached widgets exist and are under 7 days old
    const cachedWidgets = user.aiSnapshot?.domainWidgets;
    const widgetsGeneratedAt = user.aiSnapshot?.widgetsGeneratedAt;
    
    const hasValidCache =
      cachedWidgets &&
      widgetsGeneratedAt &&
      (Date.now() - new Date(widgetsGeneratedAt).getTime() < 7 * 24 * 60 * 60 * 1000);

    // Also invalidate if any logs are newer than widgets cache
    let isCacheStale = !hasValidCache;
    if (hasValidCache && widgetsGeneratedAt) {
      const widgetCacheTime = new Date(widgetsGeneratedAt).getTime();
      isCacheStale = recentLogs.some((log) => {
        const logTime = log.date ? new Date(log.date).getTime() : 0;
        const createdTime = (log as any).createdAt ? new Date((log as any).createdAt).getTime() : 0;
        return logTime > widgetCacheTime || createdTime > widgetCacheTime;
      });
    }

    if (hasValidCache && !isCacheStale) {
      return NextResponse.json(
        {
          success: true,
          widgets: cachedWidgets,
        },
        {
          status: 200,
          headers: { "Cache-Control": "private, s-maxage=600, stale-while-revalidate=1200" },
        }
      );
    }

    // Call Tier B generator
    const portfolio = await AssetLiability.findOne({ userId: user._id }).lean();
    const familyOutflows = (portfolio as any)?.familyOutflows || null;

    const widgetsResponse = await generateDomainWidgets(
      twinContext,
      {
        health: user.scores.health,
        finance: user.scores.finance,
        career: user.scores.career,
      },
      user.personalMission || "Achieve Personal Optimization",
      user.healthConstraints || "none",
      user.relations,
      user.supportNetwork,
      familyOutflows
    );

    if (!widgetsResponse || !widgetsResponse.domainWidgets) {
      throw new Error("Gemini returned invalid widgets structure.");
    }

    // Cache the widgets response
    if (!user.aiSnapshot) {
      user.aiSnapshot = {
        dailyReflection: null,
        lastGeneratedAt: null,
      };
    }
    user.aiSnapshot.domainWidgets = widgetsResponse.domainWidgets;
    user.aiSnapshot.widgetsGeneratedAt = new Date();
    await user.save();

    return NextResponse.json(
      {
        success: true,
        widgets: widgetsResponse.domainWidgets,
      },
      {
        status: 200,
        headers: { "Cache-Control": "private, s-maxage=600, stale-while-revalidate=1200" },
      }
    );

  } catch (error: any) {
    console.error("WIDGETS GENERATION ERROR:", error);
    return NextResponse.json({
      success: false,
      widgets: {
        health: { todaysMealPlan: [] },
        finance: { smartMoneyChecklist: [] },
        career: { paretoSkills: [], studyBlocks: [] },
      },
    }, { status: 200 });
  }
}
