import React, { useState, useMemo } from 'react';
import { 
  History, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Filter,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { Transaction, LedgerPosting, Account } from '../../core/financial-engine/types';
import { formatCurrency } from '../../core/financial-engine/microUnits';

interface LedgerViewProps {
  transactions: Transaction[];
  postings: LedgerPosting[];
  accounts: Account[];
  onReversal: (txId: string) => void;
  onBack?: () => void;
}

export type HistoryFilterTab = 'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER';

export const LedgerView: React.FC<LedgerViewProps> = ({
  transactions,
  postings,
  accounts,
  onReversal,
  onBack,
}) => {
  const [selectedTab, setSelectedTab] = useState<HistoryFilterTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Compute transactions by type
  const expenseTxs = useMemo(() => transactions.filter((t) => t.transaction_type === 'EXPENSE'), [transactions]);
  const incomeTxs = useMemo(() => transactions.filter((t) => t.transaction_type === 'INCOME'), [transactions]);
  const transferTxs = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.transaction_type === 'TRANSFER' ||
          t.transaction_type === 'ADJUSTMENT' ||
          t.transaction_type === 'CAPEX_DEPRECIATION' ||
          t.transaction_type === 'SPLIT'
      ),
    [transactions]
  );

  // Filter transactions based on selected tab & search
  const displayedTransactions = useMemo(() => {
    let list: Transaction[] = [];
    if (selectedTab === 'ALL') list = transactions;
    else if (selectedTab === 'EXPENSE') list = expenseTxs;
    else if (selectedTab === 'INCOME') list = incomeTxs;
    else if (selectedTab === 'TRANSFER') list = transferTxs;

    if (!searchTerm.trim()) return [...list].reverse();

    const q = searchTerm.toLowerCase();
    return [...list]
      .filter((t) => t.description.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
      .reverse();
  }, [selectedTab, transactions, expenseTxs, incomeTxs, transferTxs, searchTerm]);

  // Calculate totals for active tab
  const getTabTotalMicro = () => {
    let sum = 0n;
    if (selectedTab === 'EXPENSE') {
      for (const tx of expenseTxs) {
        const p = postings.find((item) => item.transaction_id === tx.id && item.direction === 'DEBIT');
        if (p) sum += p.amount_micro;
      }
    } else if (selectedTab === 'INCOME') {
      for (const tx of incomeTxs) {
        const p = postings.find((item) => item.transaction_id === tx.id && item.direction === 'CREDIT');
        if (p) sum += p.amount_micro;
      }
    } else if (selectedTab === 'TRANSFER') {
      for (const tx of transferTxs) {
        const p = postings.find((item) => item.transaction_id === tx.id);
        if (p) sum += p.amount_micro;
      }
    }
    return sum;
  };

  const getTxMeta = (tx: Transaction) => {
    const desc = (tx.description || '').toLowerCase();
    if (tx.transaction_type === 'TRANSFER') {
      if (desc.includes('atm')) return { emoji: '🏧', color: '#F59E0B', label: 'ATM Cash Withdrawal' };
      if (desc.includes('deposit')) return { emoji: '🏦', color: '#10B981', label: 'Cash Deposit to Bank' };
      if (desc.includes('credit card') || desc.includes('bill')) return { emoji: '💳', color: '#6366F1', label: 'CC Bill Payment' };
      if (desc.includes('initial') || desc.includes('starting')) return { emoji: '🌱', color: '#06B6D4', label: 'Opening Balance' };
      return { emoji: '🔄', color: '#6366F1', label: 'Account Transfer' };
    }
    if (tx.transaction_type === 'INCOME') {
      if (desc.includes('salary')) return { emoji: '💼', color: '#10B981', label: 'Salary' };
      if (desc.includes('freelance')) return { emoji: '💻', color: '#3B82F6', label: 'Freelance' };
      if (desc.includes('dividend') || desc.includes('investment')) return { emoji: '📈', color: '#F59E0B', label: 'Investments' };
      if (desc.includes('gift')) return { emoji: '🎁', color: '#EC4899', label: 'Gift / Bonus' };
      return { emoji: '💰', color: '#10B981', label: 'Income' };
    }
    // Expense
    if (desc.includes('food') || desc.includes('lunch') || desc.includes('dinner') || desc.includes('chai')) return { emoji: '🍔', color: '#F97316', label: 'Food & Dining' };
    if (desc.includes('grocer') || desc.includes('milk') || desc.includes('blinkit')) return { emoji: '🛒', color: '#10B981', label: 'Groceries' };
    if (desc.includes('cab') || desc.includes('auto') || desc.includes('petrol') || desc.includes('fuel')) return { emoji: '🚗', color: '#3B82F6', label: 'Transport' };
    if (desc.includes('shopping') || desc.includes('amazon') || desc.includes('cloth')) return { emoji: '🛍️', color: '#EC4899', label: 'Shopping' };
    if (desc.includes('rent') || desc.includes('electric') || desc.includes('wifi')) return { emoji: '🏠', color: '#8B5CF6', label: 'Bills & Rent' };
    if (desc.includes('med') || desc.includes('pharm') || desc.includes('doc')) return { emoji: '💊', color: '#EF4444', label: 'Health' };
    if (desc.includes('movie') || desc.includes('cinema') || desc.includes('game')) return { emoji: '🎬', color: '#F59E0B', label: 'Entertainment' };
    return { emoji: '💸', color: '#EF4444', label: 'Expense' };
  };

  const getTxAmountAndAccount = (tx: Transaction) => {
    const txPostings = postings.filter((p) => p.transaction_id === tx.id);
    let amount = 0n;
    let paymentAccount = 'Bank Account';

    if (tx.transaction_type === 'EXPENSE') {
      const creditPosting = txPostings.find((p) => p.direction === 'CREDIT');
      if (creditPosting) {
        amount = creditPosting.amount_micro;
        const acc = accountMap.get(creditPosting.account_id);
        if (acc) paymentAccount = acc.name;
      }
    } else if (tx.transaction_type === 'INCOME') {
      const debitPosting = txPostings.find((p) => p.direction === 'DEBIT');
      if (debitPosting) {
        amount = debitPosting.amount_micro;
        const acc = accountMap.get(debitPosting.account_id);
        if (acc) paymentAccount = acc.name;
      }
    } else {
      // Transfer
      const first = txPostings[0];
      if (first) amount = first.amount_micro;
      const fromP = txPostings.find((p) => p.direction === 'CREDIT');
      const toP = txPostings.find((p) => p.direction === 'DEBIT');
      if (fromP && toP) {
        const fromAcc = accountMap.get(fromP.account_id)?.name || 'Source';
        const toAcc = accountMap.get(toP.account_id)?.name || 'Destination';
        paymentAccount = `${fromAcc} → ${toAcc}`;
      }
    }
    return { amount, paymentAccount, txPostings };
  };

  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return 'Today';
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return '';
    }
  };

  // Group displayed transactions by date
  const groupedTx = displayedTransactions.reduce<{ [date: string]: Transaction[] }>((acc, tx) => {
    const key = fmtDate(tx.transaction_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '780px', margin: '0 auto' }}>
      
      {/* Top Bar with Back Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '8px 14px',
                color: 'var(--accent-indigo)',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <div>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Transaction History
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              Immutable journal • Separate Expense, Income &amp; Transfer tracking
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '220px' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
          <input
            type="text"
            placeholder="Search transactions…"
            className="input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '0.8rem', width: '100%' }}
          />
        </div>
      </div>

      {/* 4 Segmented Tabs: All, Expense, Income, Transfers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          background: 'var(--bg-card)',
          padding: '4px',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setSelectedTab('ALL')}
          style={{
            background: selectedTab === 'ALL' ? 'var(--bg-primary)' : 'transparent',
            border: selectedTab === 'ALL' ? '1px solid var(--border-subtle)' : 'none',
            borderRadius: '12px',
            padding: '10px 4px',
            color: selectedTab === 'ALL' ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: selectedTab === 'ALL' ? 800 : 600,
            fontSize: '0.78rem',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: selectedTab === 'ALL' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          📋 All ({transactions.length})
        </button>

        <button
          onClick={() => setSelectedTab('EXPENSE')}
          style={{
            background: selectedTab === 'EXPENSE' ? 'rgba(239,68,68,0.15)' : 'transparent',
            border: selectedTab === 'EXPENSE' ? '1px solid rgba(239,68,68,0.3)' : 'none',
            borderRadius: '12px',
            padding: '10px 4px',
            color: selectedTab === 'EXPENSE' ? '#EF4444' : 'var(--text-muted)',
            fontWeight: selectedTab === 'EXPENSE' ? 800 : 600,
            fontSize: '0.78rem',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          💸 Expense ({expenseTxs.length})
        </button>

        <button
          onClick={() => setSelectedTab('INCOME')}
          style={{
            background: selectedTab === 'INCOME' ? 'rgba(16,185,129,0.15)' : 'transparent',
            border: selectedTab === 'INCOME' ? '1px solid rgba(16,185,129,0.3)' : 'none',
            borderRadius: '12px',
            padding: '10px 4px',
            color: selectedTab === 'INCOME' ? '#10B981' : 'var(--text-muted)',
            fontWeight: selectedTab === 'INCOME' ? 800 : 600,
            fontSize: '0.78rem',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          💰 Income ({incomeTxs.length})
        </button>

        <button
          onClick={() => setSelectedTab('TRANSFER')}
          style={{
            background: selectedTab === 'TRANSFER' ? 'rgba(99,102,241,0.15)' : 'transparent',
            border: selectedTab === 'TRANSFER' ? '1px solid rgba(99,102,241,0.3)' : 'none',
            borderRadius: '12px',
            padding: '10px 4px',
            color: selectedTab === 'TRANSFER' ? '#6366F1' : 'var(--text-muted)',
            fontWeight: selectedTab === 'TRANSFER' ? 800 : 600,
            fontSize: '0.78rem',
            cursor: 'pointer',
            textAlign: 'center',
          }}
          title="Transfers, ATM withdrawals, CC bill payments (neither expense nor income)"
        >
          🔄 Transfers ({transferTxs.length})
        </button>
      </div>

      {/* Tab Context Banner / Explainer */}
      {selectedTab === 'EXPENSE' && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '16px',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' }}>
              Total Expenses
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Pure out-of-pocket expenses. Transfers &amp; ATM withdrawals are excluded.
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#EF4444' }}>
            {formatCurrency(getTabTotalMicro())}
          </div>
        </div>
      )}

      {selectedTab === 'INCOME' && (
        <div
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '16px',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>
              Total Inflows &amp; Income
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Salary, freelance, and earned money.
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981' }}>
            {formatCurrency(getTabTotalMicro())}
          </div>
        </div>
      )}

      {selectedTab === 'TRANSFER' && (
        <div
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '16px',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase' }}>
              Transfers &amp; Non-Expense Movements
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              ATM withdrawals, cash deposits, CC bill payments. Does not affect expense/income totals.
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6366F1' }}>
            {formatCurrency(getTabTotalMicro())}
          </div>
        </div>
      )}

      {/* Transactions List */}
      {displayedTransactions.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'var(--bg-card)',
            borderRadius: '20px',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>
            {selectedTab === 'EXPENSE' ? '💸' : selectedTab === 'INCOME' ? '💰' : selectedTab === 'TRANSFER' ? '🔄' : '🌱'}
          </div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
            No {selectedTab !== 'ALL' ? selectedTab.toLowerCase() : ''} transactions recorded yet
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Use the Quick Add button (✚) below to log your transactions.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(groupedTx).map(([date, txs]) => (
            <div key={date}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: '12px 0 6px 4px',
                }}
              >
                {date}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {txs.map((tx) => {
                  const meta = getTxMeta(tx);
                  const { amount, paymentAccount, txPostings } = getTxAmountAndAccount(tx);
                  const isExpanded = expandedTxId === tx.id;
                  const isReversal = tx.transaction_type === 'ADJUSTMENT';

                  return (
                    <div
                      key={tx.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Main Transaction Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        
                        {/* Icon & Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              background: `${meta.color}20`,
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
                                fontWeight: 800,
                                fontSize: '0.92rem',
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {tx.description}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {paymentAccount}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--border-subtle)' }}>•</span>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  color: meta.color,
                                  background: `${meta.color}15`,
                                  padding: '1px 6px',
                                  borderRadius: '6px',
                                }}
                              >
                                {tx.transaction_type}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: '1.05rem',
                                color:
                                  tx.transaction_type === 'EXPENSE'
                                    ? '#EF4444'
                                    : tx.transaction_type === 'INCOME'
                                    ? '#10B981'
                                    : '#6366F1',
                              }}
                            >
                              {tx.transaction_type === 'EXPENSE'
                                ? '-'
                                : tx.transaction_type === 'INCOME'
                                ? '+'
                                : ''}
                              {formatCurrency(amount)}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {new Date(tx.transaction_date).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>

                          {/* Reversal / Delete Button */}
                          {!isReversal && (
                            <button
                              onClick={() => onReversal(tx.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                padding: '6px 8px',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                              }}
                              title="Revert transaction (creates compensating entry)"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#EF4444';
                                e.currentTarget.style.borderColor = '#EF4444';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-muted)';
                                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                              }}
                            >
                              <RotateCcw size={13} />
                            </button>
                          )}

                          {/* Toggle Audit Postings Button */}
                          <button
                            onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Show double-entry debit & credit legs"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Double-Entry Audit Legs */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '12px',
                            borderTop: '1px solid var(--border-subtle)',
                            paddingTop: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Double-Entry Ledger Audit Trail:
                          </div>
                          {txPostings.map((p) => {
                            const acc = accountMap.get(p.account_id);
                            const isDebit = p.direction === 'DEBIT';
                            return (
                              <div
                                key={p.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '0.75rem',
                                  background: 'var(--bg-primary)',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      fontSize: '0.68rem',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: isDebit ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                                      color: isDebit ? '#3B82F6' : '#10B981',
                                    }}
                                  >
                                    {p.direction}
                                  </span>
                                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    {acc?.name || p.account_id}
                                  </span>
                                </div>
                                <span style={{ fontWeight: 800, fontFamily: 'monospace' }}>
                                  {formatCurrency(p.amount_micro)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
