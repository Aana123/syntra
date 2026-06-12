import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const models = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-1.5-flash" // just in case
];

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  for (const model of models) {
    console.log(`Testing model: ${model}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hello" }] }]
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ Model ${model} is working!`);
        console.log("Response:", JSON.stringify(data.candidates?.[0]?.content?.parts?.[0]?.text));
      } else {
        console.log(`❌ Model ${model} failed: ${res.status} - ${JSON.stringify(data.error?.message)}`);
      }
    } catch (err: any) {
      console.log(`❌ Model ${model} error: ${err.message}`);
    }
  }
}

main().catch(console.error);
