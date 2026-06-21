import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import crypto from "crypto";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import { callGemini } from "@/lib/services/gemini";
import { IngestionSchemaMap } from "@/lib/validators/ingestionSchemas";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import { rl } from "@/lib/utils/rateLimit";
import { generateAndStoreSnapshot } from "@/lib/services/snapshotService";
import { recalculateStreak } from "@/lib/logic/streak";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";

// Helper to run OCR on images / scanned files using Tesseract.js
async function runOCR(buffer: Buffer): Promise<string> {
  const worker = await createWorker();
  const ret = await worker.recognize(buffer);
  await worker.terminate();
  return ret.data.text;
}

// Helper to recursively format a Zod Schema into a clean TypeScript interface description for the LLM
function zodToTypeScript(schema: any): string {
  if (!schema) return "any";
  const typeName = schema._def?.typeName;

  if (typeName === "ZodObject") {
    const shape = schema.shape;
    const parts = [];
    for (const key of Object.keys(shape)) {
      const field = shape[key];
      const isOptional = field.isOptional?.() || 
                         field._def?.typeName === "ZodOptional" || 
                         field._def?.typeName === "ZodNullable";
      const typeStr = zodToTypeScript(field);
      parts.push(`  ${key}${isOptional ? "?" : ""}: ${typeStr};`);
    }
    return `{\n${parts.join("\n")}\n}`;
  }
  
  if (typeName === "ZodArray") {
    const element = schema._def.type;
    return `Array<${zodToTypeScript(element)}>`;
  }
  
  if (typeName === "ZodString") {
    return "string";
  }
  
  if (typeName === "ZodNumber") {
    return "number";
  }
  
  if (typeName === "ZodBoolean") {
    return "boolean";
  }
  
  if (typeName === "ZodEnum") {
    const values = schema._def.values;
    return values.map((v: any) => `"${v}"`).join(" | ");
  }
  
  if (typeName === "ZodOptional" || typeName === "ZodNullable") {
    return zodToTypeScript(schema._def.innerType);
  }
  
  return "any";
}

