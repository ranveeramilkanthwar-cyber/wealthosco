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
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Play welcoming chime
    try {
      soundAndVoice.playSuccessChime();
    } catch {
      // Audio autoplay policy fallback
    }

    // Auto-progress timer (3.5 seconds)
    const startTime = Date.now();
    const duration = 3500;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        handleClose();
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onFinish();
    }, 350);
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
        background: 'radial-gradient(ellipse at center, rgba(17, 24, 39, 0.94) 0%, rgba(5, 7, 15, 0.98) 100%)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        opacity: isClosing ? 0 : 1,
        transform: isClosing ? 'scale(1.05)' : 'scale(1)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Floating Orbs & Glow */}
      <div
        style={{
          position: 'absolute',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.28) 0%, rgba(139, 92, 246, 0.05) 70%)',
          top: '20%',
          left: '30%',
          filter: 'blur(60px)',
          animation: 'pulseGlow 4s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 70%)',
          bottom: '15%',
          right: '25%',
          filter: 'blur(50px)',
          animation: 'pulseGlow 5s ease-in-out infinite alternate-reverse',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Particles */}
      {[
        { symbol: '₹', top: '15%', left: '18%', delay: '0s', size: '26px' },
        { symbol: '✨', top: '22%', right: '20%', delay: '0.8s', size: '22px' },
        { symbol: '📊', bottom: '25%', left: '15%', delay: '1.2s', size: '28px' },
        { symbol: '💰', bottom: '20%', right: '18%', delay: '0.4s', size: '24px' },
        { symbol: '💎', top: '48%', left: '10%', delay: '1.6s', size: '20px' },
      ].map((p, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            top: p.top,
            left: p.left,
            right: p.right,
            bottom: p.bottom,
            fontSize: p.size,
            opacity: 0.45,
            filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.4))',
            animation: `floatUp 3s ease-in-out infinite alternate`,
            animationDelay: p.delay,
            pointerEvents: 'none',
          }}
        >
          {p.symbol}
        </div>
      ))}

      {/* Skip Button Top Right */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '99px',
          padding: '8px 16px',
          color: '#cbd5e1',
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      >
        <span>Skip Intro</span>
        <X size={14} />
      </button>

      {/* Main Glass Center Card */}
      <div
        style={{
          position: 'relative',
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '32px',
          padding: '40px 32px 32px',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Animated Rotating 3D Coin Badge */}
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '28px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '44px',
            boxShadow: '0 16px 40px rgba(99, 102, 241, 0.45)',
            marginBottom: '22px',
            transform: 'rotate(-5deg)',
            animation: 'coinBounce 2.5s ease-in-out infinite alternate',
          }}
        >
          🪙
        </div>

        {/* Brand Title */}
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
              letterSpacing: '0.04em',
            }}
          >
            v5.0 LIVE
          </span>
        </div>

        {/* Personalized Welcome */}
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
          Welcome back, {userName}! ✨
        </div>

        <p
          style={{
            fontSize: '0.86rem',
            color: '#94A3B8',
            maxWidth: '420px',
            lineHeight: 1.5,
            margin: '0 0 24px 0',
          }}
        >
          Zero typing expense tracking with live Excel &amp; Google Sheet cloud sync, transparent aesthetic glass, and silent 64-bit accounting security.
        </p>

        {/* Feature Highlights Pills */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            width: '100%',
            marginBottom: '26px',
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
            <span>Excel / Sheets</span>
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
            <span>Zero Drift</span>
          </div>
        </div>

        {/* Enter Button */}
        <button
          onClick={handleClose}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            border: 'none',
            borderRadius: '16px',
            padding: '16px 24px',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 10px 30px rgba(99, 102, 241, 0.45)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            marginBottom: '16px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
            e.currentTarget.style.boxShadow = '0 14px 40px rgba(99, 102, 241, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.45)';
          }}
        >
          <span>Enter Dashboard</span>
          <ArrowRight size={18} />
        </button>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '14px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366F1, #10B981)',
              borderRadius: '2px',
              transition: 'width 0.05s linear',
            }}
          />
        </div>

        {/* Don't show again toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.74rem',
            color: '#94A3B8',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={handleCheckboxChange}
            style={{ accentColor: '#6366F1', cursor: 'pointer' }}
          />
          <span>Don’t show intro again automatically</span>
        </label>
      </div>

      <style>{`
        @keyframes coinBounce {
          0% { transform: translateY(0px) rotate(-6deg); }
          100% { transform: translateY(-8px) rotate(6deg); }
        }
        @keyframes pulseGlow {
          0% { transform: scale(1) translate(0, 0); opacity: 0.6; }
          100% { transform: scale(1.2) translate(20px, -20px); opacity: 0.9; }
        }
        @keyframes floatUp {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-14px); }
        }
      `}</style>
    </div>
  );
};
