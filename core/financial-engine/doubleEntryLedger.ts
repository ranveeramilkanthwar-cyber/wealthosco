// Enterprise Fintech Engine: Double-Entry Ledger Core
// Strict Balance Enforcement & Fundamental Accounting Equation Invariant Check

import {
  Account,
  AccountType,
  AuditLog,
  JournalEntryPayload,
  LedgerPosting,
  PostingDirection,
  Transaction,
  UnbalancedLedgerError,
  DuplicateTransactionError,
} from './types';

export class DoubleEntryLedger {
  private accounts = new Map<string, Account>();
  private transactions = new Map<string, Transaction>();
  private postings: LedgerPosting[] = [];
  private deduplicationHashes = new Set<string>();
  private auditLogs: AuditLog[] = [];

  constructor(initialAccounts?: Account[]) {
    if (initialAccounts) {
      for (const acc of initialAccounts) {
        this.accounts.set(acc.id, { ...acc });
      }
    }
  }

  // --- Account Management ---

  public createAccount(account: Account): Account {
    if (this.accounts.has(account.id)) {
      throw new Error(`Account with ID '${account.id}' already exists.`);
    }
    const acc = { ...account, balance_micro: account.balance_micro || 0n };
    this.accounts.set(acc.id, acc);
    return acc;
  }

  public getAccount(id: string): Account | undefined {
    const acc = this.accounts.get(id);
    return acc ? { ...acc } : undefined;
  }

  public getAllAccounts(): Account[] {
    return Array.from(this.accounts.values()).map((a) => ({ ...a }));
  }

  public getAccountsByType(type: AccountType): Account[] {
    return this.getAllAccounts().filter((a) => a.account_type === type);
  }

  public setAccountBalance(accountId: string, newBalanceMicro: bigint): boolean {
    const acc = this.accounts.get(accountId);
    if (!acc) return false;
    acc.balance_micro = newBalanceMicro;
    return true;
  }

  // --- Double-Entry Transaction Commit with ACID Rollback Guarantee ---

