"""Min-Cash-Flow Graph Debt Simplification Algorithm."""
from typing import Dict, List, Tuple

def simplify_group_debts(transactions: List[Tuple[str, str, int]]) -> List[Tuple[str, str, int]]:
    """
    Given a list of (debtor, creditor, amount_micro), simplifies net balances
    into minimal peer-to-peer settlement transactions using a greedy approach.
    """
    # 1. Compute net balance for each person
    balances: Dict[str, int] = {}
    for debtor, creditor, amount in transactions:
        balances[debtor] = balances.get(debtor, 0) - amount
        balances[creditor] = balances.get(creditor, 0) + amount

    debtors = []
    creditors = []
    for person, net in balances.items():
        if net < 0:
            debtors.append([person, -net]) # Needs to pay
        elif net > 0:
            creditors.append([person, net]) # Needs to receive

    settlements: List[Tuple[str, str, int]] = []
    i = 0
    j = 0
    while i < len(debtors) and j < len(creditors):
        debtor_person, debt_amt = debtors[i]
        creditor_person, credit_amt = creditors[j]
        
        settle_amt = min(debt_amt, credit_amt)
        settlements.append((debtor_person, creditor_person, settle_amt))
        
        debtors[i][1] -= settle_amt
        creditors[j][1] -= settle_amt
        
        if debtors[i][1] == 0:
            i += 1
        if creditors[j][1] == 0:
            j += 1

    return settlements
