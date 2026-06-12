// src/models/AssetLiability.ts
import mongoose, { Schema, Document, models } from "mongoose";

export interface IAssetLiability extends Document {
  userId: mongoose.Types.ObjectId;
  
  // 1. Assets
  assets: {
    liquid: {
      savingsAccounts: Array<{
        id: string;
        bankName: string;
        accountType: "savings" | "current" | "salary";
        balance: number;
        lastUpdated: Date;
      }>;
      fixedDeposits: Array<{
        id: string;
        bankName: string;
        principal: number;
        interestRate: number;
        maturityDate?: Date;
        maturityAmount?: number;
        isCumulative: boolean;
      }>;
      recurringDeposits: Array<{
        id: string;
        bankName: string;
        monthlyInstallment: number;
        interestRate: number;
        maturityDate?: Date;
        investedSoFar: number;
        maturityValue?: number;
      }>;
      cashInHand: number;
      digitalWallets: number; // Paytm/PhonePe/GPay total
    };
    investments: {
      stocks: {
        brokerName: string;
        currentValue: number;
        investedAmount: number;
      };
      mutualFunds: Array<{
        id: string;
        fundName: string;
        type: "equity" | "debt" | "hybrid" | "ELSS";
        currentValue: number;
        investedAmount: number;
        xirr?: number;
        folioNumber?: string;
      }>;
      ppf: {
        corpus: number;
        annualContribution: number;
        maturityYear?: number;
        institution?: string;
      };
      epf: {
        corpus: number;
        employeeMonthlyContribution: number;
        employerMonthlyContribution: number;
        uan?: string;
      };
      nps: {
        corpus: number;
        tier: "tier1" | "tier2";
        pran?: string;
        allocation: { equityPct: number; corporatePct: number; govtPct: number };
      };
      sgbBonds: Array<{
        id: string;
        name: string;
        faceValue: number;
        currentValue: number;
        maturityDate?: Date;
      }>;
      usStocks: {
        platform: string;
        currentValueUSD: number;
        exchangeRate: number; // USD to INR
      };
    };
    physical: {
      properties: Array<{
        id: string;
        name: string; // e.g. "Primary Flat"
        type: "flat" | "house" | "plot";
        city: string;
        areaSqft?: number;
        purchasePrice?: number;
        purchaseYear?: number;
        estimatedValue: number;
        isSelfOccupied: boolean;
        rentalIncome?: number;
      }>;
      vehicles: Array<{
        id: string;
        name: string; // e.g. "Tata Harrier"
        type: "car" | "bike" | "commercial";
        purchaseYear?: number;
        purchasePrice?: number;
        estimatedValue: number;
      }>;
      goldJewellery: {
        weightGrams: number;
        purity: "24K" | "22K" | "18K";
        estimatedValue: number;
        location?: "home" | "locker";
      };
      silverMetals: {
        weightGrams: number;
        estimatedValue: number;
      };
      collectibles: Array<{
        id: string;
        description: string;
        estimatedValue: number;
        yearAcquired?: number;
      }>;
    };
    other: {
      businessOwnership: Array<{
        id: string;
        businessName: string;
        ownershipPct: number;
        valuationBasis?: string; // revenue multiple / book value etc.
        estimatedValue: number;
      }>;
      loansGiven: Array<{
        id: string;
        borrowerName?: string;
        amountLent: number;
        expectedRepayment?: Date;
        interestRate?: number;
      }>;
      previousGratuity: number;
    };
  };

