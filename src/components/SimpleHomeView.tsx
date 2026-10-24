import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowLeftRight, 
  Sparkles, 
  Wallet, 
  Landmark, 
  CreditCard, 
  History, 
  Settings, 
  Volume2, 
  CheckSquare, 
  TrendingUp, 
  TrendingDown,
  RotateCcw,
  Check,
  ExternalLink,
  FileSpreadsheet,
  Save,
  Link as LinkIcon,
  Edit3,
  Users,
  CheckCircle2,
  Clock,
  ArrowDownLeft
} from 'lucide-react';
import { formatCurrency, fromMicroUnits, toMicroUnits } from '../../core/financial-engine/microUnits';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';
import { Account, Transaction, LedgerPosting } from '../../core/financial-engine/types';
import { UserProfile } from '../../core/auth/authEngine';
import { getUserSheetUrl, saveUserSheetUrl, getUserSheetRecords, getPendingPeerBalances, settlePeerRecord } from '../../core/financial-engine/storage';

interface SimpleHomeViewProps {
  isPrivate: boolean;
  accounts: Account[];
  transactions: Transaction[];
  postings: LedgerPosting[];
  safeToSpend: any;
  onRecordQuickExpense: (categoryName: string, amountMicro: bigint, note: string, paymentMode?: string) => void;
  onRecordDeposit: (amountMicro: bigint, note: string) => void;
  onPayBill: (billName: string, amountMicro: bigint) => void;
  onRecordTransfer: (categoryName: string, amountMicro: bigint, note: string, fromAccId?: string, toAccId?: string) => void;
  onUndoLastAction: () => void;
  lastActionMessage: string | null;
  onNavigateTab: (tab: any) => void;
  onOpenSetupModal: () => void;
  onOpenAddModal: (type?: 'EXPENSE' | 'INCOME' | 'TRANSFER') => void;
  isInitialSetupDone?: boolean;
  currentUser?: UserProfile | null;
  onOpenSheetModal?: () => void;
  onOpenProfileModal?: () => void;
  onOpenOtherFlowModal?: (mode?: 'SOMEONE_PAID_FOR_ME' | 'PAID_FOR_SOMEONE_ELSE' | 'REMAINING_TO_RECEIVE' | 'SETTLEMENT_RECEIVED') => void;
  onSettlePeerFlow?: (recordId: string, amount: number, personName: string) => void;
}

