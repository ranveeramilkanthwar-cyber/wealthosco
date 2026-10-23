// Enterprise Fintech Engine: High-Level Transaction Domain Service Layer
// Orchestrates self-balancing journal entries, splits, CapEx, Forex, reversals & refunds.

import { DoubleEntryLedger } from './doubleEntryLedger';
import { CapExEngine, FixedAsset } from './capexEngine';
import { ForexEngine } from './forexEngine';
import { generateDeduplicationHashSync } from './deduplication';
import { Transaction, LedgerPosting, Account } from './types';
import { toMicroUnits } from './microUnits';

export interface RecordExpenseParams {
  sourceAccountId: string; // Cash, Bank, or Credit Card
  expenseAccountId: string; // Expense Category
  amountMicro: bigint;
  date: string;
  description: string;
  rawNarration?: string;
  merchantId?: string;
  isTaxDeductible?: boolean;
  taxCategoryCode?: string;
  referenceNo?: string;
  entityId?: string;
  attachmentUrls?: string[];
}

export interface RecordIncomeParams {
  destinationAccountId: string; // Bank or Cash
  incomeAccountId: string; // Salary, Dividends, Freelance
  amountMicro: bigint;
  date: string;
  description: string;
  rawNarration?: string;
  referenceNo?: string;
  entityId?: string;
  attachmentUrls?: string[];
}

export interface RecordTransferParams {
  fromAccountId: string;
  toAccountId: string;
  amountMicro: bigint;
  date: string;
  description: string;
  referenceNo?: string;
  entityId?: string;
}

export interface SplitLeg {
  accountId: string;
  amountMicro: bigint;
  direction?: 'DEBIT' | 'CREDIT'; // Defaults to DEBIT for expense splits
  memo?: string;
}

export interface RecordSplitParams {
  sourceAccountId: string; // Funding account (Credit)
  splitLegs: SplitLeg[]; // Destination accounts (Debits)
  date: string;
  description: string;
  rawNarration?: string;
  referenceNo?: string;
  entityId?: string;
}

export interface RecordCapExParams {
  fundingAccountId: string;
  fixedAssetAccountId: string;
  amountMicro: bigint;
  assetName: string;
  date: string;
  usefulLifeMonths: number;
  salvageValueMicro?: bigint;
  warrantyExpiryDate?: string | null;
  depreciationMethod?: 'STRAIGHT_LINE' | 'WRITTEN_DOWN_VALUE';
  depreciationRatePercent?: number;
  referenceNo?: string;
  entityId?: string;
}

export class TransactionService {
  constructor(
    public ledger: DoubleEntryLedger,
    public forexEngine: ForexEngine = new ForexEngine(),
    public capexEngine: CapExEngine = new CapExEngine()
  ) {}

  /**
   * 1. Record an Operating Expense (OpEx)
   * Debit: Expense Account (+ Expense)
   * Credit: Source Account (- Asset or + Liability for Credit Card)
   */
  public recordExpense(params: RecordExpenseParams): {
    transaction: Transaction;
    postings: LedgerPosting[];
  } {
    const dedupHash = generateDeduplicationHashSync({
      account_id: params.sourceAccountId,
      amount_micro: params.amountMicro,
      timestamp: params.date,
      reference_no: params.referenceNo,
    });

    return this.ledger.createJournalEntry({
      transaction: {
        transaction_date: params.date,
        posted_date: params.date,
        description: params.description,
        raw_narration: params.rawNarration || null,
        transaction_type: 'EXPENSE',
        status: 'CLEARED',
        merchant_id: params.merchantId || null,
        is_tax_deductible: !!params.isTaxDeductible,
        tax_category_code: params.taxCategoryCode || null,
        deduplication_hash: dedupHash,
        attachment_urls: params.attachmentUrls || [],
        entity_id: params.entityId || 'PERSONAL',
      },
      postings: [
        {
          account_id: params.expenseAccountId,
          direction: 'DEBIT',
          amount_micro: params.amountMicro,
          memo: params.description,
        },
        {
          account_id: params.sourceAccountId,
          direction: 'CREDIT',
          amount_micro: params.amountMicro,
          memo: `Payment via ${params.sourceAccountId}`,
        },
      ],
    });
  }

