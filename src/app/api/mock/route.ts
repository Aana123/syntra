// src/app/api/mock/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import { generateAndStoreSnapshot } from "@/lib/services/snapshotService";
import { waitUntil } from "@vercel/functions";
import { mockUser, getMockLogs, mockAiReflection } from "@/lib/utils/mockData";
import { 
  calculateHealthScore, 
  calculateFinanceScore, 
  calculateCareerScore, 
  calculateEarnedXP 
} from "@/lib/logic/scoring";


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type")?.toLowerCase();

    if (type === "profile") {
      return NextResponse.json({ success: true, profile: mockUser });
    }

    if (type === "logs") {
      const domain = searchParams.get("domain")?.toLowerCase();
      let logs = getMockLogs();
      if (domain) {
        logs = logs.filter(l => l.domain === domain);
      }
      return NextResponse.json({ success: true, logs });
    }

    if (type === "ai") {
      return NextResponse.json({ success: true, ai: mockAiReflection });
    }

    // Default: Return the entire static mockup dashboard bundle
    return NextResponse.json({
      success: true,
      profile: mockUser,
      logs: getMockLogs(),
      ai: mockAiReflection
    });
  } catch (error: any) {
    console.error("[Mock API GET Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action")?.toLowerCase();
    const source = searchParams.get("source")?.toLowerCase();

    if (action !== "sync") {
      return NextResponse.json({ success: false, error: "Invalid action. Use action=sync." }, { status: 400 });
    }

    if (!source || !["health", "bank", "coursera"].includes(source)) {
      return NextResponse.json(
        { success: false, error: "Invalid sync source. Use health, bank, or coursera." },
        { status: 400 }
      );
    }

    // 1. Authenticate / Identify User
    const session = await getSession();
    let userEmail = session?.user?.email;

    if (!session || !userEmail) {
      return NextResponse.json({ success: false, error: "Unauthorized neural link. Session invalid." }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return NextResponse.json({ success: false, error: "User profile not found in database." }, { status: 404 });
    }



    let logEntry: any = null;
    let message = "";
    const smoothingFactor = 0.25;

    // 2. Ingest dynamic optimal biometric logs based on source trigger
    if (source === "health") {
      logEntry = {
        userId: user._id,
        domain: "health",
        date: new Date(),
        domainData: {
          sleepHours: 8.2,          // Optimal circadian rest
          workoutMinutes: 50,       // Cardio somatic training
          stressLevel: 2,           // Very low stress indicators
          moodScore: 8,             // Elevated serotonin
          energyLevel: 9,           // High peak output
          caloriesConsumed: 2000,
          calorieGoal: 2100,
        }
      };
      
      // Calculate exact score using exponential moving average (EMA)
      const newScore = calculateHealthScore(
        logEntry.domainData.sleepHours,
        logEntry.domainData.workoutMinutes,
        logEntry.domainData.stressLevel
      );
      user.scores.health = Math.round((user.scores.health * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      message = "Synced successfully with Apple Health. Circular rest and somatic activity updated.";

    } else if (source === "bank") {
      logEntry = {
        userId: user._id,
        domain: "finance",
        date: new Date(),
        domainData: {
          amountSaved: 1000,         // Healthy rate of savings
          discretionarySpent: 250,   // Tight discretionary control
          spendingCategory: "investment",
          spendingTime: 12,
        }
      };

      const newScore = calculateFinanceScore(
        logEntry.domainData.amountSaved,
        logEntry.domainData.discretionarySpent,
        undefined,
        user.profile?.monthlyIncome,
        user.profile?.monthlyBudget
      );
      user.scores.finance = Math.round((user.scores.finance * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      message = "Synced successfully with banking API. Daily savings velocity recalculated.";

    } else if (source === "coursera") {
      logEntry = {
        userId: user._id,
        domain: "career",
        date: new Date(),
        domainData: {
          hoursStudied: 3.5,        // Strong focus session
          productivityRating: 9,    // Peak study rating
          sessionsCompleted: 3,
          courseName: "Advanced Neural Networks Course",
        }
      };

      const newScore = calculateCareerScore(
        logEntry.domainData.hoursStudied,
        logEntry.domainData.productivityRating
      );
      user.scores.career = Math.round((user.scores.career * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      message = "Synced successfully with Coursera upskilling tracking. Study velocity integrated.";
    }

    // 3. Save new biometric log to DB
    const createdLog = await Log.create(logEntry);

    // 4. Boost gamification score dynamically using real XP values
    const updatedScore = source === "health" ? user.scores.health : source === "bank" ? user.scores.finance : user.scores.career;
    const xpEarned = calculateEarnedXP(updatedScore);
    user.gamification.totalPoints += xpEarned;
    user.gamification.currentStreak += 1;
    user.gamification.lastLogDate = new Date();



    await user.save();

    // 5. Trigger Digital Twin background recalculation to integrate sync data
    // Passing the fully updated user object to the snapshot service to completely prevent serverless read-after-write race conditions.
    waitUntil(
      generateAndStoreSnapshot(user._id.toString(), user).catch(err => {
        console.error("[Mock API POST Background] Recalibration failed:", err);
      })
    );

    return NextResponse.json({
      success: true,
      message,
      syncSource: source,
      newLog: createdLog,
      userScores: user.scores,
      pointsEarned: xpEarned,
      totalPoints: user.gamification.totalPoints
    }, { status: 201 });

  } catch (error: any) {
    console.error("[Mock API POST Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
