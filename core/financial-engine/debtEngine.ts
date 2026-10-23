// Enterprise Fintech Engine: Credit Card Cycle State Machine, Loan Amortization & Debt Optimizers
// Mathematical implementation of Annuity Formulas, Avalanche & Snowball strategies.

import { toMicroUnits, fromMicroUnits } from './microUnits';

export interface CreditCardAccountInfo {
  accountId: string;
  name: string;
  creditLimitMicro: bigint;
  billingCycleDay: number; // 1-31 (day of month statement is cut)
  dueDayOffset: number; // Calendar days after statement when payment is due (e.g. 20)
  billedStatementDueMicro: bigint;
  unbilledTransactionsMicro: bigint;
}

export interface CreditCardCycleState {
  totalOutstandingMicro: bigint;
  billedStatementDueMicro: bigint;
  unbilledTransactionsMicro: bigint;
  utilizationPercent: number;
  isHighUtilizationAlert: boolean; // > 30%
  statementDate: string; // YYYY-MM-DD
  paymentDueDate: string; // YYYY-MM-DD
  interestFreeRunwayDays: number; // Max up to 50 days
}

export interface LoanInput {
  principalMicro: bigint;
  annualInterestRatePercent: number; // e.g. 8.5%
  tenureMonths: number; // e.g. 240 (20 years)
  prepayments?: Array<{ month: number; extraPrincipalMicro: bigint }>;
  annualStepUpPercent?: number; // e.g. 5% step-up in EMI every 12 months
}

export interface MonthlyAmortizationEntry {
  month: number;
  openingPrincipalMicro: bigint;
  emiMicro: bigint;
  principalPortionMicro: bigint;
  interestPortionMicro: bigint;
  closingPrincipalMicro: bigint;
}

export interface AmortizationResult {
  baseEmiMicro: bigint;
  schedule: MonthlyAmortizationEntry[];
  totalInterestPaidMicro: bigint;
  totalPaymentMicro: bigint;
  actualTenureMonths: number;
  monthsSaved: number;
  interestSavedMicro: bigint;
}

export interface DebtItem {
  id: string;
  name: string;
  principalMicro: bigint;
  annualInterestRatePercent: number;
  minPaymentMicro: bigint;
}

export interface PayoffStrategyResult {
  strategy: 'AVALANCHE' | 'SNOWBALL';
  totalMonths: number;
  totalInterestMicro: bigint;
  monthlyLog: Array<{
    month: number;
    debtsRemaining: Array<{ id: string; name: string; balanceMicro: bigint }>;
  }>;
}

