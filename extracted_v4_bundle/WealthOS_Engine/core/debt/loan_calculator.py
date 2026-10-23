"""Loan Amortization, Exact EMI & Prepayment Simulation."""
from typing import Dict, Any

def compute_monthly_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> float:
    """Calculates standard annuity EMI: P * [r(1+r)^n] / [(1+r)^n - 1]"""
    if annual_rate_pct <= 0 or tenure_months <= 0:
        return principal / tenure_months
    r = (annual_rate_pct / 100.0) / 12.0
    emi = principal * (r * ((1.0 + r) ** tenure_months)) / (((1.0 + r) ** tenure_months) - 1.0)
    return round(emi, 2)

def simulate_prepayment(principal: float, annual_rate_pct: float, tenure_months: int, one_time_prepayment: float, prepayment_month: int) -> Dict[str, Any]:
    """Evaluates months shaved off and interest saved with an early lump-sum prepayment."""
    base_emi = compute_monthly_emi(principal, annual_rate_pct, tenure_months)
    monthly_rate = (annual_rate_pct / 100.0) / 12.0
    
    # 1. Base Schedule
    balance = principal
    total_base_interest = 0.0
    for _ in range(tenure_months):
        interest = balance * monthly_rate
        principal_paid = min(balance, base_emi - interest)
        total_base_interest += interest
        balance -= principal_paid
        if balance <= 0:
            break

    # 2. Accelerated Schedule with prepayment
    balance = principal
    total_new_interest = 0.0
    months_taken = 0
    while balance > 0 and months_taken < tenure_months:
        months_taken += 1
        if months_taken == prepayment_month:
            balance = max(0.0, balance - one_time_prepayment)
            if balance <= 0:
                break
        interest = balance * monthly_rate
        principal_paid = min(balance, base_emi - interest)
        total_new_interest += interest
        balance -= principal_paid

    return {
        "regular_emi": base_emi,
        "base_tenure_months": tenure_months,
        "new_tenure_months": months_taken,
        "months_saved": tenure_months - months_taken,
        "total_interest_saved": round(total_base_interest - total_new_interest, 2)
    }
