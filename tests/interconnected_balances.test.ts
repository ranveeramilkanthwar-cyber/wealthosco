import { describe, it, expect, beforeEach } from 'vitest';
import { DoubleEntryLedger } from '../core/financial-engine/doubleEntryLedger';
import { TransactionService } from '../core/financial-engine/transactionVariants';
import { STARTER_ACCOUNTS } from '../core/financial-engine/sampleData';
import { toMicroUnits, fromMicroUnits } from '../core/financial-engine/microUnits';
import { BudgetEngine } from '../core/financial-engine/budgetEngine';

describe('Interconnected Cash & Bank Balance Logic Tests', () => {
  let ledger: DoubleEntryLedger;
  let service: TransactionService;
  let budgetEngine: BudgetEngine;

  beforeEach(() => {
    ledger = new DoubleEntryLedger(STARTER_ACCOUNTS.map((a) => ({ ...a })));
    service = new TransactionService(ledger);
    budgetEngine = new BudgetEngine();
  });

  it('accurately sets and updates starting balances for cash, bank, and credit card', () => {
    const cashAcc = ledger.getAllAccounts().find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH'))!;
    const bankAcc = ledger.getAllAccounts().find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK'))!;
    const ccAcc = ledger.getAllAccounts().find((a) => a.id === 'acc_credit_card' || (a.account_type === 'LIABILITY' && a.account_subtype === 'CREDIT_CARD'))!;
    const equityAcc = ledger.getAllAccounts().find((a) => a.id === 'acc_equity_opening' || a.account_type === 'EQUITY')!;

    expect(cashAcc).toBeDefined();
    expect(bankAcc).toBeDefined();

    // Calibrate starting balances
    ledger.setAccountBalance(cashAcc.id, toMicroUnits(5000));
    ledger.setAccountBalance(bankAcc.id, toMicroUnits(75000));
    ledger.setAccountBalance(ccAcc.id, toMicroUnits(3000));
    ledger.setAccountBalance(equityAcc.id, toMicroUnits(5000 + 75000 - 3000));

    const updatedCash = ledger.getAccount(cashAcc.id)!;
    const updatedBank = ledger.getAccount(bankAcc.id)!;
    const updatedCC = ledger.getAccount(ccAcc.id)!;

    expect(fromMicroUnits(updatedCash.balance_micro)).toBe(5000);
    expect(fromMicroUnits(updatedBank.balance_micro)).toBe(75000);
    expect(fromMicroUnits(updatedCC.balance_micro)).toBe(3000);

    // Verify equation holds
    const eq = ledger.verifyFundamentalAccountingEquation();
    expect(eq.isBalanced).toBe(true);
    expect(eq.difference).toBe(0n);
  });

  it('strictly isolates Cash expenses from Bank account balance', () => {
    const cashAcc = ledger.getAccount('acc_cash_wallet')!;
    const bankAcc = ledger.getAccount('acc_bank_primary')!;
    const foodAcc = ledger.getAccount('acc_expense_food')!;

    ledger.setAccountBalance(cashAcc.id, toMicroUnits(4000));
    ledger.setAccountBalance(bankAcc.id, toMicroUnits(50000));

    // Spend ₹600 from Cash
    service.recordExpense({
      sourceAccountId: cashAcc.id,
      expenseAccountId: foodAcc.id,
      amountMicro: toMicroUnits(600),
      date: new Date().toISOString(),
      description: 'Chai & Snacks in Cash',
    });

    const cashAfter = ledger.getAccount(cashAcc.id)!;
    const bankAfter = ledger.getAccount(bankAcc.id)!;

    expect(fromMicroUnits(cashAfter.balance_micro)).toBe(3400); // 4000 - 600
    expect(fromMicroUnits(bankAfter.balance_micro)).toBe(50000); // Bank unaffected!
  });

  it('strictly isolates Bank expenses from Cash in Hand balance', () => {
    const cashAcc = ledger.getAccount('acc_cash_wallet')!;
    const bankAcc = ledger.getAccount('acc_bank_primary')!;
    const rentAcc = ledger.getAccount('acc_expense_rent')!;

    ledger.setAccountBalance(cashAcc.id, toMicroUnits(4000));
    ledger.setAccountBalance(bankAcc.id, toMicroUnits(50000));

    // Spend ₹15,000 from Bank (UPI / NetBanking)
    service.recordExpense({
      sourceAccountId: bankAcc.id,
      expenseAccountId: rentAcc.id,
      amountMicro: toMicroUnits(15000),
      date: new Date().toISOString(),
      description: 'Apartment Rent via UPI',
    });

    const cashAfter = ledger.getAccount(cashAcc.id)!;
    const bankAfter = ledger.getAccount(bankAcc.id)!;

    expect(fromMicroUnits(bankAfter.balance_micro)).toBe(35000); // 50000 - 15000
    expect(fromMicroUnits(cashAfter.balance_micro)).toBe(4000); // Cash unaffected!
  });

  it('moves money between Bank and Cash on ATM withdrawal without losing total liquid money', () => {
    const cashAcc = ledger.getAccount('acc_cash_wallet')!;
    const bankAcc = ledger.getAccount('acc_bank_primary')!;

    ledger.setAccountBalance(cashAcc.id, toMicroUnits(1000));
    ledger.setAccountBalance(bankAcc.id, toMicroUnits(20000));

    const totalBefore = ledger.getAccount(cashAcc.id)!.balance_micro + ledger.getAccount(bankAcc.id)!.balance_micro;

    // ATM withdrawal ₹5,000 from Bank to Cash
    service.recordTransfer({
      fromAccountId: bankAcc.id,
      toAccountId: cashAcc.id,
      amountMicro: toMicroUnits(5000),
      date: new Date().toISOString(),
      description: 'ATM Cash Withdrawal',
    });

    const cashAfter = ledger.getAccount(cashAcc.id)!;
    const bankAfter = ledger.getAccount(bankAcc.id)!;

    expect(fromMicroUnits(cashAfter.balance_micro)).toBe(6000); // 1000 + 5000
    expect(fromMicroUnits(bankAfter.balance_micro)).toBe(15000); // 20000 - 5000

    const totalAfter = cashAfter.balance_micro + bankAfter.balance_micro;
    expect(totalAfter).toBe(totalBefore); // Total liquid invariant preserved!
  });

  it('cleanly reverts balances when a transaction is edited or removed', () => {
    const bankAcc = ledger.getAccount('acc_bank_primary')!;
    const foodAcc = ledger.getAccount('acc_expense_food')!;

    ledger.setAccountBalance(bankAcc.id, toMicroUnits(10000));

    const txResult = service.recordExpense({
      sourceAccountId: bankAcc.id,
      expenseAccountId: foodAcc.id,
      amountMicro: toMicroUnits(1200),
      date: new Date().toISOString(),
      description: 'Dinner with colleagues',
    });

    expect(fromMicroUnits(ledger.getAccount(bankAcc.id)!.balance_micro)).toBe(8800);

    // Revert/delete the transaction
    const ok = ledger.removeTransactionAndRevertPostings(txResult.transaction.id);
    expect(ok).toBe(true);

    // Balance restored back to exactly ₹10,000
    expect(fromMicroUnits(ledger.getAccount(bankAcc.id)!.balance_micro)).toBe(10000);
    expect(ledger.getTransaction(txResult.transaction.id)).toBeUndefined();
  });

  it('guarantees pure scratch start with zero demo transactions and verifies +, -, = mathematical invariants', () => {
    // 1. Verify fresh scratch state: zero transactions and zero postings
    const freshLedger = new DoubleEntryLedger(STARTER_ACCOUNTS.map((a) => ({ ...a })));
    expect(freshLedger.getAllTransactions()).toHaveLength(0);
    expect(freshLedger.getAllPostings()).toHaveLength(0);

    // Initial accounts start at exactly 0
    freshLedger.getAllAccounts().forEach((a) => {
      expect(a.balance_micro).toBe(0n);
    });

    // 2. User sets their authentic starting balances from scratch
    const userStartingCash = 12500;
    const userStartingBank = 45000;
    const userStartingCC = 2500;

    const cashAcc = freshLedger.getAccount('acc_cash_wallet')!;
    const bankAcc = freshLedger.getAccount('acc_bank_primary')!;
    const ccAcc = freshLedger.getAccount('acc_credit_card')!;
    const equityAcc = freshLedger.getAccount('acc_equity_opening')!;

    freshLedger.setAccountBalance(cashAcc.id, toMicroUnits(userStartingCash));
    freshLedger.setAccountBalance(bankAcc.id, toMicroUnits(userStartingBank));
    freshLedger.setAccountBalance(ccAcc.id, toMicroUnits(userStartingCC));
    freshLedger.setAccountBalance(equityAcc.id, toMicroUnits(userStartingCash + userStartingBank - userStartingCC));

    // 3. Verify Equation: Liquid Money = Bank + Cash
    const bankVal = fromMicroUnits(freshLedger.getAccount(bankAcc.id)!.balance_micro);
    const cashVal = fromMicroUnits(freshLedger.getAccount(cashAcc.id)!.balance_micro);
    const liquidTotal = bankVal + cashVal;
    expect(liquidTotal).toBe(userStartingBank + userStartingCash); // 45000 + 12500 = 57500

    // 4. Verify Equation: Net Worth = Assets - Liabilities
    const totalAssets = freshLedger.getAllAccounts().filter((a) => a.account_type === 'ASSET').reduce((s, a) => s + a.balance_micro, 0n);
    const totalLiabilities = freshLedger.getAllAccounts().filter((a) => a.account_type === 'LIABILITY').reduce((s, a) => s + a.balance_micro, 0n);
    const netWorth = totalAssets - totalLiabilities;
    expect(totalAssets - totalLiabilities).toBe(netWorth);
    expect(fromMicroUnits(netWorth)).toBe(userStartingCash + userStartingBank - userStartingCC); // 57500 - 2500 = 55000

    // 5. Verify Fundamental Accounting Equation: LHS == RHS
    const equationAudit = freshLedger.verifyFundamentalAccountingEquation();
    expect(equationAudit.isBalanced).toBe(true);
    expect(equationAudit.difference).toBe(0n);

    // 6. Record income and expense and verify Net Savings = Income - Expenses
    const freshService = new TransactionService(freshLedger);
    const foodAcc = freshLedger.getAccount('acc_expense_food')!;
    const incomeAcc = freshLedger.getAccount('acc_income_primary')!;

    // Earn income of ₹30,000 into Bank
    freshService.recordIncome({
      destinationAccountId: bankAcc.id,
      incomeAccountId: incomeAcc.id,
      amountMicro: toMicroUnits(30000),
      date: new Date().toISOString(),
      description: 'Monthly Salary Payment',
    });

    // Spend ₹8,000 from Bank on Food
    freshService.recordExpense({
      sourceAccountId: bankAcc.id,
      expenseAccountId: foodAcc.id,
      amountMicro: toMicroUnits(8000),
      date: new Date().toISOString(),
      description: 'Food & Groceries Spend',
    });

    const incomeVal = fromMicroUnits(freshLedger.getAccount(incomeAcc.id)!.balance_micro);
    const expenseVal = fromMicroUnits(freshLedger.getAccount(foodAcc.id)!.balance_micro);
    const netSavings = incomeVal - expenseVal;

    expect(incomeVal).toBe(30000);
    expect(expenseVal).toBe(8000);
    expect(netSavings).toBe(22000); // 30000 - 8000 = 22000
    expect(freshLedger.verifyFundamentalAccountingEquation().isBalanced).toBe(true);
  });
});
