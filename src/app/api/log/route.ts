import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getSession } from "@/lib/auth"; 
import { connectDB } from "@/lib/mongodb"; 
import User from "@/models/User";
import Log from "@/models/Log"; 
import { 
  calculateHealthScore, 
  calculateFinanceScore, 
  calculateCareerScore, 
  calculateEarnedXP 
} from "@/lib/scoring";
import { IngestionSchema } from "@/lib/validators";
import { generateAndStoreSnapshot } from "@/lib/snapshotService";
import { apiHandler } from "@/lib/apiHandler";
import { ApiError } from "@/lib/apiError";


export const POST = apiHandler(async (req: Request) => {
  // 1. SECURE VAULT
  const session = await getSession();
  if (!session || !session.user?.email) {
    throw new ApiError(401, "Unauthorized access");
  }

  // 2. ZOD VALIDATION (Moved safely inside the execution context)
  const body = await req.json();
  const result = IngestionSchema.safeParse(body);

  if (!result.success) {
    // Zod caught bad data (e.g., strings instead of numbers)
    throw new ApiError(400, "Invalid data format detected by Syntra Core.", result.error.format());
  }
  
  // Zod guarantees these variables are perfectly typed
  const { domain, data } = result.data; 

  if (domain === "finance") {
    (data as any).spendingTime = new Date().getHours();
  }

  // 3. CONNECT TO DB
  await connectDB();
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    throw new ApiError(404, "Twin architecture not found.");
  }

  // 4. CREATE STANDALONE LOG
  await Log.create({
    userId: user._id,
    domain: domain,
    domainData: data
  });

  // 5. DOMAIN LOGIC (Exponential Trailing Moving Average)
  const smoothingFactor = 0.25;

  switch (domain) {
    case "health": {
      const newScore = calculateHealthScore(data.sleepHours, data.workoutMinutes, data.stressLevel, data.waterGlasses);
      user.scores.health = Math.round((user.scores.health * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      break;
    }
    case "finance": {
      const newScore = calculateFinanceScore(data.amountSaved, data.discretionarySpent, data.impulseSpend);
      user.scores.finance = Math.round((user.scores.finance * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      break;
    }
    case "career": {
      const newScore = calculateCareerScore(data.hoursStudied, data.productivityRating);
      user.scores.career = Math.round((user.scores.career * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      break;
    }
  }

  // 6. GAMIFICATION UPDATES
  const updatedScore = domain === "health" ? user.scores.health : domain === "finance" ? user.scores.finance : user.scores.career;
  user.gamification.totalPoints += calculateEarnedXP(updatedScore);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastLog = user.gamification.lastLogDate 
    ? new Date(user.gamification.lastLogDate) 
    : null;

  if (lastLog) lastLog.setHours(0, 0, 0, 0);

  const todayStr = today.toDateString();
  const lastLogStr = lastLog?.toDateString();

  if (lastLogStr !== todayStr) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // If last log was yesterday, increment. Otherwise, reset to 1.
    user.gamification.currentStreak = 
      lastLogStr === yesterday.toDateString() 
        ? user.gamification.currentStreak + 1 
        : 1;
        
    user.gamification.lastLogDate = new Date();
  }

  // 6.5 CHECK AND AWARD BADGES (The Gamification Engine)
  const newBadges: string[] = [];
  const currentBadges = user.badges || [];

  if (user.gamification.currentStreak >= 7 && !currentBadges.includes("Week Warrior")) {
    newBadges.push("Week Warrior");
  }
  if (user.gamification.currentStreak >= 30 && !currentBadges.includes("Month Master")) {
    newBadges.push("Month Master");
  }
  if (user.gamification.totalPoints >= 500 && !currentBadges.includes("Rising Twin")) {
    newBadges.push("Rising Twin");
  }
  if (domain === "finance" && user.scores.finance >= 80 && !currentBadges.includes("Savings Streak")) {
    newBadges.push("Savings Streak");
  }
  if (domain === "career" && user.scores.career >= 80 && !currentBadges.includes("Learning Machine")) {
    newBadges.push("Learning Machine");
  }

  if (newBadges.length > 0) {
    user.badges.push(...newBadges);
  }
  


  // 7. SAVE USER STATE
  await user.save();

  // 7.5 Trigger asynchronous background AI snapshot pre-generation wrapped in waitUntil
  waitUntil(
    generateAndStoreSnapshot(user._id.toString()).catch(err => {
      console.error("[CRITICAL] Background Snapshot Failed:", err);
    })
  );

  // 8. FRONTEND-FRIENDLY RESPONSE
  return NextResponse.json({ 
    success: true, 
    message: `Successfully updated ${domain}!`,
    state: {
      scores: user.scores,
      gamification: user.gamification
    }
  }, { status: 200 });
});