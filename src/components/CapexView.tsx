import React, { useState } from 'react';
import { Laptop, Calendar, ShieldCheck, Play, Plus, X } from 'lucide-react';
import { FixedAsset } from '../../core/financial-engine/capexEngine';
import { formatCurrency, fromMicroUnits, toMicroUnits } from '../../core/financial-engine/microUnits';

interface CapexViewProps {
  assets: FixedAsset[];
  onStepDepreciation: (assetId: string) => void;
  onRegisterAsset: (params: {
    name: string;
    amountMicro: bigint;
    usefulLifeMonths: number;
    salvageValueMicro: bigint;
    warrantyExpiryDate?: string;
  }) => void;
}

export const CapexView: React.FC<CapexViewProps> = ({
  assets,
  onStepDepreciation,
  onRegisterAsset,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [usefulMonths, setUsefulMonths] = useState('36');
  const [salvageStr, setSalvageStr] = useState('');
  const [warrantyDate, setWarrantyDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountStr);
    if (!name.trim() || isNaN(amt) || amt <= 0) return;

    const salvage = parseFloat(salvageStr) || 0;
    const months = parseInt(usefulMonths, 10) || 36;

    onRegisterAsset({
      name: name.trim(),
      amountMicro: toMicroUnits(amt),
      usefulLifeMonths: months,
      salvageValueMicro: toMicroUnits(salvage),
      warrantyExpiryDate: warrantyDate || undefined,
    });

    setName('');
    setAmountStr('');
    setSalvageStr('');
    setWarrantyDate('');
    setShowAddModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Register Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Laptop size={20} color="#06b6d4" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>CapEx Capitalization &amp; Fixed Asset Registry</h2>
            <span className="badge badge-cyan">&gt; ₹20,000 Threshold</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            High-value hardware &amp; equipment are capitalized on the balance sheet and depreciated across useful life.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '6px' }}
        >
          <Plus size={15} />
          <span>Register New CapEx Asset</span>
        </button>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '24px', background: '#0e1524' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Register Fixed Asset (CapEx)</h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Asset Name:</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. MacBook Pro M4 or Workstation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cost (₹):</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 150000"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Salvage Value (₹):</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g. 15000"
                    value={salvageStr}
                    onChange={(e) => setSalvageStr(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Useful Life (Months):</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="36"
                    value={usefulMonths}
                    onChange={(e) => setUsefulMonths(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Warranty Expiry Date:</label>
                  <input
                    type="date"
                    className="input-field"
                    value={warrantyDate}
                    onChange={(e) => setWarrantyDate(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', justifyContent: 'center' }}>
                Capitalize Asset &amp; Generate Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Empty State or Assets Grid */}
      {assets.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Laptop size={36} color="#06b6d4" style={{ margin: '0 auto 12px auto', opacity: 0.7 }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>No CapEx Fixed Assets Registered</h3>
          <p style={{ fontSize: '0.8rem', maxWidth: '400px', margin: '6px auto 16px auto' }}>
            Purchased a high-value laptop, machine, phone, or furniture? Capitalize it here to avoid a single-month lifestyle OpEx shock.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.8rem' }}
          >
            <Plus size={14} />
            <span>Register Your First Asset</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {assets.map((asset) => {
            const costNum = fromMicroUnits(asset.initial_cost_micro);
            const bookNum = fromMicroUnits(asset.current_book_value_micro);
            const depPercent = costNum > 0 ? ((costNum - bookNum) / costNum) * 100 : 0;

            return (
              <div key={asset.id} className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{asset.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>Purchased: {asset.purchase_date}</span>
                      <span>•</span>
                      <span>{asset.useful_life_months} Months Useful Life</span>
                    </div>
                  </div>
                  <span className="badge badge-cyan">{asset.depreciation_method}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Capitalized Cost:</span>
                    <div className="num-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {formatCurrency(asset.initial_cost_micro)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Current Book Value:</span>
                    <div className="num-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
                      {formatCurrency(asset.current_book_value_micro)}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amortization Progress:</span>
                    <span className="num-mono" style={{ fontWeight: 600, color: '#06b6d4' }}>
                      Month {asset.months_depreciated} of {asset.useful_life_months} ({depPercent.toFixed(1)}%)
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, depPercent)}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #06b6d4, #6366f1)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#34d399' }}>
                    <ShieldCheck size={14} />
                    <span>{asset.warranty_expiry_date ? `Warranty: ${asset.warranty_expiry_date}` : 'Asset Active'}</span>
                  </div>

                  <button
                    onClick={() => onStepDepreciation(asset.id)}
                    disabled={asset.months_depreciated >= asset.useful_life_months}
                    className="btn-primary"
                    style={{
                      fontSize: '0.75rem',
                      padding: '8px 14px',
                      gap: '6px',
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)'
                    }}
                  >
                    <Play size={13} />
                    <span>Post Month {asset.months_depreciated + 1} Depreciation</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
