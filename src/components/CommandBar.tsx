import React, { useState } from 'react';
import { Sparkles, ArrowRight, CornerDownLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, toMicroUnits } from '../../core/financial-engine/microUnits';

interface CommandBarProps {
  onExecuteCommand: (commandText: string) => { success: boolean; message: string; postingsPreview?: any[] };
}

export const CommandBar: React.FC<CommandBarProps> = ({ onExecuteCommand }) => {
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const presets = [
    'Split 1800 lunch with Alice and Bob on Axis Card',
    '350 for Books via SBI UPI',
    'Capitalize 150000 MacBook Pro M4 36 months',
    'Pay 45000 HDFC to Regalia CC',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const res = onExecuteCommand(input.trim());
    setFeedback(res);
    if (res.success) {
      setInput('');
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleSelectPreset = (preset: string) => {
    setInput(preset);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '20px auto 10px auto', padding: '0 24px' }}>
      <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid rgba(99, 102, 241, 0.25)', boxShadow: 'var(--shadow-glow-indigo)' }}>
        
        {/* Label & Presets */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#818cf8" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Natural Language CA Command Bar
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick Templates:</span>
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(p)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)')}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', position: 'relative' }}>
          <input
            type="text"
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type financial command... e.g. 'Split 1800 lunch with Alice and Bob on Axis Card' or '350 for Books via SBI UPI'"
            style={{ fontSize: '0.95rem', padding: '12px 18px', background: 'rgba(8, 12, 20, 0.8)' }}
          />

          <button type="submit" className="btn-primary" style={{ padding: '12px 24px', flexShrink: 0 }}>
            <span>Post Entry</span>
            <CornerDownLeft size={16} />
          </button>
        </form>

        {/* Feedback Message */}
        {feedback && (
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: feedback.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${feedback.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.825rem',
            color: feedback.success ? '#34d399' : '#fb7185'
          }}>
            {feedback.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
