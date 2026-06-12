// src/lib/driftEngine.ts

export interface DomainDrift {
  actualAverage: number;
  targetValue: number;
  driftPercentage: number;   // Percentage deviation from target (e.g. -18.5% or +5.2%)
  volatilityIndex: number;   // Standard deviation scaled to a 0-10 index (higher means more volatile behavior)
  status: "optimal" | "stable" | "drifting" | "critical";
}

export interface BehavioralDriftReport {
  domains: {
    health: {
      sleep: DomainDrift;
      workouts: DomainDrift;
      stress: DomainDrift;
      hydration: DomainDrift;
      mealConsistency: DomainDrift;
    };
    finance: {
      spendingVsBudget: DomainDrift;
      savingsRate: DomainDrift;
    };
    career: {
      studyHours: DomainDrift;
      productivity: DomainDrift;
    };
  };
  globalDriftIndex: number;    // Consolidated drift score (0 to 100, where 0 is perfect alignment, 100 is severe drift)
  primaryDivergenceCause: string;
  recommendations: string[];
}

/**
 * Calculates standard deviation for a series of numeric metrics.
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculates the percentage divergence of actual metrics vs a configured target.
 * Clamps result between -100% and +200% for mathematical display safety.
 */
export function calculateTargetDrift(actual: number, target: number, inverse = false): number {
  if (target === 0) return actual > 0 ? 100 : 0;
  const deviation = inverse ? (target - actual) / target : (actual - target) / target;
  const pct = Math.round(deviation * 100);
  return Math.max(-100, Math.min(200, pct));
}

/**
 * Classifies the health of a specific biometric based on its target drift percentage.
 * (Negative drift is ALWAYS bad because calculateTargetDrift normalizes it).
 */
function classifyDriftStatus(driftPct: number): "optimal" | "stable" | "drifting" | "critical" {
  if (driftPct >= 0) return "optimal";
  if (driftPct >= -10) return "stable";
  if (driftPct >= -35) return "drifting";
  return "critical";
}

/**
 * Production-grade biometric Digital Twin Drift & Divergence Engine.
 * Evaluates raw MongoDB log data against operator baseline budgets and targets.
 */
