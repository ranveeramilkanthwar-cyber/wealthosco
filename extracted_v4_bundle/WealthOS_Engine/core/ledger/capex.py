"""Capital Expenditure (CapEx) Amortization & Depreciation Engine."""
from typing import List, Dict

def calculate_straight_line_depreciation(cost_micro: int, salvage_micro: int, useful_months: int) -> List[Dict[str, int]]:
    """Generates monthly straight-line depreciation postings."""
    depreciable_base = cost_micro - salvage_micro
    if useful_months <= 0:
        raise ValueError("Useful life must be > 0 months.")
    
    monthly_charge = depreciable_base // useful_months
    remainder = depreciable_base % useful_months
    
    schedule = []
    accumulated = 0
    for month in range(1, useful_months + 1):
        charge = monthly_charge + (1 if month <= remainder else 0)
        accumulated += charge
        book_value = cost_micro - accumulated
        schedule.append({
            "month": month,
            "depreciation_charge_micro": charge,
            "accumulated_depreciation_micro": accumulated,
            "net_book_value_micro": book_value
        })
    return schedule
