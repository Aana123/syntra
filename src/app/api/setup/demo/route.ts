// src/app/api/setup/demo/route.ts
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Log from '@/models/Log';
import bcrypt from "bcryptjs"; 

export async function GET(request: Request) {
  try {
    // 1. Security Check: Don't let random people wipe your DB!
    // Migrated key verification from plain-text URL query strings to standard secure HTTP headers.
    const secret = request.headers.get("X-Syntra-Setup-Key");
    
    const demoSecret = process.env.DEMO_SECRET;
    if (!demoSecret || secret !== demoSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const demoEmail = "demo@syntra.com";

    // 2. Wipe the Slate Clean (Ensures a fresh demo every time you run it)
    const existingUser = await User.findOne({ email: demoEmail });
    if (existingUser) {
        await Log.deleteMany({ userId: existingUser._id });
        await User.deleteOne({ email: demoEmail });
    }

    // 3. Create the Perfect Profile
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const demoUser = await User.create({
      name: "Aana",
      email: demoEmail,
      password: await bcrypt.hash("password123", 10), 
      avatarId: 2,
      scores: { health: 78, finance: 82, career: 88 },
      gamification: { 
        totalPoints: 1450, 
        currentStreak: 14,
        lastLogDate: yesterday
      },
      goals: [
        { title: "Hit LeetCode Knight", domain: "career", priority: "high" },
        { title: "Cap Zomato spending", domain: "finance", priority: "med" }
      ]
    });

    // 4. Engineer the "Anomaly" Data (Now strictly typed to match IngestionSchema)
    const demoLogs: any[] = [];
    const logs = demoLogs;

    // Loop through the last 14 days
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const logDate = d;

      // Health — progressive collapse with mood and energy
      logs.push({
        userId: demoUser._id,
        domain: "health",
        date: logDate,
        domainData: {
          sleepHours: i > 7 ? 7.5 : Math.max(4.0, 7.5 - (8 - i) * 0.5),
          workoutMinutes: i > 7 ? 45 : 0,
          stressLevel: i > 7 ? 4 : Math.min(9, 4 + (8 - i)),
          moodScore: i > 7 ? 7 : Math.max(3, 7 - (8 - i)),
          energyLevel: i > 7 ? 8 : Math.max(2, 8 - (8 - i)),
          caloriesConsumed: i > 7 ? 2000 : 2600, // stress eating during burnout
          calorieGoal: 2100,
        },
      });

      // Finance — stress-linked spending spike + late night pattern
      logs.push({
        userId: demoUser._id,
        domain: "finance",
        date: logDate,
        domainData: {
          amountSaved: i > 7 ? 50 : 0,
          discretionarySpent: i > 7 ? 20 : 20 + (8 - i) * 25,
          spendingCategory: i > 7 ? "food" : "entertainment",
          spendingTime: i > 7 ? 14 : 23, // afternoon vs late night
        },
      });

      // Career — aggressive overload (the trigger)
      logs.push({
        userId: demoUser._id,
        domain: "career",
        date: logDate,
        domainData: {
          hoursStudied: i > 7 ? 4 : 4 + (8 - i) * 0.5,
          productivityRating: i > 7 ? 8 : Math.max(3, 8 - (8 - i)),
          sessionsCompleted: i > 7 ? 2 : 1,
          courseName: "DSA Mastery",
        },
      });
    }

    // 5. Bulk insert all 42 logs (14 days * 3 domains) instantly
    await Log.insertMany(demoLogs);

    return NextResponse.json({ 
      success: true, 
      message: "Golden Demo Data injected successfully. Data shape strictly matches validation schemas.",
      dataStory: "Injected 14 days. Engineered a recent sleep dip and spending spike alongside high study hours."
    });

  } catch (error) {
    console.error("Demo Seed Error:", error);
    return NextResponse.json({ success: false, error: "Failed to seed demo data" }, { status: 500 });
  }
}