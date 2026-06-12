// src/app/api/profile/onboard/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const {
      // Layer 1 — Anatomical
      age,
      gender,
      height,
      weight,
      bodyFat,
      averageSleep,
      workoutFrequency,
      activityLevel,
      healthConstraints,

      // Layer 2 — Financial
      monthlyIncomeRange,
      customIncome,
      currentSavings,
      spendingStyle, // 1 to 5
      biggestGoal,
      customGoalTitle,

      // Layer 3 — Behavioral
      hoursStudied,
      focusRating,
      consistencyRating,
      sessionsPerWeek,
      learningProfile,
      goalHorizon,

      // Layer 4 — Identity
      archetype,
      personalMission,
    } = body;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    // 1. Process Income Value
    let income = 0;
    if (monthlyIncomeRange === "student") income = 0;
    else if (monthlyIncomeRange === "0-10k") income = 5000;
    else if (monthlyIncomeRange === "10k-30k") income = 20000;
    else if (monthlyIncomeRange === "30k-50k") income = 40000;
    else if (monthlyIncomeRange === "50k+") income = 75000;
    else if (monthlyIncomeRange === "custom") income = Number(customIncome) || 0;

    const savingsVal = Number(currentSavings) || 0;
    const spendingMultiplier = (Number(spendingStyle) || 3) / 5; // 0.2 to 1.0
    const discretionarySpend = Math.round(income * 0.4 * spendingMultiplier);
    const monthlySavings = Math.max(0, income - discretionarySpend - Math.round(income * 0.4)); // template budget logic

    // 2. Compute potentials
    const sleep = Number(averageSleep) || 7.0;
    const workouts = Number(workoutFrequency) || 3;
    const hasConstraints = healthConstraints && healthConstraints !== "none";
    const healthPotential = Math.round(
      Math.max(30, Math.min(98, 40 + (sleep / 8) * 30 + (workouts / 5) * 20 + (hasConstraints ? -10 : 8)))
    );

    const targetSavingsRate = income > 0 ? Math.round((monthlySavings / income) * 100) : 20;
    const runwayMonths = discretionarySpend > 0 ? savingsVal / discretionarySpend : 6;
    const financePotential = Math.round(
      Math.max(30, Math.min(98, 35 + targetSavingsRate * 1.3 + Math.min(6, runwayMonths) * 3.5))
    );

    const study = Number(hoursStudied) || 3;
    const focus = Number(focusRating) || 7;
    const consistency = Number(consistencyRating) || 7;
    const careerPotential = Math.round(
      Math.max(30, Math.min(98, 35 + study * 3.5 + focus * 2.5 + consistency * 2.5))
    );

    const syncPercentage = Math.round((healthPotential + financePotential + careerPotential) / 3);

    // 3. Map archetype to Optimization Vector
    let optimizationVector: "health" | "finance" | "career" = "career";
    if (archetype === "titan" || archetype === "peak_performer") optimizationVector = "health";
    else if (archetype === "architect" || archetype === "financial_architect") optimizationVector = "finance";
    else if (archetype === "operator" || archetype === "scholar" || archetype === "founder" || archetype === "elite_learner" || archetype === "founder_mode") optimizationVector = "career";
    else optimizationVector = "career"; // Default

    // 4. Determine Starting Goal (prioritizes Personal Mission narrative)
    let goalLabel = personalMission;
    if (!goalLabel) {
      if (biggestGoal === "emergency_fund") goalLabel = "Build 6-Month Emergency Fund";
      else if (biggestGoal === "laptop") goalLabel = "Acquire Next-Gen Development Laptop";
      else if (biggestGoal === "vehicle") goalLabel = "Secure Downpayment for Vehicle";
      else if (biggestGoal === "house") goalLabel = "Acquire First Real Estate Asset Downpayment";
      else if (biggestGoal === "business") goalLabel = "Acquire Seed Capital for Personal Business";
      else if (biggestGoal === "retirement") goalLabel = "Build Foundation for Early Retirement";
      else if (biggestGoal === "custom" && customGoalTitle) goalLabel = customGoalTitle;
      else goalLabel = "Achieve Personal Optimization";
    }

    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const startingGoal = {
      title: goalLabel,
      domain: optimizationVector,
      priority: "high",
      targetDate: sixMonthsFromNow,
      milestones: [
        { text: "Log baseline twin synchronization", completed: true },
        { text: "Achieve 50% progress towards target", completed: false },
        { text: "Synchronize final parameters", completed: false },
      ],
    };

    // 5. Update user schema
    user.age = Number(age) || user.age || 26;
    user.personalMission = personalMission || "";
    user.healthConstraints = healthConstraints || "none";
    user.optimizationVector = optimizationVector;
    user.scores = {
      health: healthPotential,
      finance: financePotential,
      career: careerPotential,
    };
    user.profile = {
      monthlyIncome: income,
      monthlyBudget: Math.round(income * 0.8), // save 20%
      targetSavingsRate: targetSavingsRate || 20,
      gender: gender || "male",
      height: Number(height) || 175,
      weight: Number(weight) || 70,
      averageSleep: Number(averageSleep) || 7,
      workoutFrequency: Number(workoutFrequency) || 3,
      activityLevel: activityLevel || "moderately_active",
      currentSavings: Number(currentSavings) || 0,
      spendingStyle: Number(spendingStyle) || 3,
      hoursStudied: Number(hoursStudied) || 3,
      learningProfile: learningProfile || "",
      archetype: archetype || "",
    };
    user.goals = [startingGoal];
    user.markModified("profile");
    user.markModified("scores");
    user.markModified("goals");
    await user.save();

    // 6. Bulk Insert 3 Baseline logs to hydrate starting telemetry (Disconnection Fix)
    // To support standard single-node standalone MongoDB instances without replica-set transaction requirements, 
    // we execute a highly resilient, manual in-memory backup and rollback sequence.
    const backupLogs = await Log.find({ userId: user._id }).lean();
    
    const baselineLogs = [
      {
        userId: user._id,
        domain: "health",
        date: new Date(),
        domainData: {
          sleepHours: sleep,
          workoutMinutes: workouts * 30,
          stressLevel: 5,
          moodScore: 6,
          energyLevel: 7,
          caloriesConsumed: 2000,
          calorieGoal: 2000,
          weight: Number(weight) || 70,
          height: Number(height) || 175,
        },
      },
      {
        userId: user._id,
        domain: "finance",
        date: new Date(),
        domainData: {
          amountSaved: Math.round(monthlySavings / 30),
          discretionarySpent: Math.round(discretionarySpend / 30),
          spendingCategory: "other",
          spendingTime: 14,
        },
      },
      {
        userId: user._id,
        domain: "career",
        date: new Date(),
        domainData: {
          hoursStudied: study,
          productivityRating: focus,
          sessionsCompleted: Number(sessionsPerWeek) || 5,
          courseName: "Twin Integration Sync",
        },
      },
    ];

    try {
      // Execute atomic clearing and seeding
      await Log.deleteMany({ userId: user._id });
      await Log.insertMany(baselineLogs);
    } catch (dbErr) {
      console.error("[CRITICAL DB ERROR] Baseline log seeding failed. Restoring from manual backup:", dbErr);
      if (backupLogs.length > 0) {
        // Strip _id to prevent duplicate key errors during restore write
        const restoredLogs = backupLogs.map(l => {
          const { _id, ...rest } = l;
          return rest;
        });
        await Log.insertMany(restoredLogs);
      }
      throw dbErr;
    }

    return NextResponse.json({
      success: true,
      data: {
        healthPotential,
        financePotential,
        careerPotential,
        syncPercentage,
      },
    });
  } catch (error: any) {
    console.error("[ONBOARDING API ERROR]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
