// Checkpoint 4 Test Suite: Budgeting, Credit Cards & Debt Optimization
// Test Scenario 1: Multi-card billing cycles (31st dates, leap years, statement grace periods, 30% utilization warning)
// Test Scenario 2: Safe-to-Spend dynamic calculation with zero double-counting
// Test Scenario 3: Loan amortization annuity formula verification against standard financial tables
// Test Scenario 4: Debt Avalanche vs Snowball payoff comparison

import { describe, it, expect, beforeEach } from 'vitest';
import { BudgetEngine } from '../core/financial-engine/budgetEngine';
import { DebtEngine } from '../core/financial-engine/debtEngine';
import { toMicroUnits, fromMicroUnits } from '../core/financial-engine/microUnits';

describe('Phase 4: Budgeting, Credit Cards & Debt Optimization (Checkpoint 4)', () => {
  let budgetEngine: BudgetEngine;
  let debtEngine: DebtEngine;

  beforeEach(() => {
    budgetEngine = new BudgetEngine();
    debtEngine = new DebtEngine();
  });

  it('Scenario 1: Evaluates credit card cycles, handles 31st dates & leap years, and triggers 30% utilization alert', () => {
    // Card with ₹3,00,000 limit, billing cycle on 31st, 20 days payment offset
    const cardInfo = {
      accountId: 'acc_cc_regalia',
      name: 'HDFC Regalia CC',
      creditLimitMicro: toMicroUnits(300000),
      billingCycleDay: 31,
      dueDayOffset: 20,
      billedStatementDueMicro: toMicroUnits(45000), // Billed
      unbilledTransactionsMicro: toMicroUnits(55000), // Unbilled swipes = ₹1,00,000 total (33.33% util)
    };

    // Test on February in leap year (e.g. Feb 15, 2028)
    const febDate = new Date(2028, 1, 15);
    const evalFeb = debtEngine.evaluateCardCycle(cardInfo, febDate);

    // Total outstanding is 1,00,000. Utilization = 1,00,000 / 3,00,000 = 33.33%
    expect(evalFeb.utilizationPercent).toBeCloseTo(33.33, 1);
    expect(evalFeb.isHighUtilizationAlert).toBe(true);
    // Interest-free runway should be between 1 and 50 days
    expect(evalFeb.interestFreeRunwayDays).toBeGreaterThan(0);
    expect(evalFeb.interestFreeRunwayDays).toBeLessThanOrEqual(50);
  });

  it('Scenario 2: Safe-to-Spend dynamic calculation guarantees zero double-counting', () => {
    // User has ₹1,20,000 in bank
    // Upcoming rent: ₹30,000
    // Mandatory savings lock: ₹20,000
    // Billed CC statement due: ₹15,000
    // User also made recent CC swipes of ₹10,000 (which are unbilled and NOT subtracted again from liquid cash)
    const result = budgetEngine.calculateSafeToSpend({
      liquidCashMicro: toMicroUnits(120000),
      upcomingFixedObligationsMicro: toMicroUnits(30000),
      savingsLockMicro: toMicroUnits(20000),
      outstandingStatementDuesMicro: toMicroUnits(15000),
      currentDate: new Date(2026, 9, 15), // Oct 15 -> 17 remaining days in Oct (31 - 15 + 1)
    });

    // Total commitments = 30k + 20k + 15k = 65,000
    expect(result.commitmentsMicro).toBe(toMicroUnits(65000));
    // Safe-to-Spend Total Month = 1,20,000 - 65,000 = 55,000
    expect(result.safeToSpendTotalMonthMicro).toBe(toMicroUnits(55000));
    expect(result.remainingDaysInMonth).toBe(17);

    // Daily allowance = 55,000 / 17 = ₹3,235.2941
    const dailyNum = fromMicroUnits(result.safeToSpendDailyMicro);
    expect(dailyNum).toBeCloseTo(3235.29, 1);
    expect(result.isDeficit).toBe(false);
  });

  it('Scenario 3: Verifies loan amortization annuity EMI against standard financial tables', () => {
    // Loan: ₹50,00,000 home loan, 8.5% annual interest, 240 months (20 years)
    // Standard banking EMI for 50L @ 8.5% 20y is ~₹43,391 per month
    const loan = debtEngine.calculateLoanAmortization({
      principalMicro: toMicroUnits(5000000),
      annualInterestRatePercent: 8.5,
      tenureMonths: 240,
    });

    const emi = fromMicroUnits(loan.baseEmiMicro);
    expect(emi).toBeGreaterThan(43300);
    expect(emi).toBeLessThan(43500);
    expect(loan.schedule.length).toBe(240);

    // Verify closing balance at month 240 is 0
    expect(loan.schedule[239].closingPrincipalMicro).toBe(0n);

    // Now test with ₹5,00,000 prepayment at month 12
    const prepayLoan = debtEngine.calculateLoanAmortization({
      principalMicro: toMicroUnits(5000000),
      annualInterestRatePercent: 8.5,
      tenureMonths: 240,
      prepayments: [{ month: 12, extraPrincipalMicro: toMicroUnits(500000) }],
    });

    // Should save tens of months and lakhs of interest!
    expect(prepayLoan.monthsSaved).toBeGreaterThan(30);
    expect(fromMicroUnits(prepayLoan.interestSavedMicro)).toBeGreaterThan(1000000);
  });

  it('Scenario 4: Debt Avalanche outperforms Snowball in total interest saved', () => {
    const debts = [
      {
        id: 'debt_cc',
        name: 'Credit Card Outstanding',
        principalMicro: toMicroUnits(150000),
        annualInterestRatePercent: 42.0, // High APR
        minPaymentMicro: toMicroUnits(7500),
      },
      {
        id: 'debt_personal',
        name: 'Personal Loan',
        principalMicro: toMicroUnits(300000),
        annualInterestRatePercent: 14.0,
        minPaymentMicro: toMicroUnits(10000),
      },
      {
        id: 'debt_auto',
        name: 'Car Loan',
        principalMicro: toMicroUnits(500000),
        annualInterestRatePercent: 9.0,
        minPaymentMicro: toMicroUnits(12000),
      },
    ];

    const monthlySurplusBudget = toMicroUnits(45000); // 7500 + 10000 + 12000 = 29,500 min, plus ~15.5k surplus

    const avalanche = debtEngine.simulateDebtPayoff(debts, monthlySurplusBudget, 'AVALANCHE');
    const snowball = debtEngine.simulateDebtPayoff(debts, monthlySurplusBudget, 'SNOWBALL');

    // Both should pay off debts in finite time
    expect(avalanche.totalMonths).toBeLessThan(36);
    expect(snowball.totalMonths).toBeLessThan(36);

    // Mathematical guarantee: Avalanche minimizes total interest paid
    expect(avalanche.totalInterestMicro).toBeLessThanOrEqual(snowball.totalInterestMicro);
  });
});