  // 2. Liabilities
  liabilities: {
    shortTerm: {
      creditCards: Array<{
        id: string;
        cardName: string;
        outstanding: number;
        minimumDue: number;
        dueDate?: Date;
        apr?: number;
        creditLimit?: number;
      }>;
      bnpl: Array<{
        id: string;
        platform: string; // LazyPay, Simpl etc.
        outstanding: number;
        dueDate?: Date;
      }>;
      personalLoans: Array<{
        id: string;
        lender: string;
        outstanding: number;
        emi: number;
        interestRate: number;
        remainingTenureMonths: number;
        dueDate?: Date;
      }>;
      informalLoans: Array<{
        id: string;
        lender?: string;
        outstanding: number;
        repaymentDate?: Date;
      }>;
    };
    longTerm: {
      homeLoans: Array<{
        id: string;
        lender: string;
        originalAmount?: number;
        outstanding: number;
        emi: number;
        interestRate: number;
        loanType: "fixed" | "floating";
        remainingTenureMonths: number;
        startDate?: Date;
        linkedAssetId?: string; // Links to physical.properties[id]
      }>;
      carLoans: Array<{
        id: string;
        lender: string;
        outstanding: number;
        emi: number;
        interestRate: number;
        remainingTenureMonths: number;
        linkedAssetId?: string; // Links to physical.vehicles[id]
      }>;
      educationLoans: Array<{
        id: string;
        lender: string;
        outstanding: number;
        emi: number;
        interestRate: number;
        remainingTenureMonths: number;
        isMoratoriumActive: boolean;
        context?: string;
      }>;
      businessLoans: Array<{
        id: string;
        lender: string;
        outstanding: number;
        emi: number;
        interestRate: number;
        remainingTenureMonths: number;
        collateral?: string;
        linkedAssetId?: string; // Links to other.businessOwnership[id]
      }>;
      loansAgainstProperty: Array<{
        id: string;
        lender: string;
        outstanding: number;
        emi: number;
        interestRate: number;
        remainingTenureMonths: number;
        linkedAssetId?: string; // Links to physical.properties[id]
      }>;
      goldLoans: Array<{
        id: string;
        lender: string;
        outstanding: number;
        goldPledgedGrams: number;
        dueDate?: Date;
        interestRate: number;
      }>;
    };
    contingent: Array<{
      id: string;
      description: string;
      exposureAmount: number;
      lender?: string;
      probabilityOfCalling: "low" | "medium" | "high";
    }>;
    pendingTaxDues: number;
    legalDisputes: Array<{
      id: string;
      description: string;
      exposureAmount: number;
    }>;
  };

  // 3. Protection Layer (Assets + Liabilities hybrid)
  protection: {
    termInsurance: Array<{
      id: string;
      policyName: string;
      sumAssured: number;
      annualPremium: number;
      renewalDate?: Date;
    }>;
    endowmentPolicies: Array<{
      id: string;
      policyName: string;
      sumAssured: number;
      surrenderValue: number;
      annualPremium: number;
      maturityDate?: Date;
    }>;
  };
  familyOutflows?: {
    children: Array<{
      id: string;
      yearOfBirth: number;
      schoolFeesAnnual: number;
      schoolType: "government" | "private" | "international";
      tuitionMonthly: number;
      extracurricularMonthly: number;
      childcareMonthly: number;
    }>;
    caregiving: {
      parentHealthcareMonthly: number;
      parentInsuranceAnnualPremium: number;
      parentInsuranceCoverAmount: number;
      monthlyRemittance: number;
      householdHelpMonthly: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const SavingsAccountSchema = new Schema({
  id: { type: String, required: true },
  bankName: { type: String, required: true },
  accountType: { type: String, enum: ["savings", "current", "salary"], default: "savings" },
  balance: { type: Number, required: true, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

const FixedDepositSchema = new Schema({
  id: { type: String, required: true },
  bankName: { type: String, required: true },
  principal: { type: Number, required: true, default: 0 },
  interestRate: { type: Number, required: true, default: 0 },
  maturityDate: { type: Date },
  maturityAmount: { type: Number },
  isCumulative: { type: Boolean, default: true }
});

const RecurringDepositSchema = new Schema({
  id: { type: String, required: true },
  bankName: { type: String, required: true },
  monthlyInstallment: { type: Number, required: true, default: 0 },
  interestRate: { type: Number, required: true, default: 0 },
  maturityDate: { type: Date },
  investedSoFar: { type: Number, required: true, default: 0 },
  maturityValue: { type: Number }
});

const MutualFundSchema = new Schema({
  id: { type: String, required: true },
  fundName: { type: String, required: true },
  type: { type: String, enum: ["equity", "debt", "hybrid", "ELSS"], default: "equity" },
  currentValue: { type: Number, required: true, default: 0 },
  investedAmount: { type: Number, required: true, default: 0 },
  xirr: { type: Number },
  folioNumber: { type: String }
});

const SgbBondSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  faceValue: { type: Number, required: true, default: 0 },
  currentValue: { type: Number, required: true, default: 0 },
  maturityDate: { type: Date }
});

const PropertySchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["flat", "house", "plot"], default: "flat" },
  city: { type: String, required: true },
  areaSqft: { type: Number },
  purchasePrice: { type: Number },
  purchaseYear: { type: Number },
  estimatedValue: { type: Number, required: true, default: 0 },
  isSelfOccupied: { type: Boolean, default: true },
  rentalIncome: { type: Number, default: 0 }
});

const VehicleSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["car", "bike", "commercial"], default: "car" },
  purchaseYear: { type: Number },
  purchasePrice: { type: Number },
  estimatedValue: { type: Number, required: true, default: 0 }
});

