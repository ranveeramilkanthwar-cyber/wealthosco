import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Scale, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Layers, 
  ShieldCheck,
  Percent
} from 'lucide-react';
import { AnalyticsAndTaxEngine } from '../../core/financial-engine/analyticsAndTaxEngine';
import { SecurityAndExportEngine } from '../../core/financial-engine/securityAndExportEngine';
import { Account, Transaction, LedgerPosting } from '../../core/financial-engine/types';
import { formatCurrency, toMicroUnits, fromMicroUnits } from '../../core/financial-engine/microUnits';

interface TaxAndExportViewProps {
  accounts: Account[];
  transactions: Transaction[];
  postings: LedgerPosting[];
}

export const TaxAndExportView: React.FC<TaxAndExportViewProps> = ({
  accounts,
  transactions,
  postings,
}) => {
  const [taxEngine] = useState(() => new AnalyticsAndTaxEngine());
  const [exportEngine] = useState(() => new SecurityAndExportEngine());

  // Tax Regime Comparator State
  const [grossIncome, setGrossIncome] = useState(1800000); // ₹18 Lakhs
  const [deduction80C, setDeduction80C] = useState(150000); // ₹1.5L
  const [deduction80D, setDeduction80D] = useState(50000); // ₹50k
  const [hra, setHra] = useState(240000); // ₹2.4L
  const [loanInterest24b, setLoanInterest24b] = useState(200000); // ₹2L

  const taxComparison = taxEngine.compareTaxRegimes({
    grossAnnualIncomeMicro: toMicroUnits(grossIncome),
    deduction80CMicro: toMicroUnits(deduction80C),
    deduction80DMicro: toMicroUnits(deduction80D),
    hraExemptionMicro: toMicroUnits(hra),
    homeLoanInterest24bMicro: toMicroUnits(loanInterest24b),
  });

  const caStatements = taxEngine.generateCAAuditStatements(accounts);

  // Export handlers
  const handleDownload = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportBeancount = () => {
    const content = exportEngine.exportToBeancount(accounts, transactions, postings);
    handleDownload(content, 'wealth_os_ledger.beancount', 'text/plain');
  };

  const handleExportGnuCash = () => {
    const content = exportEngine.exportToGnuCashXML(accounts, transactions);
    handleDownload(content, 'wealth_os_ledger.gnucash', 'application/xml');
  };

  const handleExportCSV = () => {
    const content = exportEngine.exportToCSV(transactions, postings);
    handleDownload(content, 'wealth_os_transactions.csv', 'text/csv');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Old vs New Tax Regime Comparator */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Scale size={20} color="#818cf8" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Income Tax Regime Comparator (India IT Act)</h2>
          <span className="badge badge-indigo">Old Regime vs Sec 115BAC</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Simulates Old Regime (80C, 80D, HRA, Sec 24b) against New Concessional Regime with standard deduction ₹75k.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gross Annual Income:</span>
                <span className="num-mono" style={{ fontWeight: 700 }}>₹{(grossIncome / 100000).toFixed(1)} Lakhs</span>
              </div>
              <input
                type="range"
                min="500000"
                max="5000000"
                step="50000"
                value={grossIncome}
                onChange={(e) => setGrossIncome(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Section 80C (PPF/ELSS/EPF):</span>
                <span className="num-mono" style={{ fontWeight: 700 }}>₹{(deduction80C / 1000).toFixed(0)}k</span>
              </div>
              <input
                type="range"
                min="0"
                max="150000"
                step="10000"
                value={deduction80C}
                onChange={(e) => setDeduction80C(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>HRA Exemption:</span>
                <span className="num-mono" style={{ fontWeight: 700 }}>₹{(hra / 1000).toFixed(0)}k</span>
              </div>
              <input
                type="range"
                min="0"
                max="600000"
                step="20000"
                value={hra}
                onChange={(e) => setHra(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Home Loan Interest Sec 24(b):</span>
                <span className="num-mono" style={{ fontWeight: 700 }}>₹{(loanInterest24b / 1000).toFixed(0)}k</span>
              </div>
              <input
                type="range"
                min="0"
                max="200000"
                step="10000"
                value={loanInterest24b}
                onChange={(e) => setLoanInterest24b(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Results Comparison */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              
              {/* Old Regime */}
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                background: taxComparison.recommendedRegime === 'OLD_REGIME' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${taxComparison.recommendedRegime === 'OLD_REGIME' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>OLD REGIME</span>
                  {taxComparison.recommendedRegime === 'OLD_REGIME' && <span className="badge badge-emerald">Optimal</span>}
                </div>
                <div className="num-mono" style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '8px', color: '#f8fafc' }}>
                  {formatCurrency(taxComparison.oldRegime.taxPayableMicro)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Effective Rate: {taxComparison.oldRegime.effectiveTaxRatePercent}%
                </div>
              </div>

              {/* New Regime */}
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                background: taxComparison.recommendedRegime === 'NEW_REGIME' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${taxComparison.recommendedRegime === 'NEW_REGIME' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>NEW REGIME (115BAC)</span>
                  {taxComparison.recommendedRegime === 'NEW_REGIME' && <span className="badge badge-emerald">Optimal</span>}
                </div>
                <div className="num-mono" style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '8px', color: '#f8fafc' }}>
                  {formatCurrency(taxComparison.newRegime.taxPayableMicro)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Effective Rate: {taxComparison.newRegime.effectiveTaxRatePercent}%
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#818cf8" />
              <span>
                Recommendation: Choose <strong>{taxComparison.recommendedRegime.replace('_', ' ')}</strong> to save approximately <strong>{formatCurrency(taxComparison.annualTaxSavingsMicro)}</strong> annually!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* One-Click CA Audit Package & Open Portability Exports */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} color="#10b981" />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>1-Click CA Audit Package &amp; Zero Lock-In Export</h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Complies with ICAI standards. Personal Balance Sheet, Profit &amp; Loss, and open format portability.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={handleExportBeancount} className="btn-secondary" style={{ fontSize: '0.75rem', gap: '6px' }}>
              <Download size={13} />
              <span>Export Beancount</span>
            </button>
            <button onClick={handleExportGnuCash} className="btn-secondary" style={{ fontSize: '0.75rem', gap: '6px' }}>
              <Download size={13} />
              <span>Export GnuCash (XML)</span>
            </button>
            <button onClick={handleExportCSV} className="btn-primary" style={{ fontSize: '0.75rem', gap: '6px' }}>
              <Download size={13} />
              <span>Download Excel CSV</span>
            </button>
          </div>
        </div>

        {/* Balance Sheet Preview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          
          {/* Balance Sheet */}
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>PERSONAL BALANCE SHEET</span>
              <span className="badge badge-emerald">Audited</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Assets:</span>
                <span className="num-mono" style={{ fontWeight: 700, color: '#34d399' }}>
                  {formatCurrency(caStatements.balanceSheet.totalAssetsMicro)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Liabilities:</span>
                <span className="num-mono" style={{ fontWeight: 700, color: '#fbbf24' }}>
                  {formatCurrency(caStatements.balanceSheet.totalLiabilitiesMicro)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 600 }}>Net Worth (Equity):</span>
                <span className="num-mono" style={{ fontWeight: 700, color: '#38bdf8' }}>
                  {formatCurrency(caStatements.balanceSheet.netWorthMicro)}
                </span>
              </div>
            </div>
          </div>

          {/* Profit & Loss */}
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>PROFIT &amp; LOSS STATEMENT</span>
              <span className="badge badge-indigo">Cash &amp; Accrual</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gross Income:</span>
                <span className="num-mono" style={{ fontWeight: 700, color: '#34d399' }}>
                  {formatCurrency(caStatements.profitAndLoss.totalIncomeMicro)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Expenses (OpEx):</span>
                <span className="num-mono" style={{ fontWeight: 700, color: '#fb7185' }}>
                  {formatCurrency(caStatements.profitAndLoss.totalExpensesMicro)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontWeight: 600 }}>Net Surplus:</span>
                <span className="num-mono" style={{ fontWeight: 700, color: '#38bdf8' }}>
                  {formatCurrency(caStatements.profitAndLoss.netSurplusMicro)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
