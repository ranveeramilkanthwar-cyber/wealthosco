import React, { useState } from 'react';
import { Wallet, Landmark, CreditCard, Sparkles, X, Check, ArrowRight } from 'lucide-react';
import { formatCurrency, toMicroUnits } from '../../core/financial-engine/microUnits';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';

interface InitialSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBalances: (params: {
    cashAmount: number;
    bankAmount: number;
    ccOutstanding: number;
  }) => void;
  currentCash?: number;
  currentBank?: number;
  currentCC?: number;
}

export const InitialSetupModal: React.FC<InitialSetupModalProps> = ({
  isOpen,
  onClose,
  onSaveBalances,
  currentCash = 0,
  currentBank = 0,
  currentCC = 0,
}) => {
  const [cashStr, setCashStr] = useState(currentCash ? String(currentCash) : '');
  const [bankStr, setBankStr] = useState(currentBank ? String(currentBank) : '');
  const [ccStr, setCcStr] = useState(currentCC ? String(currentCC) : '');

  if (!isOpen) return null;

  const handleQuickAdd = (type: 'cash' | 'bank', add: number) => {
    soundAndVoice.playPillowTap();
    if (type === 'cash') {
      const cur = parseFloat(cashStr) || 0;
      setCashStr(String(cur + add));
    } else {
      const cur = parseFloat(bankStr) || 0;
      setBankStr(String(cur + add));
    }
  };

  const handleSave = () => {
    const cash = Math.max(0, parseFloat(cashStr) || 0);
    const bank = Math.max(0, parseFloat(bankStr) || 0);
    const cc = Math.max(0, parseFloat(ccStr) || 0);

    onSaveBalances({
      cashAmount: cash,
      bankAmount: bank,
      ccOutstanding: cc,
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
          backdropFilter: 'blur(6px)',
          zIndex: 998,
        }}
      />

      {/* Modal Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(92vw, 480px)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '24px',
          zIndex: 999,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '24px' }}>🌱</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Set Starting Balances
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Zero demo data. Start fresh with your real cash &amp; bank accounts!
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px 10px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Section 1: Cash in Hand */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245,158,11,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              💵
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Cash in Hand
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Physical cash in wallet, purse, or drawer
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <span
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--text-secondary)',
              }}
            >
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={cashStr}
              onChange={(e) => setCashStr(e.target.value)}
              style={{
                width: '100%',
                fontSize: '1.4rem',
                fontWeight: 800,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 14px 12px 38px',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[500, 1000, 2000, 5000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAdd('cash', amt)}
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#F59E0B',
                  cursor: 'pointer',
                }}
              >
                +₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
            {cashStr && (
              <button
                type="button"
                onClick={() => setCashStr('')}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Section 2: Bank Account */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(59,130,246,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🏦
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Primary Bank Account / UPI
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Savings account balance (SBI, HDFC, ICICI, etc.)
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <span
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--text-secondary)',
              }}
            >
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={bankStr}
              onChange={(e) => setBankStr(e.target.value)}
              style={{
                width: '100%',
                fontSize: '1.4rem',
                fontWeight: 800,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '12px 14px 12px 38px',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[10000, 25000, 50000, 100000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAdd('bank', amt)}
                style={{
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#3B82F6',
                  cursor: 'pointer',
                }}
              >
                +₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
            {bankStr && (
              <button
                type="button"
                onClick={() => setBankStr('')}
                style={{
                  background: 'transparent',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Section 3 (Optional): Credit Card Dues */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '14px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              💳
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Credit Card Outstanding (Optional)
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Current unbilled dues or statement balance
              </div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--text-secondary)',
              }}
            >
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00 (leave blank if none)"
              value={ccStr}
              onChange={(e) => setCcStr(e.target.value)}
              style={{
                width: '100%',
                fontSize: '1rem',
                fontWeight: 700,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '10px 12px 10px 32px',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleSave}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: 'none',
              borderRadius: '16px',
              padding: '16px',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Sparkles size={18} />
            <span>Save &amp; Start Tracking</span>
          </button>

          <button
            onClick={onClose}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '12px',
              color: 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Skip for now (Start with ₹0)
          </button>
        </div>
      </div>
    </>
  );
};
