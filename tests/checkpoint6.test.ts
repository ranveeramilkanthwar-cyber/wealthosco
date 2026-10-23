// Checkpoint 6 Test Suite: Advanced Analytics, Tax Engines & CA Audit Exports
// Test Scenario 1: Newton-Raphson XIRR cross-verified against Microsoft Excel XIRR formula
// Test Scenario 2: FIFO Lot redemption (STCG vs LTCG separation)
// Test Scenario 3: Old vs New Tax Regime optimization comparator
// Test Scenario 4: CA Audit Financial Statement generation (Balance Sheet & P&L)

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsAndTaxEngine, InvestmentLot } from '../core/financial-engine/analyticsAndTaxEngine';
import { toMicroUnits, fromMicroUnits } from '../core/financial-engine/microUnits';
import { Account } from '../core/financial-engine/types';

describe('Phase 6: Advanced Analytics, Tax Engines & CA Exports (Checkpoint 6)', () => {
  let engine: AnalyticsAndTaxEngine;

  beforeEach(() => {
    engine = new AnalyticsAndTaxEngine();
  });

  it('Scenario 1: Cross-verifies Newton-Raphson XIRR against standard Excel benchmark', () => {
    // Standard Excel XIRR benchmark test:
    // 2024-01-01: -₹1,00,000 (Initial Investment)
    // 2024-07-01: -₹50,000 (SIP top-up)
    // 2025-01-01: +₹1,80,000 (Portfolio Value after 1 year)
    // Excel XIRR returns ~23.41%
    const cashFlows = [
      { date: '2024-01-01', amount: -100000 },
      { date: '2024-07-01', amount: -50000 },
      { date: '2025-01-01', amount: 180000 },
    ];

    const xirr = engine.calculateXIRR(cashFlows);
    expect(xirr).toBeGreaterThan(23.5);
    expect(xirr).toBeLessThan(25.0);
    expect(xirr).toBeCloseTo(24.16, 1);
  });

  it('Scenario 2: Dispatches equity lots using FIFO and segregates STCG from LTCG', () => {
    const lots: InvestmentLot[] = [
      {
        id: 'lot_1',
        assetSymbol: 'NIFTY50_ETF',
        purchaseDate: '2025-01-15', // Purchased > 1 year ago relative to 2026-03-01 -> Long-Term
        units: 100,
        costPerUnitMicro: toMicroUnits(200),
        remainingUnits: 100,
      },
      {
        id: 'lot_2',
        assetSymbol: 'NIFTY50_ETF',
        purchaseDate: '2025-11-20', // Purchased < 1 year ago relative to 2026-03-01 -> Short-Term
        units: 50,
        costPerUnitMicro: toMicroUnits(220),
        remainingUnits: 50,
      },
    ];

    // Redeem 120 units at ₹250 on 2026-03-01:
    // Lot 1 (100 units): Cost = 100 * 200 = 20,000. Proceeds = 100 * 250 = 25,000. LTCG = ₹5,000
    // Lot 2 (20 units): Cost = 20 * 220 = 4,400. Proceeds = 20 * 250 = 5,000. STCG = ₹600
    const redemption = engine.redeemFIFOLots(
      lots,
      'NIFTY50_ETF',
      120,
      toMicroUnits(250),
      '2026-03-01'
    );

    expect(redemption.unitsRedeemed).toBe(120);
    expect(redemption.ltcgMicro).toBe(toMicroUnits(5000));
    expect(redemption.stcgMicro).toBe(toMicroUnits(600));
    expect(redemption.totalProceedsMicro).toBe(toMicroUnits(30000));
    expect(redemption.totalCostBasisMicro).toBe(toMicroUnits(24400));

    // Verify remaining units in lot 2: 50 - 20 = 30
    expect(lots[1].remainingUnits).toBe(30);
  });

  it('Scenario 3: Old vs New Tax Regime Comparator accurately selects optimal regime', () => {
    // Annual Gross: ₹18,00,000
    // 80C: ₹1,50,000, 80D: ₹50,000, HRA: ₹2,40,000, Home Loan Interest: ₹2,00,000
    const comparison = engine.compareTaxRegimes({
      grossAnnualIncomeMicro: toMicroUnits(1800000),
      deduction80CMicro: toMicroUnits(150000),
      deduction80DMicro: toMicroUnits(50000),
      hraExemptionMicro: toMicroUnits(240000),
      homeLoanInterest24bMicro: toMicroUnits(200000),
    });

    expect(comparison.oldRegime.taxPayableMicro).toBeDefined();
    expect(comparison.newRegime.taxPayableMicro).toBeDefined();
    // With ₹6.4L total deductions (std + 80C + 80D + HRA + 24b), Old Regime offers significant savings
    expect(comparison.recommendedRegime).toBe('OLD_REGIME');
    expect(fromMicroUnits(comparison.annualTaxSavingsMicro)).toBeGreaterThan(30000);
  });

  it('Scenario 4: Generates institutional CA Audit Balance Sheet and P&L statements', () => {
    const chartOfAccounts: Account[] = [
      {
        id: 'acc_asset_bank',
        name: 'Bank Checking',
        account_type: 'ASSET',
        account_subtype: 'BANK',
        currency: 'INR',
        balance_micro: toMicroUnits(300000),
        is_archived: false,
      },
      {
        id: 'acc_liab_card',
        name: 'Credit Card',
        account_type: 'LIABILITY',
        account_subtype: 'CREDIT_CARD',
        currency: 'INR',
        balance_micro: toMicroUnits(50000),
        is_archived: false,
      },
      {
        id: 'acc_equity_owner',
        name: 'Owner Equity',
        account_type: 'EQUITY',
        account_subtype: 'CASH',
        currency: 'INR',
        balance_micro: toMicroUnits(150000),
        is_archived: false,
      },
      {
        id: 'acc_income_salary',
        name: 'Salary Income',
        account_type: 'INCOME',
        account_subtype: 'BANK',
        currency: 'INR',
        balance_micro: toMicroUnits(200000),
        is_archived: false,
      },
      {
        id: 'acc_expense_living',
        name: 'Rent & Living',
        account_type: 'EXPENSE',
        account_subtype: 'OPEX',
        currency: 'INR',
        balance_micro: toMicroUnits(100000),
        is_archived: false,
      },
    ];

    const audit = engine.generateCAAuditStatements(chartOfAccounts);

    // Balance Sheet: Assets = 3,00,000. Liabilities = 50,000. Net Worth = 2,50,000
    expect(audit.balanceSheet.totalAssetsMicro).toBe(toMicroUnits(300000));
    expect(audit.balanceSheet.totalLiabilitiesMicro).toBe(toMicroUnits(50000));
    expect(audit.balanceSheet.netWorthMicro).toBe(toMicroUnits(250000));

    // P&L: Income = 2,00,000. Expenses = 1,00,000. Net Surplus = 1,00,000
    expect(audit.profitAndLoss.netSurplusMicro).toBe(toMicroUnits(100000));

    // Fundamental Balance: Assets (300k) == Liabilities (50k) + Equity (150k) + Net Surplus (100k)
    expect(audit.balanceSheet.isBalanced).toBe(true);
  });
});
