"""Tax Engine & FIFO Lot Tracking for Equities & Capital Gains."""
from typing import List, Dict, Any

class FIFOLotTracker:
    def __init__(self):
        # symbol -> list of lots
        self.lots: Dict[str, List[Dict[str, Any]]] = {}

    def buy_lot(self, symbol: str, units_micro: int, price_per_unit_micro: int, date: str):
        if symbol not in self.lots:
            self.lots[symbol] = []
        self.lots[symbol].append({
            "units": units_micro,
            "cost_per_unit": price_per_unit_micro,
            "date": date
        })

    def sell_lot(self, symbol: str, units_to_sell_micro: int, sale_price_per_unit_micro: int) -> Dict[str, int]:
        """Liquidates units using FIFO. Returns total realized gain in micro-units."""
        if symbol not in self.lots or not self.lots[symbol]:
            raise ValueError(f"No lots available for symbol {symbol}")
        
        remaining = units_to_sell_micro
        total_cost_micro = 0
        total_sale_proceeds_micro = units_to_sell_micro * sale_price_per_unit_micro // 10000

        while remaining > 0 and self.lots[symbol]:
            first_lot = self.lots[symbol][0]
            if first_lot["units"] <= remaining:
                lot_units = first_lot["units"]
                total_cost_micro += (lot_units * first_lot["cost_per_unit"]) // 10000
                remaining -= lot_units
                self.lots[symbol].pop(0)
            else:
                total_cost_micro += (remaining * first_lot["cost_per_unit"]) // 10000
                first_lot["units"] -= remaining
                remaining = 0

        if remaining > 0:
            raise ValueError(f"Insufficient units held in {symbol} to fulfill sale.")

        realized_gain_micro = total_sale_proceeds_micro - total_cost_micro
        return {
            "units_sold": units_to_sell_micro,
            "sale_proceeds_micro": total_sale_proceeds_micro,
            "cost_basis_micro": total_cost_micro,
            "realized_gain_micro": realized_gain_micro
        }

def compare_tax_regimes(gross_income: float, deductions_80c: float, deductions_80d: float, hra: float) -> Dict[str, Any]:
    """Evaluates simplified Old vs. New Tax Regime liabilities (FY 2024-2026 guidelines)."""
    # Standard Deduction
    old_std_deduction = 50000
    new_std_deduction = 75000
    
    # Old Regime Taxable Income
    old_exemptions = min(deductions_80c, 150000) + min(deductions_80d, 50000) + hra + old_std_deduction
    old_taxable = max(0, gross_income - old_exemptions)
    
    # Old slabs
    old_tax = 0.0
    if old_taxable > 1000000:
        old_tax += (old_taxable - 1000000) * 0.30 + 112500
    elif old_taxable > 500000:
        old_tax += (old_taxable - 500000) * 0.20 + 12500
    elif old_taxable > 250000:
        old_tax += (old_taxable - 250000) * 0.05
    if old_taxable <= 500000:
        old_tax = 0.0 # Section 87A rebate

    # New Regime Taxable Income
    new_taxable = max(0, gross_income - new_std_deduction)
    new_tax = 0.0
    if new_taxable > 1500000:
        new_tax += (new_taxable - 1500000) * 0.30 + 150000
    elif new_taxable > 1200000:
        new_tax += (new_taxable - 1200000) * 0.20 + 90000
    elif new_taxable > 900000:
        new_tax += (new_taxable - 900000) * 0.15 + 45000
    elif new_taxable > 600000:
        new_tax += (new_taxable - 600000) * 0.10 + 15000
    elif new_taxable > 300000:
        new_tax += (new_taxable - 300000) * 0.05
    if new_taxable <= 700000:
        new_tax = 0.0 # Section 87A rebate for new regime

    return {
        "old_tax": round(old_tax * 1.04, 2), # 4% Health & Education cess
        "new_tax": round(new_tax * 1.04, 2),
        "recommended_regime": "NEW" if new_tax <= old_tax else "OLD",
        "savings": round(abs(old_tax - new_tax) * 1.04, 2)
    }
