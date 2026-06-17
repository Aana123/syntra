// src/lib/confidenceScore.ts

/**
 * Calculates a confidence score based on the number of active logs in the lookback window.
 * A full dataset for a 7-day lookback window would contain 21 logs (7 days × 3 domains).
 * 
 * @param logCount The number of logs recorded in the lookback window.
 * @returns A decimal number between 0.0 and 1.0 representing the data density/confidence, rounded to two decimal places.
 */
export function calculateConfidence(logCount: number): number {
  if (typeof logCount !== "number" || isNaN(logCount) || logCount <= 0) {
    return 0;
  }

  const maxTargetLogs = 21;
  const rawScore = logCount / maxTargetLogs;

  // Clamp the score between 0.0 and 1.0
  const confidence = Math.min(1.0, Math.max(0.0, rawScore));
  
  // Return as a whole number percentage (0 to 100) to match the AI JSON schema
  return Math.round(confidence * 100); 
}
