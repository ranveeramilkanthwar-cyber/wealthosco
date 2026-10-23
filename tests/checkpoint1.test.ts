// Checkpoint 1 Test Suite: Deterministic Double-Entry Engine & Invariant Integrity
// Target: 10,000 randomized balanced entries, 1,000 unbalanced transactions rejected with 100% rollback.
// Assert: Fundamental Accounting Equation: Assets = Liabilities + Equity + (Income - Expenses) holds identically.

import { describe, it, expect, beforeEach } from 'vitest';
import { DoubleEntryLedger } from '../core/financial-engine/doubleEntryLedger';
import { Account, UnbalancedLedgerError } from '../core/financial-engine/types';
import { toMicroUnits } from '../core/financial-engine/microUnits';

describe('Phase 1: Deterministic Double-Entry Engine (Checkpoint 1)', () => {
  let ledger: DoubleEntryLedger;

  const accounts: Account[] = [
    {
      id: 'acc_equity_opening',
      name: 'Opening Balance Equity',
      account_type: 'EQUITY',
      account_subtype: 'CASH',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_asset_hdfc',
      name: 'HDFC Bank Savings',
      account_type: 'ASSET',
      account_subtype: 'BANK',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_asset_cash',
      name: 'Physical Cash Wallet',
      account_type: 'ASSET',
      account_subtype: 'CASH',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_liab_cc',
      name: 'HDFC Regalia Credit Card',
      account_type: 'LIABILITY',
      account_subtype: 'CREDIT_CARD',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_income_salary',
      name: 'Salary & Professional Income',
      account_type: 'INCOME',
      account_subtype: 'BANK',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_expense_dining',
      name: 'Dining & Restaurants',
      account_type: 'EXPENSE',
      account_subtype: 'OPEX',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_expense_groceries',
      name: 'Groceries & Provisions',
      account_type: 'EXPENSE',
      account_subtype: 'OPEX',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_expense_rent',
      name: 'Apartment Rent',
      account_type: 'EXPENSE',
      account_subtype: 'OPEX',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
  ];

  beforeEach(() => {
    ledger = new DoubleEntryLedger(accounts);
  });

  it('correctly sets up Chart of Accounts', () => {
    expect(ledger.getAllAccounts().length).toBe(8);
    const hdfc = ledger.getAccount('acc_asset_hdfc');
    expect(hdfc).toBeDefined();
    expect(hdfc?.balance_micro).toBe(0n);
  });

  it('rejects unbalanced journal entries and rolls back all balances', () => {
    const preSnapshot = ledger.getAllAccounts().map((a) => ({ id: a.id, bal: a.balance_micro }));

    expect(() => {
      ledger.createJournalEntry({
        transaction: {
          transaction_date: '2026-10-01T10:00:00Z',
          posted_date: '2026-10-01T10:00:00Z',
          description: 'Unbalanced Attempt',
          transaction_type: 'EXPENSE',
          status: 'CLEARED',
          is_tax_deductible: false,
          attachment_urls: [],
        },
        postings: [
          { account_id: 'acc_expense_dining', direction: 'DEBIT', amount_micro: toMicroUnits(500) },
          { account_id: 'acc_asset_hdfc', direction: 'CREDIT', amount_micro: toMicroUnits(450) }, // 50 micro off
        ],
      });
    }).toThrow(UnbalancedLedgerError);

    // Assert strict zero-mutation on error
    const postSnapshot = ledger.getAllAccounts().map((a) => ({ id: a.id, bal: a.balance_micro }));
    expect(postSnapshot).toEqual(preSnapshot);
  });

  it('passes 1,000 unbalanced transaction attempts with 100% rollback guarantee', () => {
    let rollbackSuccessCount = 0;

    for (let i = 0; i < 1000; i++) {
      const debitAmt = BigInt((i + 1) * 10000);
      const creditAmt = debitAmt + BigInt(i % 50 + 1); // Deliberately unbalanced

      try {
        ledger.createJournalEntry({
          transaction: {
            transaction_date: '2026-10-01T10:00:00Z',
            posted_date: '2026-10-01T10:00:00Z',
            description: `Unbalanced Stress Test ${i}`,
            transaction_type: 'EXPENSE',
            status: 'CLEARED',
            is_tax_deductible: false,
            attachment_urls: [],
          },
          postings: [
            { account_id: 'acc_expense_dining', direction: 'DEBIT', amount_micro: debitAmt },
            { account_id: 'acc_asset_hdfc', direction: 'CREDIT', amount_micro: creditAmt },
          ],
        });
      } catch (err) {
        if (err instanceof UnbalancedLedgerError) {
          rollbackSuccessCount++;
        }
      }
    }

    expect(rollbackSuccessCount).toBe(1000);
    // Invariant must be zero across all accounts
    const eq = ledger.verifyFundamentalAccountingEquation();
    expect(eq.isBalanced).toBe(true);
    expect(eq.assets).toBe(0n);
    expect(eq.difference).toBe(0n);
  });

  it('executes 10,000 randomized balanced entries and preserves the Fundamental Accounting Equation', () => {
    const expenseAccounts = ['acc_expense_dining', 'acc_expense_groceries', 'acc_expense_rent'];
    const assetAccounts = ['acc_asset_hdfc', 'acc_asset_cash'];

    // Initial equity injection: 1,00,00,000 micro-units into HDFC
    ledger.createJournalEntry({
      transaction: {
        transaction_date: '2026-10-01T00:00:00Z',
        posted_date: '2026-10-01T00:00:00Z',
        description: 'Opening Capital Deposit',
        transaction_type: 'INCOME',
        status: 'CLEARED',
        is_tax_deductible: false,
        attachment_urls: [],
      },
      postings: [
        { account_id: 'acc_asset_hdfc', direction: 'DEBIT', amount_micro: toMicroUnits(5000000) },
        { account_id: 'acc_equity_opening', direction: 'CREDIT', amount_micro: toMicroUnits(5000000) },
      ],
    });

    for (let i = 0; i < 10000; i++) {
      const amt = BigInt((i % 700 + 10) * 10000); // 10 to 710 INR in micro-units
      const expAcc = expenseAccounts[i % expenseAccounts.length];
      const sourceAcc = i % 3 === 0 ? 'acc_liab_cc' : assetAccounts[i % assetAccounts.length];

      ledger.createJournalEntry({
        transaction: {
          transaction_date: new Date(1760000000000 + i * 60000).toISOString(),
          posted_date: new Date(1760000000000 + i * 60000).toISOString(),
          description: `Randomized Transaction ${i}`,
          transaction_type: 'EXPENSE',
          status: 'CLEARED',
          is_tax_deductible: false,
          attachment_urls: [],
          deduplication_hash: `hash_balanced_${i}`,
        },
        postings: [
          { account_id: expAcc, direction: 'DEBIT', amount_micro: amt },
          { account_id: sourceAcc, direction: 'CREDIT', amount_micro: amt },
        ],
      });
    }

    expect(ledger.getAllTransactions().length).toBe(10001);

    // Verify Invariant: Assets = Liabilities + Equity + (Income - Expenses)
    const eq = ledger.verifyFundamentalAccountingEquation();
    expect(eq.isBalanced).toBe(true);
    expect(eq.difference).toBe(0n);
    expect(eq.equationLHS).toBe(eq.equationRHS);
  });
});