  /**
   * 2. Record Income
   * Debit: Destination Bank / Cash (+ Asset)
   * Credit: Income Account (+ Income)
   */
  public recordIncome(params: RecordIncomeParams): {
    transaction: Transaction;
    postings: LedgerPosting[];
  } {
    const dedupHash = generateDeduplicationHashSync({
      account_id: params.destinationAccountId,
      amount_micro: params.amountMicro,
      timestamp: params.date,
      reference_no: params.referenceNo,
    });

    return this.ledger.createJournalEntry({
      transaction: {
        transaction_date: params.date,
        posted_date: params.date,
        description: params.description,
        raw_narration: params.rawNarration || null,
        transaction_type: 'INCOME',
        status: 'CLEARED',
        is_tax_deductible: false,
        deduplication_hash: dedupHash,
        attachment_urls: params.attachmentUrls || [],
        entity_id: params.entityId || 'PERSONAL',
      },
      postings: [
        {
          account_id: params.destinationAccountId,
          direction: 'DEBIT',
          amount_micro: params.amountMicro,
          memo: params.description,
        },
        {
          account_id: params.incomeAccountId,
          direction: 'CREDIT',
          amount_micro: params.amountMicro,
          memo: `Income credited to ${params.destinationAccountId}`,
        },
      ],
    });
  }

  /**
   * 3. Inter-Account Transfer (Includes Credit Card Bill Payments)
   * Prevents double counting: Paying credit card bill is Debit Liability (reducing card debt),
   * Credit Bank (reducing cash). Never an OpEx!
   */
  public recordTransfer(params: RecordTransferParams): {
    transaction: Transaction;
    postings: LedgerPosting[];
  } {
    const dedupHash = generateDeduplicationHashSync({
      account_id: params.fromAccountId,
      amount_micro: params.amountMicro,
      timestamp: params.date,
      reference_no: params.referenceNo,
    });

    return this.ledger.createJournalEntry({
      transaction: {
        transaction_date: params.date,
        posted_date: params.date,
        description: params.description,
        transaction_type: 'TRANSFER',
        status: 'CLEARED',
        is_tax_deductible: false,
        deduplication_hash: dedupHash,
        attachment_urls: [],
        entity_id: params.entityId || 'PERSONAL',
      },
      postings: [
        {
          account_id: params.toAccountId,
          direction: 'DEBIT', // Increases destination Asset OR decreases destination Liability (CC)
          amount_micro: params.amountMicro,
          memo: `Transfer to ${params.toAccountId}`,
        },
        {
          account_id: params.fromAccountId,
          direction: 'CREDIT', // Decreases source Asset
          amount_micro: params.amountMicro,
          memo: `Transfer from ${params.fromAccountId}`,
        },
      ],
    });
  }

  /**
   * 4. Multi-Legged Split Transaction
   * Supports complex splits (e.g. Grocery + Pharmacy, or Dining bill split with friends as Receivables)
   */
  public recordSplit(params: RecordSplitParams): {
    transaction: Transaction;
    postings: LedgerPosting[];
  } {
    let totalSplitDebits = 0n;
    const debitPostings = params.splitLegs.map((leg) => {
      totalSplitDebits += leg.amountMicro;
      return {
        account_id: leg.accountId,
        direction: (leg.direction || 'DEBIT') as 'DEBIT',
        amount_micro: leg.amountMicro,
        memo: leg.memo || params.description,
      };
    });

    const dedupHash = generateDeduplicationHashSync({
      account_id: params.sourceAccountId,
      amount_micro: totalSplitDebits,
      timestamp: params.date,
      reference_no: params.referenceNo,
    });

    const creditPosting = {
      account_id: params.sourceAccountId,
      direction: 'CREDIT' as const,
      amount_micro: totalSplitDebits,
      memo: `Funded via ${params.sourceAccountId}`,
    };

    return this.ledger.createJournalEntry({
      transaction: {
        transaction_date: params.date,
        posted_date: params.date,
        description: params.description,
        raw_narration: params.rawNarration || null,
        transaction_type: 'SPLIT',
        status: 'CLEARED',
        is_tax_deductible: false,
        deduplication_hash: dedupHash,
        attachment_urls: [],
        entity_id: params.entityId || 'PERSONAL',
      },
      postings: [...debitPostings, creditPosting],
    });
  }

