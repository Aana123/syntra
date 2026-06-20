// src/app/api/goals/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";
import { z } from "zod";


const MilestoneSchema = z.object({
  _id: z.string().optional(),
  text: z.string().min(1).max(200),
  completed: z.boolean().default(false),
});

const GoalCreateSchema = z.object({
  title:      z.string().min(1).max(200),
  domain:     z.preprocess(
    (val) => typeof val === "string" ? val.toLowerCase() : val,
    z.enum(["health", "finance", "career"])
  ),
  priority:   z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const lower = val.toLowerCase();
        if (lower === "med") return "medium";
        return lower;
      }
      return val;
    },
    z.enum(["low", "medium", "high"])
  ),
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
      dailyTasks: user?.dailyTasks || [], 
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

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const goal = user.goals.find((g: any) => g._id?.toString() === goalId);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Update fields
    goal.title = title;
    goal.domain = domain;
    goal.priority = priority;
    goal.targetDate = targetDate ? new Date(targetDate) : undefined;
    
    // Convert and set milestones
    goal.milestones = milestones || [];

    user.markModified("goals");
    await user.save();

    return NextResponse.json({ success: true, goals: user.goals });
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