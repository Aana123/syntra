import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/apiHandler";
import { ApiError } from "@/lib/apiError";
import { getSession } from "@/lib/auth";
import { getDashboardData } from "@/services/dashboardService";
import { connectDB } from "@/lib/mongodb";

export const GET = apiHandler(async (req: Request) => {
  // 1. Instant Security Check
  const session = await getSession();
  
  // Explicitly checking for session.user.id ensures TypeScript is happy
  if (!session || !session.user?.email || !(session.user as any)?.id) {
    throw new ApiError(401, "Unauthorized neural link.");
  }

  // 2. Fetch Dashboard Payload through Service Layer
  const dashboardData = await getDashboardData(
    (session.user as any).id,
    session.user.email
  );

  // 3. Return structured response
  return NextResponse.json({ 
    success: true, 
    dashboard: dashboardData 
  }, { status: 200 });
});