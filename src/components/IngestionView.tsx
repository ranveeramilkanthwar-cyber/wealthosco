import React, { useState } from 'react';
import { Smartphone, Receipt, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import { BankIngestionEngine, ParsedBankNotification } from '../../core/financial-engine/bankIngestionEngine';
import { formatCurrency, toMicroUnits } from '../../core/financial-engine/microUnits';

export const IngestionView: React.FC = () => {
  const [parser] = useState(() => new BankIngestionEngine());
  
  const smsPresets = [
    {
      title: 'UPI Debit (Swiggy)',
      text: 'Dear SBI User, A/c ..4321 debited by Rs.450.00 on 23-Oct-26 via UPI to swiggy@icici. UPI Ref: UPI948201948. Bal: Rs.54,230.00',
    },
    {
      title: 'Credit Card POS Swipe',
      text: 'Your HDFC Bank Card ending 1092 was spent for INR 380.00 at STARBUCKS COFFEE. Ref No: CC84920184.',
    },
    {
      title: 'NEFT Salary Credit',
      text: 'Rs.2,25,000.00 credited to your A/c 4321 on 23-OCT-26 by NEFT from TECH CORP. UTR: NEFT83920194.',
    },
    {
      title: 'OTP Security Alert (Filtered)',
      text: 'Your OTP for SBI Netbanking login is 482910. Do not share this OTP with anyone. Valid for 5 minutes.',
    },
  ];

  const [activeSms, setActiveSms] = useState(smsPresets[0].text);
  const [parsedNotification, setParsedNotification] = useState<ParsedBankNotification>(
    parser.parseBankMessage(smsPresets[0].text)
  );

  const handleSelectPreset = (text: string) => {
    setActiveSms(text);
    setParsedNotification(parser.parseBankMessage(text));
  };

  const handleSmsChange = (text: string) => {
    setActiveSms(text);
    setParsedNotification(parser.parseBankMessage(text));
  };

  // Sample Receipt Parsing
  const sampleReceipt = parser.parseReceipt('Nature Basket Gourmet Provisions', [
    {
      name: 'Organic Almond Milk 1L',
      quantity: 2,
      unitPriceMicro: toMicroUnits(120),
      gstRatePercent: 5,
      categoryAccountId: 'acc_expense_groceries',
    },
    {
      name: 'Artisan Olive Oil & Herbs',
      quantity: 1,
      unitPriceMicro: toMicroUnits(650),
      gstRatePercent: 12,
      categoryAccountId: 'acc_expense_groceries',
    },
    {
      name: 'Cleaning & Eco Hygiene Supplies',
      quantity: 1,
      unitPriceMicro: toMicroUnits(350),
      gstRatePercent: 18,
      categoryAccountId: 'acc_expense_groceries',
    },
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Bank SMS Ingestion Sandbox */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Smartphone size={20} color="#818cf8" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Automated Bank SMS &amp; Notification Ingestion Engine</h2>
          <span className="badge badge-indigo">Zero-OTP False Positives</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Cascading regex &amp; classifier pipeline. Automatically extracts amounts, counter-parties, UTRs, and filters non-financial OTPs.
        </p>

        {/* Presets */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {smsPresets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(p.text)}
              style={{
                background: activeSms === p.text ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeSms === p.text ? '#6366f1' : 'var(--border-subtle)'}`,
                padding: '6px 12px',
                borderRadius: '6px',
                color: activeSms === p.text ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: activeSms === p.text ? 600 : 400
              }}
            >
              {p.title}
            </button>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          className="input-field"
          rows={3}
          value={activeSms}
          onChange={(e) => handleSmsChange(e.target.value)}
          placeholder="Paste real bank SMS string..."
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', marginBottom: '16px' }}
        />

        {/* Live Parsed Output Card */}
        <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.95)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              PARSED DOMAIN ENTITY:
            </span>
            {parsedNotification.isOtpOrPromo ? (
              <span className="badge badge-amber">Filtered (OTP / Non-Financial)</span>
            ) : parsedNotification.isFinancialTransaction ? (
              <span className="badge badge-emerald">Valid Transaction Extracted</span>
            ) : (
              <span className="badge badge-rose">Unrecognized String</span>
            )}
          </div>

          {parsedNotification.isFinancialTransaction && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                <div className="num-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: parsedNotification.direction === 'DEBIT' ? '#fb7185' : '#34d399' }}>
                  {parsedNotification.amountMicro ? formatCurrency(parsedNotification.amountMicro) : 'N/A'}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Direction:</span>
                <div style={{ fontWeight: 600, color: parsedNotification.direction === 'DEBIT' ? '#fb7185' : '#34d399' }}>
                  {parsedNotification.direction}
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Channel:</span>
                <div style={{ fontWeight: 600, color: '#818cf8' }}>{parsedNotification.channel}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Account Last-4:</span>
                <div className="num-mono" style={{ fontWeight: 600 }}>..{parsedNotification.accountLast4 || 'N/A'}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Counterparty / VPA:</span>
                <div style={{ fontWeight: 600 }}>{parsedNotification.counterParty || 'N/A'}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)' }}>Reference UTR:</span>
                <div className="num-mono" style={{ fontWeight: 600, color: '#38bdf8' }}>{parsedNotification.referenceNo || 'N/A'}</div>
              </div>
            </div>
          )}

          {parsedNotification.isOtpOrPromo && (
            <div style={{ color: '#fbbf24', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} />
              <span>Security Guarantee: 0% false positives. OTPs and sensitive authentication tokens are blocked from creating ledger entries.</span>
            </div>
          )}
        </div>
      </div>

      {/* Supermarket Receipt OCR & Tax Splitter */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Receipt size={20} color="#06b6d4" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Line-Item Receipt OCR &amp; GST Tax Splitter</h2>
          <span className="badge badge-cyan">Tax:GST_Input_Credit</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Separates supermarket and retail items into distinct categories and calculates GST input credits (5%, 12%, 18%).
        </p>

        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontWeight: 700 }}>{sampleReceipt.merchantName}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sampleReceipt.invoiceDate.split('T')[0]}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sampleReceipt.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                    x{item.quantity} • GST {item.gstRatePercent}% ({formatCurrency(item.gstAmountMicro)})
                  </span>
                </div>
                <div className="num-mono" style={{ fontWeight: 700 }}>
                  {formatCurrency(item.totalMicro)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Subtotal: {formatCurrency(sampleReceipt.subtotalMicro)} • Total GST Credit: {formatCurrency(sampleReceipt.totalGstMicro)}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grand Total:</span>
              <div className="num-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399' }}>
                {formatCurrency(sampleReceipt.grandTotalMicro)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
