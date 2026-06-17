import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import AssetLiability from "@/models/AssetLiability";
import {
  calculateHealthScore,
  calculateFinanceScore,
  calculateCareerScore,
  calculateEarnedXP
} from "@/lib/logic/scoring";
import { generateAndStoreSnapshot } from "@/lib/services/snapshotService";
import { recalculateStreak } from "@/lib/logic/streak";
import { sampleAppleHealthData } from "@/lib/prototypeConnectors/sampleAppleHealth";
import { sampleBankingTemplate } from "@/lib/prototypeConnectors/sampleBanking";
import { sampleCourseraCourses } from "@/lib/prototypeConnectors/sampleCoursera";
import { sampleHungerBoxMealLog } from "@/lib/prototypeConnectors/sampleHungerBox";
import { waitUntil } from "@vercel/functions";

export async function POST(req: Request) {
  try {
    // 1. AUTHENTICATION & SESSION CHECK
    const session = await getSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { connector } = await req.json();
    if (!connector || !["apple", "bank", "coursera", "hungerbox"].includes(connector)) {
      return NextResponse.json({ error: "Invalid connector specified" }, { status: 400 });
    }

    console.log(`[Prototype Connector] ${connector} Triggered`);

    // 2. CONNECT TO DATABASE
    await connectDB();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User twin architecture not found" }, { status: 404 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const smoothingFactor = 0.25;
    let recalculatedScoreValue = 50;

    // 3. EXECUTE PIPELINE PER CONNECTOR
    if (connector === "apple") {
      console.log(`[Prototype Connector] Mock Dataset Loaded`);
      
      // Validation Check (Ensures steps, sleepHours, etc. exist and are valid)
      if (typeof sampleAppleHealthData.sleepHours !== "number" || sampleAppleHealthData.sleepHours < 0 || sampleAppleHealthData.sleepHours > 24) {
        throw new Error("Validation Failed: Invalid sleepHours telemetry");
      }
      if (typeof sampleAppleHealthData.workoutMinutes !== "number" || sampleAppleHealthData.workoutMinutes < 0 || sampleAppleHealthData.workoutMinutes > 300) {
        throw new Error("Validation Failed: Invalid workoutMinutes telemetry");
      }
      console.log(`[Prototype Connector] Validation Passed`);

      const sleepHours = sampleAppleHealthData.sleepHours;
      const workoutMinutes = sampleAppleHealthData.workoutMinutes;
      const stressLevel = 4; // Sensible default
      const waterGlasses = Math.round(sampleAppleHealthData.waterLitres * 4);

      // Create/Merge daily log for Health
      let existingLog = await Log.findOne({
        userId: user._id,
        domain: "health",
        date: { $gte: todayStart, $lte: todayEnd }
      });

      const domainData = {
        sleepHours,
        workoutMinutes,
        stressLevel,
        waterGlasses,
        mealsEatenToday: `Synced steps: ${sampleAppleHealthData.steps}, Resting HR: ${sampleAppleHealthData.restingHeartRate}bpm via Apple Health (Simulated)`,
        source: "apple-health-prototype",
        ingestedAt: new Date()
      };

      if (existingLog) {
        existingLog.domainData = {
          ...existingLog.domainData,
          ...domainData
        };
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          domain: "health",
          date: new Date(),
          domainData
        });
      }
      console.log(`[Prototype Connector] Database Updated`);

      // Recalculate Health Score using core logic
      const newScore = calculateHealthScore(sleepHours, workoutMinutes, stressLevel, waterGlasses);
      user.scores.health = Math.round((user.scores.health * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      recalculatedScoreValue = user.scores.health;
      console.log(`[Prototype Connector] Scores Recalculated`);

    } else if (connector === "bank") {
      console.log(`[Prototype Connector] Mock Dataset Loaded`);

      const income = user.profile?.monthlyIncome || 50000;
      const amountSaved = Math.round(income * (1 - (sampleBankingTemplate.foodPct + sampleBankingTemplate.transportPct + sampleBankingTemplate.shoppingPct + sampleBankingTemplate.utilitiesPct)));
      const discretionarySpent = Math.round(income * (sampleBankingTemplate.foodPct + sampleBankingTemplate.transportPct + sampleBankingTemplate.shoppingPct + sampleBankingTemplate.utilitiesPct));

      if (amountSaved < 0 || discretionarySpent < 0) {
        throw new Error("Validation Failed: Computed banking amounts are negative");
      }
      console.log(`[Prototype Connector] Validation Passed`);

      // Create/Merge daily log for Finance
      let existingLog = await Log.findOne({
        userId: user._id,
        domain: "finance",
        date: { $gte: todayStart, $lte: todayEnd }
      });

      const domainData = {
        amountSaved,
        discretionarySpent,
        spendingCategory: "other",
        spendingTime: new Date().getHours(),
        biggestExpenseToday: "Rent & Utilities (Simulated)",
        impulseSpend: false,
        source: "bank-prototype",
        ingestedAt: new Date()
      };

      if (existingLog) {
        existingLog.domainData = {
          ...existingLog.domainData,
          ...domainData
        };
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          domain: "finance",
          date: new Date(),
          domainData
        });
      }

      // Update Net Worth in AssetLiability collection
      let portfolio = await AssetLiability.findOne({ userId: user._id });
      if (!portfolio) {
        // Create a basic default portfolio if none exists
        portfolio = new AssetLiability({
          userId: user._id,
          assets: {
            liquid: {
              savingsAccounts: [
                {
                  id: "prototype-salary-acct",
                  bankName: "Syntra Federal Bank",
                  accountType: "salary",
                  balance: 10000,
                  lastUpdated: new Date()
                }
              ],
              fixedDeposits: [],
              recurringDeposits: [],
              cashInHand: 0,
              digitalWallets: 0
            },
            investments: {
              stocks: { brokerName: "", currentValue: 0, investedAmount: 0 },
              mutualFunds: [],
              ppf: { corpus: 0, annualContribution: 0, institution: "" },
              epf: { corpus: 0, employeeMonthlyContribution: 0, employerMonthlyContribution: 0, uan: "" },
              nps: { corpus: 0, pran: "", allocation: { equityPct: 50, corporatePct: 30, govtPct: 20 } },
              sgbBonds: [],
              usStocks: { platform: "", currentValueUSD: 0, exchangeRate: 83.5 }
            },
            physical: { properties: [], vehicles: [], goldJewellery: { weightGrams: 0, estimatedValue: 0 }, silverMetals: { weightGrams: 0, estimatedValue: 0 }, collectibles: [] },
            other: { businessOwnership: [], loansGiven: [], previousGratuity: 0 }
          },
          liabilities: {
            shortTerm: { creditCards: [], bnpl: [], personalLoans: [], informalLoans: [] },
            longTerm: { homeLoans: [], carLoans: [], educationLoans: [], businessLoans: [], loansAgainstProperty: [], goldLoans: [] },
            contingent: [],
            pendingTaxDues: 0,
            legalDisputes: []
          },
          protection: { termInsurance: [], endowmentPolicies: [] },
          familyOutflows: { children: [], caregiving: { parentHealthcareMonthly: 0, parentInsuranceAnnualPremium: 0, parentInsuranceCoverAmount: 0, monthlyRemittance: 0, householdHelpMonthly: 0 } }
        });
      }

      // Increment balance of the first savings account
      if (portfolio.assets?.liquid?.savingsAccounts && portfolio.assets.liquid.savingsAccounts.length > 0) {
        portfolio.assets.liquid.savingsAccounts[0].balance += amountSaved;
        portfolio.assets.liquid.savingsAccounts[0].lastUpdated = new Date();
      } else {
        portfolio.assets = portfolio.assets || {};
        portfolio.assets.liquid = portfolio.assets.liquid || {};
        portfolio.assets.liquid.savingsAccounts = [
          {
            id: "prototype-salary-acct",
            bankName: "Syntra Federal Bank",
            accountType: "salary",
            balance: 10000 + amountSaved,
            lastUpdated: new Date()
          }
        ];
      }
      portfolio.markModified("assets.liquid.savingsAccounts");
      await portfolio.save();
      console.log(`[Prototype Connector] Database Updated`);

      // Recalculate Finance Score
      const newScore = calculateFinanceScore(amountSaved, discretionarySpent, false, user.profile?.monthlyIncome, user.profile?.monthlyBudget);
      user.scores.finance = Math.round((user.scores.finance * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      recalculatedScoreValue = user.scores.finance;
      console.log(`[Prototype Connector] Scores Recalculated`);

    } else if (connector === "coursera") {
      console.log(`[Prototype Connector] Mock Dataset Loaded`);

      // Parse and check that mock course array has content
      if (!Array.isArray(sampleCourseraCourses) || sampleCourseraCourses.length === 0) {
        throw new Error("Validation Failed: Empty Coursera dataset");
      }
      console.log(`[Prototype Connector] Validation Passed`);

      // Extract skills and append uniquely to user profile
      const newSkills = Array.from(new Set(sampleCourseraCourses.flatMap(c => c.skills)));
      const existingSkills = user.profile?.skills || "";
      const currentSkillsList = existingSkills.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      const combinedSkills = Array.from(new Set([...currentSkillsList, ...newSkills]));
      
      user.profile = user.profile || {};
      user.profile.skills = combinedSkills.slice(0, 15).join(", ");
      user.markModified("profile");

      const completedCourses = sampleCourseraCourses.filter(c => c.status === "completed");

      // Log Coursera certification achievements
      let existingLog = await Log.findOne({
        userId: user._id,
        domain: "career",
        date: { $gte: todayStart, $lte: todayEnd }
      });

      const domainData = {
        hoursStudied: 4,
        productivityRating: 9,
        sessionsCompleted: completedCourses.length,
        courseName: completedCourses.map(c => c.title).join(", "),
        goalWorkedOn: "Upskilled via Coursera (Simulated)",
        blockerToday: "None",
        source: "coursera-prototype",
        ingestedAt: new Date()
      };

      if (existingLog) {
        existingLog.domainData = {
          ...existingLog.domainData,
          ...domainData
        };
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          domain: "career",
          date: new Date(),
          domainData
        });
      }
      console.log(`[Prototype Connector] Database Updated`);

      // Recalculate Career score
      const newScore = calculateCareerScore(4, 9); // Simulated study block
      user.scores.career = Math.round((user.scores.career * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      recalculatedScoreValue = user.scores.career;
      console.log(`[Prototype Connector] Scores Recalculated`);

    } else if (connector === "hungerbox") {
      console.log(`[Prototype Connector] Mock Dataset Loaded`);
      if (typeof sampleHungerBoxMealLog.estimatedCalories !== "number" || sampleHungerBoxMealLog.estimatedCalories <= 0) {
        throw new Error("Validation Failed: Invalid HungerBox calorie telemetry");
      }
      console.log(`[Prototype Connector] Validation Passed`);

      // Create/Merge daily log for Health
      let existingLog = await Log.findOne({
        userId: user._id,
        domain: "health",
        date: { $gte: todayStart, $lte: todayEnd }
      });

      const mealsDescription = `Breakfast: ${sampleHungerBoxMealLog.breakfast}, Lunch: ${sampleHungerBoxMealLog.lunch}, Snack: ${sampleHungerBoxMealLog.snack}, Dinner: ${sampleHungerBoxMealLog.dinner} (Synced from HungerBox)`;

      const domainData = {
        sleepHours: 7.5,
        workoutMinutes: 30,
        stressLevel: 3,
        waterGlasses: 8,
        caloriesConsumed: sampleHungerBoxMealLog.estimatedCalories,
        calorieGoal: 2000,
        mealsEatenToday: mealsDescription.slice(0, 400),
        source: "hungerbox-prototype",
        ingestedAt: new Date()
      };

      if (existingLog) {
        existingLog.domainData = {
          ...existingLog.domainData,
          ...domainData
        };
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          domain: "health",
          date: new Date(),
          domainData
        });
      }
      console.log(`[Prototype Connector] Database Updated`);

      // Recalculate Health score
      const newScore = calculateHealthScore(7.5, 30, 3, 8);
      user.scores.health = Math.round((user.scores.health * (1 - smoothingFactor)) + (newScore * smoothingFactor));
      recalculatedScoreValue = user.scores.health;
      console.log(`[Prototype Connector] Scores Recalculated`);
    }

    // 4. GAMIFICATION PROCESSING
    user.gamification.totalPoints += calculateEarnedXP(recalculatedScoreValue);

    // Recalculate logging streak
    await recalculateStreak(user);

    // Save user document
    await user.save();

    // 5. ASYNCHRONOUS AI SNAPSHOT PRE-GENERATION (forced regeneration)
    waitUntil(
      generateAndStoreSnapshot(user._id.toString(), user, undefined, true).catch(err => {
        console.error("[CRITICAL] Background Prototype Snapshot Failed:", err);
      })
    );
    console.log(`[Prototype Connector] AI Snapshot Triggered`);
    console.log(`[Prototype Connector] UI Refreshed`);

    return NextResponse.json({
      success: true,
      message: `Successfully simulated telemetry data for ${connector}. Ingestion pipeline ran and score recalculated.`,
      scores: user.scores
    });

  } catch (error: any) {
    console.error("PROTOTYPE CONNECTOR API ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to sync prototype connector telemetry" }, { status: 500 });
  }
}
