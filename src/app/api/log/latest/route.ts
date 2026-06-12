import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import { apiHandler } from "@/lib/apiHandler";
import { ApiError } from "@/lib/apiError";


export const GET = apiHandler(async () => {
  // 1. AUTHENTICATION
  const session = await getSession();
  if (!session || !session.user?.email) {
    throw new ApiError(401, "Unauthorized access");
  }

  // 2. CONNECT & FIND USER
  await connectDB();
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    throw new ApiError(404, "Twin architecture not found.");
  }



  // 3. FETCH LATEST LOGS — last entry per domain
  const [latestHealth, latestFinance, latestCareer, latestReflection] =
    await Promise.all([
      Log.findOne({ userId: user._id, domain: "health" })
        .sort({ date: -1 })
        .lean() as Promise<any>,
      Log.findOne({ userId: user._id, domain: "finance" })
        .sort({ date: -1 })
        .lean() as Promise<any>,
      Log.findOne({ userId: user._id, domain: "career" })
        .sort({ date: -1 })
        .lean() as Promise<any>,
      Log.findOne({ userId: user._id, domain: "reflection" })
        .sort({ date: -1 })
        .lean() as Promise<any>,
    ]);

  return NextResponse.json(
    {
      success: true,
      latest: {
        health: latestHealth
          ? { data: latestHealth.domainData, date: latestHealth.date }
          : null,
        finance: latestFinance
          ? { data: latestFinance.domainData, date: latestFinance.date }
          : null,
        career: latestCareer
          ? { data: latestCareer.domainData, date: latestCareer.date }
          : null,
        reflection: latestReflection
          ? { data: latestReflection.domainData, date: latestReflection.date }
          : null,
      },
      scores: user.scores,
      streak: user.gamification?.currentStreak || 0,
      lastLogDate: user.gamification?.lastLogDate || null,
    },
    { status: 200 }
  );
});
