import React, { useMemo } from 'react';

interface MovingBackgroundProps {
  theme?: string;
  movingEnabled?: boolean;
  customBgUrl?: string;
  opacity?: number;
}

export const MovingBackground: React.FC<MovingBackgroundProps> = ({
  theme = 'aurora',
  movingEnabled = true,
  customBgUrl,
  opacity = 0.85,
}) => {
  const themeColors = useMemo(() => {
    switch (theme) {
      case 'candypop':
        return {
          c1: 'rgba(244, 63, 94, 0.22)',
          c2: 'rgba(168, 85, 247, 0.22)',
          c3: 'rgba(251, 191, 36, 0.16)',
          c4: 'rgba(236, 72, 153, 0.18)',
        };
      case 'oceanflow':
        return {
          c1: 'rgba(6, 182, 212, 0.25)',
          c2: 'rgba(59, 130, 246, 0.22)',
          c3: 'rgba(16, 185, 129, 0.18)',
          c4: 'rgba(14, 165, 233, 0.2)',
        };
      case 'emerald':
        return {
          c1: 'rgba(16, 185, 129, 0.22)',
          c2: 'rgba(52, 211, 153, 0.18)',
          c3: 'rgba(245, 158, 11, 0.14)',
          c4: 'rgba(5, 150, 105, 0.2)',
        };
      case 'sunset':
        return {
          c1: 'rgba(249, 115, 22, 0.25)',
          c2: 'rgba(236, 72, 153, 0.22)',
          c3: 'rgba(245, 158, 11, 0.18)',
          c4: 'rgba(168, 85, 247, 0.16)',
        };
      case 'cyberpunk':
        return {
          c1: 'rgba(236, 72, 153, 0.28)',
          c2: 'rgba(6, 182, 212, 0.26)',
          c3: 'rgba(139, 92, 246, 0.22)',
          c4: 'rgba(244, 63, 94, 0.2)',
        };
      case 'obsidian':
        return {
          c1: 'rgba(99, 102, 241, 0.12)',
          c2: 'rgba(148, 163, 184, 0.1)',
          c3: 'rgba(51, 65, 85, 0.2)',
          c4: 'rgba(15, 23, 42, 0.4)',
        };
      case 'aurora':
      default:
        return {
          c1: 'rgba(99, 102, 241, 0.26)',
          c2: 'rgba(6, 182, 212, 0.22)',
          c3: 'rgba(168, 85, 247, 0.2)',
          c4: 'rgba(16, 185, 129, 0.15)',
        };
    }
  }, [theme]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
        background: '#070b14',
      }}
    >
      {/* If custom wallpaper URL is set */}
      {customBgUrl && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${customBgUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.35,
          }}
        />
      )}

      {/* Moving Ambient Glowing Orbs */}
      {movingEnabled && (
        <>
          <div
            className="moving-orb orb-1"
            style={{
              position: 'absolute',
              width: 'min(75vw, 650px)',
              height: 'min(75vw, 650px)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${themeColors.c1} 0%, transparent 70%)`,
              filter: 'blur(50px)',
              top: '-15%',
              left: '-10%',
            }}
          />
          <div
            className="moving-orb orb-2"
            style={{
              position: 'absolute',
              width: 'min(70vw, 550px)',
              height: 'min(70vw, 550px)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${themeColors.c2} 0%, transparent 70%)`,
              filter: 'blur(55px)',
              top: '40%',
              right: '-15%',
            }}
          />
          <div
            className="moving-orb orb-3"
            style={{
              position: 'absolute',
              width: 'min(65vw, 500px)',
              height: 'min(65vw, 500px)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${themeColors.c3} 0%, transparent 70%)`,
              filter: 'blur(60px)',
              bottom: '-15%',
              left: '20%',
            }}
          />
          <div
            className="moving-orb orb-4"
            style={{
              position: 'absolute',
              width: 'min(50vw, 420px)',
              height: 'min(50vw, 420px)',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${themeColors.c4} 0%, transparent 70%)`,
              filter: 'blur(45px)',
              top: '20%',
              left: '50%',
            }}
          />
        </>
      )}

      {/* Subtle overlay grid / vignette for luxury feel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 30%, rgba(7, 11, 20, 0.75) 100%)',
        }}
      />
    </div>
  );
};
