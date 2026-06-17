//src/lib/validators.ts
import { z } from "zod";

// ─── INGESTION SCHEMAS ────────────────────────────────────────────

const HealthDataSchema = z.object({
  // Mandatory
  sleepHours: z.number().min(0).max(24),
  workoutMinutes: z.number().min(0).max(300),
  stressLevel: z.number().min(1).max(10),
  // Optional — enrich AI context
  moodScore: z.number().min(1).max(10).optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  caloriesConsumed: z.number().min(0).max(10000).optional(),
  calorieGoal: z.number().min(0).max(10000).optional(),
  waterGlasses: z.number().min(0).max(20).optional(),
  skippedMeals: z.array(z.enum(["breakfast", "lunch", "dinner"])).optional(),
  mealsEatenToday: z.string().max(400).optional(),
  spentTimeWithFriends: z.boolean().optional(),
  socialCount: z.number().min(0).optional(),
  relationshipQuality: z.number().min(1).max(5).optional(),
});

const FinanceDataSchema = z.object({
  // Mandatory
  amountSaved: z.number().min(0),
  discretionarySpent: z.number().min(0),
  // Optional
  spendingCategory: z.enum([
    "food", "entertainment", "shopping", "transport", "other"
  ]).optional(),
  // Auto-injected server-side — never from form
  spendingTime: z.number().min(0).max(23).optional(),
  biggestExpenseToday: z.string().max(100).optional(),
  impulseSpend: z.boolean().optional(),
});

const CareerDataSchema = z.object({
  // Mandatory
  hoursStudied: z.number().min(0).max(24),
  productivityRating: z.number().min(1).max(10),
  // Optional
  sessionsCompleted: z.number().min(0).optional(),
  courseName: z.string().max(100).optional(),
  goalWorkedOn: z.string().max(200).optional(),
  blockerToday: z.string().max(200).optional(),
});

export const IngestionSchema = z.discriminatedUnion("domain", [
  z.object({ domain: z.literal("health"), data: HealthDataSchema }),
  z.object({ domain: z.literal("finance"), data: FinanceDataSchema }),
  z.object({ domain: z.literal("career"), data: CareerDataSchema }),
]);

// ─── UNIFIED DAILY LOG SCHEMA ─────────────────────────────────────
// Single-submit endpoint: all 3 domains + optional daily reflection note
export const DailyLogSchema = z.object({
  health: HealthDataSchema,
  finance: FinanceDataSchema,
  career: CareerDataSchema,
  dailyNote: z.string().max(500).optional(),
});

// ─── SIGNUP SCHEMA ────────────────────────────────────────────────

export const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  age: z.string()
    .refine((val) => parseInt(val) >= 13, "Must be at least 13")
    .optional(),
  avatarId: z.number().int().positive(),
  // Profile fields — set once at signup
  monthlyIncome: z.number().min(0).optional(),
  monthlyBudget: z.number().min(0).optional(),
});