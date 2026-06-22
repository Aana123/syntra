//src/app/api/upload/csv/route.ts
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/database/mongodb";
import User from "@/models/User";
import Log from "@/models/Log";
import crypto from "crypto";
import { generateAndStoreSnapshot } from "@/lib/services/snapshotService";
import { recalculateStreak } from "@/lib/logic/streak";
import { apiHandler } from "@/lib/utils/apiHandler";
import { ApiError } from "@/lib/utils/apiError";
import {
  calculateHealthScore,
  calculateFinanceScore,
  calculateCareerScore,
  calculateEarnedXP
} from "@/lib/logic/scoring";

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

// Helper to normalize column headers with support for common aliases and typos
function normalizeHeader(h: string): string {
  const clean = h.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().trim();

  // Date aliases
  if (/^(date|logdate)$/i.test(clean)) {
    return "date";
  }

  // Health aliases
  if (/^(sleephours|sleep|hoursofsleep)$/i.test(clean)) {
    return "sleephours";
  }
  if (/^(workoutminutes|workout|exercise|workoutmins|exerciseminutes)$/i.test(clean)) {
    return "workoutminutes";
  }
  if (/^(stresslevel|stress)$/i.test(clean)) {
    return "stresslevel";
  }
  if (/^(moodscore|mood)$/i.test(clean)) {
    return "moodscore";
  }
  if (/^(energylevel|energy)$/i.test(clean)) {
    return "energylevel";
  }
  if (/^(caloriesconsumed|calories|caloriesspent)$/i.test(clean)) {
    return "caloriesconsumed";
  }
  if (/^caloriegoal$/i.test(clean)) {
    return "caloriegoal";
  }
  if (/^(waterglasses|water|glassesofwater)$/i.test(clean)) {
    return "waterglasses";
  }

  // Finance aliases
  if (/^(amountsaved|saved|savings|amtsaved|amountsavedtoday)$/i.test(clean)) {
    return "amountsaved";
  }
  if (/^(discretionaryspent|discretionaryspend|discretionaryspending|discretionary|spend|spent|spending|spendings|expense|expenses|expenditure|sicretionaryspent|sicretionaryspend|sicretionaryspending|sicretionary|secretionaryspend|secretionaryspent|secretionaryspending)$/i.test(clean)) {
    return "discretionaryspent";
  }
  if (/^(spendingcategory|category)$/i.test(clean)) {
    return "spendingcategory";
  }
  if (/^(spendingtime|time)$/i.test(clean)) {
    return "spendingtime";
  }
  if (/^(biggestexpensetoday|biggestexpense)$/i.test(clean)) {
    return "biggestexpensetoday";
  }
  if (/^(impulsespend|impulse)$/i.test(clean)) {
    return "impulsespend";
  }

  // Career aliases
  if (/^(hoursstudied|studyhours|hours|study|studied)$/i.test(clean)) {
    return "hoursstudied";
  }
  if (/^(productivityrating|productivity|rating)$/i.test(clean)) {
    return "productivityrating";
  }
  if (/^(sessionscompleted|sessions)$/i.test(clean)) {
    return "sessionscompleted";
  }
  if (/^(coursename|course)$/i.test(clean)) {
    return "coursename";
  }
  if (/^(goalworkedon|goal)$/i.test(clean)) {
    return "goalworkedon";
  }
  if (/^(blockertoday|blocker)$/i.test(clean)) {
    return "blockertoday";
  }

  return clean;
}

