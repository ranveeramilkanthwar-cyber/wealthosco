import React, { useState } from 'react';
import { Sparkles, Snowflake, Trees, Clock, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { formatCurrency, fromMicroUnits, toMicroUnits } from '../../core/financial-engine/microUnits';
import { DisplayMode } from './Header';
import { SafeToSpendResult } from '../../core/financial-engine/budgetEngine';
import { Account, Transaction, LedgerPosting } from '../../core/financial-engine/types';

interface ZenBentoViewProps {
  mode: DisplayMode;
  isPrivate: boolean;
  safeToSpend: SafeToSpendResult;
  accounts: Account[];
  transactions: Transaction[];
  postings: LedgerPosting[];
  onDropCoin: () => void;
  onExecuteCommand: (text: string) => { success: boolean; message: string };
  onOpenDepositModal: () => void;
}

export const ZenBentoView: React.FC<ZenBentoViewProps> = ({
  mode,
  isPrivate,
  safeToSpend,
  accounts,
  transactions,
  postings,
  onDropCoin,
  onExecuteCommand,
  onOpenDepositModal,
}) => {
  const [magicInput, setMagicInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Impulse Cooling Vault State (User can add their own impulse purchases to freeze)
  const [frozenItems, setFrozenItems] = useState<Array<{ id: string; name: string; price: number; hoursLeft: number }>>(() => {
    try {
      const saved = localStorage.getItem('wealthos_v4_impulse');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showAddImpulse, setShowAddImpulse] = useState(false);

  const hourlyWage = 1200; // ₹1,200/hr benchmark post-tax wage

  const handleAddImpulse = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(newItemPrice);
    if (!newItemName.trim() || isNaN(p) || p <= 0) return;

    const updated = [
      ...frozenItems,
      {
        id: `imp_${Date.now()}`,
        name: newItemName.trim(),
        price: p,
        hoursLeft: 72,
      },
    ];
    setFrozenItems(updated);
    localStorage.setItem('wealthos_v4_impulse', JSON.stringify(updated));
    setNewItemName('');
    setNewItemPrice('');
    setShowAddImpulse(false);
  };

  const handleRemoveImpulse = (id: string) => {
    const updated = frozenItems.filter((item) => item.id !== id);
    setFrozenItems(updated);
    localStorage.setItem('wealthos_v4_impulse', JSON.stringify(updated));
  };

  // Find live accounts from ledger (Robust Matching)
  const bankAcc = accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK')) || accounts[0];
  const ccAcc = accounts.find((a) => a.id === 'acc_credit_card' || (a.account_type === 'LIABILITY' && a.account_subtype === 'CREDIT_CARD'));
  const foodAcc = accounts.find((a) => a.account_type === 'EXPENSE') || accounts[5];

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const handleMagicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicInput.trim()) return;

    const res = onExecuteCommand(magicInput.trim());
    setFeedback(res.message);
    if (res.success) {
      setMagicInput('');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 2-Column Bento Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.15fr) minmax(400px, 1.85fr)', gap: '24px' }}>
        
        {/* Left Column: Liquid Orb & Impulse Ice Vault */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Safe-to-Spend Liquid Orb */}
          <div className="glass orb-card">
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
              {mode === 'kid' ? "🌈 TODAY'S POCKET TREASURE" : mode === 'zen' ? "SAFE-TO-SPEND TODAY" : "LIQUIDITY-ADJUSTED DAILY OPEX ALLOWANCE"}
            </div>

            <div className="liquid-orb" onClick={onDropCoin} title="Tap to drop a ₹150 treat coin!">
              <div className={`orb-amount num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ color: '#ffffff' }}>
                {formatCurrency(safeToSpend.safeToSpendDailyMicro)}
              </div>
              <div className="orb-sub" style={{ color: '#c7d2fe' }}>
                {safeToSpend.safeToSpendDailyMicro > 0n ? "Tap Orb to Drop ₹150 Treat Coin! 🍦" : "Deposit funds to activate allowance"}
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.4 }}>
              {safeToSpend.safeToSpendDailyMicro > 0n
                ? "Auto-calculated: Liquid Cash minus upcoming fixed bills, credit statement dues & savings lock."
                : "Your balance is currently ₹0.00. Click below to record an opening deposit or salary!"}
            </p>

            {safeToSpend.safeToSpendDailyMicro === 0n && (
              <button
                onClick={onOpenDepositModal}
                className="btn-primary"
                style={{ marginTop: '14px', fontSize: '0.8rem', padding: '8px 16px' }}
              >
                <Plus size={14} />
                <span>Record Opening Deposit</span>
              </button>
            )}
          </div>

          {/* 🧊 72-Hour Impulse Cooling Vault */}
          <div className="glass" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Snowflake size={18} color="#38bdf8" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>72-Hour Impulse Cooling Vault</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddImpulse(!showAddImpulse)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--border-subtle)',
                  color: '#ffffff',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={13} />
                <span>Freeze Item</span>
              </button>
            </div>

            {/* Add Impulse Form */}
            {showAddImpulse && (
              <form onSubmit={handleAddImpulse} style={{ marginTop: '14px', padding: '12px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="What are you tempted to buy? (e.g. Smart Watch)"
                  className="input-field"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Price in ₹"
                    className="input-field"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
                    Freeze
                  </button>
                </div>
              </form>
            )}

            {/* List of Frozen Items */}
            {frozenItems.length === 0 ? (
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '14px 0 0', fontStyle: 'italic' }}>
                No impulse items frozen yet. Click "Freeze Item" whenever you're tempted to make a non-essential purchase!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                {frozenItems.map((item) => {
                  const hours = (item.price / hourlyWage).toFixed(1);
                  const compounded = Math.round(item.price * Math.pow(1 + 0.12, 10));

                  return (
                    <div key={item.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{item.name}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#fbbf24', marginTop: '2px' }}>
                            <span className={`num-mono ${isPrivate ? 'blur-num' : ''}`}>₹{item.price.toLocaleString('en-IN')}</span> • Requires <strong>{hours} hours</strong> of work
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveImpulse(item.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                          title="Unfreeze or cancel"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Trees size={14} />
                        <span>10-Yr Value @ 12% CAGR: <strong className={`num-mono ${isPrivate ? 'blur-num' : ''}`}>₹{compounded.toLocaleString('en-IN')}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 3D Jars & Live Double-Entry Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* 3D Wallets / Jars */}
          <div className="jars-grid">
            {/* Jar 1: Primary Bank */}
            <div className="glass jar-card">
              <div className="jar-icon">{mode === 'kid' ? '🐷' : '🏦'}</div>
              <div className="jar-title">
                {mode === 'kid' ? 'Giant Piggy Vault' : mode === 'zen' ? (bankAcc?.name || 'Primary Bank') : '1010 • Asset:Bank:Primary'}
              </div>
              <div className={`jar-val num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ color: '#34d399' }}>
                {bankAcc ? formatCurrency(bankAcc.balance_micro) : '₹0.00'}
              </div>
            </div>

            {/* Jar 2: CC Liability */}
            <div className="glass jar-card">
              <div className="jar-icon">{mode === 'kid' ? '🐉' : '💳'}</div>
              <div className="jar-title">
                {mode === 'kid' ? 'Borrowed Dragon Coins' : mode === 'zen' ? (ccAcc?.name || 'Credit Card') : '2010 • Liability:CC'}
              </div>
              <div className={`jar-val num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ color: '#fb7185' }}>
                {ccAcc ? formatCurrency(ccAcc.balance_micro) : '₹0.00'}
              </div>
            </div>

            {/* Jar 3: Expense Jar */}
            <div className="glass jar-card">
              <div className="jar-icon">{mode === 'kid' ? '🍭' : '🍕'}</div>
              <div className="jar-title">
                {mode === 'kid' ? 'Yummy Treats Jar' : mode === 'zen' ? (foodAcc?.name || 'Food & Dining') : '5020 • Expense:OpEx:Food'}
              </div>
              <div className={`jar-val num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ color: '#fbbf24' }}>
                {foodAcc ? formatCurrency(foodAcc.balance_micro) : '₹0.00'}
              </div>
            </div>
          </div>

          {/* Live Double-Entry Feed */}
          <div className="glass ledger-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                {mode === 'kid' 
                  ? "✨ Magic Coin Trail (Where Every Coin Flew!)" 
                  : mode === 'zen' 
                  ? "⚡ Smart Activity & Auto-Balanced Feed" 
                  : "📊 Strict Double-Entry Journal Inspector (ACID Micro-Units)"}
              </h3>
              <span className="badge badge-emerald">∑ Debits == ∑ Credits</span>
            </div>

            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                <Sparkles size={28} color="#818cf8" style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.7 }} />
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>Fresh &amp; Clean Scratch State</p>
                <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                  No transactions recorded yet. Use the Magic Command Bar below or record your opening deposit to post your first entry!
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Event / Narration</th>
                      <th>Debit Leg (Destination)</th>
                      <th>Credit Leg (Source)</th>
                      <th>Micro-Units (x10,000)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 6).map((tx) => {
                      const txPostings = postings.filter((p) => p.transaction_id === tx.id);
                      const debitPostings = txPostings.filter((p) => p.direction === 'DEBIT');
                      const creditPostings = txPostings.filter((p) => p.direction === 'CREDIT');
                      const totalMicro = debitPostings.reduce((sum, p) => sum + p.amount_micro, 0n);

                      return (
                        <tr key={tx.id}>
                          <td style={{ fontWeight: 600 }}>{tx.description}</td>
                          <td>
                            {debitPostings.map((p, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="badge-debit">DEBIT</span>
                                <span>{accountMap.get(p.account_id)?.name || p.account_id}</span>
                                <span className={`num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ fontSize: '0.75rem', color: '#34d399' }}>
                                  (+{formatCurrency(p.amount_micro)})
                                </span>
                              </div>
                            ))}
                          </td>
                          <td>
                            {creditPostings.map((p, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="badge-credit">CREDIT</span>
                                <span>{accountMap.get(p.account_id)?.name || p.account_id}</span>
                                <span className={`num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ fontSize: '0.75rem', color: '#c084fc' }}>
                                  (-{formatCurrency(p.amount_micro)})
                                </span>
                              </div>
                            ))}
                          </td>
                          <td className={`num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ color: 'var(--text-muted)' }}>
                            {totalMicro.toString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Magic Natural Language Command Pill at Bottom */}
      <div className="magic-bar">
        <span style={{ fontSize: '1.3rem' }}>🎙️</span>
        <form onSubmit={handleMagicSubmit} style={{ display: 'flex', flex: 1, gap: '10px' }}>
          <input
            className="magic-input"
            value={magicInput}
            onChange={(e) => setMagicInput(e.target.value)}
            placeholder="Type entry... e.g. 'Deposit 50000 opening cash' or 'Spent 300 on Lunch via Bank' or 'Pay 1500 to Credit Card'..."
          />
          <button type="submit" className="btn-action">
            <span>Magic Post ✨</span>
          </button>
        </form>
      </div>

      {feedback && (
        <div style={{
          position: 'fixed',
          bottom: '85px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid #10b981',
          color: '#34d399',
          padding: '8px 18px',
          borderRadius: '99px',
          fontSize: '0.8rem',
          zIndex: 60,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Sparkles size={14} />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
