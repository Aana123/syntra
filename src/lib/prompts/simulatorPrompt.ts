// src/lib/prompts/simulatorPrompt.ts

export interface SimulatorPromptInput {
  currentScores: {
    health: number;
    finance: number;
    career: number;
  };
  projectedScores: {
    health: number;
    finance: number;
    career: number;
  };
  scenario: {
    domain: "health" | "finance" | "career";
    percentageChange: number;
  };
}

/**
 * Builds the system prompt for the Syntra Digital Twin simulation engine.
 * 
 * @param input The current user scores, projected scores, and scenario details.
 * @returns The strict JSON-formatted prompt string for Gemini.
 */
export function buildSimulatorPrompt({
  currentScores,
  projectedScores,
  scenario
}: SimulatorPromptInput): string {
  const direction = scenario.percentageChange > 0 ? "+" : "";
  const percentChange = Math.round(scenario.percentageChange * 100);

return `You are Syntra, a Digital Twin AI.
The user is simulating a life change: ${direction}${percentChange}% in their ${scenario.domain} domain.

Current Baseline Scores:
Health: ${currentScores.health}, Finance: ${currentScores.finance}, Career: ${currentScores.career}

Projected 30-Day Simulation Scores:
Health: ${projectedScores.health}, Finance: ${projectedScores.finance}, Career: ${projectedScores.career}

Analyze this projection. Return your analysis in the exact JSON format shown below.
- "insight": A short, 2-sentence explanation of how this specific change impacts their overall system.
- "warning": A 1-sentence warning if any projected score drops below 45, otherwise return null.

EXPECTED JSON SCHEMA:
{
  "insight": "string",
  "warning": "string | null"
}

Return ONLY valid JSON. Do not use markdown wrapping (no \`\`\`json).`;
}