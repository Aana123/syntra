import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    await User.updateOne(
      { email: session.user.email },
      { $unset: { googleFit: "" } }
    );

    return NextResponse.json({ success: true, message: "Google Fit disconnected successfully." });
  } catch (error: any) {
    console.error("GOOGLE FIT OAUTH DISCONNECT ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
