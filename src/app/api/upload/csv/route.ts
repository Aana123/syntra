//src/app/api/upload/csv/route.ts
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import { generateAndStoreSnapshot } from "@/lib/snapshotService";
import { apiHandler } from "@/lib/apiHandler";
import { ApiError } from "@/lib/apiError";

// A robust, RFC-4180 compliant CSV parser
const parseCSV = (csvText: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          value += '"';
          i++; // Skip next quote
        } else {
          insideQuotes = false;
        }
      } else {
        value += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        row.push(value.trim());
        value = "";
      } else if (char === '\r' || char === '\n') {
        row.push(value.trim());
        value = "";
        if (row.length > 0 && row.some(cell => cell !== "")) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        value += char;
      }
    }
  }

  if (value || row.length > 0) {
    row.push(value.trim());
    if (row.some(cell => cell !== "")) {
      result.push(row);
    }
  }

  return result;
};

// Robust row-level validator
function validateRow(domain: string, record: Record<string, any>, dateVal: string, rowIndex: number) {
  // 1. Strict Date Validation
  if (!dateVal) {
    throw new ApiError(400, `Row ${rowIndex}: date is required`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    throw new ApiError(400, `Row ${rowIndex}: Date must be in YYYY-MM-DD format`);
  }
  const logDate = new Date(dateVal);
  if (isNaN(logDate.getTime())) {
    throw new ApiError(400, `Row ${rowIndex}: Invalid date format`);
  }

  // 2. Validate Domain Fields (Required + Range Validation)
  if (domain === "health") {
    if (typeof record.sleepHours === "undefined") throw new ApiError(400, `Row ${rowIndex}: sleepHours is required`);
    if (typeof record.workoutMinutes === "undefined") throw new ApiError(400, `Row ${rowIndex}: workoutMinutes is required`);
    if (typeof record.stressLevel === "undefined") throw new ApiError(400, `Row ${rowIndex}: stressLevel is required`);

    if (record.sleepHours < 0 || record.sleepHours > 24) {
      throw new ApiError(400, `Row ${rowIndex}: sleepHours must be between 0 and 24`);
    }
    if (record.workoutMinutes < 0 || record.workoutMinutes > 300) {
      throw new ApiError(400, `Row ${rowIndex}: workoutMinutes must be between 0 and 300`);
    }
    if (record.stressLevel < 1 || record.stressLevel > 10) {
      throw new ApiError(400, `Row ${rowIndex}: stressLevel must be between 1 and 10`);
    }

    if (typeof record.moodScore !== "undefined" && (record.moodScore < 1 || record.moodScore > 10)) {
      throw new ApiError(400, `Row ${rowIndex}: moodScore must be between 1 and 10`);
    }
    if (typeof record.energyLevel !== "undefined" && (record.energyLevel < 1 || record.energyLevel > 10)) {
      throw new ApiError(400, `Row ${rowIndex}: energyLevel must be between 1 and 10`);
    }
    if (typeof record.caloriesConsumed !== "undefined" && (record.caloriesConsumed < 0 || record.caloriesConsumed > 10000)) {
      throw new ApiError(400, `Row ${rowIndex}: caloriesConsumed must be between 0 and 10000`);
    }
    if (typeof record.calorieGoal !== "undefined" && (record.calorieGoal < 0 || record.calorieGoal > 10000)) {
      throw new ApiError(400, `Row ${rowIndex}: calorieGoal must be between 0 and 10000`);
    }
    if (typeof record.waterGlasses !== "undefined" && (record.waterGlasses < 0 || record.waterGlasses > 20)) {
      throw new ApiError(400, `Row ${rowIndex}: waterGlasses must be between 0 and 20`);
    }

  } else if (domain === "finance") {
    if (typeof record.amountSaved === "undefined") throw new ApiError(400, `Row ${rowIndex}: amountSaved is required`);
    if (typeof record.discretionarySpent === "undefined") throw new ApiError(400, `Row ${rowIndex}: discretionarySpent is required`);

    if (record.amountSaved < 0) {
      throw new ApiError(400, `Row ${rowIndex}: amountSaved cannot be negative`);
    }
    if (record.discretionarySpent < 0) {
      throw new ApiError(400, `Row ${rowIndex}: discretionarySpent cannot be negative`);
    }

    if (typeof record.spendingCategory !== "undefined") {
      const allowedCategories = ["food", "entertainment", "shopping", "transport", "other"];
      if (!allowedCategories.includes(record.spendingCategory)) {
        throw new ApiError(400, `Row ${rowIndex}: spendingCategory must be one of food, entertainment, shopping, transport, or other`);
      }
    }

  } else if (domain === "career") {
    if (typeof record.hoursStudied === "undefined") throw new ApiError(400, `Row ${rowIndex}: hoursStudied is required`);
    if (typeof record.productivityRating === "undefined") throw new ApiError(400, `Row ${rowIndex}: productivityRating is required`);

    if (record.hoursStudied < 0 || record.hoursStudied > 24) {
      throw new ApiError(400, `Row ${rowIndex}: hoursStudied must be between 0 and 24`);
    }
    if (record.productivityRating < 1 || record.productivityRating > 10) {
      throw new ApiError(400, `Row ${rowIndex}: productivityRating must be between 1 and 10`);
    }
    if (typeof record.sessionsCompleted !== "undefined" && record.sessionsCompleted < 0) {
      throw new ApiError(400, `Row ${rowIndex}: sessionsCompleted cannot be negative`);
    }
  }
}

export const POST = apiHandler(async (req: Request) => {
  // 1. Authenticate Request
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new ApiError(401, "Unauthorized");
  }
  const userEmail = session.user.email;

  // 2. Extract the file and domain from the form data
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const domain = formData.get("domain") as string; // "health", "finance", or "career"

  if (!file || !domain) {
    throw new ApiError(400, "Missing file or domain");
  }

  if (!["health", "finance", "career"].includes(domain)) {
    throw new ApiError(400, "Invalid domain");
  }

  // 3. Convert the uploaded file buffer to readable text
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const csvText = buffer.toString("utf-8").trim();

  if (!csvText) {
    throw new ApiError(400, "No data found or CSV file is empty");
  }

  // 4. Parse the CSV into structured JSON
  const parsedRows = parseCSV(csvText);

  if (parsedRows.length === 0) {
    throw new ApiError(400, "No data found or CSV file is empty");
  }

  const headers = parsedRows[0].map(h => h.toLowerCase().trim());
  const normalizedHeaders = headers.map(h => h.replace(/[\s_-]+/g, "").toLowerCase().trim());

  // Define normalized required columns
  const requiredCols: Record<string, string[]> = {
    health: ["date", "sleephours", "workoutminutes", "stresslevel"],
    finance: ["date", "amountsaved", "discretionaryspent"],
    career: ["date", "hoursstudied", "productivityrating"]
  };
  
  // Define normalized valid columns
  const validCols: Record<string, string[]> = {
    health: ["date", "sleephours", "workoutminutes", "stresslevel", "moodscore", "energylevel", "caloriesconsumed", "caloriegoal", "waterglasses", "mealseatentoday"],
    finance: ["date", "amountsaved", "discretionaryspent", "spendingcategory", "spendingtime", "biggestexpensetoday", "impulsespend"],
    career: ["date", "hoursstudied", "productivityrating", "sessionscompleted", "coursename", "goalworkedon", "blockertoday"]
  };

  const domainRequired = requiredCols[domain];
  const domainValid = validCols[domain];

  // Check if required columns are present
  const missingCols = domainRequired.filter(col => !normalizedHeaders.includes(col));
  if (missingCols.length > 0) {
    throw new ApiError(400, `Required columns missing for ${domain} domain: ${missingCols.join(", ")}`);
  }

  // Check if all present columns belong only to this domain
  const invalidCols = normalizedHeaders.filter(col => col !== "" && !domainValid.includes(col));
  if (invalidCols.length > 0) {
    throw new ApiError(400, `Invalid columns for ${domain} domain: ${invalidCols.join(", ")}`);
  }

  // Filter out empty rows
  const dataRows = parsedRows.slice(1).filter(row => row.some(cell => cell.trim() !== ""));
  if (dataRows.length === 0) {
    throw new ApiError(400, "No data found or CSV file is empty");
  }

  await connectDB();
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const numericFields = [
    "sleephours", "workoutminutes", "stresslevel", "moodscore", "energylevel",
    "caloriesconsumed", "caloriegoal", "waterglasses", "amountsaved", "discretionaryspent",
    "spendingtime", "hoursstudied", "productivityrating", "sessionscompleted"
  ];
  
  const camelCaseMap: Record<string, string> = {
    sleephours: "sleepHours",
    workoutminutes: "workoutMinutes",
    stresslevel: "stressLevel",
    moodscore: "moodScore",
    energylevel: "energyLevel",
    caloriesconsumed: "caloriesConsumed",
    caloriegoal: "calorieGoal",
    waterglasses: "waterGlasses",
    amountsaved: "amountSaved",
    discretionaryspent: "discretionarySpent",
    spendingtime: "spendingTime",
    hoursstudied: "hoursStudied",
    productivityrating: "productivityRating",
    sessionscompleted: "sessionsCompleted",
    spendingcategory: "spendingCategory",
    biggestexpensetoday: "biggestExpenseToday",
    impulsespend: "impulseSpend",
    goalworkedon: "goalWorkedOn",
    blockertoday: "blockerToday",
    coursename: "courseName",
    date: "date"
  };

  const parsedLogs = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const record: Record<string, any> = {};
    let rawDateVal = "";
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      if (!header) continue;
      const val = row[j] || "";
      
      const normalizedHeader = header.replace(/[\s_-]+/g, "").toLowerCase().trim();
      const standardHeader = camelCaseMap[normalizedHeader] || header;

      if (normalizedHeader === "date") {
        rawDateVal = val.trim();
      } else if (numericFields.includes(normalizedHeader)) {
        const num = Number(val);
        record[standardHeader] = !isNaN(num) && val !== "" ? num : undefined;
      } else {
        // Enforce Formula Injection sanitization for CSV spreadsheets
        record[standardHeader] = typeof val === "string" && /^[=\+\-\@]/.test(val) ? `'${val}` : val;
      }
    }
    
    // Server-side validation
    validateRow(domain, record, rawDateVal, i + 2);

    const logDate = new Date(rawDateVal);

    parsedLogs.push({
      userId: user._id,
      domain: domain,
      domainData: record,
      date: logDate
    });
  }

  // 1. Bulk insert the logs into MongoDB
  await Log.insertMany(parsedLogs);

  // 2. Fire the protected background task
  waitUntil(
    generateAndStoreSnapshot(user._id.toString()).catch(err => {
      console.error("[CRITICAL] Background Snapshot Failed:", err);
    })
  );

  // 3. Return immediately to the user
  return NextResponse.json({ 
    success: true, 
    message: `Successfully imported ${parsedLogs.length} logs. Syntra Core is analyzing the data.` 
  }, { status: 201 });
});