"""Core Financial Types and Micro-Unit Scale Conversion Functions."""
from decimal import Decimal, ROUND_HALF_EVEN
from typing import NamedTuple, Literal

MICRO_SCALE = 10_000

def to_micro(amount: float | str | Decimal) -> int:
    """Converts a standard currency amount (e.g. 100.50) to exact integer micro-units."""
    d = Decimal(str(amount))
    scaled = d * Decimal(MICRO_SCALE)
    return int(scaled.to_integral_value(rounding=ROUND_HALF_EVEN))

def from_micro(micro_units: int) -> Decimal:
    """Converts integer micro-units back to Decimal currency amount."""
    return Decimal(micro_units) / Decimal(MICRO_SCALE)

def format_currency(micro_units: int, currency: str = "INR") -> str:
    """Formats micro-units into readable string with 2 decimal places using Banker's rounding."""
    val = from_micro(micro_units).quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN)
    symbol = "₹" if currency == "INR" else ("$" if currency == "USD" else f"{currency} ")
    return f"{symbol}{val:,.2f}"

AccountType = Literal['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']
PostingDirection = Literal['DEBIT', 'CREDIT']

class PostingLeg(NamedTuple):
    account_id: str
    direction: PostingDirection
    amount_micro: int
    memo: str = ""
