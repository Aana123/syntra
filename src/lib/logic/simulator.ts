//src/lib/simulator.ts

// Define the shape of the projected output
export interface SimulationResult {
  timeline: { month: number; health: number; finance: number; career: number }[];
  tradeOffs: string[];
  riskAssessment: string;
}

// The core simulation engine
export function runSimulation(
  currentHealth: number,
  currentFinance: number,
  currentCareer: number,
  scenario: { domain: "health" | "finance" | "career"; percentageChange: number }
): SimulationResult {
  
  // ADD THIS LINE: Clamp the input so it can never exceed +/- 90%
  const clampedChange = Math.max(-0.9, Math.min(0.9, scenario.percentageChange));

  const timeline = [];
  const tradeOffs = [];
  let riskAssessment = "Low Risk";

  // Base state
  let h = currentHealth;
  let f = currentFinance;
  let c = currentCareer;

  // Add month 0 (Current State)
  timeline.push({ month: 0, health: h, finance: f, career: c });

  // Calculate the 6-month trajectory based on the scenario
  for (let month = 1; month <= 6; month++) {
    
    // Apply the user's proposed change incrementally
    if (scenario.domain === "health") {
        h += (h * clampedChange * 0.1); // Small incremental growth
        
        // CROSS-DOMAIN IMPACT: Huge health focus might cost career time
        if (clampedChange > 0.3) { 
           c -= (c * 0.05); 
        }
    } else if (scenario.domain === "finance") {
        f += (f * clampedChange * 0.1);
        
        // CROSS-DOMAIN IMPACT: Aggressive saving might increase stress (lower health)
        if (clampedChange > 0.4) {
           h -= (h * 0.08);
        }
    } else if (scenario.domain === "career") {
        c += (c * clampedChange * 0.1);
        
        // CROSS-DOMAIN IMPACT: Extreme career focus might cost health and increase spending
        if (clampedChange > 0.3) {
            h -= (h * 0.05);
            f -= (f * 0.02); // Buying takeout because no time to cook
        }
    }

    // Cap scores between 0 and 100
    h = Math.max(0, Math.min(100, Math.round(h)));
    f = Math.max(0, Math.min(100, Math.round(f)));
    c = Math.max(0, Math.min(100, Math.round(c)));

    timeline.push({ month, health: h, finance: f, career: c });
  }

  // Generate Trade-Off Insights based on the final math
  if (scenario.domain === "health" && clampedChange > 0.3) {
      tradeOffs.push("Increasing workout frequency heavily will slightly reduce available study time, causing a projected dip in Career Score.");
      riskAssessment = "Medium Risk: Monitor career progress.";
  }
  if (scenario.domain === "career" && clampedChange > 0.3) {
      tradeOffs.push("Aggressive career upskilling correlates with a dip in Health Score due to reduced sleep and exercise.");
      riskAssessment = "High Risk: Burnout potential detected.";
  }

  return { timeline, tradeOffs, riskAssessment };
}