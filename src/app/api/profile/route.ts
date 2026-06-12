// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { z } from "zod";


const ProfileUpdateSchema = z.object({
  name:               z.string().min(1).max(100).optional(),
  age:                z.number().int().min(10).max(120).optional(),
  avatarId:           z.number().int().min(1).max(20).optional(),
  optimizationVector: z.string().max(100).optional(),
  personalMission:    z.string().max(300).optional(),
  healthConstraints:  z.string().max(300).optional(),
  gender:             z.enum(["male", "female", "other"]).optional(),
  height:             z.number().min(50).max(300).optional(),
  weight:             z.number().min(20).max(500).optional(),
  averageSleep:       z.number().min(0).max(24).optional(),
  workoutFrequency:   z.number().int().min(0).max(14).optional(),
  activityLevel:      z.string().max(50).optional(),
  monthlyIncome:      z.number().min(0).optional(),
  currentSavings:     z.number().min(0).optional(),
  spendingStyle:      z.number().min(1).max(5).optional(),
  hoursStudied:       z.number().min(0).max(24).optional(),
  learningProfile:    z.string().max(100).optional(),
  archetype:          z.string().max(100).optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }



    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        age: user.age,
        avatarId: user.avatarId,
        optimizationVector: user.optimizationVector,
        personalMission: user.personalMission,
        healthConstraints: user.healthConstraints,
        profile: user.profile,
        scores: user.scores,
        googleFit: user.googleFit ? {
          syncActive: user.googleFit.syncActive,
          lastSyncedAt: user.googleFit.lastSyncedAt
        } : undefined
      }
    });
  } catch (error: any) {
    console.error("GET PROFILE ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = ProfileUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const {
      name, age, avatarId, optimizationVector, personalMission, healthConstraints,
      gender, height, weight, averageSleep, workoutFrequency, activityLevel,
      monthlyIncome, currentSavings, spendingStyle, hoursStudied, learningProfile, archetype,
    } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Update Core Fields
    if (name) user.name = name;
    if (typeof age !== "undefined") user.age = age ? Number(age) : undefined;
    if (typeof avatarId !== "undefined") user.avatarId = Number(avatarId) || 1;
    if (optimizationVector) user.optimizationVector = optimizationVector;
    if (typeof personalMission !== "undefined") user.personalMission = personalMission;
    if (typeof healthConstraints !== "undefined") user.healthConstraints = healthConstraints;

    // 2. Update Extended Onboarding & Profile Fields inside user.profile
    const monthlyIncomeNum = typeof monthlyIncome !== "undefined" ? Number(monthlyIncome) : (user.profile?.monthlyIncome || 0);
    const spendingStyleNum = typeof spendingStyle !== "undefined" ? Number(spendingStyle) : (user.profile?.spendingStyle || 3);
    const currentSavingsNum = typeof currentSavings !== "undefined" ? Number(currentSavings) : (user.profile?.currentSavings || 0);

    const spendingMultiplier = spendingStyleNum / 5;
    const discretionarySpend = Math.round(monthlyIncomeNum * 0.4 * spendingMultiplier);
    const monthlySavings = Math.max(0, monthlyIncomeNum - discretionarySpend - Math.round(monthlyIncomeNum * 0.4));
    const targetSavingsRate = monthlyIncomeNum > 0 ? Math.round((monthlySavings / monthlyIncomeNum) * 100) : 20;

    user.profile = {
      monthlyIncome: monthlyIncomeNum,
      monthlyBudget: Math.round(monthlyIncomeNum * 0.8), // 20% target savings rate fallback
      targetSavingsRate,
      gender: gender || user.profile?.gender || "male",
      height: typeof height !== "undefined" ? Number(height) : (user.profile?.height || 175),
      weight: typeof weight !== "undefined" ? Number(weight) : (user.profile?.weight || 70),
      averageSleep: typeof averageSleep !== "undefined" ? Number(averageSleep) : (user.profile?.averageSleep || 7),
      workoutFrequency: typeof workoutFrequency !== "undefined" ? Number(workoutFrequency) : (user.profile?.workoutFrequency || 3),
      activityLevel: activityLevel || user.profile?.activityLevel || "moderately_active",
      currentSavings: currentSavingsNum,
      spendingStyle: spendingStyleNum,
      hoursStudied: typeof hoursStudied !== "undefined" ? Number(hoursStudied) : (user.profile?.hoursStudied || 3),
      learningProfile: typeof learningProfile !== "undefined" ? learningProfile : (user.profile?.learningProfile || ""),
      archetype: archetype || user.profile?.archetype || "",
    };

    // 3. Recalculate twin potentials dynamically matching onboarding parameters
    const sleep = user.profile.averageSleep || 7.0;
    const workouts = user.profile.workoutFrequency || 3;
    const hasConstraints = user.healthConstraints && user.healthConstraints !== "none";
    const healthPotential = Math.round(
      Math.max(30, Math.min(98, 40 + (sleep / 8) * 30 + (workouts / 5) * 20 + (hasConstraints ? -10 : 8)))
    );

    const runwayMonths = discretionarySpend > 0 ? currentSavingsNum / discretionarySpend : 6;
    const financePotential = Math.round(
      Math.max(30, Math.min(98, 35 + targetSavingsRate * 1.3 + Math.min(6, runwayMonths) * 3.5))
    );

    const study = user.profile.hoursStudied || 3;
    const focus = 7; // default average
    const consistency = 7; // default average
    const careerPotential = Math.round(
      Math.max(30, Math.min(98, 35 + study * 3.5 + focus * 2.5 + consistency * 2.5))
    );

    user.scores = {
      health: healthPotential,
      finance: financePotential,
      career: careerPotential,
    };



    user.markModified("profile");
    user.markModified("scores");
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        name: user.name,
        email: user.email,
        age: user.age,
        avatarId: user.avatarId,
        optimizationVector: user.optimizationVector,
        personalMission: user.personalMission,
        healthConstraints: user.healthConstraints,
        profile: user.profile,
        scores: user.scores,
        googleFit: user.googleFit ? {
          syncActive: user.googleFit.syncActive,
          lastSyncedAt: user.googleFit.lastSyncedAt
        } : undefined
      }
    });

  } catch (error: any) {
    console.error("PUT PROFILE ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
