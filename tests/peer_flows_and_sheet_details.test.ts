import { describe, it, expect, beforeEach } from 'vitest';
import { UserSheetSyncEngine } from '../core/sheets/userSheetSync';
import { UserProfile } from '../core/auth/authEngine';
import { 
  appendUserSheetRecord, 
  getUserSheetRecords, 
  getPendingPeerBalances, 
  settlePeerRecord,
  saveAccounts,
  loadSavedAccounts,
  saveUserThemePrefs,
  getUserThemePrefs
} from '../core/financial-engine/storage';
import { DoubleEntryLedger } from '../core/financial-engine/doubleEntryLedger';
import { toMicroUnits, fromMicroUnits } from '../core/financial-engine/microUnits';

// Node localStorage polyfill
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => store.get(k) || null,
  setItem: (k: string, v: string) => store.set(k, String(v)),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
};
(globalThis as any).localStorage = localStorageMock;

describe('Peer Flows, Detailed Sheets, and Interconnected Starting Balances', () => {
  const mockUser: UserProfile = {
    id: 'test_user_peer_flow',
    username: 'test_fin_user',
    name: 'Fin User',
    email: 'fin@wealthos.co',
    passwordHash: 'hash',
    dob: '1995-05-15',
    gender: 'Other',
    createdAt: new Date().toISOString(),
    initialCash: 15000,
    initialBank: 65000,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Correctly formats and records all 17 detailed columns in user sheet ledger', () => {
    UserSheetSyncEngine.syncTransaction(mockUser, {
      id: 'tx_detail_001',
      date: '2026-10-24',
      time: '10:30 AM',
      type: 'OTHER_EXPENSE',
      scenario: 'SOMEONE_PAID_FOR_ME',
      category: 'Food & Dining',
      subCategory: 'Team Lunch',
      description: 'Lunch paid by Rohan on my behalf',
      amount: 450,
      paymentAccount: 'Paid on Behalf',
      personName: 'Rohan',
      settlementStatus: 'PENDING',
      remainingAmount: 450,
      runningBankBalance: 65000,
      runningCashBalance: 15000,
      netWorthSnapshot: 80000,
    });

    const records = getUserSheetRecords(mockUser.id);
    expect(records.length).toBe(1);
    const r = records[0];
    expect(r.type).toBe('OTHER_EXPENSE');
    expect(r.scenario).toBe('SOMEONE_PAID_FOR_ME');
    expect(r.personName).toBe('Rohan');
    expect(r.remainingAmount).toBe(450);
    expect(r.runningBankBalance).toBe(65000);
    expect(r.runningCashBalance).toBe(15000);

    // Verify CSV generation contains the 17 rich columns
    const csv = UserSheetSyncEngine.generateUserCSV(mockUser);
    expect(csv).toContain('Financial Scenario');
    expect(csv).toContain('Other Person Involved');
    expect(csv).toContain('Rohan');
    expect(csv).toContain('450.00');
  });

  it('2. Correctly tracks pending debts (to pay) and receivables (to receive)', () => {
    // Record Someone Paid For Me (I owe ₹600)
    UserSheetSyncEngine.syncTransaction(mockUser, {
      id: 'flow_owe_01',
      date: '2026-10-24',
      time: '10:35 AM',
      type: 'OTHER_EXPENSE',
      scenario: 'SOMEONE_PAID_FOR_ME',
      category: 'Cab & Travel',
      description: 'Cab fare paid by Priya for me',
      amount: 600,
      paymentAccount: 'Bank / UPI',
      personName: 'Priya',
      settlementStatus: 'PENDING',
      remainingAmount: 600,
    });

    // Record I Paid For Someone Else (They owe me ₹1,200)
    UserSheetSyncEngine.syncTransaction(mockUser, {
      id: 'flow_rec_01',
      date: '2026-10-24',
      time: '10:40 AM',
      type: 'OTHER_EXPENSE',
      scenario: 'PAID_FOR_SOMEONE_ELSE',
      category: 'Dining Out',
      description: 'Dinner paid for Amit',
      amount: 1200,
      paymentAccount: 'Bank / UPI',
      personName: 'Amit',
      settlementStatus: 'PENDING',
      remainingAmount: 1200,
    });

    // Record Remaining Money To Receive (They owe me ₹500)
    UserSheetSyncEngine.syncTransaction(mockUser, {
      id: 'flow_rec_02',
      date: '2026-10-24',
      time: '10:45 AM',
      type: 'OTHER_INCOME',
      scenario: 'REMAINING_TO_RECEIVE',
      category: 'Trip Share',
      description: 'Remaining trip split from Rahul',
      amount: 500,
      paymentAccount: 'Bank / UPI',
      personName: 'Rahul',
      settlementStatus: 'PENDING',
      remainingAmount: 500,
    });

    const pending = getPendingPeerBalances(mockUser.id);
    expect(pending.totalToPay).toBe(600); // Owes Priya
    expect(pending.totalToReceive).toBe(1700); // 1200 (Amit) + 500 (Rahul)
    expect(pending.netPeerBalance).toBe(1100); // Net positive receivable
    expect(pending.pendingToPay.length).toBe(1);
    expect(pending.pendingToReceive.length).toBe(2);

    // Settle Amit's debt (settle ₹1200)
    settlePeerRecord(mockUser.id, 'flow_rec_01', 1200);

    const pendingAfter = getPendingPeerBalances(mockUser.id);
    expect(pendingAfter.totalToReceive).toBe(500); // Only Rahul remaining!
    expect(pendingAfter.pendingToReceive.length).toBe(1);
    expect(pendingAfter.pendingToReceive[0].personName).toBe('Rahul');
  });

  it('3. Ensures initial starting balance remains rock-solid and interconnected', () => {
    // Calibrate starting balance
    const accounts = loadSavedAccounts(mockUser.id);
    const ledger = new DoubleEntryLedger(accounts);

    const cashAcc = accounts.find((a) => a.account_subtype === 'CASH')!;
    const bankAcc = accounts.find((a) => a.account_subtype === 'BANK')!;

    ledger.setAccountBalance(cashAcc.id, toMicroUnits(mockUser.initialCash!));
    ledger.setAccountBalance(bankAcc.id, toMicroUnits(mockUser.initialBank!));

    saveAccounts(ledger.getAllAccounts(), mockUser.id);

    // Verify loaded accounts match initial values
    const reloaded = loadSavedAccounts(mockUser.id);
    const reloadedCash = reloaded.find((a) => a.id === cashAcc.id)!;
    const reloadedBank = reloaded.find((a) => a.id === bankAcc.id)!;

    expect(fromMicroUnits(reloadedCash.balance_micro)).toBe(15000);
    expect(fromMicroUnits(reloadedBank.balance_micro)).toBe(65000);
  });

  it('4. Generates rich HTML Excel workbook with peer summary metrics and table', () => {
    UserSheetSyncEngine.syncTransaction(mockUser, {
      id: 'tx_html_001',
      date: '2026-10-24',
      time: '11:00 AM',
      type: 'OTHER_INCOME',
      scenario: 'SETTLEMENT_RECEIVED',
      category: 'Peer Settlement',
      description: 'Received settlement from Amit',
      amount: 1200,
      paymentAccount: 'Bank / UPI',
      personName: 'Amit',
      settlementStatus: 'SETTLED',
      remainingAmount: 0,
    });

    const html = UserSheetSyncEngine.generateStyledExcelHTML(mockUser);
    expect(html).toContain('WealthOS');
    expect(html).toContain('Fin User');
    expect(html).toContain('Other Expenses');
    expect(html).toContain('Remaining Money to Receive');
    expect(html).toContain('Amit');
  });

  it('5. Persists and toggles moving background and playful theme preferences', () => {
    saveUserThemePrefs(mockUser.id, {
      bgTheme: 'candypop',
      movingBackground: true,
      glassOpacity: 0.9,
    });

    const prefs = getUserThemePrefs(mockUser.id);
    expect(prefs.bgTheme).toBe('candypop');
    expect(prefs.movingBackground).toBe(true);
    expect(prefs.glassOpacity).toBe(0.9);
  });

  it('6. Ensures live grand totals and formulas are included in CSV, HTML tfoot, TSV, and Apps Script template', async () => {
    UserSheetSyncEngine.syncTransaction(mockUser, {
      id: 'tx_income_01',
      date: '2026-10-24',
      time: '12:00 PM',
      type: 'INCOME',
      category: 'Consulting',
      description: 'Client payment',
      amount: 10000,
      paymentAccount: 'Bank',
    });

    UserSheetSyncEngine.syncTransaction(mockUser, {
      id: 'tx_expense_01',
      date: '2026-10-24',
      time: '12:30 PM',
      type: 'EXPENSE',
      category: 'Software',
      description: 'Hosting',
      amount: 2500,
      paymentAccount: 'Credit Card',
    });

    // 1. CSV Totals Check
    const csv = UserSheetSyncEngine.generateUserCSV(mockUser);
    expect(csv).toContain('--- FINANCIAL TOTALS & BALANCES SUMMARY ---');
    expect(csv).toContain('"TOTAL INCOME (INR)","10000.00"');
    expect(csv).toContain('"TOTAL EXPENSES (INR)","2500.00"');
    expect(csv).toContain('"NET SAVINGS / BALANCE (INR)","7500.00"');

    // 2. HTML Excel tfoot Check
    const html = UserSheetSyncEngine.generateStyledExcelHTML(mockUser);
    expect(html).toContain('<tfoot>');
    expect(html).toContain('GRAND TOTALS');
    expect(html).toContain('Spent: ₹2500.00');
    expect(html).toContain('Earned: ₹10000.00');
    expect(html).toContain('Net Savings Balance:');

    // 3. TSV Clipboard Totals Check
    let clipboardText = '';
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          writeText: async (t: string) => {
            clipboardText = t;
          },
        },
      },
      configurable: true,
      writable: true,
    });
    const copied = await UserSheetSyncEngine.copyForGoogleSheets(mockUser);
    expect(copied).toBe(true);
    expect(clipboardText).toContain('--- FINANCIAL TOTALS & METRICS SUMMARY ---');
    expect(clipboardText).toContain('TOTAL INCOME (₹)\t10000.00');
    expect(clipboardText).toContain('TOTAL EXPENSE (₹)\t2500.00');
    expect(clipboardText).toContain('NET SAVINGS BALANCE (₹)\t7500.00');

    // 4. Google Apps Script Live Totals Formulas Check
    const script = UserSheetSyncEngine.getGoogleAppsScriptTemplate();
    expect(script).toContain('=SUMIF(F6:F, "INCOME", K6:K)');
    expect(script).toContain('=SUMIF(F6:F, "EXPENSE", K6:K)');
    expect(script).toContain('=A3-B3');
    expect(script).toContain('sheet.setFrozenRows(5)');
  });
});
