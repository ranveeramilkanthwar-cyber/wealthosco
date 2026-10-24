// Per-User Excel & Google Sheet Real-Time Sync Engine
// Automatically formats, isolates, and exports transactions to a separate Excel (.csv/.xls)
// and Google Sheets store for each registered user with complete financial details,
// totals, and peer flow scenarios (Other Expense / Other Income).

import { UserProfile } from '../auth/authEngine';
import { appendUserSheetRecord, getUserSheetRecords, UserSheetRecord } from '../financial-engine/storage';

export interface UserTransactionRow {
  id: string;
  date: string;
  time: string;
  type: string; // 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'OTHER_EXPENSE' | 'OTHER_INCOME'
  category: string;
  subCategory?: string;
  description: string;
  amount: number;
  paymentAccount: string;

  // Rich metadata for detailed tracking & sheets
  scenario?: 'SELF' | 'SOMEONE_PAID_FOR_ME' | 'PAID_FOR_SOMEONE_ELSE' | 'REMAINING_TO_RECEIVE' | 'SETTLEMENT_RECEIVED' | 'SETTLEMENT_PAID' | 'TRANSFER' | 'CALIBRATION';
  personName?: string;
  settlementStatus?: 'SETTLED' | 'PENDING' | 'PARTIAL';
  remainingAmount?: number;
  dueDate?: string;
  runningBankBalance?: number;
  runningCashBalance?: number;
  netWorthSnapshot?: number;
  notes?: string;
}

export class UserSheetSyncEngine {
  /**
   * Automatically records transaction to this user's private Excel/Sheet ledger
   * and dispatches to Google Sheet webhook or auto-downloads Excel if configured.
   */
  public static syncTransaction(user: UserProfile, tx: UserTransactionRow): void {
    const record: UserSheetRecord = {
      id: tx.id,
      timestamp: new Date().toISOString(),
      date: tx.date || new Date().toISOString().slice(0, 10),
      time: tx.time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      userName: user.name,
      userEmail: user.email,
      type: tx.type,
      category: tx.category,
      subCategory: tx.subCategory || 'General',
      description: tx.description,
      amount: tx.amount,
      paymentAccount: tx.paymentAccount,
      scenario: tx.scenario || 'SELF',
      personName: tx.personName || 'Self',
      settlementStatus: tx.settlementStatus || (tx.scenario === 'SOMEONE_PAID_FOR_ME' || tx.scenario === 'PAID_FOR_SOMEONE_ELSE' || tx.scenario === 'REMAINING_TO_RECEIVE' ? 'PENDING' : 'SETTLED'),
      remainingAmount: tx.remainingAmount !== undefined ? tx.remainingAmount : (tx.scenario === 'SOMEONE_PAID_FOR_ME' || tx.scenario === 'PAID_FOR_SOMEONE_ELSE' || tx.scenario === 'REMAINING_TO_RECEIVE' ? tx.amount : 0),
      dueDate: tx.dueDate || '',
      runningBankBalance: tx.runningBankBalance,
      runningCashBalance: tx.runningCashBalance,
      netWorthSnapshot: tx.netWorthSnapshot,
      notes: tx.notes || tx.description,
    };

    // 1. Store in user's isolated local spreadsheet ledger
    appendUserSheetRecord(user.id, record);

    // Calculate updated grand totals across all user records
    const allRecords = getUserSheetRecords(user.id);
    const totalIncome = allRecords.filter((r) => r.type === 'INCOME').reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpense = allRecords.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;
    const otherExpense = allRecords.filter((r) => r.type === 'OTHER_EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
    const otherIncome = allRecords.filter((r) => r.type === 'OTHER_INCOME').reduce((s, r) => s + (r.amount || 0), 0);
    const pendingReceivables = allRecords.filter((r) => r.type === 'OTHER_INCOME' && r.settlementStatus === 'PENDING').reduce((s, r) => s + (r.remainingAmount !== undefined ? r.remainingAmount : r.amount || 0), 0);
    const pendingPayables = allRecords.filter((r) => r.type === 'OTHER_EXPENSE' && r.settlementStatus === 'PENDING').reduce((s, r) => s + (r.remainingAmount !== undefined ? r.remainingAmount : r.amount || 0), 0);

    // 2. Real-time background sync to user's Google Sheet Webhook if configured
    const webhookUrl = this.getUserGoogleSheetUrl(user.id);
    if (webhookUrl && typeof fetch !== 'undefined') {
      try {
        const payload = {
          type: 'TRANSACTION_SYNC',
          action: 'ADD_TRANSACTION',
          userName: user.name,
          userEmail: user.email,
          record: record,
          totals: {
            totalIncome,
            totalExpense,
            netBalance,
            otherExpense,
            otherIncome,
            pendingReceivables,
            pendingPayables,
            runningBankBalance: record.runningBankBalance,
            runningCashBalance: record.runningCashBalance,
            totalRecords: allRecords.length,
          },
        };

        fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors', // allows cross-origin webhook dispatch to Google Apps Script
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((e) => {
          console.warn('[UserSheetSync] Google Sheet webhook dispatch notice:', e);
        });
      } catch (e) {
        console.warn('[UserSheetSync] Failed to dispatch webhook:', e);
      }
    }

    // 3. Auto-download new Excel file if user enabled instant file generation on every entry
    if (this.isAutoDownloadExcel(user.id) && typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        window.setTimeout(() => {
          this.downloadUserExcelFile(user);
        }, 150);
      } catch (e) {
        console.warn('[UserSheetSync] Auto-download failed:', e);
      }
    }
  }

