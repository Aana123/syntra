import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import mongoose from "mongoose";
import {
  calculateHealthScore,
  calculateFinanceScore,
  calculateCareerScore,
  calculateEarnedXP,
} from "@/lib/logic/scoring";
import { recalculateStreak } from "@/lib/logic/streak";

const TARGET_EMAIL = "vikrams22@gmail.com";
const ALPHA = 0.25;

// ─── 21-day data arrays (index 0 = 20 days ago, index 20 = today) ─────────

const HEALTH_DAYS = [
  // Week 1 — low energy / poor habits
  { sleepHours: 5.5, workoutMinutes: 0,  stressLevel: 8, waterGlasses: 4 },
  { sleepHours: 6.0, workoutMinutes: 15, stressLevel: 7, waterGlasses: 5 },
  { sleepHours: 6.5, workoutMinutes: 20, stressLevel: 7, waterGlasses: 5 },
  { sleepHours: 6.0, workoutMinutes: 0,  stressLevel: 8, waterGlasses: 4 },
  { sleepHours: 6.5, workoutMinutes: 30, stressLevel: 6, waterGlasses: 6 },
  { sleepHours: 7.0, workoutMinutes: 30, stressLevel: 5, waterGlasses: 7 },
  { sleepHours: 6.0, workoutMinutes: 15, stressLevel: 7, waterGlasses: 5 },
  // Week 2 — new routine kicks in
  { sleepHours: 7.5, workoutMinutes: 45, stressLevel: 4, waterGlasses: 8 },
  { sleepHours: 8.0, workoutMinutes: 60, stressLevel: 3, waterGlasses: 9 },
  { sleepHours: 7.5, workoutMinutes: 45, stressLevel: 4, waterGlasses: 8 },
  { sleepHours: 8.0, workoutMinutes: 60, stressLevel: 3, waterGlasses: 8 },
  { sleepHours: 7.0, workoutMinutes: 30, stressLevel: 5, waterGlasses: 7 },
  { sleepHours: 8.0, workoutMinutes: 60, stressLevel: 3, waterGlasses: 9 },
  { sleepHours: 7.5, workoutMinutes: 45, stressLevel: 4, waterGlasses: 8 },
  // Week 3 — sick day + recovery + strong finish
  { sleepHours: 5.0, workoutMinutes: 0,  stressLevel: 9, waterGlasses: 3 },
  { sleepHours: 9.0, workoutMinutes: 0,  stressLevel: 5, waterGlasses: 6 },
  { sleepHours: 7.5, workoutMinutes: 30, stressLevel: 5, waterGlasses: 7 },
  { sleepHours: 8.0, workoutMinutes: 45, stressLevel: 4, waterGlasses: 8 },
  { sleepHours: 7.0, workoutMinutes: 60, stressLevel: 4, waterGlasses: 8 },
  { sleepHours: 7.5, workoutMinutes: 60, stressLevel: 3, waterGlasses: 9 },
  { sleepHours: 8.0, workoutMinutes: 60, stressLevel: 3, waterGlasses: 9 },
];

const FINANCE_DAYS = [
  // Week 1 — overspending, two impulse buys
  { amountSaved: 150, discretionarySpent: 900,  impulseSpend: true,  spendingCategory: "dining" },
  { amountSaved: 200, discretionarySpent: 750,  impulseSpend: false, spendingCategory: "groceries" },
  { amountSaved: 200, discretionarySpent: 800,  impulseSpend: false, spendingCategory: "transport" },
  { amountSaved: 100, discretionarySpent: 950,  impulseSpend: true,  spendingCategory: "shopping" },
  { amountSaved: 300, discretionarySpent: 600,  impulseSpend: false, spendingCategory: "groceries" },
  { amountSaved: 400, discretionarySpent: 500,  impulseSpend: false, spendingCategory: "utilities" },
  { amountSaved: 250, discretionarySpent: 700,  impulseSpend: false, spendingCategory: "dining" },
  // Week 2 — disciplined saving
  { amountSaved: 600, discretionarySpent: 400,  impulseSpend: false, spendingCategory: "groceries" },
  { amountSaved: 700, discretionarySpent: 300,  impulseSpend: false, spendingCategory: "transport" },
  { amountSaved: 650, discretionarySpent: 350,  impulseSpend: false, spendingCategory: "groceries" },
  { amountSaved: 800, discretionarySpent: 250,  impulseSpend: false, spendingCategory: "utilities" },
  { amountSaved: 500, discretionarySpent: 450,  impulseSpend: true,  spendingCategory: "shopping" },
  { amountSaved: 700, discretionarySpent: 300,  impulseSpend: false, spendingCategory: "groceries" },
  { amountSaved: 750, discretionarySpent: 280,  impulseSpend: false, spendingCategory: "transport" },
  // Week 3 — bad day, recovery, strong close
  { amountSaved: 0,   discretionarySpent: 1200, impulseSpend: true,  spendingCategory: "shopping" },
  { amountSaved: 100, discretionarySpent: 400,  impulseSpend: false, spendingCategory: "groceries" },
  { amountSaved: 400, discretionarySpent: 500,  impulseSpend: false, spendingCategory: "dining" },
  { amountSaved: 600, discretionarySpent: 350,  impulseSpend: false, spendingCategory: "groceries" },
  { amountSaved: 700, discretionarySpent: 300,  impulseSpend: false, spendingCategory: "utilities" },
  { amountSaved: 750, discretionarySpent: 250,  impulseSpend: false, spendingCategory: "groceries" },
  { amountSaved: 800, discretionarySpent: 200,  impulseSpend: false, spendingCategory: "groceries" },
];

