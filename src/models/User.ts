// src/models/User.ts
import mongoose, { Schema, Document, models } from "mongoose";

// 1. Milestone Interface (NEW)
export interface IMilestone {
  text: string;
  completed: boolean;
}

// 2. Goal Interface (UPDATED)
export interface IGoal {
  _id?: mongoose.Types.ObjectId;
  title: string;
  domain: string;
  priority: string;
  targetDate?: Date; // NEW: Timeline tracking
  milestones: IMilestone[]; // NEW: Milestone tracking
}

// 3. Main User Interface (UPDATED)
export interface IUser extends Document {
  email: string;
  name: string;
  password?: string;
  age?: number;
  avatarId: number;
  optimizationVector?: "health" | "finance" | "career";
  personalMission?: string;
  healthConstraints?: string;
  profile: {
    monthlyIncome: number;
    monthlyBudget: number;
    targetSavingsRate: number;
    // Extended Onboarding Profile Fields (for viewing and editing)
    gender?: string;
    height?: number;
    weight?: number;
    averageSleep?: number;
    workoutFrequency?: number;
    activityLevel?: string;
    currentSavings?: number;
    spendingStyle?: number;
    hoursStudied?: number;
    learningProfile?: string;
    archetype?: string;
  };
  scores: {
    health: number;
    finance: number;
    career: number;
  };
  gamification: {
    totalPoints: number;
    currentStreak: number;
    lastLogDate: Date;
    lastChallengeDate?: Date | null;
  };
  badges: string[]; // NEW: Gamification Badges
  relations?: {
    relationshipStatus: "Single" | "Partnered" | "Married" | "Separated";
    householdMembers: Array<{ relationshipType: "partner" | "child" | "parent" | "sibling" }>;
    dependents: Array<{ type: "child" | "elderly_parent"; age: number }>;
  };
  supportNetwork?: Array<{
    name: string;
    relationshipType: string;
    tag: "venting" | "advice" | "distraction" | "motivation";
  }>;
  goals: IGoal[];
  aiSnapshot?: {
    dailyReflection: any;
    lastGeneratedAt: Date | null;
  };
  googleFit?: {
    accessToken: string;
    refreshToken: string;
    expiryDate: Date;
    syncActive: boolean;
    lastSyncedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 4. Milestone Schema (NEW)
const MilestoneSchema = new Schema<IMilestone>({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

// 5. Goal Schema (Embedded & UPDATED)
const GoalSchema = new Schema<IGoal>(
  {
    title: { type: String, required: true },
    domain: { type: String, required: true },
    priority: { type: String, required: true },
    targetDate: { type: Date }, // NEW
    milestones: [MilestoneSchema], // NEW
  },
  { _id: true }
);

// 6. Main User Schema (UPDATED)
const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    password: { type: String, required: true, select: false },
    
    // Onboarding Fields
    age: { type: Number },
    avatarId: { type: Number, default: 1 },
    optimizationVector: { type: String, enum: ["health", "finance", "career"], default: "career" },
    personalMission: { type: String, default: "" },
    healthConstraints: { type: String, default: "none" },

    // Grouped Scores
    scores: {
      health: { type: Number, default: 50 },
      finance: { type: Number, default: 50 },
      career: { type: Number, default: 50 },
    },

    // Grouped Gamification State
    gamification: {
      totalPoints: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      lastLogDate: { type: Date, default: null },
      lastChallengeDate: { type: Date, default: null },
    },

    // Gamification Badges Array (NEW)
    badges: { type: [String], default: [] }, 

    relations: {
      relationshipStatus: { type: String, enum: ["Single", "Partnered", "Married", "Separated"], default: "Single" },
      householdMembers: [{
        relationshipType: { type: String, enum: ["partner", "child", "parent", "sibling"] }
      }],
      dependents: [{
        type: { type: String, enum: ["child", "elderly_parent"] },
        age: { type: Number }
      }]
    },
    supportNetwork: [{
      name: { type: String, required: true },
      relationshipType: { type: String },
      tag: { type: String, enum: ["venting", "advice", "distraction", "motivation"] }
    }],

    // Goals Array
    goals: [GoalSchema],

    profile: {
      monthlyIncome: { type: Number, default: 0 },
      monthlyBudget: { type: Number, default: 0 },
      targetSavingsRate: { type: Number, default: 20 },
      
      // Extended Onboarding Profile Fields
      gender: { type: String, default: "male" },
      height: { type: Number, default: 175 },
      weight: { type: Number, default: 70 },
      averageSleep: { type: Number, default: 7 },
      workoutFrequency: { type: Number, default: 3 },
      activityLevel: { type: String, default: "moderately_active" },
      currentSavings: { type: Number, default: 0 },
      spendingStyle: { type: Number, default: 3 },
      hoursStudied: { type: Number, default: 3 },
      learningProfile: { type: String, default: "" },
      archetype: { type: String, default: "" },
    },

    aiSnapshot: {
      dailyReflection: { type: Object, default: null }, // Stores the parsed JSON
      lastGeneratedAt: { type: Date, default: null },   // Timestamp of last run
    },
    googleFit: {
      accessToken: { type: String },
      refreshToken: { type: String },
      expiryDate: { type: Date },
      syncActive: { type: Boolean, default: false },
      lastSyncedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// 7. Model Export (with Next.js hot-reload protection)
const User = models.User || mongoose.model<IUser>("User", UserSchema);

export default User;