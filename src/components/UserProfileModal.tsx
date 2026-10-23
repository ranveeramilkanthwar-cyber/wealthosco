import React, { useState } from 'react';
import {
  User,
  Wallet,
  Building2,
  CreditCard,
  Edit3,
  Trash2,
  Palette,
  Sparkles,
  Check,
  X,
  Play,
  Save,
  Search,
  Filter,
  Sliders,
  Image as ImageIcon,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  Link as LinkIcon,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import { UserProfile } from '../../core/auth/authEngine';
import { Transaction, LedgerPosting, Account } from '../../core/financial-engine/types';
import { formatCurrency, fromMicroUnits, toMicroUnits } from '../../core/financial-engine/microUnits';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';
import { 
  UserThemePrefs, 
  getUserThemePrefs, 
  saveUserThemePrefs,
  getUserSheetUrl,
  saveUserSheetUrl
} from '../../core/financial-engine/storage';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  accounts: Account[];
  transactions: Transaction[];
  postings: LedgerPosting[];
  onUpdateStartingBalances: (cash: number, bank: number, cc: number) => void;
  onEditTransaction: (txId: string, updated: { description: string; amount: number; category: string; date: string }) => void;
  onDeleteTransaction: (txId: string) => void;
  themePrefs: UserThemePrefs;
  onUpdateThemePrefs: (prefs: Partial<UserThemePrefs>) => void;
  onReplayIntro: () => void;
  onOpenSheetModal: () => void;
}

