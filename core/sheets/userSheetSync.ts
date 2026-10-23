// Per-User Excel & Google Sheet Real-Time Sync Engine
// Automatically formats, isolates, and exports transactions to a separate Excel (.csv/.xls)
// and Google Sheets store for each registered user.

import { UserProfile } from '../auth/authEngine';
import { appendUserSheetRecord, getUserSheetRecords, UserSheetRecord } from '../financial-engine/storage';

export interface UserTransactionRow {
  id: string;
  date: string;
  time: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  paymentAccount: string;
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
      description: tx.description,
      amount: tx.amount,
      paymentAccount: tx.paymentAccount,
    };

    // 1. Store in user's isolated local spreadsheet ledger
    appendUserSheetRecord(user.id, record);

    // 2. Real-time background sync to user's Google Sheet Webhook if configured
    const webhookUrl = this.getUserGoogleSheetUrl(user.id);
    if (webhookUrl && typeof fetch !== 'undefined') {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors', // allows cross-origin webhook dispatch to Google Apps Script
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
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
        // Small delay to allow UI state to settle
        window.setTimeout(() => {
          this.downloadUserExcelFile(user);
        }, 150);
      } catch (e) {
        console.warn('[UserSheetSync] Auto-download failed:', e);
      }
    }
  }

  /**
   * Generates clean CSV string for 1-click Excel download of this user's data only
   */
  public static generateUserCSV(user: UserProfile): string {
    const records = getUserSheetRecords(user.id);
    const headers = [
      'Transaction ID',
      'Date',
      'Time',
      'User Name',
      'User Email',
      'Type',
      'Category',
      'Description / Note',
      'Amount (INR)',
      'Account / Payment Mode',
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.date}"`,
      `"${r.time}"`,
      `"${r.userName}"`,
      `"${r.userEmail}"`,
      `"${r.type}"`,
      `"${r.category}"`,
      `"${(r.description || '').replace(/"/g, '""')}"`,
      Number(r.amount || 0).toFixed(2),
      `"${r.paymentAccount}"`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  }

  /**
   * Generates rich styled Excel HTML workbook format (.xls) with custom styling,
   * summary metrics (Total Income, Total Expense, Net Balance) and color-coded rows.
   */
  public static generateStyledExcelHTML(user: UserProfile): string {
    const records = getUserSheetRecords(user.id);
    const totalIncome = records.filter((r) => r.type === 'INCOME').reduce((s, r) => s + (r.amount || 0), 0);
    const totalExpense = records.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
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
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11pt; color: #0f172a; }
    .title { font-size: 16pt; font-weight: bold; color: #1e293b; padding: 12px 0 4px 0; }
    .meta { font-size: 9.5pt; color: #64748b; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th { background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 10px 12px; border: 1px solid #94a3b8; text-align: left; }
    td { padding: 8px 12px; border: 1px solid #cbd5e1; vertical-align: middle; }
    .income-row { background-color: #f0fdf4; color: #166534; }
    .expense-row { background-color: #fef2f2; color: #991b1b; }
    .transfer-row { background-color: #f5f3ff; color: #4338ca; }
    .amount-income { color: #16a34a; font-weight: bold; }
    .amount-expense { color: #dc2626; font-weight: bold; }
    .amount-transfer { color: #4f46e5; font-weight: bold; }
    .summary-card { background-color: #f8fafc; border: 1.5px solid #cbd5e1; font-weight: bold; }
  </style>
</head>
<body>
  <div class="title">WealthOS — ${user.name}’s Personal Financial Ledger</div>
  <div class="meta">
    Account Owner: <strong>${user.name}</strong> (@${user.username}) | 
    Email: <strong>${user.email}</strong> | 
    Generated: <strong>${new Date().toLocaleString('en-IN')}</strong> | 
    Data Isolation: <strong>Strictly Private to ${user.username}</strong>
  </div>

  <table style="margin-bottom: 24px; max-width: 800px;">
    <tr class="summary-card">
      <td style="padding: 12px; text-align: center;">Total Earned (Income)<br/><span style="font-size: 14pt;" class="amount-income">₹${totalIncome.toFixed(2)}</span></td>
      <td style="padding: 12px; text-align: center;">Total Spent (Expenses)<br/><span style="font-size: 14pt;" class="amount-expense">₹${totalExpense.toFixed(2)}</span></td>
      <td style="padding: 12px; text-align: center;">Net Savings Balance<br/><span style="font-size: 14pt; color: #0f172a;">₹${netBalance.toFixed(2)}</span></td>
      <td style="padding: 12px; text-align: center;">Total Transactions<br/><span style="font-size: 14pt; color: #6366f1;">${records.length}</span></td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th style="width: 140px;">Transaction ID</th>
        <th style="width: 100px;">Date</th>
        <th style="width: 80px;">Time</th>
        <th style="width: 130px;">User Name</th>
        <th style="width: 160px;">User Email</th>
        <th style="width: 90px;">Type</th>
        <th style="width: 140px;">Category</th>
        <th style="width: 220px;">Description / Note</th>
        <th style="width: 120px; text-align: right;">Amount (₹)</th>
        <th style="width: 140px;">Payment Account</th>
      </tr>
    </thead>
    <tbody>
      ${records.map((r) => {
        const rowClass = r.type === 'INCOME' ? 'income-row' : r.type === 'EXPENSE' ? 'expense-row' : 'transfer-row';
        const amtClass = r.type === 'INCOME' ? 'amount-income' : r.type === 'EXPENSE' ? 'amount-expense' : 'amount-transfer';
        const prefix = r.type === 'INCOME' ? '+₹' : r.type === 'EXPENSE' ? '-₹' : '₹';
        return `
      <tr class="${rowClass}">
        <td style="font-family: monospace; font-size: 9.5pt;">${r.id}</td>
        <td>${r.date}</td>
        <td>${r.time}</td>
        <td>${r.userName}</td>
        <td>${r.userEmail}</td>
        <td style="font-weight: bold;">${r.type}</td>
        <td>${r.category}</td>
        <td>${r.description}</td>
        <td class="${amtClass}" style="text-align: right;">${prefix}${r.amount.toFixed(2)}</td>
        <td>${r.paymentAccount}</td>
      </tr>`;
      }).join('')}
    </tbody>
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
   * Copies formatted TSV data to clipboard for 1-click paste into Google Sheets
   */
  public static async copyForGoogleSheets(user: UserProfile): Promise<boolean> {
    const records = getUserSheetRecords(user.id);
    const headers = [
      'Transaction ID\tDate\tTime\tUser Name\tUser Email\tType\tCategory\tDescription\tAmount (₹)\tAccount / Mode',
    ];

    const rows = records.map(
      (r) =>
        `${r.id}\t${r.date}\t${r.time}\t${r.userName}\t${r.userEmail}\t${r.type}\t${r.category}\t${r.description}\t${r.amount}\t${r.paymentAccount}`
    );

    const fullTsv = [headers, ...rows].join('\n');
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
   * in 1 click (Extensions -> Apps Script -> Deploy as Web App)
   */
  public static getGoogleAppsScriptTemplate(): string {
    return `// ========================================================
// WealthOS Live Google Sheet Webhook Sync Script
// Paste this in Extensions -> Apps Script in your Google Sheet
// Click Deploy -> New Deployment -> Web app (Access: Anyone)
// Copy Web app URL and paste into WealthOS!
// ========================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto-create bold headers on first row if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Transaction ID",
        "Date",
        "Time",
        "User Name",
        "User Email",
        "Type",
        "Category",
        "Description",
        "Amount (INR)",
        "Payment Account"
      ]);
      sheet.getRange(1, 1, 1, 10).setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      data.id || "",
      data.date || "",
      data.time || "",
      data.userName || "",
      data.userEmail || "",
      data.type || "",
      data.category || "",
      data.description || "",
      Number(data.amount) || 0,
      data.paymentAccount || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }
}
