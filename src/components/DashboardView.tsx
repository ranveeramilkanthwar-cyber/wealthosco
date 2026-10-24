import React from 'react';
import { 
  Building2, 
  TrendingUp, 
  Layers, 
  ShieldCheck, 
  DollarSign, 
  Percent, 
  Activity, 
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { InstitutionalKPIs } from '../../core/financial-engine/analyticsAndTaxEngine';
import { formatCurrency } from '../../core/financial-engine/microUnits';

interface DashboardViewProps {
  kpis: InstitutionalKPIs;
  totalAssetsMicro: bigint;
  totalLiabilitiesMicro: bigint;
  netWorthMicro: bigint;
  monthlyIncomeMicro: bigint;
  monthlyExpenseMicro: bigint;
  netSurplusMicro: bigint;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  kpis,
  totalAssetsMicro,
  totalLiabilitiesMicro,
  netWorthMicro,
  monthlyIncomeMicro,
  monthlyExpenseMicro,
  netSurplusMicro,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* ─── Minimal Header ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-primary)' }}>
            Financial Overview
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Live double-entry balance sheet &amp; solvency metrics
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '6px 12px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, color: '#34d399' }}>
          <CheckCircle2 size={13} />
          <span>Real Ledger Active • 0 Drift</span>
        </div>
      </div>

      {/* ─── 🏛️ Row 1: Balance Sheet Equation (Assets - Liabilities = Net Worth) ─── */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} color="#818cf8" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
              Balance Sheet Equation
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Assets − Liabilities = Net Worth
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          {/* Assets */}
          <div style={{ flex: '1 1 200px', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.22)', borderRadius: '16px', padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💎 Total Assets
            </div>
            <div className="num-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
              {formatCurrency(totalAssetsMicro)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Cash, bank &amp; investments
            </div>
          </div>

          {/* Minus Operator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: '#fb7185', fontWeight: 900, fontSize: '1.25rem', flexShrink: 0 }}>
            −
          </div>

          {/* Liabilities */}
          <div style={{ flex: '1 1 200px', background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.22)', borderRadius: '16px', padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💳 Total Liabilities
            </div>
            <div className="num-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
              {formatCurrency(totalLiabilitiesMicro)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Cards &amp; loan obligations
            </div>
          </div>

          {/* Equals Operator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: '#818cf8', fontWeight: 900, fontSize: '1.25rem', flexShrink: 0 }}>
            =
          </div>

          {/* Consolidated Net Worth */}
          <div style={{ flex: '1.2 1 220px', background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.18))', border: '1.5px solid rgba(99,102,241,0.4)', borderRadius: '16px', padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🏛️ Consolidated Net Worth
            </div>
            <div className="num-mono" style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', marginTop: '6px' }}>
              {formatCurrency(netWorthMicro)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#34d399', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight size={13} />
              <span>₹{kpis.personalBurnVelocityDaily.toFixed(0)}/day accumulation</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 💸 Row 2: Cash Flow Equation (Inflows - OpEx = Net Surplus) ─── */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#10b981" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
              Monthly Flow Equation
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Inflows − OpEx = Net Surplus
          </span>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          {/* Inflows */}
          <div style={{ flex: '1 1 200px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.22)', borderRadius: '16px', padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💰 Inflows (Income)
            </div>
            <div className="num-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
              +{formatCurrency(monthlyIncomeMicro)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Earned monthly income
            </div>
          </div>

          {/* Minus Operator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: '#fb7185', fontWeight: 900, fontSize: '1.25rem', flexShrink: 0 }}>
            −
          </div>

          {/* OpEx */}
          <div style={{ flex: '1 1 200px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.22)', borderRadius: '16px', padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', color: '#fb7185', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💸 OpEx (Expenses)
            </div>
            <div className="num-mono" style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fb7185', marginTop: '6px' }}>
              -{formatCurrency(monthlyExpenseMicro)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Out-of-pocket expenses
            </div>
          </div>

          {/* Equals Operator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', color: '#38bdf8', fontWeight: 900, fontSize: '1.25rem', flexShrink: 0 }}>
            =
          </div>

          {/* Monthly Net Surplus */}
          <div style={{ flex: '1.2 1 220px', background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(99,102,241,0.15))', border: '1.5px solid rgba(56,189,248,0.35)', borderRadius: '16px', padding: '16px 18px' }}>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              📈 Monthly Net Surplus
            </div>
            <div className="num-mono" style={{ fontSize: '1.6rem', fontWeight: 900, color: netSurplusMicro >= 0n ? '#38bdf8' : '#fb7185', marginTop: '6px' }}>
              {formatCurrency(netSurplusMicro)}
            </div>
            <div style={{ fontSize: '0.7rem', color: netSurplusMicro >= 0n ? '#34d399' : '#fb7185', marginTop: '4px' }}>
              {netSurplusMicro >= 0n ? 'Positive cash surplus' : 'Deficit burn warning'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 📊 Row 3: Minimal Financial Health Ratios ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        
        {/* 1. Savings Rate */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Savings Rate</span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: kpis.savingsRatePercent >= 20 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
              color: kpis.savingsRatePercent >= 20 ? '#34d399' : '#fbbf24',
            }}>
              Target &gt; 20%
            </span>
          </div>
          <div className="num-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: kpis.savingsRatePercent >= 20 ? '#34d399' : '#fbbf24', marginTop: '8px' }}>
            {kpis.savingsRatePercent.toFixed(1)}%
          </div>
        </div>

        {/* 2. Liquidity Runway */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Liquidity Runway</span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: kpis.liquidityRunwayMonths >= 6 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 113, 133, 0.15)',
              color: kpis.liquidityRunwayMonths >= 6 ? '#34d399' : '#fb7185',
            }}>
              Target 6–12 mo
            </span>
          </div>
          <div className="num-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: kpis.liquidityRunwayMonths >= 6 ? '#34d399' : '#fb7185', marginTop: '8px' }}>
            {kpis.liquidityRunwayMonths.toFixed(1)} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>mo</span>
          </div>
        </div>

        {/* 3. Debt-to-Income */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Debt-to-Income</span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: kpis.debtToIncomePercent < 30 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 113, 133, 0.15)',
              color: kpis.debtToIncomePercent < 30 ? '#34d399' : '#fb7185',
            }}>
              Target &lt; 30%
            </span>
          </div>
          <div className="num-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: kpis.debtToIncomePercent < 30 ? '#34d399' : '#fb7185', marginTop: '8px' }}>
            {kpis.debtToIncomePercent.toFixed(1)}%
          </div>
        </div>

        {/* 4. Working Capital */}
        <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Working Capital</span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px',
              background: kpis.workingCapitalRatio >= 1.5 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
              color: kpis.workingCapitalRatio >= 1.5 ? '#34d399' : '#fbbf24',
            }}>
              Target &gt; 1.5x
            </span>
          </div>
          <div className="num-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: kpis.workingCapitalRatio >= 1.5 ? '#34d399' : '#fbbf24', marginTop: '8px' }}>
            {kpis.workingCapitalRatio.toFixed(2)}x
          </div>
        </div>

      </div>

    </div>
  );
};
