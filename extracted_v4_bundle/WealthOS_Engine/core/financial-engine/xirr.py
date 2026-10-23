"""Newton-Raphson Numerical Method for Extended Internal Rate of Return (XIRR)."""
from datetime import datetime
from typing import List, Tuple

def calculate_xirr(cash_flows: List[Tuple[datetime, float]], guess: float = 0.1, max_iter: int = 1000, tol: float = 1e-7) -> float:
    """
    Computes XIRR for a sequence of (date, amount) tuples.
    Cash outflows are negative, portfolio valuation/inflows are positive.
    Formula: sum( CF_i / (1 + r)^((d_i - d_0) / 365) ) = 0
    """
    if len(cash_flows) < 2:
        raise ValueError("At least two cash flows are required to compute XIRR.")
    
    # Sort chronologically
    sorted_cf = sorted(cash_flows, key=lambda x: x[0])
    has_pos = any(cf[1] > 0 for cf in sorted_cf)
    has_neg = any(cf[1] < 0 for cf in sorted_cf)
    if not (has_pos and has_neg):
        raise ValueError("Cash flows must include at least one positive and one negative value.")

    d0 = sorted_cf[0][0]
    dates = [(cf[0] - d0).days / 365.0 for cf in sorted_cf]
    amounts = [cf[1] for cf in sorted_cf]

    r = guess
    for _ in range(max_iter):
        f_val = 0.0
        df_val = 0.0
        for t, cf in zip(dates, amounts):
            denom = (1.0 + r) ** t
            if denom == 0:
                denom = 1e-9
            f_val += cf / denom
            if t != 0:
                df_val -= t * cf / ((1.0 + r) ** (t + 1.0))
        
        if abs(f_val) < tol:
            return r
        if df_val == 0.0:
            r += 1e-4
            continue
        
        step = f_val / df_val
        r -= step
        if r <= -1.0:
            r = -0.999999  # Clamp boundary to avoid imaginary numbers

    return r
