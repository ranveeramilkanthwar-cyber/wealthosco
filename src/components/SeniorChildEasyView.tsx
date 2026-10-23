import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  BookOpen, 
  Mic, 
  Camera, 
  PlusCircle, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Coins, 
  X, 
  ArrowRight, 
  Check, 
  ShieldCheck,
  Star
} from 'lucide-react';
import { formatCurrency, fromMicroUnits, toMicroUnits } from '../../core/financial-engine/microUnits';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';
import { SafeToSpendResult } from '../../core/financial-engine/budgetEngine';
import { Account, Transaction, LedgerPosting } from '../../core/financial-engine/types';

interface SeniorChildEasyViewProps {
  isPrivate: boolean;
  safeToSpend: SafeToSpendResult;
  accounts: Account[];
  transactions: Transaction[];
  postings: LedgerPosting[];
  onRecordQuickExpense: (categoryName: string, amountMicro: bigint, note: string) => void;
  onRecordDeposit: (amountMicro: bigint, note: string) => void;
  onPayBill: (billName: string, amountMicro: bigint) => void;
  onUndoLastAction: () => void;
  lastActionMessage: string | null;
}

export const SeniorChildEasyView: React.FC<SeniorChildEasyViewProps> = ({
  isPrivate,
  safeToSpend,
  accounts,
  transactions,
  postings,
  onRecordQuickExpense,
  onRecordDeposit,
  onPayBill,
  onUndoLastAction,
  lastActionMessage,
}) => {
  // Passbook view toggle
  const [showPassbook, setShowPassbook] = useState(false);

  // Modals for the 3 Giant Actions
  const [showTilesModal, setShowTilesModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Selected tile for keypad
  const [selectedTile, setSelectedTile] = useState<{ name: string; emoji: string } | null>(null);
  const [calcDisplay, setCalcDisplay] = useState('');

  // Voice input state
  const [voiceText, setVoiceText] = useState('');

  // Camera receipt simulation state
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [scannedAmount, setScannedAmount] = useState('240');

  // Piggy Bank Goal State (Grandparent & Child Piggy Match)
  const [piggyCoins, setPiggyCoins] = useState(() => {
    try {
      const saved = localStorage.getItem('wealthos_v5_piggy_coins');
      return saved ? parseInt(saved, 10) : 150;
    } catch {
      return 150;
    }
  });

  const [bonusStars, setBonusStars] = useState(() => {
    try {
      const saved = localStorage.getItem('wealthos_v5_bonus_stars');
      return saved ? parseInt(saved, 10) : 3;
    } catch {
      return 3;
    }
  });

  // Upcoming bills list
  const [bills, setBills] = useState([
    { id: 'b1', name: 'Electricity Bill', amount: 850, dueDate: 'Due Friday' },
    { id: 'b2', name: 'Monthly Medicine Strip', amount: 450, dueDate: 'Due next week' },
  ]);

  const bankAcc = accounts.find((a) => a.id === 'acc_bank_primary' || (a.account_type === 'ASSET' && a.account_subtype === 'BANK')) || accounts[0];
  const cashAcc = accounts.find((a) => a.id === 'acc_cash_wallet' || (a.account_type === 'ASSET' && a.account_subtype === 'CASH')) || accounts[1];
  const totalLiquid = (bankAcc ? bankAcc.balance_micro : 0n) + (cashAcc ? cashAcc.balance_micro : 0n);

  const safeNum = fromMicroUnits(safeToSpend.safeToSpendDailyMicro);

  // Read Aloud Handler
  const handleListenSafeToSpend = () => {
    soundAndVoice.playPillowTap();
    const textToSpeak = safeNum > 0
      ? `Today's Safe Pocket Money is ${Math.round(safeNum)} rupees. All your monthly bills, medicines, and savings are safely kept aside.`
      : `Your safe pocket money is zero rupees. Please tap Put Money In to add your salary or pension.`;
    soundAndVoice.speakAloud(textToSpeak);
  };

  // Grandparent Piggy Drop Coin Handler
  const handleDropPiggyCoin = () => {
    soundAndVoice.playCoinClink();
    const newCoins = piggyCoins + 50;
    const newStars = bonusStars + 1;
    setPiggyCoins(newCoins);
    setBonusStars(newStars);
    localStorage.setItem('wealthos_v5_piggy_coins', newCoins.toString());
    localStorage.setItem('wealthos_v5_bonus_stars', newStars.toString());

    onRecordQuickExpense('Piggy Savings', toMicroUnits(50), 'Saved ₹50 into Happy Savings Jar');
    soundAndVoice.speakAloud('Clink! 50 rupees added to your piggy jar! Grandpa added a bonus star!');
  };

  // Keypad Handlers
  const handleKeypadPress = (val: string) => {
    soundAndVoice.playPillowTap();
    if (val === 'C') {
      setCalcDisplay('');
    } else if (val === 'DEL') {
      setCalcDisplay((prev) => prev.slice(0, -1));
    } else {
      if (calcDisplay.length < 7) {
        setCalcDisplay((prev) => prev + val);
      }
    }
  };

  const handleTileSubmit = () => {
    const amt = parseFloat(calcDisplay);
    if (!selectedTile || isNaN(amt) || amt <= 0) return;

    soundAndVoice.playSuccessChime();
    onRecordQuickExpense(
      selectedTile.name,
      toMicroUnits(amt),
      `${selectedTile.emoji} ${selectedTile.name}`
    );

    soundAndVoice.speakAloud(`Saved ${Math.round(amt)} rupees for ${selectedTile.name}.`);

    setSelectedTile(null);
    setCalcDisplay('');
    setShowTilesModal(false);
  };

  // Voice command submit
  const handleVoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = voiceText.trim();
    if (!text) return;

    soundAndVoice.playSuccessChime();
    const amtMatch = text.match(/\d+/);
    const amt = amtMatch ? parseInt(amtMatch[0], 10) : 100;
    onRecordQuickExpense('Voice Entry', toMicroUnits(amt), `🎙️ ${text}`);

    soundAndVoice.speakAloud(`Understood! Saved ${amt} rupees for ${text}.`);
    setVoiceText('');
    setShowVoiceModal(false);
  };

  // Paper bill scan submit
  const handleBillPhotoSubmit = () => {
    const amt = parseFloat(scannedAmount) || 240;
    soundAndVoice.playSuccessChime();
    onRecordQuickExpense('Paper Bill Scan', toMicroUnits(amt), '📷 Paper Bill Photo Scan');
    soundAndVoice.speakAloud(`Bill photo saved for ${amt} rupees.`);
    setShowCameraModal(false);
  };

  const handlePayBillClick = (billId: string, name: string, amount: number) => {
    soundAndVoice.playSuccessChime();
    onPayBill(name, toMicroUnits(amount));
    setBills(bills.filter((b) => b.id !== billId));
    soundAndVoice.speakAloud(`Marked ${name} of ${amount} rupees as paid.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1040px', margin: '0 auto' }}>
      
      {/* ========================================================
          PART A (TOP): The "Safe to Spend Today" Comfort Cushion
          ======================================================== */}
      <div className="cushion-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--v5-sage)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ✓ TODAY'S SAFE POCKET MONEY
            </span>
            <div className={`num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ fontSize: '3.2rem', fontWeight: 900, color: '#f8fafc', margin: '8px 0' }}>
              {formatCurrency(safeToSpend.safeToSpendDailyMicro)}
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              ✓ Your electricity bill, medicines, and monthly savings are already safely kept aside.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleListenSafeToSpend}
              className="pillow-btn pillow-green"
              style={{ minHeight: '52px', padding: '10px 20px', fontSize: '0.95rem' }}
              title="Read aloud in a calm clear voice"
            >
              <Volume2 size={20} />
              <span>🔊 Listen</span>
            </button>

            <button
              onClick={() => {
                soundAndVoice.playPillowTap();
                setShowPassbook(!showPassbook);
              }}
              className="pillow-btn"
              style={{ minHeight: '52px', padding: '10px 20px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.08)', color: '#ffffff', border: '1px solid var(--border-subtle)' }}
            >
              <BookOpen size={20} color="#f59e0b" />
              <span>{showPassbook ? 'Close Passbook' : '📔 Open Bank Passbook'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          CLASSIC BANK PASSBOOK VIEW (FOR SENIORS & ELDERS)
          ======================================================== */}
      {showPassbook && (
        <div className="passbook-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '2px solid #ca8a04', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>📔</span>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#713f12' }}>My Classic Bank Passbook</h3>
                <p style={{ fontSize: '0.8rem', color: '#854d0e' }}>Traditional lined paper register • Easy to read and verify</p>
              </div>
            </div>
            <button
              onClick={() => setShowPassbook(false)}
              style={{ background: 'transparent', border: 'none', color: '#713f12', cursor: 'pointer', fontWeight: 700 }}
            >
              <X size={22} />
            </button>
          </div>

          {transactions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '30px', color: '#854d0e', fontStyle: 'italic', fontSize: '0.95rem' }}>
              Your passbook is completely fresh with 0 entries. Use the big buttons below to write your first entry!
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#1c1917' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #1c1917', fontSize: '0.85rem' }}>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#1c1917' }}>Date</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#1c1917' }}>What For</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>Money Out (-)</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#15803d' }}>Money In (+)</th>
                    <th style={{ padding: '10px', textAlign: 'right', color: '#1c1917' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isExpense = tx.transaction_type === 'EXPENSE' || tx.transaction_type === 'SPLIT';
                    const txPostings = postings.filter((p) => p.transaction_id === tx.id);
                    const amtMicro = txPostings[0]?.amount_micro || 0n;

                    return (
                      <tr key={tx.id} className="passbook-line">
                        <td style={{ padding: '10px', fontSize: '0.85rem' }}>
                          {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700, fontSize: '0.95rem' }}>
                          {tx.description}
                        </td>
                        <td className={`num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                          {isExpense ? formatCurrency(amtMicro) : '—'}
                        </td>
                        <td className={`num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#15803d' }}>
                          {!isExpense ? formatCurrency(amtMicro) : '—'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>
                          ✓ Saved
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PART B (MIDDLE): The 3 Everyday Familiar Pouches
          ======================================================== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        
        {/* Pouch 1: Bank & Cash Pouch */}
        <div className="pillow-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>👛</span>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>My Bank &amp; Cash Pouch</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Safe liquid balance</p>
            </div>
          </div>

          <div className={`num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399', margin: '10px 0' }}>
            {formatCurrency(totalLiquid)}
          </div>

          <button
            onClick={() => {
              soundAndVoice.playPillowTap();
              setShowDepositModal(true);
            }}
            className="pillow-btn pillow-green"
            style={{ minHeight: '48px', padding: '8px 16px', fontSize: '0.85rem', width: '100%', marginTop: '6px' }}
          >
            <PlusCircle size={18} />
            <span>+ Put Money In (Salary / Gift)</span>
          </button>
        </div>

        {/* Pouch 2: Bills & Medicine Reminder Box */}
        <div className="pillow-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>📅</span>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Bills &amp; Medicine Box</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kept aside safely</p>
            </div>
          </div>

          {bills.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>
              ✓ All bills &amp; medicines are paid!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {bills.map((bill) => (
                <div key={bill.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{bill.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#fbbf24' }}>
                      <span className={`num-mono ${isPrivate ? 'blur-num' : ''}`}>₹{bill.amount}</span> • {bill.dueDate}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePayBillClick(bill.id, bill.name, bill.amount)}
                    className="pillow-btn pillow-green"
                    style={{ minHeight: '38px', padding: '6px 14px', fontSize: '0.78rem', borderRadius: '12px' }}
                  >
                    <Check size={14} />
                    <span>Pay ✓</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pouch 3: Happy Savings Jar (Grandparent & Child Match) */}
        <div className="pillow-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.8rem' }}>🏺</span>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Happy Savings Jar</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Goal: New Bicycle / Storybook</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245,158,11,0.15)', padding: '4px 8px', borderRadius: '99px', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 800 }}>
              <Star size={13} fill="#fbbf24" />
              <span>{bonusStars} Stars</span>
            </div>
          </div>

          <div className={`num-mono ${isPrivate ? 'blur-num' : ''}`} style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', margin: '10px 0' }}>
            ₹{piggyCoins.toLocaleString('en-IN')}
          </div>

          <button
            onClick={handleDropPiggyCoin}
            className="pillow-btn pillow-amber"
            style={{ minHeight: '48px', padding: '8px 16px', fontSize: '0.85rem', width: '100%', marginTop: '6px' }}
          >
            <Coins size={18} />
            <span>Drop ₹50 Coin (+ Grandpa Match!) 🪙</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          PART C (BOTTOM): The 3 Giant Pillow Buttons (64px+ Height)
          ======================================================== */}
      <div>
        <div style={{ textAlign: 'center', marginBottom: '14px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          👇 TAP ANY BUTTON TO ADD SPENDING IN 1 SECOND
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          
          {/* Button 1: Hold & Speak */}
          <button
            onClick={() => {
              soundAndVoice.playPillowTap();
              setShowVoiceModal(true);
            }}
            className="pillow-btn pillow-green"
          >
            <Mic size={28} />
            <span style={{ fontSize: '1.15rem' }}>🎙️ Hold &amp; Speak</span>
          </button>

          {/* Button 2: Show Paper Bill */}
          <button
            onClick={() => {
              soundAndVoice.playPillowTap();
              setShowCameraModal(true);
            }}
            className="pillow-btn pillow-amber"
          >
            <Camera size={28} />
            <span style={{ fontSize: '1.15rem' }}>📷 Show Paper Bill</span>
          </button>

          {/* Button 3: Tap a Picture */}
          <button
            onClick={() => {
              soundAndVoice.playPillowTap();
              setShowTilesModal(true);
            }}
            className="pillow-btn pillow-blue"
          >
            <PlusCircle size={28} />
            <span style={{ fontSize: '1.15rem' }}>➕ Tap a Picture</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          MODAL 1: The 6 Big Picture Tiles & Giant Talking Keypad
          ======================================================== */}
      {showTilesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'grid', placeItems: 'center', zIndex: 110, padding: '20px' }}>
          <div className="pillow-card" style={{ maxWidth: '520px', width: '100%', padding: '28px', background: '#0e1524' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Tap What You Spent Money On</h3>
              <button
                onClick={() => {
                  setShowTilesModal(false);
                  setSelectedTile(null);
                  setCalcDisplay('');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* 6 Picture Tiles */}
            {!selectedTile ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { name: 'Food & Milk', emoji: '🥛' },
                  { name: 'Medicine & Doctor', emoji: '💊' },
                  { name: 'Auto & Travel', emoji: '🛺' },
                  { name: 'Home & Bills', emoji: '🏠' },
                  { name: 'Family & Gifts', emoji: '🎁' },
                  { name: 'Tea & Treats', emoji: '☕' },
                ].map((tile, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      soundAndVoice.playPillowTap();
                      setSelectedTile(tile);
                    }}
                    className="pillow-btn"
                    style={{
                      minHeight: '80px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-subtle)',
                      flexDirection: 'column',
                      gap: '6px',
                      color: '#ffffff'
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>{tile.emoji}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{tile.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* Giant Talking Number Pad */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '2rem' }}>{selectedTile.emoji}</span>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedTile.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type how many rupees on the keypad</p>
                  </div>
                </div>

                {/* Display */}
                <div style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '2px solid rgba(99,102,241,0.5)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  textAlign: 'right',
                  fontSize: '2.4rem',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: '#34d399',
                  minHeight: '70px',
                  marginBottom: '16px'
                }}>
                  ₹{calcDisplay || '0'}
                </div>

                {/* Pad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleKeypadPress(k)}
                      className="pillow-btn"
                      style={{
                        minHeight: '60px',
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        background: k === 'C' ? '#dc2626' : k === 'DEL' ? '#d97706' : 'rgba(255,255,255,0.06)',
                        color: '#ffffff'
                      }}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    onClick={() => setSelectedTile(null)}
                    className="pillow-btn"
                    style={{ flex: 1, minHeight: '56px', background: 'rgba(255,255,255,0.05)', color: '#ffffff' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleTileSubmit}
                    disabled={!calcDisplay || parseFloat(calcDisplay) <= 0}
                    className="pillow-btn pillow-green"
                    style={{ flex: 2, minHeight: '56px' }}
                  >
                    <span>Done ✓</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: Voice Command Dialog (Speak to Add)
          ======================================================== */}
      {showVoiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'grid', placeItems: 'center', zIndex: 110, padding: '20px' }}>
          <div className="pillow-card" style={{ maxWidth: '480px', width: '100%', padding: '28px', background: '#0e1524', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowVoiceModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'grid', placeItems: 'center', margin: '0 auto 16px auto', boxShadow: '0 0 35px rgba(22, 163, 74, 0.5)' }}>
              <Mic size={40} color="#ffffff" />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>I Am Listening...</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0 20px' }}>
              Speak naturally in Hindi or English: e.g. <em>"Paid 80 rupees for vegetables"</em> or <em>"Gave 200 rupees pocket money"</em>
            </p>

            <form onSubmit={handleVoiceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Or type voice sentence here..."
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                autoFocus
                style={{ fontSize: '1rem', padding: '14px 18px' }}
              />

              <button type="submit" className="pillow-btn pillow-green" style={{ minHeight: '56px' }}>
                <span>Save Entry ✓</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: Camera Paper Bill Scan
          ======================================================== */}
      {showCameraModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'grid', placeItems: 'center', zIndex: 110, padding: '20px' }}>
          <div className="pillow-card" style={{ maxWidth: '480px', width: '100%', padding: '28px', background: '#0e1524' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>📷 Show Paper Bill or Slip</h3>
              <button onClick={() => setShowCameraModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '16px', padding: '28px', textAlign: 'center', marginBottom: '16px', background: 'rgba(255,255,255,0.02)' }}>
              <Camera size={42} color="#f59e0b" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>Point camera at grocery or pharmacy slip</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                The app reads the bill amount and stores a safe picture copy.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Detected Bill Amount (₹):</label>
              <input
                type="number"
                className="input-field"
                value={scannedAmount}
                onChange={(e) => setScannedAmount(e.target.value)}
                style={{ fontSize: '1.2rem', fontWeight: 800, padding: '12px' }}
              />

              <button
                onClick={handleBillPhotoSubmit}
                className="pillow-btn pillow-amber"
                style={{ minHeight: '56px', marginTop: '6px' }}
              >
                <span>Save Bill &amp; Store Receipt ✓</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: Put Money In (Salary / Opening Deposit)
          ======================================================== */}
      {showDepositModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', display: 'grid', placeItems: 'center', zIndex: 110, padding: '20px' }}>
          <div className="pillow-card" style={{ maxWidth: '440px', width: '100%', padding: '28px', background: '#0e1524' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>👛 Put Money In (Deposit)</h3>
              <button onClick={() => setShowDepositModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = parseFloat(calcDisplay);
                if (isNaN(amt) || amt <= 0) return;
                soundAndVoice.playSuccessChime();
                onRecordDeposit(toMicroUnits(amt), 'Salary / Opening Deposit');
                soundAndVoice.speakAloud(`Deposited ${Math.round(amt)} rupees safely into your bank pouch.`);
                setCalcDisplay('');
                setShowDepositModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>How much money did you receive? (₹)</label>
              <input
                type="number"
                placeholder="e.g. 45000"
                className="input-field"
                value={calcDisplay}
                onChange={(e) => setCalcDisplay(e.target.value)}
                autoFocus
                style={{ fontSize: '1.3rem', fontWeight: 800, padding: '12px' }}
              />

              <button type="submit" className="pillow-btn pillow-green" style={{ minHeight: '56px' }}>
                <span>Save Money In ✓</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          PERSISTENT 10-SECOND FORGIVING UNDO BAR
          ======================================================== */}
      {lastActionMessage && (
        <div
          onClick={() => {
            soundAndVoice.playUndoSwoosh();
            onUndoLastAction();
            soundAndVoice.speakAloud('Entry undone! Your previous balances are restored.');
          }}
          className="undo-bar"
          title="Tap to undo your last entry"
        >
          <RotateCcw size={22} />
          <span>Made a mistake? Tap here to Undo ↩️</span>
        </div>
      )}
    </div>
  );
};
