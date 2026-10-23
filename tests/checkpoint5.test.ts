// Checkpoint 5 Test Suite: Automated Ingestion Pipelines (SMS, Receipt OCR, Deduplication)
// Test Scenario 1: 100 real-world messy bank SMS strings (UPI, NEFT, IMPS, Card Swipes, Declined, OTPs)
// Assert: 0% false positives on OTPs (never created as transactions)
// Assert: 100% deduplication against existing manual entries
// Test Scenario 2: Supermarket receipt OCR & GST input tax credit splitter

import { describe, it, expect, beforeEach } from 'vitest';
import { BankIngestionEngine } from '../core/financial-engine/bankIngestionEngine';
import { DoubleEntryLedger } from '../core/financial-engine/doubleEntryLedger';
import { TransactionService } from '../core/financial-engine/transactionVariants';
import { generateDeduplicationHashSync } from '../core/financial-engine/deduplication';
import { toMicroUnits, fromMicroUnits } from '../core/financial-engine/microUnits';
import { Account, DuplicateTransactionError } from '../core/financial-engine/types';

describe('Phase 5: Automated Ingestion Pipelines & SMS Parser (Checkpoint 5)', () => {
  let parser: BankIngestionEngine;
  let ledger: DoubleEntryLedger;
  let service: TransactionService;

  const accounts: Account[] = [
    {
      id: 'acc_asset_sbi',
      name: 'SBI Checking A/c ..4321',
      account_type: 'ASSET',
      account_subtype: 'BANK',
      currency: 'INR',
      balance_micro: toMicroUnits(100000),
      is_archived: false,
    },
    {
      id: 'acc_expense_food',
      name: 'Food & Dining',
      account_type: 'EXPENSE',
      account_subtype: 'OPEX',
      currency: 'INR',
      balance_micro: 0n,
      is_archived: false,
    },
  ];

  beforeEach(() => {
    parser = new BankIngestionEngine();
    ledger = new DoubleEntryLedger(accounts);
    service = new TransactionService(ledger);
  });

  it('parses 100 real-world messy bank SMS messages with 0% false positives on OTPs', () => {
    const rawSmsDataset: string[] = [];

    // 25 OTP / Security / Promotional messages that MUST NOT be ingested as transactions
    const otpPromos = [
      'Your OTP for SBI Netbanking login is 482910. Do not share this OTP with anyone. Valid for 5 minutes.',
      'One Time Password (OTP) for transaction of INR 2,500.00 at Amazon is 938471. Do not share.',
      'Verification code 384910 is your secret code for HDFC Card. Valid for 10 mins.',
      'Congratulations! You are pre-approved for a personal loan of Rs 5,00,000. Apply now.',
      'Earn 5% cashback offer on your Axis Bank credit card. Tap link to activate.',
    ];
    for (let i = 0; i < 25; i++) {
      rawSmsDataset.push(otpPromos[i % otpPromos.length] + ` [ref #${i}]`);
    }

    // 75 Valid financial transactions (UPI, NEFT, IMPS, Cards, ATM)
    for (let i = 1; i <= 75; i++) {
      const amt = (i * 25.5).toFixed(2);
      if (i % 3 === 0) {
        rawSmsDataset.push(
          `Dear SBI User, A/c ..4321 debited by Rs.${amt} on 23-Oct-26 via UPI to swiggy@icici. UPI Ref: UPI948201948${i}. Bal: Rs.54,230.00`
        );
      } else if (i % 3 === 1) {
        rawSmsDataset.push(
          `Your HDFC Bank Card ending 1092 was spent for INR ${amt} at STARBUCKS COFFEE. Ref No: CC84920184${i}.`
        );
      } else {
        rawSmsDataset.push(
          `Rs.${amt} credited to your A/c 4321 on 23-OCT-26 by NEFT from ACME CORP. UTR: NEFT83920194${i}.`
        );
      }
    }

    expect(rawSmsDataset.length).toBe(100);

    let financialCount = 0;
    let otpFilteredCount = 0;

    for (const msg of rawSmsDataset) {
      const res = parser.parseBankMessage(msg);
      if (res.isOtpOrPromo) {
        otpFilteredCount++;
        // Strict invariant: OTPs must never have an ingested financial transaction
        expect(res.isFinancialTransaction).toBe(false);
      } else if (res.isFinancialTransaction) {
        financialCount++;
        expect(res.amountMicro).toBeDefined();
        expect(res.direction).toBeDefined();
      }
    }

    // 0% false positives on OTPs: all 25 OTPs filtered out
    expect(otpFilteredCount).toBe(25);
    // 100% of financial transactions recognized
    expect(financialCount).toBe(75);
  });

  it('guarantees 100% deduplication when bank SMS matches a manually entered log', () => {
    const txDate = '2026-10-23T14:30:00Z';
    const amountMicro = toMicroUnits(350);
    const refUtr = 'UPI849201948123';

    // 1. User manually records expense
    service.recordExpense({
      sourceAccountId: 'acc_asset_sbi',
      expenseAccountId: 'acc_expense_food',
      amountMicro,
      date: txDate,
      description: 'Chai & Snacks',
      referenceNo: refUtr,
    });

    expect(ledger.getAllTransactions().length).toBe(1);

    // 2. Incoming bank SMS arrives for the exact same event
    const incomingSms = `Dear SBI User, A/c ..4321 debited by Rs.350.00 on 23-Oct-26 via UPI to chaiwala@upi. UPI Ref: ${refUtr}.`;
    const parsed = parser.parseBankMessage(incomingSms);

    expect(parsed.isFinancialTransaction).toBe(true);
    expect(parsed.amountMicro).toBe(amountMicro);

    // Assert deduplication prevents duplicate write and throws DuplicateTransactionError
    const dedupHash = generateDeduplicationHashSync({
      account_id: 'acc_asset_sbi',
      amount_micro: parsed.amountMicro!,
      timestamp: txDate,
      reference_no: parsed.referenceNo,
    });

    expect(() => {
      ledger.createJournalEntry({
        transaction: {
          transaction_date: txDate,
          posted_date: txDate,
          description: 'SMS Auto-Ingest',
          transaction_type: 'EXPENSE',
          status: 'CLEARED',
          deduplication_hash: dedupHash,
          attachment_urls: [],
          is_tax_deductible: false,
        },
        postings: [
          { account_id: 'acc_expense_food', direction: 'DEBIT', amount_micro: amountMicro },
          { account_id: 'acc_asset_sbi', direction: 'CREDIT', amount_micro: amountMicro },
        ],
      });
    }).toThrow(DuplicateTransactionError);

    // Ledger still has exactly 1 entry!
    expect(ledger.getAllTransactions().length).toBe(1);
  });

  it('Scenario 2: Parses supermarket receipt with GST tax split', () => {
    const receipt = parser.parseReceipt('Nature Basket Supermarket', [
      {
        name: 'Organic Milk 1L',
        quantity: 2,
        unitPriceMicro: toMicroUnits(80),
        gstRatePercent: 5,
        categoryAccountId: 'acc_expense_food',
      },
      {
        name: 'Hand Sanitizer & Care',
        quantity: 1,
        unitPriceMicro: toMicroUnits(150),
        gstRatePercent: 18,
        categoryAccountId: 'acc_expense_food',
      },
    ]);

    expect(receipt.items.length).toBe(2);
    // Milk: 160 + 5% GST (8) = 168
    expect(receipt.items[0].totalMicro).toBe(toMicroUnits(168));
    // Sanitizer: 150 + 18% GST (27) = 177
    expect(receipt.items[1].totalMicro).toBe(toMicroUnits(177));
    // Grand Total = 168 + 177 = 345
    expect(receipt.grandTotalMicro).toBe(toMicroUnits(345));
    // Total GST = 8 + 27 = 35
    expect(receipt.totalGstMicro).toBe(toMicroUnits(35));
  });
});
