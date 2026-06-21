import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import { calculateSyntraCore } from "@/lib/logic/scoring";
import mongoose from "mongoose";
import { ApiError } from "@/lib/utils/apiError";
import { carryForwardGoalTasks } from "@/lib/utils/carryForwardTasks";


/**
 * Service to fetch user stats, decay inactive streaks, and construct the God Payload.
 * All DB interaction and business scoring rules are consolidated here.
 */
export async function getDashboardData(userId: string, email: string) {
  await connectDB();

  // 1. CONCURRENT FETCHING
  // Fetches the User and the 15 most recent logs simultaneously for maximum speed
  const [user, recentLogs] = await Promise.all([
    User.findOne({ email }),
    Log.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ date: -1 })
      .limit(15)
      .lean() // Strips heavy Mongoose metadata to send pure JSON instantly
  ]);

  if (!user) {
    throw new ApiError(404, "Twin architecture not found.");
  }



  // 2. Dynamic Streak Decay Check (Fix Stale Streak Indicator)
  const lastLogDate = user.gamification?.lastLogDate;
  if (lastLogDate && user.gamification.currentStreak > 0) {
    const hoursSinceLastLog = (Date.now() - new Date(lastLogDate).getTime()) / (60 * 60 * 1000);
    if (hoursSinceLastLog > 48) {
      user.gamification.currentStreak = 0;
      await user.save(); // Save decayed streak to the database
    }
  }

  // Carry goal-linked tasks from previous days forward to today (fresh + unchecked)
  await carryForwardGoalTasks(user);

  // 3. Calculate the Global Dashboard Metric
  const syntraCoreScore = calculateSyntraCore(
    user.scores.health, 
    user.scores.finance, 
    user.scores.career
  );

  // 4. Return formatted payload
  return {
    user: {
      name: user.name,
      email: user.email,
      avatarId: user.avatarId,
      age: user.age,
      profile: user.profile,
    },
    // The main Hero widget metric
    syntraCore: syntraCoreScore, 
    
    scorecards: {
      health: user.scores.health,
      finance: user.scores.finance,
      career: user.scores.career,
    },
    gamification: {
      totalPoints: user.gamification.totalPoints,
      currentStreak: user.gamification.currentStreak,
      badges: user.badges || [] // Serving the unlocked badges to the UI
    },
    goals: user.goals,
    dailyTasks: user.dailyTasks || [],
    
    // The standalone logs fetched concurrently
    timeline: recentLogs 
  };
}
