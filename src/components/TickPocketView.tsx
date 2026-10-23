import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Plus, 
  FileSpreadsheet, 
  Copy, 
  Cloud, 
  Trash2, 
  Sparkles, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight,
  ArrowLeftRight,
  Wallet,
  Landmark,
  X,
  Check,
  Filter
} from 'lucide-react';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface TickTransaction {
  id: string;
  date: string;
  time: string;
  type: TransactionType;
  category: string;
  source: string;
  paymentMode: string;
  amount: number;
  note: string;
  fromAccount?: string;
  toAccount?: string;
}

export interface HabitItem {
  id: string;
  name: string;
  icon: string;
  amount: number;
  type: TransactionType;
  category: string;
  source: string;
}

interface TickPocketViewProps {
  isPrivate: boolean;
  onCommitDoubleEntry?: (tx: {
    type: TransactionType;
    category: string;
    source: string;
    amount: number;
    paymentMode: string;
    description: string;
    fromAccount?: string;
    toAccount?: string;
  }) => void;
}

export function TickPocketView({ isPrivate, onCommitDoubleEntry }: TickPocketViewProps) {
  // Pre-configured Categories & Sources (No demo transactions!)
  const [categories, setCategories] = useState<{
    EXPENSE: Array<{ id: string; name: string; icon: string; sources: string[] }>;
    INCOME: Array<{ id: string; name: string; icon: string; sources: string[] }>;
    TRANSFER: Array<{ id: string; name: string; icon: string; sources: string[]; from: string; to: string }>;
  }>({
    EXPENSE: [
      { id: 'food', name: 'Food & Dining', icon: '🍔', sources: ['Street Food / Tapri', 'Restaurant', 'Swiggy / Zomato', 'Cafe / Chai', 'Snacks'] },
      { id: 'groceries', name: 'Groceries', icon: '🛒', sources: ['Supermarket', 'Local Kirana', 'Dairy & Milk', 'Fruits & Veggies', 'Blinkit / Zepto'] },
      { id: 'travel', name: 'Travel & Fuel', icon: '🛺', sources: ['Auto / Bus', 'Petrol / Fuel', 'Metro Card', 'Ola / Uber', 'Train'] },
      { id: 'bills', name: 'Bills & Recharge', icon: '📱', sources: ['Mobile Recharge', 'Electricity', 'WiFi / Broadband', 'OTT Subscriptions', 'Gas Cylinder'] },
      { id: 'shopping', name: 'Shopping', icon: '🛍️', sources: ['Amazon / Flipkart', 'Clothing & Shoes', 'Electronics', 'Personal Care'] },
      { id: 'medical', name: 'Medical & Health', icon: '💊', sources: ['Pharmacy / Medicine', 'Doctor Consultation', 'Lab Tests', 'Gym'] },
      { id: 'entertainment', name: 'Entertainment', icon: '🎬', sources: ['Movies / Cinema', 'Gaming', 'Outing', 'Books'] },
      { id: 'rent', name: 'Rent & Home', icon: '🏠', sources: ['House Rent', 'Maintenance', 'Plumbing', 'Maid'] }
    ],
    INCOME: [
      { id: 'salary', name: 'Salary', icon: '💼', sources: ['Primary Job', 'Bonus', 'Overtime', 'Incentive'] },
      { id: 'freelance', name: 'Freelance & Side', icon: '💻', sources: ['Client Project', 'Consulting', 'Design Work', 'Coding Gig'] },
      { id: 'gifts', name: 'Gift / Pocket Money', icon: '🎁', sources: ['Parents / Family', 'Birthday Gift', 'Cashback', 'Friend Return'] },
      { id: 'investments', name: 'Dividends & Cash', icon: '📈', sources: ['Stock Dividend', 'FD Interest', 'Gold Return', 'Mutual Fund'] },
      { id: 'rental', name: 'Rental Inflow', icon: '🏠', sources: ['Property Rent', 'Sublet Room', 'Equipment Rental'] }
    ],
    TRANSFER: [
      { id: 'atm_withdraw', name: 'ATM Cash Withdrawal', icon: '🏧', sources: ['SBI ATM', 'HDFC ATM', 'ICICI ATM', 'Local ATM'], from: 'Bank', to: 'Cash' },
      { id: 'cash_deposit', name: 'Cash Deposit to Bank', icon: '💵', sources: ['Bank CDM Branch', 'Bank Deposit Slip', 'Agent Deposit'], from: 'Cash', to: 'Bank' },
      { id: 'cc_payment', name: 'Credit Card Bill Pay', icon: '💳', sources: ['CRED App', 'Net Banking', 'Auto-Debit', 'UPI'], from: 'Bank', to: 'Credit Card' },
      { id: 'investment_fd', name: 'Investment / FD / Gold', icon: '📈', sources: ['Zerodha / Groww', 'Bank Fixed Deposit', 'Digital Gold', 'PPF'], from: 'Bank', to: 'Investment' },
      { id: 'friend_loan', name: 'Friend Loan Given', icon: '🤝', sources: ['Lent to Friend', 'Lent to Colleague', 'Emergency Help'], from: 'Bank', to: 'Loan Receivable' },
      { id: 'friend_return', name: 'Friend Loan Settled', icon: '↩️', sources: ['Loan Paid Back', 'Split Return', 'Old Dues Cleared'], from: 'Loan Receivable', to: 'Bank' },
      { id: 'bank_transfer', name: 'Self Bank Transfer', icon: '🏦', sources: ['Savings to Current', 'Primary to Secondary', 'Family Account'], from: 'Bank', to: 'Bank 2' }
    ]
  });

  // State
  const [currentType, setCurrentType] = useState<TransactionType>('EXPENSE');
  const [selectedCatId, setSelectedCatId] = useState<string>('food');
  const [selectedSource, setSelectedSource] = useState<string>('Street Food / Tapri');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('UPI / GPay');
  const [amountInput, setAmountInput] = useState<string>('');

  // History Tab Filter: All vs Expense vs Income vs Transfer
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');

  // Initial Onboarding Balances Prompt
  const [hasSetInitialBalances, setHasSetInitialBalances] = useState<boolean>(() => {
    return localStorage.getItem('tickpocket_initialized') === 'true';
  });
  const [showInitialModal, setShowInitialModal] = useState<boolean>(() => {
    return localStorage.getItem('tickpocket_initialized') !== 'true';
  });
  const [initCashAmount, setInitCashAmount] = useState<string>('');
  const [initBankAmount, setInitBankAmount] = useState<string>('');

  // Daily Habits (Empty by default or clean starting routines)
  const [dailyHabits, setDailyHabits] = useState<HabitItem[]>(() => {
    try {
      const saved = localStorage.getItem('tickpocket_daily_habits');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'h1', name: 'Morning Milk & Bread', icon: '🥛', amount: 60, type: 'EXPENSE', category: 'Groceries', source: 'Dairy & Milk' },
      { id: 'h2', name: 'Auto / Bus Commute', icon: '🛺', amount: 50, type: 'EXPENSE', category: 'Travel & Fuel', source: 'Auto / Bus' },
      { id: 'h3', name: 'Tea & Snacks Break', icon: '☕', amount: 30, type: 'EXPENSE', category: 'Food & Dining', source: 'Street Food / Tapri' },
      { id: 'h4', name: 'Lunch / Meal', icon: '🍱', amount: 120, type: 'EXPENSE', category: 'Food & Dining', source: 'Restaurant' }
    ];
  });

  // Flat 7-Column Transactions (STARTS EMPTY - ZERO DEMO DATA)
  const [transactions, setTransactions] = useState<TickTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('tickpocket_transactions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Google Sheets Sync Settings
  const [syncSettings, setSyncSettings] = useState<{ webhookUrl: string; autoSync: boolean }>(() => {
    try {
      const saved = localStorage.getItem('tickpocket_sync_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { webhookUrl: '', autoSync: false };
  });

  // Modals & Feedback
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceText, setNewSourceText] = useState('');
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('✨');
  const [newHabitAmount, setNewHabitAmount] = useState('');
  const [newHabitType, setNewHabitType] = useState<TransactionType>('EXPENSE');
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('tickpocket_daily_habits', JSON.stringify(dailyHabits));
  }, [dailyHabits]);

  useEffect(() => {
    localStorage.setItem('tickpocket_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('tickpocket_sync_settings', JSON.stringify(syncSettings));
  }, [syncSettings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Active Category & Sources
  const activeCategories = categories[currentType];
  const activeCategory = activeCategories.find((c) => c.id === selectedCatId) || activeCategories[0];

  const handleTypeChange = (type: TransactionType) => {
    setCurrentType(type);
    soundAndVoice.playPillowTap();
    const firstCat = categories[type][0];
    setSelectedCatId(firstCat.id);
    setSelectedSource(firstCat.sources[0] || '');
  };

  const handleSelectCat = (cat: { id: string; name: string; sources: string[] }) => {
    setSelectedCatId(cat.id);
    setSelectedSource(cat.sources[0] || '');
    soundAndVoice.playPillowTap();
  };

  // Additive Amount Chips
  const handleAddChip = (amt: number) => {
    const current = parseFloat(amountInput) || 0;
    setAmountInput(String(current + amt));
    soundAndVoice.playPillowTap();
  };

  // Handle Initial Cash in Hand and Bank Account Setup
  const handleSaveInitialBalances = () => {
    const cashVal = parseFloat(initCashAmount) || 0;
    const bankVal = parseFloat(initBankAmount) || 0;

    if (cashVal <= 0 && bankVal <= 0) {
      showToast('Please enter at least Cash in Hand or Bank balance!');
      return;
    }

    const now = new Date();
    const newEntries: TickTransaction[] = [];

    if (cashVal > 0) {
      newEntries.push({
        id: 'tx_init_cash_' + Date.now(),
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'TRANSFER',
        category: 'Opening Cash in Hand',
        source: 'Initial Setup',
        paymentMode: 'Cash',
        amount: cashVal,
        note: 'Starting Cash Balance (Non-Income Equity)'
      });

      if (onCommitDoubleEntry) {
        onCommitDoubleEntry({
          type: 'TRANSFER',
          category: 'Opening Cash Balance',
          source: 'Initial Cash in Hand',
          amount: cashVal,
          paymentMode: 'Cash',
          description: 'Starting Cash in Hand'
        });
      }
    }

    if (bankVal > 0) {
      newEntries.push({
        id: 'tx_init_bank_' + Date.now(),
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'TRANSFER',
        category: 'Opening Bank Account',
        source: 'Initial Setup',
        paymentMode: 'Card / Bank',
        amount: bankVal,
        note: 'Starting Bank Balance (Non-Income Equity)'
      });

      if (onCommitDoubleEntry) {
        onCommitDoubleEntry({
          type: 'TRANSFER',
          category: 'Opening Bank Balance',
          source: 'Initial Bank Account',
          amount: bankVal,
          paymentMode: 'Card / Bank',
          description: 'Starting Bank Balance'
        });
      }
    }

    setTransactions((prev) => [...newEntries, ...prev]);
    localStorage.setItem('tickpocket_initialized', 'true');
    setHasSetInitialBalances(true);
    setShowInitialModal(false);
    soundAndVoice.playSuccessChime();
    soundAndVoice.speakAloud('Starting balances recorded safely in your history!');
    showToast(`Recorded starting balances: Cash ₹${cashVal.toLocaleString('en-IN')}, Bank ₹${bankVal.toLocaleString('en-IN')}`);
  };

  // Commit Regular Entry
  const handleCommitEntry = () => {
    const amt = parseFloat(amountInput);
    if (!amt || amt <= 0) {
      showToast('Please enter or tick an amount!');
      return;
    }

    const now = new Date();
    const newTx: TickTransaction = {
      id: 'tx_' + Date.now(),
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: currentType,
      category: activeCategory.name,
      source: selectedSource || activeCategory.name,
      paymentMode: currentType === 'TRANSFER' ? 'Account Transfer' : selectedPaymentMode,
      amount: amt,
      note: currentType === 'TRANSFER' 
        ? `Transfer: ${activeCategory.name} (${selectedSource || 'Neutral Entry'})`
        : 'Ticked via Multi-Tick Builder'
    };

    setTransactions((prev) => [newTx, ...prev]);
    soundAndVoice.playCoinClink();
    
    if (currentType === 'TRANSFER') {
      showToast(`🔄 Recorded Transfer ₹${amt.toLocaleString('en-IN')} (Excluded from Income & Expense)!`);
    } else {
      showToast(`✅ Saved ₹${amt.toLocaleString('en-IN')} to Sheet!`);
    }

    // Commit to Double-Entry Ledger if handler provided
    if (onCommitDoubleEntry) {
      onCommitDoubleEntry({
        type: currentType,
        category: activeCategory.name,
        source: selectedSource,
        amount: amt,
        paymentMode: selectedPaymentMode,
        description: `${activeCategory.name} (${selectedSource || 'Ticked'})`
      });
    }

    // Auto-sync to Google Sheet if enabled
    if (syncSettings.autoSync && syncSettings.webhookUrl) {
      pushRowToGoogleSheet(newTx);
    }

    setAmountInput('');
  };

  // 1-Tap Daily Habit Tick
  const handleTickHabit = (habit: HabitItem) => {
    soundAndVoice.playCoinClink();
    const now = new Date();
    const newTx: TickTransaction = {
      id: 'tx_' + Date.now(),
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: habit.type,
      category: habit.name,
      source: habit.source,
      paymentMode: 'UPI / GPay',
      amount: habit.amount,
      note: 'Ticked via 1-Tap Daily Habit'
    };

    setTransactions((prev) => [newTx, ...prev]);
    showToast(`⚡ ${habit.icon} ${habit.name} (₹${habit.amount}) Logged!`);

    if (onCommitDoubleEntry) {
      onCommitDoubleEntry({
        type: habit.type,
        category: habit.category || habit.name,
        source: habit.source,
        amount: habit.amount,
        paymentMode: 'UPI / GPay',
        description: `Daily: ${habit.name}`
      });
    }

    if (syncSettings.autoSync && syncSettings.webhookUrl) {
      pushRowToGoogleSheet(newTx);
    }
  };

  // Add Custom Source
  const handleSaveCustomSource = () => {
    if (!newSourceText.trim()) return;
    const trimmed = newSourceText.trim();
    setCategories((prev) => {
      const copy = { ...prev };
      const catList = (copy[currentType] as any[]).map((c) => {
        if (c.id === selectedCatId) {
          return { ...c, sources: [...c.sources, trimmed] };
        }
        return c;
      });
      copy[currentType] = catList as any;
      return copy;
    });
    setSelectedSource(trimmed);
    setNewSourceText('');
    setShowAddSourceModal(false);
    soundAndVoice.playSuccessChime();
    showToast(`Added source: ${trimmed}`);
  };

  // Add Custom Daily Habit
  const handleSaveDailyHabit = () => {
    const amt = parseFloat(newHabitAmount);
    if (!newHabitName.trim() || !amt || amt <= 0) {
      showToast('Please enter a valid habit name and amount!');
      return;
    }
    const habit: HabitItem = {
      id: 'h_' + Date.now(),
      name: newHabitName.trim(),
      icon: newHabitIcon || '✨',
      amount: amt,
      type: newHabitType,
      category: newHabitType === 'EXPENSE' ? 'Daily Routine' : 'Daily Inflow',
      source: 'Custom Routine'
    };
    setDailyHabits((prev) => [...prev, habit]);
    setNewHabitName('');
    setNewHabitAmount('');
    setShowAddHabitModal(false);
    soundAndVoice.playSuccessChime();
    showToast(`Added routine: ${habit.icon} ${habit.name}`);
  };

  // Delete Row
  const handleDeleteTx = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    soundAndVoice.playUndoSwoosh();
    showToast('Row removed from sheet');
  };

  // Clear All
  const handleClearAll = () => {
    if (window.confirm('Clear all entries from your TickPocket sheet?')) {
      setTransactions([]);
      soundAndVoice.playUndoSwoosh();
      showToast('Sheet cleared');
    }
  };

  // EXPORT 1: Excel (.CSV with UTF-8 BOM)
  const handleExportExcel = () => {
    if (transactions.length === 0) {
      showToast('No entries to export!');
      return;
    }
    const headers = ['Date', 'Time', 'Type', 'Category', 'Source', 'Payment Mode', 'Amount (INR)', 'Note'];
    const rows = transactions.map((t) => [
      t.date,
      t.time,
      t.type,
      `"${t.category.replace(/"/g, '""')}"`,
      `"${(t.source || '').replace(/"/g, '""')}"`,
      `"${t.paymentMode}"`,
      t.amount,
      `"${(t.note || '').replace(/"/g, '""')}"`
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TickPocket_Expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    soundAndVoice.playCoinClink();
    showToast('Downloaded Excel CSV with UTF-8 BOM!');
  };

  // EXPORT 2: Copy for Google Sheets (TSV)
  const handleCopyGoogleSheets = () => {
    if (transactions.length === 0) {
      showToast('No entries to copy!');
      return;
    }
    const headers = ['Date', 'Time', 'Type', 'Category & Source', 'Payment Mode', 'Amount', 'Note'];
    const tsvRows = transactions.map((t) => [
      t.date,
      t.time,
      t.type,
      `${t.category}${t.source ? ' (' + t.source + ')' : ''}`,
      t.paymentMode,
      t.amount,
      t.note || ''
    ].join('\t'));
    const tsv = [headers.join('\t'), ...tsvRows].join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      soundAndVoice.playCoinClink();
      showToast('📋 Copied! Press Ctrl+V in your Google Sheet!');
    }).catch(() => {
      showToast('Failed to copy to clipboard');
    });
  };

  // EXPORT 3: Live Google Sheets Push
  const pushRowToGoogleSheet = (row: TickTransaction | TickTransaction[]) => {
    if (!syncSettings.webhookUrl) return;
    fetch(syncSettings.webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row)
    }).catch(() => {});
  };

  const handleSyncAllGoogleSheets = () => {
    if (!syncSettings.webhookUrl) {
      setShowSyncModal(true);
      showToast('Please set your Google Apps Script Webhook URL first!');
      return;
    }
    if (transactions.length === 0) {
      showToast('No entries to sync!');
      return;
    }
    showToast('Syncing rows to Google Sheets...');
    pushRowToGoogleSheet(transactions);
    soundAndVoice.playCoinClink();
    showToast('☁️ Sent all rows to Google Sheets!');
  };

  // Rolling Totals (STRICT SEPARATION: Transfers/Neutral are NOT Income or Expense!)
  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransfers = transactions
    .filter((t) => t.type === 'TRANSFER')
    .reduce((sum, t) => sum + t.amount, 0);

  const netPocket = totalIncome - totalExpense;

  // Filtered Transactions for Table
  const filteredTransactions = transactions.filter((t) => {
    if (historyFilter === 'ALL') return true;
    return t.type === historyFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '14px 22px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          fontWeight: 700,
          fontSize: '14px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Sparkles size={18} color="#FBBF24" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Stat Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            onClick={() => {
              soundAndVoice.playSuccessChime();
              soundAndVoice.speakAloud('Track effortlessly! Transfers and opening balances are kept completely separate from income and expenses.');
            }}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #FFD166, #FF9F1C)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 159, 28, 0.35)'
            }}
            title="Click Finny for info!"
          >
            🪙
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              TickPocket <span style={{ fontSize: '0.75rem', background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: '12px' }}>v5.0 Clean Scratch</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Zero demo data • Transfers separated from Income &amp; Expense • 1-Click Excel &amp; Google Sheets
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => setShowInitialModal(true)}
            className="toy-button"
            style={{
              background: '#EEF2FF',
              color: '#4F46E5',
              border: '2px solid #C7D2FE',
              borderRadius: '16px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Wallet size={16} />
            <span>Set Initial Cash &amp; Bank</span>
          </button>

          <button 
            onClick={() => setShowSyncModal(true)}
            className="toy-button"
            style={{
              background: '#FFFFFF',
              border: '2px solid var(--border-playful)',
              borderRadius: '16px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Cloud size={16} color="#0F9D58" />
            <span>Sheets Sync</span>
          </button>

          <button 
            onClick={handleClearAll}
            className="toy-button"
            style={{
              background: '#FEE2E2',
              color: '#B91C1C',
              border: '2px solid #FCA5A5',
              borderRadius: '16px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Clear Sheet
          </button>
        </div>
      </div>

      {/* Initial Starting Balance Banner if not initialized */}
      {!hasSetInitialBalances && (
        <div style={{
          background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
          border: '2px solid #F59E0B',
          borderRadius: '20px',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 4px 0 #D97706'
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px' }}>
              👛 Welcome to TickPocket! What are your starting balances?
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#B45309' }}>
              Set your initial Cash in Hand and Bank Account balance. They will appear in history as non-income starting balances!
            </p>
          </div>
          <button
            onClick={() => setShowInitialModal(true)}
            style={{
              background: '#D97706',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '14px',
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 3px 0 #92400E'
            }}
          >
            🚀 Enter Initial Cash &amp; Bank
          </button>
        </div>
      )}

      {/* 4 Odometer Stat Cards (Showing Net, Income, Expense, and Separate Transfers) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid #C7D2FE',
          borderRadius: '20px',
          padding: '18px 22px',
          boxShadow: '0 4px 0 #A5B4FC'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Net Surplus / Savings
          </div>
          <div className={isPrivate ? 'private-blur' : ''} style={{ fontSize: '26px', fontWeight: 800, color: '#4F46E5', fontFamily: 'monospace' }}>
            ₹{netPocket.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Pure Income minus OpEx
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid #A7F3D0',
          borderRadius: '20px',
          padding: '18px 22px',
          boxShadow: '0 4px 0 #6EE7B7'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} color="#10B981" /> Total Income (Earned)
          </div>
          <div className={isPrivate ? 'private-blur' : ''} style={{ fontSize: '26px', fontWeight: 800, color: '#10B981', fontFamily: 'monospace' }}>
            +₹{totalIncome.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Excludes opening balances &amp; transfers
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid #FECDD3',
          borderRadius: '20px',
          padding: '18px 22px',
          boxShadow: '0 4px 0 #FDA4AF'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowDownRight size={14} color="#FF6B8B" /> Total Expense (Spent)
          </div>
          <div className={isPrivate ? 'private-blur' : ''} style={{ fontSize: '26px', fontWeight: 800, color: '#FF6B8B', fontFamily: 'monospace' }}>
            -₹{totalExpense.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Excludes ATM &amp; CC bill payments
          </div>
        </div>

        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid #E2E8F0',
          borderRadius: '20px',
          padding: '18px 22px',
          boxShadow: '0 4px 0 #CBD5E1'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeftRight size={14} color="#64748B" /> Transfers &amp; Neutral
          </div>
          <div className={isPrivate ? 'private-blur' : ''} style={{ fontSize: '26px', fontWeight: 800, color: '#334155', fontFamily: 'monospace' }}>
            ₹{totalTransfers.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            ATM, CC Pay, Opening Balances
          </div>
        </div>
      </div>

      {/* Main Dual Workspace: Left Quick Habits, Right Multi-Tick Builder */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        
        {/* Left: 1-Tap Daily Habit Checklist */}
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--border-playful)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 4px 0 var(--border-subtle)',
          height: 'fit-content'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ 1-Tap Daily Routine
            </h3>
            <button
              onClick={() => setShowAddHabitModal(true)}
              style={{
                background: '#EEF2FF',
                color: '#4F46E5',
                border: '2px solid #C7D2FE',
                borderRadius: '12px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Plus size={14} /> Add Item
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Tap any daily routine checkbox below to instantly log it to your sheet and ledger!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dailyHabits.map((habit) => (
              <div
                key={habit.id}
                onClick={() => handleTickHabit(habit)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--card-bg)',
                  border: '2px solid var(--border-subtle)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: '2px solid #CBD5E1',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={16} color="#10B981" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>
                      {habit.icon} {habit.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {habit.source}
                    </div>
                  </div>
                </div>
                <div className={isPrivate ? 'private-blur' : ''} style={{
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '15px',
                  color: habit.type === 'INCOME' ? '#10B981' : 'var(--text-dark)'
                }}>
                  {habit.type === 'INCOME' ? '+' : '-'}₹{habit.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Multi-Tick Category, Source & Amount Builder */}
        <div style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--border-playful)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 4px 0 var(--border-subtle)'
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, marginBottom: '16px' }}>
            🎯 Multi-Tick Builder
          </h3>

          {/* Type Toggle (3 OPTIONS: Expense vs Income vs Transfer/Neutral) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            background: 'var(--border-subtle)',
            padding: '6px',
            borderRadius: '18px',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => handleTypeChange('EXPENSE')}
              style={{
                padding: '10px 4px',
                borderRadius: '14px',
                border: currentType === 'EXPENSE' ? '2px solid #FDA4AF' : 'none',
                background: currentType === 'EXPENSE' ? '#FFFFFF' : 'transparent',
                color: currentType === 'EXPENSE' ? '#FF6B8B' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              💸 Expense
            </button>
            <button
              onClick={() => handleTypeChange('INCOME')}
              style={{
                padding: '10px 4px',
                borderRadius: '14px',
                border: currentType === 'INCOME' ? '2px solid #6EE7B7' : 'none',
                background: currentType === 'INCOME' ? '#FFFFFF' : 'transparent',
                color: currentType === 'INCOME' ? '#10B981' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              💰 Income
            </button>
            <button
              onClick={() => handleTypeChange('TRANSFER')}
              style={{
                padding: '10px 4px',
                borderRadius: '14px',
                border: currentType === 'TRANSFER' ? '2px solid #94A3B8' : 'none',
                background: currentType === 'TRANSFER' ? '#FFFFFF' : 'transparent',
                color: currentType === 'TRANSFER' ? '#475569' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              title="ATM withdrawals, Bank deposits, CC bill payments, Investments, Loans"
            >
              🔄 Transfer
            </button>
          </div>

          {/* Transfer Notice if Transfer selected */}
          {currentType === 'TRANSFER' && (
            <div style={{
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: '14px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#475569',
              marginBottom: '16px'
            }}>
              ℹ️ <strong>Transfers &amp; Neutral Entries:</strong> Moves money between your accounts (e.g. Bank to Cash ATM, CC Bill pay). Recorded in full history, but <strong>not</strong> counted as Income or Expense!
            </div>
          )}

          {/* Step 1: Category Grid */}
          <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Step 1: Tick Category</span>
            <span style={{ color: '#6366F1' }}>{activeCategory.icon} {activeCategory.name}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px', marginBottom: '18px' }}>
            {activeCategories.map((cat) => {
              const isSelected = cat.id === selectedCatId;
              return (
                <div
                  key={cat.id}
                  onClick={() => handleSelectCat(cat)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '16px',
                    border: isSelected ? '2px solid #6366F1' : '2px solid var(--border-subtle)',
                    background: isSelected ? '#EEF2FF' : 'var(--card-bg)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    boxShadow: isSelected ? '0 3px 0 #818CF8' : 'none',
                    transform: isSelected ? 'scale(1.02)' : 'none',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <div style={{ fontSize: '24px' }}>{cat.icon}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dark)', marginTop: '4px' }}>
                    {cat.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 2: Sub-options / Sources */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            border: '2px dashed #CBD5E1',
            borderRadius: '18px',
            padding: '14px',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Step 2: Tick Source / Sub-Option
              </span>
              <button
                onClick={() => setShowAddSourceModal(true)}
                style={{
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  border: '1px solid #C7D2FE',
                  borderRadius: '10px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Add Source
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {activeCategory.sources.map((src) => {
                const isSelected = selectedSource === src;
                return (
                  <button
                    key={src}
                    onClick={() => {
                      setSelectedSource(src);
                      soundAndVoice.playPillowTap();
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #4338CA' : '1px solid var(--border-subtle)',
                      background: isSelected ? '#4F46E5' : 'var(--card-bg)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-dark)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Additive Amount Chips & Input */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Step 3: Tick Amount Chips (+₹)
              </span>
              <button
                onClick={() => setAmountInput('')}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
            
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, fontSize: '20px', color: 'var(--text-muted)' }}>
                ₹
              </span>
              <input
                type="number"
                placeholder="0"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '52px',
                  paddingLeft: '38px',
                  paddingRight: '16px',
                  borderRadius: '16px',
                  border: '2px solid var(--border-subtle)',
                  fontSize: '22px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  background: 'var(--card-bg)',
                  color: 'var(--text-dark)',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {[10, 20, 50, 100, 200, 500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleAddChip(amt)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--card-bg)',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  +₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Payment Mode (for Expenses / Income) */}
          {currentType !== 'TRANSFER' && (
            <div style={{ marginBottom: '22px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Step 4: Payment Mode
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['UPI / GPay', 'Cash', 'Card / Bank'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setSelectedPaymentMode(mode);
                      soundAndVoice.playPillowTap();
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: '14px',
                      border: selectedPaymentMode === mode ? '2px solid #F59E0B' : '1px solid var(--border-subtle)',
                      background: selectedPaymentMode === mode ? '#FEF3C7' : 'var(--card-bg)',
                      color: selectedPaymentMode === mode ? '#92400E' : 'var(--text-dark)',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Giant Save Button */}
          <button
            onClick={handleCommitEntry}
            style={{
              width: '100%',
              height: '58px',
              borderRadius: '18px',
              border: currentType === 'TRANSFER' ? '2px solid #475569' : '2px solid #047857',
              background: currentType === 'TRANSFER'
                ? 'linear-gradient(135deg, #475569, #334155)'
                : 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              fontSize: '17px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: currentType === 'TRANSFER' ? '0 4px 0 #1E293B' : '0 4px 0 #065F46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Check size={20} />
            <span>
              {currentType === 'TRANSFER' ? 'RECORD TRANSFER / NEUTRAL ENTRY' : 'TICK & SAVE TO SHEET'}
            </span>
          </button>
        </div>

      </div>

      {/* Live Flat 7-Column Sheet Table with SEPARATE HISTORY TABS */}
      <div style={{
        background: 'var(--card-bg)',
        border: '2px solid var(--border-playful)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 4px 0 var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} color="#16A34A" /> Live Sheet Table &amp; History
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Separate views for Expenses, Income, and Neutral Transfers
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={handleExportExcel}
              style={{
                background: '#ECFDF5',
                color: '#065F46',
                border: '2px solid #A7F3D0',
                borderRadius: '14px',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📥 Download Excel (.CSV)
            </button>
            <button
              onClick={handleCopyGoogleSheets}
              style={{
                background: '#EFF6FF',
                color: '#1E40AF',
                border: '2px solid #BFDBFE',
                borderRadius: '14px',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Copy size={14} /> Copy for Google Sheets
            </button>
            <button
              onClick={handleSyncAllGoogleSheets}
              style={{
                background: '#FEF3C7',
                color: '#92400E',
                border: '2px solid #FDE68A',
                borderRadius: '14px',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Cloud size={14} /> Sync to Google Sheets
            </button>
          </div>
        </div>

        {/* 4 Separate History Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <button
            onClick={() => setHistoryFilter('ALL')}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              border: historyFilter === 'ALL' ? '2px solid #6366F1' : '1px solid var(--border-subtle)',
              background: historyFilter === 'ALL' ? '#EEF2FF' : 'transparent',
              color: historyFilter === 'ALL' ? '#4F46E5' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📋 All Transactions ({transactions.length})
          </button>
          
          <button
            onClick={() => setHistoryFilter('EXPENSE')}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              border: historyFilter === 'EXPENSE' ? '2px solid #FDA4AF' : '1px solid var(--border-subtle)',
              background: historyFilter === 'EXPENSE' ? '#FFF0F3' : 'transparent',
              color: historyFilter === 'EXPENSE' ? '#FF6B8B' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            💸 Expenses Only ({transactions.filter((t) => t.type === 'EXPENSE').length})
          </button>

          <button
            onClick={() => setHistoryFilter('INCOME')}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              border: historyFilter === 'INCOME' ? '2px solid #6EE7B7' : '1px solid var(--border-subtle)',
              background: historyFilter === 'INCOME' ? '#ECFDF5' : 'transparent',
              color: historyFilter === 'INCOME' ? '#10B981' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            💰 Income Only ({transactions.filter((t) => t.type === 'INCOME').length})
          </button>

          <button
            onClick={() => setHistoryFilter('TRANSFER')}
            style={{
              padding: '8px 14px',
              borderRadius: '12px',
              border: historyFilter === 'TRANSFER' ? '2px solid #94A3B8' : '1px solid var(--border-subtle)',
              background: historyFilter === 'TRANSFER' ? '#F1F5F9' : 'transparent',
              color: historyFilter === 'TRANSFER' ? '#334155' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 Transfers &amp; Neutral Only ({transactions.filter((t) => t.type === 'TRANSFER').length})
          </button>
        </div>

        <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '720px' }}>
            <thead>
              <tr style={{ background: 'var(--border-subtle)', textAlign: 'left', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 14px' }}>#</th>
                <th style={{ padding: '12px 14px' }}>Date</th>
                <th style={{ padding: '12px 14px' }}>Time</th>
                <th style={{ padding: '12px 14px' }}>Type</th>
                <th style={{ padding: '12px 14px' }}>Category &amp; Source</th>
                <th style={{ padding: '12px 14px' }}>Payment Mode</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ padding: '12px 14px' }}>Quick Note</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No entries in this view. Tick a category above or tap a daily habit to log an entry!
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t, idx) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>{t.date}</td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.time}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        background: 
                          t.type === 'INCOME' ? '#ECFDF5' :
                          t.type === 'EXPENSE' ? '#FFF0F3' : '#F1F5F9',
                        color: 
                          t.type === 'INCOME' ? '#10B981' :
                          t.type === 'EXPENSE' ? '#FF6B8B' : '#475569'
                      }}>
                        {t.type === 'INCOME' ? '💰 INCOME' : t.type === 'EXPENSE' ? '💸 EXPENSE' : '🔄 TRANSFER'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <strong>{t.category}</strong>
                      {t.source && <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>({t.source})</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '12px', background: 'var(--border-subtle)', padding: '2px 6px', borderRadius: '6px' }}>
                        {t.paymentMode}
                      </span>
                    </td>
                    <td className={isPrivate ? 'private-blur' : ''} style={{
                      padding: '12px 14px',
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: 
                        t.type === 'INCOME' ? '#10B981' : 
                        t.type === 'EXPENSE' ? '#FF6B8B' : '#475569'
                    }}>
                      {t.type === 'INCOME' ? '+' : t.type === 'EXPENSE' ? '-' : '↔'}₹{t.amount.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {t.note}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteTx(t.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#EF4444' }}
                        title="Delete entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Initial Cash & Bank Setup */}
      {showInitialModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '3px solid var(--border-playful)',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '500px',
            width: '100%',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowInitialModal(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '28px' }}>🪙</span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Set Initial Cash &amp; Bank
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Enter your current money so you can start tracking from scratch. These opening balances are <strong>never</strong> counted as income or expense!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wallet size={14} color="#10B981" /> Initial Cash in Hand (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={initCashAmount}
                  onChange={(e) => setInitCashAmount(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '14px',
                    border: '2px solid var(--border-subtle)',
                    padding: '0 14px',
                    fontSize: '16px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    marginTop: '4px',
                    background: 'var(--card-bg)',
                    color: 'var(--text-dark)',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Landmark size={14} color="#6366F1" /> Initial Bank Account Balance (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={initBankAmount}
                  onChange={(e) => setInitBankAmount(e.target.value)}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '14px',
                    border: '2px solid var(--border-subtle)',
                    padding: '0 14px',
                    fontSize: '16px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    marginTop: '4px',
                    background: 'var(--card-bg)',
                    color: 'var(--text-dark)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              onClick={handleSaveInitialBalances}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '16px',
                border: 'none',
                background: '#4F46E5',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #3730A3'
              }}
            >
              🚀 Save Starting Balances
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Custom Source */}
      {showAddSourceModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '3px solid var(--border-playful)',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '460px',
            width: '100%',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowAddSourceModal(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 10px 0' }}>
              + Add Custom Source
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Add a granular sub-option or source under <strong>{activeCategory.name}</strong>.
            </p>
            <input
              type="text"
              placeholder="e.g. Swiggy, Chai Tapri, Petrol Pump"
              value={newSourceText}
              onChange={(e) => setNewSourceText(e.target.value)}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '14px',
                border: '2px solid var(--border-subtle)',
                padding: '0 14px',
                fontSize: '14px',
                marginBottom: '16px',
                background: 'var(--card-bg)',
                color: 'var(--text-dark)',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSaveCustomSource}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '14px',
                border: 'none',
                background: '#4F46E5',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Save Source
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add Daily Habit */}
      {showAddHabitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '3px solid var(--border-playful)',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '460px',
            width: '100%',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowAddHabitModal(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 10px 0' }}>
              ⚡ Add 1-Tap Daily Routine
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Name</label>
                <input
                  type="text"
                  placeholder="e.g. Gym Protein Shake"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  style={{ width: '100%', height: '42px', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '0 12px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Emoji</label>
                <input
                  type="text"
                  value={newHabitIcon}
                  onChange={(e) => setNewHabitIcon(e.target.value)}
                  style={{ width: '100%', height: '42px', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '0 12px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Amount (₹)</label>
                <input
                  type="number"
                  placeholder="80"
                  value={newHabitAmount}
                  onChange={(e) => setNewHabitAmount(e.target.value)}
                  style={{ width: '100%', height: '42px', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '0 12px', marginTop: '4px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>Type</label>
                <select
                  value={newHabitType}
                  onChange={(e) => setNewHabitType(e.target.value as any)}
                  style={{ width: '100%', height: '42px', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '0 12px', marginTop: '4px' }}
                >
                  <option value="EXPENSE">Expense (-₹)</option>
                  <option value="INCOME">Income (+₹)</option>
                  <option value="TRANSFER">Transfer (Neutral)</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleSaveDailyHabit}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '14px',
                border: 'none',
                background: '#10B981',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Save Routine Item
            </button>
          </div>
        </div>
      )}

      {/* Modal: Google Sheets Auto-Sync Settings */}
      {showSyncModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '3px solid var(--border-playful)',
            borderRadius: '24px',
            padding: '28px',
            maxWidth: '560px',
            width: '100%',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowSyncModal(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 10px 0' }}>
              ☁️ Google Sheets Auto-Sync
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Paste your Google Apps Script Web App URL below to automatically append rows to your Google Sheet:
            </p>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={syncSettings.webhookUrl}
              onChange={(e) => setSyncSettings({ ...syncSettings, webhookUrl: e.target.value })}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                padding: '0 12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                marginBottom: '12px'
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="autoSyncCheck"
                checked={syncSettings.autoSync}
                onChange={(e) => setSyncSettings({ ...syncSettings, autoSync: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#4F46E5' }}
              />
              <label htmlFor="autoSyncCheck" style={{ fontSize: '13px', fontWeight: 700 }}>
                Automatically sync every ticked entry immediately
              </label>
            </div>

            <div style={{
              background: '#0F172A',
              color: '#38BDF8',
              fontFamily: 'monospace',
              fontSize: '11px',
              padding: '12px',
              borderRadius: '12px',
              overflowX: 'auto',
              marginBottom: '16px',
              maxHeight: '120px'
            }}>
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  var rows = Array.isArray(data) ? data : [data];
  rows.forEach(function(r) {
    sheet.appendRow([r.date, r.time, r.type, r.category + (r.source ? " (" + r.source + ")" : ""), r.paymentMode, Number(r.amount), r.note || "Ticked Entry"]);
  });
  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}`}
            </div>

            <button
              onClick={() => {
                setShowSyncModal(false);
                soundAndVoice.playSuccessChime();
                showToast('Google Sheets sync settings saved!');
              }}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '14px',
                border: 'none',
                background: '#10B981',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
