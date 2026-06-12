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
      value: z.number(),
      unit: z.string(),
      referenceRange: z.string().optional(),
      status: z.enum(["low", "normal", "high", "unknown"]),
    })
  ),
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
    systolicBP: z.number().optional(),
    diastolicBP: z.number().optional(),
    heartRate: z.number().optional(),
    temperature: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    bmi: z.number().optional(),
  }).optional(),
  summary: z.string().optional(),
  recommendations: z.array(z.string()).optional(),
});

export const FitnessAssessmentSchema = z.object({
  assessmentDate: z.string().optional(),
  trainerName: z.string().optional(),
  metrics: z.object({
    vo2Max: z.number().optional(),
    bodyFatPercent: z.number().optional(),
    muscleMassPercent: z.number().optional(),
    flexibilityScore: z.string().optional(), // e.g., "Excellent"
  }).optional(),
  strengthTests: z.array(
    z.object({
      exercise: z.string(), // e.g., "Squat", "Bench Press"
      maxWeightKg: z.number().optional(),
      reps: z.number().optional(),
    })
  ).optional(),
});

// ==========================================
// 2. FINANCE DOMAIN SCHEMAS
// ==========================================

export const SalarySlipSchema = z.object({
  employer: z.string().optional(),
  payPeriod: z.string().optional(),
  grossEarnings: z.number(),
  netTakeHome: z.number(),
  allowances: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
    })
  ).optional(),
  deductions: z.array(
    z.object({
      name: z.string(),
      amount: z.number(),
    })
  ).optional(),
});

export const LoanDocumentSchema = z.object({
  bankName: z.string().optional(),
  loanType: z.string().optional(), // e.g., "Home Loan", "Car Loan"
  principalAmount: z.number(),
  interestRatePercent: z.number(),
  termMonths: z.number(),
  monthlyEMI: z.number().optional(),
  startDate: z.string().optional(),
});

export const CreditCardStatementSchema = z.object({
  cardIssuer: z.string().optional(),
  statementDate: z.string().optional(),
  totalAmountDue: z.number(),
  minimumAmountDue: z.number(),
  paymentDueDate: z.string().optional(),
  transactions: z.array(
    z.object({
      date: z.string(),
      vendor: z.string(),
      amount: z.number(),
      category: z.string().optional(),
    })
  ),
});

export const StockPortfolioSchema = z.object({
  brokerName: z.string().optional(),
  portfolioValue: z.number().optional(),
  holdings: z.array(
    z.object({
      symbol: z.string(), // e.g., "AAPL", "RELIANCE"
      companyName: z.string().optional(),
      sharesCount: z.number(),
      avgPricePaid: z.number(),
      currentPrice: z.number().optional(),
    })
  ),
});

export const InsurancePolicySchema = z.object({
  insurerName: z.string().optional(),
  policyNumber: z.string().optional(),
  policyType: z.string().optional(), // e.g., "Health", "Life", "Car"
  sumAssured: z.number(),
  annualPremium: z.number(),
  validUntil: z.string().optional(),
});

// ==========================================
// 3. CAREER & CERTIFICATIONS SCHEMAS
// ==========================================

export const CertificationSchema = z.object({
  title: z.string(),
  issuingOrganization: z.string(),
  issueDate: z.string().optional(),
  expirationDate: z.string().optional(),
  credentialId: z.string().optional(),
  verificationUrl: z.string().optional(),
});

export const ResumeSchema = z.object({
  candidateName: z.string().optional(),
  contactEmail: z.string().optional(),
  skills: z.array(z.string()),
  experienceYears: z.number().optional(),
  education: z.array(
    z.object({
      degree: z.string(),
      school: z.string(),
      graduationYear: z.string().optional(),
    })
  ),
  workHistory: z.array(
    z.object({
      role: z.string(),
      company: z.string(),
      duration: z.string(),
      description: z.string().optional(),
    })
  ),
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
