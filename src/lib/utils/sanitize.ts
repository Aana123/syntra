// Strips user-controlled strings of characters that can be used to
// break out of their assigned section in a Gemini prompt:
//  - Newlines let injected text start a new "heading" in the prompt
//  - Long dashes/equals/hash runs mimic the ━━━ SECTION DIVIDERS ━━━ pattern
//  - Smart-quote variants are normalized to avoid JSON-breaking edge cases
export function sanitizeForPrompt(s: unknown, maxLen = 200): string {
  if (typeof s !== "string") return "";
  return s
    .replace(/[\r\n\t]+/g, " ")            // flatten all whitespace
    .replace(/["""''«»]/g, "'")            // normalize exotic quotes
    .replace(/[━─═\-=*#]{3,}/g, "")        // strip section-divider lookalikes
    .replace(/[\x00-\x1f\x7f]/g, "")       // strip control characters
    .slice(0, maxLen)
    .trim();
}
