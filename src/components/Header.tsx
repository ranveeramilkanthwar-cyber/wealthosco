import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  BarChart3,
  Sprout,
  HeartHandshake,
  Sun,
  Moon,
  Trash2
} from 'lucide-react';

import { LogOut, FileSpreadsheet } from 'lucide-react';
import { UserProfile } from '../../core/auth/authEngine';

export type DisplayMode = 'easy' | 'kid' | 'zen' | 'ca';

interface HeaderProps {
  mode: DisplayMode;
  onSetMode: (mode: DisplayMode) => void;
  isPrivate: boolean;
  onTogglePrivacy: () => void;
  mascotSpeech: string;
  isVaultLocked: boolean;
  onToggleVault: () => void;
  isDayTheme: boolean;
  onToggleTheme: () => void;
  onResetScratch: () => void;
  isEquationBalanced: boolean;
  equationDiff: bigint;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onOpenSheetModal?: () => void;
  onOpenProfileModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onSetMode,
  isPrivate,
  onTogglePrivacy,
  mascotSpeech,
  isVaultLocked,
  onToggleVault,
  isDayTheme,
  onToggleTheme,
  onResetScratch,
  isEquationBalanced,
  equationDiff,
  currentUser,
  onLogout,
  onOpenSheetModal,
  onOpenProfileModal,
}) => {
  return (
    <header style={{ 
      borderBottom: '1px solid var(--border-subtle)', 
      background: isDayTheme ? 'rgba(253, 251, 247, 0.92)' : 'rgba(8, 12, 20, 0.92)', 
      backdropFilter: 'blur(24px)', 
      position: 'sticky', 
      top: 0, 
      zIndex: 50 
    }}>
      <div style={{ 
        maxWidth: '1440px', 
        margin: '0 auto', 
        padding: '12px 24px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '14px' 
      }}>
        
        {/* Brand & Coin Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="coin-logo">🪙</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                Wealth<span style={{ color: '#6366f1' }}>OS</span>
              </span>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 800 }}>
                {mode === 'easy' ? 'v5.0 Easy-Going' : mode === 'kid' ? '🌱 Sprout' : mode === 'zen' ? '✨ Zen' : 'v3.0 CA Terminal'}
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Child &amp; Senior Simplicity • Silent CA Double-Entry Core
            </p>
          </div>
        </div>

        {/* 4-Tier Progressive Disclosure Switcher */}
        <div className="mode-pills">
          <button
            type="button"
            className={`mode-btn ${mode === 'easy' ? 'active' : ''}`}
            onClick={() => onSetMode('easy')}
            title="Senior & Child Friendly (Giant Pillow Buttons, Voice Read-Aloud, Passbook)"
          >
            <HeartHandshake size={15} />
            <span>🧓 Easy-Going (v5.0)</span>
          </button>

          <button
            type="button"
            className={`mode-btn ${mode === 'kid' ? 'active' : ''}`}
            onClick={() => onSetMode('kid')}
            title="Sprout / Piggy Jars & Coins"
          >
            <Sprout size={15} />
            <span>🌱 Sprout</span>
          </button>

          <button
            type="button"
            className={`mode-btn ${mode === 'zen' ? 'active' : ''}`}
            onClick={() => onSetMode('zen')}
            title="Everyday Consumer Zen Mode with Liquid Orb & Impulse Vault"
          >
            <Sparkles size={15} />
            <span>✨ Everyday Zen</span>
          </button>

          <button
            type="button"
            className={`mode-btn ${mode === 'ca' ? 'active' : ''}`}
            onClick={() => onSetMode('ca')}
            title="Full Chartered Accountant Terminal (1010/2010 codes, Micro-units, XIRR)"
          >
            <BarChart3 size={15} />
            <span>📊 CA Pro</span>
          </button>
        </div>

        {/* 3D Squircle Companion Mascot ("Botosi / Finny") */}
        <div className="mascot-stage" onClick={onTogglePrivacy} title="Click Botosi to toggle Peekaboo Privacy Mode!">
          <div className="mascot-bubble">
            {mascotSpeech}
          </div>
          <div className={`squircle-mascot ${isPrivate ? 'peekaboo' : ''}`}>
            <div className="eye" />
            <div className="eye" />
            <div className="hand left" />
            <div className="hand right" />
          </div>
        </div>

        {/* Controls: Day/Night Theme, Invariant Status, Vault & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Day / Night Theme Toggle */}
          <button
            onClick={onToggleTheme}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem'
            }}
            title={isDayTheme ? "Switch to Soft Evening Cocoa Night Mode" : "Switch to Warm Morning Paper Day Mode"}
          >
            {isDayTheme ? <Moon size={14} color="#f59e0b" /> : <Sun size={14} color="#f59e0b" />}
            <span>{isDayTheme ? 'Night Cocoa' : 'Day Paper'}</span>
          </button>

          {/* Double-Entry Invariant Badge */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '5px 12px', 
            borderRadius: '9999px',
            background: isEquationBalanced ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${isEquationBalanced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.4)'}`
          }}>
            {isEquationBalanced ? (
              <>
                <CheckCircle2 size={14} color="#34d399" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399' }}>
                  {mode === 'ca' ? 'LHS == RHS (Balanced)' : '✓ Zero Drift'}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} color="#fb7185" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fb7185' }}>
                  Δ {equationDiff.toString()}
                </span>
              </>
            )}
          </div>

          {/* Zero-Knowledge Vault Lock/Unlock */}
          <button
            type="button"
            onClick={onToggleVault}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: isVaultLocked ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${isVaultLocked ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              color: isVaultLocked ? '#fb7185' : '#34d399',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isVaultLocked ? <Lock size={13} /> : <Unlock size={13} />}
            <span>{isVaultLocked ? 'Encrypted' : 'AES-256'}</span>
          </button>

          {/* Reset All Data to Scratch */}
          <button
            type="button"
            onClick={onResetScratch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: '#fb7185',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Reset all ledger entries to clean scratch state"
          >
            <Trash2 size={13} />
            <span>Reset</span>
          </button>

          {/* User Profile Badge & Sheet & Logout */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px' }}>
              <button
                type="button"
                onClick={onOpenProfileModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(99, 102, 241, 0.14)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  color: '#A5B4FC',
                  fontWeight: 700,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Edit starting balances, manage transactions & customize aesthetic backgrounds"
              >
                <span>👤 Profile &amp; Themes</span>
              </button>

              <button
                type="button"
                onClick={onOpenSheetModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  color: '#10B981',
                  fontWeight: 700,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Open your personal Excel & Google Sheet ledger"
              >
                <FileSpreadsheet size={14} />
                <span>My Sheet</span>
              </button>

              <div
                onClick={onOpenProfileModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '10px',
                  transition: 'background 0.15s ease',
                }}
                title="Click to view profile, edit balances & customize theme"
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                  }}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    @{currentUser.username}
                  </span>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    padding: '6px 9px',
                    color: '#EF4444',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  title="Log out of this account"
                >
                  <LogOut size={12} />
                  <span>Logout</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
