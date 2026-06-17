// src/lib/financeMath.ts

export interface PreComputedWealthGoal {
  goalType: "home" | "car" | "education" | "wedding" | "emergency_fund" | "retirement" | "other";
  goalLabel: string;
  targetAmount: number;
  downPaymentPercent: number;
  targetYear: number;
  priority: "high" | "medium" | "low";
  monthsRemaining: number;
  requiredMonthlySavings: number;
  actualMonthlySavings: number;
  deficit: number;
  deficitText: string;
}

export function preComputeWealthGoals(
  goals: any[],
  monthlyIncome: number,
  monthlyBudget: number,
  savingsRate: number
): PreComputedWealthGoal[] {
  const actualMonthlySavings = savingsRate > 0
    ? Math.round(monthlyIncome * (savingsRate / 100))
    : Math.max(0, monthlyIncome - monthlyBudget);

  return goals
    .filter((g: any) => g.domain === "finance")
    .map((g: any) => {
      const titleLower = g.title.toLowerCase();
      let goalType: "home" | "car" | "education" | "wedding" | "emergency_fund" | "retirement" | "other" = "other";
      if (titleLower.includes("home") || titleLower.includes("house") || titleLower.includes("flat") || titleLower.includes("3bhk") || titleLower.includes("2bhk")) {
        goalType = "home";
      } else if (titleLower.includes("car") || titleLower.includes("thar") || titleLower.includes("vehicle") || titleLower.includes("bike")) {
        goalType = "car";
      } else if (titleLower.includes("study") || titleLower.includes("education") || titleLower.includes("course") || titleLower.includes("degree")) {
        goalType = "education";
      } else if (titleLower.includes("wedding") || titleLower.includes("marriage")) {
        goalType = "wedding";
      } else if (titleLower.includes("emergency")) {
        goalType = "emergency_fund";
      } else if (titleLower.includes("retire") || titleLower.includes("retirement")) {
        goalType = "retirement";
      }

      // Try to extract amount from title
      let targetAmount = 500000;
      const lakhsMatch = g.title.match(/(\d+(?:\.\d+)?)\s*l/i);
      const numbersMatch = g.title.replace(/[,]/g, "").match(/\d+/g);
      
      if (lakhsMatch) {
        targetAmount = parseFloat(lakhsMatch[1]) * 100000;
      } else if (numbersMatch && numbersMatch.length > 0) {
        const numbers = numbersMatch.map((n: string) => parseInt(n)).filter((n: number) => n > 1000);
        if (numbers.length > 0) {
          targetAmount = Math.max(...numbers);
        }
      }

      const targetYear = g.targetDate ? new Date(g.targetDate).getFullYear() : (new Date().getFullYear() + 3);
      
      let monthsRemaining = 24; // fallback
      if (g.targetDate) {
        monthsRemaining = Math.max(1, Math.ceil((new Date(g.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
      } else {
        monthsRemaining = Math.max(1, (targetYear - new Date().getFullYear()) * 12);
      }

      // required monthly savings = targetAmount / monthsRemaining
      const requiredMonthlySavings = Math.round(targetAmount / monthsRemaining);
      const deficit = Math.max(0, requiredMonthlySavings - actualMonthlySavings);
      const deficitText = deficit > 0 
        ? `User is Rs. ${deficit.toLocaleString("en-IN")} short` 
        : "User is on track";

      return {
        goalType,
        goalLabel: g.title,
        targetAmount,
        downPaymentPercent: goalType === "home" ? 20 : goalType === "car" ? 15 : 100,
        targetYear,
        priority: ["high", "medium", "low"].includes(g.priority?.toLowerCase()) ? g.priority.toLowerCase() as "high" | "medium" | "low" : "medium",
        monthsRemaining,
        requiredMonthlySavings,
        actualMonthlySavings,
        deficit,
        deficitText,
      };
    });
}

// ── NEW: SCENARIO SPECIFIC CALCULATIONS ──

export function calculateSIPFutureValue(monthlyAmount: number, annualRate: number, years: number): number {
  const months = years * 12;
  const monthlyRate = (annualRate / 100) / 12;
  if (monthlyRate === 0) return monthlyAmount * months;
  return monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
}

export function calculateCreditCardSavings(
  balance: number,
  apr: number,
  amortMonths: number = 12
): { interestSaved: number; monthlyPayment: number; totalPayment: number; annualInterestCompounded: number } {
  const monthlyRate = (apr / 100) / 12;
  const annualInterestCompounded = balance * (apr / 100);
  
  if (monthlyRate === 0) {
    return {
      interestSaved: 0,
      monthlyPayment: balance / amortMonths,
      totalPayment: balance,
      annualInterestCompounded: 0,
    };
  }
  
  const emi = balance * (monthlyRate * Math.pow(1 + monthlyRate, amortMonths)) / (Math.pow(1 + monthlyRate, amortMonths) - 1);
  const totalPayment = emi * amortMonths;
  const interestSaved = totalPayment - balance;
  
  return {
    interestSaved,
    monthlyPayment: emi,
    totalPayment,
    annualInterestCompounded,
  };
}

export function calculateSIPDelayCost(
  sipAmount: number,
  delayYears: number,
  tenureYears: number,
  annualRate: number
): { fvToday: number; fvDelayed: number; costOfDelay: number; requiredSIPDelayed: number; extraSIPMonthly: number } {
  const fvToday = calculateSIPFutureValue(sipAmount, annualRate, tenureYears);
  const fvDelayed = calculateSIPFutureValue(sipAmount, annualRate, Math.max(0, tenureYears - delayYears));
  const costOfDelay = Math.max(0, fvToday - fvDelayed);
  
  const delayedMonths = Math.max(0, tenureYears - delayYears) * 12;
  const monthlyRate = (annualRate / 100) / 12;
  let requiredSIPDelayed = sipAmount;
  if (monthlyRate > 0 && delayedMonths > 0) {
    requiredSIPDelayed = fvToday / (((Math.pow(1 + monthlyRate, delayedMonths) - 1) / monthlyRate) * (1 + monthlyRate));
  }
  
  const extraSIPMonthly = Math.max(0, requiredSIPDelayed - sipAmount);
  
  return {
    fvToday,
    fvDelayed,
    costOfDelay,
    requiredSIPDelayed,
    extraSIPMonthly,
  };
}

export function calculateMortgagePrepayment(
  outstanding: number,
  annualRate: number,
  remainingYears: number,
  prepayment: number
): { emi: number; tenureReductionMonths: number; interestSaved: number; totalWithoutPrepayment: number; totalWithPrepayment: number } {
  const months = remainingYears * 12;
  const monthlyRate = (annualRate / 100) / 12;
  
  if (monthlyRate === 0) {
    return {
      emi: outstanding / months,
      tenureReductionMonths: Math.round(prepayment / (outstanding / months)),
      interestSaved: 0,
      totalWithoutPrepayment: outstanding,
      totalWithPrepayment: outstanding,
    };
  }
  
  const emi = outstanding * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  const totalWithoutPrepayment = emi * months;
  
  const newOutstanding = Math.max(0, outstanding - prepayment);
  
  let newMonths = 0;
  const term = 1 - (newOutstanding * monthlyRate / emi);
  if (term > 0) {
    newMonths = -Math.log(term) / Math.log(1 + monthlyRate);
  } else {
    newMonths = 0;
  }
  
  const tenureReductionMonths = Math.max(0, Math.round(months - newMonths));
  const totalWithPrepayment = (emi * newMonths) + prepayment;
  const interestSaved = Math.max(0, totalWithoutPrepayment - totalWithPrepayment);
  
  return {
    emi,
    tenureReductionMonths,
    interestSaved,
    totalWithoutPrepayment,
    totalWithPrepayment,
  };
}