  /**
   * 5. CapEx Capitalization & Asset Registry
   * High-value purchase (>₹20,000) capitalized as Fixed Asset on balance sheet.
   * Schedules automated non-cash monthly depreciation.
   */
  public recordCapEx(params: RecordCapExParams): {
    transaction: Transaction;
    postings: LedgerPosting[];
    asset: FixedAsset;
  } {
    const dedupHash = generateDeduplicationHashSync({
      account_id: params.fundingAccountId,
      amount_micro: params.amountMicro,
      timestamp: params.date,
      reference_no: params.referenceNo,
    });

    const result = this.ledger.createJournalEntry({
      transaction: {
        transaction_date: params.date,
        posted_date: params.date,
        description: `CapEx: ${params.assetName}`,
        transaction_type: 'EXPENSE', // Capital expenditure
        status: 'CLEARED',
        is_tax_deductible: false,
        deduplication_hash: dedupHash,
        attachment_urls: [],
        entity_id: params.entityId || 'PERSONAL',
      },
      postings: [
        {
          account_id: params.fixedAssetAccountId,
          direction: 'DEBIT', // Increases Fixed Asset on Balance Sheet
          amount_micro: params.amountMicro,
          memo: `Capitalized: ${params.assetName}`,
        },
        {
          account_id: params.fundingAccountId,
          direction: 'CREDIT', // Decreases cash or increases CC liability
          amount_micro: params.amountMicro,
          memo: `Funded CapEx purchase`,
        },
      ],
    });

    const asset = this.capexEngine.registerAsset({
      name: params.assetName,
      account_id: params.fixedAssetAccountId,
      purchase_transaction_id: result.transaction.id,
      purchase_date: params.date,
      initial_cost_micro: params.amountMicro,
      salvage_value_micro: params.salvageValueMicro,
      useful_life_months: params.usefulLifeMonths,
      depreciation_method: params.depreciationMethod,
      depreciation_rate_percent: params.depreciationRatePercent,
      warranty_expiry_date: params.warrantyExpiryDate,
    });

    return { ...result, asset };
  }

  /**
   * 6. Multi-Currency Foreign Transaction
   * Automatically balances against Equity:Currency_Translation_Reserve if spot rate fluctuates.
   */
  public recordForeignExpense(params: {
    sourceAccountId: string;
    expenseAccountId: string;
    foreignCurrency: string;
    foreignAmountMicro: bigint;
    spotRate: number; // e.g. 83.50 for USD/INR
    date: string;
    description: string;
    referenceNo?: string;
  }): {
    transaction: Transaction;
    postings: LedgerPosting[];
    baseAmountMicro: bigint;
  } {
    const { baseAmountMicro } = this.forexEngine.convertToBaseMicro(
      params.foreignAmountMicro,
      params.foreignCurrency,
      'INR',
      params.spotRate
    );

    const dedupHash = generateDeduplicationHashSync({
      account_id: params.sourceAccountId,
      amount_micro: baseAmountMicro,
      timestamp: params.date,
      reference_no: params.referenceNo,
    });

    const result = this.ledger.createJournalEntry({
      transaction: {
        transaction_date: params.date,
        posted_date: params.date,
        description: `${params.description} (${params.foreignCurrency} ${params.foreignAmountMicro / 10000n} @ ${params.spotRate})`,
        transaction_type: 'EXPENSE',
        status: 'CLEARED',
        is_tax_deductible: false,
        deduplication_hash: dedupHash,
        attachment_urls: [],
      },
      postings: [
        {
          account_id: params.expenseAccountId,
          direction: 'DEBIT',
          amount_micro: baseAmountMicro,
          exchange_rate: params.spotRate,
          memo: `${params.foreignCurrency} purchase converted to base currency`,
        },
        {
          account_id: params.sourceAccountId,
          direction: 'CREDIT',
          amount_micro: baseAmountMicro,
          exchange_rate: params.spotRate,
          memo: `Payment settled at spot rate ${params.spotRate}`,
        },
      ],
    });

    return { ...result, baseAmountMicro };
  }

  /**
   * 7. Compensating Reversal Entry (Immutable Audit Trail)
   * Inverses original postings with cryptographic link.
   */
  public createCompensatingReversal(
    originalTxId: string,
    reason = 'User correction'
  ): {
    reversalTransaction: Transaction;
    postings: LedgerPosting[];
  } {
    const originalTx = this.ledger.getTransaction(originalTxId);
    if (!originalTx) throw new Error(`Original transaction '${originalTxId}' not found.`);

    const originalPostings = this.ledger.getPostingsForTransaction(originalTxId);
    if (originalPostings.length === 0) {
      throw new Error(`No postings found for transaction '${originalTxId}'.`);
    }

    // Invert directions: DEBIT -> CREDIT, CREDIT -> DEBIT
    const reversedPostings = originalPostings.map((p) => ({
      account_id: p.account_id,
      direction: (p.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT') as 'DEBIT' | 'CREDIT',
      amount_micro: p.amount_micro,
      memo: `Compensating reversal of [${originalTxId}]: ${reason}`,
    }));

    const reversalHash = `reversal_${originalTx.deduplication_hash}_${Date.now()}`;

    const res = this.ledger.createJournalEntry({
      transaction: {
        transaction_date: new Date().toISOString(),
        posted_date: new Date().toISOString(),
        description: `REVERSAL: ${originalTx.description} (${reason})`,
        transaction_type: 'ADJUSTMENT',
        status: 'RECONCILED',
        is_tax_deductible: false,
        deduplication_hash: reversalHash,
        attachment_urls: [],
      },
      postings: reversedPostings,
    });

    return {
      reversalTransaction: res.transaction,
      postings: res.postings,
    };
  }
}
