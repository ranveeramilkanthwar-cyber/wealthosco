import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  Mail, 
  Calendar, 
  Users, 
  KeyRound, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  FileSpreadsheet,
  Wallet,
  Building2,
  Database
} from 'lucide-react';
import { AuthEngine, UserProfile } from '../../core/auth/authEngine';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [regCash, setRegCash] = useState<number | string>('');
  const [regBank, setRegBank] = useState<number | string>('');
  const [regSheetUrl, setRegSheetUrl] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Database saved users
  const [savedUsers, setSavedUsers] = useState<UserProfile[]>(() => AuthEngine.getAllUsers());

  useEffect(() => {
    AuthEngine.initDatabaseSync().then(() => {
      setSavedUsers(AuthEngine.getAllUsers());
    });
  }, []);

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = AuthEngine.login(loginIdentifier, loginPassword);
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Login failed. Please check your credentials.');
      soundAndVoice.playPillowTap();
      return;
    }

    soundAndVoice.playSuccessChime();
    setSuccessMsg(`Welcome back, ${res.user.name}! Opening your secure vault…`);
    setTimeout(() => {
      onAuthSuccess(res.user!);
    }, 450);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = AuthEngine.register({
      name: regName,
      username: regUsername,
      email: regEmail,
      password: regPassword,
      dob: regDob,
      gender: regGender,
      initialCash: regCash !== '' ? Number(regCash) : 0,
      initialBank: regBank !== '' ? Number(regBank) : 0,
      sheetUrl: regSheetUrl.trim(),
    });

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Registration failed.');
      soundAndVoice.playPillowTap();
      return;
    }

    soundAndVoice.playSuccessChime();
    setSuccessMsg(`Account created for ${res.user.name}! Starting your private ledger…`);
    setTimeout(() => {
      onAuthSuccess(res.user!);
    }, 450);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 65%, #04070e 100%)',
        padding: '24px 16px',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          width: 'min(95vw, 460px)',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '28px',
          padding: '32px 28px',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.65), 0 0 40px rgba(99, 102, 241, 0.15)',
          animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Logo & Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 14px',
              boxShadow: '0 8px 30px rgba(99, 102, 241, 0.5)',
            }}
          >
            💎
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#FFF' }}>
            WealthOS
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0 }}>
            Personal Finance &amp; Playful Tick Tracker • 100% Private Per-User Data
          </p>
        </div>

        {/* Tab Switcher: Login / Register */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: 'rgba(30, 41, 59, 0.6)',
            padding: '5px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '22px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg('');
              setSuccessMsg('');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: tab === 'login' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
              color: tab === 'login' ? '#FFF' : '#94A3B8',
              border: 'none',
              borderRadius: '12px',
              padding: '11px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: tab === 'login' ? '0 4px 16px rgba(99, 102, 241, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <KeyRound size={16} />
            <span>Log In</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg('');
              setSuccessMsg('');
              soundAndVoice.playPillowTap();
            }}
            style={{
              background: tab === 'register' ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
              color: tab === 'register' ? '#FFF' : '#94A3B8',
              border: 'none',
              borderRadius: '12px',
              padding: '11px',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: tab === 'register' ? '0 4px 16px rgba(99, 102, 241, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={16} />
            <span>Register</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '14px',
              padding: '12px 14px',
              color: '#FCA5A5',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '14px',
              padding: '12px 14px',
              color: '#6EE7B7',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="#10B981" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ─── TAB 1: LOGIN ─── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {savedUsers.length > 0 && (
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                  <Database size={13} color="#10B981" />
                  <span>Saved Profiles in Database:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {savedUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setLoginIdentifier(u.username);
                        soundAndVoice.playPillowTap();
                      }}
                      style={{
                        background: loginIdentifier === u.username ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid ${loginIdentifier === u.username ? '#818CF8' : 'rgba(255, 255, 255, 0.12)'}`,
                        borderRadius: '20px',
                        padding: '4px 10px',
                        color: loginIdentifier === u.username ? '#FFF' : '#CBD5E1',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }}></span>
                      <span>{u.name.split(' ')[0]} (@{u.username})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#94A3B8',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Username or Email
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748B" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul_s or rahul@email.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    padding: '13px 14px 13px 40px',
                    color: '#FFF',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#94A3B8',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748B" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '14px',
                    padding: '13px 42px 13px 40px',
                    color: '#FFF',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                border: 'none',
                borderRadius: '16px',
                padding: '15px',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.45)',
                transition: 'transform 0.15s ease',
                marginTop: '6px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>Access My Personal Vault</span>
              <ArrowRight size={18} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#818CF8',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    padding: 0,
                  }}
                >
                  Create one now
                </button>
              </span>
            </div>
          </form>
        )}

        {/* ─── TAB 2: REGISTER ─── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Full Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="#64748B" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '11px 12px 11px 38px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Choose Username (for Login) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontWeight: 800, fontSize: '0.9rem' }}>
                  @
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. rahul_sharma"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '11px 12px 11px 36px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#64748B" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '11px 12px 11px 38px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Date of Birth & Gender Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Date of Birth (DOB) *
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={15} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="date"
                    required
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      padding: '10px 10px 10px 34px',
                      color: '#FFF',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Gender *
                </label>
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    color: '#FFF',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  <option value="Male" style={{ background: '#0f172a' }}>Male 👨</option>
                  <option value="Female" style={{ background: '#0f172a' }}>Female 👩</option>
                  <option value="Other" style={{ background: '#0f172a' }}>Other 🧑</option>
                  <option value="Prefer not to say" style={{ background: '#0f172a' }}>Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Password *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#64748B" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  placeholder="Create a strong password (min 4 chars)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '11px 40px 11px 38px',
                    color: '#FFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Starting Balances (Cash in Hand & Bank) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Starting Cash (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <Wallet size={15} color="#10B981" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 500"
                    value={regCash}
                    onChange={(e) => setRegCash(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      padding: '10px 10px 10px 34px',
                      color: '#FFF',
                      fontSize: '0.84rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Starting Bank (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={15} color="#6366F1" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 25000"
                    value={regBank}
                    onChange={(e) => setRegBank(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      padding: '10px 10px 10px 34px',
                      color: '#FFF',
                      fontSize: '0.84rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Google Sheet or Excel Link (Optional) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Google Sheet / Excel Link (Optional)
                </label>
                <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>Auto-Sync</span>
              </div>
              <div style={{ position: 'relative' }}>
                <FileSpreadsheet size={15} color="#34D399" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="url"
                  placeholder="Paste Google Sheet URL or Excel link"
                  value={regSheetUrl}
                  onChange={(e) => setRegSheetUrl(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '11px 12px 11px 38px',
                    color: '#FFF',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <p style={{ fontSize: '0.68rem', color: '#64748B', margin: '4px 0 0 0' }}>
                You can also connect or edit your sheet link anytime after login from your Profile!
              </p>
            </div>

            {/* Multi-Tenant Privacy Guarantee */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '12px',
                padding: '10px 12px',
                fontSize: '0.72rem',
                color: '#C7D2FE',
              }}
            >
              <ShieldCheck size={18} color="#818CF8" style={{ flexShrink: 0 }} />
              <span>
                <strong>100% Isolated Vault:</strong> Your transactions and accounts are scoped strictly to your account and never shared with other users.
              </span>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                borderRadius: '16px',
                padding: '15px',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.45)',
                transition: 'transform 0.15s ease',
                marginTop: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <span>Register &amp; Open My Ledger</span>
              <Sparkles size={18} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#818CF8',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    padding: 0,
                  }}
                >
                  Log in with your username
                </button>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