const CollectibleSchema = new Schema({
  id: { type: String, required: true },
  description: { type: String, required: true },
  estimatedValue: { type: Number, required: true, default: 0 },
  yearAcquired: { type: Number }
});

const BusinessOwnershipSchema = new Schema({
  id: { type: String, required: true },
  businessName: { type: String, required: true },
  ownershipPct: { type: Number, required: true, default: 100 },
  valuationBasis: { type: String },
  estimatedValue: { type: Number, required: true, default: 0 }
});

const LoanGivenSchema = new Schema({
  id: { type: String, required: true },
  borrowerName: { type: String },
  amountLent: { type: Number, required: true, default: 0 },
  expectedRepayment: { type: Date },
  interestRate: { type: Number }
});

const CreditCardSchema = new Schema({
  id: { type: String, required: true },
  cardName: { type: String, required: true },
  outstanding: { type: Number, required: true, default: 0 },
  minimumDue: { type: Number, required: true, default: 0 },
  dueDate: { type: Date },
  apr: { type: Number },
  creditLimit: { type: Number }
});

const BnplSchema = new Schema({
  id: { type: String, required: true },
  platform: { type: String, required: true },
  outstanding: { type: Number, required: true, default: 0 },
  dueDate: { type: Date }
});

const PersonalLoanSchema = new Schema({
  id: { type: String, required: true },
  lender: { type: String, required: true },
  outstanding: { type: Number, required: true, default: 0 },
  emi: { type: Number, required: true, default: 0 },
  interestRate: { type: Number, required: true, default: 0 },
  remainingTenureMonths: { type: Number, required: true, default: 12 },
  dueDate: { type: Date }
});

const InformalLoanSchema = new Schema({
  id: { type: String, required: true },
  lender: { type: String },
  outstanding: { type: Number, required: true, default: 0 },
  repaymentDate: { type: Date }
});

const HomeLoanSchema = new Schema({
  id: { type: String, required: true },
  lender: { type: String, required: true },
  originalAmount: { type: Number },
  outstanding: { type: Number, required: true, default: 0 },
  emi: { type: Number, required: true, default: 0 },
  interestRate: { type: Number, required: true, default: 0 },
  loanType: { type: String, enum: ["fixed", "floating"], default: "floating" },
  remainingTenureMonths: { type: Number, required: true, default: 120 },
  startDate: { type: Date },
  linkedAssetId: { type: String }
});

