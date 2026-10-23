"""Core Double-Entry Ledger Engine with strict balance verification and ACID operations."""
import sqlite3
import uuid
from typing import List
from core.financial-engine.types import PostingLeg

class UnbalancedLedgerError(Exception):
    pass

class LedgerService:
    def __init__(self, db_conn: sqlite3.Connection):
        self.conn = db_conn

    def record_entry(self, tx_date: str, description: str, tx_type: str, postings: List[PostingLeg], dedup_hash: str) -> str:
        """
        Records a double-entry journal transaction.
        Enforces sum(Debits) == sum(Credits). Rolls back if unbalanced.
        """
        total_debits = sum(p.amount_micro for p in postings if p.direction == 'DEBIT')
        total_credits = sum(p.amount_micro for p in postings if p.direction == 'CREDIT')

        if total_debits != total_credits:
            raise UnbalancedLedgerError(
                f"Ledger entry is not balanced! Total Debits: {total_debits}, Total Credits: {total_credits}. Diff: {total_debits - total_credits}"
            )

        tx_id = str(uuid.uuid4())
        cur = self.conn.cursor()
        
        try:
            cur.execute("BEGIN TRANSACTION")
            cur.execute(
                """INSERT INTO transactions (id, transaction_date, posted_date, description, transaction_type, deduplication_hash)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (tx_id, tx_date, tx_date, description, tx_type, dedup_hash)
            )

            for leg in postings:
                posting_id = str(uuid.uuid4())
                cur.execute(
                    """INSERT INTO ledger_postings (id, transaction_id, account_id, direction, amount_micro, memo)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (posting_id, tx_id, leg.account_id, leg.direction, leg.amount_micro, leg.memo)
                )

                # Update cached account balance based on normal accounting signs
                cur.execute("SELECT account_type FROM accounts WHERE id = ?", (leg.account_id,))
                row = cur.fetchone()
                if not row:
                    raise ValueError(f"Account {leg.account_id} not found.")
                acct_type = row[0]

                # Assets & Expenses increase with Debit, decrease with Credit
                # Liabilities, Equity & Income increase with Credit, decrease with Debit
                delta = leg.amount_micro if leg.direction == 'DEBIT' else -leg.amount_micro
                if acct_type in ('LIABILITY', 'EQUITY', 'INCOME'):
                    delta = -delta

                cur.execute("UPDATE accounts SET balance_micro = balance_micro + ? WHERE id = ?", (delta, leg.account_id))

            self.conn.commit()
            return tx_id
        except Exception as e:
            self.conn.rollback()
            raise e
