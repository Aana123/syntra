import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await req.json();

    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "complete-challenge") {
      if (!user.gamification) {
        user.gamification = { totalPoints: 0, currentStreak: 0, lastLogDate: null, lastChallengeDate: null };
      }

      const todayStr = new Date().toDateString();
      const lastChallengeStr = user.gamification.lastChallengeDate
        ? new Date(user.gamification.lastChallengeDate).toDateString()
        : null;

      if (lastChallengeStr === todayStr) {
        return NextResponse.json({ success: false, error: "Daily challenge already completed today" }, { status: 400 });
      }

      user.gamification.totalPoints = (user.gamification.totalPoints || 0) + 20;
      user.gamification.lastChallengeDate = new Date();

      // Check and award Rising Twin if they cross 500 XP
      const currentBadges = user.badges || [];
      if (user.gamification.totalPoints >= 500 && !currentBadges.includes("Rising Twin")) {
        user.badges.push("Rising Twin");
        user.markModified("badges");
      }

      user.markModified("gamification");
      await user.save();

      return NextResponse.json({ 
        success: true, 
        gamification: user.gamification,
        badges: user.badges,
        message: "Completed daily challenge! +20 XP awarded."
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[GAMIFICATION POST ERROR]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
