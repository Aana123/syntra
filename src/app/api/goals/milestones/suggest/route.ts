import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { callGemini } from "@/lib/gemini";
import { sanitizeForPrompt } from "@/lib/sanitize";
import { rl } from "@/lib/rateLimit";
import { z } from "zod";

const RequestSchema = z.object({
  title: z.string().min(2).max(200),
  domain: z.enum(["health", "finance", "career"]),
  priority: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const limit = rl.milestones(session.user.id ?? session.user.email!);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Retry in ${limit.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const { title, domain, priority } = parsed.data;
    const safeTitle = sanitizeForPrompt(title, 200);

    const domainContext = {
      health: "physical fitness, wellness, nutrition, habits, or mental health",
      finance: "savings, budgeting, investments, income, or debt reduction",
      career: "skill development, job search, productivity, or professional growth",
    }[domain];

    const prompt = `
You are a goal-setting expert helping someone break a goal into actionable milestones.

Goal: "${safeTitle}"
Domain: ${domain} (${domainContext})
Priority: ${priority}

Generate exactly 6 concrete, measurable milestone steps that logically progress toward achieving this goal.

Rules:
- Each milestone should be completable in 1–4 weeks
- Start easy and build toward harder milestones
- Be specific — include numbers or measurable outcomes where possible
- Keep each milestone under 12 words
- Do NOT repeat the goal title in the milestones
- Milestones should be in a natural progression from first to last

Return ONLY a JSON array of 6 strings. No keys, no explanation.
["milestone 1", "milestone 2", "milestone 3", "milestone 4", "milestone 5", "milestone 6"]
`.trim();

    const suggestions = await callGemini<string[]>(prompt, {
      temperature: 0.5,
      maxTokens: 512,
    });

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error("Invalid suggestions format from AI");
    }

    const clean = suggestions
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .slice(0, 6);

    return NextResponse.json({ success: true, suggestions: clean });
  } catch (err: any) {
    console.error("[milestones/suggest]", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate suggestions." },
      { status: 500 }
    );
  }
}
