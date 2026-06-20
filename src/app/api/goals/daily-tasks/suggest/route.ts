import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import { callGemini } from "@/lib/services/gemini";
import { sanitizeForPrompt } from "@/lib/utils/sanitize";
import { rl } from "@/lib/utils/rateLimit";
import { z } from "zod";

const RequestSchema = z.object({
  goalId: z.string().min(1),
});

const SuggestionsOutputSchema = z
  .array(z.string().min(3).max(100))
  .min(3)
  .max(3);

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input: goalId is required" }, { status: 400 });
    }

    const limit = rl.dailyTasks(session.user.id ?? session.user.email!);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Retry in ${limit.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const { goalId } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const goal = user.goals.find((g: any) => g._id?.toString() === goalId);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found in your profile" }, { status: 404 });
    }

    const safeTitle = sanitizeForPrompt(goal.title, 200);
    const pendingMilestones = goal.milestones
      .filter((m: any) => !m.completed)
      .map((m: any) => m.text)
      .slice(0, 3);

    const prompt = `
You are a personal productivity expert helping a user break down a high-level goal and milestones into 3 concrete, specific tasks they can do TODAY.

Goal: "${safeTitle}"
Domain: ${goal.domain}
Pending Milestones to target:
${pendingMilestones.length > 0 ? pendingMilestones.map((m: string) => `- ${m}`).join("\n") : "No specific pending milestones, generate tasks related to the overall goal."}

Generate exactly 3 specific, actionable daily tasks (under 10 words each) for today that directly help complete these milestones.

Rules:
- Be highly specific and measurable (e.g. "Do 20 mins cardio", "Save ₹200 from budget today", "Read 10 pages of Chapter 2").
- Do NOT repeat the goal title.
- Make them discrete daily actions, not high-level goals.
- Return ONLY a JSON array of 3 strings. No markdown, no keys, no explanations.
["task 1", "task 2", "task 3"]
`.trim();

    const raw = await callGemini<unknown>(prompt, {
      temperature: 0.3,
      maxTokens: 256,
    });

    const check = SuggestionsOutputSchema.safeParse(raw);
    if (!check.success) {
      console.warn("[daily-tasks/suggest] Zod failed:", check.error.issues.map(e => `${e.path}: ${e.message}`).join("; "));
      // Fallback: If raw is an array of strings, attempt recovery
      if (Array.isArray(raw) && raw.length >= 2 && raw.every(s => typeof s === "string")) {
        const fallback = (raw as string[]).slice(0, 3).filter(s => s.trim().length > 0);
        return NextResponse.json({ success: true, suggestions: fallback });
      }
      // Return static fallback tasks related to domain
      const staticFallbacks = {
        health: ["Perform 15 minutes of dynamic stretching", "Drink 3 liters of water today", "Go to bed by 10:30 PM"],
        finance: ["Log all transactions for today", "Review today's food expenses", "Transfer ₹100 to savings"],
        career: ["Study focus topic for 45 minutes", "Complete one small micro-task on project", "Write down tomorrow's daily schedule"],
      }[goal.domain as "health" | "finance" | "career"] || ["Complete 1 task towards goal", "Plan tomorrow's milestone action", "Review active goals"];

      return NextResponse.json({ success: true, suggestions: staticFallbacks });
    }

    const suggestions = check.data.filter((s) => s.trim().length > 0).slice(0, 3);
    return NextResponse.json({ success: true, suggestions });
  } catch (err: any) {
    console.error("[daily-tasks/suggest]", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate daily tasks suggestions." },
      { status: 500 }
    );
  }
}
