import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { z } from "zod";

const HouseholdMemberSchema = z.object({
  relationshipType: z.enum(["partner", "child", "parent", "sibling"])
});

const DependentSchema = z.object({
  type: z.enum(["child", "elderly_parent"]),
  age: z.number().min(0).max(120)
});

const SupportPersonSchema = z.object({
  name: z.string().min(1).max(100),
  relationshipType: z.string().max(100),
  tag: z.enum(["venting", "advice", "distraction", "motivation"])
});

const FamilyProfileSchema = z.object({
  relationshipStatus: z.enum(["Single", "Partnered", "Married", "Separated"]),
  householdMembers: z.array(HouseholdMemberSchema).default([]),
  dependents: z.array(DependentSchema).default([]),
  supportNetwork: z.array(SupportPersonSchema).default([])
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id).select("relations supportNetwork");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      relations: user.relations || {
        relationshipStatus: "Single",
        householdMembers: [],
        dependents: []
      },
      supportNetwork: user.supportNetwork || []
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET FAMILY PROFILE ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = FamilyProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid inputs" }, { status: 400 });
    }

    const { relationshipStatus, householdMembers, dependents, supportNetwork } = parsed.data;

    await connectDB();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          relations: {
            relationshipStatus,
            householdMembers,
            dependents
          },
          supportNetwork
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Family relationships and support network updated successfully.",
      relations: user.relations,
      supportNetwork: user.supportNetwork
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST FAMILY PROFILE ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
