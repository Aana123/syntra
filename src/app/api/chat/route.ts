import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { CHAT_BOT_SYSTEM_PROMPT } from '@/lib/prompts/chatPrompt';
import { connectDB } from '@/lib/mongodb';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/services/terminalService';
import Log from '@/models/Log';
import mongoose from 'mongoose';
import { buildTwinContext } from '@/lib/aiContextBuilder';

// Initialize custom Google AI provider using GEMINI_API_KEY
const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Ensure standard edge execution environment or modern node runtime
export const maxDuration = 30;

// Enforce Zod validation for runtime type safety
const ChatResponseSchema = z.object({
  intent: z.enum(['DATA_ENTRY', 'QUERY_RESPONSE', 'SIMULATION']),
  message: z.string().describe('The natural conversational response or acknowledgement as ARIA to show to the Operator.'),
  uiAction: z.object({
    shouldNavigate: z.boolean().describe('Set to true ONLY if intent is SIMULATION.'),
    targetRoute: z.string().describe('The destination URL path (e.g., "/simulator"). Empty string if no navigation.'),
    queryParams: z.object({
      domain: z.enum(['health', 'finance', 'career']).nullable(),
      variable: z.enum(['sleep_hours', 'workout_frequency', 'savings_rate', 'study_hours', 'focus_rating']).nullable(),
      val: z.coerce.number().nullable(),
    }).nullable(),
  }).nullable(),
});

/**
 * Heuristic fallback pre-processor to catch obvious simulation queries 
 * and safeguard system intent matching.
 */
function checkHeuristicOverride(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  const structuralTriggers = [
    'what if', 
    'simulate', 
    'what happens if', 
    'if i change', 
    'how does'
  ];
  return structuralTriggers.some(trigger => lowerPrompt.includes(trigger));
}

export async function POST(req: NextRequest) {
  try {
    // 1. Session and payload validation
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized Operator neural link.' }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'A valid chat message string is required.' }, { status: 400 });
    }

    // 2. Fetch User, Log Context & Portfolio from DB
    await connectDB();
    const AssetLiabilityModel = mongoose.models.AssetLiability || mongoose.model("AssetLiability");
    const [user, recentLogs, portfolio] = await Promise.all([
      getUserById(session.user.id),
      Log.find({ userId: new mongoose.Types.ObjectId(session.user.id) })
        .sort({ date: -1 })
        .limit(21)
        .lean(),
      AssetLiabilityModel.findOne({ userId: new mongoose.Types.ObjectId(session.user.id) }).lean()
    ]);

    // 3. Build Operator Context
    let contextString = "No digital twin data available yet.";
    if (user) {
      const activeFlags: string[] = [];
      const familyOutflows = (portfolio as any)?.familyOutflows || null;
      const twinContext = buildTwinContext(recentLogs || [], {
        monthlyIncome: user.profile?.monthlyIncome,
        monthlyBudget: user.profile?.monthlyBudget,
        relations: user.relations || null,
        supportNetwork: user.supportNetwork || [],
        familyOutflows: familyOutflows,
      });

      if (twinContext) {
        if (twinContext.behaviorFlags.stressSpendingCorrelation) activeFlags.push("stress_linked_spending");
        if (twinContext.behaviorFlags.sleepCareerCorrelation) activeFlags.push("chronic_sleep_deprivation");
        if (twinContext.behaviorFlags.workoutMoodCorrelation) activeFlags.push("workout_mood_correlation");
        if (twinContext.behaviorFlags.lateNightSpending) activeFlags.push("late_night_spending");
        if (twinContext.behaviorFlags.weekendDropoff) activeFlags.push("weekend_dropoff");
      }

      contextString = JSON.stringify({
        operatorName: user.name,
        currentScores: {
          health: user.scores?.health ?? 50,
          finance: user.scores?.finance ?? 50,
          career: user.scores?.career ?? 50,
          globalSyncIndex: Math.round(((user.scores?.health ?? 50) + (user.scores?.finance ?? 50) + (user.scores?.career ?? 50)) / 3)
        },
        gamification: {
          streak: user.gamification?.currentStreak ?? 0,
          points: user.gamification?.totalPoints ?? 0,
          badges: user.badges || []
        },
        behaviorFlags: activeFlags,
        relations: user.relations || null,
        supportNetwork: user.supportNetwork || [],
        familyOutflows: familyOutflows,
        weeklyAverages: twinContext ? {
          sleepHours: twinContext.weeklyAverages.sleep,
          workoutFrequency: twinContext.weeklyAverages.workout,
          studyHours: twinContext.weeklyAverages.studyHours,
          savingsRate: twinContext.weeklyAverages.savingsRate,
          stressLevel: twinContext.weeklyAverages.stressLevel,
          moodScore: twinContext.weeklyAverages.moodScore,
          socialCount: twinContext.weeklyAverages.socialCount,
          relationshipQuality: twinContext.weeklyAverages.relationshipQuality
        } : null
      }, null, 2);
    }

    const systemPrompt = CHAT_BOT_SYSTEM_PROMPT.replace('{{OPERATOR_CONTEXT}}', contextString);

    // 4. Invoke Gemini using Structured Outputs
    const { object } = await generateObject({
      model: googleProvider('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: message,
      schema: ChatResponseSchema,
      temperature: 0.15, // Low temperature ensures highly deterministic intent matching
    });

    // 5. Post-processing/Heuristic alignment verification
    let finalizedPayload = { ...object };
    if (checkHeuristicOverride(message) && finalizedPayload.intent !== 'SIMULATION') {
      finalizedPayload.intent = 'SIMULATION';
      if (finalizedPayload.uiAction) {
        finalizedPayload.uiAction.shouldNavigate = true;
        finalizedPayload.uiAction.targetRoute = '/simulator';
      }
    }

    // 6. Return type-safe structural layout back to ChatWidget.tsx
    return NextResponse.json(finalizedPayload, { status: 200 });

  } catch (error: any) {
    console.error('[CHAT_ROUTE_ERROR]:', error);
    return NextResponse.json(
      { 
        error: 'Internal processing failure within the AI engine.', 
        details: error?.message || '' 
      }, 
      { status: 500 }
    );
  }
}