const CAREER_DAYS = [
  // Week 1 — scattered focus
  { hoursStudied: 1.5, productivityRating: 5 },
  { hoursStudied: 2.0, productivityRating: 5 },
  { hoursStudied: 1.5, productivityRating: 4 },
  { hoursStudied: 2.0, productivityRating: 6 },
  { hoursStudied: 2.5, productivityRating: 6 },
  { hoursStudied: 3.0, productivityRating: 7 },
  { hoursStudied: 1.0, productivityRating: 4 },
  // Week 2 — in the zone
  { hoursStudied: 3.5, productivityRating: 7 },
  { hoursStudied: 4.0, productivityRating: 8 },
  { hoursStudied: 3.5, productivityRating: 8 },
  { hoursStudied: 4.0, productivityRating: 9 },
  { hoursStudied: 3.0, productivityRating: 7 },
  { hoursStudied: 4.0, productivityRating: 8 },
  { hoursStudied: 3.5, productivityRating: 8 },
  // Week 3 — sick → recovery → strong finish
  { hoursStudied: 0.0, productivityRating: 3 },
  { hoursStudied: 1.0, productivityRating: 4 },
  { hoursStudied: 2.5, productivityRating: 6 },
  { hoursStudied: 3.5, productivityRating: 7 },
  { hoursStudied: 4.0, productivityRating: 8 },
  { hoursStudied: 4.0, productivityRating: 9 },
  { hoursStudied: 4.0, productivityRating: 9 },
];

// Tasks completed out of 3 per day — drives trajectory chart variation
// Dip → recovery → wobble on sick day → strong close
const TASKS_DONE = [1, 1, 2, 1, 2, 2, 1, 3, 3, 3, 3, 2, 3, 3, 0, 1, 2, 3, 3, 3, 2];

const TASK_TEXTS = [
  "Complete 30-minute workout session",
  "Review spending and update budget tracker",
  "Study core skill for 2 hours",
];

