// Enterprise Fintech Engine: Institutional Analytics, Newton-Raphson XIRR, FIFO Lot Accounting & Tax Comparator
// Zero-drift financial math and CA Audit Statement Generation.

import { toMicroUnits, fromMicroUnits, bankersRound } from './microUnits';
import { Account, Transaction, LedgerPosting } from './types';

export interface CashFlowEntry {
  date: string; // ISO date YYYY-MM-DD
  amount: number; // Negative for investments (outflows), Positive for redemptions/current value (inflows)
}

export interface InvestmentLot {
  id: string;
  assetSymbol: string;
  purchaseDate: string; // YYYY-MM-DD
  units: number;
  costPerUnitMicro: bigint;
  remainingUnits: number;
}

export interface RedemptionResult {
  assetSymbol: string;
  unitsRedeemed: number;
  salePricePerUnitMicro: bigint;
  totalProceedsMicro: bigint;
  totalCostBasisMicro: bigint;
  stcgMicro: bigint; // Short-Term Capital Gains (< 365 days)
  ltcgMicro: bigint; // Long-Term Capital Gains (>= 365 days)
  lotsExhausted: Array<{ lotId: string; unitsTaken: number; isLongTerm: boolean }>;
}

export interface InstitutionalKPIs {
  savingsRatePercent: number;
  liquidityRunwayMonths: number;
  debtToIncomePercent: number;
  workingCapitalRatio: number;
  discretionaryRatioPercent: number;
  personalBurnVelocityDaily: number;
}

export interface TaxRegimeComparison {
  grossAnnualIncomeMicro: bigint;
  oldRegime: {
    totalDeductionsMicro: bigint;
    taxableIncomeMicro: bigint;
    taxPayableMicro: bigint;
    effectiveTaxRatePercent: number;
  };
  newRegime: {
    standardDeductionMicro: bigint;
    taxableIncomeMicro: bigint;
    taxPayableMicro: bigint;
    effectiveTaxRatePercent: number;
  };
  recommendedRegime: 'OLD_REGIME' | 'NEW_REGIME';
  annualTaxSavingsMicro: bigint;
}

export class AnalyticsAndTaxEngine {
  /**
   * 1. Institutional Portfolio XIRR Engine
   * Solves for annualized return using Newton-Raphson numerical approximation.
   * Matches Microsoft Excel XIRR formula exactly.
   */
  public calculateXIRR(cashFlows: CashFlowEntry[], guess = 0.1): number {
    if (cashFlows.length < 2) return 0;

    // Must have at least one positive and one negative cash flow
    const hasPositive = cashFlows.some((cf) => cf.amount > 0);
    const hasNegative = cashFlows.some((cf) => cf.amount < 0);
    if (!hasPositive || !hasNegative) return 0;

    const startDate = new Date(cashFlows[0].date).getTime();

    let rate = guess;
    const maxIterations = 100;
    const tolerance = 1e-7;

    for (let iter = 0; iter < maxIterations; iter++) {
      let fValue = 0;
      let fDerivative = 0;

      for (const cf of cashFlows) {
        const currentDate = new Date(cf.date).getTime();
        const years = (currentDate - startDate) / (1000 * 60 * 60 * 24 * 365.0);

        const discountFactor = Math.pow(1 + rate, years);
        if (discountFactor === 0 || isNaN(discountFactor)) continue;

        fValue += cf.amount / discountFactor;
        fDerivative += (-years * cf.amount) / (discountFactor * (1 + rate));
      }

      if (Math.abs(fValue) < tolerance) {
        return bankersRound(rate * 100, 4); // Returns percentage e.g. 15.4521%
      }

      if (fDerivative === 0 || isNaN(fDerivative)) {
        break;
      }

      const newRate = rate - fValue / fDerivative;
      if (Math.abs(newRate - rate) < tolerance) {
        return bankersRound(newRate * 100, 4);
      }
      rate = newRate;
    }

    return bankersRound(rate * 100, 4);
  }

