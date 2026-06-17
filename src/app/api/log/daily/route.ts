import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import {
  calculateHealthScore,
  calculateFinanceScore,
  calculateCareerScore,
  calculateEarnedXP,
} from "@/lib/logic/scoring";
import { DailyLogSchema } from "@/lib/validators";
import { generateAndStoreSnapshot } from "@/lib/services/snapshotService";
import { recalculateStreak } from "@/lib/logic/streak";
import { apiHandler } from "@/lib/utils/apiHandler";
import { ApiError } from "@/lib/utils/apiError";


export const POST = apiHandler(async (req: Request) => {
  // 1. AUTHENTICATION
  const session = await getSession();
  if (!session || !session.user?.email) {
    throw new ApiError(401, "Unauthorized access");
  }

  // 2. ZOD VALIDATION — unified schema for all 3 domains + daily note
  const body = await req.json();
  const result = DailyLogSchema.safeParse(body);

  if (!result.success) {
    throw new ApiError(
      400,
      "Invalid data format detected by Syntra Core.",
      result.error.format()
    );
  }

  const { health, finance, career, dailyNote } = result.data;

  // 3. CONNECT TO DB & FIND USER
  await connectDB();
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    throw new ApiError(404, "Twin architecture not found.");
  }

  // 4. AUTO-INJECT SERVER-SIDE FIELDS
  const financeWithTime = { ...finance, spendingTime: new Date().getHours() };

  // 5. CREATE ALL LOG DOCUMENTS
  const logPromises = [
    Log.create({
      userId: user._id,
      domain: "health",
      domainData: health,
    }),
    Log.create({
      userId: user._id,
      domain: "finance",
      domainData: financeWithTime,
    }),
    Log.create({
      userId: user._id,
      domain: "career",
      domainData: career,
    }),
  ];

  // If dailyNote is provided, store it as a "reflection" log
  if (dailyNote && dailyNote.trim().length > 0) {
    logPromises.push(
      Log.create({
        userId: user._id,
        domain: "reflection",
        domainData: { note: dailyNote.trim() },
      })
    );
  }

  await Promise.all(logPromises);

  // 6. SCORE CALCULATIONS (Exponential Trailing Moving Average)
  const smoothingFactor = 0.25;

  const newHealthScore = calculateHealthScore(
    health.sleepHours,
    health.workoutMinutes,
    health.stressLevel,
    health.waterGlasses
  );
  user.scores.health = Math.round(
    user.scores.health * (1 - smoothingFactor) +
      newHealthScore * smoothingFactor
  );

  const newFinanceScore = calculateFinanceScore(
    finance.amountSaved,
    finance.discretionarySpent,
    finance.impulseSpend,
    user.profile?.monthlyIncome,
    user.profile?.monthlyBudget
  );
  user.scores.finance = Math.round(
    user.scores.finance * (1 - smoothingFactor) +
      newFinanceScore * smoothingFactor
  );

  const newCareerScore = calculateCareerScore(
    career.hoursStudied,
    career.productivityRating
  );
  user.scores.career = Math.round(
    user.scores.career * (1 - smoothingFactor) +
      newCareerScore * smoothingFactor
  );

  // 7. GAMIFICATION
  // XP: award based on the average of all 3 domain scores
  const avgScore = Math.round(
    (newHealthScore + newFinanceScore + newCareerScore) / 3
  );
  user.gamification.totalPoints += calculateEarnedXP(avgScore);

  // Recalculate streak
  await recalculateStreak(user);

  // 8. BADGE CHECKS
  const newBadges: string[] = [];
  const currentBadges = user.badges || [];

  if (
    user.gamification.currentStreak >= 7 &&
    !currentBadges.includes("Week Warrior")
  ) {
    newBadges.push("Week Warrior");
  }
  if (
    user.gamification.currentStreak >= 30 &&
    !currentBadges.includes("Month Master")
  ) {
    newBadges.push("Month Master");
  }
  if (
    user.gamification.totalPoints >= 500 &&
    !currentBadges.includes("Rising Twin")
  ) {
    newBadges.push("Rising Twin");
  }
  if (
    user.scores.finance >= 80 &&
    !currentBadges.includes("Savings Streak")
  ) {
    newBadges.push("Savings Streak");
  }
  if (
    user.scores.career >= 80 &&
    !currentBadges.includes("Learning Machine")
  ) {
    newBadges.push("Learning Machine");
  }

  if (newBadges.length > 0) {
    user.badges.push(...newBadges);
  }



  // 9. SAVE USER STATE
  await user.save();

  // 10. TRIGGER SINGLE BACKGROUND AI SNAPSHOT
  // Passing the fully updated user object to the snapshot service to completely prevent serverless read-after-write race conditions.
  waitUntil(
    generateAndStoreSnapshot(user._id.toString(), user, undefined, true).catch((err) => {
      console.error("[CRITICAL] Background Snapshot Failed:", err);
    })
  );

  // 11. RESPONSE
  return NextResponse.json(
    {
      success: true,
      message: "Daily log synced successfully across all domains.",
      state: {
        scores: user.scores,
        gamification: user.gamification,
        newBadges,
        computedScores: {
          health: newHealthScore,
          finance: newFinanceScore,
          career: newCareerScore,
        },
      },
    },
    { status: 200 }
  );
});