const CarLoanSchema = new Schema({
  id: { type: String, required: true },
  lender: { type: String, required: true },
  outstanding: { type: Number, required: true, default: 0 },
  emi: { type: Number, required: true, default: 0 },
  interestRate: { type: Number, required: true, default: 0 },
  remainingTenureMonths: { type: Number, required: true, default: 36 },
  linkedAssetId: { type: String }
});

const EducationLoanSchema = new Schema({
  id: { type: String, required: true },
  lender: { type: String, required: true },
  outstanding: { type: Number, required: true, default: 0 },
  emi: { type: Number, required: true, default: 0 },
  interestRate: { type: Number, required: true, default: 0 },
  remainingTenureMonths: { type: Number, required: true, default: 60 },
  isMoratoriumActive: { type: Boolean, default: false },
  context: { type: String }
});

const BusinessLoanSchema = new Schema({
  id: { type: String, required: true },
  lender: { type: String, required: true },
  outstanding: { type: Number, required: true, default: 0 },
  emi: { type: Number, required: true, default: 0 },
  interestRate: { type: Number, required: true, default: 0 },
  remainingTenureMonths: { type: Number, required: true, default: 60 },
  collateral: { type: String },
  linkedAssetId: { type: String }
});

const LapLoanSchema = new Schema({
  id: { type: String, required: true },
  lender: { type: String, required: true },
  outstanding: { type: Number, required: true, default: 0 },
  emi: { type: Number, required: true, default: 0 },
  interestRate: { type: Number, required: true, default: 0 },
  remainingTenureMonths: { type: Number, required: true, default: 120 },
  linkedAssetId: { type: String }
});

const GoldLoanSchema = new Schema({
  id: { type: String, required: true },
  lender: { type: String, required: true },
  outstanding: { type: Number, required: true, default: 0 },
  goldPledgedGrams: { type: Number, required: true, default: 0 },
  dueDate: { type: Date },
  interestRate: { type: Number, required: true, default: 0 }
});

const ContingentLiabilitySchema = new Schema({
  id: { type: String, required: true },
  description: { type: String, required: true },
  exposureAmount: { type: Number, required: true, default: 0 },
  lender: { type: String },
  probabilityOfCalling: { type: String, enum: ["low", "medium", "high"], default: "low" }
});

const LegalDisputeSchema = new Schema({
  id: { type: String, required: true },
  description: { type: String, required: true },
  exposureAmount: { type: Number, required: true, default: 0 }
});

const TermInsuranceSchema = new Schema({
  id: { type: String, required: true },
  policyName: { type: String, required: true },
  sumAssured: { type: Number, required: true, default: 0 },
  annualPremium: { type: Number, required: true, default: 0 },
  renewalDate: { type: Date }
});

const EndowmentSchema = new Schema({
  id: { type: String, required: true },
  policyName: { type: String, required: true },
  sumAssured: { type: Number, required: true, default: 0 },
  surrenderValue: { type: Number, required: true, default: 0 },
  annualPremium: { type: Number, required: true, default: 0 },
  maturityDate: { type: Date }
});

