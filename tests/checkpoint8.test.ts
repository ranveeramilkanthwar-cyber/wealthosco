// Checkpoint 8 Test Suite: Security Hardening, Zero-Knowledge AES-256 Vault & Release Polish
// Scenario 1: Zero-Knowledge AES-256 encryption and tamper detection
// Scenario 2: Verify unreadability without passphrase
// Scenario 3: Export to Beancount, GnuCash XML, and Excel CSV formats without data loss

import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityAndExportEngine } from '../core/financial-engine/securityAndExportEngine';
import { Account, Transaction, LedgerPosting } from '../core/financial-engine/types';
import { toMicroUnits } from '../core/financial-engine/microUnits';

describe('Phase 8: Security Hardening & Zero-Knowledge Vault (Checkpoint 8)', () => {
  let security: SecurityAndExportEngine;

  beforeEach(() => {
    security = new SecurityAndExportEngine();
  });

  it('Scenario 1 & 2: Encrypts ledger into AES-256 vault, prevents unauthorized reads, and decrypts with key', async () => {
    const sensitiveLedgerSnapshot = JSON.stringify({
      userPan: 'ABCDE1234F',
      netWorthMicro: '5000000000',
      accounts: [
        { name: 'Swiss Vault Depository', balance: '1000000' },
        { name: 'SBI Secret Checking', balance: '250000' },
      ],
    });

    const masterPassphrase = 'SuperSecretInstitutionalPassphrase!2026';

    // Encrypt vault
    const vault = await security.encryptVault(sensitiveLedgerSnapshot, masterPassphrase);
    expect(vault.ciphertextHex).toBeDefined();
    expect(vault.ciphertextHex.length).toBeGreaterThan(64);

    // Assert: Ciphertext does not contain plaintext data
    expect(vault.ciphertextHex).not.toContain('ABCDE1234F');
    expect(vault.ciphertextHex).not.toContain('Swiss Vault');

    // Assert: Decrypting with wrong passphrase fails and throws error
    await expect(
      security.decryptVault(vault, 'WrongPassword123')
    ).rejects.toThrow();

    // Assert: Decrypting with correct passphrase recovers exact plaintext
    const decrypted = await security.decryptVault(vault, masterPassphrase);
    expect(decrypted).toBe(sensitiveLedgerSnapshot);
  });

  it('Scenario 3: Exports ledger to Beancount, GnuCash XML, and CSV formats cleanly', () => {
    const accounts: Account[] = [
      {
        id: 'acc_bank',
        name: 'HDFC Checking',
        account_type: 'ASSET',
        account_subtype: 'BANK',
        currency: 'INR',
        balance_micro: toMicroUnits(50000),
        is_archived: false,
      },
      {
        id: 'acc_dining',
        name: 'Dining Out',
        account_type: 'EXPENSE',
        account_subtype: 'OPEX',
        currency: 'INR',
        balance_micro: toMicroUnits(1500),
        is_archived: false,
      },
    ];

    const transactions: Transaction[] = [
      {
        id: 'tx_1',
        transaction_date: '2026-10-20T12:00:00Z',
        posted_date: '2026-10-20T12:00:00Z',
        description: 'Team Lunch at Dishoom',
        transaction_type: 'EXPENSE',
        status: 'CLEARED',
        deduplication_hash: 'hash_tx_1',
        attachment_urls: [],
        is_tax_deductible: false,
      },
    ];

    const postings: LedgerPosting[] = [
      {
        id: 'p_1',
        transaction_id: 'tx_1',
        account_id: 'acc_dining',
        direction: 'DEBIT',
        amount_micro: toMicroUnits(1500),
      },
      {
        id: 'p_2',
        transaction_id: 'tx_1',
        account_id: 'acc_bank',
        direction: 'CREDIT',
        amount_micro: toMicroUnits(1500),
      },
    ];

    // 1. Beancount Export
    const beancount = security.exportToBeancount(accounts, transactions, postings);
    expect(beancount).toContain('open Assets:HDFC:Checking');
    expect(beancount).toContain('Team Lunch at Dishoom');
    expect(beancount).toContain('1500.00 INR');

    // 2. GnuCash XML Export
    const gnucash = security.exportToGnuCashXML(accounts, transactions);
    expect(gnucash).toContain('<gnc:account');
    expect(gnucash).toContain('HDFC Checking');
    expect(gnucash).toContain('Team Lunch at Dishoom');

    // 3. CSV Export
    const csv = security.exportToCSV(transactions, postings);
    expect(csv).toContain('Transaction ID,Date,Description');
    expect(csv).toContain('"Team Lunch at Dishoom"');
    expect(csv).toContain('1500.00');
  });
});
