import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { connectDB } from "../src/lib/mongodb";
import User from "../src/models/User";
import AssetLiability from "../src/models/AssetLiability";

async function runTest() {
  console.log("Starting Net Worth Ledger Verification...");

  // 1. Connect to Database
  await connectDB();

  // 2. Fetch/Confirm a test user exists
  const user = await User.findOne({});
  if (!user) {
    console.error("❌ No user found in the DB. Please register a user first.");
    process.exit(1);
  }
  console.log(`✅ Using test user: ${user.name} (${user.email}) - ID: ${user._id}`);

  // Clean up any existing wealth ledger for this test user
  await AssetLiability.deleteOne({ userId: user._id });
  console.log("🧹 Cleaned up existing assets & liabilities for this user.");

  // Generate unique IDs for linking
  const propertyId = "prop_primary_flat_888";
  const vehicleId = "veh_harrier_777";

  // Mock Gold & Silver rates (as approved)
  const GOLD_RATE_22K = 6600;
  const SILVER_RATE = 90;
  const goldWeight = 100; // grams
  const silverWeight = 1000; // grams
  const goldValuation = goldWeight * GOLD_RATE_22K; // ₹6,60,000
  const silverValuation = silverWeight * SILVER_RATE; // ₹90,000

  // 3. Create full Indian portfolio payload
  const testPortfolio = {
    userId: user._id,
    assets: {
      liquid: {
        savingsAccounts: [
          {
            id: "acc_savings_sbi",
            bankName: "State Bank of India",
            accountType: "salary" as const,
            balance: 500000,
            lastUpdated: new Date()
          }
        ],
        fixedDeposits: [],
        recurringDeposits: [],
        cashInHand: 15000,
        digitalWallets: 35000
      },
      investments: {
        stocks: {
          brokerName: "Zerodha",
          currentValue: 800000,
          investedAmount: 600000
        },
        mutualFunds: [
          {
            id: "mf_parag_parikh",
            fundName: "Parag Parikh Flexi Cap",
            type: "equity" as const,
            currentValue: 1500000,
            investedAmount: 1000000,
            folioNumber: "12345/67"
          }
        ],
        ppf: { corpus: 0, annualContribution: 0 },
        epf: { corpus: 0, employeeMonthlyContribution: 0, employerMonthlyContribution: 0 },
        nps: { corpus: 0, tier: "tier1" as const, allocation: { equityPct: 50, corporatePct: 30, govtPct: 20 } },
        sgbBonds: [],
        usStocks: { platform: "", currentValueUSD: 0, exchangeRate: 83.5 }
      },
      physical: {
        properties: [
          {
            id: propertyId,
            name: "Primary Flat",
            type: "flat" as const,
            city: "Mumbai",
            estimatedValue: 8000000,
            isSelfOccupied: true
          }
        ],
        vehicles: [
          {
            id: vehicleId,
            name: "Tata Harrier",
            type: "car" as const,
            estimatedValue: 2000000
          }
        ],
        goldJewellery: {
          weightGrams: goldWeight,
          purity: "22K" as const,
          estimatedValue: goldValuation,
          location: "locker" as const
        },
        silverMetals: {
          weightGrams: silverWeight,
          estimatedValue: silverValuation
        },
        collectibles: []
      },
      other: {
        businessOwnership: [],
        loansGiven: [],
        previousGratuity: 120000 // Treat as retirement/other asset
      }
    },
    liabilities: {
      shortTerm: {
        creditCards: [
          {
            id: "cc_hdfc_regalia",
            cardName: "HDFC Regalia",
            outstanding: 50000,
            minimumDue: 2500
          }
        ],
        bnpl: [],
        personalLoans: [
          {
            id: "loan_personal_icici",
            lender: "ICICI Bank",
            outstanding: 200000,
            emi: 8000,
            interestRate: 12.5,
            remainingTenureMonths: 24
          }
        ],
        informalLoans: []
      },
      longTerm: {
        homeLoans: [
          {
            id: "loan_home_hdfc",
            lender: "HDFC Ltd",
            outstanding: 3000000,
            emi: 35000,
            interestRate: 8.55,
            loanType: "floating" as const,
            remainingTenureMonths: 120,
            linkedAssetId: propertyId // Linking property
          }
        ],
        carLoans: [
          {
            id: "loan_car_sbi",
            lender: "SBI",
            outstanding: 1000000,
            emi: 22000,
            interestRate: 7.9,
            remainingTenureMonths: 48,
            linkedAssetId: vehicleId // Linking vehicle
          }
        ],
        educationLoans: [],
        businessLoans: [],
        loansAgainstProperty: [],
        goldLoans: []
      },
      contingent: [],
      pendingTaxDues: 0,
      legalDisputes: []
    },
    protection: {
      termInsurance: [
        {
          id: "term_lic",
          policyName: "LIC Tech Term",
          sumAssured: 10000000,
          annualPremium: 12000
        }
      ],
      endowmentPolicies: [
        {
          id: "endow_lic",
          policyName: "LIC Jeevan Labh",
          sumAssured: 500000,
          surrenderValue: 200000, // Part of assets
          annualPremium: 24000
        }
      ]
    }
  };

  // 4. Save and validate
  console.log("💾 Writing mock portfolio to MongoDB...");
  const savedDocument = await AssetLiability.create(testPortfolio);
  console.log("✅ Wealth ledger document saved with ID:", savedDocument._id);

  // 5. Query and Assert Calculations
  console.log("🔍 Fetching document back and verifying calculations...");
  const retrieved = await AssetLiability.findOne({ userId: user._id });
  if (!retrieved) {
    throw new Error("Could not retrieve saved document.");
  }

  // --- Calculations ---
  // Assets
  const liquidTotal = 
    retrieved.assets.liquid.savingsAccounts.reduce((sum: number, a: any) => sum + a.balance, 0) +
    retrieved.assets.liquid.cashInHand +
    retrieved.assets.liquid.digitalWallets; // 500,000 + 15,000 + 35,000 = 550,000
  
  const investTotal = 
    retrieved.assets.investments.stocks.currentValue +
    retrieved.assets.investments.mutualFunds.reduce((sum: number, mf: any) => sum + mf.currentValue, 0); // 800,000 + 1,500,000 = 2,300,000
  
  const propertiesTotal = retrieved.assets.physical.properties.reduce((sum: number, p: any) => sum + p.estimatedValue, 0); // 8,000,000
  const vehiclesTotal = retrieved.assets.physical.vehicles.reduce((sum: number, v: any) => sum + v.estimatedValue, 0); // 2,000,000
  const goldTotal = retrieved.assets.physical.goldJewellery.estimatedValue; // 660,000
  const silverTotal = retrieved.assets.physical.silverMetals.estimatedValue; // 90,000
  const physicalTotal = propertiesTotal + vehiclesTotal + goldTotal + silverTotal; // 10,750,000
  
  const endowmentSurrenderTotal = retrieved.protection.endowmentPolicies.reduce((sum: number, p: any) => sum + p.surrenderValue, 0); // 200,000
  const otherTotal = retrieved.assets.other.previousGratuity + endowmentSurrenderTotal; // 120,000 + 200,000 = 320,000
  
  const totalAssets = liquidTotal + investTotal + physicalTotal + otherTotal; // 550,000 + 2,300,000 + 10,750,000 + 320,000 = 13,920,000
  
  // Liabilities
  const ccTotal = retrieved.liabilities.shortTerm.creditCards.reduce((sum: number, c: any) => sum + c.outstanding, 0); // 50,000
  const plTotal = retrieved.liabilities.shortTerm.personalLoans.reduce((sum: number, pl: any) => sum + pl.outstanding, 0); // 200,000
  const shortTermTotal = ccTotal + plTotal; // 250,000
 
  const hlTotal = retrieved.liabilities.longTerm.homeLoans.reduce((sum: number, hl: any) => sum + hl.outstanding, 0); // 3,000,000
  const clTotal = retrieved.liabilities.longTerm.carLoans.reduce((sum: number, cl: any) => sum + cl.outstanding, 0); // 1,000,000
  const longTermTotal = hlTotal + clTotal; // 4,000,000
 
  const totalLiabilities = shortTermTotal + longTermTotal; // 4,250,000
 
  const netWorth = totalAssets - totalLiabilities; // 13,920,000 - 4,250,000 = 9,670,000
  const liquidNetWorth = liquidTotal - shortTermTotal; // 550,000 - 250,000 = 300,000
  const debtToAssetRatio = (totalLiabilities / totalAssets) * 100; // (4,250,000 / 13,920,000) * 100 = 30.53%
 
  // Log calculation results
  console.log("\n--- Calculated Summary ---");
  console.log(`💰 Total Assets: ₹${totalAssets.toLocaleString("en-IN")}`);
  console.log(`🛑 Total Liabilities: ₹${totalLiabilities.toLocaleString("en-IN")}`);
  console.log(`✨ Net Worth: ₹${netWorth.toLocaleString("en-IN")}`);
  console.log(`💧 Liquid Net Worth: ₹${liquidNetWorth.toLocaleString("en-IN")}`);
  console.log(`📊 Debt-to-Asset Ratio: ${debtToAssetRatio.toFixed(2)}%`);
 
  // Verify linking & real equity calculations
  const homeLoan = retrieved.liabilities.longTerm.homeLoans[0];
  const linkedProperty = retrieved.assets.physical.properties.find((p: any) => p.id === homeLoan.linkedAssetId);
  if (!linkedProperty) {
    throw new Error("❌ Home loan asset linking is broken!");
  }
  const realPropertyEquity = linkedProperty.estimatedValue - homeLoan.outstanding;
  const propertyEquityPct = (realPropertyEquity / linkedProperty.estimatedValue) * 100;
  console.log(`\n🏡 Property Net Equity: ₹${realPropertyEquity.toLocaleString("en-IN")} (${propertyEquityPct.toFixed(1)}% Owner Equity)`);
 
  const carLoan = retrieved.liabilities.longTerm.carLoans[0];
  const linkedVehicle = retrieved.assets.physical.vehicles.find((v: any) => v.id === carLoan.linkedAssetId);
  if (!linkedVehicle) {
    throw new Error("❌ Car loan asset linking is broken!");
  }
  const realVehicleEquity = linkedVehicle.estimatedValue - carLoan.outstanding;
  const vehicleEquityPct = (realVehicleEquity / linkedVehicle.estimatedValue) * 100;
  console.log(`🚗 Vehicle Net Equity: ₹${realVehicleEquity.toLocaleString("en-IN")} (${vehicleEquityPct.toFixed(1)}% Owner Equity)`);

  // Run programmatic assertions
  console.log("\n🧪 Running Assertions...");
  
  if (totalAssets !== 13920000) {
    throw new Error(`❌ Asset count assertion failed: expected 13,920,000, got ${totalAssets}`);
  }
  if (totalLiabilities !== 4250000) {
    throw new Error(`❌ Liability count assertion failed: expected 4,250,000, got ${totalLiabilities}`);
  }
  if (netWorth !== 9670000) {
    throw new Error(`❌ Net worth assertion failed: expected 9,670,000, got ${netWorth}`);
  }
  if (liquidNetWorth !== 3000000 - 250000 + 250000) { // Wait: liquidTotal is 550,000, shortTermTotal is 250,000, so liquidNetWorth = 300,000.
    // Let's verify: 550,000 - 250,000 = 300,000
    if (liquidNetWorth !== 300000) {
      throw new Error(`❌ Liquid Net worth assertion failed: expected 300,000, got ${liquidNetWorth}`);
    }
  }
  if (realPropertyEquity !== 5000000) {
    throw new Error(`❌ Property equity calculation assertion failed: expected 5,000,000, got ${realPropertyEquity}`);
  }
  if (realVehicleEquity !== 1000000) {
    throw new Error(`❌ Vehicle equity calculation assertion failed: expected 1,000,000, got ${realVehicleEquity}`);
  }

  console.log("🎉 ALL SCHEMA VALIDATIONS AND CALCULATIONS VERIFIED SUCCESSFULLY!");
  
  // Cleanup test entry to avoid leaving database dirty
  await AssetLiability.deleteOne({ userId: user._id });
  console.log("🧹 Cleaned up verification ledger document from database.");

  process.exit(0);
}

runTest().catch((err) => {
  console.error("❌ Test execution failed:", err);
  process.exit(1);
});
