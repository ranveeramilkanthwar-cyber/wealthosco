// Enterprise Fintech Engine: Multi-Entity Ledger, Min-Cash-Flow Debt Simplifier & Bank Reconciliation Statement (BRS)
// Institutional group debt reduction algorithm: Reduces M debts among N persons to at most N - 1 transactions.

import { toMicroUnits, fromMicroUnits } from './microUnits';
import { Account, Transaction } from './types';

export interface PeerDebt {
  debtor: string; // Person who owes money
  creditor: string; // Person who is owed money
  amountMicro: bigint;
}

export interface SimplifiedSettlement {
  from: string;
  to: string;
  amountMicro: bigint;
}

export interface BRSDiscrepancy {
  type: 'UNPRESENTED_CHEQUE' | 'UNCLEARED_DEPOSIT' | 'BANK_CHARGE' | 'INTEREST_CREDIT' | 'UNMATCHED';
  amountMicro: bigint;
  description: string;
  date: string;
}

export interface BankReconciliationResult {
  ledgerBalanceMicro: bigint;
  bankStatementBalanceMicro: bigint;
  discrepancies: BRSDiscrepancy[];
  reconciledBalanceMicro: bigint;
  isReconciled: boolean;
}

export class MultiEntityAndGraphEngine {
  /**
   * 1. Min-Cash-Flow Graph Debt Simplifier
   * Given arbitrary peer debts among N participants, computes net balance for each person.
   * Matches maximum creditor with maximum debtor using greedy two-pointer heap approach.
   * Algorithmic Guarantee: Produces at most N - 1 settlements with zero residual balance.
   */
  public simplifyDebts(debts: PeerDebt[]): SimplifiedSettlement[] {
    const netBalances = new Map<string, bigint>();

    for (const d of debts) {
      if (d.amountMicro <= 0n) continue;
      // Debtor pays money: net decreases
      netBalances.set(d.debtor, (netBalances.get(d.debtor) || 0n) - d.amountMicro);
      // Creditor receives money: net increases
      netBalances.set(d.creditor, (netBalances.get(d.creditor) || 0n) + d.amountMicro);
    }

    // Separate into debtors (negative balance) and creditors (positive balance)
    interface BalanceEntry {
      person: string;
      balance: bigint;
    }

    const creditors: BalanceEntry[] = [];
    const debtors: BalanceEntry[] = [];

    for (const [person, bal] of netBalances.entries()) {
      if (bal > 0n) {
        creditors.push({ person, balance: bal });
      } else if (bal < 0n) {
        debtors.push({ person, balance: -bal }); // Store as positive magnitude
      }
    }

    const settlements: SimplifiedSettlement[] = [];

    // Greedy matching: Match largest debtor with largest creditor
    while (debtors.length > 0 && creditors.length > 0) {
      debtors.sort((a, b) => (b.balance > a.balance ? 1 : -1));
      creditors.sort((a, b) => (b.balance > a.balance ? 1 : -1));

      const debtor = debtors[0];
      const creditor = creditors[0];

      const settlementAmount = debtor.balance < creditor.balance ? debtor.balance : creditor.balance;

      settlements.push({
        from: debtor.person,
        to: creditor.person,
        amountMicro: settlementAmount,
      });

      debtor.balance -= settlementAmount;
      creditor.balance -= settlementAmount;

      if (debtor.balance === 0n) {
        debtors.shift();
      }
      if (creditor.balance === 0n) {
        creditors.shift();
      }
    }

    return settlements;
  }

  /**
   * 2. Bank Reconciliation Statement (BRS) Engine
   */
  public reconcileBankStatement(
    ledgerBalanceMicro: bigint,
    bankStatementBalanceMicro: bigint,
    discrepancies: BRSDiscrepancy[]
  ): BankReconciliationResult {
    let adjustedLedger = ledgerBalanceMicro;

    for (const disc of discrepancies) {
      switch (disc.type) {
        case 'UNPRESENTED_CHEQUE':
          // Cheque issued but not yet debited by bank -> adds back to bank perspective
          break;
        case 'UNCLEARED_DEPOSIT':
          // Cheque deposited but not yet cleared by bank
          break;
        case 'BANK_CHARGE':
          // Bank deducted fee not yet recorded in local ledger -> decreases ledger
          adjustedLedger -= disc.amountMicro;
          break;
        case 'INTEREST_CREDIT':
          // Bank credited interest not yet recorded in local ledger -> increases ledger
          adjustedLedger += disc.amountMicro;
          break;
        case 'UNMATCHED':
          break;
      }
    }

    return {
      ledgerBalanceMicro,
      bankStatementBalanceMicro,
      discrepancies,
      reconciledBalanceMicro: adjustedLedger,
      isReconciled: adjustedLedger === bankStatementBalanceMicro,
    };
  }

  /**
   * 3. Entity Filter: Personal vs Freelance Business Co-Mingling Protection
   */
  public filterLedgerByEntity(
    accounts: Account[],
    transactions: Transaction[],
    entityId: string
  ): {
    entityAccounts: Account[];
    entityTransactions: Transaction[];
    totalBurnMicro: bigint;
  } {
    const entityAccounts = accounts.filter(
      (a) => !a.entity_id || a.entity_id === entityId
    );
    const entityTransactions = transactions.filter(
      (t) => !t.entity_id || t.entity_id === entityId
    );

    let totalBurn = 0n;
    for (const t of entityTransactions) {
      if (t.transaction_type === 'EXPENSE') {
        // Find expense postings
      }
    }

    return {
      entityAccounts,
      entityTransactions,
      totalBurnMicro: totalBurn,
    };
  }
}
