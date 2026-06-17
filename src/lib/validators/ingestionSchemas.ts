import { z } from "zod";

// ==========================================
// 1. HEALTH DOMAIN SCHEMAS
// ==========================================

export const BloodReportSchema = z.object({
  labName: z.string().optional(),
  reportDate: z.string().optional(),
  metrics: z.array(
    z.object({
      name: z.string(), // e.g., "Hemoglobin", "Cholesterol", "TSH", "Vitamin D"
      value: z.preprocess((val) => {
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const matched = val.replace(/,/g, "").match(/[-+]?[0-9]*\.?[0-9]+/);
          if (matched) {
            const num = parseFloat(matched[0]);
            if (!isNaN(num)) return num;
          }
        }
        return 0;
      }, z.number().default(0)),
      unit: z.preprocess((val) => typeof val === "string" ? val : "", z.string().default("")),
      referenceRange: z.string().optional(),
      status: z.preprocess((val) => {
        if (typeof val !== "string") return "unknown";
        const clean = val.trim().toLowerCase();
        if (["low", "normal", "high", "unknown"].includes(clean)) return clean;
        if (clean.includes("low") || clean.includes("deficient") || clean.includes("decrease") || clean.includes("borderline low")) return "low";
        if (clean.includes("high") || clean.includes("elevated") || clean.includes("increase") || clean.includes("borderline high")) return "high";
        if (clean.includes("normal") || clean.includes("optimal") || clean.includes("good") || clean.includes("ok")) return "normal";
        return "unknown";
      }, z.enum(["low", "normal", "high", "unknown"]).default("unknown")),
    })
  ).optional().default([]),
});

export const PrescriptionSchema = z.object({
  doctorName: z.string().optional(),
  clinicName: z.string().optional(),
  date: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  diagnosis: z.string().optional(),
  medications: z.array(
    z.object({
      name: z.string(),
      dosage: z.string(), // e.g., "500mg"
      frequency: z.string(), // e.g., "Once daily", "TDS"
      duration: z.string().optional(), // e.g., "5 days"
    })
  ),
  instructions: z.string().optional(),
});

export const HealthCheckupSchema = z.object({
  facilityName: z.string().optional(),
  checkupDate: z.string().optional(),
  vitals: z.object({
    systolicBP: z.coerce.number().optional(),
    diastolicBP: z.coerce.number().optional(),
    heartRate: z.coerce.number().optional(),
    temperature: z.coerce.number().optional(),
    weight: z.coerce.number().optional(),
    height: z.coerce.number().optional(),
    bmi: z.coerce.number().optional(),
  }).optional(),
  summary: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
});

export const FitnessAssessmentSchema = z.object({
  assessmentDate: z.string().optional(),
  trainerName: z.string().optional(),
  metrics: z.object({
    vo2Max: z.coerce.number().optional(),
    bodyFatPercent: z.coerce.number().optional(),
    muscleMassPercent: z.coerce.number().optional(),
    flexibilityScore: z.string().optional(), // e.g., "Excellent"
  }).optional(),
  strengthTests: z.array(
    z.object({
      exercise: z.string(), // e.g., "Squat", "Bench Press"
      maxWeightKg: z.coerce.number().optional(),
      reps: z.coerce.number().optional(),
    })
  ).optional().default([]),
});

// ==========================================
// 2. FINANCE DOMAIN SCHEMAS
// ==========================================

export const SalarySlipSchema = z.object({
  employer: z.string().optional(),
  payPeriod: z.string().optional(),
  grossEarnings: z.coerce.number(),
  netTakeHome: z.coerce.number(),
  allowances: z.array(
    z.object({
      name: z.string(),
      amount: z.coerce.number(),
    })
  ).optional().default([]),
  deductions: z.array(
    z.object({
      name: z.string(),
      amount: z.coerce.number(),
    })
  ).optional().default([]),
});

export const LoanDocumentSchema = z.object({
  bankName: z.string().optional(),
  loanType: z.string().optional(), // e.g., "Home Loan", "Car Loan"
  principalAmount: z.coerce.number(),
  interestRatePercent: z.coerce.number(),
  termMonths: z.coerce.number(),
  monthlyEMI: z.coerce.number().optional(),
  startDate: z.string().optional(),
});

export const CreditCardStatementSchema = z.object({
  cardIssuer: z.string().optional(),
  statementDate: z.string().optional(),
  totalAmountDue: z.coerce.number(),
  minimumAmountDue: z.coerce.number(),
  paymentDueDate: z.string().optional(),
  transactions: z.array(
    z.object({
      date: z.string(),
      vendor: z.string(),
      amount: z.coerce.number(),
      category: z.string().optional(),
    })
  ),
});

export const StockPortfolioSchema = z.object({
  brokerName: z.string().optional(),
  portfolioValue: z.coerce.number().optional(),
  holdings: z.array(
    z.object({
      symbol: z.string(), // e.g., "AAPL", "RELIANCE"
      companyName: z.string().optional(),
      sharesCount: z.coerce.number(),
      avgPricePaid: z.coerce.number(),
      currentPrice: z.coerce.number().optional(),
    })
  ),
});

export const InsurancePolicySchema = z.object({
  insurerName: z.string().optional(),
  policyNumber: z.string().optional(),
  policyType: z.string().optional(), // e.g., "Health", "Life", "Car"
  sumAssured: z.coerce.number(),
  annualPremium: z.coerce.number(),
  validUntil: z.string().optional(),
});

// ==========================================
// 3. CAREER & CERTIFICATIONS SCHEMAS
// ==========================================

export const CertificationSchema = z.object({
  title: z.string().optional(),
  issuingOrganization: z.string().optional(),
  issueDate: z.string().optional(),
  expirationDate: z.string().optional(),
  credentialId: z.string().optional(),
  verificationUrl: z.string().optional(),
});

export const ResumeSchema = z.object({
  candidateName: z.string().optional(),
  contactEmail: z.string().optional(),
  skills: z.preprocess((val) => {
    if (typeof val === "string") {
      return val.split(",").map(s => s.trim()).filter(Boolean);
    }
    return val;
  }, z.array(z.string()).optional().default([])),
  experienceYears: z.number().optional(),
  education: z.array(
    z.object({
      degree: z.string().optional().default(""),
      school: z.string().optional().default(""),
      graduationYear: z.coerce.string().optional(),
    })
  ).optional().default([]),
  workHistory: z.array(
    z.object({
      role: z.string().optional().default(""),
      company: z.string().optional().default(""),
      duration: z.coerce.string().optional().default(""),
      description: z.string().optional(),
    })
  ).optional().default([]),
});

// Map of schema type to Zod object for dynamic validation router
export const IngestionSchemaMap: Record<string, z.ZodObject<any, any>> = {
  blood_report: BloodReportSchema,
  prescription: PrescriptionSchema,
  health_checkup: HealthCheckupSchema,
  fitness_assessment: FitnessAssessmentSchema,
  salary_slip: SalarySlipSchema,
  loan_document: LoanDocumentSchema,
  credit_card: CreditCardStatementSchema,
  stock_portfolio: StockPortfolioSchema,
  insurance_policy: InsurancePolicySchema,
  certification: CertificationSchema,
  resume: ResumeSchema,
};
