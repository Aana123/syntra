import { PDFParse } from "pdf-parse";

async function main() {
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

  console.log("Initializing parser...");
  try {
    const parser = new PDFParse({ data: pdfBuffer });
    console.log("Getting text...");
    const textResult = await parser.getText();
    console.log("Extracted Text:", JSON.stringify(textResult.text));
    await parser.destroy();
  } catch (err: any) {
    console.error("Parser failed:", err);
  }
}

main().catch(console.error);
