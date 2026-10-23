// Enterprise Fintech Engine: Per-User Local Storage Persistence & State Hydration
// Safely serializes BigInt micro-units to and from localStorage scoped by User ID.

import { Account, Transaction, LedgerPosting } from './types';
import { STARTER_ACCOUNTS } from './sampleData';

function getAccountsKey(userId?: string): string {
  return userId ? `wealthos_user_${userId}_accounts` : 'wealthos_v4_accounts';
}

function getTransactionsKey(userId?: string): string {
  return userId ? `wealthos_user_${userId}_transactions` : 'wealthos_v4_transactions';
}

function getPostingsKey(userId?: string): string {
  return userId ? `wealthos_user_${userId}_postings` : 'wealthos_v4_postings';
}

function getCapexKey(userId?: string): string {
  return userId ? `wealthos_user_${userId}_capex` : 'wealthos_v4_capex';
}

export function loadSavedAccounts(userId?: string): Account[] {
  try {
    const raw = localStorage.getItem(getAccountsKey(userId));
    if (!raw) return STARTER_ACCOUNTS.map((a) => ({ ...a }));
    const parsed = JSON.parse(raw);
    return parsed.map((a: any) => ({
      ...a,
      balance_micro: BigInt(a.balance_micro || '0'),
      credit_limit_micro: a.credit_limit_micro ? BigInt(a.credit_limit_micro) : null,
    }));
  } catch (err) {
    console.error('Failed to load accounts from storage, using starter accounts', err);
    return STARTER_ACCOUNTS.map((a) => ({ ...a }));
  }
}

export function saveAccounts(accounts: Account[], userId?: string): void {
  try {
    const serializable = accounts.map((a) => ({
      ...a,
      balance_micro: a.balance_micro.toString(),
      credit_limit_micro: a.credit_limit_micro ? a.credit_limit_micro.toString() : null,
    }));
    localStorage.setItem(getAccountsKey(userId), JSON.stringify(serializable));
  } catch (err) {
    console.error('Failed to save accounts', err);
  }
}

export function loadSavedTransactions(userId?: string): Transaction[] {
  try {
    const raw = localStorage.getItem(getTransactionsKey(userId));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

export function saveTransactions(transactions: Transaction[], userId?: string): void {
  try {
    localStorage.setItem(getTransactionsKey(userId), JSON.stringify(transactions));
  } catch (err) {
    console.error('Failed to save transactions', err);
  }
}

export function loadSavedPostings(userId?: string): LedgerPosting[] {
  try {
    const raw = localStorage.getItem(getPostingsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((p: any) => ({
      ...p,
      amount_micro: BigInt(p.amount_micro),
    }));
  } catch (err) {
    return [];
  }
}

export function savePostings(postings: LedgerPosting[], userId?: string): void {
  try {
    const serializable = postings.map((p) => ({
      ...p,
      amount_micro: p.amount_micro.toString(),
    }));
    localStorage.setItem(getPostingsKey(userId), JSON.stringify(serializable));
  } catch (err) {
    console.error('Failed to save postings', err);
  }
}

export function clearAllStoredData(userId?: string): void {
  localStorage.removeItem(getAccountsKey(userId));
  localStorage.removeItem(getTransactionsKey(userId));
  localStorage.removeItem(getPostingsKey(userId));
  localStorage.removeItem(getCapexKey(userId));
  if (userId) {
    localStorage.removeItem(`wealthos_user_${userId}_initial_setup_completed`);
    localStorage.removeItem(`wealthos_user_${userId}_sheet_history`);
    localStorage.removeItem(`wealthos_user_${userId}_gsheet_url`);
  } else {
    localStorage.removeItem('wealthos_initial_setup_completed');
  }
}

// User-Specific Google Sheet & Excel Data Store
export interface UserSheetRecord {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  userName: string;
  userEmail: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  paymentAccount: string;
}

export function appendUserSheetRecord(userId: string, record: UserSheetRecord): void {
  try {
    const key = `wealthos_user_${userId}_sheet_history`;
    const existingRaw = localStorage.getItem(key);
    const list: UserSheetRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
    list.unshift(record);
    localStorage.setItem(key, JSON.stringify(list));

    // If user configured a Google Sheets Webhook URL, post to it in background
    const gsheetUrl = localStorage.getItem(`wealthos_user_${userId}_gsheet_url`);
    if (gsheetUrl && gsheetUrl.startsWith('http')) {
      fetch(gsheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      }).catch((e) => console.log('GSheet sync error', e));
    }
  } catch (err) {
    console.error('Failed to append user sheet record', err);
  }
}

export function getUserSheetRecords(userId: string): UserSheetRecord[] {
  try {
    const raw = localStorage.getItem(`wealthos_user_${userId}_sheet_history`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function updateUserSheetRecord(userId: string, recordId: string, updatedFields: Partial<UserSheetRecord>): void {
  try {
    const key = `wealthos_user_${userId}_sheet_history`;
    const records = getUserSheetRecords(userId);
    const updated = records.map((r) => (r.id === recordId ? { ...r, ...updatedFields } : r));
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update user sheet record', err);
  }
}

export function deleteUserSheetRecord(userId: string, recordId: string): void {
  try {
    const key = `wealthos_user_${userId}_sheet_history`;
    const records = getUserSheetRecords(userId);
    const updated = records.filter((r) => r.id !== recordId);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete user sheet record', err);
  }
}

export function getUserSheetUrl(userId: string): string {
  try {
    return localStorage.getItem(`wealthos_user_${userId}_gsheet_url`) || '';
  } catch {
    return '';
  }
}

export function saveUserSheetUrl(userId: string, url: string): void {
  try {
    localStorage.setItem(`wealthos_user_${userId}_gsheet_url`, url.trim());
  } catch (err) {
    console.error('Failed to save user sheet URL', err);
  }
}

// User Aesthetic Themes & Transparent Background Preferences
export interface UserThemePrefs {
  bgTheme: string; // 'aurora' | 'emerald' | 'sunset' | 'cyberpunk' | 'obsidian' | 'frosted' | 'custom'
  customBgUrl: string;
  glassOpacity: number; // 0.3 to 0.95
  glassBlur: number; // 6 to 30 px
  showIntroOnStart: boolean;
}

export const DEFAULT_THEME_PREFS: UserThemePrefs = {
  bgTheme: 'aurora',
  customBgUrl: '',
  glassOpacity: 0.85,
  glassBlur: 16,
  showIntroOnStart: true,
};

export function getUserThemePrefs(userId: string): UserThemePrefs {
  try {
    const raw = localStorage.getItem(`wealthos_user_${userId}_theme_prefs`);
    if (!raw) return { ...DEFAULT_THEME_PREFS };
    return { ...DEFAULT_THEME_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_THEME_PREFS };
  }
}

export function saveUserThemePrefs(userId: string, prefs: Partial<UserThemePrefs>): void {
  try {
    const current = getUserThemePrefs(userId);
    const next = { ...current, ...prefs };
    localStorage.setItem(`wealthos_user_${userId}_theme_prefs`, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to save theme preferences', err);
  }
}