export async function POST(req: Request) {
  try {
    let userId = "";
    const testUserId = req.headers.get("x-test-user-id");
    
    if (process.env.NODE_ENV !== "production" && testUserId) {
      userId = testUserId;
    } else {
      const session = await getSession();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized neural link." }, { status: 401 });
      }
      userId = session.user.id;
    }

    // Apply hourly rate limiter (10 parses per hour)
    const rateLimit = rl.parse(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: `Upload rate limit exceeded. Please try again in ${rateLimit.retryAfterSec}s.`
      }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    await connectDB();
    const existingUpload = await Log.findOne({ userId, fileHash });
    if (existingUpload) {
      return NextResponse.json({
        success: false,
        error: "This document has already been uploaded and processed."
      }, { status: 409 });
    }

    let extractedText = "";
    let imageOption: { mimeType: string; data: string } | undefined = undefined;
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name);

    // 1. Extract Text / Prepare image based on file type
    if (isImage) {
      let mimeType = file.type;
      if (!mimeType || mimeType === "application/octet-stream") {
        const ext = file.name.split(".").pop()?.toLowerCase();
        mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      }
      imageOption = {
        mimeType,
        data: buffer.toString("base64")
      };
    } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        extractedText = pdfData.text || "";
        await parser.destroy();
      } catch (err) {
        console.error("PDF Text extraction failed, attempting OCR:", err);
      }
      
      // Fallback to OCR if PDF text is empty (scanned PDF)
      if (!extractedText.trim()) {
        try {
          extractedText = await runOCR(buffer);
        } catch (ocrErr) {
          console.error("OCR Fallback failed:", ocrErr);
        }
      }
    } else {
      return NextResponse.json({ error: "Unsupported file format. Please upload PDF or image files." }, { status: 400 });
    }

    if (!isImage && !extractedText.trim()) {
      return NextResponse.json({ error: "Could not extract any text from the document." }, { status: 400 });
    }

    // 2 + 3. MERGED: Classify AND Extract in a single Gemini call.
    // Previously two sequential calls (~3s). Now one call (~1.5s), ~40% fewer tokens.
    const VALID_CATEGORIES = [
      "blood_report", "prescription", "health_checkup", "fitness_assessment",
      "salary_slip", "loan_document", "credit_card", "stock_portfolio",
      "insurance_policy", "certification", "resume",
    ] as const;

    const mergedPrompt = `
You are a precision document intelligence agent. Your job has two parts — do them in one response.

PART 1 — CLASSIFY the document into exactly one of these categories:
- blood_report       (CBC, Lipid, Thyroid, HbA1c, Vitamin blood tests)
- prescription       (doctor prescriptions, medical instructions, medicines)
- health_checkup     (general clinical health reports, physical checkups)
- fitness_assessment (VO2 Max, gym assessments, strength tests)
- salary_slip        (employer payslips, payroll summaries)
- loan_document      (mortgages, car loans, bank loan terms)
- credit_card        (credit card statements, minimum due alerts)
- stock_portfolio    (holdings, broker portfolio values)
- insurance_policy   (medical, life, or vehicle insurance)
- certification      (professional credentials, courses completed)
- resume             (professional resumes, CVs, job history)

PART 2 — EXTRACT all structured data from the document into this TypeScript structure:
${IngestionSchemaMap ? Object.entries(IngestionSchemaMap).map(([k, s]) => `If category is "${k}":\n${zodToTypeScript(s)}`).join("\n\n") : "Extract all relevant fields as key-value pairs."}

RULES:
1. Output ONLY a JSON object with two keys: "category" (the string key from PART 1) and "data" (the extracted object from PART 2).
2. In "data", numerical values must be numbers, not strings.
3. Do NOT nest data into sub-objects unless the TypeScript structure explicitly defines them.
4. If a field is missing from the document, omit it (do not output null).
5. Be maximally precise with medical biometrics and financial values.
${isImage ? "" : `\n--- DOCUMENT TEXT ---\n${extractedText.slice(0, 5000)}`}
`.trim();

    // Envelope schema to validate the combined response shape
    const EnvelopeSchema = z.object({
      category: z.enum(VALID_CATEGORIES),
      data: z.record(z.string(), z.unknown()),
    });

    let mergedRaw: unknown;
    try {
      mergedRaw = await callGemini<unknown>(mergedPrompt, {
        temperature: 0.1,
        maxTokens: 3000,
        image: imageOption,
      });
    } catch (aiErr: any) {
      const msg: string = aiErr?.message ?? "";
      if (msg.startsWith("GEMINI_AUTH_ERROR") || msg.includes("GEMINI_API_KEY not set")) {
        return NextResponse.json(
          { error: "AI service is temporarily unavailable. Please try again later." },
          { status: 503 }
        );
      }
      if (msg.startsWith("GEMINI_QUOTA_ERROR")) {
        return NextResponse.json(
          { error: "AI usage limit reached. Please wait a few minutes and try again." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Could not analyse the document. Please try again." },
        { status: 503 }
      );
    }
    const envelope = EnvelopeSchema.safeParse(mergedRaw);

    if (!envelope.success) {
      console.error("[Ingestion] Merged AI call returned invalid envelope:", envelope.error.issues);
      return NextResponse.json({
        error: "Could not classify or extract document data. Please try again.",
        rawTextPreview: isImage ? "Image Document" : extractedText.slice(0, 200)
      }, { status: 400 });
    }

    const category = envelope.data.category;
    const schema = IngestionSchemaMap[category];
    if (!schema) {
      return NextResponse.json({
        error: `Unrecognized document type: "${category}"`,
        rawTextPreview: extractedText.slice(0, 200)
      }, { status: 400 });
    }

    // Helper to recursively remove null values so they match Zod's optional expectation
    const cleanNulls = (obj: any): any => {
      if (obj === null) return undefined;
      if (Array.isArray(obj)) return obj.map(cleanNulls);
      if (typeof obj === "object" && obj !== null) {
        const result: any = {};
        for (const key of Object.keys(obj)) {
          if (obj[key] !== null) {
            result[key] = cleanNulls(obj[key]);
          }
        }
        return result;
      }
      return obj;
    };

    const cleanedData = cleanNulls(envelope.data.data);
    const validatedData = schema.parse(cleanedData) as any;

    // 4. Save/Merge into MongoDB based on category
    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let summaryMessage = `Successfully parsed ${category.replace("_", " ")} document.`;

    if (["blood_report", "prescription", "health_checkup", "fitness_assessment"].includes(category)) {
      // Health Domain Log Merge
      const existingLog = await Log.findOne({
        userId: user._id,
        domain: "health",
        date: { $gte: todayStart, $lte: todayEnd }
      });

      const updatedData = {
        ...validatedData,
        source: "pdf-ingestion",
        ingestedAt: new Date()
      };

      if (existingLog) {
        existingLog.domainData = {
          ...existingLog.domainData,
          [category]: updatedData
        };
        existingLog.fileHash = fileHash;
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          date: new Date(),
          domain: "health",
          domainData: { [category]: updatedData },
          fileHash: fileHash
        });
      }
      summaryMessage = `Parsed ${category.replace("_", " ")} and merged metrics into your health logs.`;
      
    } else if (category === "salary_slip") {
      // Finance: Gross and Net income update
      const netSalary = validatedData.netTakeHome || validatedData.grossEarnings || 0;
      if (netSalary > 0) {
        user.profile.monthlyIncome = netSalary;
        await user.save();
        summaryMessage = `Salary slip parsed. Updated your monthly income baseline to ₹${netSalary.toLocaleString("en-IN")}.`;
      }

      // Log salary slip details
      await Log.create({
        userId: user._id,
        date: new Date(),
        domain: "finance",
        domainData: {
          salarySlip: {
            ...validatedData,
            source: "pdf-ingestion",
            ingestedAt: new Date()
          }
        },
        fileHash: fileHash
      });
      
    } else if (["credit_card", "loan_document", "stock_portfolio", "insurance_policy"].includes(category)) {
      // Finance logs
      const existingLog = await Log.findOne({
        userId: user._id,
        domain: "finance",
        date: { $gte: todayStart, $lte: todayEnd }
      });

      const updatedData = {
        ...validatedData,
        source: "pdf-ingestion",
        ingestedAt: new Date()
      };

      if (existingLog) {
        existingLog.domainData = {
          ...existingLog.domainData,
          [category]: updatedData
        };
        existingLog.fileHash = fileHash;
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          date: new Date(),
          domain: "finance",
          domainData: { [category]: updatedData },
          fileHash: fileHash
        });
      }
      summaryMessage = `Parsed ${category.replace("_", " ")} and merged assets into your financial logs.`;
      
    } else if (category === "resume" || category === "certification") {
      // Career logs
      if (category === "resume") {
        user.profile.skills = (validatedData.skills || []).slice(0, 15).join(", ");
        if (validatedData.education && validatedData.education.length > 0) {
          user.profile.education = validatedData.education.map((edu: any) => {
            const deg = edu.degree || "";
            const sch = edu.school || "";
            const yr = edu.graduationYear || "";
            return `${deg}${sch ? " at " + sch : ""}${yr ? " (" + yr + ")" : ""}`;
          }).join("; ");
        }
        user.markModified("profile");
        await user.save();
      }

      const existingLog = await Log.findOne({
        userId: user._id,
        domain: "career",
        date: { $gte: todayStart, $lte: todayEnd }
      });

      const updatedData = {
        ...validatedData,
        source: "pdf-ingestion",
        ingestedAt: new Date()
      };

      if (existingLog) {
        existingLog.domainData = {
          ...existingLog.domainData,
          [category]: updatedData
        };
        existingLog.fileHash = fileHash;
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          date: new Date(),
          domain: "career",
          domainData: { [category]: updatedData },
          fileHash: fileHash
        });
      }
      summaryMessage = `Parsed ${category} and updated your career skill taxonomy.`;
    }

    // 5. RECALCULATE SCORES & GAMIFICATION
    const scoresBefore = { health: user.scores.health ?? 50, finance: user.scores.finance ?? 50, career: user.scores.career ?? 50 };
    if (["blood_report", "prescription", "health_checkup", "fitness_assessment"].includes(category)) {
      if (category === "health_checkup" && validatedData.vitals) {
        const w = validatedData.vitals.weight;
        const h = validatedData.vitals.height;
        if (w) user.profile.weight = w;
        if (h) user.profile.height = h;
      }
      const sleep = user.profile.averageSleep || 7.0;
      const workouts = user.profile.workoutFrequency || 3;
      const hasConstraints = user.healthConstraints && user.healthConstraints !== "none";
      let abnormalPenalty = 0;
      const healthLog = await Log.findOne({
        userId: user._id,
        domain: "health",
        date: { $gte: todayStart, $lte: todayEnd }
      });
      if (healthLog && healthLog.domainData?.blood_report?.metrics) {
        const abnormalMetrics = healthLog.domainData.blood_report.metrics.filter((m: any) => m.status === "high" || m.status === "low").length;
        abnormalPenalty = abnormalMetrics * 3;
      }
      const healthScore = Math.round(
        Math.max(30, Math.min(98, 40 + (sleep / 8) * 30 + (workouts / 5) * 20 + (hasConstraints ? -10 : 8) - abnormalPenalty))
      );
      user.scores.health = healthScore;

    } else if (["salary_slip", "credit_card", "loan_document", "stock_portfolio", "insurance_policy"].includes(category)) {
      if (category === "stock_portfolio" && validatedData.portfolioValue > 0) {
        user.profile.currentSavings = (user.profile.currentSavings || 0) + validatedData.portfolioValue;
      }
      const incomeVal = user.profile.monthlyIncome || 0;
      const savingsVal = user.profile.currentSavings || 0;
      const targetSavingsRate = user.profile.targetSavingsRate || 20;
      const discretionarySpend = Math.round(incomeVal * 0.4);
      const runwayMonths = discretionarySpend > 0 ? savingsVal / discretionarySpend : 6;
      const financeScore = Math.round(
        Math.max(30, Math.min(98, 35 + targetSavingsRate * 1.3 + Math.min(6, runwayMonths) * 3.5))
      );
      user.scores.finance = financeScore;

    } else if (["resume", "certification"].includes(category)) {
      const study = user.profile.hoursStudied || 3;
      const focus = 7;
      const consistency = 7;
      const skillsCount = user.profile.skills ? user.profile.skills.split(",").length : 0;
      const skillBonus = Math.min(10, skillsCount * 1.5);
      const careerScore = Math.round(
        Math.max(30, Math.min(98, 35 + study * 3.5 + focus * 2.5 + consistency * 2.5 + skillBonus))
      );
      user.scores.career = careerScore;
    }

    // Award 50 XP points for uploading data layers
    user.gamification.totalPoints += 50;

    // Recalculate logging streak
    await recalculateStreak(user);

    user.markModified("profile");
    user.markModified("scores");
    user.markModified("gamification");
    await user.save();
    const scoresAfter = { health: user.scores.health ?? 50, finance: user.scores.finance ?? 50, career: user.scores.career ?? 50 };

    // Trigger AI snapshot pre-generation to update Twin Insights (forced regeneration)
    try {
      waitUntil(
        generateAndStoreSnapshot(user._id.toString(), user, undefined, true).catch(err => {
          console.error("[CRITICAL] Background Ingestion Snapshot Failed:", err);
        })
      );
    } catch {
      generateAndStoreSnapshot(user._id.toString(), user, undefined, true).catch(err => {
        console.error("[CRITICAL] Background Ingestion Snapshot Failed:", err);
      });
    }

    return NextResponse.json({
      success: true,
      category,
      message: summaryMessage,
      data: validatedData,
      scoresBefore,
      scoresAfter,
      xpEarned: 50,
    }, { status: 200 });

  } catch (error: any) {
    console.error("INGESTION UPLOAD ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong while processing your document. Please try again." },
      { status: 500 }
    );
  }
}