export class DebtEngine {
  /**
   * 1. Credit Card Cycle State Machine
   * Resolves billing cycle, statement date, grace period, and 30% credit utilization warnings.
   * Handles 31st of month, leap years, and month transitions correctly.
   */
  public evaluateCardCycle(
    card: CreditCardAccountInfo,
    currentDate = new Date()
  ): CreditCardCycleState {
    const totalOutstanding =
      card.billedStatementDueMicro + card.unbilledTransactionsMicro;

    const utilization =
      card.creditLimitMicro > 0n
        ? Number((totalOutstanding * 10000n) / card.creditLimitMicro) / 100
        : 0;

    const isHighUtilizationAlert = utilization > 30.0;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const day = currentDate.getDate();

    // Determine statement cut date for the active billing cycle
    // If current day < billingCycleDay, the most recent statement was cut last month
    let statementYear = year;
    let statementMonth = month;

    if (day < card.billingCycleDay) {
      statementMonth = month - 1;
      if (statementMonth < 0) {
        statementMonth = 11;
        statementYear -= 1;
      }
    }

    // Days in statement month (e.g. Feb 28/29, or 30-day months)
    const daysInStmtMonth = new Date(statementYear, statementMonth + 1, 0).getDate();
    const resolvedCycleDay = Math.min(card.billingCycleDay, daysInStmtMonth);
    const statementDateObj = new Date(statementYear, statementMonth, resolvedCycleDay);

    // Payment due date = statementDate + dueDayOffset
    const dueDateObj = new Date(statementDateObj);
    dueDateObj.setDate(dueDateObj.getDate() + card.dueDayOffset);

    // Interest-free runway: days between today and payment due date for a fresh purchase
    // Maximum interest-free period occurs right after statement date (approx cycle length + grace period ~ 50 days)
    const msDiff = dueDateObj.getTime() - currentDate.getTime();
    const daysToDueDate = Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));
    const interestFreeRunway =
      day >= resolvedCycleDay
        ? daysToDueDate + 30
        : daysToDueDate;

    return {
      totalOutstandingMicro: totalOutstanding,
      billedStatementDueMicro: card.billedStatementDueMicro,
      unbilledTransactionsMicro: card.unbilledTransactionsMicro,
      utilizationPercent: utilization,
      isHighUtilizationAlert,
      statementDate: statementDateObj.toISOString().split('T')[0],
      paymentDueDate: dueDateObj.toISOString().split('T')[0],
      interestFreeRunwayDays: Math.min(50, Math.max(1, interestFreeRunway)),
    };
  }

  /**
   * 2. Loan Amortization Simulator
   * Standard Annuity Formula: EMI = P * [r(1+r)^n] / [(1+r)^n - 1]
   */
  public calculateLoanAmortization(input: LoanInput): AmortizationResult {
    const P = fromMicroUnits(input.principalMicro);
    const annualRate = input.annualInterestRatePercent / 100;
    const r = annualRate / 12; // Monthly rate
    const n = input.tenureMonths;

    // Standard EMI formula
    let emiNum = 0;
    if (r > 0) {
      const pow = Math.pow(1 + r, n);
      emiNum = (P * r * pow) / (pow - 1);
    } else {
      emiNum = P / n;
    }

    const baseEmiMicro = toMicroUnits(emiNum);

    // Baseline calculation (without prepayments/step-ups)
    let baselineTotalInterest = 0n;
    let baseBal = input.principalMicro;
    for (let m = 1; m <= n; m++) {
      const monthlyRateBasisPoints = BigInt(Math.round(r * 10000000));
      const interest = (baseBal * monthlyRateBasisPoints) / 10000000n;
      let principalPaid = baseEmiMicro - interest;
      if (principalPaid > baseBal) principalPaid = baseBal;
      baselineTotalInterest += interest;
      baseBal -= principalPaid;
      if (baseBal <= 0n) break;
    }

    // Actual simulation with prepayments and step-ups
    const schedule: MonthlyAmortizationEntry[] = [];
    let currentBalance = input.principalMicro;
    let totalInterestPaid = 0n;
    let totalPaid = 0n;
    let currentEmiMicro = baseEmiMicro;

    const prepaymentMap = new Map<number, bigint>();
    if (input.prepayments) {
      for (const prep of input.prepayments) {
        prepaymentMap.set(prep.month, prep.extraPrincipalMicro);
      }
    }

    let actualMonths = 0;
    for (let m = 1; m <= n; m++) {
      if (currentBalance <= 0n) break;
      actualMonths = m;

      // Annual step-up in EMI every 12 months
      if (input.annualStepUpPercent && m > 1 && (m - 1) % 12 === 0) {
        const stepFactor = 10000n + BigInt(Math.round(input.annualStepUpPercent * 100));
        currentEmiMicro = (currentEmiMicro * stepFactor) / 10000n;
      }

      const monthlyRateScaled = BigInt(Math.round(r * 10000000));
      const interest = (currentBalance * monthlyRateScaled) / 10000000n;

      let principalPaid = currentEmiMicro - interest;
      if (principalPaid > currentBalance) {
        principalPaid = currentBalance;
      }

      // Add one-time prepayment if scheduled for this month
      const extraPrep = prepaymentMap.get(m) || 0n;
      const totalPrincipalThisMonth = principalPaid + extraPrep;
      const actualPrincipalDeduction =
        totalPrincipalThisMonth > currentBalance ? currentBalance : totalPrincipalThisMonth;

      const closingBal = currentBalance - actualPrincipalDeduction;
      const totalEmiThisMonth = interest + actualPrincipalDeduction;

      totalInterestPaid += interest;
      totalPaid += totalEmiThisMonth;

      schedule.push({
        month: m,
        openingPrincipalMicro: currentBalance,
        emiMicro: totalEmiThisMonth,
        principalPortionMicro: actualPrincipalDeduction,
        interestPortionMicro: interest,
        closingPrincipalMicro: closingBal,
      });

      currentBalance = closingBal;
    }

    const monthsSaved = Math.max(0, n - actualMonths);
    const interestSaved =
      baselineTotalInterest > totalInterestPaid
        ? baselineTotalInterest - totalInterestPaid
        : 0n;

    return {
      baseEmiMicro,
      schedule,
      totalInterestPaidMicro: totalInterestPaid,
      totalPaymentMicro: totalPaid,
      actualTenureMonths: actualMonths,
      monthsSaved,
      interestSavedMicro: interestSaved,
    };
  }

  /**
   * 3. Debt Avalanche vs Snowball Optimizer
   * Simulates accelerated debt payoff using surplus monthly cash flow.
   */
  public simulateDebtPayoff(
    debts: DebtItem[],
    totalMonthlyBudgetMicro: bigint,
    strategy: 'AVALANCHE' | 'SNOWBALL'
  ): PayoffStrategyResult {
    // Clone debts
    const activeDebts = debts.map((d) => ({ ...d, currentBal: d.principalMicro }));
    let totalInterest = 0n;
    let month = 0;
    const maxMonths = 360; // 30-year safety ceiling

    const monthlyLog: PayoffStrategyResult['monthlyLog'] = [];

    while (activeDebts.some((d) => d.currentBal > 0n) && month < maxMonths) {
      month++;
      let remainingPool = totalMonthlyBudgetMicro;

      // 1. Pay minimum payments on all active debts
      for (const d of activeDebts) {
        if (d.currentBal <= 0n) continue;
        const monthlyRate = (d.annualInterestRatePercent / 100 / 12);
        const interest = (d.currentBal * BigInt(Math.round(monthlyRate * 1000000))) / 1000000n;
        totalInterest += interest;
        d.currentBal += interest;

        let pay = d.minPaymentMicro;
        if (pay > d.currentBal) pay = d.currentBal;
        if (pay > remainingPool) pay = remainingPool;

        d.currentBal -= pay;
        remainingPool -= pay;
      }

      // 2. Sort remaining active debts based on strategy
      const unpaidDebts = activeDebts.filter((d) => d.currentBal > 0n);
      if (strategy === 'AVALANCHE') {
        // Sort highest interest rate first
        unpaidDebts.sort((a, b) => b.annualInterestRatePercent - a.annualInterestRatePercent);
      } else {
        // Snowball: Sort lowest balance first
        unpaidDebts.sort((a, b) => (a.currentBal < b.currentBal ? -1 : 1));
      }

      // 3. Funnel all remaining surplus into priority debt
      if (remainingPool > 0n && unpaidDebts.length > 0) {
        const target = unpaidDebts[0];
        const extraPay = remainingPool > target.currentBal ? target.currentBal : remainingPool;
        target.currentBal -= extraPay;
        remainingPool -= extraPay;
      }

      monthlyLog.push({
        month,
        debtsRemaining: activeDebts.map((d) => ({
          id: d.id,
          name: d.name,
          balanceMicro: d.currentBal > 0n ? d.currentBal : 0n,
        })),
      });
    }

    return {
      strategy,
      totalMonths: month,
      totalInterestMicro: totalInterest,
      monthlyLog,
    };
  }
}