  /**
   * 2. FIFO Lot Accounting for Equities & Mutual Funds
   * Dispatches earliest acquired lots first, segregating Short-Term (< 1 year) vs Long-Term gains.
   */
  public redeemFIFOLots(
    lots: InvestmentLot[],
    assetSymbol: string,
    unitsToRedeem: number,
    salePricePerUnitMicro: bigint,
    redemptionDate: string
  ): RedemptionResult {
    // Filter and sort lots ascending by purchase date (FIFO)
    const availableLots = lots
      .filter((l) => l.assetSymbol === assetSymbol && l.remainingUnits > 0)
      .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

    let remainingToRedeem = unitsToRedeem;
    let totalCostBasis = 0n;
    let stcg = 0n;
    let ltcg = 0n;
    const redemptionTime = new Date(redemptionDate).getTime();
    const lotsExhausted: RedemptionResult['lotsExhausted'] = [];

    for (const lot of availableLots) {
      if (remainingToRedeem <= 0) break;

      const unitsTaken = Math.min(lot.remainingUnits, remainingToRedeem);
      lot.remainingUnits -= unitsTaken;
      remainingToRedeem -= unitsTaken;

      const lotPurchaseTime = new Date(lot.purchaseDate).getTime();
      const holdingDays = (redemptionTime - lotPurchaseTime) / (1000 * 60 * 60 * 24);
      const isLongTerm = holdingDays >= 365;

      const unitsTakenBig = BigInt(Math.round(unitsTaken * 10000));
      const costBasis = (unitsTakenBig * lot.costPerUnitMicro) / 10000n;
      const proceeds = (unitsTakenBig * salePricePerUnitMicro) / 10000n;
      const gain = proceeds - costBasis;

      totalCostBasis += costBasis;
      if (isLongTerm) {
        ltcg += gain;
      } else {
        stcg += gain;
      }

      lotsExhausted.push({
        lotId: lot.id,
        unitsTaken,
        isLongTerm,
      });
    }

    const unitsRedeemedBig = BigInt(Math.round(unitsToRedeem * 10000));
    const totalProceeds = (unitsRedeemedBig * salePricePerUnitMicro) / 10000n;

    return {
      assetSymbol,
      unitsRedeemed: unitsToRedeem,
      salePricePerUnitMicro,
      totalProceedsMicro: totalProceeds,
      totalCostBasisMicro: totalCostBasis,
      stcgMicro: stcg,
      ltcgMicro: ltcg,
      lotsExhausted,
    };
  }

  /**
   * 3. Institutional Financial Analyst KPIs
   */
  public calculateInstitutionalKPIs(params: {
    netIncomeMicro: bigint;
    totalOpExMicro: bigint;
    liquidCashMicro: bigint;
    threeMonthRollingOpExMicro: bigint;
    monthlyEmisMicro: bigint;
    minCcObligationsMicro: bigint;
    grossIncomeMicro: bigint;
    currentLiquidAssetsMicro: bigint;
    currentLiabilitiesDue30DaysMicro: bigint;
    discretionarySpendMicro: bigint;
    deltaNetWorthMicro: bigint;
    deltaDays: number;
  }): InstitutionalKPIs {
    // 1. Savings Rate (%) = ((Net Income - OpEx) / Net Income) * 100
    const savingsRate =
      params.netIncomeMicro > 0n
        ? Number(
            ((params.netIncomeMicro - params.totalOpExMicro) * 10000n) / params.netIncomeMicro
          ) / 100
        : 0;

    // 2. Liquidity Runway = Liquid Cash / Monthly Avg OpEx
    const avgMonthlyOpEx = params.threeMonthRollingOpExMicro / 3n;
    const runway =
      avgMonthlyOpEx > 0n
        ? Number((params.liquidCashMicro * 100n) / avgMonthlyOpEx) / 100
        : 99.0;

    // 3. Debt-to-Income (DTI) = (EMIs + CC Min) / Gross Income * 100
    const dti =
      params.grossIncomeMicro > 0n
        ? Number(
            ((params.monthlyEmisMicro + params.minCcObligationsMicro) * 10000n) /
              params.grossIncomeMicro
          ) / 100
        : 0;

    // 4. Working Capital Ratio = Current Liquid Assets / Current Liabilities Due < 30 Days
    const workingCapital =
      params.currentLiabilitiesDue30DaysMicro > 0n
        ? Number(
            (params.currentLiquidAssetsMicro * 100n) /
              params.currentLiabilitiesDue30DaysMicro
          ) / 100
        : 10.0;

    // 5. Discretionary Ratio = Discretionary / Total OpEx * 100
    const discretionaryRatio =
      params.totalOpExMicro > 0n
        ? Number((params.discretionarySpendMicro * 10000n) / params.totalOpExMicro) / 100
        : 0;

    // 6. Personal Burn Velocity = Delta(Net Worth) / Delta(Days)
    const velocityNum =
      params.deltaDays > 0
        ? fromMicroUnits(params.deltaNetWorthMicro) / params.deltaDays
        : 0;

    return {
      savingsRatePercent: bankersRound(savingsRate, 2),
      liquidityRunwayMonths: bankersRound(runway, 2),
      debtToIncomePercent: bankersRound(dti, 2),
      workingCapitalRatio: bankersRound(workingCapital, 2),
      discretionaryRatioPercent: bankersRound(discretionaryRatio, 2),
      personalBurnVelocityDaily: bankersRound(velocityNum, 2),
    };
  }

