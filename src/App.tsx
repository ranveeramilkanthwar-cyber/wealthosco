import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  LayoutDashboard, 
  History, 
  Landmark, 
  Laptop, 
  Flame, 
  Smartphone, 
  Users, 
  FileSpreadsheet,
  HeartHandshake,
  CheckSquare
} from 'lucide-react';

// Core Financial Engines
import { DoubleEntryLedger } from '../core/financial-engine/doubleEntryLedger';
import { TransactionService } from '../core/financial-engine/transactionVariants';
import { CapExEngine, FixedAsset } from '../core/financial-engine/capexEngine';
import { BudgetEngine } from '../core/financial-engine/budgetEngine';
import { DebtEngine } from '../core/financial-engine/debtEngine';
import { AnalyticsAndTaxEngine } from '../core/financial-engine/analyticsAndTaxEngine';
import { toMicroUnits, fromMicroUnits, formatCurrency } from '../core/financial-engine/microUnits';
import { soundAndVoice } from '../core/financial-engine/audioSpeechEngine';
import { 
  loadSavedAccounts, 
  saveAccounts, 
  loadSavedTransactions, 
  saveTransactions, 
  loadSavedPostings, 
  savePostings, 
  clearAllStoredData 
} from '../core/financial-engine/storage';
import { Account, Transaction, LedgerPosting } from '../core/financial-engine/types';

// UI Components
import { Header, DisplayMode } from './components/Header';
import { SeniorChildEasyView } from './components/SeniorChildEasyView';
import { ZenBentoView } from './components/ZenBentoView';
import { TickPocketView } from './components/TickPocketView';
import { DashboardView } from './components/DashboardView';
import { AccountsView } from './components/AccountsView';
import { LedgerView } from './components/LedgerView';
import { CapexView } from './components/CapexView';
import { DebtOptimizerView } from './components/DebtOptimizerView';
import { IngestionView } from './components/IngestionView';
import { SplitwiseGraphView } from './components/SplitwiseGraphView';
import { TaxAndExportView } from './components/TaxAndExportView';
import { SimpleHomeView } from './components/SimpleHomeView';
import { InitialSetupModal } from './components/InitialSetupModal';
import { AddTransactionModal, TxType } from './components/AddTransactionModal';
import { AuthEngine, UserProfile } from '../core/auth/authEngine';
import { AuthScreen } from './components/AuthScreen';
import { UserSheetModal } from './components/UserSheetModal';
import { UserSheetSyncEngine } from '../core/sheets/userSheetSync';
import { UserProfileModal } from './components/UserProfileModal';
import { AnimatedIntro } from './components/AnimatedIntro';
import { OtherFlowModal, OtherFlowMode } from './components/OtherFlowModal';
import { MovingBackground } from './components/MovingBackground';
import { 
  getUserThemePrefs, 
  saveUserThemePrefs, 
  UserThemePrefs, 
  updateUserSheetRecord, 
  deleteUserSheetRecord,
  getPendingPeerBalances,
  settlePeerRecord
} from '../core/financial-engine/storage';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => AuthEngine.getActiveUser());

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    soundAndVoice.playSuccessChime();
  };

  const handleLogout = () => {
    AuthEngine.logout();
    setCurrentUser(null);
    soundAndVoice.playPillowTap();
  };

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <AuthenticatedApp
      key={currentUser.id}
      user={currentUser}
      onLogout={handleLogout}
    />
  );
}

interface AuthenticatedAppProps {
  user: UserProfile;
  onLogout: () => void;
}

