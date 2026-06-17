import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";

export async function GET() {
  try {
    await connectDB();
    const users = await User.find({}).lean();
    const logsCount = await Log.countDocuments({});
    
    return NextResponse.json({
      success: true,
      users: users.map((u: any) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        scores: u.scores,
        gamification: u.gamification,
        badges: u.badges,
        aiSnapshot: u.aiSnapshot ? {
          lastGeneratedAt: u.aiSnapshot.lastGeneratedAt,
          hasReflection: !!u.aiSnapshot.dailyReflection
        } : null
      })),
      logsCount
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
