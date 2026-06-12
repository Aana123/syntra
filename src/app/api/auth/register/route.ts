// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { SignupSchema } from '@/lib/validators';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Ensure properties are in types expected by SignupSchema
    if (body.age !== undefined && body.age !== null) {
      body.age = String(body.age);
    }
    if (body.avatarId !== undefined && body.avatarId !== null) {
      body.avatarId = Number(body.avatarId);
    } else {
      body.avatarId = 1; // Default avatar if not specified
    }
    if (body.monthlyIncome !== undefined && body.monthlyIncome !== null) {
      body.monthlyIncome = Number(body.monthlyIncome);
    }
    if (body.monthlyBudget !== undefined && body.monthlyBudget !== null) {
      body.monthlyBudget = Number(body.monthlyBudget);
    }

    // 1. Zod schema validation
    const parseResult = SignupSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ 
        success: false, 
        message: parseResult.error.issues[0].message 
      }, { status: 400 });
    }

    const { name, email, password, age, avatarId, monthlyIncome, monthlyBudget } = parseResult.data;

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Connect to Database (Uncommented!)
    await connectDB();

    // 3. Check for existing user (Uncommented!)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ success: false, message: "Email already registered." }, { status: 409 });
    }

    // 4. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Guard: Prevent empty string "age" input from converting to 0 in Number()
    const parsedAge = age && age !== "" ? Number(age) : undefined;

    // 5. Create User in MongoDB (Uncommented and structure verified!)
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      age: parsedAge,
      avatarId: avatarId || 1, 
      scores: { health: 50, finance: 50, career: 50 }, // Starting baseline
      gamification: { totalPoints: 0, currentStreak: 0 },
      profile: {
        monthlyIncome: monthlyIncome || 0,
        monthlyBudget: monthlyBudget || 0,
        targetSavingsRate: 20
      },
      goals: []
    });

    // We do NOT return a JWT here. 
    // Best practice for NextAuth is to return a 201 Success, 
    // then have the frontend redirect to the /login page (or use the signIn helper).
    return NextResponse.json({ 
        success: true, 
        message: "User registered successfully. Please log in." 
    }, { status: 201 });

  } catch (error: any) {
    console.error("[CRITICAL] Registration failed:", error);
    return NextResponse.json({ success: false, message: "Server encountered an error during registration." }, { status: 500 });
  }
}