  public createJournalEntry(payload: JournalEntryPayload): {
    transaction: Transaction;
    postings: LedgerPosting[];
  } {
    const txId = payload.transaction.id || crypto.randomUUID();
    const dedupHash =
      payload.transaction.deduplication_hash ||
      `tx_${txId}_${payload.transaction.transaction_date}`;

    // 1. Deduplication check
    if (this.deduplicationHashes.has(dedupHash)) {
      throw new DuplicateTransactionError(dedupHash);
    }

    // 2. Validate balanced postings (Debit sum === Credit sum)
    let totalDebits = 0n;
    let totalCredits = 0n;

    for (const p of payload.postings) {
      if (p.amount_micro <= 0n) {
        throw new Error(
          `Posting amount must be strictly positive micro-units (> 0). Got: ${p.amount_micro}`
        );
      }
      if (!this.accounts.has(p.account_id)) {
        throw new Error(`Account ID '${p.account_id}' does not exist in chart of accounts.`);
      }

      if (p.direction === 'DEBIT') {
        totalDebits += p.amount_micro;
      } else if (p.direction === 'CREDIT') {
        totalCredits += p.amount_micro;
      } else {
        throw new Error(`Invalid posting direction: ${p.direction}`);
      }
    }

    if (totalDebits !== totalCredits) {
      // Immediate Rollback: No state mutated
      throw new UnbalancedLedgerError(totalDebits, totalCredits);
    }

    // 3. Atomically update Account Balances
    // Assets & Expenses: normal balance = DEBIT (+ on Debit, - on Credit)
    // Liabilities, Equity & Income: normal balance = CREDIT (+ on Credit, - on Debit)
    const backupBalances = new Map<string, bigint>();

    try {
      for (const p of payload.postings) {
        const acc = this.accounts.get(p.account_id)!;
        if (!backupBalances.has(acc.id)) {
          backupBalances.set(acc.id, acc.balance_micro);
        }

        const isDebitNormal =
          acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE';

        if (isDebitNormal) {
          if (p.direction === 'DEBIT') {
            acc.balance_micro += p.amount_micro;
          } else {
            acc.balance_micro -= p.amount_micro;
          }
        } else {
          // Normal CREDIT (Liability, Equity, Income)
          if (p.direction === 'CREDIT') {
            acc.balance_micro += p.amount_micro;
          } else {
            acc.balance_micro -= p.amount_micro;
          }
        }
      }
    } catch (err) {
      // Rollback balances if any unexpected exception occurred
      for (const [accId, originalBal] of backupBalances.entries()) {
        const acc = this.accounts.get(accId);
        if (acc) acc.balance_micro = originalBal;
      }
      throw err;
    }

    // 4. Commit Transaction & Postings
    const transaction: Transaction = {
      id: txId,
      transaction_date: payload.transaction.transaction_date,
      posted_date: payload.transaction.posted_date || payload.transaction.transaction_date,
      description: payload.transaction.description,
      raw_narration: payload.transaction.raw_narration || null,
      transaction_type: payload.transaction.transaction_type,
      status: payload.transaction.status || 'CLEARED',
      merchant_id: payload.transaction.merchant_id || null,
      project_or_event_id: payload.transaction.project_or_event_id || null,
      is_tax_deductible: !!payload.transaction.is_tax_deductible,
      tax_category_code: payload.transaction.tax_category_code || null,
      deduplication_hash: dedupHash,
      attachment_urls: payload.transaction.attachment_urls || [],
      entity_id: payload.transaction.entity_id || 'PERSONAL',
    };

    const committedPostings: LedgerPosting[] = payload.postings.map((p) => ({
      id: p.id || crypto.randomUUID(),
      transaction_id: txId,
      account_id: p.account_id,
      direction: p.direction,
      amount_micro: p.amount_micro,
      exchange_rate: p.exchange_rate ?? 1.0,
      memo: p.memo,
    }));

    this.transactions.set(txId, transaction);
    this.postings.push(...committedPostings);
    this.deduplicationHashes.add(dedupHash);

    // Audit log
    this.auditLogs.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: 'CREATE',
      transaction_id: txId,
      current_state_hash: dedupHash,
      actor: 'SYSTEM',
    });

    return { transaction, postings: committedPostings };
  }

  // --- Invariant Validation: The Fundamental Accounting Equation ---
  // Assets = Liabilities + Equity + (Income - Expenses)
  public verifyFundamentalAccountingEquation(): {
    isBalanced: boolean;
    assets: bigint;
    liabilities: bigint;
    equity: bigint;
    income: bigint;
    expenses: bigint;
    equationLHS: bigint;
    equationRHS: bigint;
    difference: bigint;
  } {
    let assets = 0n;
    let liabilities = 0n;
    let equity = 0n;
    let income = 0n;
    let expenses = 0n;

    for (const acc of this.accounts.values()) {
      switch (acc.account_type) {
        case 'ASSET':
          assets += acc.balance_micro;
          break;
        case 'LIABILITY':
          liabilities += acc.balance_micro;
          break;
        case 'EQUITY':
          equity += acc.balance_micro;
          break;
        case 'INCOME':
          income += acc.balance_micro;
          break;
        case 'EXPENSE':
          expenses += acc.balance_micro;
          break;
      }
    }

    const equationLHS = assets;
    const equationRHS = liabilities + equity + (income - expenses);
    const difference = equationLHS - equationRHS;

    return {
      isBalanced: difference === 0n,
      assets,
      liabilities,
      equity,
      income,
      expenses,
      equationLHS,
      equationRHS,
      difference,
    };
  }

  // --- Queries ---

  public getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id);
  }

  public getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }

  public getPostingsForTransaction(txId: string): LedgerPosting[] {
    return this.postings.filter((p) => p.transaction_id === txId);
  }

  public getAllPostings(): LedgerPosting[] {
    return [...this.postings];
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  public removeTransactionAndRevertPostings(txId: string): boolean {
    const tx = this.transactions.get(txId);
    if (!tx) return false;

    // Get all postings for this transaction
    const txPostings = this.postings.filter((p) => p.transaction_id === txId);

    // Revert account balances
    for (const p of txPostings) {
      const acc = this.accounts.get(p.account_id);
      if (!acc) continue;
      const isDebitNormal = acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE';
      if (isDebitNormal) {
        if (p.direction === 'DEBIT') {
          acc.balance_micro -= p.amount_micro;
        } else {
          acc.balance_micro += p.amount_micro;
        }
      } else {
        if (p.direction === 'CREDIT') {
          acc.balance_micro -= p.amount_micro;
        } else {
          acc.balance_micro += p.amount_micro;
        }
      }
    }

    // Remove from collections
    this.transactions.delete(txId);
    this.postings = this.postings.filter((p) => p.transaction_id !== txId);
    if (tx.deduplication_hash) {
      this.deduplicationHashes.delete(tx.deduplication_hash);
    }
    return true;
  }

  public clear(): void {
    this.accounts.clear();
    this.transactions.clear();
    this.postings = [];
    this.deduplicationHashes.clear();
    this.auditLogs = [];
  }
}
