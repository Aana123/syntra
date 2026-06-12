// src/app/api/profile/vector/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { optimizationVector } = body;

    if (!optimizationVector || !["health", "finance", "career"].includes(optimizationVector)) {
      return NextResponse.json({ message: "Invalid optimization vector." }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { optimizationVector },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, optimizationVector: user.optimizationVector },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[PROFILE VECTOR PATCH ERROR]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
