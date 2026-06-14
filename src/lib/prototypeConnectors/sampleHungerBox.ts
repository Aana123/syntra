export interface HungerBoxMealLog {
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
  estimatedCalories: number;
  estimatedProteinGrams: number;
  mealCount: number;
  nutritionIndicators: string[];
}

export const sampleHungerBoxMealLog: HungerBoxMealLog = {
  breakfast: "Idli Sambar",
  lunch: "Dal Rice",
  snack: "Coffee",
  dinner: "Paneer Roti",
  estimatedCalories: 1500,
  estimatedProteinGrams: 45,
  mealCount: 4,
  nutritionIndicators: ["high-carb", "medium-protein", "low-fat"]
};