  /**
   * Generates clean CSV string with all 17 detailed columns and grand totals summary for Excel
   */
  public static generateUserCSV(user: UserProfile): string {
    const records = getUserSheetRecords(user.id);
    const totalIncome = records.filter((r) => r.type === 'INCOME').reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpense = records.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;
    const otherExpense = records.filter((r) => r.type === 'OTHER_EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
    const otherIncome = records.filter((r) => r.type === 'OTHER_INCOME').reduce((s, r) => s + (r.amount || 0), 0);
    const pendingReceivables = records.filter((r) => r.type === 'OTHER_INCOME' && r.settlementStatus === 'PENDING').reduce((s, r) => s + (r.remainingAmount !== undefined ? r.remainingAmount : r.amount || 0), 0);
    const pendingPayables = records.filter((r) => r.type === 'OTHER_EXPENSE' && r.settlementStatus === 'PENDING').reduce((s, r) => s + (r.remainingAmount !== undefined ? r.remainingAmount : r.amount || 0), 0);

    const headers = [
      'Transaction ID',
      'Date',
      'Time',
      'User Name',
      'User Email',
      'Type',
      'Financial Scenario',
      'Category',
      'Sub-Category',
      'Description / Purpose',
      'Amount (INR)',
      'Account / Payment Mode',
      'Other Person Involved',
      'Settlement Status',
      'Remaining Due (INR)',
      'Bank Balance After',
      'Cash Balance After',
      'Consolidated Net Worth',
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.date}"`,
      `"${r.time}"`,
      `"${r.userName}"`,
      `"${r.userEmail}"`,
      `"${r.type}"`,
      `"${r.scenario || 'SELF'}"`,
      `"${r.category}"`,
      `"${r.subCategory || 'General'}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      Number(r.amount || 0).toFixed(2),
      `"${r.paymentAccount}"`,
      `"${r.personName || 'Self'}"`,
      `"${r.settlementStatus || 'SETTLED'}"`,
      Number(r.remainingAmount !== undefined ? r.remainingAmount : 0).toFixed(2),
      r.runningBankBalance !== undefined ? Number(r.runningBankBalance).toFixed(2) : '""',
      r.runningCashBalance !== undefined ? Number(r.runningCashBalance).toFixed(2) : '""',
      r.netWorthSnapshot !== undefined ? Number(r.netWorthSnapshot).toFixed(2) : '""',
    ]);

    const summaryRows = [
      '',
      '"--- FINANCIAL TOTALS & BALANCES SUMMARY ---"',
      `"TOTAL INCOME (INR)","${totalIncome.toFixed(2)}"`,
      `"TOTAL EXPENSES (INR)","${totalExpense.toFixed(2)}"`,
      `"NET SAVINGS / BALANCE (INR)","${netBalance.toFixed(2)}"`,
      `"OTHER EXPENSES (BEHALF / I OWE) (INR)","${otherExpense.toFixed(2)}"`,
      `"OTHER INCOME / RECEIVABLES (INR)","${otherIncome.toFixed(2)}"`,
      `"PENDING RECEIVABLES TO COLLECT (INR)","${pendingReceivables.toFixed(2)}"`,
      `"PENDING PAYABLES TO SETTLE (INR)","${pendingPayables.toFixed(2)}"`,
      `"TOTAL TRANSACTIONS LOGGED","${records.length}"`,
    ];

    return [headers.join(','), ...rows.map((row) => row.join(',')), ...summaryRows].join('\r\n');
  }

  /**
   * Generates rich styled Excel HTML workbook format (.xls) with custom styling,
   * summary metrics (Total Income, Total Expense, Other Expense, Other Income / Receivables, Net Balance)
   * and color-coded rows.
   */
  public static generateStyledExcelHTML(user: UserProfile): string {
    const records = getUserSheetRecords(user.id);
    const totalIncome = records.filter((r) => r.type === 'INCOME').reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpense = records.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
    const otherExpense = records.filter((r) => r.type === 'OTHER_EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
    const otherIncome = records.filter((r) => r.type === 'OTHER_INCOME').reduce((s, r) => s + (r.amount || 0), 0);
    const pendingReceivables = records
      .filter((r) => r.settlementStatus === 'PENDING' && (r.scenario === 'PAID_FOR_SOMEONE_ELSE' || r.scenario === 'REMAINING_TO_RECEIVE'))
      .reduce((s, r) => s + (r.remainingAmount !== undefined ? r.remainingAmount : r.amount), 0);
    const pendingPayables = records
      .filter((r) => r.settlementStatus === 'PENDING' && r.scenario === 'SOMEONE_PAID_FOR_ME')
      .reduce((s, r) => s + (r.remainingAmount !== undefined ? r.remainingAmount : r.amount), 0);
    const netBalance = totalIncome - totalExpense;

    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${user.username.slice(0, 25)}_Expenses</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10.5pt; color: #0f172a; }
    .title { font-size: 16pt; font-weight: bold; color: #1e293b; padding: 12px 0 4px 0; }
    .meta { font-size: 9.5pt; color: #64748b; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th { background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 10px 12px; border: 1px solid #94a3b8; text-align: left; }
    td { padding: 8px 12px; border: 1px solid #cbd5e1; vertical-align: middle; }
    .income-row { background-color: #f0fdf4; color: #166534; }
    .expense-row { background-color: #fef2f2; color: #991b1b; }
    .transfer-row { background-color: #f5f3ff; color: #4338ca; }
    .other-exp-row { background-color: #fff7ed; color: #c2410c; }
    .other-inc-row { background-color: #ecfeff; color: #0e7490; }
    .amount-income { color: #16a34a; font-weight: bold; }
    .amount-expense { color: #dc2626; font-weight: bold; }
    .amount-transfer { color: #4f46e5; font-weight: bold; }
    .amount-other-exp { color: #ea580c; font-weight: bold; }
    .amount-other-inc { color: #0891b2; font-weight: bold; }
    .summary-card { background-color: #f8fafc; border: 1.5px solid #cbd5e1; font-weight: bold; }
    .badge-pending { background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
    .badge-settled { background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="title">WealthOS — ${user.name}’s Personal Financial Ledger &amp; Sheets Report</div>
  <div class="meta">
    Account Owner: <strong>${user.name}</strong> (@${user.username}) | 
    Email: <strong>${user.email}</strong> | 
    Report Generated: <strong>${new Date().toLocaleString('en-IN')}</strong> | 
    Data Isolation: <strong>Strictly Private to ${user.username}</strong>
  </div>

  <table style="margin-bottom: 24px; max-width: 960px;">
    <tr class="summary-card">
      <td style="padding: 12px; text-align: center;">Total Earned (Income)<br/><span style="font-size: 13pt;" class="amount-income">₹${totalIncome.toFixed(2)}</span></td>
      <td style="padding: 12px; text-align: center;">Total Spent (Expenses)<br/><span style="font-size: 13pt;" class="amount-expense">₹${totalExpense.toFixed(2)}</span></td>
      <td style="padding: 12px; text-align: center;">Net Savings Balance<br/><span style="font-size: 13pt; color: #0f172a;">₹${netBalance.toFixed(2)}</span></td>
      <td style="padding: 12px; text-align: center;">Other Expenses (Behalf/Owed)<br/><span style="font-size: 13pt;" class="amount-other-exp">₹${otherExpense.toFixed(2)}</span></td>
      <td style="padding: 12px; text-align: center;">Remaining Money to Receive<br/><span style="font-size: 13pt;" class="amount-other-inc">₹${pendingReceivables.toFixed(2)}</span></td>
      <td style="padding: 12px; text-align: center;">Pending Money to Pay<br/><span style="font-size: 13pt; color: #dc2626;">₹${pendingPayables.toFixed(2)}</span></td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th style="width: 130px;">Transaction ID</th>
        <th style="width: 90px;">Date</th>
        <th style="width: 75px;">Time</th>
        <th style="width: 100px;">Type</th>
        <th style="width: 140px;">Scenario</th>
        <th style="width: 130px;">Category</th>
        <th style="width: 200px;">Description / Purpose</th>
        <th style="width: 110px; text-align: right;">Amount (₹)</th>
        <th style="width: 130px;">Payment Mode</th>
        <th style="width: 110px;">Person Involved</th>
        <th style="width: 95px;">Status</th>
        <th style="width: 110px; text-align: right;">Remaining Due (₹)</th>
        <th style="width: 110px; text-align: right;">Bank Balance</th>
        <th style="width: 110px; text-align: right;">Cash Balance</th>
      </tr>
    </thead>
    <tbody>
      ${records.map((r) => {
        let rowClass = 'expense-row';
        let amtClass = 'amount-expense';
        let prefix = '-₹';
        if (r.type === 'INCOME') {
          rowClass = 'income-row';
          amtClass = 'amount-income';
          prefix = '+₹';
        } else if (r.type === 'OTHER_EXPENSE') {
          rowClass = 'other-exp-row';
          amtClass = 'amount-other-exp';
          prefix = '₹';
        } else if (r.type === 'OTHER_INCOME') {
          rowClass = 'other-inc-row';
          amtClass = 'amount-other-inc';
          prefix = '+₹';
        } else if (r.type === 'TRANSFER') {
          rowClass = 'transfer-row';
          amtClass = 'amount-transfer';
          prefix = '₹';
        }
        const statusBadge = (r.settlementStatus === 'PENDING')
          ? '<span class="badge-pending">PENDING</span>'
          : '<span class="badge-settled">SETTLED</span>';

        return `
      <tr class="${rowClass}">
        <td style="font-family: monospace; font-size: 9pt;">${r.id}</td>
        <td>${r.date}</td>
        <td>${r.time}</td>
        <td style="font-weight: bold;">${r.type}</td>
        <td>${r.scenario || 'SELF'}</td>
        <td>${r.category}</td>
        <td>${r.description}</td>
        <td class="${amtClass}" style="text-align: right;">${prefix}${r.amount.toFixed(2)}</td>
        <td>${r.paymentAccount}</td>
        <td>${r.personName || 'Self'}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">${r.remainingAmount !== undefined ? '₹' + r.remainingAmount.toFixed(2) : '-'}</td>
        <td style="text-align: right;">${r.runningBankBalance !== undefined ? '₹' + r.runningBankBalance.toFixed(2) : '-'}</td>
        <td style="text-align: right;">${r.runningCashBalance !== undefined ? '₹' + r.runningCashBalance.toFixed(2) : '-'}</td>
      </tr>`;
      }).join('')}
    </tbody>
    <tfoot>
      <tr style="background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 11pt; border-top: 2px solid #38bdf8;">
        <td colspan="7" style="padding: 12px; text-align: right; text-transform: uppercase;">
          GRAND TOTALS (${records.length} Transactions):
        </td>
        <td style="padding: 12px; text-align: right; color: #38bdf8;">
          Spent: ₹${totalExpense.toFixed(2)} | Earned: ₹${totalIncome.toFixed(2)}
        </td>
        <td colspan="4" style="padding: 12px; text-align: center;">
          Net Savings Balance: <span style="color: ${netBalance >= 0 ? '#4ade80' : '#f87171'}">₹${netBalance.toFixed(2)}</span>
        </td>
        <td style="padding: 12px; text-align: right; color: #a5b4fc;">
          Bank: ₹${(records[records.length - 1]?.runningBankBalance ?? 0).toFixed(2)}
        </td>
        <td style="padding: 12px; text-align: right; color: #a5b4fc;">
          Cash: ₹${(records[records.length - 1]?.runningCashBalance ?? 0).toFixed(2)}
        </td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
  }

  /**
   * Triggers browser download of user's styled Excel file (.xls)
   */
  public static downloadUserExcelFile(user: UserProfile): void {
    const htmlContent = this.generateStyledExcelHTML(user);
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `${user.username}_expenses_sheet_${today}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Triggers browser download of standard CSV file (.csv)
   */
  public static downloadUserCSVFile(user: UserProfile): void {
    const csvContent = this.generateUserCSV(user);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `${user.username}_ledger_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Copies formatted TSV data with totals to clipboard for 1-click paste into Google Sheets
   */
  public static async copyForGoogleSheets(user: UserProfile): Promise<boolean> {
    const records = getUserSheetRecords(user.id);
    const totalIncome = records.filter((r) => r.type === 'INCOME').reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpense = records.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
    const netBalance = totalIncome - totalExpense;
    const otherExpense = records.filter((r) => r.type === 'OTHER_EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
    const otherIncome = records.filter((r) => r.type === 'OTHER_INCOME').reduce((s, r) => s + (r.amount || 0), 0);
    const pendingReceivables = records.filter((r) => r.type === 'OTHER_INCOME' && r.settlementStatus === 'PENDING').reduce((s, r) => s + (r.remainingAmount !== undefined ? r.remainingAmount : r.amount || 0), 0);

    const headers = [
      'Transaction ID\tDate\tTime\tUser Name\tUser Email\tType\tScenario\tCategory\tDescription\tAmount (₹)\tPayment Account\tPerson Involved\tStatus\tRemaining (₹)\tBank Balance\tCash Balance',
    ];

    const rows = records.map(
      (r) =>
        `${r.id}\t${r.date}\t${r.time}\t${r.userName}\t${r.userEmail}\t${r.type}\t${r.scenario || 'SELF'}\t${r.category}\t${r.description}\t${r.amount}\t${r.paymentAccount}\t${r.personName || 'Self'}\t${r.settlementStatus || 'SETTLED'}\t${r.remainingAmount !== undefined ? r.remainingAmount : 0}\t${r.runningBankBalance !== undefined ? r.runningBankBalance : ''}\t${r.runningCashBalance !== undefined ? r.runningCashBalance : ''}`
    );

    const summaryTsv = [
      '',
      `--- FINANCIAL TOTALS & METRICS SUMMARY ---`,
      `TOTAL INCOME (₹)\t${totalIncome.toFixed(2)}`,
      `TOTAL EXPENSE (₹)\t${totalExpense.toFixed(2)}`,
      `NET SAVINGS BALANCE (₹)\t${netBalance.toFixed(2)}`,
      `OTHER EXPENSE (BEHALF / I OWE) (₹)\t${otherExpense.toFixed(2)}`,
      `OTHER INCOME / RECEIVABLES (₹)\t${otherIncome.toFixed(2)}`,
      `PENDING RECEIVABLES TO COLLECT (₹)\t${pendingReceivables.toFixed(2)}`,
      `TOTAL DETAILED TRANSACTIONS\t${records.length}`,
    ];

    const fullTsv = [headers, ...rows, ...summaryTsv].join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullTsv);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Batch pushes all historical database records to user's Google Sheet webhook URL
   */
  public static async syncAllRecordsToGoogleSheet(user: UserProfile): Promise<{ success: boolean; count: number; error?: string }> {
    const webhookUrl = this.getUserGoogleSheetUrl(user.id);
    if (!webhookUrl) {
      return { success: false, count: 0, error: 'No Google Sheet link provided. Please paste your link in Sheet Settings.' };
    }
    const records = getUserSheetRecords(user.id);
    if (records.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      // Dispatch in batch payload or sequential ping
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'BATCH_SYNC',
          user: user.name,
          email: user.email,
          recordsCount: records.length,
          records: records,
        }),
      });

      return { success: true, count: records.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e?.message || 'Sync failed' };
    }
  }

  /**
   * Gets or sets user's Google Sheet Webhook URL
   */
  public static getUserGoogleSheetUrl(userId: string): string {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(`wealthos_user_${userId}_gsheet_url`) || '';
  }

  public static setUserGoogleSheetUrl(userId: string, url: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`wealthos_user_${userId}_gsheet_url`, url.trim());
  }

  /**
   * Gets or sets user's Auto-Download Excel preference
   */
  public static isAutoDownloadExcel(userId: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(`wealthos_user_${userId}_auto_download_excel`) === 'true';
  }

  public static setAutoDownloadExcel(userId: string, enabled: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`wealthos_user_${userId}_auto_download_excel`, enabled ? 'true' : 'false');
  }

  /**
   * Google Apps Script template code that user can copy-paste into Google Sheet
   * in 1 click (Extensions -> Apps Script -> Deploy as Web App).
   * Automatically sets up a frozen Live Totals Dashboard with dynamic =SUMIF formulas
   * and appends all transactions with 17 detailed columns in real time.
   */
  public static getGoogleAppsScriptTemplate(): string {
    return `// ========================================================
// 💎 WealthOS Live Google Sheet Webhook Sync Engine
// Automatically updates Google Sheet with transactions & live totals!
//
// SETUP IN 3 STEPS:
// 1. Open your Google Sheet -> Click Extensions -> Apps Script
// 2. Select all, delete, paste this code, and click Save 💾
// 3. Click Deploy -> New deployment -> Select 'Web app'
//    - Execute as: 'Me'
//    - Who has access: 'Anyone'
//    - Click Deploy -> Copy 'Web app URL' and paste in WealthOS!
// ========================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Auto-setup pinned Live Totals Summary & Table Headers if sheet is empty or new
    if (sheet.getLastRow() < 5) {
      sheet.clear();
      
      // Row 1: Title Banner
      sheet.getRange(1, 1).setValue("💎 WealthOS Real-Time Financial Ledger • " + (data.userName || "Private Vault"));
      sheet.getRange(1, 1).setFontSize(14).setFontWeight("bold").setFontColor("#1e1b4b");
      
      // Row 2: Live Summary Metric Labels
      var metricLabels = [
        "TOTAL EARNED (INCOME)",
        "TOTAL SPENT (EXPENSE)",
        "NET SAVINGS BALANCE",
        "OTHER EXPENSES (OWED)",
        "REMAINING RECEIVABLES",
        "RUNNING BANK",
        "RUNNING CASH",
        "TOTAL ENTRIES"
      ];
      sheet.getRange(2, 1, 1, 8).setValues([metricLabels]);
      sheet.getRange(2, 1, 1, 8).setFontWeight("bold").setFontSize(9).setBackground("#f1f5f9").setFontColor("#475569");
      
      // Row 3: Live Dynamic Formulas (Google Sheets auto-calculates totals instantly on every row added!)
      var initialBank = (data.totals && data.totals.runningBankBalance !== undefined) ? data.totals.runningBankBalance : 0;
      var initialCash = (data.totals && data.totals.runningCashBalance !== undefined) ? data.totals.runningCashBalance : 0;
      var formulas = [
        '=SUMIF(F6:F, "INCOME", K6:K)',
        '=SUMIF(F6:F, "EXPENSE", K6:K)',
        '=A3-B3',
        '=SUMIF(F6:F, "OTHER_EXPENSE", K6:K)',
        '=SUMIF(F6:F, "OTHER_INCOME", K6:K)',
        initialBank,
        initialCash,
        '=COUNTA(A6:A)'
      ];
      sheet.getRange(3, 1, 1, 8).setValues([formulas]);
      sheet.getRange(3, 1, 1, 8).setFontWeight("bold").setFontSize(11);
      sheet.getRange(3, 1).setFontColor("#16a34a"); // Income green
      sheet.getRange(3, 2).setFontColor("#dc2626"); // Expense red
      sheet.getRange(3, 3).setFontColor("#2563eb"); // Net blue
      sheet.getRange(3, 4).setFontColor("#ea580c"); // Other exp orange
      sheet.getRange(3, 5).setFontColor("#0891b2"); // Other inc cyan
      sheet.getRange(3, 6).setFontColor("#4f46e5"); // Bank
      sheet.getRange(3, 7).setFontColor("#059669"); // Cash
      
      // Row 5: 17 Detailed Column Headers
      var headers = [
        "Transaction ID",
        "Date",
        "Time",
        "User Name",
        "User Email",
        "Type",
        "Scenario",
        "Category",
        "Sub-Category",
        "Description / Purpose",
        "Amount (INR)",
        "Payment Account",
        "Person Involved",
        "Status",
        "Remaining (INR)",
        "Bank Balance",
        "Cash Balance"
      ];
      sheet.getRange(5, 1, 1, 17).setValues([headers]);
      sheet.getRange(5, 1, 1, 17).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      
      // Freeze the top 5 rows so the live totals stay pinned on screen!
      sheet.setFrozenRows(5);
    }
    
    // Handle Batch Sync of all records
    if (data.type === "BATCH_SYNC" && data.records && data.records.length > 0) {
      var rows = data.records.map(function(r) {
        return [
          r.id || "",
          r.date || "",
          r.time || "",
          r.userName || "",
          r.userEmail || "",
          r.type || "",
          r.scenario || "SELF",
          r.category || "",
          r.subCategory || "General",
          r.description || "",
          Number(r.amount) || 0,
          r.paymentAccount || "",
          r.personName || "Self",
          r.settlementStatus || "SETTLED",
          Number(r.remainingAmount !== undefined ? r.remainingAmount : 0),
          r.runningBankBalance !== undefined ? Number(r.runningBankBalance) : "",
          r.runningCashBalance !== undefined ? Number(r.runningCashBalance) : ""
        ];
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 17).setValues(rows);
      
      // Update running bank and cash balance snapshots in summary row 3
      var lastRecord = data.records[data.records.length - 1];
      if (lastRecord && lastRecord.runningBankBalance !== undefined) {
        sheet.getRange(3, 6).setValue(Number(lastRecord.runningBankBalance));
      }
      if (lastRecord && lastRecord.runningCashBalance !== undefined) {
        sheet.getRange(3, 7).setValue(Number(lastRecord.runningCashBalance));
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", count: rows.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle Single Record Real-Time Sync
    var r = data.record || data;
    sheet.appendRow([
      r.id || "",
      r.date || "",
      r.time || "",
      r.userName || "",
      r.userEmail || "",
      r.type || "",
      r.scenario || "SELF",
      r.category || "",
      r.subCategory || "General",
      r.description || "",
      Number(r.amount) || 0,
      r.paymentAccount || "",
      r.personName || "Self",
      r.settlementStatus || "SETTLED",
      Number(r.remainingAmount !== undefined ? r.remainingAmount : 0),
      r.runningBankBalance !== undefined ? Number(r.runningBankBalance) : "",
      r.runningCashBalance !== undefined ? Number(r.runningCashBalance) : ""
    ]);
    
    // Update live bank and cash balance snapshots in row 3
    if (r.runningBankBalance !== undefined) {
      sheet.getRange(3, 6).setValue(Number(r.runningBankBalance));
    }
    if (r.runningCashBalance !== undefined) {
      sheet.getRange(3, 7).setValue(Number(r.runningCashBalance));
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", id: r.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }
}

