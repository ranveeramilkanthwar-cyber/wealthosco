// Enterprise Fintech Engine: Fresh Scratch Setup
// Zero demo transactions, zero demo postings, zero demo balances.
// Clean starter Chart of Accounts with ₹0 balances.

import { Account, Transaction, LedgerPosting } from './types';

export const STARTER_ACCOUNTS: Account[] = [
  {
    id: 'acc_bank_primary',
    name: 'Primary Bank Account',
    account_type: 'ASSET',
    account_subtype: 'BANK',
    currency: 'INR',
    balance_micro: 0n,
    is_archived: false,
    entity_id: 'PERSONAL',
  },
  {
    id: 'acc_cash_wallet',
    name: 'Cash Wallet',
    account_type: 'ASSET',
    account_subtype: 'CASH',
    currency: 'INR',
    balance_micro: 0n,
    is_archived: false,
    entity_id: 'PERSONAL',
  },
  {
    id: 'acc_credit_card',
    name: 'Credit Card',
    account_type: 'LIABILITY',
    account_subtype: 'CREDIT_CARD',
    currency: 'INR',
    balance_micro: 0n,
    credit_limit_micro: 0n,
    billing_cycle_day: 1,
    due_day_offset: 20,
    is_archived: false,
    entity_id: 'PERSONAL',
  },
  {
    id: 'acc_equity_opening',
    name: 'Opening Balance Equity',
    account_type: 'EQUITY',
    account_subtype: 'CASH',
    currency: 'INR',
    balance_micro: 0n,
    is_archived: false,
    entity_id: 'PERSONAL',
  },
  {
    id: 'acc_income_primary',
    name: 'Salary & Income',
    account_type: 'INCOME',
    account_subtype: 'BANK',
    currency: 'INR',
    balance_micro: 0n,
    is_archived: false,
    entity_id: 'PERSONAL',
  },
  {
    id: 'acc_expense_food',
    name: 'Food & Dining',
    account_type: 'EXPENSE',
    account_subtype: 'OPEX',
    currency: 'INR',
    balance_micro: 0n,
    is_archived: false,
    entity_id: 'PERSONAL',
  },
  {
    id: 'acc_expense_groceries',
    name: 'Groceries & Provisions',
    account_type: 'EXPENSE',
    account_subtype: 'OPEX',
    currency: 'INR',
    balance_micro: 0n,
    is_archived: false,
    entity_id: 'PERSONAL',
  },
  {
    id: 'acc_expense_rent',
    name: 'Rent & Living',
    account_type: 'EXPENSE',
    account_subtype: 'OPEX',
    currency: 'INR',
    balance_micro: 0n,
    is_archived: false,
    entity_id: 'PERSONAL',
  },
  {
    id: 'acc_expense_general',
    name: 'General & Miscellaneous',
    account_type: 'EXPENSE',
    account_subtype: 'OPEX',
    currency: 'INR',
    balance_micro: 0n,
    is_archived: false,
    entity_id: 'PERSONAL',
  },
];

// Clean Scratch State: Exactly 0 initial transactions and 0 postings
export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_POSTINGS: LedgerPosting[] = [];
