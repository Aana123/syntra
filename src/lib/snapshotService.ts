// src/lib/snapshotService.ts
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import AssetLiability from "@/models/AssetLiability";
import { buildTwinContext } from "@/lib/aiContextBuilder";
import { calculateConfidence } from "@/lib/confidenceScore";
import { analyzeBehavioralDrift } from "@/lib/driftEngine";
import { callGemini } from "@/lib/gemini";
import { Logger } from "@/lib/logger";
import { generateaitwinReflection } from "@/lib/prompts/aitwinReflection";


// ── In-process generation lock ──────────────────────────────────
// Prevents concurrent Gemini calls for the same user when both the
// background snapshotService and the /api/ai/recommend endpoint fire
// at the same time (e.g. user uploads a file then immediately visits Insights).
const _inFlight = new Set<string>();

/**
 * Asynchronously generates a fresh AI twin reflection and stores it as a cached snapshot.
 * Destined to run as a background promise to ensure standard log/CSV submissions return immediately.
 */
export async function generateAndStoreSnapshot(
  userId: string | mongoose.Types.ObjectId,
  preFetchedUser?: any,
  preFetchedLogs?: any[],
  force = false
): Promise<void> {
  const userKey = userId.toString();

  // Lock: skip if a generation is already in-flight for this user
  if (_inFlight.has(userKey)) {
    console.log(`[Snapshot Service] Generation already in-flight for user ${userKey} — skipping duplicate.`);
    return;
  }
  _inFlight.add(userKey);

  const startTime = performance.now(); // ⏱️ Start stopwatch
  try {
    await connectDB();
    const user = preFetchedUser || await User.findById(userId);
    if (!user) {
      console.warn(`[Snapshot Service] User not found for ID: ${userId}`);
      return;
    }
    if (!force && user.aiSnapshot?.lastGeneratedAt && (Date.now() - new Date(user.aiSnapshot.lastGeneratedAt).getTime() < 30 * 1000)) {
      console.log(`[Snapshot Service] Reflection generated within last 30 seconds for user ${userKey} — skipping duplicate.`);
      return;
    }




    const recentLogs = preFetchedLogs || await Log.find({ userId: user._id })
      .sort({ date: -1 })
      .limit(42)
      .lean();

    // Dynamically look up the AssetLiability model to get familyOutflows
    const AssetLiabilityModel = mongoose.models.AssetLiability || mongoose.model("AssetLiability");
    const portfolio = await AssetLiabilityModel.findOne({ userId: user._id }).lean();
    const familyOutflows = (portfolio as any)?.familyOutflows || null;

    const twinContext = buildTwinContext(recentLogs, {
      monthlyIncome: user.profile?.monthlyIncome,
      monthlyBudget: user.profile?.monthlyBudget,
      relations: user.relations || null,
      supportNetwork: user.supportNetwork || [],
      familyOutflows: familyOutflows,
    });

    const confidence = calculateConfidence(twinContext.logCount);

    // Run the deterministic Drift & Divergence Engine
    const driftReport = analyzeBehavioralDrift(recentLogs, user);

    // 1. The Gateway: Only wake up Gemini if the user is actually drifting!
    if (driftReport.globalDriftIndex < 15 && driftReport.recommendations.length === 1) {
      console.log("User is stable. Saving math, skipping AI generation.");
      const stableReflection = {
        twinPrediction: "Your Digital Twin is operating in optimal synchrony across health, finance, and career matrices.",
        dailyReflection: "Your behavioral biometrics are nominal. Excellent job maintaining daily routine consistency.",
        explainability: [
          `Global Drift Index is ${driftReport.globalDriftIndex}/100, indicating optimal lifestyle trajectory alignment.`,
          "All monitored biometric domains are operating within normal parameters with zero adverse flags detected."
        ],
        dailyChallenge: "Maintain your perfect record by logging all three biometric domains again today.",
        recommendations: {
          health: ["Continue maintaining your current sleep and physical training schedule."],
          finance: ["Maintain your nominal spending rate to keep discretionary runway fully optimized."],
          career: ["Complete one focused skill upskilling session today to sustain study momentum."]
        },
        riskAlerts: [],
        confidence: confidence
      };
      
      if (!user.aiSnapshot) {
        user.aiSnapshot = {
          dailyReflection: null,
          lastGeneratedAt: null,
        };
      }
      user.aiSnapshot.dailyReflection = stableReflection;
      user.aiSnapshot.lastGeneratedAt = new Date();
      await user.save();

      const latency = performance.now() - startTime; // ⏱️ Stop stopwatch
      
      Logger.metric("DRIFT_INTERCEPT", "ai_optimization", {
        latencyMs: Number(latency.toFixed(2)),
        driftIndex: driftReport.globalDriftIndex,
        estimatedTokensSaved: 850
      }, user._id.toString());

      console.log(`[Snapshot Service] Pre-generated and cached STABLE math snapshot for user: ${user.email}`);
      return; 
    }

    // 2. Invoke the Unified AI Twin Reflection Core
    const aiResponse = await generateaitwinReflection(
      twinContext,
      {
        health: user.scores.health,
        finance: user.scores.finance,
        career: user.scores.career,
      },
      user.gamification?.currentStreak || 0,
      confidence,
      user.personalMission || "Achieve Personal Optimization",
      user.healthConstraints || "none",
      user.relations,
      user.supportNetwork,
      familyOutflows
    );

    // 3. Cache the validated Gemini reflection in the User Document
    if (!user.aiSnapshot) {
      user.aiSnapshot = {
        dailyReflection: null,
        lastGeneratedAt: null,
      };
    }
    user.aiSnapshot.dailyReflection = aiResponse;
    user.aiSnapshot.lastGeneratedAt = new Date();
    await user.save();

    const latency = performance.now() - startTime; // ⏱️ Stop stopwatch

    Logger.metric("AI_GENERATION", "ai_core", {
      latencyMs: Number(latency.toFixed(2)),
      driftIndex: driftReport.globalDriftIndex,
      divergenceCause: driftReport.primaryDivergenceCause
    }, user._id.toString());

    console.log(`[Snapshot Service] Pre-generated and cached DRIFTING AI snapshot for user: ${user.email}`);

  } catch (error: any) {
    console.error(`[Snapshot Service ERROR] Pre-generating AI reflection failed for user ${userId}:`, error);
  } finally {
    // Always release the lock so future calls aren't permanently blocked
    _inFlight.delete(userKey);
  }
}
