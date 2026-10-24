import React, { useState } from 'react';
import { 
  X, 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  DollarSign, 
  User, 
  Landmark, 
  Wallet,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';

export type OtherFlowMode = 
  | 'SOMEONE_PAID_FOR_ME' 
  | 'PAID_FOR_SOMEONE_ELSE' 
  | 'REMAINING_TO_RECEIVE' 
  | 'SETTLEMENT_RECEIVED';

interface OtherFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: OtherFlowMode;
  pendingRecords?: any[];
  onRecordFlow: (data: {
    mode: OtherFlowMode;
    personName: string;
    amount: number;
    description: string;
    category: string;
    paymentAccount: string;
    dueDate?: string;
    settledRecordId?: string;
  }) => void;
}

export const OtherFlowModal: React.FC<OtherFlowModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'SOMEONE_PAID_FOR_ME',
  pendingRecords = [],
  onRecordFlow,
}) => {
  const [mode, setMode] = useState<OtherFlowMode>(defaultMode);
  const [personName, setPersonName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Friend & Colleague');
  const [paymentAccount, setPaymentAccount] = useState<'Bank / UPI' | 'Cash'>('Bank / UPI');
  const [dueDate, setDueDate] = useState('');
  const [selectedPendingId, setSelectedPendingId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountStr);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount in ₹');
      return;
    }
    if (!personName.trim()) {
      alert('Please enter the other person’s name (e.g. Rahul, Priya, Boss)');
      return;
    }

    soundAndVoice.playSuccessChime();

    onRecordFlow({
      mode,
      personName: personName.trim(),
      amount: amt,
      description: description.trim() || getDefaultDesc(mode, personName.trim()),
      category,
      paymentAccount,
      dueDate,
      settledRecordId: selectedPendingId || undefined,
    });

    onClose();
  };

  const getDefaultDesc = (m: OtherFlowMode, person: string) => {
    switch (m) {
      case 'SOMEONE_PAID_FOR_ME':
        return `Paid on my behalf by ${person} (I owe them)`;
      case 'PAID_FOR_SOMEONE_ELSE':
        return `Paid for ${person} on their behalf (To be received)`;
      case 'REMAINING_TO_RECEIVE':
        return `Remaining money to come from ${person}`;
      case 'SETTLEMENT_RECEIVED':
        return `Settlement / Repayment received from ${person}`;
    }
  };

  const handleSelectPending = (recId: string) => {
    setSelectedPendingId(recId);
    const rec = pendingRecords.find((r) => r.id === recId);
    if (rec) {
      setPersonName(rec.personName || '');
      const remaining = rec.remainingAmount !== undefined ? rec.remainingAmount : rec.amount;
      setAmountStr(remaining.toString());
      setDescription(`Settled: ${rec.description || ''}`);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 16, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 999,
        }}
      />

      {/* Modal Dialog */}
      <div
        className="glass-panel"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(94vw, 540px)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          border: '1.5px solid rgba(99,102,241,0.3)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          padding: '24px',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F97316, #EC4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
              }}
            >
              🤝
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Other Expense &amp; Income
              </h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
                Track peer settlements, behalf payments &amp; pending money
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 4 Mode Pills */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '20px',
            background: 'rgba(0,0,0,0.2)',
            padding: '6px',
            borderRadius: '16px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('SOMEONE_PAID_FOR_ME');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: mode === 'SOMEONE_PAID_FOR_ME' ? 'linear-gradient(135deg, #EF4444, #F97316)' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 8px',
              color: mode === 'SOMEONE_PAID_FOR_ME' ? '#FFF' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>💸 Someone Paid For Me</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('PAID_FOR_SOMEONE_ELSE');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: mode === 'PAID_FOR_SOMEONE_ELSE' ? 'linear-gradient(135deg, #F59E0B, #EA580C)' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 8px',
              color: mode === 'PAID_FOR_SOMEONE_ELSE' ? '#FFF' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📤 I Paid For Someone</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('REMAINING_TO_RECEIVE');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: mode === 'REMAINING_TO_RECEIVE' ? 'linear-gradient(135deg, #06B6D4, #3B82F6)' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 8px',
              color: mode === 'REMAINING_TO_RECEIVE' ? '#FFF' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⏳ Money To Receive</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('SETTLEMENT_RECEIVED');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: mode === 'SETTLEMENT_RECEIVED' ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 8px',
              color: mode === 'SETTLEMENT_RECEIVED' ? '#FFF' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>💰 Settle / Received</span>
          </button>
        </div>

        {/* Explain Criteria Context */}
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '18px',
            fontSize: '0.8rem',
            lineHeight: 1.4,
          }}
        >
          {mode === 'SOMEONE_PAID_FOR_ME' && (
            <div>
              <strong style={{ color: '#F97316' }}>Other Expense (You Owe):</strong> A friend, roommate, or colleague paid a bill/expense for you. Records as an expense for you and adds a pending debt to pay them back.
            </div>
          )}
          {mode === 'PAID_FOR_SOMEONE_ELSE' && (
            <div>
              <strong style={{ color: '#F59E0B' }}>Other Expense (Pending Recovery):</strong> You paid money out of your account on behalf of someone else. Deducts from your cash/bank and adds an outstanding receivable.
            </div>
          )}
          {mode === 'REMAINING_TO_RECEIVE' && (
            <div>
              <strong style={{ color: '#38BDF8' }}>Other Income Criteria:</strong> Record money someone already owes you (e.g. past dinner split, trip share, or pending balance) that is yet to come.
            </div>
          )}
          {mode === 'SETTLEMENT_RECEIVED' && (
            <div>
              <strong style={{ color: '#34D399' }}>Other Income (Settlement):</strong> A friend paid back money they owed you. Increases your bank or cash account and clears their pending due!
            </div>
          )}
        </div>

        {/* Quick select from active pending list (if in settlement mode) */}
        {mode === 'SETTLEMENT_RECEIVED' && pendingRecords.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Select Pending Item to Settle (Optional):
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {pendingRecords.map((rec) => {
                const rem = rec.remainingAmount !== undefined ? rec.remainingAmount : rec.amount;
                const isSelected = selectedPendingId === rec.id;
                return (
                  <div
                    key={rec.id}
                    onClick={() => handleSelectPending(rec.id)}
                    style={{
                      background: isSelected ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.04)',
                      border: isSelected ? '1.5px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{rec.personName || 'Peer'} • {rec.description}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{rec.date} • {rec.type}</div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#34D399' }}>₹{rem.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Person Name & Amount */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Other Person's Name *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul, Priya, Boss"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '10px 12px 10px 34px',
                    color: '#FFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <User size={15} style={{ position: 'absolute', left: 10, top: 13, color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Amount (₹) *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '10px 12px 10px 30px',
                    color: '#FFF',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    outline: 'none',
                  }}
                />
                <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)', fontWeight: 800 }}>₹</span>
              </div>
            </div>
          </div>

          {/* Description / Purpose */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              What was it for? (Purpose / Note)
            </label>
            <input
              type="text"
              placeholder={getDefaultDesc(mode, personName || 'Friend')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '10px 12px',
                color: '#FFF',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Category & Payment Account */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '10px 10px',
                  color: '#FFF',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              >
                <option value="Friend & Colleague">Friend &amp; Colleague</option>
                <option value="Food & Dining">Food &amp; Dining</option>
                <option value="Travel & Cab">Travel &amp; Cab</option>
                <option value="Shared House & Rent">Shared House &amp; Rent</option>
                <option value="Office & Business">Office &amp; Business</option>
                <option value="Family & Household">Family &amp; Household</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                {mode === 'SOMEONE_PAID_FOR_ME' ? 'Settlement Mode' : mode === 'SETTLEMENT_RECEIVED' ? 'Deposit To Account' : 'Paid From Account'}
              </label>
              <select
                value={paymentAccount}
                onChange={(e) => setPaymentAccount(e.target.value as any)}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '10px 10px',
                  color: '#FFF',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              >
                <option value="Bank / UPI">🏦 Bank / UPI</option>
                <option value="Cash">💵 Cash in Hand</option>
              </select>
            </div>
          </div>

          {/* Expected Return Date (optional) */}
          {(mode === 'PAID_FOR_SOMEONE_ELSE' || mode === 'REMAINING_TO_RECEIVE') && (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Expected Return Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '9px 12px',
                  color: '#FFF',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            style={{
              background: mode === 'SETTLEMENT_RECEIVED' 
                ? 'linear-gradient(135deg, #10B981, #059669)' 
                : mode === 'REMAINING_TO_RECEIVE'
                ? 'linear-gradient(135deg, #06B6D4, #3B82F6)'
                : 'linear-gradient(135deg, #F97316, #EC4899)',
              border: 'none',
              borderRadius: '16px',
              padding: '14px',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(249,115,22,0.3)',
              marginTop: '6px',
              transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <Sparkles size={16} />
            <span>
              {mode === 'SOMEONE_PAID_FOR_ME' && 'Save Other Expense (I Owe)'}
              {mode === 'PAID_FOR_SOMEONE_ELSE' && 'Record Paid on Behalf (Receivable)'}
              {mode === 'REMAINING_TO_RECEIVE' && 'Record Money To Come From Other'}
              {mode === 'SETTLEMENT_RECEIVED' && 'Record Settlement Inflow (Received)'}
            </span>
          </button>
        </form>
      </div>
    </>
  );
};
