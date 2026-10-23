# MASTER IMPLEMENTATION PLAN: "TickPocket" — Playful Tick-Mark Expense & Income Tracker

## Core Concept
A zero-typing, ultra-simple, playful expense & income tracker where users log money primarily by tapping visual **Tick-Mark Checkboxes (☑️)** and **Preset Amount Chips**, backed by **1-Click Excel (.xlsx/.csv) Download** and **Real-Time Google Sheets Sync**.

---

## 1. Product Vision & "Tick-Mark First" Philosophy
Traditional expense trackers demand tedious manual typing, complex category trees, and multiple forms that feel like homework. **TickPocket** replaces data entry with tactile, playful micro-interactions:
1. **Tick the Type**: Tap `[ 💸 Expense ]` or `[ 💰 Income ]`.
2. **Tick the Category & Sub-Option / Source**:
   - Tap a bouncy illustrated card (e.g. `☕ Tea & Snacks`, `🥛 Milk & Grocery`, `🛺 Auto / Fuel`, `💼 Salary / Income`).
   - Select granular **Sub-options / Sources** (e.g., *Expense: Food → Dining Out, Groceries, Snacks*; *Income: Salary → Primary Employer, Freelance, Dividends, Cash Gift*).
   - Add new custom categories and sources on the fly with a single tap `[ + Add Source / Option ]`.
3. **Tick the Amount Chip**: Additive amount pills (`+₹20`, `+₹50`, `+₹100`, `+₹500`, `+₹1,000`, `+₹2,000`) or tap quick numbers.
4. **Tick Payment Mode**: `[ 📱 UPI / GPay ]`, `[ 💵 Cash ]`, `[ 💳 Card / Bank ]`.
5. **Tick the Big Checkmark (✅ SAVE TO SHEET)**:
   - Spring animation morphs the button into a green tick.
   - Web Audio coin clink sound plays.
   - Appends the row directly into **Google Sheets**, updates the **local Excel table**, and commits to the zero-drift **Double-Entry Ledger**.

---

## 2. Playful Aesthetic, UI/UX & Animation Specification

### 2.1 Aesthetic Theme: "Soft Tactile Toy & Pastel Stickerbook"
- **Background Canvas**: Warm Cream Dot-Grid (`#FFFDF9`) mimicking a high-end bullet journal.
- **Card Surface**: Crisp White (`#FFFFFF`) with 24px rounded squircle corners, 2px playful borders (`#E2E8F0`), and a 4px bottom 3D tactile shadow (`#CBD5E1`) that depresses (`translateY(4px)`) when tapped.
- **Color Tokens**:
  - **Expense Coral Pink**: `#FF6B8B` (Soft Pastel Background: `#FFF0F3`)
  - **Income Mint Green**: `#10B981` (Soft Pastel Background: `#ECFDF5`)
  - **Selection / Tick Accent**: `#6366F1` (Playful Indigo)
  - **Excel / Sheets Emerald**: `#16A34A`

### 2.2 Signature Micro-Animations & Physics
- **Elastic Tick-Box Pop (`cubic-bezier(0.34, 1.56, 0.64, 1)`)**:
  - Cards scale to 1.04x upon selection.
  - Border turns vibrant Indigo or Mint.
  - Checkmark draws itself inside the circle with bouncy overshoot.
- **Daily Routine "1-Tap Quick-Checklist"**:
  - Daily recurring habits (`🥛 Morning Milk ₹60`, `🛺 Commute ₹50`, `☕ Chai ₹30`, `🍱 Lunch ₹120`, `💰 Daily Inflow +₹500`).
  - Tapping a checkbox instantly logs the entry with a strike-through shimmer, Web Audio sound, and floating `+₹60 Logged!` badge.
- **Odometer Rolling Balance**:
  - Live rolling counters for Net Pocket Balance, Total Income, and Total Expense.
- **Mascot Sticker Reactions**:
  - "Botosi / Finny" coin buddy reacts dynamically with emojis and supportive messages.

---

## 3. Data Architecture: Excel & Google Sheets Storage Engine

### 3.1 Standardized 7-Column Spreadsheet Schema
| Column A | Column B | Column C | Column D | Column E | Column F | Column G |
|---|---|---|---|---|---|---|
| **Date** | **Time** | **Type** | **Category & Source** | **Payment Mode** | **Amount (₹)** | **Quick Note / Tag** |
| `2026-10-23` | `08:30 PM` | `EXPENSE` | `☕ Tea & Snacks (Chai Tapri)` | `UPI / GPay` | `50` | `Ticked via Quick-Checklist` |
| `2026-10-23` | `09:00 PM` | `INCOME` | `💼 Salary (Tech Client)` | `Bank Account` | `5000` | `Ticked Preset` |

### 3.2 1-Click Direct Excel Download (.CSV with UTF-8 BOM)
- UTF-8 BOM (`\uFEFF`) ensures Rupee symbol (`₹`) and emojis display properly in Microsoft Excel across Windows and macOS without garbled encoding (`mojibake`).
- Triggers instant browser download named `My_Tick_Expenses_2026.csv`.

### 3.3 1-Click Copy for Google Sheets (TSV Clipboard)
- Formats table data into Tab-Separated Values (`\t` and `\n`).
- Users click "📋 Copy for Google Sheets" and press `Ctrl+V` (or `Cmd+V`) directly in any Google Sheet cell.

### 3.4 Real-Time Google Sheets Auto-Sync (Google Apps Script Webhook)
Users can deploy a free 15-line Google Apps Script Web App:
```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  var rows = Array.isArray(data) ? data : [data];
  rows.forEach(function(r) {
    sheet.appendRow([
      r.date,
      r.time,
      r.type,
      r.category + (r.source ? " (" + r.source + ")" : ""),
      r.paymentMode,
      Number(r.amount),
      r.note || "Ticked Entry"
    ]);
  });
  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
```
Setting the Web App URL in TickPocket automatically pushes every ticked transaction to Google Sheets via `fetch()`.

---

## 4. Sub-Options / Sources & Customization
- **Dynamic Source / Sub-option Selector**:
  - Each category reveals contextual sources:
    - *Food & Dining*: 🍜 Street Food, ☕ Chai & Coffee, 🛒 Grocery Store, 🍕 Restaurant, 🥤 Drinks.
    - *Travel & Fuel*: 🛺 Auto Rickshaw, ⛽ Petrol/Diesel, 🚇 Metro/Train, 🚕 Cab/Taxi.
    - *Income*: 💼 Salary, 💻 Freelance, 📈 Stock Dividends, 🎁 Pocket Money, 🏠 Rental.
  - **`+ Add New Source / Sub-Option`**: Users can type any custom source and instantly pin it.
  - **`+ Add Daily Habit`**: Users can create custom recurring items for the 1-Tap Quick-Checklist.

---

## 5. Dual Implementation & Deployment
1. **Integrated React/TypeScript View** (`src/components/TickPocketView.tsx`): Seamlessly part of the WealthOS dev environment on `http://localhost:3000/` with direct BigInt ledger integration.
2. **Standalone Single-File Web App** (`tick_expense_app.html`): Zero-dependency, offline-ready, self-contained single HTML/CSS/JS file for mobile browsers or desktop double-clicking.
