// Enterprise Authentication & Multi-Tenant User Isolation Engine
// Stores user credentials, profiles, and active sessions in IndexedDB database & local storage.

import { UserDatabase } from './userDatabase';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  dob: string; // YYYY-MM-DD
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  initialCash?: number;
  initialBank?: number;
  sheetUrl?: string;
}

const STORAGE_KEY_USERS = 'wealthos_users_registry';
const STORAGE_KEY_ACTIVE_USER = 'wealthos_active_user_id';

// Simple deterministic hash for password verification in frontend context
function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'wh_' + Math.abs(hash).toString(16) + '_' + password.length;
}

export class AuthEngine {
  // Asynchronously syncs IndexedDB users into memory/storage on initialization
  public static async initDatabaseSync(): Promise<void> {
    try {
      const dbUsers = await UserDatabase.getAllUsers();
      if (dbUsers.length > 0) {
        const localUsers = this.getAllUsers();
        const mergedMap = new Map<string, UserProfile>();
        localUsers.forEach((u) => mergedMap.set(u.id, u));
        dbUsers.forEach((u) => mergedMap.set(u.id, { ...mergedMap.get(u.id), ...u }));
        this.saveAllUsers(Array.from(mergedMap.values()));
      }
    } catch (e) {
      console.warn('Initial database sync note:', e);
    }
  }

  public static getAllUsers(): UserProfile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private static saveAllUsers(users: UserProfile[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
      // Asynchronously backup each user to persistent IndexedDB database
      users.forEach((u) => {
        UserDatabase.saveUser(u).catch(() => {});
      });
    } catch (err) {
      console.error('Failed to save user registry', err);
    }
  }

  public static getActiveUser(): UserProfile | null {
    try {
      const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_USER);
      if (!activeId) return null;
      const users = this.getAllUsers();
      return users.find((u) => u.id === activeId) || null;
    } catch {
      return null;
    }
  }

  public static setActiveUser(user: UserProfile | null): void {
    try {
      if (!user) {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
      } else {
        localStorage.setItem(STORAGE_KEY_ACTIVE_USER, user.id);
      }
    } catch (err) {
      console.error('Failed to set active user session', err);
    }
  }

  public static updateUserProfile(userId: string, updates: Partial<UserProfile>): UserProfile | null {
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    users[idx] = { ...users[idx], ...updates };
    this.saveAllUsers(users);

    const active = this.getActiveUser();
    if (active && active.id === userId) {
      this.setActiveUser(users[idx]);
    }

    return users[idx];
  }

  public static register(params: {
    name: string;
    username: string;
    email: string;
    password: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    initialCash?: number;
    initialBank?: number;
    sheetUrl?: string;
  }): { success: boolean; user?: UserProfile; error?: string } {
    const users = this.getAllUsers();

    const cleanUsername = params.username.trim().toLowerCase();
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.name.trim();

    // Validation
    if (!cleanName) return { success: false, error: 'Full Name is required' };
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
      return { success: false, error: 'Username can only contain letters, numbers, underscores, dots, or dashes' };
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, error: 'A valid email address is required' };
    }
    if (!params.password || params.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long' };
    }
    if (!params.dob) {
      return { success: false, error: 'Date of Birth (DOB) is required' };
    }

    // Check uniqueness
    const usernameTaken = users.some((u) => u.username.toLowerCase() === cleanUsername);
    if (usernameTaken) {
      return { success: false, error: 'This username is already taken. Please choose another.' };
    }

    const emailTaken = users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      return { success: false, error: 'An account with this email already exists. Please log in.' };
    }

    const newUser: UserProfile = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      dob: params.dob,
      gender: params.gender || 'Prefer not to say',
      passwordHash: hashPassword(params.password),
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      initialCash: params.initialCash ?? 0,
      initialBank: params.initialBank ?? 0,
      sheetUrl: params.sheetUrl ? params.sheetUrl.trim() : undefined,
    };

    users.push(newUser);
    this.saveAllUsers(users);
    this.setActiveUser(newUser);

    // Save to user's sheet URL storage if provided
    if (newUser.sheetUrl) {
      localStorage.setItem(`wealthos_user_${newUser.id}_gsheet_url`, newUser.sheetUrl);
    }

    return { success: true, user: newUser };
  }

  public static login(
    identifier: string,
    password: string
  ): { success: boolean; user?: UserProfile; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) return { success: false, error: 'Please enter your username or email' };
    if (!password) return { success: false, error: 'Please enter your password' };

    const users = this.getAllUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
    );

    if (!user) {
      return { success: false, error: 'Account not found. Please check your username or register.' };
    }

    const incomingHash = hashPassword(password);
    if (user.passwordHash !== incomingHash) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    user.lastLoginAt = new Date().toISOString();
    this.saveAllUsers(users);
    this.setActiveUser(user);

    return { success: true, user };
  }

  public static logout(): void {
    this.setActiveUser(null);
  }
}
