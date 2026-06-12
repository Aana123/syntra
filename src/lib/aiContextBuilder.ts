// src/lib/aiContextBuilder.ts
import type { TwinContext } from "@/types/ai";
import { memoize } from "@/lib/memoize";

function calculateTwinContext(
  logs: any[],
  userProfile?: { 
    monthlyIncome?: number; 
    monthlyBudget?: number;
    relations?: any;
    supportNetwork?: any[];
    familyOutflows?: any;
  }
): TwinContext {
  const healthLogs = logs.filter(l => l.domain === "health");
  const financeLogs = logs.filter(l => l.domain === "finance");
  const careerLogs = logs.filter(l => l.domain === "career");

  // ─── Helpers ────────────────────────────────────────────────────
  const avg = (arr: number[]) =>
    arr.length
      ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      : 0;

  const getTrend = (values: number[]): "improving" | "declining" | "stable" => {
    if (values.length < 2) return "stable";
    const first = values[0];
    const last = values[values.length - 1];
    if (last > first * 1.1) return "improving";
    if (last < first * 0.9) return "declining";
    return "stable";
  };

  // ─── Health ─────────────────────────────────────────────────────
  const sleepValues = healthLogs
    .map(l => l.domainData?.sleepHours)
    .filter((v): v is number => typeof v === "number");

  const workoutFlags = healthLogs
    .map(l => (l.domainData?.workoutMinutes > 0 ? 1 : 0));

  const stressValues = healthLogs
    .map(l => l.domainData?.stressLevel)
    .filter((v): v is number => typeof v === "number");

  const moodValues = healthLogs
    .map(l => l.domainData?.moodScore)
    .filter((v): v is number => typeof v === "number");

  const energyValues = healthLogs
    .map(l => l.domainData?.energyLevel)
    .filter((v): v is number => typeof v === "number");

  // Calorie adherence — only when both fields present
  const calorieEntries = healthLogs.filter(
    l => l.domainData?.caloriesConsumed && l.domainData?.calorieGoal
  );
  const calorieAdherence = calorieEntries.length > 0
    ? Math.round(
        calorieEntries.filter(l =>
          Math.abs(l.domainData.caloriesConsumed - l.domainData.calorieGoal)
          / l.domainData.calorieGoal < 0.15
        ).length / calorieEntries.length * 100
      )
    : 50; // neutral when no calorie data

  // Water intake (hydration tracking)
  const waterValues = healthLogs
    .map(l => l.domainData?.waterGlasses)
    .filter((v): v is number => typeof v === "number");

  // Social count & Relationship quality values
  const socialCountValues = healthLogs
    .map(l => l.domainData?.socialCount)
    .filter((v): v is number => typeof v === "number");

  const relationshipQualityValues = healthLogs
    .map(l => l.domainData?.relationshipQuality)
    .filter((v): v is number => typeof v === "number");

  // Meal consistency — count days with no skipped meals
  const mealLogDays = healthLogs.filter(l => Array.isArray(l.domainData?.skippedMeals));
  const mealConsistency = mealLogDays.length > 0
    ? Math.round(
        mealLogDays.filter(l => l.domainData.skippedMeals.length === 0).length
        / mealLogDays.length * 100
      )
    : 100; // assume full consistency if never logged

  // Skipped meal pattern — which meals are skipped most?
  const allSkipped: string[] = [];
  mealLogDays.forEach(l => {
    if (Array.isArray(l.domainData.skippedMeals)) {
      allSkipped.push(...l.domainData.skippedMeals);
    }
  });
  const skipCounts: Record<string, number> = {};
  allSkipped.forEach(m => { skipCounts[m] = (skipCounts[m] || 0) + 1; });
  const totalLogDays = Math.max(mealLogDays.length, 1);
  const skippedMealPattern = Object.entries(skipCounts)
    .map(([meal, count]) => `skipped ${meal} ${count}/${totalLogDays} days`)
    .join(", ") || "no skipped meals detected";

  // ─── Finance ────────────────────────────────────────────────────
  const savedValues = financeLogs
    .map(l => l.domainData?.amountSaved)
    .filter((v): v is number => typeof v === "number");

  const spentValues = financeLogs
    .map(l => l.domainData?.discretionarySpent)
    .filter((v): v is number => typeof v === "number");

  const spendingTimes = financeLogs
    .map(l => l.domainData?.spendingTime)
    .filter((v): v is number => typeof v === "number");

  // Biggest expense names — for spending pattern analysis
  const expenseNames = financeLogs
    .map(l => l.domainData?.biggestExpenseToday)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  // Frequency count to find top spending categories
  const expenseFreq: Record<string, number> = {};
  expenseNames.forEach(n => { expenseFreq[n.toLowerCase()] = (expenseFreq[n.toLowerCase()] || 0) + 1; });
  const topExpenseNames = Object.entries(expenseFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name} (${count}x)`);

  // Impulse spend rate
  const impulseFlags = financeLogs
    .map(l => l.domainData?.impulseSpend)
    .filter((v): v is boolean => typeof v === "boolean");
  const impulseSpendRate = impulseFlags.length > 0
    ? Math.round(impulseFlags.filter(v => v === true).length / impulseFlags.length * 100)
    : 0;

  // ─── Career ─────────────────────────────────────────────────────
  const studyValues = careerLogs
    .map(l => l.domainData?.hoursStudied)
    .filter((v): v is number => typeof v === "number");

  const productivityValues = careerLogs
    .map(l => l.domainData?.productivityRating)
    .filter((v): v is number => typeof v === "number");

  // Course names — deduplicated, most recent first, capped
  const courseNames = careerLogs
    .map(l => l.domainData?.courseName)
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map(v => v.slice(0, 60));
  const recentCourseNames = [...new Set(courseNames)].slice(0, 3);

  // Goal worked on — most recent 3, capped
  const goalFocusEntries = careerLogs
    .map(l => l.domainData?.goalWorkedOn)
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map(v => v.slice(0, 80));
  const recentGoalFocus = goalFocusEntries.slice(0, 3);

  // Blockers — most recent 3, capped
  const blockerEntries = careerLogs
    .map(l => l.domainData?.blockerToday)
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map(v => v.slice(0, 80));
  const recentBlockers = blockerEntries.slice(0, 3);

  // ─── Reflection / Daily Notes ───────────────────────────────────
  const reflectionLogs = logs.filter(l => l.domain === "reflection");
  const recentDailyNotes = reflectionLogs
    .map(l => l.domainData?.note)
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map(v => v.slice(0, 120))
    .slice(0, 3);

  // Meals/Foods Eaten — most recent 5, capped to prevent token bloat
  const mealsEatenList = healthLogs
    .map(l => l.domainData?.mealsEatenToday)
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map(v => v.slice(0, 100));
  const recentMealsEaten = mealsEatenList.slice(0, 5);

  // ─── Derived ────────────────────────────────────────────────────
  const avgSleep = avg(sleepValues);
  const avgStress = avg(stressValues);
  const avgSpent = avg(spentValues);
  const avgSaved = avg(savedValues);
  const avgMood = avg(moodValues);
  const weeklyWorkouts = healthLogs.length >= 7
    ? Math.round(avg(workoutFlags) * 7 * 10) / 10
    : healthLogs.filter(l => l.domainData?.workoutMinutes > 0).length;

  // Use profile for income/budget if available — otherwise derive from logs
  const monthlyIncome = userProfile?.monthlyIncome || 0;
  const monthlyBudget = userProfile?.monthlyBudget || 0;

  const savingsRate = monthlyIncome > 0
    ? Math.round((avgSaved * 30 / monthlyIncome) * 100)
    : 0;

  const spendingVsBudget = monthlyBudget > 0
    ? Math.round(((avgSpent * 30 - monthlyBudget) / monthlyBudget) * 100)
    : 0;

  // ─── Weekend dropoff ────────────────────────────────────────────
  const weekendCount = logs.filter(l => {
    const day = new Date(l.date).getDay();
    return day === 0 || day === 6;
  }).length;
  const weekdayCount = logs.length - weekendCount;
  const weekendDropoff = weekdayCount > 0 &&
    weekendCount < weekdayCount * 0.4;

  // ─── Late night spending ─────────────────────────────────────────
  const lateNightSpending = spendingTimes.length > 0 &&
    spendingTimes.filter(t => t >= 22).length > spendingTimes.length * 0.3;

  // ─── Correlation flags (Paired Day-by-Day Anomaly Detection) ──────
  const logsByDate: Record<string, any[]> = {};
  for (const log of logs) {
    if (!log.date) continue;
    const d = new Date(log.date);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!logsByDate[dateKey]) {
      logsByDate[dateKey] = [];
    }
    logsByDate[dateKey].push(log);
  }

  let stressSpendingDays = 0;
  let sleepCareerDays = 0;
  let lowMoodNoWorkoutDays = 0;
  let loggedMoodDays = 0;

  for (const dateKey of Object.keys(logsByDate)) {
    const dailyLogs = logsByDate[dateKey];
    const healthLog = dailyLogs.find(l => l.domain === "health");
    const financeLog = dailyLogs.find(l => l.domain === "finance");
    const careerLog = dailyLogs.find(l => l.domain === "career");

    if (healthLog && financeLog) {
      const stress = healthLog.domainData?.stressLevel;
      const spent = financeLog.domainData?.discretionarySpent;
      if (typeof stress === "number" && typeof spent === "number") {
        if (stress > 7 && spent > 100) {
          stressSpendingDays++;
        }
      }
    }

    if (healthLog && careerLog) {
      const sleep = healthLog.domainData?.sleepHours;
      const prod = careerLog.domainData?.productivityRating;
      if (typeof sleep === "number" && typeof prod === "number") {
        if (sleep < 6 && prod < 5) {
          sleepCareerDays++;
        }
      }
    }

    if (healthLog) {
      const workout = healthLog.domainData?.workoutMinutes || 0;
      const mood = healthLog.domainData?.moodScore;
      if (typeof mood === "number") {
        loggedMoodDays++;
        if (workout === 0 && mood < 5) {
          lowMoodNoWorkoutDays++;
        }
      }
    }
  }

  const stressSpendingCorrelation = stressSpendingDays > 0;
  const sleepCareerCorrelation = sleepCareerDays > 0;
  const workoutMoodCorrelation = loggedMoodDays > 0 && lowMoodNoWorkoutDays > 0;

  return {
    weeklyAverages: {
      sleep: avgSleep,
      workout: weeklyWorkouts,
      studyHours: avg(studyValues) * 7,
      savingsRate,
      moodScore: avgMood || 5,
      stressLevel: avgStress,
      calorieAdherence,
      spendingVsBudget,
      waterIntake: avg(waterValues),
      mealConsistency,
      socialCount: avg(socialCountValues),
      relationshipQuality: avg(relationshipQualityValues),
    },
    trends: {
      sleep: getTrend(sleepValues),
      productivity: getTrend(productivityValues),
      finance: getTrend(savedValues),
      health: getTrend(
        energyValues.length > 0 ? energyValues
        : moodValues.length > 0 ? moodValues
        : sleepValues
      ),
    },
    behaviorFlags: {
      stressSpendingCorrelation,
      sleepCareerCorrelation,
      workoutMoodCorrelation,
      lateNightSpending,
      weekendDropoff,
    },
    qualitative: {
      recentDailyNotes,
      recentCourseNames,
      recentGoalFocus,
      recentBlockers,
      topExpenseNames,
      impulseSpendRate,
      skippedMealPattern,
      recentMealsEaten,
    },
    logCount: logs.length,
    daysActive: Math.min(Math.floor(logs.length / 3), 14),
    relations: userProfile?.relations || null,
    supportNetwork: userProfile?.supportNetwork || [],
    familyOutflows: userProfile?.familyOutflows || null,
  };
}

// Caches the math for 5 minutes.
export const buildTwinContext = memoize(calculateTwinContext, { ttlMs: 1000 * 60 * 5 });