function AuthenticatedApp({ user, onLogout }: AuthenticatedAppProps) {
  // 1. Initialize Financial Engine Core with LocalStorage Persistence scoped to user.id
  const [ledger] = useState(() => {
    const savedAccounts = loadSavedAccounts(user.id);
    const l = new DoubleEntryLedger(savedAccounts);
    
    // Hydrate existing saved transactions for THIS user
    const savedTransactions = loadSavedTransactions(user.id);
    const savedPostings = loadSavedPostings(user.id);

    for (const tx of savedTransactions) {
      const txPostings = savedPostings.filter((p) => p.transaction_id === tx.id);
      try {
        l.createJournalEntry({
          transaction: { ...tx },
          postings: txPostings.map((p) => ({ ...p })),
        });
      } catch (e) {
        // Handled
      }
    }
    return l;
  });

  const [capexEngine] = useState(() => {
    const ce = new CapExEngine();
    try {
      const saved = localStorage.getItem(`wealthos_user_${user.id}_capex`);
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.forEach((a: any) => {
          ce.registerAsset({
            name: a.name,
            account_id: a.account_id,
            purchase_transaction_id: a.purchase_transaction_id,
            purchase_date: a.purchase_date,
            initial_cost_micro: BigInt(a.initial_cost_micro),
            salvage_value_micro: BigInt(a.salvage_value_micro || '0'),
            useful_life_months: a.useful_life_months,
            warranty_expiry_date: a.warranty_expiry_date,
            depreciation_method: a.depreciation_method,
          });
        });
      }
    } catch {}
    return ce;
  });

  const [service] = useState(() => new TransactionService(ledger, undefined, capexEngine));
  const [budgetEngine] = useState(() => new BudgetEngine());
  const [debtEngine] = useState(() => new DebtEngine());
  const [analyticsEngine] = useState(() => new AnalyticsAndTaxEngine());

  // 2. Progressive Disclosure Mode (Default to v5.0 Easy-Going)
  const [mode, setMode] = useState<DisplayMode>('easy');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDayTheme, setIsDayTheme] = useState(false);
  const [mascotSpeech, setMascotSpeech] = useState(
    `Namaste ${user.name}! I am your private Money Helper. Tap or speak to me! 🐾`
  );

  const [activeTab, setActiveTab] = useState<
    'main' | 'tickpocket' | 'dashboard' | 'ledger' | 'accounts' | 'capex' | 'debt' | 'ingestion' | 'splitwise' | 'tax'
  >('main');
  
  const [activeEntity, setActiveEntity] = useState<string>('ALL');
  const [isVaultLocked, setIsVaultLocked] = useState(false);
  const [ledgerVersion, setLedgerVersion] = useState(1);

  // 10-Second Forgiving Undo State
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  // Initial Balance Setup & Add Transaction Modals
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(() => {
    try {
      const done = localStorage.getItem(`wealthos_user_${user.id}_initial_setup_completed`);
      const savedTx = loadSavedTransactions(user.id);
      return !done && savedTx.length === 0;
    } catch {
      return false;
    }
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalDefaultType, setAddModalDefaultType] = useState<TxType>('EXPENSE');
  const [isUserSheetModalOpen, setIsUserSheetModalOpen] = useState(false);
  const [isOtherFlowModalOpen, setIsOtherFlowModalOpen] = useState(false);
  const [otherFlowDefaultMode, setOtherFlowDefaultMode] = useState<OtherFlowMode>('SOMEONE_PAID_FOR_ME');

  // Profile & Aesthetics State
  const [themePrefs, setThemePrefs] = useState<UserThemePrefs>(() => getUserThemePrefs(user.id));
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(() => themePrefs.showIntroOnStart);

  const handleUpdateThemePrefs = (newPrefs: Partial<UserThemePrefs>) => {
    saveUserThemePrefs(user.id, newPrefs);
    setThemePrefs((prev) => ({ ...prev, ...newPrefs }));
  };

  // Change Starting Balances from Profile
  const handleProfileUpdateStartingBalances = (cash: number, bank: number, cc: number) => {
    try {
      const bankAcc = accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK')) || accounts[0];
      const cashAcc = accounts.find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH')) || accounts[1];
      const ccAcc = accounts.find((a) => a.id === 'acc_credit_card' || (a.account_type === 'LIABILITY' && a.account_subtype === 'CREDIT_CARD')) || accounts[2];
      const equityAcc = accounts.find((a) => a.id === 'acc_equity_opening' || a.account_type === 'EQUITY') || accounts[3];

      // Update DoubleEntryLedger internal accounts map directly
      ledger.setAccountBalance(cashAcc.id, toMicroUnits(cash));
      ledger.setAccountBalance(bankAcc.id, toMicroUnits(bank));
      if (ccAcc) ledger.setAccountBalance(ccAcc.id, toMicroUnits(cc));
      if (equityAcc) ledger.setAccountBalance(equityAcc.id, toMicroUnits(cash + bank - cc));

      // Persist in user profile database
      AuthEngine.updateUserProfile(user.id, { initialCash: cash, initialBank: bank });

      UserSheetSyncEngine.syncTransaction(user, {
        id: 'start_calib_' + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'TRANSFER',
        category: 'Starting Balance Calibration',
        description: `Calibrated Starting Balances: Cash ₹${cash}, Bank ₹${bank}`,
        amount: cash + bank,
        paymentAccount: 'Account Calibration',
      });

      localStorage.setItem(`wealthos_user_${user.id}_initial_setup_completed`, 'true');
      syncPersistence();
      soundAndVoice.playSuccessChime();
      triggerUndoBanner('init_setup', `Calibrated starting balances: Cash ₹${cash}, Bank ₹${bank}`);
      setMascotSpeech(`Updated starting balances to Cash ₹${cash} and Bank ₹${bank}! 👛`);
    } catch (err: any) {
      alert(`Error updating starting balances: ${err.message}`);
    }
  };

  // Auto-calibrate starting balances if provided during registration
  useEffect(() => {
    const isDone = localStorage.getItem(`wealthos_user_${user.id}_initial_setup_completed`);
    if (!isDone && ((user.initialCash ?? 0) > 0 || (user.initialBank ?? 0) > 0)) {
      handleProfileUpdateStartingBalances(user.initialCash ?? 0, user.initialBank ?? 0, 0);
      localStorage.setItem(`wealthos_user_${user.id}_initial_setup_completed`, 'true');
      setIsSetupModalOpen(false);
    }
  }, [user.id]);

  // Edit Transaction from Profile / Ledger
  const handleProfileEditTransaction = (
    txId: string,
    updated: { description: string; amount: number; category: string; date: string }
  ) => {
    try {
      const tx = ledger.getTransaction(txId);
      if (!tx) {
        alert('Transaction not found');
        return;
      }

      const txPostings = ledger.getPostingsForTransaction(txId);
      const isExpense = tx.transaction_type === 'EXPENSE';
      const isIncome = tx.transaction_type === 'INCOME';

      const sourceId = txPostings.find((p) => (isExpense ? p.direction === 'CREDIT' : p.direction === 'DEBIT'))?.account_id || 'acc_bank_primary';
      const destId = txPostings.find((p) => (isExpense ? p.direction === 'DEBIT' : p.direction === 'CREDIT'))?.account_id || 'acc_expense_other';

      // 1. Remove old transaction and revert its balance impact
      ledger.removeTransactionAndRevertPostings(txId);

      const amountMicro = toMicroUnits(updated.amount);

      // 2. Re-create updated transaction
      if (isExpense) {
        service.recordExpense({
          sourceAccountId: sourceId,
          expenseAccountId: destId,
          amountMicro,
          date: updated.date,
          description: updated.description,
        });
      } else if (isIncome) {
        service.recordIncome({
          destinationAccountId: sourceId,
          incomeAccountId: destId,
          amountMicro,
          date: updated.date,
          description: updated.description,
        });
      } else {
        service.recordTransfer({
          fromAccountId: sourceId,
          toAccountId: destId,
          amountMicro,
          date: updated.date,
          description: updated.description,
        });
      }

      // 3. Update in user spreadsheet
      updateUserSheetRecord(user.id, txId, {
        description: updated.description,
        amount: updated.amount,
        category: updated.category,
        date: updated.date,
      });

      syncPersistence();
      soundAndVoice.playSuccessChime();
      triggerUndoBanner(txId, `Updated ${updated.description} (₹${updated.amount})`);
      setMascotSpeech(`Updated transaction details successfully! ✨`);
    } catch (err: any) {
      alert(`Error editing transaction: ${err.message}`);
    }
  };

  // Delete Transaction from Profile / Ledger
  const handleProfileDeleteTransaction = (txId: string) => {
    try {
      const tx = ledger.getTransaction(txId);
      const desc = tx?.description || 'Transaction';
      ledger.removeTransactionAndRevertPostings(txId);
      deleteUserSheetRecord(user.id, txId);
      syncPersistence();
      soundAndVoice.playPillowTap();
      triggerUndoBanner(txId, `Deleted ${desc}`);
      setMascotSpeech(`Deleted transaction safely and restored account balances! 🗑️`);
    } catch (err: any) {
      alert(`Error deleting transaction: ${err.message}`);
    }
  };

  // Dynamic Background Style based on User Aesthetic Choice
  const getAestheticBackgroundStyle = (): React.CSSProperties => {
    if (themePrefs.customBgUrl && themePrefs.customBgUrl.trim()) {
      return {
        backgroundImage: `linear-gradient(rgba(10, 14, 26, ${themePrefs.glassOpacity}), rgba(10, 14, 26, ${themePrefs.glassOpacity})), url("${themePrefs.customBgUrl.trim()}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      };
    }

    switch (themePrefs.bgTheme) {
      case 'emerald':
        return {
          background: `radial-gradient(ellipse at 15% 20%, rgba(16, 185, 129, 0.28) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(5, 150, 105, 0.22) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(6, 78, 59, 0.3) 0%, transparent 70%), #022c22`,
        };
      case 'sunset':
        return {
          background: `radial-gradient(ellipse at 15% 20%, rgba(244, 63, 94, 0.28) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(168, 85, 247, 0.25) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 70%), #18051e`,
        };
      case 'cyberpunk':
        return {
          background: `radial-gradient(ellipse at 15% 20%, rgba(6, 182, 212, 0.28) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(236, 72, 153, 0.22) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 70%), #030712`,
        };
      case 'obsidian':
        return {
          background: `radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 60%, #020617 100%)`,
        };
      case 'frosted':
        return {
          background: `radial-gradient(circle at 50% 0%, #f8fafc 0%, #e2e8f0 60%, #cbd5e1 100%)`,
        };
      case 'aurora':
      default:
        return {
          background: `radial-gradient(ellipse at 20% 15%, rgba(99, 102, 241, 0.25) 0%, transparent 55%), radial-gradient(ellipse at 80% 85%, rgba(139, 92, 246, 0.22) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.12) 0%, transparent 70%), var(--bg-primary)`,
        };
    }
  };

  // Sync state to localStorage on ledger updates for THIS user
  const syncPersistence = () => {
    saveAccounts(ledger.getAllAccounts(), user.id);
    saveTransactions(ledger.getAllTransactions(), user.id);
    savePostings(ledger.getAllPostings(), user.id);
    setLedgerVersion((v) => v + 1);
  };

  // Day / Night Theme Toggle Effect
  useEffect(() => {
    if (isDayTheme) {
      document.body.classList.add('theme-day');
    } else {
      document.body.classList.remove('theme-day');
    }
  }, [isDayTheme]);

  // Mode Change Handler
  const handleSetMode = (newMode: DisplayMode) => {
    setMode(newMode);
    soundAndVoice.playPillowTap();
    if (newMode === 'easy') {
      setMascotSpeech('Namaste! Easy-Going Mode! Big buttons, voice reading, and classic passbook! 🧓');
    } else if (newMode === 'kid') {
      setMascotSpeech('Yay! Sprout Mode! Coins, piggies, and dragon shields activated! 🧸');
    } else if (newMode === 'zen') {
      setMascotSpeech('Everyday Zen Mode active! Clean, peaceful, and self-balancing. ✨');
    } else {
      setMascotSpeech('CA Pro Mode: Raw 64-bit micro-units, FIFO tax lots & strict audit trail. 🧐');
    }
  };

  // Peekaboo Privacy Mode
  const handleTogglePrivacy = () => {
    const next = !isPrivate;
    setIsPrivate(next);
    soundAndVoice.playPillowTap();
    setMascotSpeech(
      next
        ? '🙈 Peekaboo! My eyes are covered and all your balances are hidden!'
        : '👀 Back again! Your balances are now visible.'
    );
  };

  // Trigger 10-Second Undo Banner
  const triggerUndoBanner = (txId: string, message: string) => {
    setLastTxId(txId);
    setLastActionMessage(message);
    window.setTimeout(() => {
      setLastActionMessage((current) => (current === message ? null : current));
    }, 10000);
  };

  // Undo Last Action
  const handleUndoLastAction = () => {
    if (!lastTxId) return;
    try {
      service.createCompensatingReversal(lastTxId, 'Undo button tapped');
      syncPersistence();
      setLastActionMessage(null);
      setLastTxId(null);
      setMascotSpeech('Action undone! ↩️ Your previous balances are safely restored.');
    } catch (err: any) {
      alert(`Undo failed: ${err.message}`);
    }
  };

  // Reset Everything to Fresh Scratch for THIS user
  const handleResetScratch = () => {
    if (window.confirm('Wipe all personal ledger entries for this account and reset to clean scratch state?')) {
      clearAllStoredData(user.id);
      window.location.reload();
    }
  };

  // Add Account
  const handleAddAccount = (acc: Account) => {
    try {
      ledger.createAccount(acc);
      syncPersistence();
      soundAndVoice.playSuccessChime();
      setMascotSpeech(`Created new account: ${acc.name}!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Record Deposit (Opening Balance or Salary)
  const handleRecordDeposit = (amountMicro: bigint, note: string) => {
    try {
      const bankAcc = accounts.find((a) => a.account_subtype === 'BANK') || accounts[0];
      const result = service.recordIncome({
        destinationAccountId: bankAcc.id,
        incomeAccountId: 'acc_equity_opening',
        amountMicro,
        date: new Date().toISOString(),
        description: note,
      });
      syncPersistence();
      soundAndVoice.playSuccessChime();
      UserSheetSyncEngine.syncTransaction(user, {
        id: result.transaction.id,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'INCOME',
        category: 'Deposit / Equity',
        description: note,
        amount: Number(fromMicroUnits(amountMicro)),
        paymentAccount: bankAcc.name,
      });
      triggerUndoBanner(result.transaction.id, `Deposited ${formatCurrency(amountMicro)}`);
      setMascotSpeech(`Added ${formatCurrency(amountMicro)} safely to your bank pouch! 👛`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Quick Expense (from Picture tiles or Voice)
  const handleRecordQuickExpense = (
    categoryName: string,
    amountMicro: bigint,
    note: string,
    paymentMode: string = 'bank'
  ) => {
    try {
      const bankAcc = accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK')) || accounts[0];
      const cashAcc = accounts.find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH')) || accounts[1];
      const ccAcc = accounts.find((a) => a.id === 'acc_credit_card' || (a.account_type === 'LIABILITY' && a.account_subtype === 'CREDIT_CARD')) || accounts[2];

      const pMode = (paymentMode || 'bank').toLowerCase();
      const sourceAcc = pMode === 'cash' ? cashAcc : pMode === 'card' ? ccAcc : bankAcc;

      let expAcc = accounts.find((a) => a.name.toLowerCase().includes(categoryName.toLowerCase()) && a.account_type === 'EXPENSE');
      if (!expAcc) {
        expAcc = accounts.find((a) => a.account_type === 'EXPENSE') || accounts[5];
      }

      const result = service.recordExpense({
        sourceAccountId: sourceAcc.id,
        expenseAccountId: expAcc.id,
        amountMicro,
        date: new Date().toISOString(),
        description: note,
      });

      syncPersistence();
      soundAndVoice.playSuccessChime();
      UserSheetSyncEngine.syncTransaction(user, {
        id: result.transaction.id,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'EXPENSE',
        category: categoryName,
        description: note,
        amount: Number(fromMicroUnits(amountMicro)),
        paymentAccount: sourceAcc.name,
      });
      triggerUndoBanner(result.transaction.id, `Saved ${formatCurrency(amountMicro)} for ${note}`);
      setMascotSpeech(`Saved ${formatCurrency(amountMicro)} for ${note}! ✨`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Pay Bill
  const handlePayBill = (billName: string, amountMicro: bigint) => {
    try {
      const bankAcc = accounts.find((a) => a.account_subtype === 'BANK') || accounts[0];
      const rentAcc = accounts.find((a) => a.id === 'acc_expense_rent') || accounts[5];
      const result = service.recordExpense({
        sourceAccountId: bankAcc.id,
        expenseAccountId: rentAcc.id,
        amountMicro,
        date: new Date().toISOString(),
        description: `Paid ${billName}`,
      });
      syncPersistence();
      soundAndVoice.playSuccessChime();
      UserSheetSyncEngine.syncTransaction(user, {
        id: result.transaction.id,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'EXPENSE',
        category: 'Bills & Utilities',
        description: `Paid ${billName}`,
        amount: Number(fromMicroUnits(amountMicro)),
        paymentAccount: bankAcc.name,
      });
      triggerUndoBanner(result.transaction.id, `Paid ${billName} (${formatCurrency(amountMicro)})`);
      setMascotSpeech(`Marked ${billName} as paid! ✓`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Safe-to-Spend Coin Drop
  const handleDropCoin = () => {
    try {
      soundAndVoice.playCoinClink();
      const bankAcc = accounts.find((a) => a.account_subtype === 'BANK') || accounts[0];
      const foodAcc = accounts.find((a) => a.id === 'acc_expense_food') || accounts[5];

      const result = service.recordExpense({
        sourceAccountId: bankAcc.id,
        expenseAccountId: foodAcc.id,
        amountMicro: toMicroUnits(150),
        date: new Date().toISOString(),
        description: 'Mango Gelato Treat (Quick Orb Drop)',
      });

      syncPersistence();
      triggerUndoBanner(result.transaction.id, 'Spent ₹150 on Gelato Treat');
      setMascotSpeech('Clink! 🪙 ₹150 moved from Bank Jar to Treats Jar in 0.4ms!');
    } catch (err: any) {
      setMascotSpeech(`Error: ${err.message}`);
    }
  };

  // Natural Language & Magic Command Handler
  const handleExecuteCommand = (text: string) => {
    try {
      const lower = text.toLowerCase();
      const bankAcc = accounts.find((a) => a.account_subtype === 'BANK') || accounts[0];

      // Deposit
      if (lower.includes('deposit') || lower.includes('salary') || lower.includes('put money')) {
        const amtMatch = text.match(/\d+/);
        const amt = amtMatch ? parseInt(amtMatch[0], 10) : 10000;
        handleRecordDeposit(toMicroUnits(amt), text);
        return { success: true, message: `Deposited ₹${amt.toLocaleString()} successfully!` };
      }

      // Split
      if (lower.includes('split') && lower.includes('1800')) {
        const result = service.recordSplit({
          sourceAccountId: bankAcc.id,
          date: new Date().toISOString(),
          description: text,
          splitLegs: [
            { accountId: 'acc_expense_food', amountMicro: toMicroUnits(600), memo: 'My share of meal' },
            { accountId: 'acc_cash_wallet', amountMicro: toMicroUnits(1200), memo: 'Receivable from friends' },
          ],
        });
        syncPersistence();
        triggerUndoBanner(result.transaction.id, 'Split meal recorded');
        setMascotSpeech('Split dinner booked cleanly! 🍕');
        return { success: true, message: 'Split dinner recorded into double-entry ledger!' };
      }

      // Generic Expense
      const amtMatch = text.match(/\d+/);
      const amt = amtMatch ? parseInt(amtMatch[0], 10) : 250;
      const foodAcc = accounts.find((a) => a.account_type === 'EXPENSE') || accounts[5];
      const result = service.recordExpense({
        sourceAccountId: bankAcc.id,
        expenseAccountId: foodAcc.id,
        amountMicro: toMicroUnits(amt),
        date: new Date().toISOString(),
        description: text,
      });
      syncPersistence();
      triggerUndoBanner(result.transaction.id, `Spent ₹${amt}`);
      setMascotSpeech(`Recorded entry: ${text} (₹${amt})! ✨`);
      return { success: true, message: `Committed balanced entry for ${text} (₹${amt})` };
    } catch (err: any) {
      setMascotSpeech(`Error: ${err.message}`);
      return { success: false, message: err.message };
    }
  };

  // TickPocket Double-Entry Commit Handler
  const handleTickPocketCommit = (entry: {
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    category: string;
    source: string;
    amount: number;
    paymentMode: string;
    description: string;
  }) => {
    try {
      const amountMicro = toMicroUnits(entry.amount);
      const bankAcc = accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK')) || accounts[0];
      const cashAcc = accounts.find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH')) || accounts[1];
      const ccAcc = accounts.find((a) => a.id === 'acc_credit_card' || (a.account_type === 'LIABILITY' && a.account_subtype === 'CREDIT_CARD')) || accounts[2];
      const equityAcc = accounts.find((a) => a.id === 'acc_equity_opening' || a.account_type === 'EQUITY') || accounts[3];
      const pMode = (entry.paymentMode || '').toLowerCase();
      const isCash = pMode.includes('cash');
      const isCard = pMode.includes('card') && !pMode.includes('bank');
      const sourceAcc = isCash ? cashAcc : isCard ? ccAcc : bankAcc;

      if (entry.type === 'EXPENSE') {
        let expAcc = accounts.find((a) => a.name.toLowerCase().includes(entry.category.toLowerCase()) && a.account_type === 'EXPENSE');
        if (!expAcc) expAcc = accounts.find((a) => a.account_type === 'EXPENSE') || accounts[5];

        const result = service.recordExpense({
          sourceAccountId: sourceAcc.id,
          expenseAccountId: expAcc.id,
          amountMicro,
          date: new Date().toISOString(),
          description: entry.description,
        });
        syncPersistence();
        UserSheetSyncEngine.syncTransaction(user, {
          id: result.transaction.id,
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: entry.type,
          category: entry.category,
          description: entry.description,
          amount: entry.amount,
          paymentAccount: entry.paymentMode,
        });
        triggerUndoBanner(result.transaction.id, `Logged ${formatCurrency(amountMicro)} for ${entry.category}`);
        setMascotSpeech(`Saved ${formatCurrency(amountMicro)} for ${entry.category}! 🧾`);
      } else if (entry.type === 'INCOME') {
        const result = service.recordIncome({
          destinationAccountId: sourceAcc.id,
          incomeAccountId: 'acc_income_primary',
          amountMicro,
          date: new Date().toISOString(),
          description: entry.description,
        });
        syncPersistence();
        UserSheetSyncEngine.syncTransaction(user, {
          id: result.transaction.id,
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: entry.type,
          category: entry.category,
          description: entry.description,
          amount: entry.amount,
          paymentAccount: entry.paymentMode,
        });
        triggerUndoBanner(result.transaction.id, `Recorded income ${formatCurrency(amountMicro)} from ${entry.category}`);
        setMascotSpeech(`Added income ${formatCurrency(amountMicro)}! 💰`);
      } else if (entry.type === 'TRANSFER') {
        const isOpening = entry.category.toLowerCase().includes('opening') || entry.source.toLowerCase().includes('initial');
        if (isOpening) {
          const targetAsset = entry.paymentMode === 'Cash' ? cashAcc : bankAcc;
          const result = ledger.createJournalEntry({
            transaction: {
              transaction_date: new Date().toISOString(),
              posted_date: new Date().toISOString(),
              description: entry.description || 'Initial Starting Balance',
              transaction_type: 'TRANSFER',
              status: 'CLEARED',
              is_tax_deductible: false,
              deduplication_hash: 'init_' + targetAsset.id + '_' + Date.now(),
              attachment_urls: [],
              entity_id: 'PERSONAL',
            },
            postings: [
              {
                account_id: targetAsset.id,
                direction: 'DEBIT',
                amount_micro: amountMicro,
                memo: `Starting balance for ${targetAsset.name}`,
              },
              {
                account_id: equityAcc.id,
                direction: 'CREDIT',
                amount_micro: amountMicro,
                memo: 'Initial Equity Opening Balance',
              },
            ],
          });
          syncPersistence();
          UserSheetSyncEngine.syncTransaction(user, {
            id: result.transaction.id,
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            type: entry.type,
            category: entry.category,
            description: entry.description,
            amount: entry.amount,
            paymentAccount: entry.paymentMode,
          });
          triggerUndoBanner(result.transaction.id, `Set Starting Balance ${formatCurrency(amountMicro)} in ${targetAsset.name}`);
          setMascotSpeech(`Starting balance of ${formatCurrency(amountMicro)} set safely! 🚀`);
        } else {
          let fromAcc = bankAcc;
          let toAcc = cashAcc;
          if (entry.category.toLowerCase().includes('atm')) {
            fromAcc = bankAcc;
            toAcc = cashAcc;
          } else if (entry.category.toLowerCase().includes('deposit')) {
            fromAcc = cashAcc;
            toAcc = bankAcc;
          } else if (entry.category.toLowerCase().includes('credit card')) {
            fromAcc = bankAcc;
            toAcc = ccAcc;
          }
          const result = service.recordTransfer({
            fromAccountId: fromAcc.id,
            toAccountId: toAcc.id,
            amountMicro,
            date: new Date().toISOString(),
            description: entry.description,
          });
          syncPersistence();
          UserSheetSyncEngine.syncTransaction(user, {
            id: result.transaction.id,
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            type: entry.type,
            category: entry.category,
            description: entry.description,
            amount: entry.amount,
            paymentAccount: entry.paymentMode,
          });
          triggerUndoBanner(result.transaction.id, `Transferred ${formatCurrency(amountMicro)}`);
          setMascotSpeech(`Transferred ${formatCurrency(amountMicro)} between accounts! 🔄`);
        }
      }
    } catch (err: any) {
      alert(`Ledger error: ${err.message}`);
    }
  };

  // Initial Balance Setup Handler (Zero demo data)
  const handleSaveInitialBalances = (params: {
    cashAmount: number;
    bankAmount: number;
    ccOutstanding: number;
  }) => {
    handleProfileUpdateStartingBalances(params.cashAmount, params.bankAmount, params.ccOutstanding);
    setIsSetupModalOpen(false);
  };

  // Universal Add Transaction Handler (from Modal or Quick Buttons)
  const handleUniversalSaveTransaction = (tx: {
    type: TxType;
    category: string;
    amountMicro: bigint;
    note: string;
    paymentMode: 'bank' | 'cash' | 'card';
    fromAccount?: string;
    toAccount?: string;
    date: string;
  }) => {
    try {
      const bankAcc = accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK')) || accounts[0];
      const cashAcc = accounts.find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH')) || accounts[1];
      const ccAcc = accounts.find((a) => a.id === 'acc_credit_card' || (a.account_type === 'LIABILITY' && a.account_subtype === 'CREDIT_CARD')) || accounts[2];

      const sourceAsset = tx.paymentMode === 'cash' ? cashAcc : tx.paymentMode === 'card' ? ccAcc : bankAcc;

      if (tx.type === 'EXPENSE') {
        let expAcc = accounts.find((a) => a.name.toLowerCase().includes(tx.category.toLowerCase()) && a.account_type === 'EXPENSE');
        if (!expAcc) expAcc = accounts.find((a) => a.account_type === 'EXPENSE') || accounts[5];

        const result = service.recordExpense({
          sourceAccountId: sourceAsset.id,
          expenseAccountId: expAcc.id,
          amountMicro: tx.amountMicro,
          date: tx.date || new Date().toISOString(),
          description: tx.note,
        });
        syncPersistence();
        soundAndVoice.playSuccessChime();
        UserSheetSyncEngine.syncTransaction(user, {
          id: result.transaction.id,
          date: (tx.date ? new Date(tx.date) : new Date()).toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: tx.type,
          category: tx.category,
          description: tx.note,
          amount: Number(fromMicroUnits(tx.amountMicro)),
          paymentAccount: tx.paymentMode === 'cash' ? 'Cash in Hand' : tx.paymentMode === 'card' ? 'Credit Card' : 'Bank / UPI',
        });
        triggerUndoBanner(result.transaction.id, `Logged ${formatCurrency(tx.amountMicro)} for ${tx.note}`);
        setMascotSpeech(`Saved ${formatCurrency(tx.amountMicro)} for ${tx.note}! 🧾`);
      } else if (tx.type === 'INCOME') {
        let incAcc = accounts.find((a) => a.name.toLowerCase().includes(tx.category.toLowerCase()) && a.account_type === 'INCOME');
        if (!incAcc) incAcc = accounts.find((a) => a.id === 'acc_income_primary') || accounts[4];

        const result = service.recordIncome({
          destinationAccountId: sourceAsset.id,
          incomeAccountId: incAcc.id,
          amountMicro: tx.amountMicro,
          date: tx.date || new Date().toISOString(),
          description: tx.note,
        });
        syncPersistence();
        soundAndVoice.playSuccessChime();
        UserSheetSyncEngine.syncTransaction(user, {
          id: result.transaction.id,
          date: (tx.date ? new Date(tx.date) : new Date()).toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: tx.type,
          category: tx.category,
          description: tx.note,
          amount: Number(fromMicroUnits(tx.amountMicro)),
          paymentAccount: tx.paymentMode === 'cash' ? 'Cash in Hand' : tx.paymentMode === 'card' ? 'Credit Card' : 'Bank / UPI',
        });
        triggerUndoBanner(result.transaction.id, `Recorded income ${formatCurrency(tx.amountMicro)}`);
        setMascotSpeech(`Added ${formatCurrency(tx.amountMicro)} income from ${tx.note}! 💰`);
      } else {
        // TRANSFER (Non-Expense, Non-Income)
        let fromId = tx.fromAccount || bankAcc.id;
        let toId = tx.toAccount || cashAcc.id;

        const result = service.recordTransfer({
          fromAccountId: fromId,
          toAccountId: toId,
          amountMicro: tx.amountMicro,
          date: tx.date || new Date().toISOString(),
          description: tx.note,
        });
        syncPersistence();
        soundAndVoice.playSuccessChime();
        UserSheetSyncEngine.syncTransaction(user, {
          id: result.transaction.id,
          date: (tx.date ? new Date(tx.date) : new Date()).toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: tx.type,
          category: tx.category,
          description: tx.note,
          amount: Number(fromMicroUnits(tx.amountMicro)),
          paymentAccount: 'Account Transfer',
        });
        triggerUndoBanner(result.transaction.id, `Transferred ${formatCurrency(tx.amountMicro)}`);
        setMascotSpeech(`Transferred ${formatCurrency(tx.amountMicro)} between accounts! 🔄`);
      }
    } catch (err: any) {
      alert(`Transaction error: ${err.message}`);
    }
  };

  // Peer Flow & Other Expense / Other Income Handler
  const handleRecordOtherFlow = (data: {
    mode: OtherFlowMode;
    personName: string;
    amount: number;
    description: string;
    category: string;
    paymentAccount: string;
    dueDate?: string;
    settledRecordId?: string;
  }) => {
    try {
      const amtMicro = toMicroUnits(data.amount);
      const bankAcc = accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK')) || accounts[0];
      const cashAcc = accounts.find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH')) || accounts[1];
      const ccAcc = accounts.find((a) => a.id === 'acc_credit_card' || (a.account_type === 'LIABILITY' && a.account_subtype === 'CREDIT_CARD')) || accounts[2];
      const sourceAsset = data.paymentAccount.toLowerCase().includes('cash') ? cashAcc : bankAcc;

      let txId = 'flow_' + Date.now();

      if (data.mode === 'SOMEONE_PAID_FOR_ME') {
        // Someone paid on my behalf: My expense increases, I owe them (liability)
        let expAcc = accounts.find((a) => a.name.toLowerCase().includes(data.category.toLowerCase()) && a.account_type === 'EXPENSE');
        if (!expAcc) expAcc = accounts.find((a) => a.account_type === 'EXPENSE') || accounts[5];

        const res = service.recordExpense({
          sourceAccountId: ccAcc ? ccAcc.id : sourceAsset.id,
          expenseAccountId: expAcc.id,
          amountMicro: amtMicro,
          date: new Date().toISOString(),
          description: data.description,
        });
        txId = res.transaction.id;
        syncPersistence();
        setMascotSpeech(`Recorded other expense: ${data.personName} paid ₹${data.amount} on your behalf! 🤝`);
      } else if (data.mode === 'PAID_FOR_SOMEONE_ELSE') {
        // I paid from my bank/cash on someone's behalf: outflow from cash/bank
        let expAcc = accounts.find((a) => a.account_type === 'EXPENSE') || accounts[5];
        const res = service.recordExpense({
          sourceAccountId: sourceAsset.id,
          expenseAccountId: expAcc.id,
          amountMicro: amtMicro,
          date: new Date().toISOString(),
          description: data.description,
        });
        txId = res.transaction.id;
        syncPersistence();
        setMascotSpeech(`Paid ₹${data.amount} for ${data.personName}! Added to pending collections. 📤`);
      } else if (data.mode === 'REMAINING_TO_RECEIVE') {
        // Just record pending receivable / other income
        setMascotSpeech(`Recorded ₹${data.amount} to be received from ${data.personName}! ⏳`);
      } else if (data.mode === 'SETTLEMENT_RECEIVED') {
        // Inflow to my bank/cash!
        const incAcc = accounts.find((a) => a.account_type === 'INCOME') || accounts[4];
        const res = service.recordIncome({
          destinationAccountId: sourceAsset.id,
          incomeAccountId: incAcc.id,
          amountMicro: amtMicro,
          date: new Date().toISOString(),
          description: data.description,
        });
        txId = res.transaction.id;
        syncPersistence();
        if (data.settledRecordId) {
          settlePeerRecord(user.id, data.settledRecordId, data.amount);
        }
        setMascotSpeech(`Received ₹${data.amount} repayment from ${data.personName}! Balance updated! 💰`);
      }

      // Calculate running balance snapshots
      const curBank = Number(fromMicroUnits(bankAcc.balance_micro));
      const curCash = Number(fromMicroUnits(cashAcc.balance_micro));
      const curNetWorth = Number(fromMicroUnits(netWorth));

      // Sync to User Sheet & Database with all 17 detailed columns
      UserSheetSyncEngine.syncTransaction(user, {
        id: txId,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: data.mode === 'SOMEONE_PAID_FOR_ME' || data.mode === 'PAID_FOR_SOMEONE_ELSE' ? 'OTHER_EXPENSE' : 'OTHER_INCOME',
        scenario: data.mode,
        category: data.category,
        subCategory: data.mode.replace(/_/g, ' '),
        description: data.description,
        amount: data.amount,
        paymentAccount: data.paymentAccount,
        personName: data.personName,
        settlementStatus: data.mode === 'SETTLEMENT_RECEIVED' ? 'SETTLED' : 'PENDING',
        remainingAmount: data.mode === 'SETTLEMENT_RECEIVED' ? 0 : data.amount,
        dueDate: data.dueDate,
        runningBankBalance: curBank,
        runningCashBalance: curCash,
        netWorthSnapshot: curNetWorth,
        notes: data.description,
      });

      triggerUndoBanner(txId, `${data.mode.replace(/_/g, ' ')}: ₹${data.amount}`);
      soundAndVoice.playSuccessChime();
    } catch (err: any) {
      alert(`Flow recording error: ${err.message}`);
    }
  };

  const handleSettlePeerItem = (recordId: string, amount: number, personName: string) => {
    handleRecordOtherFlow({
      mode: 'SETTLEMENT_RECEIVED',
      personName,
      amount,
      description: `Settled repayment from ${personName}`,
      category: 'Peer Settlement',
      paymentAccount: 'Bank / UPI',
      settledRecordId: recordId,
    });
  };

  // CapEx Register Asset Handler
  const handleRegisterAsset = (params: {
    name: string;
    amountMicro: bigint;
    usefulLifeMonths: number;
    salvageValueMicro: bigint;
    warrantyExpiryDate?: string;
  }) => {
    try {
      const bankAcc = accounts.find((a) => a.account_subtype === 'BANK') || accounts[0];
      const fixedAccId = `acc_fixed_${Date.now()}`;
      
      // 1. Create fixed asset account in chart of accounts
      ledger.createAccount({
        id: fixedAccId,
        name: `Fixed Asset: ${params.name}`,
        account_type: 'ASSET',
        account_subtype: 'FIXED_ASSET',
        currency: 'INR',
        balance_micro: 0n,
        is_archived: false,
        entity_id: 'PERSONAL',
      });

      // 2. Record CapEx
      const result = service.recordCapEx({
        fundingAccountId: bankAcc.id,
        fixedAssetAccountId: fixedAccId,
        amountMicro: params.amountMicro,
        assetName: params.name,
        date: new Date().toISOString(),
        usefulLifeMonths: params.usefulLifeMonths,
        salvageValueMicro: params.salvageValueMicro,
        warrantyExpiryDate: params.warrantyExpiryDate,
        depreciationMethod: 'STRAIGHT_LINE',
      });

      // Save to localStorage
      const allAssets = capexEngine.getAllAssets();
      localStorage.setItem('wealthos_v4_capex', JSON.stringify(allAssets.map((a) => ({
        ...a,
        initial_cost_micro: a.initial_cost_micro.toString(),
        salvage_value_micro: a.salvage_value_micro.toString(),
        accumulated_depreciation_micro: a.accumulated_depreciation_micro.toString(),
        current_book_value_micro: a.current_book_value_micro.toString(),
      }))));

      syncPersistence();
      soundAndVoice.playSuccessChime();
      UserSheetSyncEngine.syncTransaction(user, {
        id: result.transaction.id,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'CAPEX',
        category: 'Fixed Asset',
        description: `Capitalized: ${params.name}`,
        amount: Number(fromMicroUnits(params.amountMicro)),
        paymentAccount: bankAcc.name,
      });
      triggerUndoBanner(result.transaction.id, `Capitalized ${params.name}`);
      setMascotSpeech(`Capitalized ${params.name} on balance sheet over ${params.usefulLifeMonths} months! 💻`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Step Depreciation
  const handleStepDepreciation = (assetId: string) => {
    try {
      const step = capexEngine.stepMonthlyDepreciation(assetId);
      const deprAcc = accounts.find((a) => a.account_subtype === 'CAPEX_AMORT') || accounts[5];
      
      const result = ledger.createJournalEntry({
        transaction: {
          transaction_date: new Date().toISOString(),
          posted_date: new Date().toISOString(),
          description: `Non-Cash Depreciation Month ${step.asset.months_depreciated}: ${step.asset.name}`,
          transaction_type: 'CAPEX_DEPRECIATION',
          status: 'CLEARED',
          attachment_urls: [],
          is_tax_deductible: true,
          entity_id: 'PERSONAL',
        },
        postings: [
          {
            account_id: deprAcc.id,
            direction: 'DEBIT',
            amount_micro: step.postings.amountMicro,
            memo: 'Monthly straight-line depreciation amortization',
          },
          {
            account_id: step.asset.account_id,
            direction: 'CREDIT',
            amount_micro: step.postings.amountMicro,
            memo: 'Asset book value reduction',
          },
        ],
      });

      syncPersistence();
      soundAndVoice.playSuccessChime();
      UserSheetSyncEngine.syncTransaction(user, {
        id: result.transaction.id,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'DEPRECIATION',
        category: 'Capex Amortization',
        description: `Depreciation: ${step.asset.name}`,
        amount: Number(fromMicroUnits(step.postings.amountMicro)),
        paymentAccount: 'Asset Amortization',
      });
      triggerUndoBanner(result.transaction.id, `Depreciation posted for Month ${step.asset.months_depreciated}`);
      setMascotSpeech(`Non-cash depreciation posted for Month ${step.asset.months_depreciated}! 📉`);
    } catch (err: any) {
      alert(`Depreciation failed: ${err.message}`);
    }
  };

  // Filtered Accounts & Transactions
  const accounts = useMemo(() => {
    const all = ledger.getAllAccounts();
    if (activeEntity === 'ALL') return all;
    return all.filter((a) => !a.entity_id || a.entity_id === activeEntity);
  }, [ledger, activeEntity, ledgerVersion]);

  const transactions = useMemo(() => {
    const all = ledger.getAllTransactions();
    if (activeEntity === 'ALL') return all;
    return all.filter((t) => !t.entity_id || t.entity_id === activeEntity);
  }, [ledger, activeEntity, ledgerVersion]);

  const postings = useMemo(() => ledger.getAllPostings(), [ledger, ledgerVersion]);
  const assets = useMemo(() => capexEngine.getAllAssets(), [capexEngine, ledgerVersion]);

  // Fundamental Accounting Equation Check
  const equation = useMemo(() => {
    return ledger.verifyFundamentalAccountingEquation();
  }, [ledger, ledgerVersion]);

  // Dynamic Safe-to-Spend
  const safeToSpend = useMemo(() => {
    const bankAcc = accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK'));
    const cashAcc = accounts.find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH'));
    const liquidCash = (bankAcc ? bankAcc.balance_micro : 0n) + (cashAcc ? cashAcc.balance_micro : 0n);

    // Sum unbilled statement dues
    const ccDues = accounts
      .filter((a) => a.account_subtype === 'CREDIT_CARD')
      .reduce((sum, a) => sum + a.balance_micro, 0n);

    return budgetEngine.calculateSafeToSpend({
      liquidCashMicro: liquidCash,
      upcomingFixedObligationsMicro: toMicroUnits(0),
      savingsLockMicro: toMicroUnits(0),
      outstandingStatementDuesMicro: ccDues,
    });
  }, [accounts, budgetEngine, ledgerVersion]);

  // KPIs
  const kpis = useMemo(() => {
    let income = 0n;
    let expenses = 0n;
    let liquid = 0n;

    for (const a of accounts) {
      if (a.account_type === 'INCOME') income += a.balance_micro;
      if (a.account_type === 'EXPENSE') expenses += a.balance_micro;
      if (a.account_subtype === 'BANK' || a.account_subtype === 'CASH') liquid += a.balance_micro;
    }

    return analyticsEngine.calculateInstitutionalKPIs({
      netIncomeMicro: income,
      totalOpExMicro: expenses,
      liquidCashMicro: liquid,
      threeMonthRollingOpExMicro: expenses > 0n ? expenses * 3n : toMicroUnits(30000),
      monthlyEmisMicro: toMicroUnits(0),
      minCcObligationsMicro: toMicroUnits(0),
      grossIncomeMicro: income,
      currentLiquidAssetsMicro: liquid,
      currentLiabilitiesDue30DaysMicro: toMicroUnits(0),
      discretionarySpendMicro: expenses,
      deltaNetWorthMicro: income - expenses,
      deltaDays: 30,
    });
  }, [accounts, analyticsEngine, ledgerVersion]);

  // Aggregated totals
  const totalAssets = useMemo(() => {
    return accounts
      .filter((a) => a.account_type === 'ASSET')
      .reduce((sum, a) => sum + a.balance_micro, 0n);
  }, [accounts]);

  const totalLiabilities = useMemo(() => {
    return accounts
      .filter((a) => a.account_type === 'LIABILITY')
      .reduce((sum, a) => sum + a.balance_micro, 0n);
  }, [accounts]);

  const monthlyIncome = useMemo(() => {
    return accounts
      .filter((a) => a.account_type === 'INCOME')
      .reduce((sum, a) => sum + a.balance_micro, 0n);
  }, [accounts]);

  const monthlyExpense = useMemo(() => {
    return accounts
      .filter((a) => a.account_type === 'EXPENSE')
      .reduce((sum, a) => sum + a.balance_micro, 0n);
  }, [accounts]);

  const netSurplus = monthlyIncome - monthlyExpense;
  const netWorth = totalAssets - totalLiabilities;

  // Navigation helpers
  type TabId = 'main' | 'tickpocket' | 'dashboard' | 'ledger' | 'accounts' | 'capex' | 'debt' | 'ingestion' | 'splitwise' | 'tax';

  const BOTTOM_NAV_TABS: TabId[] = ['main', 'tickpocket', 'ledger', 'dashboard'];
  const isBottomNavTab = BOTTOM_NAV_TABS.includes(activeTab);
  const [showMorePanel, setShowMorePanel] = useState(false);

  const PAGE_META: Record<TabId, { label: string; icon: string; desc: string }> = {
    main:        { label: mode === 'easy' ? 'Easy-Going Passbook' : '✨ Zen Bento', icon: '🏠', desc: 'Your personal finance home screen' },
    tickpocket:  { label: 'TickPocket', icon: '☑️', desc: 'Tick-Mark expense & income tracker' },
    ledger:      { label: 'Journal', icon: '📒', desc: 'Double-entry transaction history' },
    dashboard:   { label: 'Dashboard', icon: '📊', desc: 'KPIs, charts & performance metrics' },
    accounts:    { label: 'Accounts', icon: '🏦', desc: 'Chart of accounts & deposits' },
    capex:       { label: 'Fixed Assets', icon: '💻', desc: 'CapEx registry & depreciation' },
    debt:        { label: 'Debt & Loans', icon: '🔥', desc: 'Loan simulator & debt optimizer' },
    ingestion:   { label: 'SMS & Bills', icon: '📱', desc: 'Auto-parse SMS & receipts' },
    splitwise:   { label: 'Split Expenses', icon: '👥', desc: 'Group debt simplifier' },
    tax:         { label: 'Tax & Exports', icon: '📤', desc: 'CA audit exports, XIRR & tax' },
  };

  const MORE_TOOLS: TabId[] = ['accounts', 'capex', 'debt', 'ingestion', 'splitwise', 'tax'];

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setShowMorePanel(false);
    soundAndVoice.playPillowTap();
  };

  const handleBack = () => {
    setActiveTab('main');
    setShowMorePanel(false);
    soundAndVoice.playUndoSwoosh();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '80px',
        ...getAestheticBackgroundStyle(),
        transition: 'background 0.3s ease',
      }}
    >
      {/* Moving Playful Animated Background Layer */}
      <MovingBackground
        theme={themePrefs.bgTheme}
        movingEnabled={themePrefs.movingBackground}
        customBgUrl={themePrefs.customBgUrl}
        opacity={themePrefs.glassOpacity}
      />

      {/* WealthOS Universal Header */}
      <Header
        mode={mode}
        onSetMode={handleSetMode}
        isPrivate={isPrivate}
        onTogglePrivacy={handleTogglePrivacy}
        mascotSpeech={mascotSpeech}
        isVaultLocked={isVaultLocked}
        onToggleVault={() => setIsVaultLocked(!isVaultLocked)}
        isDayTheme={isDayTheme}
        onToggleTheme={() => setIsDayTheme(!isDayTheme)}
        onResetScratch={handleResetScratch}
        isEquationBalanced={equation.isBalanced}
        equationDiff={equation.difference}
        currentUser={user}
        onLogout={onLogout}
        onOpenSheetModal={() => setIsUserSheetModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      {/* Per-Page Top Bar with Back Button (shown on non-home pages) */}
      {activeTab !== 'main' && (
        <div style={{
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '10px 20px 0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <button
            onClick={handleBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '8px 14px',
              color: 'var(--accent-indigo)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 700,
              backdropFilter: 'blur(8px)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
            title="Go back to Home"
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>←</span>
            <span>Back</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>{PAGE_META[activeTab].icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1 }}>
                {PAGE_META[activeTab].label}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {PAGE_META[activeTab].desc}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '16px 20px 32px 20px', flex: 1 }}>

        {/* View Switching */}
        {activeTab === 'main' && (
          mode === 'zen' ? (
            <ZenBentoView
              mode={mode}
              isPrivate={isPrivate}
              safeToSpend={safeToSpend}
              accounts={accounts}
              transactions={transactions}
              postings={postings}
              onDropCoin={handleDropCoin}
              onExecuteCommand={handleExecuteCommand}
              onOpenDepositModal={() => handleRecordDeposit(toMicroUnits(50000), 'Opening Capital Deposit')}
            />
          ) : (
            <SimpleHomeView
              isPrivate={isPrivate}
              accounts={accounts}
              transactions={transactions}
              postings={postings}
              safeToSpend={safeToSpend}
              onRecordQuickExpense={handleRecordQuickExpense}
              onRecordDeposit={handleRecordDeposit}
              onPayBill={handlePayBill}
              onRecordTransfer={(category, amountMicro, note, fromId, toId) => {
                const res = service.recordTransfer({
                  fromAccountId: fromId || 'acc_bank_primary',
                  toAccountId: toId || 'acc_cash_wallet',
                  amountMicro,
                  date: new Date().toISOString(),
                  description: note,
                });
                syncPersistence();
                soundAndVoice.playSuccessChime();
                UserSheetSyncEngine.syncTransaction(user, {
                  id: res.transaction.id,
                  date: new Date().toISOString().slice(0, 10),
                  time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                  type: 'TRANSFER',
                  category: category || 'Transfer',
                  description: note,
                  amount: Number(fromMicroUnits(amountMicro)),
                  paymentAccount: 'Account Transfer',
                });
                triggerUndoBanner(res.transaction.id, `Transferred ${formatCurrency(amountMicro)}`);
              }}
              onUndoLastAction={handleUndoLastAction}
              lastActionMessage={lastActionMessage}
              onNavigateTab={handleTabChange}
              onOpenSetupModal={() => setIsSetupModalOpen(true)}
              onOpenAddModal={(type = 'EXPENSE') => {
                setAddModalDefaultType(type);
                setIsAddModalOpen(true);
              }}
              isInitialSetupDone={Boolean(localStorage.getItem(`wealthos_user_${user.id}_initial_setup_completed`))}
              currentUser={user}
              onOpenSheetModal={() => setIsUserSheetModalOpen(true)}
              onOpenProfileModal={() => setIsProfileModalOpen(true)}
              onOpenOtherFlowModal={(mode = 'SOMEONE_PAID_FOR_ME') => {
                setOtherFlowDefaultMode(mode);
                setIsOtherFlowModalOpen(true);
              }}
              onSettlePeerFlow={handleSettlePeerItem}
            />
          )
        )}

        {activeTab === 'tickpocket' && (
          <TickPocketView
            isPrivate={isPrivate}
            onCommitDoubleEntry={handleTickPocketCommit}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            kpis={kpis}
            totalAssetsMicro={totalAssets}
            totalLiabilitiesMicro={totalLiabilities}
            netWorthMicro={netWorth}
            monthlyIncomeMicro={monthlyIncome}
            monthlyExpenseMicro={monthlyExpense}
            netSurplusMicro={netSurplus}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerView
            transactions={transactions}
            postings={postings}
            accounts={accounts}
            onReversal={(txId) => {
              service.createCompensatingReversal(txId, 'User initiated correction');
              syncPersistence();
              setMascotSpeech('Compensating reversal committed! 🔄');
            }}
            onBack={handleBack}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            accounts={accounts}
            onAddAccount={handleAddAccount}
            onRecordDeposit={(accId, amt, note) => {
              const targetAcc = accounts.find((a) => a.id === accId) || accounts[0];
              const result = service.recordIncome({
                destinationAccountId: targetAcc.id,
                incomeAccountId: 'acc_equity_opening',
                amountMicro: amt,
                date: new Date().toISOString(),
                description: note,
              });
              syncPersistence();
              soundAndVoice.playSuccessChime();
              UserSheetSyncEngine.syncTransaction(user, {
                id: result.transaction.id,
                date: new Date().toISOString().slice(0, 10),
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                type: 'INCOME',
                category: 'Deposit / Equity',
                description: note,
                amount: Number(fromMicroUnits(amt)),
                paymentAccount: targetAcc.name,
              });
              triggerUndoBanner(result.transaction.id, `Deposited ${formatCurrency(amt)} into ${targetAcc.name}`);
              setMascotSpeech(`Deposited ${formatCurrency(amt)} into ${targetAcc.name}!`);
            }}
          />
        )}

        {activeTab === 'capex' && (
          <CapexView
            assets={assets}
            onStepDepreciation={handleStepDepreciation}
            onRegisterAsset={handleRegisterAsset}
          />
        )}

        {activeTab === 'debt' && <DebtOptimizerView />}

        {activeTab === 'ingestion' && <IngestionView />}

        {activeTab === 'splitwise' && <SplitwiseGraphView />}

        {activeTab === 'tax' && (
          <TaxAndExportView
            accounts={accounts}
            transactions={transactions}
            postings={postings}
          />
        )}
      </main>

      {/* ─── Bottom Navigation Bar ─── */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: isDayTheme
          ? 'rgba(255,255,255,0.95)'
          : 'rgba(10,14,26,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '6px 0 env(safe-area-inset-bottom, 6px) 0',
        zIndex: 500,
        boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          maxWidth: '560px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          alignItems: 'stretch',
        }}>

          {/* 1. Home */}
          <button
            onClick={() => handleTabChange('main')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px 4px',
              gap: '3px',
              transition: 'all 0.15s ease',
              opacity: activeTab === 'main' ? 1 : 0.55,
            }}
          >
            <div style={{
              width: '42px',
              height: '28px',
              borderRadius: '14px',
              background: activeTab === 'main' ? 'rgba(99,102,241,0.2)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              fontSize: '20px',
            }}>
              🏠
            </div>
            <span style={{ fontSize: '10px', fontWeight: activeTab === 'main' ? 800 : 600, color: activeTab === 'main' ? 'var(--accent-indigo)' : 'var(--text-muted)' }}>
              Home
            </span>
          </button>

          {/* 2. Add (TickPocket) */}
          <button
            onClick={() => handleTabChange('tickpocket')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px 4px',
              gap: '3px',
              transition: 'all 0.15s ease',
              opacity: activeTab === 'tickpocket' ? 1 : 0.55,
            }}
          >
            <div style={{
              width: '42px',
              height: '28px',
              borderRadius: '14px',
              background: activeTab === 'tickpocket' ? 'rgba(16,185,129,0.2)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              fontSize: '20px',
            }}>
              ☑️
            </div>
            <span style={{ fontSize: '10px', fontWeight: activeTab === 'tickpocket' ? 800 : 600, color: activeTab === 'tickpocket' ? '#10B981' : 'var(--text-muted)' }}>
              TickSheet
            </span>
          </button>

          {/* 3. FAB Centre — Quick Add Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '4px' }}>
            <button
              onClick={() => {
                setAddModalDefaultType('EXPENSE');
                setIsAddModalOpen(true);
                soundAndVoice.playPillowTap();
              }}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                border: '3px solid var(--bg-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 4px 18px rgba(99,102,241,0.55)',
                transition: 'transform 0.15s ease',
                marginTop: '-18px',
              }}
              title="Quick Add Transaction"
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              ✚
            </button>
          </div>

          {/* 4. History / Ledger */}
          <button
            onClick={() => handleTabChange('ledger')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px 4px',
              gap: '3px',
              transition: 'all 0.15s ease',
              opacity: activeTab === 'ledger' ? 1 : 0.55,
              position: 'relative',
            }}
          >
            <div style={{
              width: '42px',
              height: '28px',
              borderRadius: '14px',
              background: activeTab === 'ledger' ? 'rgba(6,182,212,0.2)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              fontSize: '20px',
            }}>
              📒
            </div>
            {transactions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '6px',
                right: '8px',
                background: '#EF4444',
                color: '#FFF',
                borderRadius: '10px',
                padding: '1px 5px',
                fontSize: '9px',
                fontWeight: 800,
                minWidth: '16px',
                textAlign: 'center',
              }}>
                {transactions.length}
              </div>
            )}
            <span style={{ fontSize: '10px', fontWeight: activeTab === 'ledger' ? 800 : 600, color: activeTab === 'ledger' ? '#06B6D4' : 'var(--text-muted)' }}>
              History
            </span>
          </button>

          {/* 5. More Tools */}
          <button
            onClick={() => setShowMorePanel((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px 4px',
              gap: '3px',
              transition: 'all 0.15s ease',
              opacity: showMorePanel || MORE_TOOLS.includes(activeTab) ? 1 : 0.55,
            }}
          >
            <div style={{
              width: '42px',
              height: '28px',
              borderRadius: '14px',
              background: showMorePanel || MORE_TOOLS.includes(activeTab) ? 'rgba(245,158,11,0.2)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              fontSize: '20px',
            }}>
              ⋯
            </div>
            <span style={{ fontSize: '10px', fontWeight: 800, color: showMorePanel || MORE_TOOLS.includes(activeTab) ? '#F59E0B' : 'var(--text-muted)' }}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* ─── "More Tools" Slide-Up Panel ─── */}
      {showMorePanel && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowMorePanel(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(3px)',
              zIndex: 498,
            }}
          />
          {/* Panel */}
          <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(95vw, 480px)',
            background: isDayTheme ? 'rgba(255,255,255,0.98)' : 'rgba(14,21,36,0.98)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '24px',
            padding: '16px',
            zIndex: 499,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.3)',
            animation: 'slideUpPanel 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--border-subtle)', margin: '0 auto 10px' }} />
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>More Tools</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {MORE_TOOLS.map((tab) => {
                const meta = PAGE_META[tab];
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    style={{
                      background: isActive ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                      border: isActive ? '2px solid rgba(99,102,241,0.5)' : '1px solid var(--border-subtle)',
                      borderRadius: '16px',
                      padding: '14px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = isActive ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)')}
                  >
                    <span style={{ fontSize: '26px' }}>{meta.icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: isActive ? 'var(--accent-indigo)' : 'var(--text-primary)', textAlign: 'center', lineHeight: 1.2 }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                      {meta.desc.length > 28 ? meta.desc.slice(0, 26) + '…' : meta.desc}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setShowMorePanel(false);
                  setIsProfileModalOpen(true);
                  soundAndVoice.playPillowTap();
                }}
                style={{
                  background: 'rgba(99,102,241,0.18)',
                  border: '1.5px solid rgba(99,102,241,0.5)',
                  borderRadius: '16px',
                  padding: '14px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '26px' }}>👤</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#A5B4FC', textAlign: 'center', lineHeight: 1.2 }}>
                  Profile &amp; Themes
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                  Balances &amp; Glass
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Animated Welcome / Starting Intro */}
      {showIntro && (
        <AnimatedIntro
          userName={user.name.split(' ')[0]}
          onFinish={() => setShowIntro(false)}
          initiallyShowOnStart={themePrefs.showIntroOnStart}
          onToggleShowOnStart={(show) => handleUpdateThemePrefs({ showIntroOnStart: show })}
        />
      )}

      {/* User Profile, Starting Balances, Transaction Editor & Aesthetics Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        accounts={accounts}
        transactions={transactions}
        postings={postings}
        onUpdateStartingBalances={handleProfileUpdateStartingBalances}
        onEditTransaction={handleProfileEditTransaction}
        onDeleteTransaction={handleProfileDeleteTransaction}
        themePrefs={themePrefs}
        onUpdateThemePrefs={handleUpdateThemePrefs}
        onReplayIntro={() => setShowIntro(true)}
        onOpenSheetModal={() => setIsUserSheetModalOpen(true)}
      />

      {/* Initial Starting Balance Setup Modal */}
      <InitialSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onSaveBalances={handleSaveInitialBalances}
        currentCash={Number(fromMicroUnits(accounts.find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH'))?.balance_micro || 0n))}
        currentBank={Number(fromMicroUnits(accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK'))?.balance_micro || 0n))}
        currentCC={Number(fromMicroUnits(accounts.find((a) => a.id === 'acc_credit_card' || (a.account_type === 'LIABILITY' && a.account_subtype === 'CREDIT_CARD'))?.balance_micro || 0n))}
      />

      {/* Quick Add Transaction Modal (Expense, Income, Transfer) */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultType={addModalDefaultType}
        onSaveTransaction={handleUniversalSaveTransaction}
      />

      {/* User Personal Excel & Google Sheet Sync Modal */}
      <UserSheetModal
        isOpen={isUserSheetModalOpen}
        onClose={() => setIsUserSheetModalOpen(false)}
        user={user}
      />

      {/* Peer Flows & Other Expense / Other Income Modal */}
      <OtherFlowModal
        isOpen={isOtherFlowModalOpen}
        onClose={() => setIsOtherFlowModalOpen(false)}
        defaultMode={otherFlowDefaultMode}
        pendingRecords={getPendingPeerBalances(user.id).pendingToReceive}
        onRecordFlow={handleRecordOtherFlow}
      />

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: isDayTheme ? 'rgba(253, 251, 247, 0.95)' : 'rgba(8, 12, 20, 0.95)', padding: '10px 24px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
          <div>WealthOS v5.0 • 64-Bit Micro-Units • {equation.isBalanced ? '✅ Balanced' : '⚠️ Check'}</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span>Theme: {isDayTheme ? '☀️ Day' : '🌙 Night'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
