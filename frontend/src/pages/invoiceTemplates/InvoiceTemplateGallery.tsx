// ── InvoiceTemplateGallery.tsx ────────────────────────────────
// Displays 10 professional invoice designs as real mini A4 previews.
// User selects a template and it persists in localStorage.

import { useState } from 'react';
import { Check, X, Palette } from 'lucide-react';
import {
  TEMPLATES,
  TemplateId,
  InvoiceType,
  getSelectedTemplate,
  setSelectedTemplate,
  getTemplateInfo,
} from './invoiceTemplateManager';
import { InvoiceData } from './invoiceTypes';
import InvoiceRenderer from './InvoiceRenderer';

// ── Demo data for preview ─────────────────────────────────────
const DEMO_DATA: InvoiceData = {
  invoiceNo: 'INV-2024-001',
  invoiceDate: new Date().toISOString(),
  invoiceLabel: 'Tax Invoice',
  company: {
    companyName: 'Inventra Solutions Pvt Ltd',
    gstin: '33AABCI1234F1Z5',
    addressLine1: '42, Tech Park, Anna Salai',
    addressLine2: 'Guindy Industrial Estate',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600032',
    mobile: '9876543210',
    email: 'info@inventra.in',
  },
  partyName: 'Sunrise Trading Co.',
  partyGstin: '33BBBCS5678G1Z9',
  partyAddress: '12, Gandhi Nagar, Coimbatore - 641001',
  partyLabel: 'Bill To',
  items: [
    { materialName: 'Steel Pipes (20mm)', hsnCode: '7306', quantity: 100, unitPrice: 850, gstPercent: 18, taxableAmount: 85000, gstAmount: 15300, itemTotal: 100300 },
    { materialName: 'Copper Fittings', hsnCode: '7412', quantity: 50, unitPrice: 320, gstPercent: 18, taxableAmount: 16000, gstAmount: 2880, itemTotal: 18880 },
    { materialName: 'PVC Conduit', hsnCode: '3917', quantity: 200, unitPrice: 45, gstPercent: 12, taxableAmount: 9000, gstAmount: 1080, itemTotal: 10080 },
  ],
  totalTaxable: 110000,
  totalGst: 19260,
  cgstAmount: 9630,
  sgstAmount: 9630,
  igstAmount: 0,
  grandTotal: 129260,
  isInterState: false,
  paymentReceived: 50000,
  amountInWords: 'One Lakh Twenty Nine Thousand Two Hundred Sixty Rupees Only',
  bankName: 'State Bank of India',
  accountName: 'Inventra Solutions Pvt Ltd',
  accountNumber: '39847263819200',
  ifscCode: 'SBIN0001234',
  termsAndConditions: 'Payment due within 30 days. Goods once sold cannot be returned.',
  notes: 'Thank you for your business!',
};

interface Props {
  type: InvoiceType;
  onClose?: () => void;
  onSelect?: (id: TemplateId) => void;
}

export default function InvoiceTemplateGallery({ type, onClose, onSelect }: Props) {
  const [selected, setSelected] = useState<TemplateId>(() => getSelectedTemplate(type));
  const [hovered, setHovered] = useState<TemplateId | null>(null);
  const [preview, setPreview] = useState<TemplateId | null>(null);

  const handleSelect = (id: TemplateId) => {
    setSelected(id);
    setSelectedTemplate(type, id);
    onSelect?.(id);
  };

  const handleConfirm = () => {
    setSelectedTemplate(type, selected);
    onClose?.();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <div style={{ background: '#1e293b', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Palette size={20} color="#fbbf24" />
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px' }}>Choose Invoice Design</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {type === 'sales' ? 'Sales' : 'Purchase'} Invoice Template · Currently: {getTemplateInfo(selected).name}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleConfirm}
            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={15} /> Apply Template
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: '#374151', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Gallery Grid ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {TEMPLATES.map((tmpl) => {
            const isSelected = selected === tmpl.id;
            const isHovered = hovered === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onMouseEnter={() => setHovered(tmpl.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  border: isSelected ? `3px solid ${tmpl.accentColor}` : '3px solid transparent',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 0 2px ${tmpl.accentColor}40, 0 8px 24px rgba(0,0,0,0.3)` : isHovered ? '0 8px 24px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
                  transform: isHovered && !isSelected ? 'translateY(-2px)' : 'none',
                  background: '#fff',
                  position: 'relative',
                }}
                onClick={() => handleSelect(tmpl.id)}
              >
                {/* Selected badge */}
                {isSelected && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, background: tmpl.accentColor, color: '#fff', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    <Check size={16} />
                  </div>
                )}

                {/* Template number badge */}
                <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '6px', padding: '2px 7px', fontSize: '10px', fontWeight: '700' }}>
                  #{String(tmpl.id).padStart(2, '0')}
                </div>

                {/* ── Miniature A4 Preview ── */}
                <div style={{ width: '100%', height: '200px', overflow: 'hidden', position: 'relative', background: '#f1f5f9' }}>
                  <div style={{ transformOrigin: 'top left', transform: 'scale(0.335)', width: '794px', pointerEvents: 'none', userSelect: 'none' }}>
                    <InvoiceRenderer templateId={tmpl.id} data={DEMO_DATA} />
                  </div>
                </div>

                {/* ── Template Info ── */}
                <div style={{ padding: '12px 14px', background: '#fff', borderTop: `3px solid ${isSelected ? tmpl.accentColor : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: isSelected ? tmpl.accentColor : '#1e293b' }}>{tmpl.name}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>{tmpl.description}</div>
                    </div>
                    <div style={{ flexShrink: 0, width: '14px', height: '14px', borderRadius: '50%', background: tmpl.accentColor, marginTop: '3px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {tmpl.tags.map((tag) => (
                      <span key={tag} style={{ fontSize: '9px', padding: '2px 7px', background: isSelected ? `${tmpl.accentColor}18` : '#f1f5f9', color: isSelected ? tmpl.accentColor : '#64748b', borderRadius: '20px', fontWeight: '600', border: `1px solid ${isSelected ? `${tmpl.accentColor}40` : '#e2e8f0'}` }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreview(tmpl.id); }}
                      style={{ flex: 1, padding: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: '#374151', fontWeight: '600' }}
                    >
                      Preview
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelect(tmpl.id); }}
                      style={{ flex: 1, padding: '6px', background: isSelected ? tmpl.accentColor : '#1e293b', border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', color: '#fff', fontWeight: '700' }}
                    >
                      {isSelected ? '✓ Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Full Preview Modal ── */}
      {preview !== null && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}
          onClick={() => setPreview(null)}
        >
          <div style={{ background: '#1e293b', color: '#fff', padding: '10px 20px', borderRadius: '10px', marginBottom: '16px', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ fontWeight: '700' }}>{getTemplateInfo(preview).name} — Full Preview</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleSelect(preview); setPreview(null); }}
              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
            >
              Use This Template
            </button>
            <button onClick={() => setPreview(null)} style={{ background: '#374151', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>
              Close
            </button>
          </div>
          <div
            style={{ overflow: 'auto', maxHeight: 'calc(100vh - 120px)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', borderRadius: '4px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <InvoiceRenderer templateId={preview} data={DEMO_DATA} />
          </div>
        </div>
      )}
    </div>
  );
}