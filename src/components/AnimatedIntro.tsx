import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, Play, X, ShieldCheck, FileSpreadsheet, Zap } from 'lucide-react';
import { soundAndVoice } from '../../core/financial-engine/audioSpeechEngine';

interface AnimatedIntroProps {
  userName?: string;
  onFinish: () => void;
  onToggleShowOnStart?: (show: boolean) => void;
  initiallyShowOnStart?: boolean;
}

export const AnimatedIntro: React.FC<AnimatedIntroProps> = ({
  userName = 'Friend',
  onFinish,
  onToggleShowOnStart,
  initiallyShowOnStart = true,
}) => {
  const [progress, setProgress] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(!initiallyShowOnStart);
  const [isPullingDashboard, setIsPullingDashboard] = useState(false);
  const [coinPosition, setCoinPosition] = useState({ x: 5, y: 15, rot: 0 });

  useEffect(() => {
    // Play welcoming chime
    try {
      soundAndVoice.playSuccessChime();
    } catch {}

    // Auto-progress timer (3.8 seconds total: rolling cascade then curtain pull)
    const startTime = Date.now();
    const duration = 3800;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      // Physics of rolling coin moving dynamically from top-left across the screen and into the bottom vault
      const t = pct / 100;
      const curX = 12 + 76 * Math.sin(t * Math.PI * 1.4) ** 2;
      const curY = 10 + 78 * (t ** 1.35);
      const rot = t * 1800; // 5 full 360-degree rolls

      setCoinPosition({ x: curX, y: curY, rot });

      if (pct >= 90 && !isPullingDashboard) {
        setIsPullingDashboard(true);
        try {
          soundAndVoice.playSuccessChime();
        } catch {}
      }

      if (pct >= 100) {
        clearInterval(interval);
        handleFinish();
      }
    }, 28);

    return () => clearInterval(interval);
  }, []);

  const handleFinish = () => {
    setIsPullingDashboard(true);
    setTimeout(() => {
      onFinish();
    }, 450);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setDontShowAgain(checked);
    if (onToggleShowOnStart) {
      onToggleShowOnStart(!checked);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(ellipse at center, rgba(12, 17, 32, 0.96) 0%, rgba(4, 6, 14, 0.99) 100%)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        transform: isPullingDashboard ? 'translateY(-100%) scale(0.98)' : 'translateY(0) scale(1)',
        opacity: isPullingDashboard ? 0 : 1,
        transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease',
        overflow: 'hidden',
      }}
    >
      {/* Dynamic Rolling Golden Coin (Rolls to bottom and pulls up dashboard) */}
      <div
        style={{
          position: 'absolute',
          left: `${coinPosition.x}%`,
          top: `${coinPosition.y}%`,
          transform: `translate(-50%, -50%) rotate(${coinPosition.rot}deg)`,
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFE066 0%, #F59E0B 50%, #D97706 100%)',
          boxShadow: '0 0 35px rgba(245, 158, 11, 0.75), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 6px rgba(0,0,0,0.4)',
          border: '3px solid #FEF08A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: 900,
          color: '#78350F',
          zIndex: 10001,
          pointerEvents: 'none',
          transition: 'box-shadow 0.1s ease',
        }}
      >
        <span>₹</span>
      </div>

      {/* Satellite Trailing Mini-Coin 1 */}
      <div
        style={{
          position: 'absolute',
          left: `${Math.max(5, coinPosition.x - 4)}%`,
          top: `${Math.max(5, coinPosition.y - 5)}%`,
          transform: `translate(-50%, -50%) rotate(${coinPosition.rot * 1.2}deg)`,
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
          boxShadow: '0 0 20px rgba(245, 158, 11, 0.55)',
          border: '2px solid #FEF08A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 900,
          color: '#78350F',
          zIndex: 10000,
          pointerEvents: 'none',
          opacity: 0.85,
        }}
      >
        <span>₹</span>
      </div>

      {/* Satellite Trailing Mini-Coin 2 */}
      <div
        style={{
          position: 'absolute',
          left: `${Math.max(5, coinPosition.x + 3)}%`,
          top: `${Math.max(5, coinPosition.y - 8)}%`,
          transform: `translate(-50%, -50%) rotate(${coinPosition.rot * 0.8}deg)`,
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #A7F3D0 0%, #10B981 100%)',
          boxShadow: '0 0 16px rgba(16, 185, 129, 0.5)',
          border: '2px solid #D1FAE5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 900,
          color: '#064E3B',
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: 0.75,
        }}
      >
        <span>💎</span>
      </div>

      {/* Sparkle Trail Behind Rolling Coin */}
      <div
        style={{
          position: 'absolute',
          left: `${coinPosition.x}%`,
          top: `${coinPosition.y}%`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 10000,
        }}
      >
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', top: -18, left: -24, fontSize: '20px', animation: 'sparklePop 0.8s infinite' }}>✨</span>
          <span style={{ position: 'absolute', top: 14, left: -28, fontSize: '16px', animation: 'sparklePop 0.6s infinite 0.2s' }}>🌟</span>
          <span style={{ position: 'absolute', top: -28, left: 18, fontSize: '18px', animation: 'sparklePop 0.7s infinite 0.4s' }}>💫</span>
        </div>
      </div>

      {/* Vault Trigger at Bottom of Screen */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          zIndex: 10000,
        }}
      >
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.25)',
            border: '2px dashed rgba(99, 102, 241, 0.6)',
            borderRadius: '99px',
            padding: '8px 24px',
            color: '#A5B4FC',
            fontSize: '0.82rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.35)',
            animation: 'pulseGlow 2s infinite',
          }}
        >
          <span>🏦 WealthOS Vault Portal</span>
          <span>↓</span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Coin rolls to end of page to pull and launch dashboard
        </span>
      </div>

      {/* Skip Button Top Right */}
      <button
        onClick={handleFinish}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '99px',
          padding: '8px 18px',
          color: '#cbd5e1',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.15s ease',
          zIndex: 10002,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      >
        <span>Skip &amp; Open Dashboard</span>
        <X size={14} />
      </button>

      {/* Ambient Moving Orbs */}
      <div
        style={{
          position: 'absolute',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.28) 0%, transparent 70%)',
          top: '15%',
          left: '20%',
          filter: 'blur(60px)',
          animation: 'pulseGlow 4s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, transparent 70%)',
          bottom: '20%',
          right: '20%',
          filter: 'blur(55px)',
          animation: 'pulseGlow 5s ease-in-out infinite alternate-reverse',
          pointerEvents: 'none',
        }}
      />

      {/* Center Welcome Card */}
      <div
        style={{
          position: 'relative',
          maxWidth: '540px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1.5px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '32px',
          padding: '36px 30px 28px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        {/* Animated Badge */}
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '26px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '42px',
            boxShadow: '0 16px 40px rgba(99, 102, 241, 0.45)',
            marginBottom: '18px',
            animation: 'coinBounce 2s ease-in-out infinite alternate',
          }}
        >
          🪙
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h1
            style={{
              fontSize: '2.4rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              margin: 0,
              background: 'linear-gradient(135deg, #FFFFFF 30%, #A5B4FC 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Wealth<span style={{ color: '#818CF8' }}>OS</span>
          </h1>
          <span
            style={{
              background: 'rgba(16, 185, 129, 0.18)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34D399',
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: '99px',
            }}
          >
            v5.0 PRO
          </span>
        </div>

        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '6px' }}>
          Welcome, {userName}! 🌟
        </div>

        <p
          style={{
            fontSize: '0.84rem',
            color: '#94A3B8',
            maxWidth: '430px',
            lineHeight: 1.5,
            margin: '0 0 20px 0',
          }}
        >
          Smart personal finance with Other Expenses (behalf payments), Other Income (pending to come), and 1-click cloud sync to your linked sheet!
        </p>

        {/* 3 Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            width: '100%',
            marginBottom: '22px',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '10px 8px',
              fontSize: '0.74rem',
              color: '#E2E8F0',
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Zap size={18} color="#F59E0B" />
            <span>Instant Sync</span>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '10px 8px',
              fontSize: '0.74rem',
              color: '#E2E8F0',
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <FileSpreadsheet size={18} color="#10B981" />
            <span>Detailed Sheets</span>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '10px 8px',
              fontSize: '0.74rem',
              color: '#E2E8F0',
              fontWeight: 700,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ShieldCheck size={18} color="#6366F1" />
            <span>Double-Entry CA</span>
          </div>
        </div>

        {/* Rolling Progress Bar */}
        <div style={{ width: '100%', marginBottom: '18px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#94A3B8',
              marginBottom: '6px',
            }}
          >
            <span>Rolling coin to unlock vault...</span>
            <span style={{ color: '#F59E0B' }}>{progress}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '99px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366F1, #F59E0B, #10B981)',
                borderRadius: '99px',
                transition: 'width 0.04s linear',
              }}
            />
          </div>
        </div>

        {/* Enter Dashboard Action Button */}
        <button
          onClick={handleFinish}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
            border: 'none',
            borderRadius: '18px',
            padding: '14px 20px',
            color: '#FFF',
            fontWeight: 800,
            fontSize: '0.96rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span>Enter Dashboard Now</span>
          <ArrowRight size={18} />
        </button>

        {/* Checkbox Don't show on start */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            fontSize: '0.76rem',
            color: '#64748B',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={handleCheckboxChange}
            style={{ cursor: 'pointer' }}
          />
          <span>Don’t show this intro automatically next time</span>
        </label>
      </div>
    </div>
  );
};
