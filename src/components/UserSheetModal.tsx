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
  const [syncingAll, setSyncingAll] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [autoDownload, setAutoDownload] = useState(() => UserSheetSyncEngine.isAutoDownloadExcel(user.id));

  if (!isOpen) return null;

  const records = getUserSheetRecords(user.id);
  const totalIncome = records.filter((r) => r.type === 'INCOME').reduce((s, r) => s + (r.amount || 0), 0);
  const totalExpense = records.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
  const otherExpense = records.filter((r) => r.type === 'OTHER_EXPENSE').reduce((s, r) => s + (r.amount || 0), 0);
  const otherIncome = records.filter((r) => r.type === 'OTHER_INCOME').reduce((s, r) => s + (r.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const handleSyncAllHistorical = async () => {
    if (!gsheetUrl.trim()) {
      alert('Please enter and save your Google Sheet Webhook URL first.');
      return;
    }
    setSyncingAll(true);
    setTestResult(null);
    soundAndVoice.playPillowTap();

    try {
      const res = await UserSheetSyncEngine.syncAllRecordsToGoogleSheet(user);
      if (res.success) {
        setTestResult(`✓ Successfully synced all ${res.count} records directly to your Google Sheet!`);
        soundAndVoice.playSuccessChime();
      } else {
        setTestResult(`Failed to sync: ${res.error}`);
      }
    } catch (e: any) {
      setTestResult(`Sync error: ${e.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

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
          scenario: 'SELF',
          category: 'Sync Verification',
          subCategory: 'Test Ping',
          description: 'Live test ping with full column verification',
          amount: 1.0,
          paymentAccount: 'Test Account',
          personName: 'Self',
          settlementStatus: 'SETTLED',
          remainingAmount: 0,
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
          width: 'min(94vw, 680px)',
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
                {user.name}’s Personal Spreadsheet &amp; Cloud Sync
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Live Excel &amp; Google Sheet ledger strictly isolated for <strong>@{user.username}</strong>
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
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            marginBottom: '18px',
          }}
        >
          <div style={{ background: 'var(--bg-card)', padding: '10px 8px', borderRadius: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rows</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{records.length}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '10px 8px', borderRadius: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>Income</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>₹{totalIncome.toFixed(0)}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '10px 8px', borderRadius: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' }}>Expense</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>₹{totalExpense.toFixed(0)}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '10px 8px', borderRadius: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#F97316', textTransform: 'uppercase' }}>Other Exp</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F97316', marginTop: '2px' }}>₹{otherExpense.toFixed(0)}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '10px 8px', borderRadius: '14px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#06B6D4', textTransform: 'uppercase' }}>Other Inc</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#06B6D4', marginTop: '2px' }}>₹{otherIncome.toFixed(0)}</div>
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
            Enter your Google Apps Script Webhook URL. Every transaction entered will sync live to your Google Sheet with updated totals!
          </p>

          {/* Alert if user pasted a document link instead of Apps Script Webhook URL */}
          {gsheetUrl.includes('docs.google.com/spreadsheets/d/') && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '10px',
                fontSize: '0.74rem',
                color: '#FDE68A',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#FBBF24' }}>
                <span>⚠️ Action Required to Enable Live Sheet Sync</span>
              </div>
              <span>
                You pasted a Google Sheet document link. To allow WealthOS to push transactions and live totals directly into your Google Sheet, Google requires a <strong>Web App URL</strong> (`script.google.com`).
              </span>
              <button
                type="button"
                onClick={() => {
                  handleCopyScript();
                  setShowScriptHelp(true);
                }}
                style={{
                  alignSelf: 'flex-start',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                }}
              >
                <Code size={13} />
                <span>Copy 1-Click Apps Script Code (30-Sec Setup)</span>
              </button>
            </div>
          )}

          {gsheetUrl.includes('script.google.com') && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '10px',
                padding: '7px 12px',
                marginBottom: '10px',
                fontSize: '0.74rem',
                fontWeight: 700,
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              <span>🟢 Live Real-Time Sync Active: Every transaction automatically updates your Google Sheet &amp; Totals!</span>
            </div>
          )}

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
            <button
              onClick={handleSyncAllHistorical}
              disabled={syncingAll || records.length === 0}
              style={{
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 12px',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
              }}
              title="Push all recorded transactions from database to your connected Google Sheet"
            >
              <Zap size={13} />
              <span>{syncingAll ? 'Syncing All…' : 'Sync All to Sheet'}</span>
            </button>
          </div>

          {testResult && (
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: testResult.includes('✓') || testResult.includes('sent') ? '#10B981' : '#EF4444', marginBottom: '8px' }}>
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
              Spreadsheet Preview ({records.length} Total Detailed Rows)
            </span>
          </div>

          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No rows recorded yet. Enter a transaction to see it stored here automatically!
            </div>
          ) : (
            <div style={{ maxHeight: '220px', overflowY: 'auto', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Date</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Type</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Scenario</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Category</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Description / Text</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Person</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '8px 10px', color: 'var(--text-muted)', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...records].slice(0, 15).map((r) => {
                    const isOtherExp = r.type === 'OTHER_EXPENSE';
                    const isOtherInc = r.type === 'OTHER_INCOME';
                    const typeColor = r.type === 'INCOME' ? '#10B981' : r.type === 'EXPENSE' ? '#EF4444' : isOtherExp ? '#F97316' : isOtherInc ? '#06B6D4' : '#6366F1';
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{r.date}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 800, color: typeColor, whiteSpace: 'nowrap' }}>
                          {r.type}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#A5B4FC', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                          {r.scenario || 'SELF'}
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{r.category}</td>
                        <td style={{ padding: '8px 10px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description}
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{r.personName || 'Self'}</td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            background: r.settlementStatus === 'PENDING' ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)',
                            color: r.settlementStatus === 'PENDING' ? '#F59E0B' : '#34D399',
                          }}>
                            {r.settlementStatus || 'SETTLED'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          ₹{Number(r.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot
                  style={{
                    position: 'sticky',
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.96)',
                    backdropFilter: 'blur(10px)',
                    borderTop: '2px solid rgba(99, 102, 241, 0.5)',
                    zIndex: 10,
                  }}
                >
                  <tr>
                    <td colSpan={4} style={{ padding: '9px 10px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      GRAND TOTALS ({records.length} Transactions):
                    </td>
                    <td colSpan={3} style={{ padding: '9px 10px', fontSize: '0.72rem', color: '#94A3B8' }}>
                      <span style={{ color: '#10B981', fontWeight: 800 }}>+₹{totalIncome.toFixed(0)}</span> / <span style={{ color: '#EF4444', fontWeight: 800 }}>-₹{totalExpense.toFixed(0)}</span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 900, color: netBalance >= 0 ? '#34D399' : '#F87171', fontSize: '0.84rem' }}>
                      Net: ₹{netBalance.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