const AssetLiabilitySchema = new Schema<IAssetLiability>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true, unique: true },
    assets: {
      liquid: {
        savingsAccounts: { type: [SavingsAccountSchema], default: [] },
        fixedDeposits: { type: [FixedDepositSchema], default: [] },
        recurringDeposits: { type: [RecurringDepositSchema], default: [] },
        cashInHand: { type: Number, default: 0 },
        digitalWallets: { type: Number, default: 0 }
      },
      investments: {
        stocks: {
          brokerName: { type: String, default: "" },
          currentValue: { type: Number, default: 0 },
          investedAmount: { type: Number, default: 0 }
        },
        mutualFunds: { type: [MutualFundSchema], default: [] },
        ppf: {
          corpus: { type: Number, default: 0 },
          annualContribution: { type: Number, default: 0 },
          maturityYear: { type: Number },
          institution: { type: String, default: "" }
        },
        epf: {
          corpus: { type: Number, default: 0 },
          employeeMonthlyContribution: { type: Number, default: 0 },
          employerMonthlyContribution: { type: Number, default: 0 },
          uan: { type: String, default: "" }
        },
        nps: {
          corpus: { type: Number, default: 0 },
          tier: { type: String, enum: ["tier1", "tier2"], default: "tier1" },
          pran: { type: String, default: "" },
          allocation: {
            equityPct: { type: Number, default: 50 },
            corporatePct: { type: Number, default: 30 },
            govtPct: { type: Number, default: 20 }
          }
        },
        sgbBonds: { type: [SgbBondSchema], default: [] },
        usStocks: {
          platform: { type: String, default: "" },
          currentValueUSD: { type: Number, default: 0 },
          exchangeRate: { type: Number, default: 83.5 }
        }
      },
      physical: {
        properties: { type: [PropertySchema], default: [] },
        vehicles: { type: [VehicleSchema], default: [] },
        goldJewellery: {
          weightGrams: { type: Number, default: 0 },
          purity: { type: String, enum: ["24K", "22K", "18K"], default: "22K" },
          estimatedValue: { type: Number, default: 0 },
          location: { type: String, enum: ["home", "locker"], default: "home" }
        },
        silverMetals: {
          weightGrams: { type: Number, default: 0 },
          estimatedValue: { type: Number, default: 0 }
        },
        collectibles: { type: [CollectibleSchema], default: [] }
      },
      other: {
        businessOwnership: { type: [BusinessOwnershipSchema], default: [] },
        loansGiven: { type: [LoanGivenSchema], default: [] },
        previousGratuity: { type: Number, default: 0 }
      }
    },
    liabilities: {
      shortTerm: {
        creditCards: { type: [CreditCardSchema], default: [] },
        bnpl: { type: [BnplSchema], default: [] },
        personalLoans: { type: [PersonalLoanSchema], default: [] },
        informalLoans: { type: [InformalLoanSchema], default: [] }
      },
      longTerm: {
        homeLoans: { type: [HomeLoanSchema], default: [] },
        carLoans: { type: [CarLoanSchema], default: [] },
        educationLoans: { type: [EducationLoanSchema], default: [] },
        businessLoans: { type: [BusinessLoanSchema], default: [] },
        loansAgainstProperty: { type: [LapLoanSchema], default: [] },
        goldLoans: { type: [GoldLoanSchema], default: [] }
      },
      contingent: { type: [ContingentLiabilitySchema], default: [] },
      pendingTaxDues: { type: Number, default: 0 },
      legalDisputes: { type: [LegalDisputeSchema], default: [] }
    },
    protection: {
      termInsurance: { type: [TermInsuranceSchema], default: [] },
      endowmentPolicies: { type: [EndowmentSchema], default: [] }
    },
    familyOutflows: {
      children: {
        type: [{
          id: { type: String, required: true },
          yearOfBirth: { type: Number, required: true },
          schoolFeesAnnual: { type: Number, default: 0 },
          schoolType: { type: String, enum: ["government", "private", "international"], default: "private" },
          tuitionMonthly: { type: Number, default: 0 },
          extracurricularMonthly: { type: Number, default: 0 },
          childcareMonthly: { type: Number, default: 0 }
        }],
        default: []
      },
      caregiving: {
        parentHealthcareMonthly: { type: Number, default: 0 },
        parentInsuranceAnnualPremium: { type: Number, default: 0 },
        parentInsuranceCoverAmount: { type: Number, default: 0 },
        monthlyRemittance: { type: Number, default: 0 },
        householdHelpMonthly: { type: Number, default: 0 }
      }
    }
  },
  { timestamps: true }
);

const AssetLiability = models.AssetLiability || mongoose.model<IAssetLiability>("AssetLiability", AssetLiabilitySchema);

export default AssetLiability;
