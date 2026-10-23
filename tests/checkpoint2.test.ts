// Checkpoint 2 Test Suite: Transaction Variants, Multi-Currency, Splits & CapEx
// Test Scenario 1: 3-way split dinner with partial UPI repayment
// Test Scenario 2: Foreign currency transaction with fluctuating spot rates
// Test Scenario 3: ₹1,20,000 MacBook purchase depreciated over 36 months (CapEx vs OpEx)
// Test Scenario 4: Compensating Reversal audit integrity

import { describe, it, expect, beforeEach } from 'vitest';
import { DoubleEntryLedger } from '../core/financial-engine/doubleEntryLedger';
import { TransactionService } from '../core/financial-engine/transactionVariants';
import { Account } from '../core/financial-engine/types';
import { toMicroUnits, fromMicroUnits } from '../core/financial-engine/microUnits';

describe('Phase 2: Transaction Variants, Multi-Currency, Splits & CapEx (Checkpoint 2)', () => {
  let ledger: DoubleEntryLedger;
  let service: TransactionService;

  const accounts: Account[] = [
    {
      id: 'acc_asset_hdfc',
      name: 'HDFC Bank Savings',
      account_type: 'ASSET',
      account_subtype: 'BANK',
      currency: 'INR',
      balance_micro: toMicroUnits(500000), // ₹5,00,000 starting cash
      is_archived: false,
    },
    {
      id: 'acc_asset_receivable_alice',
      name: 'Receivables: Alice',
      account_type: 'ASSET',
      account_subtype: 'RECEIVABLE',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_asset_receivable_bob',
      name: 'Receivables: Bob',
      account_type: 'ASSET',
      account_subtype: 'RECEIVABLE',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_liab_card',
      name: 'Axis Bank Credit Card',
      account_type: 'LIABILITY',
      account_subtype: 'CREDIT_CARD',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_asset_fixed_laptop',
      name: 'Fixed Asset: Apple MacBook Pro',
      account_type: 'ASSET',
      account_subtype: 'FIXED_ASSET',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_asset_accumulated_depreciation',
      name: 'Accumulated Depreciation',
      account_type: 'ASSET', // Contra-asset
      account_subtype: 'CAPEX_AMORT',
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
      id: 'acc_expense_saas',
      name: 'Software Subscriptions (SaaS)',
      account_type: 'EXPENSE',
      account_subtype: 'OPEX',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_expense_depreciation',
      name: 'Depreciation Expense',
      account_type: 'EXPENSE',
      account_subtype: 'CAPEX_AMORT',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
    {
      id: 'acc_equity_opening',
      name: 'Owner Equity',
      account_type: 'EQUITY',
      account_subtype: 'CASH',
      currency: 'INR',
      balance_micro: toMicroUnits(500000), // Matches HDFC cash
      is_archived: false,
    },
  ];

  beforeEach(() => {
    ledger = new DoubleEntryLedger(accounts);
    service = new TransactionService(ledger);
  });

  it('Scenario 1: 3-way split dinner with partial UPI repayment preserves accounting balance', () => {
    // Total dinner: ₹1,800 paid by user via Axis Credit Card
    // My share: ₹600 (Expense:Dining)
    // Alice's share: ₹600 (Asset:Receivable:Alice)
    // Bob's share: ₹600 (Asset:Receivable:Bob)
    const splitResult = service.recordSplit({
      sourceAccountId: 'acc_liab_card',
      date: '2026-10-15T20:30:00Z',
      description: 'Dinner at Smoke House Deli split 3 ways',
      splitLegs: [
        { accountId: 'acc_expense_dining', amountMicro: toMicroUnits(600), memo: 'My share of dinner' },
        { accountId: 'acc_asset_receivable_alice', amountMicro: toMicroUnits(600), memo: "Alice's share" },
        { accountId: 'acc_asset_receivable_bob', amountMicro: toMicroUnits(600), memo: "Bob's share" },
      ],
    });

    expect(splitResult.postings.length).toBe(4);
    // Axis CC liability increased by ₹1,800
    expect(ledger.getAccount('acc_liab_card')?.balance_micro).toBe(toMicroUnits(1800));
    // Dining expense increased by ₹600
    expect(ledger.getAccount('acc_expense_dining')?.balance_micro).toBe(toMicroUnits(600));
    // Receivables Alice = ₹600, Bob = ₹600
    expect(ledger.getAccount('acc_asset_receivable_alice')?.balance_micro).toBe(toMicroUnits(600));
    expect(ledger.getAccount('acc_asset_receivable_bob')?.balance_micro).toBe(toMicroUnits(600));

    // Bob GPays ₹600 back to HDFC Bank:
    // Debit HDFC Bank (+600), Credit Bob's Receivable (-600)
    service.recordTransfer({
      fromAccountId: 'acc_asset_receivable_bob',
      toAccountId: 'acc_asset_hdfc',
      amountMicro: toMicroUnits(600),
      date: '2026-10-16T11:00:00Z',
      description: 'Bob UPI repayment for dinner',
    });

    expect(ledger.getAccount('acc_asset_receivable_bob')?.balance_micro).toBe(0n);
    expect(ledger.getAccount('acc_asset_hdfc')?.balance_micro).toBe(toMicroUnits(500600));

    // Fundamental Equation holds
    const eq = ledger.verifyFundamentalAccountingEquation();
    expect(eq.isBalanced).toBe(true);
  });

  it('Scenario 2: Multi-currency foreign SaaS transaction converts accurately with spot rate', () => {
    // $20.00 USD subscription paid at spot rate 83.50 INR = ₹1,670.00
    const foreignTx = service.recordForeignExpense({
      sourceAccountId: 'acc_asset_hdfc',
      expenseAccountId: 'acc_expense_saas',
      foreignCurrency: 'USD',
      foreignAmountMicro: toMicroUnits(20),
      spotRate: 83.5,
      date: '2026-10-18T14:00:00Z',
      description: 'GitHub Copilot Enterprise Monthly',
    });

    expect(foreignTx.baseAmountMicro).toBe(toMicroUnits(1670));
    expect(ledger.getAccount('acc_expense_saas')?.balance_micro).toBe(toMicroUnits(1670));

    const eq = ledger.verifyFundamentalAccountingEquation();
    expect(eq.isBalanced).toBe(true);
  });

  it('Scenario 3: ₹1,20,000 MacBook purchase capitalized as Fixed Asset and depreciated over 36 months', () => {
    // ₹1,20,000 paid via HDFC Bank
    const capex = service.recordCapEx({
      fundingAccountId: 'acc_asset_hdfc',
      fixedAssetAccountId: 'acc_asset_fixed_laptop',
      amountMicro: toMicroUnits(120000),
      assetName: 'MacBook Pro M4 Max',
      date: '2026-10-01T10:00:00Z',
      usefulLifeMonths: 36,
      salvageValueMicro: toMicroUnits(12000), // 10% residual salvage value
      warrantyExpiryDate: '2029-10-01',
      depreciationMethod: 'STRAIGHT_LINE',
    });

    expect(capex.asset).toBeDefined();
    expect(capex.asset.initial_cost_micro).toBe(toMicroUnits(120000));
    expect(capex.asset.useful_life_months).toBe(36);

    // Initial check: Fixed asset on balance sheet = ₹1,20,000, OpEx has not been hit!
    expect(ledger.getAccount('acc_asset_fixed_laptop')?.balance_micro).toBe(toMicroUnits(120000));
    expect(ledger.getAccount('acc_expense_depreciation')?.balance_micro).toBe(0n);

    // Full 36-month schedule verification
    const schedule = service.capexEngine.generateFullSchedule(capex.asset.id);
    expect(schedule.length).toBe(36);

    // Depreciable base = 120,000 - 12,000 = 1,08,000 / 36 = 3,000.0000 per month
    expect(schedule[0].depreciation_amount_micro).toBe(toMicroUnits(3000));
    expect(schedule[35].remaining_book_value_micro).toBe(toMicroUnits(12000)); // Exactly salvage value

    // Simulate 36 months of automated depreciation step entries
    for (let m = 0; m < 36; m++) {
      const step = service.capexEngine.stepMonthlyDepreciation(capex.asset.id);
      ledger.createJournalEntry({
        transaction: {
          transaction_date: schedule[m].scheduleDate,
          posted_date: schedule[m].scheduleDate,
          description: `Depreciation Month ${m + 1}: MacBook Pro`,
          transaction_type: 'CAPEX_DEPRECIATION',
          status: 'CLEARED',
          is_tax_deductible: true,
          attachment_urls: [],
        },
        postings: [
          {
            account_id: step.postings.debitAccountId,
            direction: 'DEBIT',
            amount_micro: step.postings.amountMicro,
          },
          {
            account_id: step.postings.creditAccountId,
            direction: 'CREDIT',
            amount_micro: step.postings.amountMicro,
          },
        ],
      });
    }

    // After 36 months:
    // Accumulated depreciation = ₹1,08,000
    // Total depreciation expense = ₹1,08,000
    expect(ledger.getAccount('acc_expense_depreciation')?.balance_micro).toBe(toMicroUnits(108000));
    const finalAsset = service.capexEngine.getAsset(capex.asset.id);
    expect(finalAsset?.current_book_value_micro).toBe(toMicroUnits(12000));
    expect(finalAsset?.months_depreciated).toBe(36);

    // Verify fundamental equation after 36 months of non-cash amortizations
    const eq = ledger.verifyFundamentalAccountingEquation();
    expect(eq.isBalanced).toBe(true);
    expect(eq.difference).toBe(0n);
  });

  it('Scenario 4: Compensating reversal inverses previous entries cleanly with audit trail', () => {
    // Record an erroneous expense of ₹5,000
    const errTx = service.recordExpense({
      sourceAccountId: 'acc_asset_hdfc',
      expenseAccountId: 'acc_expense_dining',
      amountMicro: toMicroUnits(5000),
      date: '2026-10-10T19:00:00Z',
      description: 'Erroneous duplicate entry',
    });

    const preRevEq = ledger.verifyFundamentalAccountingEquation();
    expect(preRevEq.isBalanced).toBe(true);

    // Generate compensating reversal
    const reversal = service.createCompensatingReversal(errTx.transaction.id, 'Wrong bill entered');
    expect(reversal.reversalTransaction.transaction_type).toBe('ADJUSTMENT');

    // Expense on dining should now be net 0
    expect(ledger.getAccount('acc_expense_dining')?.balance_micro).toBe(0n);

    // Audit logs must record both CREATE and REVERSAL
    expect(ledger.getAuditLogs().length).toBeGreaterThanOrEqual(2);

    const postRevEq = ledger.verifyFundamentalAccountingEquation();
    expect(postRevEq.isBalanced).toBe(true);
  });
});
