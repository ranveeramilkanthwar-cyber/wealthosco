import React, { useState } from 'react';
import { Users, Shuffle, ArrowRight, CheckCircle2, Sparkles, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { MultiEntityAndGraphEngine, PeerDebt, SimplifiedSettlement } from '../../core/financial-engine/multiEntityAndGraphEngine';
import { formatCurrency, toMicroUnits } from '../../core/financial-engine/microUnits';

export const SplitwiseGraphView: React.FC = () => {
  const [engine] = useState(() => new MultiEntityAndGraphEngine());

  // Interactive peer debts list
  const [debts, setDebts] = useState<PeerDebt[]>(() => {
    try {
      const saved = localStorage.getItem('wealthos_v4_split_debts');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return parsed.map((d: any) => ({
        ...d,
        amountMicro: BigInt(d.amountMicro),
      }));
    } catch {
      return [];
    }
  });

  const [simplified, setSimplified] = useState<SimplifiedSettlement[] | null>(null);

  // Form for new group debt
  const [showAddForm, setShowAddForm] = useState(false);
  const [debtor, setDebtor] = useState('');
  const [creditor, setCreditor] = useState('');
  const [amountStr, setAmountStr] = useState('');

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountStr);
    if (!debtor.trim() || !creditor.trim() || isNaN(amt) || amt <= 0 || debtor.trim() === creditor.trim()) {
      return;
    }

    const updated = [
      ...debts,
      {
        debtor: debtor.trim(),
        creditor: creditor.trim(),
        amountMicro: toMicroUnits(amt),
      },
    ];

    setDebts(updated);
    localStorage.setItem(
      'wealthos_v4_split_debts',
      JSON.stringify(updated.map((d) => ({ ...d, amountMicro: d.amountMicro.toString() })))
    );

    setDebtor('');
    setCreditor('');
    setAmountStr('');
    setShowAddForm(false);
    setSimplified(null);
  };

  const handleRemoveDebt = (index: number) => {
    const updated = debts.filter((_, idx) => idx !== index);
    setDebts(updated);
    localStorage.setItem(
      'wealthos_v4_split_debts',
      JSON.stringify(updated.map((d) => ({ ...d, amountMicro: d.amountMicro.toString() })))
    );
    setSimplified(null);
  };

  const handleSimplify = () => {
    if (debts.length === 0) return;
    const res = engine.simplifyDebts(debts);
    setSimplified(res);
  };

  const handleClearAll = () => {
    setDebts([]);
    localStorage.removeItem('wealthos_v4_split_debts');
    setSimplified(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Controls */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#818cf8" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Min-Cash-Flow Group Debt Simplifier</h2>
              <span className="badge badge-indigo">Splitwise Engine</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Given M peer-to-peer debts among N participants, computes net balances and executes a greedy heap-matching algorithm to reduce transactions to at most N - 1 payments.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Add Shared Debt</span>
            </button>

            {debts.length > 0 && (
              <button
                onClick={handleSimplify}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.8rem', gap: '6px' }}
              >
                <Sparkles size={15} />
                <span>Simplify {debts.length} Debts Now</span>
              </button>
            )}

            {debts.length > 0 && (
              <button
                onClick={handleClearAll}
                className="btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#fb7185' }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAddDebt} style={{ marginTop: '18px', padding: '16px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Person Who Owes (Debtor):</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh"
                  className="input-field"
                  value={debtor}
                  onChange={(e) => setDebtor(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Person Who Paid (Creditor):</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh"
                  className="input-field"
                  value={creditor}
                  onChange={(e) => setCreditor(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Amount (₹):</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  className="input-field"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Cancel</button>
              <button type="submit" className="btn-primary" style={{ fontSize: '0.75rem', padding: '6px 14px' }}>Save Group Debt</button>
            </div>
          </form>
        )}
      </div>

      {/* Debts Table or Clean State */}
      {debts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={32} color="#818cf8" style={{ margin: '0 auto 10px auto', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Zero Group Debts</h3>
          <p style={{ fontSize: '0.8rem', maxWidth: '420px', margin: '4px auto 14px auto' }}>
            Splitting a vacation, flat rent, or restaurant bill with friends? Click "Add Shared Debt" above or load the test case to see the algorithm in action!
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
          >
            <Plus size={14} />
            <span>Add Shared Debt</span>
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Active Debts ({debts.length} Transactions)</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Algorithm Target: Max N - 1 Payments</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
            {debts.map((d, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.825rem' }}>
                  <span style={{ fontWeight: 600, color: '#fb7185' }}>{d.debtor}</span>
                  <ArrowRight size={12} color="var(--text-muted)" />
                  <span style={{ fontWeight: 600, color: '#34d399' }}>{d.creditor}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="num-mono" style={{ fontWeight: 700, fontSize: '0.825rem' }}>{formatCurrency(d.amountMicro)}</span>
                  <button onClick={() => handleRemoveDebt(idx)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simplified Results */}
      {simplified && (
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <CheckCircle2 size={18} color="#34d399" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>
              Optimized Minimal Settlement Plan (Reduced to {simplified.length} Direct Payments!)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {simplified.map((s, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: '#fb7185' }}>{s.from}</span>
                  <ArrowRight size={14} color="var(--text-muted)" />
                  <span style={{ fontWeight: 700, color: '#34d399' }}>{s.to}</span>
                </div>

                <div className="num-mono" style={{ fontWeight: 700, color: '#38bdf8' }}>
                  {formatCurrency(s.amountMicro)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="#34d399" />
            <span>Mathematical Guarantee: Zero residual drift. All net balances preserved with minimal cash transfers.</span>
          </div>
        </div>
      )}
    </div>
  );
};