  /**
   * 4. Old vs New Tax Regime Comparator (India IT Act)
   * Evaluates Section 80C, 80D, HRA, Section 24(b) vs Section 115BAC New Slabs.
   */
  public compareTaxRegimes(params: {
    grossAnnualIncomeMicro: bigint;
    deduction80CMicro: bigint; // Max ₹1,50,000
    deduction80DMicro: bigint; // Max ₹25,000 (self) + ₹50,000 (parents)
    hraExemptionMicro: bigint;
    homeLoanInterest24bMicro: bigint; // Max ₹2,00,000
    otherEligibleDeductionsMicro?: bigint;
  }): TaxRegimeComparison {
    const gross = fromMicroUnits(params.grossAnnualIncomeMicro);

    // --- OLD REGIME ---
    const stdDeductionOld = 50000;
    const capped80C = Math.min(150000, fromMicroUnits(params.deduction80CMicro));
    const capped80D = Math.min(75000, fromMicroUnits(params.deduction80DMicro));
    const hra = fromMicroUnits(params.hraExemptionMicro);
    const loanInterest24b = Math.min(200000, fromMicroUnits(params.homeLoanInterest24bMicro));
    const others = fromMicroUnits(params.otherEligibleDeductionsMicro || 0n);

    const totalDeductionsOld = stdDeductionOld + capped80C + capped80D + hra + loanInterest24b + others;
    const taxableOld = Math.max(0, gross - totalDeductionsOld);

    let taxOld = 0;
    if (taxableOld <= 250000) {
      taxOld = 0;
    } else if (taxableOld <= 500000) {
      taxOld = (taxableOld - 250000) * 0.05;
    } else if (taxableOld <= 1000000) {
      taxOld = 12500 + (taxableOld - 500000) * 0.2;
    } else {
      taxOld = 112500 + (taxableOld - 1000000) * 0.3;
    }
    // Rebate 87A if taxable <= 5L
    if (taxableOld <= 500000) taxOld = 0;
    // 4% Health & Education cess
    taxOld = taxOld * 1.04;

    // --- NEW REGIME (FY 2025-26 / Section 115BAC) ---
    const stdDeductionNew = 75000;
    const taxableNew = Math.max(0, gross - stdDeductionNew);

    let taxNew = 0;
    if (taxableNew <= 300000) {
      taxNew = 0;
    } else if (taxableNew <= 700000) {
      taxNew = (taxableNew - 300000) * 0.05;
    } else if (taxableNew <= 1000000) {
      taxNew = 20000 + (taxableNew - 700000) * 0.1;
    } else if (taxableNew <= 1200000) {
      taxNew = 50000 + (taxableNew - 1000000) * 0.15;
    } else if (taxableNew <= 1500000) {
      taxNew = 80000 + (taxableNew - 1200000) * 0.2;
    } else {
      taxNew = 140000 + (taxableNew - 1500000) * 0.3;
    }
    // Full rebate u/s 87A if taxable income <= 7,00,000 under new regime
    if (taxableNew <= 700000) taxNew = 0;
    taxNew = taxNew * 1.04;

    const recommended = taxNew <= taxOld ? 'NEW_REGIME' : 'OLD_REGIME';
    const savings = Math.abs(taxOld - taxNew);

    return {
      grossAnnualIncomeMicro: params.grossAnnualIncomeMicro,
      oldRegime: {
        totalDeductionsMicro: toMicroUnits(totalDeductionsOld),
        taxableIncomeMicro: toMicroUnits(taxableOld),
        taxPayableMicro: toMicroUnits(taxOld),
        effectiveTaxRatePercent: gross > 0 ? bankersRound((taxOld / gross) * 100, 2) : 0,
      },
      newRegime: {
        standardDeductionMicro: toMicroUnits(stdDeductionNew),
        taxableIncomeMicro: toMicroUnits(taxableNew),
        taxPayableMicro: toMicroUnits(taxNew),
        effectiveTaxRatePercent: gross > 0 ? bankersRound((taxNew / gross) * 100, 2) : 0,
      },
      recommendedRegime: recommended,
      annualTaxSavingsMicro: toMicroUnits(savings),
    };
  }

