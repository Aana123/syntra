// src/app/api/goals/milestone/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

/**
 * POST /api/goals/milestone
 * Adds a new milestone to a specific goal.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { goalId, text } = await req.json();

    if (!goalId || !text) {
      return NextResponse.json({ error: "Missing fields: goalId and text are required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOneAndUpdate(
      { 
        email: session.user.email, 
        "goals._id": new mongoose.Types.ObjectId(goalId) 
      },
      {
        $push: {
          "goals.$.milestones": { text, completed: false }
        }
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "Goal not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, goals: user.goals }, { status: 201 });

  } catch (error) {
    console.error("[MILESTONES POST ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/goals/milestone
 * Updates a milestone's completed status or text description.
 */
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { goalId, milestoneId, completed, text } = await req.json();

    if (!goalId || !milestoneId) {
      return NextResponse.json({ error: "Missing fields: goalId and milestoneId are required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the target goal
    const goal = user.goals.find((g: any) => g._id?.toString() === goalId);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Find the target milestone within the goal
    const milestone = goal.milestones.find((m: any) => m._id?.toString() === milestoneId);
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Update fields if provided
    const wasCompleted = milestone.completed;
    if (completed !== undefined && completed !== wasCompleted) {
      milestone.completed = completed;
      if (!user.gamification) {
        user.gamification = { totalPoints: 0, currentStreak: 0, lastLogDate: null };
      }
      if (completed) {
        user.gamification.totalPoints = (user.gamification.totalPoints || 0) + 100;
      } else {
        user.gamification.totalPoints = Math.max(0, (user.gamification.totalPoints || 0) - 100);
      }
    }
    if (text !== undefined) {
      milestone.text = text;
    }

    // Check and award badges
    const currentBadges = user.badges || [];
    const newBadges: string[] = [];

    // 1. Habit Builder: at least 1 completed milestone
    const hasCompletedMilestone = user.goals.some((g: any) => 
      g.milestones?.some((m: any) => m.completed)
    );
    if (hasCompletedMilestone && !currentBadges.includes("Habit Builder")) {
      newBadges.push("Habit Builder");
    }

    // 2. Focus Master: at least 1 goal with all milestones completed (min 1 milestone)
    const hasCompletedGoal = user.goals.some((g: any) => 
      g.milestones?.length > 0 && g.milestones.every((m: any) => m.completed)
    );
    if (hasCompletedGoal && !currentBadges.includes("Focus Master")) {
      newBadges.push("Focus Master");
    }

    // 3. Goal Getter: at least 3 goals completed
    const completedGoalsCount = user.goals.filter((g: any) => 
      g.milestones?.length > 0 && g.milestones.every((m: any) => m.completed)
    ).length;
    if (completedGoalsCount >= 3 && !currentBadges.includes("Goal Getter")) {
      newBadges.push("Goal Getter");
    }

    if (newBadges.length > 0) {
      user.badges.push(...newBadges);
    }

    // Mark modifications so Mongoose saves nested objects correctly
    user.markModified("goals");
    user.markModified("gamification");
    user.markModified("badges");
    await user.save();

    return NextResponse.json({ 
      success: true, 
      goals: user.goals,
      badges: user.badges,
      gamification: user.gamification
    }, { status: 200 });

  } catch (error) {
    console.error("[MILESTONES PATCH ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/goals/milestone
 * Deletes a milestone from a specific goal.
 */
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { goalId, milestoneId } = await req.json();

    if (!goalId || !milestoneId) {
      return NextResponse.json({ error: "Missing fields: goalId and milestoneId are required" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOneAndUpdate(
      { 
        email: session.user.email, 
        "goals._id": new mongoose.Types.ObjectId(goalId) 
      },
      {
        $pull: {
          "goals.$.milestones": { _id: new mongoose.Types.ObjectId(milestoneId) }
        }
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "Goal or user not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, goals: user.goals }, { status: 200 });

  } catch (error) {
    console.error("[MILESTONES DELETE ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
