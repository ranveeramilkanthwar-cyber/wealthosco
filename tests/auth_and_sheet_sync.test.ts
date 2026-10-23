import { describe, it, expect, beforeEach } from 'vitest';
import { AuthEngine } from '../core/auth/authEngine';
import { UserSheetSyncEngine } from '../core/sheets/userSheetSync';
import { 
  loadSavedAccounts, 
  saveAccounts, 
  loadSavedTransactions,
  saveTransactions,
  loadSavedPostings,
  savePostings,
  clearAllStoredData,
  getUserSheetRecords,
  updateUserSheetRecord,
  deleteUserSheetRecord,
  getUserThemePrefs,
  saveUserThemePrefs
} from '../core/financial-engine/storage';

// Node localStorage polyfill
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => store.get(k) || null,
  setItem: (k: string, v: string) => store.set(k, String(v)),
  removeItem: (k: string) => store.delete(k),
  clear: () => store.clear(),
};
(globalThis as any).localStorage = localStorageMock;

describe('AuthEngine & User Data Isolation', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('successfully registers a user with Name, Username, Email, Password, DOB, and Gender', () => {
    const res = AuthEngine.register({
      name: 'Rahul Sharma',
      username: 'rahul_s',
      email: 'rahul@example.com',
      password: 'mypassword123',
      dob: '1995-08-15',
      gender: 'Male',
    });

    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.name).toBe('Rahul Sharma');
    expect(res.user?.username).toBe('rahul_s');
    expect(res.user?.email).toBe('rahul@example.com');
    expect(res.user?.dob).toBe('1995-08-15');
    expect(res.user?.gender).toBe('Male');
  });

  it('rejects duplicate username or email during registration', () => {
    AuthEngine.register({
      name: 'User One',
      username: 'userone',
      email: 'user1@example.com',
      password: 'password123',
      dob: '1990-01-01',
      gender: 'Female',
    });

    const dupUsername = AuthEngine.register({
      name: 'User Duplicate',
      username: 'userone',
      email: 'user2@example.com',
      password: 'password123',
      dob: '1992-02-02',
      gender: 'Other',
    });
    expect(dupUsername.success).toBe(false);
    expect(dupUsername.error).toContain('username is already taken');

    const dupEmail = AuthEngine.register({
      name: 'User Duplicate Email',
      username: 'unique_user',
      email: 'user1@example.com',
      password: 'password123',
      dob: '1992-02-02',
      gender: 'Prefer not to say',
    });
    expect(dupEmail.success).toBe(false);
    expect(dupEmail.error).toContain('email already exists');
  });

  it('allows login using username or email and verifies password', () => {
    AuthEngine.register({
      name: 'Priya Patel',
      username: 'priya_p',
      email: 'priya@gmail.com',
      password: 'secret_code',
      dob: '1998-05-20',
      gender: 'Female',
    });

    // Login with username
    const loginByUsername = AuthEngine.login('priya_p', 'secret_code');
    expect(loginByUsername.success).toBe(true);
    expect(loginByUsername.user?.username).toBe('priya_p');

    // Login with email
    const loginByEmail = AuthEngine.login('priya@gmail.com', 'secret_code');
    expect(loginByEmail.success).toBe(true);

    // Wrong password
    const wrongPass = AuthEngine.login('priya_p', 'wrong_pass');
    expect(wrongPass.success).toBe(false);
    expect(wrongPass.error).toContain('Incorrect password');
  });

  it('ensures strict per-user data isolation between User A and User B', () => {
    const userA = AuthEngine.register({
      name: 'Alice',
      username: 'alice',
      email: 'alice@test.com',
      password: 'pass_alice_123',
      dob: '1994-03-10',
      gender: 'Female',
    }).user!;

    const userB = AuthEngine.register({
      name: 'Bob',
      username: 'bob',
      email: 'bob@test.com',
      password: 'pass_bob_123',
      dob: '1996-07-22',
      gender: 'Male',
    }).user!;

    // Save transactions for Alice
    saveTransactions(
      [
        {
          id: 'tx_alice_1',
          transaction_date: '2026-10-23T10:00:00Z',
          posted_date: '2026-10-23T10:00:00Z',
          description: 'Alice Private Groceries',
          transaction_type: 'EXPENSE',
          status: 'CLEARED',
          is_tax_deductible: false,
          attachment_urls: [],
          deduplication_hash: 'hash_alice_1',
        },
      ],
      userA.id
    );

    // Bob loads his transactions: should be completely empty
    const bobsTxs = loadSavedTransactions(userB.id);
    expect(bobsTxs).toHaveLength(0);

    // Alice loads her transactions: contains her private grocery entry
    const alicesTxs = loadSavedTransactions(userA.id);
    expect(alicesTxs).toHaveLength(1);
    expect(alicesTxs[0].description).toBe('Alice Private Groceries');
  });

  it('records separate Excel & Google Sheet rows for each user', () => {
    const user = AuthEngine.register({
      name: 'Karan Mehra',
      username: 'karan_m',
      email: 'karan@test.com',
      password: 'karanpass',
      dob: '1993-11-12',
      gender: 'Male',
    }).user!;

    UserSheetSyncEngine.syncTransaction(user, {
      id: 'tx_sheet_101',
      date: '2026-10-23',
      time: '09:30 PM',
      type: 'EXPENSE',
      category: 'Food & Dining',
      description: 'Chai & Samosa Treat',
      amount: 150,
      paymentAccount: 'Cash in Hand',
    });

    const records = getUserSheetRecords(user.id);
    expect(records).toHaveLength(1);
    expect(records[0].userName).toBe('Karan Mehra');
    expect(records[0].amount).toBe(150);

    const csv = UserSheetSyncEngine.generateUserCSV(user);
    expect(csv).toContain('Chai & Samosa Treat');
    expect(csv).toContain('karan@test.com');
  });

  it('guarantees complete isolation of spreadsheets between two different users', () => {
    const userA = AuthEngine.register({
      name: 'Simran Kaur',
      username: 'simran_k',
      email: 'simran@test.com',
      password: 'pass_simran_1',
      dob: '1997-04-12',
      gender: 'Female',
    }).user!;

    const userB = AuthEngine.register({
      name: 'Rohan Verma',
      username: 'rohan_v',
      email: 'rohan@test.com',
      password: 'pass_rohan_2',
      dob: '1995-10-25',
      gender: 'Male',
    }).user!;

    // Simran adds an entry
    UserSheetSyncEngine.syncTransaction(userA, {
      id: 'tx_simran_1',
      date: '2026-10-23',
      time: '10:00 AM',
      type: 'INCOME',
      category: 'Freelance Design',
      description: 'Brand Identity Project',
      amount: 45000,
      paymentAccount: 'Bank / UPI',
    });

    // Rohan adds an entry
    UserSheetSyncEngine.syncTransaction(userB, {
      id: 'tx_rohan_1',
      date: '2026-10-23',
      time: '11:00 AM',
      type: 'EXPENSE',
      category: 'Electronics',
      description: 'Mechanical Keyboard',
      amount: 6500,
      paymentAccount: 'Credit Card',
    });

    // Check Simran's spreadsheet
    const simranRows = getUserSheetRecords(userA.id);
    expect(simranRows).toHaveLength(1);
    expect(simranRows[0].description).toBe('Brand Identity Project');
    expect(simranRows[0].userName).toBe('Simran Kaur');

    const simranCSV = UserSheetSyncEngine.generateUserCSV(userA);
    expect(simranCSV).toContain('Brand Identity Project');
    expect(simranCSV).not.toContain('Mechanical Keyboard');

    const simranHTML = UserSheetSyncEngine.generateStyledExcelHTML(userA);
    expect(simranHTML).toContain('Simran Kaur');
    expect(simranHTML).toContain('₹45000.00');
    expect(simranHTML).not.toContain('Mechanical Keyboard');

    // Check Rohan's spreadsheet
    const rohanRows = getUserSheetRecords(userB.id);
    expect(rohanRows).toHaveLength(1);
    expect(rohanRows[0].description).toBe('Mechanical Keyboard');
    expect(rohanRows[0].userName).toBe('Rohan Verma');

    const rohanCSV = UserSheetSyncEngine.generateUserCSV(userB);
    expect(rohanCSV).toContain('Mechanical Keyboard');
    expect(rohanCSV).not.toContain('Brand Identity Project');
  });

  it('correctly configures per-user Google Sheet webhook URL and auto-download preference', () => {
    const userA = AuthEngine.register({
      name: 'Neha Gupta',
      username: 'neha_g',
      email: 'neha@test.com',
      password: 'pass_neha_3',
      dob: '1999-01-30',
      gender: 'Female',
    }).user!;

    // Initial state is empty
    expect(UserSheetSyncEngine.getUserGoogleSheetUrl(userA.id)).toBe('');
    expect(UserSheetSyncEngine.isAutoDownloadExcel(userA.id)).toBe(false);

    // Set Webhook URL
    UserSheetSyncEngine.setUserGoogleSheetUrl(userA.id, 'https://script.google.com/macros/s/AKfycbz_test/exec');
    expect(UserSheetSyncEngine.getUserGoogleSheetUrl(userA.id)).toBe('https://script.google.com/macros/s/AKfycbz_test/exec');

    // Toggle Auto-download
    UserSheetSyncEngine.setAutoDownloadExcel(userA.id, true);
    expect(UserSheetSyncEngine.isAutoDownloadExcel(userA.id)).toBe(true);

    // Verify template code is valid JavaScript
    const template = UserSheetSyncEngine.getGoogleAppsScriptTemplate();
    expect(template).toContain('function doPost(e)');
    expect(template).toContain('SpreadsheetApp.getActiveSpreadsheet()');
  });

  it('allows editing and deleting transactions with zero drift and synchronized sheet updates', () => {
    const user = AuthEngine.register({
      name: 'Aditya Roy',
      username: 'aditya_r',
      email: 'aditya@test.com',
      password: 'adityapassword',
      dob: '1992-06-18',
      gender: 'Male',
    }).user!;

    // 1. Initial transaction in user sheet
    UserSheetSyncEngine.syncTransaction(user, {
      id: 'tx_aditya_1',
      date: '2026-10-23',
      time: '12:00 PM',
      type: 'EXPENSE',
      category: 'Food',
      description: 'Lunch at Cafe',
      amount: 450,
      paymentAccount: 'Cash in Hand',
    });

    let records = getUserSheetRecords(user.id);
    expect(records).toHaveLength(1);
    expect(records[0].amount).toBe(450);

    // 2. Edit transaction
    updateUserSheetRecord(user.id, 'tx_aditya_1', {
      description: 'Lunch with Client at Cafe',
      amount: 650,
      category: 'Client Dining',
    });

    records = getUserSheetRecords(user.id);
    expect(records).toHaveLength(1);
    expect(records[0].description).toBe('Lunch with Client at Cafe');
    expect(records[0].amount).toBe(650);

    // 3. Delete transaction
    deleteUserSheetRecord(user.id, 'tx_aditya_1');
    records = getUserSheetRecords(user.id);
    expect(records).toHaveLength(0);

    // 4. Test Aesthetic Themes and Custom Background Preferences
    const initialTheme = getUserThemePrefs(user.id);
    expect(initialTheme.bgTheme).toBe('aurora');

    saveUserThemePrefs(user.id, {
      bgTheme: 'emerald',
      customBgUrl: 'https://images.unsplash.com/photo-scenic.jpg',
      glassOpacity: 0.75,
      glassBlur: 24,
      showIntroOnStart: false,
    });

    const updatedTheme = getUserThemePrefs(user.id);
    expect(updatedTheme.bgTheme).toBe('emerald');
    expect(updatedTheme.customBgUrl).toBe('https://images.unsplash.com/photo-scenic.jpg');
    expect(updatedTheme.glassOpacity).toBe(0.75);
    expect(updatedTheme.glassBlur).toBe(24);
    expect(updatedTheme.showIntroOnStart).toBe(false);
  });
});


