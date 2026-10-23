import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Copy, 
  Check, 
  X, 
  Sparkles, 
  Table, 
  Link as LinkIcon,
  Code,
  Zap,
  Send,
  HelpCircle
} from 'lucide-react';
import { UserProfile } from '../../core/auth/authEngine';
import { UserSheetSyncEngine } from '../../core/sheets/userSheetSync';
import { getUserSheetRecords } from '../../core/financial-engine/storage';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';

interface UserSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

export const UserSheetModal: React.FC<UserSheetModalProps> = ({ isOpen, onClose, user }) => {
  const [copied, setCopied] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptHelp, setShowScriptHelp] = useState(false);
  const [gsheetUrl, setGsheetUrl] = useState(() => UserSheetSyncEngine.getUserGoogleSheetUrl(user.id));
  const [savedUrlMsg, setSavedUrlMsg] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [autoDownload, setAutoDownload] = useState(() => UserSheetSyncEngine.isAutoDownloadExcel(user.id));

  if (!isOpen) return null;

  const records = getUserSheetRecords(user.id);
  const totalIncome = records.filter((r) => r.type === 'INCOME').reduce((s, r) => s + (r.amount || 0), 0);
  const totalExpense = records.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const handleDownloadExcel = () => {
    soundAndVoice.playSuccessChime();
    UserSheetSyncEngine.downloadUserExcelFile(user);
  };

  const handleDownloadCSV = () => {
    soundAndVoice.playSuccessChime();
    UserSheetSyncEngine.downloadUserCSVFile(user);
  };

  const handleCopy = async () => {
    soundAndVoice.playPillowTap();
    const ok = await UserSheetSyncEngine.copyForGoogleSheets(user);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else {
      alert('Failed to copy to clipboard. Please grant permission.');
    }
  };

  const handleCopyScript = async () => {
    soundAndVoice.playPillowTap();
    const script = UserSheetSyncEngine.getGoogleAppsScriptTemplate();
    try {
      await navigator.clipboard.writeText(script);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      alert('Could not copy script to clipboard');
    }
  };

  const handleSaveGSheetUrl = () => {
    soundAndVoice.playPillowTap();
    UserSheetSyncEngine.setUserGoogleSheetUrl(user.id, gsheetUrl);
    setSavedUrlMsg(true);
    setTimeout(() => setSavedUrlMsg(false), 2500);
  };

  const handleToggleAutoDownload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked;
    setAutoDownload(val);
    UserSheetSyncEngine.setAutoDownloadExcel(user.id, val);
    soundAndVoice.playPillowTap();
  };

  const handleTestWebhook = async () => {
    if (!gsheetUrl.trim()) {
      alert('Please enter a Google Apps Script Webhook URL first.');
      return;
    }
    setTestingWebhook(true);
    setTestResult(null);
    soundAndVoice.playPillowTap();

    try {
      await fetch(gsheetUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'test_' + Date.now(),
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          userName: user.name,
          userEmail: user.email,
          type: 'TEST_SYNC',
          category: 'Sync Verification',
          description: 'Live test ping from WealthOS App',
          amount: 1.0,
          paymentAccount: 'Test Ping',
        }),
      });

      setTestResult('Ping sent! Check your Google Sheet to confirm.');
      soundAndVoice.playSuccessChime();
    } catch (err: any) {
      setTestResult('Failed to dispatch: ' + err.message);
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 998,
        }}
      />

      {/* Modal Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(94vw, 620px)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '24px',
          zIndex: 999,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <FileSpreadsheet size={24} color="#10B981" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {user.name}’s Personal Spreadsheet
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Separate Excel & Google Sheet ledger strictly isolated for <strong>@{user.username}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '6px 10px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.9rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Stats Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '18px',
          }}
        >
          <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rows</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{records.length}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>Earned</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>₹{totalIncome.toFixed(0)}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' }}>Spent</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>₹{totalExpense.toFixed(0)}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366F1', textTransform: 'uppercase' }}>Savings</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#6366F1', marginTop: '2px' }}>₹{netBalance.toFixed(0)}</div>
          </div>
        </div>

        {/* 1-Click Export Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '18px' }}>
          {/* Download Styled Excel */}
          <button
            onClick={handleDownloadExcel}
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              borderRadius: '16px',
              padding: '12px 8px',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 6px 16px rgba(16,185,129,0.3)',
              transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Download size={18} />
            <span>Download Excel (.xls)</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={handleDownloadCSV}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '12px 8px',
              color: 'var(--text-primary)',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <FileSpreadsheet size={18} color="#06B6D4" />
            <span>Download CSV</span>
          </button>

          {/* Copy for Google Sheets */}
          <button
            onClick={handleCopy}
            style={{
              background: copied ? '#10B981' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
              border: 'none',
              borderRadius: '16px',
              padding: '12px 8px',
              color: '#FFF',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 6px 16px rgba(99,102,241,0.3)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? 'Copied!' : 'Copy to G-Sheet'}</span>
          </button>
        </div>

        {/* Real-time Feature 1: Auto-Download Excel on Entry Toggle */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="#F59E0B" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                Auto-Download New Excel on Every Entry
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Automatically triggers a fresh Excel download whenever you log money
              </div>
            </div>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoDownload}
              onChange={handleToggleAutoDownload}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                background: autoDownload ? '#10B981' : 'var(--border-subtle)',
                borderRadius: '24px',
                transition: '0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: '""',
                  height: '18px',
                  width: '18px',
                  left: autoDownload ? '23px' : '3px',
                  bottom: '3px',
                  backgroundColor: '#FFF',
                  borderRadius: '50%',
                  transition: '0.2s',
                }}
              />
            </span>
          </label>
        </div>

        {/* Real-time Feature 2: Google Sheets Live Webhook Sync */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LinkIcon size={16} color="#6366F1" />
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Live Google Sheets Cloud Sync
              </span>
            </div>
            <button
              onClick={() => setShowScriptHelp((v) => !v)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-indigo)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <HelpCircle size={14} />
              <span>{showScriptHelp ? 'Hide Setup' : 'How to Setup?'}</span>
            </button>
          </div>

          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Enter your Google Apps Script Webhook URL. Every transaction entered will sync live to your Google Sheet!
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={gsheetUrl}
              onChange={(e) => setGsheetUrl(e.target.value)}
              style={{
                flex: 1,
                fontSize: '0.8rem',
                fontWeight: 600,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '9px 12px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSaveGSheetUrl}
              style={{
                background: 'var(--accent-indigo)',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 14px',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {savedUrlMsg ? 'Saved! ✓' : 'Save'}
            </button>
            <button
              onClick={handleTestWebhook}
              disabled={testingWebhook}
              style={{
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: '10px',
                padding: '9px 12px',
                color: '#10B981',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Send size={13} />
              <span>{testingWebhook ? 'Testing…' : 'Test Ping'}</span>
            </button>
          </div>

          {testResult && (
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: testResult.includes('sent') ? '#10B981' : '#EF4444', marginBottom: '8px' }}>
              {testResult}
            </div>
          )}

          {/* Setup Guide & Script Modal */}
          {showScriptHelp && (
            <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-subtle)', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Google Apps Script in 3 Simple Steps:
                </span>
                <button
                  onClick={handleCopyScript}
                  style={{
                    background: copiedScript ? '#10B981' : 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    color: copiedScript ? '#FFF' : 'var(--accent-indigo)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copiedScript ? 'Copied Script! ✓' : 'Copy Apps Script Code'}
                </button>
              </div>
              <ol style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Open a new sheet at <a href="https://sheets.new" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-indigo)' }}>sheets.new</a></li>
                <li>Click <strong>Extensions</strong> → <strong>Apps Script</strong>, replace all code with this copied script, and click Save 💾</li>
                <li>Click <strong>Deploy</strong> → <strong>New deployment</strong> → Select <strong>Web app</strong> → Set Access to <em>Anyone</em> → Copy Web app URL and paste above!</li>
              </ol>
            </div>
          )}
        </div>

        {/* Live Table Preview */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Table size={16} color="var(--text-muted)" />
            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Spreadsheet Preview ({records.length} Total Rows)
            </span>
          </div>

          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No rows recorded yet. Enter a transaction to see it stored here automatically!
            </div>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Date</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Type</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Category</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Description</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...records].reverse().slice(0, 10).map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 10px' }}>{r.date}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: r.type === 'EXPENSE' ? '#EF4444' : r.type === 'INCOME' ? '#10B981' : '#6366F1' }}>
                        {r.type}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{r.category}</td>
                      <td style={{ padding: '8px 10px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.description}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800 }}>
                        ₹{r.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
