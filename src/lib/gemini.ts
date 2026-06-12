// src/lib/gemini.ts

// ── PII Anonymization — strip before sending to external API ────
const PII_KEYS = [
  "name", "email", "phone", "address", "userid",
  "accountnumber", "pan", "aadhaar", "ssn", "dob",
  "fullname", "firstname", "lastname",
];

const piiSet = new Set(PII_KEYS);

export function anonymizePII(obj: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj));
  function strip(o: Record<string, unknown>) {
    for (const key of Object.keys(o)) {
      if (piiSet.has(key.toLowerCase())) {
        o[key] = "[REDACTED]";
      } else if (typeof o[key] === "object" && o[key] !== null) {
        strip(o[key] as Record<string, unknown>);
      }
    }
  }
  strip(clone);
  return clone;
}

export interface GeminiOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Centralized, unified gateway for all Google Gemini API calls.
 * Enforces exponential backoff parameters, model specifications, and fallback parsing.
 */
export async function callGemini<T = any>(
  prompt: string,
  options: GeminiOptions = {}
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 500, temperature = 0.4, maxTokens } = options;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in .env");

  const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            responseMimeType: "application/json",
            ...(maxTokens ? { maxOutputTokens: maxTokens } : {})
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API Error ${res.status}: ${errText}`);
      }
      const raw = await res.json();

      // Log token usage from Gemini metadata for cost monitoring
      const usage = raw?.usageMetadata;
      if (usage) {
        console.info(
          `[Gemini tokens] prompt=${usage.promptTokenCount ?? "?"} ` +
          `output=${usage.candidatesTokenCount ?? "?"} ` +
          `total=${usage.totalTokenCount ?? "?"}`
        );
      }

      const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      if (!text) throw new Error("Empty response returned from Gemini API.");

      const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

      try {
        return JSON.parse(cleaned) as T;
      } catch {
        // Fallback for plain-text prompts
        return cleaned as unknown as T;
      }

    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Gemini call failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Gemini call failed: ${lastError?.message || "Unknown error"}`);
}

import { aitwinReflectionSchema } from "../types/schemas";

export function validateSyntraResponse(data: unknown) {
  return aitwinReflectionSchema.parse(data);
}