import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncGoogleFitData } from "@/lib/googleFitSync";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized neural link." }, { status: 401 });
    }

    const result = await syncGoogleFitData(session.user.id);
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error: any) {
    console.error("TELEMETRY MANUAL SYNC ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to synchronize telemetry data." },
      { status: 500 }
    );
  }
}
