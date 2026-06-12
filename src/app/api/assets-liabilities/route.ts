// src/app/api/assets-liabilities/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AssetLiability from "@/models/AssetLiability";

// Default template structure to return when no records exist
const DEFAULT_PORTFOLIO = {
  assets: {
    liquid: {
      savingsAccounts: [],
      fixedDeposits: [],
      recurringDeposits: [],
      cashInHand: 0,
      digitalWallets: 0,
    },
    investments: {
      stocks: { brokerName: "", currentValue: 0, investedAmount: 0 },
      mutualFunds: [],
      ppf: { corpus: 0, annualContribution: 0, maturityYear: null, institution: "" },
      epf: { corpus: 0, employeeMonthlyContribution: 0, employerMonthlyContribution: 0, uan: "" },
      nps: { corpus: 0, tier: "tier1", pran: "", allocation: { equityPct: 50, corporatePct: 30, govtPct: 20 } },
      sgbBonds: [],
      usStocks: { platform: "", currentValueUSD: 0, exchangeRate: 83.5 },
    },
    physical: {
      properties: [],
      vehicles: [],
      goldJewellery: { weightGrams: 0, purity: "22K", estimatedValue: 0, location: "home" },
      silverMetals: { weightGrams: 0, estimatedValue: 0 },
      collectibles: [],
    },
    other: {
      businessOwnership: [],
      loansGiven: [],
      previousGratuity: 0,
    },
  },
  liabilities: {
    shortTerm: {
      creditCards: [],
      bnpl: [],
      personalLoans: [],
      informalLoans: [],
    },
    longTerm: {
      homeLoans: [],
      carLoans: [],
      educationLoans: [],
      businessLoans: [],
      loansAgainstProperty: [],
      goldLoans: [],
    },
    contingent: [],
    pendingTaxDues: 0,
    legalDisputes: [],
  },
  protection: {
    termInsurance: [],
    endowmentPolicies: [],
  },
  familyOutflows: {
    children: [],
    caregiving: {
      parentHealthcareMonthly: 0,
      parentInsuranceAnnualPremium: 0,
      parentInsuranceCoverAmount: 0,
      monthlyRemittance: 0,
      householdHelpMonthly: 0,
    }
  },
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized neural link." }, { status: 401 });
    }

    await connectDB();
    const portfolio = await AssetLiability.findOne({ userId: session.user.id });

    if (!portfolio) {
      return NextResponse.json({
        success: true,
        portfolio: {
          ...DEFAULT_PORTFOLIO,
          userId: session.user.id
        }
      }, { status: 200 });
    }

    return NextResponse.json({ success: true, portfolio }, { status: 200 });

  } catch (error: any) {
    console.error("GET ASSET-LIABILITY PORTFOLIO ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized neural link." }, { status: 401 });
    }

    const body = await req.json();
    if (!body?.portfolio) {
      return NextResponse.json({ error: "Missing portfolio payload." }, { status: 400 });
    }

    await connectDB();
    const updatedPortfolio = await AssetLiability.findOneAndUpdate(
      { userId: session.user.id },
      { 
        $set: {
          assets: body.portfolio.assets,
          liabilities: body.portfolio.liabilities,
          protection: body.portfolio.protection,
          familyOutflows: body.portfolio.familyOutflows,
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: "Net worth portfolio updated successfully.",
      portfolio: updatedPortfolio
    }, { status: 200 });

  } catch (error: any) {
    console.error("POST ASSET-LIABILITY PORTFOLIO ERROR:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
