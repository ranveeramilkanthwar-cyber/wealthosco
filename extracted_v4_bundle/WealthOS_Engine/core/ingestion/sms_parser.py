"""Automated Transactional Bank SMS Parser and Deduplication Hash Generator."""
import re
import hashlib
from typing import Optional, Dict, Any

SMS_PATTERNS = [
    # UPI Debited
    re.compile(r"(?i)(?:debited|spent|paid)\s*(?:by|inr|rs\.?|rs)?\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:from|via|on)?\s*(?:a/c|acct|ac)?\s*(?:xx|x+|\*)?(\d{4})?\s*(?:to|towards|vpa)?\s*([a-zA-Z0-9_\.\@\s]+)?(?:\.|\s|ref|upi|rrn|utr:?\s*([0-9a-zA-Z]+))?"),
    # General Credit Alert
    re.compile(r"(?i)(?:credited|received)\s*(?:by|inr|rs\.?|rs)?\s*([0-9,]+(?:\.[0-9]{2})?)\s*(?:to|in)?\s*(?:a/c|acct|ac)?\s*(?:xx|x+|\*)?(\d{4})?")
]

def generate_dedup_hash(account_id: str, amount_micro: int, date_minute: str, ref_number: str = "") -> str:
    """Generates deterministic SHA-256 fingerprint for deduplication."""
    payload = f"{account_id}:{amount_micro}:{date_minute}:{ref_number.strip().lower()}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()

def parse_bank_sms(sms_text: str) -> Optional[Dict[str, Any]]:
    """Extracts amount, account digits, direction, and merchant entity from bank SMS."""
    # Check for non-transactional OTP messages
    if re.search(r"(?i)(otp|one time password|verification code)", sms_text):
        return None
    
    text = sms_text.replace(",", "")
    # Check debits
    m_debit = re.search(r"(?i)(?:rs\.?|inr)\s*([0-9]+(?:\.[0-9]{2})?)\s*(?:has been\s*)?debited", text)
    if m_debit:
        amount = float(m_debit.group(1))
        m_acct = re.search(r"(?:a/c|ac|ending|card)\s*(?:xx|x|\*)?(\d{4})", text, re.I)
        acct = m_acct.group(1) if m_acct else "UNKNOWN"
        return {"amount": amount, "direction": "DEBIT", "account_last4": acct}

    # Check credits
    m_credit = re.search(r"(?i)(?:rs\.?|inr)\s*([0-9]+(?:\.[0-9]{2})?)\s*(?:has been\s*)?credited", text)
    if m_credit:
        amount = float(m_credit.group(1))
        m_acct = re.search(r"(?:a/c|ac|ending|card)\s*(?:xx|x|\*)?(\d{4})", text, re.I)
        acct = m_acct.group(1) if m_acct else "UNKNOWN"
        return {"amount": amount, "direction": "CREDIT", "account_last4": acct}

    return None
