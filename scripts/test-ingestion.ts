import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { connectDB } from "../src/lib/mongodb";
import User from "../src/models/User";
import Log from "../src/models/Log";
import { POST } from "../src/app/api/ingestion/upload/route";

async function runTest() {
  await connectDB();
  const user = await User.findOne({});
  if (!user) {
    console.error("No user found in the DB. Please create/register a user first.");
    process.exit(1);
  }
  console.log(`Using test user: ${user.name} (${user.email}) - ID: ${user._id}`);

  // Create a minimal text PDF buffer
  const pdfBuffer = Buffer.from(
    `%PDF-1.4\n` +
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n` +
    `4 0 obj\n<< /Length 250 >>\nstream\n` +
    `BT\n/F1 12 Tf\n100 700 Td\n(BLOOD TEST REPORT: COMPLETE BLOOD COUNT) Tj\n` +
    `0 -20 Td\n(Lab Name: METRIC LABS) Tj\n` +
    `0 -20 Td\n(Report Date: 2026-06-01) Tj\n` +
    `0 -20 Td\n(Hemoglobin 14.2 g/dL Reference Range: 13.5-17.5 status: normal) Tj\n` +
    `0 -20 Td\n(Total Cholesterol 220 mg/dL Reference Range: <200 status: high) Tj\n` +
    `ET\n` +
    `endstream\nendobj\n` +
    `xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000262 00000 n\n` +
    `trailer\n<< /Size 5 /Root 1 0 R >>\n` +
    `startxref\n500\n` +
    `%%EOF`
  );

  const fileBlob = new Blob([pdfBuffer], { type: "application/pdf" });
  const file = new File([fileBlob], "blood_report.pdf", { type: "application/pdf" });

  const formData = new FormData();
  formData.append("file", file);

  const req = new Request("http://localhost:3000/api/ingestion/upload", {
    method: "POST",
    body: formData,
    headers: {
      "x-test-user-id": user._id.toString()
    }
  });

  console.log("Calling POST /api/ingestion/upload...");
  const res = await POST(req);
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));

  if (res.status === 200) {
    console.log("Success! Checking DB logs...");
    const latestLog = await Log.findOne({ userId: user._id, domain: "health" }).sort({ date: -1 });
    console.log("Latest Log in DB:", JSON.stringify(latestLog, null, 2));
  } else {
    console.error("Upload failed!");
  }

  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
