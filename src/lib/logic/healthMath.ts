export interface HealthMetrics {
  sleepHours?: number;
  avgHeartRate?: number;
  hrv?: number;
  steps?: number;
  workoutsCount?: number;
  stressLevel?: number;
}

/**
 * Summarizes health data over the last 15 days of logs.
 */
export function getAverageHealthMetrics(logs: any[]): HealthMetrics {
  const healthLogs = logs.filter(l => l.domain === "health");
  if (healthLogs.length === 0) return {};

  let sleepSum = 0, sleepCount = 0;
  let hrSum = 0, hrCount = 0;
  let hrvSum = 0, hrvCount = 0;
  let stepsSum = 0, stepsCount = 0;
  let workoutsTotal = 0;
  let stressSum = 0, stressCount = 0;

  healthLogs.forEach(l => {
    const data = l.domainData || {};
    if (typeof data.sleepHours === "number" && data.sleepHours > 0) {
      sleepSum += data.sleepHours;
      sleepCount++;
    }
    if (typeof data.avgHeartRate === "number" && data.avgHeartRate > 0) {
      hrSum += data.avgHeartRate;
      hrCount++;
    }
    if (typeof data.hrv === "number" && data.hrv > 0) {
      hrvSum += data.hrv;
      hrvCount++;
    }
    if (typeof data.steps === "number" && data.steps > 0) {
      stepsSum += data.steps;
      stepsCount++;
    }
    if (data.workouts && Array.isArray(data.workouts)) {
      workoutsTotal += data.workouts.length;
    }
    if (typeof data.stressLevel === "number" && data.stressLevel > 0) {
      stressSum += data.stressLevel;
      stressCount++;
    }
  });

  return {
    sleepHours: sleepCount > 0 ? sleepSum / sleepCount : undefined,
    avgHeartRate: hrCount > 0 ? hrSum / hrCount : undefined,
    hrv: hrvCount > 0 ? hrvSum / hrvCount : undefined,
    steps: stepsCount > 0 ? stepsSum / stepsCount : undefined,
    workoutsCount: healthLogs.length > 0 ? workoutsTotal / healthLogs.length : undefined,
    stressLevel: stressCount > 0 ? stressSum / stressCount : undefined,
  };
}

/**
 * Computes Recovery Score (0-100) based on:
 * - Sleep hours (40% weight): Target 7.5h - 9.0h.
 * - Avg resting Heart Rate (30% weight): Target < 60 bpm.
 * - HRV (30% weight): Target > 65 ms.
 */
export function calculateRecoveryScore(metrics: HealthMetrics): number {
  const sleep = metrics.sleepHours ?? 7.5;
  const hr = metrics.avgHeartRate ?? 65;
  const hrv = metrics.hrv ?? 55;

  let sleepScore = 100;
  if (sleep < 7.5) {
    sleepScore = Math.max(0, 100 - (7.5 - sleep) * 20);
  } else if (sleep > 9.0) {
    sleepScore = Math.max(70, 100 - (sleep - 9.0) * 15);
  }

  let hrScore = 100;
  if (hr > 60) {
    hrScore = Math.max(0, 100 - (hr - 60) * 3);
  }

  let hrvScore = 100;
  if (hrv < 65) {
    hrvScore = Math.max(0, (hrv / 65) * 100);
  }

  const finalScore = (sleepScore * 0.4) + (hrScore * 0.3) + (hrvScore * 0.3);
  return Math.round(finalScore);
}

/**
 * Computes Fatigue Index (0-100) based on:
 * - Stress rating (35% weight)
 * - Sleep deficit below 7.5h (35% weight)
 * - HR to HRV autonomic balance ratio (30% weight)
 */
export function calculateFatigueIndex(metrics: HealthMetrics): number {
  const sleep = metrics.sleepHours ?? 7.5;
  const stress = metrics.stressLevel ?? 4;
  const hr = metrics.avgHeartRate ?? 65;
  const hrv = metrics.hrv ?? 55;

  const stressContribution = stress * 10;
  const sleepDeficit = Math.max(0, 7.5 - sleep);
  const sleepContribution = Math.min(100, sleepDeficit * 25);

  const ratio = hrv > 0 ? (hr / hrv) : (65 / 55);
  const ratioContribution = Math.min(100, ratio * 40);

  const finalIndex = (stressContribution * 0.35) + (sleepContribution * 0.35) + (ratioContribution * 0.30);
  return Math.round(finalIndex);
}

/**
 * Computes Biological Age compared to Chronological Age.
 * Adjusts up/down based on biometrics:
 * - Sleep: +0.8 years per hour of sleep debt. -0.5 years for optimized sleep.
 * - HRV: +1.5 years for low HRV. -1.0 years for high HRV.
 * - Heart Rate: +0.15 years per bpm above 75 bpm. -0.8 years for low HR.
 * - Steps: +1.2 years for sedentary behavior. -1.0 years for active profile.
 */
export function calculateBiologicalAge(
  chronologicalAge: number,
  metrics: HealthMetrics
): {
  biologicalAge: number;
  reasons: string[];
} {
  let ageOffset = 0;
  const reasons: string[] = [];

  const sleep = metrics.sleepHours;
  const hr = metrics.avgHeartRate;
  const hrv = metrics.hrv;
  const steps = metrics.steps;

  // 1. Sleep Debt Impact
  if (sleep !== undefined) {
    if (sleep < 6.8) {
      const debt = 7.5 - sleep;
      const penalty = parseFloat((debt * 0.8).toFixed(1));
      ageOffset += penalty;
      reasons.push(`Sleep debt of ${(7.5 - sleep).toFixed(1)}h daily (+${penalty}y)`);
    } else if (sleep >= 7.5 && sleep <= 9.0) {
      ageOffset -= 0.5;
      reasons.push("Optimized sleep duration (-0.5y)");
    }
  }

  // 2. HRV Vagal Tone Impact
  if (hrv !== undefined) {
    if (hrv < 45) {
      ageOffset += 1.5;
      reasons.push("Low HRV autonomic tension (+1.5y)");
    } else if (hrv > 70) {
      ageOffset -= 1.0;
      reasons.push("High HRV parasympathetic tone (-1.0y)");
    }
  }

  // 3. Resting / Average Heart Rate Impact
  if (hr !== undefined) {
    if (hr > 75) {
      const penalty = parseFloat(((hr - 75) * 0.15).toFixed(1));
      ageOffset += penalty;
      reasons.push(`Elevated resting HR of ${Math.round(hr)} bpm (+${penalty}y)`);
    } else if (hr < 60) {
      ageOffset -= 0.8;
      reasons.push("Athletic bradycardia HR profile (-0.8y)");
    }
  }

  // 4. Steps Activity Level Impact
  if (steps !== undefined) {
    if (steps < 5000) {
      ageOffset += 1.2;
      reasons.push("Sedentary daily step profile (+1.2y)");
    } else if (steps > 10000) {
      ageOffset -= 1.0;
      reasons.push("Active daily walking profile (-1.0y)");
    }
  }

  const biologicalAge = parseFloat((chronologicalAge + ageOffset).toFixed(1));
  
  if (reasons.length === 0) {
    reasons.push("Optimal baseline metrics.");
  }

  return {
    biologicalAge,
    reasons
  };
}
