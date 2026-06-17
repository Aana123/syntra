/**
 * Calculates a health score based on sleep, workout, stress, and hydration.
 * Max baseline score per entry ~100.
 */
export const calculateHealthScore = (sleepHours: number, workoutMinutes: number, stressLevel: number, waterGlasses?: number): number => {
  let score = 0;
  
  // Sleep (Target: 7-9 hours)
  if (sleepHours >= 7 && sleepHours <= 9) score += 40;
  else if (sleepHours >= 6 || sleepHours === 10) score += 20;
  else score += 5;

  // Workout (Target: 30+ mins)
  if (workoutMinutes >= 60) score += 40;
  else if (workoutMinutes >= 30) score += 25;
  else if (workoutMinutes > 0) score += 10;

  // Stress (1-10, lower is better)
  score += Math.max(0, 20 - (stressLevel * 2));

  // Hydration bonus (optional — only applies if user logs water intake)
  if (typeof waterGlasses === "number") {
    if (waterGlasses >= 8) score += 5;
    else if (waterGlasses <= 2) score -= 3;
  }

  return Math.max(0, Math.min(100, score));
};

/**
 * Calculates a finance score based on savings, discretionary spending, and impulse flags.
 */
export const calculateFinanceScore = (
  amountSaved: number, 
  discretionarySpent: number, 
  impulseSpend?: boolean,
  monthlyIncome = 50000,
  monthlyBudget = 15000
): number => {
  let score = 50; // Base score
  
  const income = monthlyIncome && monthlyIncome > 0 ? monthlyIncome : 50000;
  const budget = monthlyBudget && monthlyBudget > 0 ? monthlyBudget : 15000;

  // Daily conversions
  const dailyIncome = income / 30;
  const dailyBudget = budget / 30;

  // Positive impact from savings rate (relative to daily income)
  const savingsRate = dailyIncome > 0 ? (amountSaved / dailyIncome) : 0;
  if (savingsRate >= 0.30) score += 30;
  else if (savingsRate >= 0.20) score += 20;
  else if (savingsRate >= 0.10) score += 15;
  else if (amountSaved > 0) score += 5;
  
  // Discretionary spending behavior (relative to daily budget limit)
  if (discretionarySpent === 0) {
    score += 20;
  } else if (dailyBudget > 0 && discretionarySpent < 0.10 * dailyBudget) {
    score += 10;
  } else if (dailyBudget > 0 && discretionarySpent > 1.50 * dailyBudget) {
    score -= 30;
  } else if (dailyBudget > 0 && discretionarySpent > 1.00 * dailyBudget) {
    score -= 20;
  }

  // Impulse spend penalty
  if (impulseSpend === true) score -= 5;
  
  return Math.max(0, Math.min(100, score));
};

/**
 * Calculates a career/productivity score based on study hours and subjective rating.
 */
export const calculateCareerScore = (hoursStudied: number, productivityRating: number): number => {
  let score = 0;
  
  // Hours studied
  if (hoursStudied >= 4) score += 50;
  else if (hoursStudied >= 2) score += 30;
  else if (hoursStudied > 0) score += 10;
  
  // Productivity rating (1-10)
  score += (productivityRating * 5); // Max 50 points
  
  return Math.max(0, Math.min(100, score));
};

/**Instead of resetting the user's lifetime total points, this returns how much 
 * they just earned so you can add it to their running total in the database.
 */
export const calculateEarnedXP = (domainScore: number): number => {
  // If they got a high score on this entry, they earn more lifetime points
  if (domainScore >= 80) return 50; 
  if (domainScore >= 50) return 25;
  return 10; // Even for a bad day, they get 10 points just for logging
};

/**
 * Syntra Core Calculator
*/
export const calculateSyntraCore = (healthScore: number, financeScore: number, careerScore: number): number => {
  const core = (healthScore + financeScore + careerScore) / 3;
  return Math.round(core); // Returns a clean integer like 82 instead of 82.333
};