  /**
   * 5. One-Click CA Audit Financial Statement Package
   * Compiles Personal Balance Sheet and Profit & Loss Statement from Chart of Accounts.
   */
  public generateCAAuditStatements(accounts: Account[]): {
    balanceSheet: {
      totalAssetsMicro: bigint;
      totalLiabilitiesMicro: bigint;
      totalEquityMicro: bigint;
      netWorthMicro: bigint;
      isBalanced: boolean;
      assetBreakdown: Array<{ name: string; balanceMicro: bigint }>;
      liabilityBreakdown: Array<{ name: string; balanceMicro: bigint }>;
    };
    profitAndLoss: {
      totalIncomeMicro: bigint;
      totalExpensesMicro: bigint;
      netSurplusMicro: bigint;
      incomeBreakdown: Array<{ name: string; balanceMicro: bigint }>;
      expenseBreakdown: Array<{ name: string; balanceMicro: bigint }>;
    };
  } {
    let totalAssets = 0n;
    let totalLiabilities = 0n;
    let totalEquity = 0n;
    let totalIncome = 0n;
    let totalExpenses = 0n;

    const assetBreakdown: Array<{ name: string; balanceMicro: bigint }> = [];
    const liabilityBreakdown: Array<{ name: string; balanceMicro: bigint }> = [];
    const incomeBreakdown: Array<{ name: string; balanceMicro: bigint }> = [];
    const expenseBreakdown: Array<{ name: string; balanceMicro: bigint }> = [];

    for (const acc of accounts) {
      if (acc.balance_micro === 0n) continue;

      switch (acc.account_type) {
        case 'ASSET':
          totalAssets += acc.balance_micro;
          assetBreakdown.push({ name: acc.name, balanceMicro: acc.balance_micro });
          break;
        case 'LIABILITY':
          totalLiabilities += acc.balance_micro;
          liabilityBreakdown.push({ name: acc.name, balanceMicro: acc.balance_micro });
          break;
        case 'EQUITY':
          totalEquity += acc.balance_micro;
          break;
        case 'INCOME':
          totalIncome += acc.balance_micro;
          incomeBreakdown.push({ name: acc.name, balanceMicro: acc.balance_micro });
          break;
        case 'EXPENSE':
          totalExpenses += acc.balance_micro;
          expenseBreakdown.push({ name: acc.name, balanceMicro: acc.balance_micro });
          break;
      }
    }

    const netSurplus = totalIncome - totalExpenses;
    const netWorth = totalAssets - totalLiabilities;
    // In double-entry: Total Assets == Total Liabilities + Total Equity + (Income - Expenses)
    const isBalanced = totalAssets === totalLiabilities + totalEquity + netSurplus;

    return {
      balanceSheet: {
        totalAssetsMicro: totalAssets,
        totalLiabilitiesMicro: totalLiabilities,
        totalEquityMicro: totalEquity,
        netWorthMicro: netWorth,
        isBalanced,
        assetBreakdown,
        liabilityBreakdown,
      },
      profitAndLoss: {
        totalIncomeMicro: totalIncome,
        totalExpensesMicro: totalExpenses,
        netSurplusMicro: netSurplus,
        incomeBreakdown,
        expenseBreakdown,
      },
    };
  }
}
