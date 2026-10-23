import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  Sparkles, 
  Calendar, 
  CreditCard, 
  Wallet, 
  Landmark,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Check
} from 'lucide-react';
import { toMicroUnits, formatCurrency } from '../../core/financial-engine/microUnits';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';

export type TxType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', emoji: '🍔', color: '#F97316' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒', color: '#10B981' },
  { id: 'transport', label: 'Transport & Fuel', emoji: '🚗', color: '#3B82F6' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#EC4899' },
  { id: 'bills', label: 'Bills & Rent', emoji: '🏠', color: '#8B5CF6' },
  { id: 'health', label: 'Medical & Health', emoji: '💊', color: '#EF4444' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', color: '#F59E0B' },
  { id: 'education', label: 'Education', emoji: '📚', color: '#06B6D4' },
  { id: 'other', label: 'Other Expense', emoji: '📦', color: '#6B7280' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Salary', emoji: '💼', color: '#10B981' },
  { id: 'freelance', label: 'Freelance & Side', emoji: '💻', color: '#3B82F6' },
  { id: 'business', label: 'Business Inflow', emoji: '🏢', color: '#8B5CF6' },
  { id: 'investment', label: 'Dividends & Returns', emoji: '📈', color: '#F59E0B' },
  { id: 'gift', label: 'Gift / Cashback', emoji: '🎁', color: '#EC4899' },
  { id: 'other', label: 'Other Income', emoji: '💰', color: '#6B7280' },
];

export const TRANSFER_CATEGORIES = [
  { id: 'atm_withdraw', label: 'ATM Withdrawal (Bank → Cash)', emoji: '🏧', color: '#F59E0B', from: 'bank', to: 'cash' },
  { id: 'cash_deposit', label: 'Cash Deposit (Cash → Bank)', emoji: '🏦', color: '#10B981', from: 'cash', to: 'bank' },
  { id: 'cc_payment', label: 'Credit Card Bill Pay (Bank → Card)', emoji: '💳', color: '#6366F1', from: 'bank', to: 'card' },
  { id: 'investment_move', label: 'Invest in FD / Mutual Fund', emoji: '📈', color: '#06B6D4', from: 'bank', to: 'bank' },
  { id: 'friend_loan', label: 'Loan to / from Friend', emoji: '🤝', color: '#8B5CF6', from: 'bank', to: 'cash' },
  { id: 'self_transfer', label: 'Self Bank Transfer', emoji: '🔄', color: '#3B82F6', from: 'bank', to: 'bank' },
];

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TxType;
  onSaveTransaction: (tx: {
    type: TxType;
    category: string;
    amountMicro: bigint;
    note: string;
    paymentMode: 'bank' | 'cash' | 'card';
    fromAccount?: string;
    toAccount?: string;
    date: string;
  }) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'EXPENSE',
  onSaveTransaction,
}) => {
  const [txType, setTxType] = useState<TxType>(defaultType);
  const [selCategory, setSelCategory] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'bank' | 'cash' | 'card'>('bank');
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sync default type when opened
  React.useEffect(() => {
    if (isOpen) {
      setTxType(defaultType);
      setSelCategory('');
      setAmountStr('');
      setNote('');
      setErrorMsg('');
      setTxDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const currentCategories =
    txType === 'EXPENSE'
      ? EXPENSE_CATEGORIES
      : txType === 'INCOME'
      ? INCOME_CATEGORIES
      : TRANSFER_CATEGORIES;

  const handleQuickChip = (amt: number) => {
    soundAndVoice.playPillowTap();
    const cur = parseFloat(amountStr) || 0;
    setAmountStr(String(cur + amt));
    setErrorMsg('');
  };

  const handleSubmit = () => {
    const amt = parseFloat(amountStr);
    if (!amt || amt <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }
    const catObj = currentCategories.find((c) => c.id === selCategory);
    const catLabel = catObj?.label || (txType === 'TRANSFER' ? 'Transfer' : 'General');
    const finalDesc = note.trim() || catLabel;

    let fromAcc = 'acc_bank_primary';
    let toAcc = 'acc_cash_wallet';

    if (txType === 'TRANSFER' && catObj) {
      const t = catObj as any;
      if (t.from === 'cash') fromAcc = 'acc_cash_wallet';
      if (t.to === 'card') toAcc = 'acc_credit_card';
      if (t.to === 'bank') toAcc = 'acc_bank_primary';
    }

    onSaveTransaction({
      type: txType,
      category: catLabel,
      amountMicro: toMicroUnits(amt),
      note: finalDesc,
      paymentMode,
      fromAccount: fromAcc,
      toAccount: toAcc,
      date: new Date(txDate).toISOString(),
    });

    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 998,
        }}
      />

      {/* Modal Dialog */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(100vw, 560px)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          borderRadius: '28px 28px 0 0',
          padding: '20px 20px 40px',
          zIndex: 999,
          boxShadow: '0 -16px 50px rgba(0,0,0,0.5)',
          animation: 'slideUpPanel 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Drag Handle Indicator */}
        <div
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            background: 'var(--border-subtle)',
            margin: '0 auto 16px',
          }}
        />

        {/* Modal Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {txType === 'EXPENSE' ? '💸 New Expense' : txType === 'INCOME' ? '💰 New Income' : '🔄 New Transfer / Other'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px 12px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* 1. Transaction Type Segmented Switcher */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'var(--bg-card)',
            padding: '4px',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '18px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTxType('EXPENSE');
              setSelCategory('');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: txType === 'EXPENSE' ? 'linear-gradient(135deg, #EF4444, #F97316)' : 'transparent',
              color: txType === 'EXPENSE' ? '#FFF' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 6px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: txType === 'EXPENSE' ? '0 4px 12px rgba(239,68,68,0.4)' : 'none',
            }}
          >
            <span>💸</span>
            <span>Expense</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTxType('INCOME');
              setSelCategory('');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: txType === 'INCOME' ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
              color: txType === 'INCOME' ? '#FFF' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 6px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: txType === 'INCOME' ? '0 4px 12px rgba(16,185,129,0.4)' : 'none',
            }}
          >
            <span>💰</span>
            <span>Income</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTxType('TRANSFER');
              setSelCategory('');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: txType === 'TRANSFER' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
              color: txType === 'TRANSFER' ? '#FFF' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 6px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: txType === 'TRANSFER' ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
            }}
            title="Non-income & Non-expense internal transfers"
          >
            <span>🔄</span>
            <span>Transfer</span>
          </button>
        </div>

        {/* 2. Amount Input Hero */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Amount *
          </label>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: txType === 'EXPENSE' ? '#EF4444' : txType === 'INCOME' ? '#10B981' : '#6366F1',
              }}
            >
              ₹
            </span>
            <input
              autoFocus
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => {
                setAmountStr(e.target.value);
                setErrorMsg('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              style={{
                width: '100%',
                fontSize: '2rem',
                fontWeight: 800,
                background: 'var(--bg-card)',
                border: errorMsg ? '2px solid #EF4444' : '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '16px 16px 16px 46px',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {errorMsg && (
            <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '4px', fontWeight: 700 }}>
              {errorMsg}
            </p>
          )}

          {/* Quick Preset Amount Chips */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            {[100, 500, 1000, 2000, 5000].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleQuickChip(chip)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
              >
                +₹{chip.toLocaleString('en-IN')}
              </button>
            ))}
            {amountStr && (
              <button
                type="button"
                onClick={() => setAmountStr('')}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* 3. Category Selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Category *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {currentCategories.map((c) => {
              const isSelected = selCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelCategory(c.id);
                    soundAndVoice.playPillowTap();
                  }}
                  style={{
                    background: isSelected ? `${c.color}22` : 'var(--bg-card)',
                    border: isSelected ? `2px solid ${c.color}` : '1px solid var(--border-subtle)',
                    borderRadius: '14px',
                    padding: '12px 6px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.12s ease',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>{c.emoji}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? c.color : 'var(--text-primary)',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Payment Account Selector (for Expense & Income) */}
        {txType !== 'TRANSFER' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {txType === 'EXPENSE' ? 'Paid From' : 'Received In'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'bank', label: 'Bank / UPI', emoji: '🏦' },
                { id: 'cash', label: 'Cash Wallet', emoji: '💵' },
                { id: 'card', label: 'Credit Card', emoji: '💳' },
              ].map((m) => {
                const isSelected = paymentMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(m.id as any);
                      soundAndVoice.playPillowTap();
                    }}
                    style={{
                      background: isSelected ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                      border: isSelected ? '2px solid #6366F1' : '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '10px 4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{m.emoji}</span>
                    <span style={{ fontSize: '11px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#6366F1' : 'var(--text-muted)' }}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Note & Date Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '22px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Note / Description
            </label>
            <input
              type="text"
              placeholder={
                txType === 'EXPENSE'
                  ? 'e.g. Lunch with friends, groceries…'
                  : txType === 'INCOME'
                  ? 'e.g. October stipend, freelance…'
                  : 'e.g. ATM withdrawal, transfer…'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Date
            </label>
            <input
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '11px 10px',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* 6. Save Action Button */}
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            width: '100%',
            background:
              txType === 'EXPENSE'
                ? 'linear-gradient(135deg, #EF4444, #F97316)'
                : txType === 'INCOME'
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            border: 'none',
            borderRadius: '16px',
            padding: '16px',
            color: '#FFF',
            fontWeight: 800,
            fontSize: '1.05rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow:
              txType === 'EXPENSE'
                ? '0 6px 20px rgba(239,68,68,0.4)'
                : txType === 'INCOME'
                ? '0 6px 20px rgba(16,185,129,0.4)'
                : '0 6px 20px rgba(99,102,241,0.4)',
            transition: 'transform 0.12s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <span>
            {txType === 'EXPENSE' ? '💸 Save Expense' : txType === 'INCOME' ? '💰 Save Income' : '🔄 Save Transfer'}
          </span>
        </button>
      </div>
    </>
  );
};
