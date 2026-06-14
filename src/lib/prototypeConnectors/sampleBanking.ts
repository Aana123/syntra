export interface BankingTemplate {
  salaryPct: number;
  foodPct: number;
  transportPct: number;
  shoppingPct: number;
  utilitiesPct: number;
}

export const sampleBankingTemplate: BankingTemplate = {
  salaryPct: 1.0,
  foodPct: 0.08,
  transportPct: 0.03,
  shoppingPct: 0.05,
  utilitiesPct: 0.04
};