export const SimpleHomeView: React.FC<SimpleHomeViewProps> = ({
  isPrivate,
  accounts,
  transactions,
  postings,
  safeToSpend,
  onRecordQuickExpense,
  onRecordDeposit,
  onPayBill,
  onRecordTransfer,
  onUndoLastAction,
  lastActionMessage,
  onNavigateTab,
  onOpenSetupModal,
  onOpenAddModal,
  isInitialSetupDone,
  currentUser,
  onOpenSheetModal,
  onOpenProfileModal,
  onOpenOtherFlowModal,
  onSettlePeerFlow,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [homeSheetUrl, setHomeSheetUrl] = useState(() => (currentUser ? getUserSheetUrl(currentUser.id) : ''));
  const [homeSheetSaved, setHomeSheetSaved] = useState(false);
  const [showSheetInput, setShowSheetInput] = useState(false);

  const handleSaveHomeSheetUrl = () => {
    if (!currentUser) return;
    soundAndVoice.playPillowTap();
    saveUserSheetUrl(currentUser.id, homeSheetUrl);
    setHomeSheetSaved(true);
    setTimeout(() => setHomeSheetSaved(false), 2500);
  };

  // Balances (Robust Matching)
  const bankAcc = accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK')) || accounts[0];
  const cashAcc = accounts.find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH')) || accounts[1];
  const ccAcc = accounts.find((a) => a.id === 'acc_credit_card' || (a.account_type === 'LIABILITY' && a.account_subtype === 'CREDIT_CARD'));

  const bankBalance = bankAcc ? bankAcc.balance_micro : 0n;
  const cashBalance = cashAcc ? cashAcc.balance_micro : 0n;
  const totalLiquid = bankBalance + cashBalance;
  const ccBalance = ccAcc ? ccAcc.balance_micro : 0n;

  // Monthly Income & Expenses (excluding transfers)
  const totalIncome = useMemo(() => {
    return accounts.filter((a) => a.account_type === 'INCOME').reduce((s, a) => s + a.balance_micro, 0n);
  }, [accounts]);

  const totalExpense = useMemo(() => {
    return accounts.filter((a) => a.account_type === 'EXPENSE').reduce((s, a) => s + a.balance_micro, 0n);
  }, [accounts]);

  const netSavingsMicro = useMemo(() => {
    return totalIncome - totalExpense;
  }, [totalIncome, totalExpense]);

  // Peer Flow Balances & Scenarios (Other Expense & Other Income)
  const peerRecords = useMemo(() => {
    return currentUser ? getUserSheetRecords(currentUser.id) : [];
  }, [currentUser, transactions]);

  const otherExpenses = useMemo(() => {
    return peerRecords.filter((r) => r.type === 'OTHER_EXPENSE');
  }, [peerRecords]);

  const otherIncomes = useMemo(() => {
    return peerRecords.filter((r) => r.type === 'OTHER_INCOME');
  }, [peerRecords]);

  const totalOtherExpenseVal = useMemo(() => {
    return otherExpenses.reduce((s, r) => s + (r.amount || 0), 0);
  }, [otherExpenses]);

  const totalOtherIncomeVal = useMemo(() => {
    return otherIncomes.reduce((s, r) => s + (r.amount || 0), 0);
  }, [otherIncomes]);

  const pendingPeerBalances = useMemo(() => {
    return currentUser ? getPendingPeerBalances(currentUser.id) : { pendingToReceive: [], pendingToPay: [], totalToReceive: 0, totalToPay: 0, netPeerBalance: 0 };
  }, [currentUser, peerRecords]);

  // Filtered recent transactions
  const recentTransactions = useMemo(() => {
    let list = [...transactions].reverse();
    if (filterType === 'EXPENSE') list = list.filter((t) => t.transaction_type === 'EXPENSE');
    else if (filterType === 'INCOME') list = list.filter((t) => t.transaction_type === 'INCOME');
    else if (filterType === 'TRANSFER')
      list = list.filter((t) => t.transaction_type === 'TRANSFER' || t.transaction_type === 'ADJUSTMENT');
    return list.slice(0, 15);
  }, [transactions, filterType]);

  const hide = (val: bigint) => (isPrivate ? '₹ •••••' : formatCurrency(val));

  const getTxMeta = (tx: Transaction) => {
    const desc = (tx.description || '').toLowerCase();
    if (tx.transaction_type === 'TRANSFER') {
      if (desc.includes('atm')) return { emoji: '🏧', color: '#F59E0B' };
      if (desc.includes('deposit')) return { emoji: '🏦', color: '#10B981' };
      if (desc.includes('credit card') || desc.includes('bill')) return { emoji: '💳', color: '#6366F1' };
      if (desc.includes('initial') || desc.includes('starting')) return { emoji: '🌱', color: '#06B6D4' };
      return { emoji: '🔄', color: '#6366F1' };
    }
    if (tx.transaction_type === 'INCOME') {
      if (desc.includes('salary')) return { emoji: '💼', color: '#10B981' };
      if (desc.includes('freelance')) return { emoji: '💻', color: '#3B82F6' };
      if (desc.includes('investment')) return { emoji: '📈', color: '#F59E0B' };
      return { emoji: '💰', color: '#10B981' };
    }
    if (desc.includes('food') || desc.includes('lunch') || desc.includes('dinner') || desc.includes('chai'))
      return { emoji: '🍔', color: '#F97316' };
    if (desc.includes('grocer') || desc.includes('blinkit')) return { emoji: '🛒', color: '#10B981' };
    if (desc.includes('cab') || desc.includes('auto') || desc.includes('petrol')) return { emoji: '🚗', color: '#3B82F6' };
    if (desc.includes('shopping')) return { emoji: '🛍️', color: '#EC4899' };
    if (desc.includes('rent') || desc.includes('bill')) return { emoji: '🏠', color: '#8B5CF6' };
    return { emoji: '💸', color: '#EF4444' };
  };

  const getTxAmount = (tx: Transaction) => {
    const txPostings = postings.filter((p) => p.transaction_id === tx.id);
    if (txPostings.length === 0) return 0n;
    return txPostings[0].amount_micro;
  };

  // Voice Safe-to-Spend
  const handleVoiceListen = () => {
    soundAndVoice.playPillowTap();
    const liquidNum = fromMicroUnits(totalLiquid);
    const incNum = fromMicroUnits(totalIncome);
    const expNum = fromMicroUnits(totalExpense);
    soundAndVoice.speakAloud(
      `Your total available money is ${liquidNum} rupees. In your bank account, you have ${fromMicroUnits(
        bankBalance
      )} rupees. In cash, you have ${fromMicroUnits(
        cashBalance
      )} rupees. Total monthly expenses so far are ${expNum} rupees.`
    );
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Starting Balance Prompt Banner (if no balance set) */}
      {!isInitialSetupDone && transactions.length === 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
            border: '2px dashed rgba(99,102,241,0.4)',
            borderRadius: '20px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>🌱</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Welcome! Set your Starting Balances
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Enter your real Cash in Hand &amp; Bank Account to begin from scratch.
              </div>
            </div>
          </div>
          <button
            onClick={onOpenSetupModal}
            style={{
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 18px',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            <span>Set Starting Balances</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Hero Balance Card */}
      <div
        style={{
          background: 'linear-gradient(145deg, #6366F1 0%, #8B5CF6 60%, #A78BFA 100%)',
          borderRadius: '28px',
          padding: '28px 24px 22px',
          boxShadow: '0 16px 45px rgba(99,102,241,0.38)',
          position: 'relative',
          overflow: 'hidden',
          color: '#FFF',
        }}
      >
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        <div style={{ position: 'relative' }}>
          {/* Header Row of Hero */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.85 }}>
              Total Available Money
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleVoiceListen}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  color: '#FFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
                title="Listen to balance aloud"
              >
                <Volume2 size={14} />
                <span>Listen</span>
              </button>
              <button
                onClick={onOpenProfileModal || onOpenSetupModal}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  color: '#FFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
                title="Edit initial cash/bank balances & manage profile"
              >
                <Settings size={13} />
                <span>Edit Initial</span>
              </button>
            </div>
          </div>

          {/* Big Amount */}
          <h1 style={{ fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.1, margin: '0 0 22px 0', letterSpacing: '-0.02em' }}>
            {hide(totalLiquid)}
          </h1>

          {/* Account Sub-Cards: Bank & Cash (Clickable to Edit Starting Balances) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              onClick={onOpenProfileModal || onOpenSetupModal}
              title="Click to view or calibrate Bank Balance"
              style={{
                background: 'rgba(255,255,255,0.14)',
                borderRadius: '16px',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9, fontSize: '0.75rem', fontWeight: 700 }}>
                  <span>🏦</span>
                  <span>Bank / UPI</span>
                </div>
                <Edit3 size={12} style={{ opacity: 0.7 }} />
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{hide(bankBalance)}</div>
            </div>

            <div
              onClick={onOpenProfileModal || onOpenSetupModal}
              title="Click to view or calibrate Cash in Hand"
              style={{
                background: 'rgba(255,255,255,0.14)',
                borderRadius: '16px',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9, fontSize: '0.75rem', fontWeight: 700 }}>
                  <span>💵</span>
                  <span>Cash in Hand</span>
                </div>
                <Edit3 size={12} style={{ opacity: 0.7 }} />
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{hide(cashBalance)}</div>
            </div>
          </div>

          {/* Mathematical Connection: Bank + Cash = Total Liquid In Hand */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '14px',
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.22)',
            borderRadius: '12px',
            fontSize: '0.78rem',
            fontWeight: 700,
            flexWrap: 'wrap',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span>🏦 Bank</span> <strong className="num-mono">{hide(bankBalance)}</strong>
            </span>
            <span style={{ color: '#A7F3D0', fontWeight: 900, fontSize: '0.95rem' }}>+</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span>💵 Cash</span> <strong className="num-mono">{hide(cashBalance)}</strong>
            </span>
            <span style={{ color: '#FEF08A', fontWeight: 900, fontSize: '0.95rem' }}>=</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.16)', padding: '2px 8px', borderRadius: '8px' }}>
              <span>💰 Total In Hand</span> <strong className="num-mono">{hide(totalLiquid)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Inflow & Outflow Summary with Net Savings Equation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '10px' }}>
          {/* Card 1: Income */}
          <div
            onClick={() => onNavigateTab('ledger')}
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1.5px solid rgba(16,185,129,0.25)',
              borderRadius: '20px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16,185,129,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16,185,129,0.08)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10B981', letterSpacing: '0.05em' }}>
                ↑ INCOME
              </span>
              <span style={{ fontSize: '13px' }}>💰</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981' }}>
              {hide(totalIncome)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Earned inflows
            </div>
          </div>

          {/* Card 2: Expenses */}
          <div
            onClick={() => onNavigateTab('ledger')}
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1.5px solid rgba(239,68,68,0.25)',
              borderRadius: '20px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EF4444', letterSpacing: '0.05em' }}>
                ↓ EXPENSES
              </span>
              <span style={{ fontSize: '13px' }}>💸</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#EF4444' }}>
              {hide(totalExpense)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Out-of-pocket
            </div>
          </div>

          {/* Card 3: Net Savings */}
          <div
            onClick={() => onNavigateTab('ledger')}
            style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1.5px solid rgba(99,102,241,0.25)',
              borderRadius: '20px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#818CF8', letterSpacing: '0.05em' }}>
                = NET SAVINGS
              </span>
              <span style={{ fontSize: '13px' }}>⚖️</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: netSavingsMicro >= 0n ? '#818CF8' : '#F87171' }}>
              {hide(netSavingsMicro)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Income - Expenses
            </div>
          </div>
        </div>

        {/* Mathematical Equation Ribbon: Income - Expense = Net Savings */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '8px 14px',
          fontSize: '0.76rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
        }}>
          <span style={{ color: '#10B981' }}>📈 Income (+{hide(totalIncome)})</span>
          <span style={{ color: '#EF4444', fontWeight: 900, fontSize: '0.95rem' }}>-</span>
          <span style={{ color: '#EF4444' }}>💸 Expenses (-{hide(totalExpense)})</span>
          <span style={{ color: '#818CF8', fontWeight: 900, fontSize: '0.95rem' }}>=</span>
          <span style={{ color: '#818CF8', background: 'rgba(99,102,241,0.14)', padding: '2px 8px', borderRadius: '6px' }}>
            💰 Net Savings (={hide(netSavingsMicro)})
          </span>
        </div>
      </div>

      {/* 3 Big Action Buttons: Expense, Income, Transfer */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Quick Record
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          
          {/* 1. Add Expense */}
          <button
            onClick={() => onOpenAddModal('EXPENSE')}
            style={{
              background: 'linear-gradient(135deg, #EF4444, #F97316)',
              border: 'none',
              borderRadius: '20px',
              padding: '18px 8px',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 6px 20px rgba(239,68,68,0.35)',
              transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
          >
            <span style={{ fontSize: '26px' }}>💸</span>
            <span>Expense</span>
          </button>

          {/* 2. Add Income */}
          <button
            onClick={() => onOpenAddModal('INCOME')}
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              borderRadius: '20px',
              padding: '18px 8px',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 6px 20px rgba(16,185,129,0.35)',
              transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
          >
            <span style={{ fontSize: '26px' }}>💰</span>
            <span>Income</span>
          </button>

          {/* 3. Add Transfer */}
          <button
            onClick={() => onOpenAddModal('TRANSFER')}
            style={{
              background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: 'none',
              borderRadius: '20px',
              padding: '18px 8px',
              color: '#FFF',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 6px 20px rgba(99,102,241,0.35)',
              transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0) scale(1)')}
            title="ATM withdrawal, cash deposit, card payment (neither expense nor income)"
          >
            <span style={{ fontSize: '26px' }}>🔄</span>
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* ─── 🤝 Peer & Other Financial Flows (Other Expense & Other Income Criteria) ─── */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1.5px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '20px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🤝</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Peer &amp; Other Financial Flows
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Other Expenses (behalf payments) &amp; Other Income (remaining to come)
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenOtherFlowModal && onOpenOtherFlowModal('SOMEONE_PAID_FOR_ME')}
            style={{
              background: 'linear-gradient(135deg, #F97316, #EC4899)',
              border: 'none',
              borderRadius: '12px',
              padding: '6px 12px',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(249,115,22,0.3)',
            }}
          >
            <span>+ Add Flow</span>
          </button>
        </div>

        {/* 2 Criteria Cards: Other Expense & Other Income */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          
          {/* Criteria 1: Other Expense */}
          <div
            onClick={() => onOpenOtherFlowModal && onOpenOtherFlowModal('SOMEONE_PAID_FOR_ME')}
            style={{
              background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.12), rgba(239, 68, 68, 0.08))',
              border: '1.5px solid rgba(234, 88, 12, 0.3)',
              borderRadius: '18px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FB923C', textTransform: 'uppercase' }}>
                Other Expense
              </span>
              <span style={{ fontSize: '13px' }}>💸</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FB923C' }}>
              ₹{totalOtherExpenseVal.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {pendingPeerBalances.totalToPay > 0
                ? `You owe: ₹${pendingPeerBalances.totalToPay.toFixed(2)}`
                : 'Paid on behalf & shared splits'}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOtherFlowModal && onOpenOtherFlowModal('SOMEONE_PAID_FOR_ME');
                }}
                style={{
                  flex: 1,
                  background: 'rgba(234, 88, 12, 0.25)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 4px',
                  color: '#FFF',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + Paid For Me
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOtherFlowModal && onOpenOtherFlowModal('PAID_FOR_SOMEONE_ELSE');
                }}
                style={{
                  flex: 1,
                  background: 'rgba(234, 88, 12, 0.25)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 4px',
                  color: '#FFF',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + For Other
              </button>
            </div>
          </div>

          {/* Criteria 2: Other Income */}
          <div
            onClick={() => onOpenOtherFlowModal && onOpenOtherFlowModal('REMAINING_TO_RECEIVE')}
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(16, 185, 129, 0.08))',
              border: '1.5px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '18px',
              padding: '14px',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase' }}>
                Other Income
              </span>
              <span style={{ fontSize: '13px' }}>⏳</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38BDF8' }}>
              ₹{(totalOtherIncomeVal + pendingPeerBalances.totalToReceive).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {pendingPeerBalances.totalToReceive > 0
                ? `To collect: ₹${pendingPeerBalances.totalToReceive.toFixed(2)}`
                : 'Pending returns & collections'}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOtherFlowModal && onOpenOtherFlowModal('REMAINING_TO_RECEIVE');
                }}
                style={{
                  flex: 1,
                  background: 'rgba(6, 182, 212, 0.25)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 4px',
                  color: '#FFF',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + To Receive
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenOtherFlowModal && onOpenOtherFlowModal('SETTLEMENT_RECEIVED');
                }}
                style={{
                  flex: 1,
                  background: 'rgba(16, 185, 129, 0.25)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '5px 4px',
                  color: '#FFF',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + Settle Up
              </button>
            </div>
          </div>
        </div>

        {/* Peer Financial Equation: Pending to Receive - Pending to Pay = Net Peer Position */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.22)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '8px 14px',
          fontSize: '0.76rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
          marginBottom: '14px',
        }}>
          <span style={{ color: '#38BDF8' }}>📥 To Receive (+₹{pendingPeerBalances.totalToReceive.toFixed(2)})</span>
          <span style={{ color: '#FB923C', fontWeight: 900, fontSize: '0.95rem' }}>-</span>
          <span style={{ color: '#FB923C' }}>📤 To Pay (-₹{pendingPeerBalances.totalToPay.toFixed(2)})</span>
          <span style={{ color: '#A78BFA', fontWeight: 900, fontSize: '0.95rem' }}>=</span>
          <span style={{
            color: pendingPeerBalances.netPeerBalance >= 0 ? '#34D399' : '#FB7185',
            background: pendingPeerBalances.netPeerBalance >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            padding: '2px 8px',
            borderRadius: '6px'
          }}>
            ⚖️ Net Peer Position (={pendingPeerBalances.netPeerBalance >= 0 ? '+' : ''}₹{pendingPeerBalances.netPeerBalance.toFixed(2)})
          </span>
        </div>

        {/* Active Pending Peer Debts & Receivables List */}
        {(pendingPeerBalances.pendingToReceive.length > 0 || pendingPeerBalances.pendingToPay.length > 0) && (
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '12px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} color="#F59E0B" />
              <span>ACTIVE PENDING SETTLEMENTS ({pendingPeerBalances.pendingToReceive.length + pendingPeerBalances.pendingToPay.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {/* To Receive */}
              {pendingPeerBalances.pendingToReceive.map((rec) => {
                const rem = rec.remainingAmount !== undefined ? rec.remainingAmount : rec.amount;
                return (
                  <div
                    key={rec.id}
                    style={{
                      background: 'rgba(6, 182, 212, 0.08)',
                      border: '1px solid rgba(6, 182, 212, 0.2)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        {rec.personName || 'Peer'} • {rec.description}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#38BDF8' }}>
                        ⏳ Remaining to receive from {rec.personName}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, color: '#34D399', fontSize: '0.85rem' }}>
                        +₹{rem.toFixed(2)}
                      </span>
                      <button
                        onClick={() => onSettlePeerFlow && onSettlePeerFlow(rec.id, rem, rec.personName || 'Peer')}
                        style={{
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '5px 9px',
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        <span>Received</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* To Pay */}
              {pendingPeerBalances.pendingToPay.map((rec) => {
                const rem = rec.remainingAmount !== undefined ? rec.remainingAmount : rec.amount;
                return (
                  <div
                    key={rec.id}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        {rec.personName || 'Peer'} • {rec.description}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#F87171' }}>
                        💸 You owe {rec.personName} (paid on your behalf)
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, color: '#EF4444', fontSize: '0.85rem' }}>
                        -₹{rem.toFixed(2)}
                      </span>
                      <button
                        onClick={() => onSettlePeerFlow && onSettlePeerFlow(rec.id, rem, rec.personName || 'Peer')}
                        style={{
                          background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '5px 9px',
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <CheckCircle2 size={12} />
                        <span>Settle</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* TickPocket Zero-Typing Checkbox Banner */}
      <div
        onClick={() => onNavigateTab('tickpocket')}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '20px',
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'rgba(16,185,129,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            ☑️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              TickPocket Checkbox Mode
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Zero typing • Tap tick marks &amp; export directly to Excel / Sheets
            </div>
          </div>
        </div>
        <span style={{ color: 'var(--accent-indigo)', fontWeight: 800, fontSize: '0.9rem' }}>Open →</span>
      </div>

      {/* User Personal Excel & Google Sheet Sync Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.08))',
          border: '1.5px solid rgba(16, 185, 129, 0.28)',
          borderRadius: '20px',
          padding: '16px 20px',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              📊
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                {currentUser?.name ? `${currentUser.name}’s Personal Google Sheet & Excel` : 'Personal Google Sheet & Excel'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {homeSheetUrl ? '🟢 Connected • Every transaction automatically syncs to your personal cloud sheet' : '⚠️ Connect your sheet link to store and sync all transactions'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {homeSheetUrl && (
              <button
                type="button"
                onClick={() => window.open(homeSheetUrl, '_blank')}
                style={{
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  color: '#34D399',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <ExternalLink size={13} />
                <span>Open Sheet</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSheetInput(!showSheetInput)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: '10px',
                padding: '7px 12px',
                color: 'var(--text-primary)',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              {showSheetInput ? 'Hide' : homeSheetUrl ? 'Edit Link' : '🔗 Link Sheet'}
            </button>

            {onOpenSheetModal && (
              <button
                type="button"
                onClick={onOpenSheetModal}
                style={{
                  background: '#10B981',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Download Center →
              </button>
            )}
          </div>
        </div>

        {/* Inline Sheet Link Form */}
        {(showSheetInput || !homeSheetUrl) && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed rgba(16, 185, 129, 0.25)' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px' }}>
              PASTE YOUR GOOGLE SHEET OR EXCEL ONLINE LINK:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/... or Excel link"
                value={homeSheetUrl}
                onChange={(e) => setHomeSheetUrl(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleSaveHomeSheetUrl}
                style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                {homeSheetSaved ? <Check size={14} /> : <Save size={14} />}
                <span>{homeSheetSaved ? 'Saved! ✓' : 'Save & Link'}</span>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Transactions are recorded in your personal spreadsheet automatically.
              </span>
              <button
                type="button"
                onClick={() => window.open('https://sheets.new', '_blank')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#34D399',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                + Create Free Google Sheet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile, Balances & Glass Aesthetics Card */}
      {onOpenProfileModal && (
        <div
          onClick={onOpenProfileModal}
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))',
            border: '1.5px solid rgba(99, 102, 241, 0.28)',
            borderRadius: '20px',
            padding: '16px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.14)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background: 'rgba(99, 102, 241, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              👤
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                Profile, Balances &amp; Glass Aesthetics
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Edit starting cash/bank, change transactions &amp; choose luxury transparent wallpapers
              </div>
            </div>
          </div>
          <span style={{ color: '#818CF8', fontWeight: 800, fontSize: '0.85rem' }}>
            Customize →
          </span>
        </div>
      )}

      {/* Recent Transactions Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Recent Transactions
          </h2>
          <button
            onClick={() => onNavigateTab('ledger')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-indigo)',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            View All ({transactions.length}) →
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {(['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                background: filterType === t ? 'var(--accent-indigo)' : 'var(--bg-card)',
                color: filterType === t ? '#FFF' : 'var(--text-muted)',
                border: filterType === t ? 'none' : '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t === 'ALL' ? 'All' : t === 'EXPENSE' ? '💸 Expenses' : t === 'INCOME' ? '💰 Income' : '🔄 Transfers'}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {recentTransactions.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: 'var(--bg-card)',
              borderRadius: '20px',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '38px', marginBottom: '10px' }}>🌱</div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
              No transactions recorded yet
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Tap 💸 Expense, 💰 Income or 🔄 Transfer above to start
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentTransactions.map((tx) => {
              const meta = getTxMeta(tx);
              const amount = getTxAmount(tx);
              const isExpense = tx.transaction_type === 'EXPENSE';
              const isIncome = tx.transaction_type === 'INCOME';
              const isTransfer = tx.transaction_type === 'TRANSFER';

              return (
                <div
                  key={tx.id}
                  onClick={() => onNavigateTab('ledger')}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: `${meta.color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0,
                      }}
                    >
                      {meta.emoji}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tx.description}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {isTransfer ? '🔄 Transfer' : isIncome ? '💰 Income' : '💸 Expense'} •{' '}
                        {new Date(tx.transaction_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '0.98rem',
                        color: isTransfer ? '#6366F1' : isIncome ? '#10B981' : '#EF4444',
                      }}
                    >
                      {isTransfer ? '' : isIncome ? '+' : '-'}
                      {hide(amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 10-Second Undo Banner */}
      {lastActionMessage && (
        <div
          onClick={onUndoLastAction}
          style={{
            position: 'fixed',
            bottom: '86px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(28,25,23,0.96)',
            color: '#FFF',
            borderRadius: '99px',
            padding: '12px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            cursor: 'pointer',
            zIndex: 600,
            fontSize: '0.84rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>✅ {lastActionMessage}</span>
          <span style={{ background: '#6366F1', borderRadius: '8px', padding: '3px 12px', fontSize: '0.75rem' }}>
            UNDO
          </span>
        </div>
      )}
    </div>
  );
};