export function analyzeBehavioralDrift(
  logs: any[],
  user: {
    profile?: {
      monthlyIncome?: number;
      monthlyBudget?: number;
      targetSavingsRate?: number;
    };
    scores?: {
      health: number;
      finance: number;
      career: number;
    };
  }
): BehavioralDriftReport {
  // 1. Gather all logs by domains
  const healthLogs = logs.filter(l => l.domain === "health");
  const financeLogs = logs.filter(l => l.domain === "finance");
  const careerLogs = logs.filter(l => l.domain === "career");

  // ── HEALTH METRICS ──
  const sleepList = healthLogs.map(l => l.domainData?.sleepHours).filter(v => typeof v === "number") as number[];
  const workoutList = healthLogs.map(l => l.domainData?.workoutMinutes).filter(v => typeof v === "number") as number[];
  const stressList = healthLogs.map(l => l.domainData?.stressLevel).filter(v => typeof v === "number") as number[];

  const avgSleep = sleepList.length > 0 ? sleepList.reduce((a, b) => a + b, 0) / sleepList.length : 7.5;
  const avgWorkout = workoutList.length > 0 ? (workoutList.reduce((a, b) => a + b, 0) / workoutList.length) * 7 : 180; // weekly extrapolated
  const avgStress = stressList.length > 0 ? stressList.reduce((a, b) => a + b, 0) / stressList.length : 4.0;

  const targetSleep = 7.5; // Benchmark sleep hours
  const targetWorkout = 150; // WHO minimum target weekly workout minutes
  const targetStress = 4.0; // Target baseline stress index ceiling

  const sleepDriftPct = calculateTargetDrift(avgSleep, targetSleep);
  const workoutDriftPct = calculateTargetDrift(avgWorkout, targetWorkout);
  const stressDriftPct = calculateTargetDrift(avgStress, targetStress, true); // Inverse: higher stress is negative drift

  const sleepSD = calculateStandardDeviation(sleepList);
  const sleepVolatility = Math.min(10, Math.round((sleepSD / 2) * 10)); // SD of 2h = index 10

  const workoutSD = calculateStandardDeviation(workoutList);
  const workoutVolatility = Math.min(10, Math.round((workoutSD / 45) * 10));

  const stressSD = calculateStandardDeviation(stressList);
  const stressVolatility = Math.min(10, Math.round((stressSD / 2.5) * 10));

  // ── HYDRATION METRICS ──
  const waterList = healthLogs.map(l => l.domainData?.waterGlasses).filter(v => typeof v === "number") as number[];
  const avgWater = waterList.length > 0 ? waterList.reduce((a, b) => a + b, 0) / waterList.length : 8;
  const targetWater = 8; // 8 glasses/day WHO recommendation
  const waterDriftPct = calculateTargetDrift(avgWater, targetWater);
  const waterSD = calculateStandardDeviation(waterList);
  const waterVolatility = Math.min(10, Math.round((waterSD / 2) * 10));

  // ── MEAL CONSISTENCY METRICS ──
  const mealLogDays = healthLogs.filter(l => Array.isArray(l.domainData?.skippedMeals));
  const avgMealConsistency = mealLogDays.length > 0
    ? Math.round(
        mealLogDays.filter(l => l.domainData.skippedMeals.length === 0).length
        / mealLogDays.length * 100
      )
    : 100; // assume full consistency if never logged
  const targetMealConsistency = 100; // Target 100% consistency (no skipped meals)
  const mealConsistencyDriftPct = calculateTargetDrift(avgMealConsistency, targetMealConsistency);
  const skippedCountList = mealLogDays.map(l => l.domainData?.skippedMeals?.length || 0);
  const mealSD = calculateStandardDeviation(skippedCountList);
  const mealVolatility = Math.min(10, Math.round(mealSD * 5)); // SD of 2 skipped meals = index 10

  // ── FINANCE METRICS ──
  const discretionarySpentList = financeLogs.map(l => l.domainData?.discretionarySpent).filter(v => typeof v === "number") as number[];
  const amountSavedList = financeLogs.map(l => l.domainData?.amountSaved).filter(v => typeof v === "number") as number[];

  const dailyBudgetLimit = ((user.profile?.monthlyBudget || 15000) / 30);
  const avgDailySpend = discretionarySpentList.length > 0 
    ? discretionarySpentList.reduce((a, b) => a + b, 0) / discretionarySpentList.length 
    : dailyBudgetLimit;

  const actualIncome = user.profile?.monthlyIncome || 50000;
  const totalSaved = amountSavedList.reduce((a, b) => a + b, 0);
  const currentSavingsRate = actualIncome > 0 ? Math.round((totalSaved / actualIncome) * 100) : 0;
  const targetSavingsRate = user.profile?.targetSavingsRate || 20;

  const spendingDriftPct = calculateTargetDrift(avgDailySpend, dailyBudgetLimit, true); // Inverse: higher spending is negative
  const savingsRateDriftPct = calculateTargetDrift(currentSavingsRate, targetSavingsRate);

  const spendSD = calculateStandardDeviation(discretionarySpentList);
  const spendVolatility = Math.min(10, Math.round((spendSD / (dailyBudgetLimit * 0.4 || 1)) * 10));

  // ── CAREER METRICS ──
  const studyHoursList = careerLogs.map(l => l.domainData?.hoursStudied).filter(v => typeof v === "number") as number[];
  const productivityList = careerLogs.map(l => l.domainData?.productivityRating).filter(v => typeof v === "number") as number[];

  const avgStudyHours = studyHoursList.length > 0 ? (studyHoursList.reduce((a, b) => a + b, 0) / studyHoursList.length) * 7 : 10.0; // weekly extrapolated
  const avgProductivity = productivityList.length > 0 ? productivityList.reduce((a, b) => a + b, 0) / productivityList.length : 6.0;

  const targetStudyHours = 14.0; // Target 14 hours of upskilling per week
  const targetProductivity = 7.0; // Target baseline productivity index

  const studyDriftPct = calculateTargetDrift(avgStudyHours, targetStudyHours);
  const productivityDriftPct = calculateTargetDrift(avgProductivity, targetProductivity);

  const studySD = calculateStandardDeviation(studyHoursList);
  const studyVolatility = Math.min(10, Math.round((studySD / 2) * 10));

  const prodSD = calculateStandardDeviation(productivityList);
  const prodVolatility = Math.min(10, Math.round((prodSD / 2) * 10));

  // ── GLOBAL CONSOLIDATION ──
  const healthSleepDrift = sleepDriftPct;
  const financeSpendingDrift = spendingDriftPct;
  const careerStudyDrift = studyDriftPct;

  // Global Drift Index: average absolute negative drifts (0 to 100)
  const negativeDrifts = [
    healthSleepDrift < 0 ? Math.abs(healthSleepDrift) : 0,
    workoutDriftPct < 0 ? Math.abs(workoutDriftPct) : 0,
    stressDriftPct < 0 ? Math.abs(stressDriftPct) : 0,
    waterDriftPct < 0 ? Math.abs(waterDriftPct) : 0,
    mealConsistencyDriftPct < 0 ? Math.abs(mealConsistencyDriftPct) : 0,
    spendingDriftPct < 0 ? Math.abs(spendingDriftPct) : 0,
    savingsRateDriftPct < 0 ? Math.abs(savingsRateDriftPct) : 0,
    studyDriftPct < 0 ? Math.abs(studyDriftPct) : 0,
    productivityDriftPct < 0 ? Math.abs(productivityDriftPct) : 0,
  ];
  
  const globalDriftIndex = Math.min(100, Math.round(negativeDrifts.reduce((a, b) => a + b, 0) / negativeDrifts.length));

  // Identify Primary Divergence Cause
  let primaryDivergenceCause = "biometric trajectory in optimal sync.";
  let maxNegativeDrift = 0;

  const driftPairs: { label: string; val: number }[] = [
    { label: "sleep deficit causing circadian disruption", val: sleepDriftPct },
    { label: "exercise gaps slowing somatic performance", val: workoutDriftPct },
    { label: "heightened stress elevating cortisol indicators", val: stressDriftPct },
    { label: "dehydration impairing cognitive and metabolic function", val: waterDriftPct },
    { label: "irregular meal patterns or skipped meals affecting energy stability", val: mealConsistencyDriftPct },
    { label: "budget overruns degrading discretionary savings", val: spendingDriftPct },
    { label: "savings rate lagging behind configured baseline targets", val: savingsRateDriftPct },
    { label: "upskilling studies dropping below carrier acceleration limits", val: studyDriftPct },
    { label: "volatile daily productivity cycles", val: productivityDriftPct },
  ];

  for (const pair of driftPairs) {
    if (pair.val < 0 && Math.abs(pair.val) > maxNegativeDrift) {
      maxNegativeDrift = Math.abs(pair.val);
      primaryDivergenceCause = pair.label;
    }
  }

  // Construct recommendations
  const recommendations: string[] = [];
  if (sleepDriftPct < -10) {
    recommendations.push(`Sleep has drifted ${Math.abs(sleepDriftPct)}% below target. Standardize screen shutdown to recover baseline.`);
  }
  if (spendingDriftPct < -15) {
    recommendations.push(`Discretionary spending is ${Math.abs(spendingDriftPct)}% over daily limits. Enforce a 24h cooling off period on non-essentials.`);
  }
  if (studyDriftPct < -15) {
    recommendations.push(`Weekly study hours are lagging ${Math.abs(studyDriftPct)}% behind targets. Stack a 30-minute block immediately after your morning coffee.`);
  }
  if (waterDriftPct < -20) {
    recommendations.push(`Hydration is ${Math.abs(waterDriftPct)}% below the 8-glass daily target (Avg: ${avgWater.toFixed(1)} glasses). Set hourly water reminders.`);
  }
  if (mealConsistencyDriftPct < -10) {
    recommendations.push(`Meal consistency is ${Math.abs(mealConsistencyDriftPct)}% below target (Avg: ${avgMealConsistency}% consistent). Avoid skipping meals to maintain steady somatic energy.`);
  }
  if (recommendations.length === 0) {
    recommendations.push("Biometrics nominal. Continue standard logging schedules to optimize the Twin predictive vectors.");
  }

  return {
    domains: {
      health: {
        sleep: {
          actualAverage: +avgSleep.toFixed(1),
          targetValue: targetSleep,
          driftPercentage: sleepDriftPct,
          volatilityIndex: sleepVolatility,
          status: classifyDriftStatus(sleepDriftPct),
        },
        workouts: {
          actualAverage: Math.round(avgWorkout),
          targetValue: targetWorkout,
          driftPercentage: workoutDriftPct,
          volatilityIndex: workoutVolatility,
          status: classifyDriftStatus(workoutDriftPct),
        },
        stress: {
          actualAverage: +avgStress.toFixed(1),
          targetValue: targetStress,
          driftPercentage: stressDriftPct,
          volatilityIndex: stressVolatility,
          status: classifyDriftStatus(stressDriftPct),
        },
        hydration: {
          actualAverage: +avgWater.toFixed(1),
          targetValue: targetWater,
          driftPercentage: waterDriftPct,
          volatilityIndex: waterVolatility,
          status: classifyDriftStatus(waterDriftPct),
        },
        mealConsistency: {
          actualAverage: avgMealConsistency,
          targetValue: targetMealConsistency,
          driftPercentage: mealConsistencyDriftPct,
          volatilityIndex: mealVolatility,
          status: classifyDriftStatus(mealConsistencyDriftPct),
        }
      },
      finance: {
        spendingVsBudget: {
          actualAverage: Math.round(avgDailySpend),
          targetValue: Math.round(dailyBudgetLimit),
          driftPercentage: spendingDriftPct,
          volatilityIndex: spendVolatility,
          status: classifyDriftStatus(spendingDriftPct),
        },
        savingsRate: {
          actualAverage: currentSavingsRate,
          targetValue: targetSavingsRate,
          driftPercentage: savingsRateDriftPct,
          volatilityIndex: 0,
          status: classifyDriftStatus(savingsRateDriftPct),
        }
      },
      career: {
        studyHours: {
          actualAverage: +avgStudyHours.toFixed(1),
          targetValue: targetStudyHours,
          driftPercentage: studyDriftPct,
          volatilityIndex: studyVolatility,
          status: classifyDriftStatus(studyDriftPct),
        },
        productivity: {
          actualAverage: +avgProductivity.toFixed(1),
          targetValue: targetProductivity,
          driftPercentage: productivityDriftPct,
          volatilityIndex: prodVolatility,
          status: classifyDriftStatus(productivityDriftPct),
        }
      }
    },
    globalDriftIndex,
    primaryDivergenceCause,
    recommendations,
  };
}