export const THEME_PRESETS = [
  {
    id: 'aurora',
    name: 'Cosmic Aurora Glass',
    desc: 'Deep cosmic violet, indigo & cyan mesh with frosted glass',
    previewGradient: 'linear-gradient(135deg, #1e1b4b, #311042, #064e3b)',
    accent: '#818CF8',
  },
  {
    id: 'emerald',
    name: 'Emerald Zen Glass',
    desc: 'Luxe deep emerald forest & calming jade glow',
    previewGradient: 'linear-gradient(135deg, #064e3b, #047857, #022c22)',
    accent: '#10B981',
  },
  {
    id: 'sunset',
    name: 'Sunset Velvet Glass',
    desc: 'Warm rose gold, plum & amber dusk glow',
    previewGradient: 'linear-gradient(135deg, #4c0519, #701a75, #18051e)',
    accent: '#F43F5E',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon Glass',
    desc: 'Deep dark slate with electric cyan and magenta sheen',
    previewGradient: 'linear-gradient(135deg, #082f49, #4a044e, #030712)',
    accent: '#06B6D4',
  },
  {
    id: 'obsidian',
    name: 'Midnight Obsidian',
    desc: 'Pure luxury pitch-black ultra-minimal glass',
    previewGradient: 'linear-gradient(135deg, #1e293b, #0f172a, #020617)',
    accent: '#94A3B8',
  },
  {
    id: 'frosted',
    name: 'Morning Pearl Light',
    desc: 'Clean, radiant frosted glass with gentle shadows',
    previewGradient: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)',
    accent: '#475569',
  },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  accounts,
  transactions,
  postings,
  onUpdateStartingBalances,
  onEditTransaction,
  onDeleteTransaction,
  themePrefs,
  onUpdateThemePrefs,
  onReplayIntro,
  onOpenSheetModal,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'transactions' | 'aesthetic' | 'settings'>('profile');

  // Starting Balances State
  const cashAcc = accounts.find((a) => a.account_subtype === 'CASH') || accounts[1];
  const bankAcc = accounts.find((a) => a.account_subtype === 'BANK') || accounts[0];
  const ccAcc = accounts.find((a) => a.account_subtype === 'CREDIT_CARD') || accounts[2];

  const [editCash, setEditCash] = useState(() => (cashAcc ? Number(fromMicroUnits(cashAcc.balance_micro)) : 0));
  const [editBank, setEditBank] = useState(() => (bankAcc ? Number(fromMicroUnits(bankAcc.balance_micro)) : 0));
  const [editCC, setEditCC] = useState(() => (ccAcc ? Number(fromMicroUnits(ccAcc.balance_micro)) : 0));
  const [savedBalancesMsg, setSavedBalancesMsg] = useState(false);

  // User Google Sheet / Excel Link State
  const [userSheetUrl, setUserSheetUrl] = useState(() => getUserSheetUrl(user.id));
  const [sheetUrlSavedMsg, setSheetUrlSavedMsg] = useState(false);

  const handleSaveSheetUrl = () => {
    soundAndVoice.playPillowTap();
    saveUserSheetUrl(user.id, userSheetUrl);
    setSheetUrlSavedMsg(true);
    setTimeout(() => setSheetUrlSavedMsg(false), 2500);
  };

  // Transactions Manager State
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME' | 'TRANSFER'>('ALL');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxForm, setEditTxForm] = useState<{
    description: string;
    amount: number;
    category: string;
    date: string;
  }>({
    description: '',
    amount: 0,
    category: '',
    date: '',
  });

  // Aesthetic State
  const [selectedTheme, setSelectedTheme] = useState(themePrefs.bgTheme);
  const [customBgUrl, setCustomBgUrl] = useState(themePrefs.customBgUrl);
  const [glassOpacity, setGlassOpacity] = useState(themePrefs.glassOpacity);
  const [glassBlur, setGlassBlur] = useState(themePrefs.glassBlur);
  const [savedThemeMsg, setSavedThemeMsg] = useState(false);

  if (!isOpen) return null;

  // Save Starting Balances
  const handleSaveBalances = () => {
    soundAndVoice.playSuccessChime();
    onUpdateStartingBalances(editCash, editBank, editCC);
    setSavedBalancesMsg(true);
    setTimeout(() => setSavedBalancesMsg(false), 2500);
  };

  // Start editing a transaction
  const handleStartEditTx = (tx: Transaction) => {
    const txPostings = postings.filter((p) => p.transaction_id === tx.id);
    const amount = txPostings.length > 0 ? Number(fromMicroUnits(txPostings[0].amount_micro)) : 0;
    setEditingTxId(tx.id);
    setEditTxForm({
      description: tx.description,
      amount,
      category: tx.merchant_id || tx.project_or_event_id || (tx.transaction_type === 'EXPENSE' ? 'General Expense' : 'General'),
      date: tx.transaction_date ? tx.transaction_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    soundAndVoice.playPillowTap();
  };

  const handleSaveEditedTx = () => {
    if (!editingTxId) return;
    if (editTxForm.amount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }
    soundAndVoice.playSuccessChime();
    onEditTransaction(editingTxId, editTxForm);
    setEditingTxId(null);
  };

  const handleDeleteTx = (txId: string) => {
    if (window.confirm('Are you sure you want to delete this transaction? Balances will be recalculated.')) {
      soundAndVoice.playPillowTap();
      onDeleteTransaction(txId);
    }
  };

  // Save Theme Preferences
  const handleApplyTheme = () => {
    soundAndVoice.playSuccessChime();
    onUpdateThemePrefs({
      bgTheme: selectedTheme,
      customBgUrl,
      glassOpacity,
      glassBlur,
    });
    setSavedThemeMsg(true);
    setTimeout(() => setSavedThemeMsg(false), 2500);
  };

  // Filtered transactions
  const filteredTxs = transactions.filter((tx) => {
    if (txFilter !== 'ALL' && tx.transaction_type !== txFilter) return false;
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase();
      return (
        (tx.description || '').toLowerCase().includes(q) ||
        (tx.merchant_id || '').toLowerCase().includes(q) ||
        tx.transaction_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
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
          width: 'min(94vw, 760px)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '28px',
          padding: '24px',
          zIndex: 999,
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.8)',
          color: '#F8FAFC',
          animation: 'fadeInScale 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 900,
                color: '#FFF',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#FFFFFF' }}>
                  {user.name}
                </h2>
                <span
                  style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    color: '#A5B4FC',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '8px',
                  }}
                >
                  @{user.username}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '3px 0 0' }}>
                {user.email} • {user.gender || 'Private'} • Born {user.dob || 'N/A'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '8px 12px',
              color: '#94A3B8',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '16px',
            marginBottom: '22px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('profile');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: activeTab === 'profile' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 8px',
              color: activeTab === 'profile' ? '#FFF' : '#94A3B8',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Wallet size={15} />
            <span>Balances</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('transactions');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: activeTab === 'transactions' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 8px',
              color: activeTab === 'transactions' ? '#FFF' : '#94A3B8',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Edit3 size={15} />
            <span>Edit Data</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('aesthetic');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: activeTab === 'aesthetic' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 8px',
              color: activeTab === 'aesthetic' ? '#FFF' : '#94A3B8',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Palette size={15} />
            <span>Aesthetics</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('settings');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: activeTab === 'settings' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 8px',
              color: activeTab === 'settings' ? '#FFF' : '#94A3B8',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Sheets &amp; Tools</span>
          </button>
        </div>

        {/* ═══════════ TAB 1: EDIT STARTING BALANCES ═══════════ */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '16px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Sparkles size={20} color="#818CF8" />
              <div style={{ fontSize: '0.82rem', color: '#CBD5E1', lineHeight: 1.4 }}>
                <strong>Change Your Starting Balances Anytime:</strong> Enter your physical cash and real bank balance. WealthOS will automatically calibrate your accounts and update your personal spreadsheet!
              </div>
            </div>

            {/* Cash in Hand Input */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>💵</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#F8FAFC' }}>
                  Starting Cash in Hand
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>(Wallet / Cash Pouch)</span>
              </div>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', fontWeight: 800, color: '#F59E0B' }}>
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editCash}
                  onChange={(e) => setEditCash(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px 10px 36px',
                    color: '#FFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setEditCash((c) => c + amt);
                      soundAndVoice.playPillowTap();
                    }}
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
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
              </div>
            </div>

            {/* Bank Balance Input */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>🏦</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#F8FAFC' }}>
                  Starting Bank Account / UPI Balance
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>(Savings Account)</span>
              </div>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', fontWeight: 800, color: '#3B82F6' }}>
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editBank}
                  onChange={(e) => setEditBank(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 14px 10px 36px',
                    color: '#FFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[10000, 25000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setEditBank((b) => b + amt);
                      soundAndVoice.playPillowTap();
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
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
              </div>
            </div>

            {/* Credit Card Outstanding */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>💳</span>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#F8FAFC' }}>
                  Starting Credit Card Outstanding (Optional)
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', fontWeight: 800, color: '#EF4444' }}>
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editCC}
                  onChange={(e) => setEditCC(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    fontSize: '1rem',
                    fontWeight: 700,
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '8px 12px 8px 32px',
                    color: '#FFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveBalances}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
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
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                transition: 'transform 0.15s ease',
              }}
            >
              {savedBalancesMsg ? <Check size={18} /> : <Save size={18} />}
              <span>{savedBalancesMsg ? 'Starting Balances Calibrated! ✓' : 'Save & Update Starting Balances'}</span>
            </button>
          </div>
        )}

        {/* ═══════════ TAB 2: EDIT & CHANGE TRANSACTIONS ═══════════ */}
        {activeTab === 'transactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['ALL', 'EXPENSE', 'INCOME', 'TRANSFER'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTxFilter(type);
                      soundAndVoice.playPillowTap();
                    }}
                    style={{
                      background: txFilter === type ? '#6366F1' : 'rgba(255, 255, 255, 0.06)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: txFilter === type ? '#FFF' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '0.74rem',
                      cursor: 'pointer',
                    }}
                  >
                    {type === 'ALL' ? 'All' : type === 'EXPENSE' ? '💸 Expenses' : type === 'INCOME' ? '💰 Income' : '🔄 Transfers'}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div style={{ position: 'relative', width: '200px' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search data..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '6px 10px 6px 30px',
                    color: '#FFF',
                    fontSize: '0.76rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Inline Edit Form if an item is selected for editing */}
            {editingTxId && (
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1.5px solid #6366F1',
                  borderRadius: '18px',
                  padding: '16px',
                  animation: 'fadeInScale 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#A5B4FC', fontSize: '0.9rem' }}>
                    <Edit3 size={16} />
                    <span>Editing Transaction #{editingTxId.slice(0, 12)}...</span>
                  </div>
                  <button
                    onClick={() => setEditingTxId(null)}
                    style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', fontWeight: 800 }}
                  >
                    ✕ Cancel
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '4px', fontWeight: 700 }}>
                      Description / Note
                    </label>
                    <input
                      type="text"
                      value={editTxForm.description}
                      onChange={(e) => setEditTxForm({ ...editTxForm, description: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        color: '#FFF',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '4px', fontWeight: 700 }}>
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={editTxForm.amount}
                      onChange={(e) => setEditTxForm({ ...editTxForm, amount: parseFloat(e.target.value) || 0 })}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        color: '#FFF',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '4px', fontWeight: 700 }}>
                      Category
                    </label>
                    <input
                      type="text"
                      value={editTxForm.category}
                      onChange={(e) => setEditTxForm({ ...editTxForm, category: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        color: '#FFF',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginBottom: '4px', fontWeight: 700 }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={editTxForm.date}
                      onChange={(e) => setEditTxForm({ ...editTxForm, date: e.target.value })}
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        color: '#FFF',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveEditedTx}
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    color: '#FFF',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Save size={14} />
                  <span>Save Changes to Ledger &amp; Sheet</span>
                </button>
              </div>
            )}

            {/* List of Transactions */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTxs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '0.85rem' }}>
                  No transactions found matching criteria.
                </div>
              ) : (
                filteredTxs.map((tx) => {
                  const txPostings = postings.filter((p) => p.transaction_id === tx.id);
                  const amountMicro = txPostings.length > 0 ? txPostings[0].amount_micro : 0n;
                  const isExp = tx.transaction_type === 'EXPENSE';
                  const isInc = tx.transaction_type === 'INCOME';

                  return (
                    <div
                      key={tx.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              color: isExp ? '#EF4444' : isInc ? '#10B981' : '#818CF8',
                              background: isExp
                                ? 'rgba(239,68,68,0.15)'
                                : isInc
                                ? 'rgba(16,185,129,0.15)'
                                : 'rgba(129,140,248,0.15)',
                            }}
                          >
                            {tx.transaction_type}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                            {tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString('en-IN') : ''}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.description}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: isExp ? '#EF4444' : isInc ? '#10B981' : '#A5B4FC',
                            }}
                          >
                            {isInc ? '+' : isExp ? '-' : ''}
                            {formatCurrency(amountMicro)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleStartEditTx(tx)}
                            style={{
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              borderRadius: '8px',
                              padding: '6px',
                              color: '#A5B4FC',
                              cursor: 'pointer',
                            }}
                            title="Edit this entry"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '8px',
                              padding: '6px',
                              color: '#EF4444',
                              cursor: 'pointer',
                            }}
                            title="Delete this entry"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═══════════ TAB 3: AESTHETICS & TRANSPARENT BACKGROUNDS ═══════════ */}
        {activeTab === 'aesthetic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '4px' }}>
                Select Aesthetic Theme Preset
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginBottom: '12px' }}>
                Curated transparent glassmorphic backgrounds for a luxury fintech visual experience.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {THEME_PRESETS.map((preset) => {
                  const isSelected = selectedTheme === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        setSelectedTheme(preset.id);
                        soundAndVoice.playPillowTap();
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: isSelected ? `2px solid ${preset.accent}` : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: preset.previewGradient,
                          boxShadow: `0 4px 14px ${preset.accent}44`,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <Check size={18} color="#FFF" />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.84rem', color: isSelected ? preset.accent : '#F8FAFC' }}>
                          {preset.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94A3B8', lineHeight: 1.2, marginTop: '2px' }}>
                          {preset.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Image / Wallpaper URL */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <ImageIcon size={16} color="#818CF8" />
                <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#F8FAFC' }}>
                  Custom Wallpaper URL (Optional)
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '0 0 10px 0' }}>
                Paste any high-res wallpaper image URL (Unsplash, scenic, dark aesthetic) to render beneath your frosted glass panels.
              </p>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={customBgUrl}
                onChange={(e) => setCustomBgUrl(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  color: '#FFF',
                  fontSize: '0.8rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Transparency & Frosted Blur Controls */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px' }}>
                  <span style={{ color: '#F8FAFC' }}>Glass Opacity:</span>
                  <span style={{ color: '#818CF8' }}>{Math.round(glassOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={glassOpacity}
                  onChange={(e) => setGlassOpacity(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#818CF8' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '6px' }}>
                  <span style={{ color: '#F8FAFC' }}>Frosted Blur:</span>
                  <span style={{ color: '#10B981' }}>{glassBlur}px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="30"
                  step="2"
                  value={glassBlur}
                  onChange={(e) => setGlassBlur(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#10B981' }}
                />
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyTheme}
              style={{
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
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
              }}
            >
              {savedThemeMsg ? <Check size={18} /> : <Palette size={18} />}
              <span>{savedThemeMsg ? 'Theme & Background Applied! ✓' : 'Apply Aesthetic Theme'}</span>
            </button>
          </div>
        )}

        {/* ═══════════ TAB 4: SHEETS & MORE SETTINGS ═══════════ */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Google Sheet & Excel Link Connection Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(99, 102, 241, 0.08))',
                border: '1.5px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '20px',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileSpreadsheet size={20} color="#34D399" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#F8FAFC' }}>
                      Connect Your Google Sheet or Excel Link
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                      Auto-sync all expenses, incomes, and transfers to your personal sheet in real-time
                    </div>
                  </div>
                </div>
                {userSheetUrl ? (
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.18)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      color: '#34D399',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '12px',
                    }}
                  >
                    🟢 Active &amp; Linked
                  </span>
                ) : (
                  <span
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      color: '#FBBF24',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '12px',
                    }}
                  >
                    ⚠️ Not Linked Yet
                  </span>
                )}
              </div>

              <div style={{ marginTop: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#CBD5E1', marginBottom: '6px' }}>
                  Your Google Sheet / Excel Online URL or Webhook:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/... or Excel Online link"
                    value={userSheetUrl}
                    onChange={(e) => setUserSheetUrl(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      color: '#FFF',
                      fontSize: '0.84rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSaveSheetUrl}
                    style={{
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 18px',
                      color: '#FFF',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    {sheetUrlSavedMsg ? <Check size={15} /> : <Save size={15} />}
                    <span>{sheetUrlSavedMsg ? 'Saved! ✓' : 'Save &amp; Link'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Open Sheet & Create New Sheet */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px' }}>
                {userSheetUrl && (
                  <button
                    onClick={() => window.open(userSheetUrl, '_blank')}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      color: '#34D399',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Open My Sheet in New Tab</span>
                  </button>
                )}

                <button
                  onClick={() => window.open('https://sheets.new', '_blank')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    color: '#CBD5E1',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <PlusCircle size={13} />
                  <span>Create Free Google Sheet</span>
                </button>
              </div>

              <div style={{ marginTop: '12px', fontSize: '0.72rem', color: '#94A3B8', lineHeight: 1.4 }}>
                💡 <b>How it works:</b> Paste your sheet URL here. Every time you log an expense, receive income, or transfer funds, a row is automatically appended to your personal spreadsheet with exact timestamps, categories, and account balances.
              </div>
            </div>
            {/* Replay Intro Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#F8FAFC', marginBottom: '2px' }}>
                  🎬 Replay Animated Welcome Intro
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                  Watch the 3D coin bounce, floating gold particles, and cinematic entrance again.
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onReplayIntro();
                }}
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                }}
              >
                <Play size={14} />
                <span>Play Intro</span>
              </button>
            </div>

            {/* Open Spreadsheet Center */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '18px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#34D399', marginBottom: '2px' }}>
                  📊 Open Personal Spreadsheet Center
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                  Download Excel (.xls/.csv), copy to Google Sheets, or configure your cloud webhook.
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenSheetModal();
                }}
                style={{
                  background: '#10B981',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Open Sheet</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Account Details Box */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '18px',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94A3B8', marginBottom: '10px', textTransform: 'uppercase' }}>
                Account Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: '#64748B' }}>User ID: </span>
                  <span style={{ fontFamily: 'monospace', color: '#CBD5E1' }}>{user.id}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Registered: </span>
                  <span style={{ color: '#CBD5E1' }}>{new Date(user.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Date of Birth: </span>
                  <span style={{ color: '#CBD5E1' }}>{user.dob || 'Not specified'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Gender: </span>
                  <span style={{ color: '#CBD5E1' }}>{user.gender || 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
