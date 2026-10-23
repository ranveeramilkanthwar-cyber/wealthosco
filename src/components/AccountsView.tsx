import React, { useState } from 'react';
import { CreditCard, Landmark, PiggyBank, Plus, X, ArrowDownCircle } from 'lucide-react';
import { Account, AccountType, AccountSubtype } from '../../core/financial-engine/types';
import { formatCurrency, fromMicroUnits, toMicroUnits } from '../../core/financial-engine/microUnits';

interface AccountsViewProps {
  accounts: Account[];
  onAddAccount: (acc: Account) => void;
  onRecordDeposit: (accountId: string, amountMicro: bigint, description: string) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  onAddAccount,
  onRecordDeposit,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // New Account State
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('ASSET');
  const [accSubtype, setAccSubtype] = useState<AccountSubtype>('BANK');
  const [creditLimitStr, setCreditLimitStr] = useState('');
  const [entityId, setEntityId] = useState('PERSONAL');

  // Deposit State
  const [depositAccId, setDepositAccId] = useState(accounts[0]?.id || '');
  const [depositAmountStr, setDepositAmountStr] = useState('');
  const [depositNote, setDepositNote] = useState('Opening Capital Deposit');

  const assetAccounts = accounts.filter((a) => a.account_type === 'ASSET');
  const liabilityAccounts = accounts.filter((a) => a.account_type === 'LIABILITY');
  const incomeAccounts = accounts.filter((a) => a.account_type === 'INCOME');
  const expenseAccounts = accounts.filter((a) => a.account_type === 'EXPENSE');

  const creditCards = liabilityAccounts.filter((a) => a.account_subtype === 'CREDIT_CARD');

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;

    const limitNum = parseFloat(creditLimitStr);
    const newAcc: Account = {
      id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: accName.trim(),
      account_type: accType,
      account_subtype: accSubtype,
      currency: 'INR',
      balance_micro: 0n,
      credit_limit_micro: !isNaN(limitNum) && limitNum > 0 ? toMicroUnits(limitNum) : null,
      billing_cycle_day: accSubtype === 'CREDIT_CARD' ? 15 : null,
      due_day_offset: accSubtype === 'CREDIT_CARD' ? 20 : null,
      is_archived: false,
      entity_id: entityId,
    };

    onAddAccount(newAcc);
    setAccName('');
    setCreditLimitStr('');
    setShowAddModal(false);
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmountStr);
    if (isNaN(amt) || amt <= 0 || !depositAccId) return;

    onRecordDeposit(depositAccId, toMicroUnits(amt), depositNote.trim() || 'Capital Contribution');
    setDepositAmountStr('');
    setShowDepositModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark size={20} color="#34d399" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Institutional Chart of Accounts</h2>
            <span className="badge badge-emerald">{accounts.length} Accounts</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Real-time balance sheet and income statement ledger nodes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowDepositModal(true)}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', gap: '6px' }}
          >
            <ArrowDownCircle size={15} color="#34d399" />
            <span>Record Opening Deposit</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ fontSize: '0.8rem', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Add New Account</span>
          </button>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '24px', background: '#0e1524' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Record Opening Capital / Deposit</h3>
              <button onClick={() => setShowDepositModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deposit Into Account:</label>
                <select className="input-field" value={depositAccId} onChange={(e) => setDepositAccId(e.target.value)}>
                  {assetAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance_micro)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount (₹):</label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  className="input-field"
                  value={depositAmountStr}
                  onChange={(e) => setDepositAmountStr(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Description / Source:</label>
                <input
                  type="text"
                  placeholder="Opening balance deposit"
                  className="input-field"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }}>
                Commit Balanced Deposit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '20px' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '24px', background: '#0e1524' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Add New Ledger Account</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Name:</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Salary Account or Dining Out"
                  className="input-field"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Account Type:</label>
                  <select
                    className="input-field"
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as AccountType)}
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="INCOME">INCOME</option>
                    <option value="EXPENSE">EXPENSE</option>
                    <option value="EQUITY">EQUITY</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subtype:</label>
                  <select
                    className="input-field"
                    value={accSubtype}
                    onChange={(e) => setAccSubtype(e.target.value as AccountSubtype)}
                  >
                    <option value="BANK">BANK</option>
                    <option value="CASH">CASH</option>
                    <option value="CREDIT_CARD">CREDIT CARD</option>
                    <option value="LOAN">LOAN</option>
                    <option value="INVESTMENT">INVESTMENT</option>
                    <option value="FIXED_ASSET">FIXED ASSET</option>
                    <option value="RECEIVABLE">RECEIVABLE</option>
                    <option value="OPEX">OPERATING EXPENSE</option>
                  </select>
                </div>
              </div>
              {accSubtype === 'CREDIT_CARD' && (
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Credit Limit (₹):</label>
                  <input
                    type="number"
                    placeholder="e.g. 200000"
                    className="input-field"
                    value={creditLimitStr}
                    onChange={(e) => setCreditLimitStr(e.target.value)}
                  />
                </div>
              )}
              <button type="submit" className="btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }}>
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Credit Cards State Machine */}
      {creditCards.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {creditCards.map((card) => {
            const balNum = fromMicroUnits(card.balance_micro);
            const limitNum = card.credit_limit_micro ? fromMicroUnits(card.credit_limit_micro) : 0;
            const utilPercent = limitNum > 0 ? (balNum / limitNum) * 100 : 0;
            const isAlert = utilPercent > 30;

            return (
              <div key={card.id} className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{card.name}</h3>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Billing Cycle: {card.billing_cycle_day || 15}th • Due +{card.due_day_offset || 20}d
                    </p>
                  </div>
                  <span className={isAlert ? 'badge badge-rose' : 'badge badge-emerald'}>
                    {isAlert ? 'High Util (>30%)' : 'Optimal'}
                  </span>
                </div>
                <div style={{ marginTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Current Due:</span>
                    <span className="num-mono" style={{ fontWeight: 700, color: '#fbbf24' }}>
                      {formatCurrency(card.balance_micro)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Limit:</span>
                    <span className="num-mono" style={{ color: 'var(--text-secondary)' }}>
                      {card.credit_limit_micro ? formatCurrency(card.credit_limit_micro) : 'Not specified'}
                    </span>
                  </div>
                  {limitNum > 0 && (
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, utilPercent)}%`,
                          height: '100%',
                          background: isAlert ? '#f43f5e' : '#10b981',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart of Accounts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {/* Assets */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>ASSET ACCOUNTS</h3>
            <span className="badge badge-emerald">{assetAccounts.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {assetAccounts.map((acc) => (
              <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>{acc.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{acc.account_subtype}</div>
                </div>
                <div className="num-mono" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#34d399' }}>
                  {formatCurrency(acc.balance_micro)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liabilities */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fbbf24' }}>LIABILITY ACCOUNTS</h3>
            <span className="badge badge-amber">{liabilityAccounts.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {liabilityAccounts.map((acc) => (
              <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>{acc.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{acc.account_subtype}</div>
                </div>
                <div className="num-mono" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fbbf24' }}>
                  {formatCurrency(acc.balance_micro)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fb7185' }}>EXPENSE CATEGORIES</h3>
            <span className="badge badge-rose">{expenseAccounts.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {expenseAccounts.map((acc) => (
              <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>{acc.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{acc.account_subtype}</div>
                </div>
                <div className="num-mono" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fb7185' }}>
                  {formatCurrency(acc.balance_micro)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
