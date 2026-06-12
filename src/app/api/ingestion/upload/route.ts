import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import { callGemini } from "@/lib/gemini";
import { IngestionSchemaMap } from "@/lib/validators/ingestionSchemas";
import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import { rl } from "@/lib/rateLimit";

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
    let extractedText = "";

    // 1. Extract Text based on file type
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
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
    } else if (file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name)) {
      // Direct OCR on images
      try {
        extractedText = await runOCR(buffer);
      } catch (ocrErr) {
        console.error("OCR on image failed:", ocrErr);
        return NextResponse.json({ error: "Failed to extract text from image." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Unsupported file format. Please upload PDF or image files." }, { status: 400 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: "Could not extract any text from the document." }, { status: 400 });
    }

    // 2. Classify Document Type using Gemini
    const classificationPrompt = `
You are an expert document classifier. Categorize the following document text into exactly one of these categories:
- blood_report (for CBC, Lipid, Thyroid, HbA1c, Vitamin blood tests)
- prescription (doctor prescriptions, medical instructions, medicines)
- health_checkup (general clinical health reports, physical checkups)
- fitness_assessment (VO2 Max, gym training assessments, strength limits)
- salary_slip (employer payslips, payroll summaries)
- loan_document (mortgages, car loans, bank loan terms)
- credit_card (credit card statements, minimum due alerts)
- stock_portfolio (holdings, broker portfolio values)
- insurance_policy (medical, life, or vehicle insurance premium covers)
- certification (professional credentials, courses completed)
- resume (professional resumes, CVs, job history summaries)

Return ONLY the lowercase key (e.g. "blood_report" or "salary_slip") with no other characters or text.

--- DOCUMENT TEXT ---
${extractedText.slice(0, 4000)}
    `.trim();

    const categoryRaw = await callGemini<string>(classificationPrompt, { temperature: 0.1 });
    const category = categoryRaw.trim().toLowerCase();

    const schema = IngestionSchemaMap[category];
    if (!schema) {
      return NextResponse.json({
        error: `Unrecognized or unsupported document classification: "${category}"`,
        rawTextPreview: extractedText.slice(0, 200)
      }, { status: 400 });
    }

    // 3. Extract Structured JSON using Gemini structured output
    const parsingPrompt = `
You are a highly precise parsing agent. Extract all structured details from the document text.
Map the details into the following TypeScript interface structure:

${zodToTypeScript(schema)}

Rules:
1. The output JSON must conform strictly to the TypeScript interface. Do NOT group items, metrics, or details into custom categories or sub-objects (like "cbc", "lipidPanel") unless they are specifically defined as keys in the TypeScript interface structure. Map everything flat to the exact keys defined (e.g. for blood reports, place all extracted metrics flat inside the 'metrics' array).
2. Make sure numerical values are parsed strictly as numbers, not strings.
3. If values are missing, omit them or return null.
4. Be highly precise with medical biometrics and financial values.

--- DOCUMENT TEXT ---
${extractedText.slice(0, 5000)}
    `.trim();

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

    const parsedData = await callGemini(parsingPrompt, { temperature: 0.1 });
    const cleanedData = cleanNulls(parsedData);
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
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          date: new Date(),
          domain: "health",
          domainData: { [category]: updatedData }
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
        }
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
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          date: new Date(),
          domain: "finance",
          domainData: { [category]: updatedData }
        });
      }
      summaryMessage = `Parsed ${category.replace("_", " ")} and merged assets into your financial logs.`;
      
    } else if (category === "resume" || category === "certification") {
      // Career logs
      if (category === "resume") {
        user.profile.learningProfile = validatedData.skills.slice(0, 15).join(", ");
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
        await existingLog.save();
      } else {
        await Log.create({
          userId: user._id,
          date: new Date(),
          domain: "career",
          domainData: { [category]: updatedData }
        });
      }
      summaryMessage = `Parsed ${category} and updated your career skill taxonomy.`;
    }

    return NextResponse.json({
      success: true,
      category,
      message: summaryMessage,
      data: validatedData
    }, { status: 200 });

  } catch (error: any) {
    console.error("INGESTION UPLOAD ERROR:", error);
    return NextResponse.json({
      error: error.message || "Failed to process and parse document."
    }, { status: 500 });
  }
}
