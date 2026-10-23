// Enterprise Fintech Engine & Personal Wealth OS (WealthOS)
// Core Domain Types & Data Contracts

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export type AccountSubtype =
  | 'CASH'
  | 'BANK'
  | 'CREDIT_CARD'
  | 'LOAN'
  | 'INVESTMENT'
  | 'FIXED_ASSET'
  | 'RECEIVABLE'
  | 'PAYABLE'
  | 'OPEX'
  | 'CAPEX_AMORT';

export type TransactionType =
  | 'EXPENSE'
  | 'INCOME'
  | 'TRANSFER'
  | 'SPLIT'
  | 'REFUND'
  | 'CAPEX_DEPRECIATION'
  | 'ADJUSTMENT';

export type TransactionStatus = 'PENDING' | 'CLEARED' | 'RECONCILED' | 'VOID';

export type PostingDirection = 'DEBIT' | 'CREDIT';

export interface Account {
  id: string;
  name: string;
  account_type: AccountType;
  account_subtype: AccountSubtype;
  currency: string; // ISO 4217, default 'INR'
  balance_micro: bigint; // 1 unit = 10,000 micro-units
  credit_limit_micro?: bigint | null;
  billing_cycle_day?: number | null; // 1-31
  due_day_offset?: number | null;
  is_archived: boolean;
  entity_id?: string; // 'PERSONAL' | 'BUSINESS_FREELANCE' | 'FAMILY_JOINT'
}

export interface LedgerPosting {
  id: string;
  transaction_id: string;
  account_id: string;
  direction: PostingDirection;
  amount_micro: bigint; // Must be strictly > 0
  exchange_rate?: number; // Spot FX rate (default 1.0)
  memo?: string;
}

export interface Transaction {
  id: string;
  transaction_date: string; // ISO-8601
  posted_date: string; // ISO-8601
  description: string;
  raw_narration?: string | null;
  transaction_type: TransactionType;
  status: TransactionStatus;
  merchant_id?: string | null;
  project_or_event_id?: string | null;
  is_tax_deductible: boolean;
  tax_category_code?: string | null; // '80C', '80D', 'HRA', 'GST_INPUT'
  deduplication_hash: string;
  attachment_urls: string[];
  entity_id?: string; // 'PERSONAL' | 'BUSINESS_FREELANCE' | 'FAMILY_JOINT'
}

export interface JournalEntryPayload {
  transaction: Omit<Transaction, 'id' | 'deduplication_hash'> & {
    id?: string;
    deduplication_hash?: string;
  };
  postings: Array<Omit<LedgerPosting, 'id' | 'transaction_id'> & {
    id?: string;
  }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'VOID' | 'REVERSE';
  transaction_id: string;
  previous_state_hash?: string;
  current_state_hash: string;
  actor: string;
  reason?: string;
}

export class UnbalancedLedgerError extends Error {
  constructor(
    public totalDebits: bigint,
    public totalCredits: bigint,
    message?: string
  ) {
    super(
      message ||
        `Unbalanced ledger entry! Debits: ${totalDebits.toString()}, Credits: ${totalCredits.toString()}. Debits must equal Credits.`
    );
    this.name = 'UnbalancedLedgerError';
  }
}

export class DuplicateTransactionError extends Error {
  constructor(public hash: string) {
    super(`Transaction with deduplication hash ${hash} already exists in ledger.`);
    this.name = 'DuplicateTransactionError';
  }
}
