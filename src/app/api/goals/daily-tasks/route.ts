import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";
import { z } from "zod";

const TaskCreateSchema = z.object({
  text: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  goalId: z.string().optional(),
});

const TaskToggleSchema = z.object({
  taskId: z.string().min(1),
  completed: z.boolean(),
});

const TaskDeleteSchema = z.object({
  taskId: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let dailyTasks = user.dailyTasks || [];
    if (date) {
      dailyTasks = dailyTasks.filter((t: any) => t.date === date);
    }

    return NextResponse.json({ success: true, dailyTasks });
  } catch (error) {
    console.error("[DAILY TASKS GET ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = TaskCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { text, date, goalId } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify goal belongs to user if goalId is provided
    let objectGoalId: mongoose.Types.ObjectId | undefined;
    if (goalId) {
      const goalExists = user.goals.some((g: any) => g._id?.toString() === goalId);
      if (!goalExists) {
        return NextResponse.json({ error: "Goal not found in your profile" }, { status: 404 });
      }
      objectGoalId = new mongoose.Types.ObjectId(goalId);
    }

    const newTask = {
      _id: new mongoose.Types.ObjectId(),
      text,
      completed: false,
      date,
      goalId: objectGoalId,
    };

    if (!user.dailyTasks) {
      user.dailyTasks = [];
    }
    user.dailyTasks.push(newTask);
    user.markModified("dailyTasks");
    await user.save();

    return NextResponse.json({ success: true, dailyTasks: user.dailyTasks }, { status: 201 });
  } catch (error) {
    console.error("[DAILY TASKS POST ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = TaskToggleSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { taskId, completed } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const task = user.dailyTasks?.find((t: any) => t._id?.toString() === taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Gamification XP Reward (+20 XP for completion, -20 XP if uncompleted to prevent farming)
    if (completed && !task.completed) {
      if (!user.gamification) {
        user.gamification = { totalPoints: 0, currentStreak: 0, lastLogDate: new Date() };
      }
      user.gamification.totalPoints += 20;
      user.markModified("gamification");
    } else if (!completed && task.completed) {
      if (user.gamification) {
        user.gamification.totalPoints = Math.max(0, user.gamification.totalPoints - 20);
        user.markModified("gamification");
      }
    }

    task.completed = completed;
    user.markModified("dailyTasks");
    await user.save();

    return NextResponse.json({ 
      success: true, 
      dailyTasks: user.dailyTasks,
      gamification: user.gamification 
    });
  } catch (error) {
    console.error("[DAILY TASKS PATCH ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = TaskDeleteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const { taskId } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.dailyTasks) {
      return NextResponse.json({ success: true, dailyTasks: [] });
    }

    user.dailyTasks = user.dailyTasks.filter((t: any) => t._id?.toString() !== taskId);
    user.markModified("dailyTasks");
    await user.save();

    return NextResponse.json({ success: true, dailyTasks: user.dailyTasks });
  } catch (error) {
    console.error("[DAILY TASKS DELETE ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
