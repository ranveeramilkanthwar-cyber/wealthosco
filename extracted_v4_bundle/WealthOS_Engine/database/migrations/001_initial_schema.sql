-- WealthOS Database Migration 001: Initial Core Schema
-- Micro-unit standard: 1 currency unit = 10,000 micro-units (Paise / Cents x 100)

PRAGMA foreign_keys = ON;

-- 1. Chart of Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK(account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    account_subtype TEXT NOT NULL CHECK(account_subtype IN ('CASH', 'BANK', 'CREDIT_CARD', 'LOAN', 'INVESTMENT', 'FIXED_ASSET', 'RECEIVABLE', 'PAYABLE', 'OPEX', 'CAPEX_AMORT')),
    currency TEXT NOT NULL DEFAULT 'INR',
    balance_micro INTEGER NOT NULL DEFAULT 0,
    credit_limit_micro INTEGER NULL,
    billing_cycle_day INTEGER NULL,
    due_day_offset INTEGER NULL,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Journal Transactions Header
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    transaction_date TEXT NOT NULL,
    posted_date TEXT NOT NULL,
    description TEXT NOT NULL,
    raw_narration TEXT,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('EXPENSE', 'INCOME', 'TRANSFER', 'SPLIT', 'REFUND', 'CAPEX_DEPRECIATION', 'ADJUSTMENT')),
    status TEXT NOT NULL DEFAULT 'CLEARED' CHECK(status IN ('PENDING', 'CLEARED', 'RECONCILED', 'VOID')),
    merchant_id TEXT,
    project_or_event_id TEXT,
    is_tax_deductible INTEGER NOT NULL DEFAULT 0,
    tax_category_code TEXT,
    deduplication_hash TEXT UNIQUE NOT NULL,
    attachment_urls TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Double-Entry Balanced Journal Postings
CREATE TABLE IF NOT EXISTS ledger_postings (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    direction TEXT NOT NULL CHECK(direction IN ('DEBIT', 'CREDIT')),
    amount_micro INTEGER NOT NULL CHECK(amount_micro > 0),
    exchange_rate REAL NOT NULL DEFAULT 1.0,
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);

-- 4. Fixed Assets & CapEx Depreciation
CREATE TABLE IF NOT EXISTS fixed_assets (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    purchase_transaction_id TEXT NOT NULL,
    initial_cost_micro INTEGER NOT NULL,
    salvage_value_micro INTEGER NOT NULL DEFAULT 0,
    useful_life_months INTEGER NOT NULL,
    depreciation_method TEXT NOT NULL CHECK(depreciation_method IN ('STRAIGHT_LINE', 'WRITTEN_DOWN_VALUE')),
    depreciation_rate_percent REAL,
    warranty_expiry_date TEXT,
    is_disposed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(account_id) REFERENCES accounts(id),
    FOREIGN KEY(purchase_transaction_id) REFERENCES transactions(id)
);

-- 5. Budgets & Envelopes
CREATE TABLE IF NOT EXISTS budgets_and_envelopes (
    id TEXT PRIMARY KEY,
    category_account_id TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    budget_methodology TEXT NOT NULL CHECK(budget_methodology IN ('ZERO_BASED', 'PERCENTAGE_50_30_20', 'ROLLOVER_ENVELOPE', 'FIXED_CAP')),
    allocated_micro INTEGER NOT NULL,
    rollover_from_previous_micro INTEGER NOT NULL DEFAULT 0,
    alert_threshold_percent INTEGER NOT NULL DEFAULT 80,
    FOREIGN KEY(category_account_id) REFERENCES accounts(id)
);

-- 6. Recurring & Subscriptions
CREATE TABLE IF NOT EXISTS recurring_and_subscriptions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    expected_amount_micro INTEGER NOT NULL,
    last_billed_amount_micro INTEGER,
    price_hike_detection INTEGER NOT NULL DEFAULT 1,
    cancellation_reminder_date TEXT,
    auto_execute INTEGER NOT NULL DEFAULT 0
);

-- 7. Investment Lots (FIFO Tracker)
CREATE TABLE IF NOT EXISTS investment_lots (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    asset_symbol TEXT NOT NULL,
    purchase_date TEXT NOT NULL,
    units_micro INTEGER NOT NULL,
    cost_per_unit_micro INTEGER NOT NULL,
    remaining_units_micro INTEGER NOT NULL,
    is_tax_advantaged INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);

-- 8. Immutable Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'REVERSAL', 'VOID')),
    delta_payload TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for instant query performance
CREATE INDEX IF NOT EXISTS idx_postings_transaction ON ledger_postings(transaction_id);
CREATE INDEX IF NOT EXISTS idx_postings_account ON ledger_postings(account_id);
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_tx_hash ON transactions(deduplication_hash);
