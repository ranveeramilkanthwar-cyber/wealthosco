// Enterprise Fintech Engine: Intelligent Budgeting & Dynamic Safe-to-Spend Allowance
// Enforces zero-double-counting between credit card swipes and statement payments.

import { toMicroUnits, fromMicroUnits } from './microUnits';

export type BudgetMethodology =
  | 'ZERO_BASED'
  | 'PERCENTAGE_50_30_20'
  | 'ROLLOVER_ENVELOPE'
  | 'FIXED_CAP';

export interface BudgetEnvelope {
  id: string;
  categoryAccountId: string;
  categoryName: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;
  methodology: BudgetMethodology;
  allocatedMicro: bigint;
  spentMicro: bigint;
  rolloverMicro: bigint;
  alertThresholdPercent: number; // e.g. 80
}

export interface SafeToSpendInput {
  liquidCashMicro: bigint; // Checking + Savings + Physical Cash
  upcomingFixedObligationsMicro: bigint; // Rent, insurance, upcoming scheduled bills
  savingsLockMicro: bigint; // Emergency fund + mandatory monthly investment target
  outstandingStatementDuesMicro: bigint; // Billed credit card statements due this month
  currentDate?: Date;
}

export interface SafeToSpendResult {
  safeToSpendDailyMicro: bigint;
  safeToSpendTotalMonthMicro: bigint;
  remainingDaysInMonth: number;
  liquidCashMicro: bigint;
  commitmentsMicro: bigint;
  isDeficit: boolean;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  expectedAmountMicro: bigint;
  lastBilledAmountMicro?: bigint;
  billingFrequencyDays: number; // e.g. 30
  nextRenewalDate: string;
  hasPriceHike: boolean;
  priceHikePercentage?: number;
}

export class BudgetEngine {
  private envelopes = new Map<string, BudgetEnvelope>();
  private subscriptions: SubscriptionItem[] = [];

  /**
   * 1. Dynamic 'Safe-to-Spend' Allowance
   * Safe-to-Spend Today = [ Liquid Cash - Upcoming Unpaid Obligations - Savings Lock - Outstanding Statement Dues ] / Remaining Days in Month
   *
   * Crucial CA Rule:
   * Only OUTSTANDING BILLED statement dues are subtracted, NOT unbilled recent card swipes.
   * This guarantees that a card swipe (which is an unbilled liability) is never double-counted against both daily budget and cash buffer.
   */
  public calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendResult {
    const now = input.currentDate || new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Days in current month
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const currentDay = now.getDate();
    const remainingDays = Math.max(1, totalDaysInMonth - currentDay + 1);

    const commitments =
      input.upcomingFixedObligationsMicro +
      input.savingsLockMicro +
      input.outstandingStatementDuesMicro;

    const availablePool = input.liquidCashMicro - commitments;
    const isDeficit = availablePool < 0n;

    const safeToSpendTotalMonth = isDeficit ? 0n : availablePool;
    const safeToSpendDaily = isDeficit ? 0n : safeToSpendTotalMonth / BigInt(remainingDays);

    return {
      safeToSpendDailyMicro: safeToSpendDaily,
      safeToSpendTotalMonthMicro: safeToSpendTotalMonth,
      remainingDaysInMonth: remainingDays,
      liquidCashMicro: input.liquidCashMicro,
      commitmentsMicro: commitments,
      isDeficit,
    };
  }

  // --- Envelope Management ---

  public createEnvelope(envelope: BudgetEnvelope): BudgetEnvelope {
    const env = { ...envelope };
    this.envelopes.set(env.id, env);
    return env;
  }

  public recordSpendInEnvelope(categoryAccountId: string, amountMicro: bigint): void {
    for (const env of this.envelopes.values()) {
      if (env.categoryAccountId === categoryAccountId) {
        env.spentMicro += amountMicro;
        break;
      }
    }
  }

  public getEnvelopeStatus(envelopeId: string): {
    envelope: BudgetEnvelope;
    effectiveAllowanceMicro: bigint;
    remainingMicro: bigint;
    utilizationPercent: number;
    isOverBudget: boolean;
    isAlertTriggered: boolean;
  } {
    const env = this.envelopes.get(envelopeId);
    if (!env) throw new Error(`Envelope '${envelopeId}' not found.`);

    const effectiveAllowance = env.allocatedMicro + env.rolloverMicro;
    const remaining = effectiveAllowance - env.spentMicro;
    const utilization =
      effectiveAllowance > 0n
        ? Number((env.spentMicro * 10000n) / effectiveAllowance) / 100
        : 100;

    return {
      envelope: { ...env },
      effectiveAllowanceMicro: effectiveAllowance,
      remainingMicro: remaining,
      utilizationPercent: utilization,
      isOverBudget: remaining < 0n,
      isAlertTriggered: utilization >= env.alertThresholdPercent,
    };
  }

  // --- Subscription Vampire & Creep Detector ---

  public registerSubscription(sub: SubscriptionItem): void {
    const hike =
      sub.lastBilledAmountMicro && sub.lastBilledAmountMicro > sub.expectedAmountMicro;
    const hikePct =
      hike && sub.expectedAmountMicro > 0n
        ? Number(
            ((sub.lastBilledAmountMicro! - sub.expectedAmountMicro) * 10000n) /
              sub.expectedAmountMicro
          ) / 100
        : 0;

    this.subscriptions.push({
      ...sub,
      hasPriceHike: !!hike,
      priceHikePercentage: hikePct,
    });
  }

  public getVampireSubscriptions(): SubscriptionItem[] {
    return this.subscriptions.filter((s) => s.hasPriceHike);
  }
}
