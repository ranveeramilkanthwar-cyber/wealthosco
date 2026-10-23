"""Unit Tests for WealthOS Double-Entry Core, XIRR, CapEx, Loans & Graph Simplification."""
import sqlite3
import unittest
from datetime import datetime
import sys
import os

# Include parent dir
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.financial_engine.types import to_micro, from_micro, PostingLeg
from core.financial_engine.xirr import calculate_xirr
from core.financial_engine.tax_engine import FIFOLotTracker, compare_tax_regimes
from core.ledger.ledger_engine import LedgerService, UnbalancedLedgerError
from core.ledger.capex import calculate_straight_line_depreciation
from core.debt.loan_calculator import compute_monthly_emi, simulate_prepayment
from core.debt.graph_simplifier import simplify_group_debts
from core.ingestion.sms_parser import parse_bank_sms, generate_dedup_hash

class TestWealthOSEngine(unittest.TestCase):
    def setUp(self):
        # Setup in-memory SQLite database
        self.conn = sqlite3.connect(":memory:")
        with open("database/migrations/001_initial_schema.sql") as f:
            self.conn.executescript(f.read())
        self.ledger = LedgerService(self.conn)

        # Seed sample accounts
        cur = self.conn.cursor()
        cur.execute("INSERT INTO accounts (id, name, account_type, account_subtype) VALUES ('bank_sbi', 'SBI Savings', 'ASSET', 'BANK')")
        cur.execute("INSERT INTO accounts (id, name, account_type, account_subtype) VALUES ('exp_food', 'Food & Dining', 'EXPENSE', 'OPEX')")
        cur.execute("INSERT INTO accounts (id, name, account_type, account_subtype) VALUES ('liab_cc', 'HDFC Credit Card', 'LIABILITY', 'CREDIT_CARD')")
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_double_entry_balanced(self):
        postings = [
            PostingLeg(account_id='exp_food', direction='DEBIT', amount_micro=to_micro(250)),
            PostingLeg(account_id='bank_sbi', direction='CREDIT', amount_micro=to_micro(250))
        ]
        tx_id = self.ledger.record_entry("2026-10-24", "Coffee", "EXPENSE", postings, "hash123")
        self.assertIsNotNone(tx_id)
        
        # Verify account balance
        cur = self.conn.cursor()
        cur.execute("SELECT balance_micro FROM accounts WHERE id = 'exp_food'")
        self.assertEqual(cur.fetchone()[0], to_micro(250))
        cur.execute("SELECT balance_micro FROM accounts WHERE id = 'bank_sbi'")
        self.assertEqual(cur.fetchone()[0], -to_micro(250))

    def test_double_entry_unbalanced_rejection(self):
        postings = [
            PostingLeg(account_id='exp_food', direction='DEBIT', amount_micro=to_micro(300)),
            PostingLeg(account_id='bank_sbi', direction='CREDIT', amount_micro=to_micro(250))
        ]
        with self.assertRaises(UnbalancedLedgerError):
            self.ledger.record_entry("2026-10-24", "Unbalanced entry", "EXPENSE", postings, "hash456")

    def test_xirr_calculation(self):
        flows = [
            (datetime(2025, 1, 1), -100000.0),
            (datetime(2025, 7, 1), -50000.0),
            (datetime(2026, 1, 1), 170000.0)
        ]
        rate = calculate_xirr(flows)
        self.assertGreater(rate, 0.10)
        self.assertLess(rate, 0.25)

    def test_fifo_lot_tracking(self):
        tracker = FIFOLotTracker()
        tracker.buy_lot("RELIANCE", units_micro=to_micro(10), price_per_unit_micro=to_micro(2000), date="2025-01-01")
        tracker.buy_lot("RELIANCE", units_micro=to_micro(10), price_per_unit_micro=to_micro(2500), date="2025-06-01")
        
        # Sell 15 units at 3000
        result = tracker.sell_lot("RELIANCE", units_to_sell_micro=to_micro(15), sale_price_per_unit_micro=to_micro(3000))
        # Cost basis: 10 * 2000 + 5 * 2500 = 20000 + 12500 = 32500
        # Proceeds: 15 * 3000 = 45000
        # Gain: 12500
        self.assertEqual(from_micro(result["realized_gain_micro"]), 12500)

    def test_loan_amortization(self):
        emi = compute_monthly_emi(principal=1000000, annual_rate_pct=8.5, tenure_months=120)
        self.assertGreater(emi, 12000)
        sim = simulate_prepayment(principal=1000000, annual_rate_pct=8.5, tenure_months=120, one_time_prepayment=200000, prepayment_month=12)
        self.assertGreater(sim["months_saved"], 20)

    def test_graph_debt_simplification(self):
        # A owes B 100, B owes C 100 -> A owes C 100
        debts = [("Alice", "Bob", 100), ("Bob", "Charlie", 100)]
        settled = simplify_group_debts(debts)
        self.assertEqual(len(settled), 1)
        self.assertEqual(settled[0], ("Alice", "Charlie", 100))

    def test_sms_parsing(self):
        sms = "Rs. 450.00 has been debited from your A/c ending 1234 on 24-Oct-26 via UPI"
        parsed = parse_bank_sms(sms)
        self.assertIsNotNone(parsed)
        self.assertEqual(parsed["amount"], 450.0)
        self.assertEqual(parsed["direction"], "DEBIT")
        self.assertEqual(parsed["account_last4"], "1234")

if __name__ == "__main__":
    unittest.main()
