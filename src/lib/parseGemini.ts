//src/lib/parseGemini.ts
/**
 * Utility function to clean and parse JSON responses from Gemini AI.
 * It removes markdown code blocks and attempts to parse the remaining string.
 *
 * @param text The raw response text from Gemini
 * @returns The parsed JSON object, or null if parsing fails
 */
export function parseGemini<T = any>(text: string): T | null {
  try {
    const cleanedText = text.replace(/```json\n?/gi, "").replace(/```\n?/gi, "").trim();
    return JSON.parse(cleanedText) as T;
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    return null;
  }
}