import React, { useState } from 'react';
import { Calculator, Flame, Plus, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { DebtEngine, DebtItem } from '../../core/financial-engine/debtEngine';
import { formatCurrency, toMicroUnits, fromMicroUnits } from '../../core/financial-engine/microUnits';

export const DebtOptimizerView: React.FC = () => {
  const [debtEngine] = useState(() => new DebtEngine());

  // Loan Simulator State (Defaults to 0, user enters their own numbers)
  const [principal, setPrincipal] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenureYears, setTenureYears] = useState<number>(20);
  const [prepayAmount, setPrepayAmount] = useState<number>(0);
  const [prepayMonth, setPrepayMonth] = useState<number>(12);

  // Avalanche vs Snowball Debts List (persisted in localStorage)
  const [debts, setDebts] = useState<DebtItem[]>(() => {
    try {
      const raw = localStorage.getItem('wealthos_v4_debts');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map((d: any) => ({
        ...d,
        principalMicro: BigInt(d.principalMicro),
        minPaymentMicro: BigInt(d.minPaymentMicro),
      }));
    } catch {
      return [];
    }
  });

  const [selectedStrategy, setSelectedStrategy] = useState<'AVALANCHE' | 'SNOWBALL'>('AVALANCHE');
  const [monthlyBudgetStr, setMonthlyBudgetStr] = useState('25000');

  // Form for new debt
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtPrincipal, setNewDebtPrincipal] = useState('');
  const [newDebtRate, setNewDebtRate] = useState('');
  const [newDebtMinPay, setNewDebtMinPay] = useState('');

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(newDebtPrincipal);
    const r = parseFloat(newDebtRate);
    const m = parseFloat(newDebtMinPay);
    if (!newDebtName.trim() || isNaN(p) || p <= 0 || isNaN(r) || isNaN(m)) return;

    const newDebt: DebtItem = {
      id: `debt_${Date.now()}`,
      name: newDebtName.trim(),
      principalMicro: toMicroUnits(p),
      annualInterestRatePercent: r,
      minPaymentMicro: toMicroUnits(m),
    };

    const updated = [...debts, newDebt];
    setDebts(updated);
    localStorage.setItem(
      'wealthos_v4_debts',
      JSON.stringify(
        updated.map((d) => ({
          ...d,
          principalMicro: d.principalMicro.toString(),
          minPaymentMicro: d.minPaymentMicro.toString(),
        }))
      )
    );

    setNewDebtName('');
    setNewDebtPrincipal('');
    setNewDebtRate('');
    setNewDebtMinPay('');
    setShowAddDebt(false);
  };

  const handleRemoveDebt = (id: string) => {
    const updated = debts.filter((d) => d.id !== id);
    setDebts(updated);
    localStorage.setItem(
      'wealthos_v4_debts',
      JSON.stringify(
        updated.map((d) => ({
          ...d,
          principalMicro: d.principalMicro.toString(),
          minPaymentMicro: d.minPaymentMicro.toString(),
        }))
      )
    );
  };

  // Compute Loan Amortization
  const baselineLoan = principal > 0
    ? debtEngine.calculateLoanAmortization({
        principalMicro: toMicroUnits(principal),
        annualInterestRatePercent: interestRate,
        tenureMonths: tenureYears * 12,
      })
    : null;

  const prepayLoan = principal > 0 && prepayAmount > 0
    ? debtEngine.calculateLoanAmortization({
        principalMicro: toMicroUnits(principal),
        annualInterestRatePercent: interestRate,
        tenureMonths: tenureYears * 12,
        prepayments: [{ month: prepayMonth, extraPrincipalMicro: toMicroUnits(prepayAmount) }],
      })
    : null;

  // Compute Avalanche / Snowball if debts exist
  const monthlyBudgetNum = parseFloat(monthlyBudgetStr) || 20000;
  const avalanche = debts.length > 0
    ? debtEngine.simulateDebtPayoff(debts, toMicroUnits(monthlyBudgetNum), 'AVALANCHE')
    : null;
  const snowball = debts.length > 0
    ? debtEngine.simulateDebtPayoff(debts, toMicroUnits(monthlyBudgetNum), 'SNOWBALL')
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Loan Amortization Calculator */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Calculator size={20} color="#818cf8" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Loan Amortization &amp; Prepayment Simulator</h2>
          <span className="badge badge-indigo">Annuity Formula Math</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Enter your real home loan, vehicle loan, or personal loan to calculate monthly EMI and see how prepayments shave years off.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loan Principal (₹):</label>
              <input
                type="number"
                placeholder="e.g. 5000000 (₹50 Lakhs)"
                className="input-field"
                value={principal || ''}
                onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Annual Interest (%):</label>
                <input
                  type="number"
                  step="0.1"
                  className="input-field"
                  value={interestRate}
                  onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tenure (Years):</label>
                <input
                  type="number"
                  className="input-field"
                  value={tenureYears}
                  onChange={(e) => setTenureYears(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#818cf8' }}>Prepayment Simulator:</span>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lumpsum (₹):</label>
                  <input
                    type="number"
                    placeholder="e.g. 200000"
                    className="input-field"
                    value={prepayAmount || ''}
                    onChange={(e) => setPrepayAmount(parseFloat(e.target.value) || 0)}
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  />
                </div>
                <div style={{ width: '90px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Month #:</label>
                  <input
                    type="number"
                    className="input-field"
                    value={prepayMonth}
                    onChange={(e) => setPrepayMonth(parseInt(e.target.value, 10) || 1)}
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          {baselineLoan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly Annuity EMI:</span>
                <div className="num-mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: '#38bdf8' }}>
                  {formatCurrency(baselineLoan.baseEmiMicro)} <span style={{ fontSize: '0.8rem' }}>/ month</span>
                </div>
              </div>

              {prepayLoan && prepayAmount > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>Interest Saved:</span>
                    <div className="num-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>
                      {formatCurrency(prepayLoan.interestSavedMicro)}
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>Tenure Shaved:</span>
                    <div className="num-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#818cf8', marginTop: '4px' }}>
                      {prepayLoan.monthsSaved} Months
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Enter principal amount above to generate monthly EMI schedule.
            </div>
          )}
        </div>
      </div>

      {/* Debt Avalanche vs Snowball Optimizer */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={20} color="#f43f5e" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Debt Avalanche vs. Snowball Optimizer</h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Add your active credit cards or loans to simulate accelerated payoff using surplus cash flow.
            </p>
          </div>

          <button
            onClick={() => setShowAddDebt(!showAddDebt)}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '8px 14px', gap: '6px' }}
          >
            <Plus size={14} />
            <span>Add Debt</span>
          </button>
        </div>

        {/* Add Debt Form */}
        {showAddDebt && (
          <form onSubmit={handleAddDebt} style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '10px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Debt Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Axis Credit Card"
                  className="input-field"
                  value={newDebtName}
                  onChange={(e) => setNewDebtName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Outstanding Principal (₹):</label>
                <input
                  type="number"
                  placeholder="e.g. 85000"
                  className="input-field"
                  value={newDebtPrincipal}
                  onChange={(e) => setNewDebtPrincipal(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Annual Interest Rate (%):</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 36.0"
                  className="input-field"
                  value={newDebtRate}
                  onChange={(e) => setNewDebtRate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Min Monthly Payment (₹):</label>
                <input
                  type="number"
                  placeholder="e.g. 4500"
                  className="input-field"
                  value={newDebtMinPay}
                  onChange={(e) => setNewDebtMinPay(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowAddDebt(false)} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ fontSize: '0.75rem', padding: '6px 14px' }}>Save Debt</button>
            </div>
          </form>
        )}

        {/* Debts Table or Empty State */}
        {debts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: 600 }}>Zero Active Debts Added</p>
            <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>
              Click "+ Add Debt" above if you have credit cards, personal loans, or vehicle loans to compare Avalanche vs Snowball payoff strategies.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
              {debts.map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{d.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#fb7185', marginLeft: '10px' }}>APR: {d.annualInterestRatePercent}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="num-mono" style={{ fontWeight: 700 }}>{formatCurrency(d.principalMicro)}</span>
                    <button onClick={() => handleRemoveDebt(d.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Strategy comparison cards */}
            {avalanche && snowball && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.85rem' }}>AVALANCHE (MAX SAVINGS)</span>
                    <span className="badge badge-indigo">Recommended</span>
                  </div>
                  <div className="num-mono" style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '8px' }}>
                    {avalanche.totalMonths} Months
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Total Interest Paid: {formatCurrency(avalanche.totalInterestMicro)}
                  </div>
                </div>

                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>SNOWBALL (MILESTONES)</span>
                    <span className="badge badge-amber">Behavioral</span>
                  </div>
                  <div className="num-mono" style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '8px' }}>
                    {snowball.totalMonths} Months
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Total Interest Paid: {formatCurrency(snowball.totalInterestMicro)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