// Helper to parse and format dates from diverse formats into YYYY-MM-DD
function parseAndFormatDate(val: any): string | null {
  if (!val) return null;

  // 1. If it is already a Date object (often happens with SheetJS cellDates: true)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split("T")[0];
  }

  const str = String(val).trim();
  if (!str) return null;

  // 2. Check if it matches YYYY-MM-DD directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 3. Try parsing as Excel serial number if it is a number
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    // Excel date epoch is Jan 1 1900.
    const date = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  // 4. Try parsing common string formats
  // Format: YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
    return str.replace(/\//g, "-");
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY or MM-DD-YYYY
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    let parsedMonth = month;
    let parsedDay = day;
    if (month > 12 && day <= 12) {
      parsedMonth = day;
      parsedDay = month;
    }
    const date = new Date(year, parsedMonth - 1, parsedDay);
    if (!isNaN(date.getTime())) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // Fallback to standard JS date parsing for other strings
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

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

  const headers = parsedRows[0].map(h => h.trim());
  const normalizedHeaders = headers.map(h => normalizeHeader(h));

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

  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const existingUpload = await Log.findOne({ userId: user._id, fileHash });
  if (existingUpload) {
    throw new ApiError(409, "This spreadsheet has already been uploaded and processed.");
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

      const normalizedHeader = normalizeHeader(header);
      const standardHeader = camelCaseMap[normalizedHeader] || header;

      if (normalizedHeader === "date") {
        const parsedDate = parseAndFormatDate(val);
        rawDateVal = parsedDate || val.trim();
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
      date: logDate,
      fileHash: fileHash
    });
  }

  // 1. Bulk insert the logs into MongoDB
  await Log.insertMany(parsedLogs);

  // 2. Exponential Trailing Moving Average recalculation on each imported record
  const scoresBefore = { health: user.scores.health ?? 50, finance: user.scores.finance ?? 50, career: user.scores.career ?? 50 };
  const smoothingFactor = 0.25;
  let currentScore = user.scores[domain as keyof typeof user.scores] || 50;

  for (const log of parsedLogs) {
    const data = log.domainData;
    let newScore = 50;
    if (domain === "health") {
      newScore = calculateHealthScore(
        Number(data.sleepHours) || 0,
        Number(data.workoutMinutes) || 0,
        Number(data.stressLevel) || 1,
        typeof data.waterGlasses !== "undefined" ? Number(data.waterGlasses) : undefined
      );
    } else if (domain === "finance") {
      newScore = calculateFinanceScore(
        Number(data.amountSaved) || 0,
        Number(data.discretionarySpent) || 0,
        data.impulseSpend === true || String(data.impulseSpend).toLowerCase() === "true",
        user.profile?.monthlyIncome,
        user.profile?.monthlyBudget
      );
    } else if (domain === "career") {
      newScore = calculateCareerScore(
        Number(data.hoursStudied) || 0,
        Number(data.productivityRating) || 1
      );
    }
    currentScore = Math.round((currentScore * (1 - smoothingFactor)) + (newScore * smoothingFactor));
    user.gamification.totalPoints += calculateEarnedXP(currentScore);
  }

  // Update user score
  user.scores[domain as keyof typeof user.scores] = currentScore;
  user.gamification.totalPoints += 50; // Ingestion bonus

  // Streak logic
  await recalculateStreak(user);

  // Award badges
  const newBadges: string[] = [];
  const currentBadges = user.badges || [];

  if (user.gamification.currentStreak >= 7 && !currentBadges.includes("Week Warrior")) {
    newBadges.push("Week Warrior");
  }
  if (user.gamification.currentStreak >= 30 && !currentBadges.includes("Month Master")) {
    newBadges.push("Month Master");
  }
  if (user.gamification.totalPoints >= 500 && !currentBadges.includes("Rising Twin")) {
    newBadges.push("Rising Twin");
  }
  if (domain === "finance" && user.scores.finance >= 80 && !currentBadges.includes("Savings Streak")) {
    newBadges.push("Savings Streak");
  }
  if (domain === "career" && user.scores.career >= 80 && !currentBadges.includes("Learning Machine")) {
    newBadges.push("Learning Machine");
  }

  if (newBadges.length > 0) {
    user.badges.push(...newBadges);
  }

  user.markModified("scores");
  user.markModified("gamification");
  user.markModified("badges");
  await user.save();
  const scoresAfter = { health: user.scores.health ?? 50, finance: user.scores.finance ?? 50, career: user.scores.career ?? 50 };

  // 3. Fire the protected background task (with the pre-fetched / updated user)
  waitUntil(
    generateAndStoreSnapshot(user._id.toString(), user, undefined, true).catch(err => {
      console.error("[CRITICAL] Background Snapshot Failed:", err);
    })
  );

  // 4. Return immediately to the user
  return NextResponse.json({
    success: true,
    domain,
    message: `Successfully imported ${parsedLogs.length} logs. Syntra Core is analyzing the data.`,
    scoresBefore,
    scoresAfter,
    xpEarned: 50,
  }, { status: 201 });
});