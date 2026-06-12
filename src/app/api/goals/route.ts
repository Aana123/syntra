// src/app/api/goals/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";
import { z } from "zod";


const MilestoneSchema = z.object({
  text: z.string().min(1).max(200),
  completed: z.boolean().default(false),
});

const GoalCreateSchema = z.object({
  title:      z.string().min(1).max(200),
  domain:     z.enum(["health", "finance", "career"]),
  priority:   z.enum(["low", "medium", "high"]),
  targetDate: z.string().optional(),
  milestones: z.array(MilestoneSchema).max(20).optional(),
});

const GoalUpdateSchema = GoalCreateSchema.extend({
  goalId: z.string().min(1),
});

const GoalDeleteSchema = z.object({
  goalId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = GoalCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { title, domain, priority, targetDate, milestones } = parsed.data;

    await connectDB();
    
    // UPDATED: Push the new fields into the goals array
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { 
        $push: { 
          goals: { 
            title, 
            domain, 
            priority,
            // Convert to a real MongoDB Date object if it exists
            targetDate: targetDate ? new Date(targetDate) : undefined, 
            // Default to an empty array if the frontend doesn't send any
            milestones: milestones || [] 
          } 
        } 
      },
      { new: true }
    );

    return NextResponse.json({ success: true, goals: user?.goals }, { status: 201 });

  } catch (error) {
    console.error("[GOALS POST ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findOne({ email: session.user.email });

    return NextResponse.json({ 
      success: true, 
      goals: user?.goals || [], 
      badges: user?.badges || [],
      gamification: user?.gamification || { totalPoints: 0, currentStreak: 0, lastLogDate: null },
      scores: user?.scores || { health: 50, finance: 50, career: 50 }
    });

  } catch (error) {
    console.error("[GOALS GET ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = GoalUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { goalId, title, domain, priority, targetDate, milestones } = parsed.data;

    await connectDB();

    const updateFields: Record<string, unknown> = {
      "goals.$.title": title,
      "goals.$.domain": domain,
      "goals.$.priority": priority,
      "goals.$.milestones": milestones || [],
      "goals.$.targetDate": targetDate ? new Date(targetDate) : null,
    };

    const user = await User.findOneAndUpdate(
      { email: session.user.email, "goals._id": new mongoose.Types.ObjectId(String(goalId)) },
      { $set: updateFields },
      { new: true }
    );

    return NextResponse.json({ success: true, goals: user?.goals });
  } catch (error) {
    console.error("[GOALS PATCH ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = GoalDeleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "goalId is required" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { $pull: { goals: { _id: new mongoose.Types.ObjectId(String(parsed.data.goalId)) } } },
      { new: true }
    );

    return NextResponse.json({ success: true, goals: user?.goals });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}