const GOAL_DEFS = [
  { title: "Build Daily Fitness Habit",  domain: "health",   priority: "high"   },
  { title: "Save ₹15,000 This Month",   domain: "finance",  priority: "high"   },
  { title: "Level Up Tech Skills",       domain: "career",   priority: "medium" },
];

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user?.email || session.user.email !== TARGET_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: TARGET_EMAIL });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ── 1. Clean file-uploaded logs ──────────────────────────────────────
    const deleted = await Log.deleteMany({
      userId: user._id,
      fileHash: { $exists: true, $ne: null },
    });

    // ── 2. Delete any prior seeded logs for the last 25 days (clean re-seed) ──
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 25);
    await Log.deleteMany({
      userId: user._id,
      fileHash: { $exists: false },
      date: { $gte: cutoffDate },
    });

    // ── 3. Ensure one goal per domain exists ────────────────────────────
    const goalMap: Record<string, mongoose.Types.ObjectId> = {};
    for (const def of GOAL_DEFS) {
      let goal = user.goals.find((g: any) => g.title === def.title);
      if (!goal) {
        const newGoal = {
          _id: new mongoose.Types.ObjectId(),
          title: def.title,
          domain: def.domain,
          priority: def.priority,
          milestones: [
            { _id: new mongoose.Types.ObjectId(), text: "Start tracking daily", completed: true },
            { _id: new mongoose.Types.ObjectId(), text: "Hit streak of 7 days", completed: false },
          ],
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };
        user.goals.push(newGoal as any);
        goal = newGoal;
      }
      goalMap[def.domain] = goal._id;
    }
    user.markModified("goals");

    // ── 4. Clear daily tasks from the seeded window (prevent dups on re-seed) ──
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 20);
    const windowStartStr = windowStart.toISOString().split("T")[0];
    user.dailyTasks = (user.dailyTasks || []).filter(
      (t: any) => typeof t.date === "string" && t.date < windowStartStr
    );

    // ── 5. Build 21 days of logs + tasks ────────────────────────────────
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const logsToInsert: any[] = [];
    const newTasks: any[] = [];

    let hScore = 50;
    let fScore = 50;
    let cScore = 50;
    let totalXP = 0;

    for (let i = 0; i < 21; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() - (20 - i));
      const dateStr = day.toISOString().split("T")[0];

      const h = HEALTH_DAYS[i];
      const f = FINANCE_DAYS[i];
      const c = CAREER_DAYS[i];

      // Domain logs
      logsToInsert.push({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        date: day,
        domain: "health",
        domainData: {
          sleepHours: h.sleepHours,
          workoutMinutes: h.workoutMinutes,
          stressLevel: h.stressLevel,
          waterGlasses: h.waterGlasses,
          moodScore: Math.round(10 - h.stressLevel + 1),
          energyLevel: Math.round(10 - h.stressLevel),
        },
      });
      logsToInsert.push({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        date: day,
        domain: "finance",
        domainData: {
          amountSaved: f.amountSaved,
          discretionarySpent: f.discretionarySpent,
          impulseSpend: f.impulseSpend,
          spendingCategory: f.spendingCategory,
          biggestExpenseToday: f.spendingCategory,
        },
      });
      logsToInsert.push({
        _id: new mongoose.Types.ObjectId(),
        userId: user._id,
        date: day,
        domain: "career",
        domainData: {
          hoursStudied: c.hoursStudied,
          productivityRating: c.productivityRating,
          goalWorkedOn: "Level Up Tech Skills",
        },
      });

      // ETMA score update
      const rawH = calculateHealthScore(h.sleepHours, h.workoutMinutes, h.stressLevel, h.waterGlasses);
      const rawF = calculateFinanceScore(
        f.amountSaved,
        f.discretionarySpent,
        f.impulseSpend,
        user.profile?.monthlyIncome || 60000,
        user.profile?.monthlyBudget || 18000
      );
      const rawC = calculateCareerScore(c.hoursStudied, c.productivityRating);

      hScore = Math.round(hScore * (1 - ALPHA) + rawH * ALPHA);
      fScore = Math.round(fScore * (1 - ALPHA) + rawF * ALPHA);
      cScore = Math.round(cScore * (1 - ALPHA) + rawC * ALPHA);

      totalXP +=
        calculateEarnedXP(hScore) +
        calculateEarnedXP(fScore) +
        calculateEarnedXP(cScore) +
        50; // daily ingestion bonus

      // Daily tasks (3 per day, varying completion for chart variation)
      const done = TASKS_DONE[i];
      for (let t = 0; t < 3; t++) {
        const domain = t === 0 ? "health" : t === 1 ? "finance" : "career";
        newTasks.push({
          _id: new mongoose.Types.ObjectId(),
          text: TASK_TEXTS[t],
          completed: t < done,
          date: dateStr,
          goalId: goalMap[domain],
        });
      }
    }

    // ── 6. Persist ───────────────────────────────────────────────────────
    await Log.insertMany(logsToInsert);

    user.dailyTasks.push(...newTasks);
    user.markModified("dailyTasks");

    user.scores.health  = hScore;
    user.scores.finance = fScore;
    user.scores.career  = cScore;
    user.gamification.totalPoints = totalXP;
    user.markModified("scores");
    user.markModified("gamification");

    await recalculateStreak(user);
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Vikram seeded with 21 days of data.",
      stats: {
        fileUploadsDeleted: deleted.deletedCount,
        logsInserted: logsToInsert.length,
        tasksInserted: newTasks.length,
        finalScores: { health: hScore, finance: fScore, career: cScore },
        streak: user.gamification.currentStreak,
        totalXP,
      },
    });
  } catch (error: any) {
    console.error("[SEED VIKRAM ERROR]", error);
    return NextResponse.json({ error: error.message || "Seed failed" }, { status: 500 });
  }
}
