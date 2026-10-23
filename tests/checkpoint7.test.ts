// Checkpoint 7 Test Suite: Multi-Entity Ledger & Advanced Addons (Checkpoint 7)
// Scenario: Simulate a shared 10-person trip with 30 inter-dependent debts.
// Assert: Min-Cash-Flow algorithm simplifies the graph to at most 9 transactions (N - 1) with 0 residual balance.
// Scenario 2: Personal vs Freelance Business Co-Mingling Protection

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiEntityAndGraphEngine, PeerDebt } from '../core/financial-engine/multiEntityAndGraphEngine';
import { toMicroUnits } from '../core/financial-engine/microUnits';

describe('Phase 7: Multi-Entity Ledger & Min-Cash-Flow Graph Simplifier (Checkpoint 7)', () => {
  let engine: MultiEntityAndGraphEngine;

  beforeEach(() => {
    engine = new MultiEntityAndGraphEngine();
  });

  it('simplifies a messy 10-person trip with 30 debts down to <= 9 transactions with zero residual drift', () => {
    const people = ['Alice', 'Bob', 'Charlie', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
    expect(people.length).toBe(10);

    const messyDebts: PeerDebt[] = [];

    // Create 30 circular, messy peer-to-peer debts among the 10 participants
    for (let i = 0; i < 30; i++) {
      const debtor = people[i % people.length];
      const creditor = people[(i * 3 + 1) % people.length];
      if (debtor !== creditor) {
        messyDebts.push({
          debtor,
          creditor,
          amountMicro: toMicroUnits((i + 1) * 150),
        });
      }
    }

    expect(messyDebts.length).toBeGreaterThanOrEqual(25);

    // Calculate initial net balances to verify conservation of money
    const initialNet = new Map<string, bigint>();
    for (const d of messyDebts) {
      initialNet.set(d.debtor, (initialNet.get(d.debtor) || 0n) - d.amountMicro);
      initialNet.set(d.creditor, (initialNet.get(d.creditor) || 0n) + d.amountMicro);
    }

    // Execute Min-Cash-Flow Simplifier
    const simplified = engine.simplifyDebts(messyDebts);

    // Algorithmic Theorem: For N people, maximum settlements needed is at most N - 1
    // For 10 people, simplified payments must be <= 9 transactions!
    expect(simplified.length).toBeLessThanOrEqual(9);

    // Verify all settlements are positive
    for (const s of simplified) {
      expect(s.amountMicro).toBeGreaterThan(0n);
      expect(s.from).not.toBe(s.to);
    }

    // Verify conservation of net balance after simplification
    const postNet = new Map<string, bigint>();
    for (const s of simplified) {
      postNet.set(s.from, (postNet.get(s.from) || 0n) - s.amountMicro);
      postNet.set(s.to, (postNet.get(s.to) || 0n) + s.amountMicro);
    }

    for (const person of people) {
      const expected = initialNet.get(person) || 0n;
      const actual = postNet.get(person) || 0n;
      expect(actual).toBe(expected);
    }
  });

  it('reconciles bank statements against cash book with BRS discrepancy adjustments', () => {
    const ledgerBal = toMicroUnits(150000);
    const bankBal = toMicroUnits(153000);

    const discrepancies = [
      {
        type: 'INTEREST_CREDIT' as const,
        amountMicro: toMicroUnits(3500),
        description: 'Quarterly Savings Interest credited by bank',
        date: '2026-10-31',
      },
      {
        type: 'BANK_CHARGE' as const,
        amountMicro: toMicroUnits(500),
        description: 'Debit Card Annual Maintenance Fee',
        date: '2026-10-31',
      },
    ];

    const brs = engine.reconcileBankStatement(ledgerBal, bankBal, discrepancies);
    // Adjusted Ledger = 150000 + 3500 - 500 = 153000
    expect(brs.reconciledBalanceMicro).toBe(toMicroUnits(153000));
    expect(brs.isReconciled).toBe(true);
  });
});
