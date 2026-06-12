import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = (await res.json()) as { models: any[] };
  
  const geminiModels = data.models
    .filter(m => m.name.includes("gemini") && m.supportedGenerationMethods.includes("generateContent"))
    .map(m => m.name);
    
  console.log("Filtered Gemini Models:", geminiModels);
}

main().catch(console.error);
