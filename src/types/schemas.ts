import { z } from "zod";

// This exactly mirrors your aitwinReflectionResponse interface, 
// but Zod can actually enforce it at runtime!
export const aitwinReflectionSchema = z.object({
  twinPrediction: z.string(),
  dailyReflection: z.string(),
  explainability: z.array(z.string()).min(2), // Forces at least 2 items!
  dailyChallenge: z.string(),
  recommendations: z.object({
    health: z.array(z.string()),
    finance: z.array(z.string()),
    career: z.array(z.string()),
  }),
  riskAlerts: z.array(z.string()),
  confidence: z.number().min(0).max(100), // Forces a number between 0 and 100
});