// ── Template02SupplierOnly.tsx ────────────────────────────────
// Quotation Format 2: Supplier Only (no buyer).
// Changes from spec:
//   1. Supplier (From) box COMPLETELY REMOVED — info is in header
//   2. Meta column uses a proper table — no more clipping
//   3. Signature: Company Name above "Authorised Signatory", right-aligned

import { QuotationData, fmt, fmtDate, numberToWords } from '../quotationTypes';
import { InvoiceSettings, getInvoiceSettings } from '../../invoiceTemplates/invoiceSettings';
import AddressBlock from '../../invoiceTemplates/AddressBlock';
import { companyAddressLines } from '../../invoiceTemplates/invoiceTypes';

interface Props {
  data: QuotationData;
  settings?: InvoiceSettings;
}

const ACCENT       = '#1e3a8a';
const ACCENT_LIGHT = '#2563eb';

export default function Template02SupplierOnly({ data, settings: settingsProp }: Props) {
  const settings = settingsProp ?? getInvoiceSettings();
  const { supplier, items, totals } = data;

  const visibleItems = items.filter((it) => it.productName);

  return (
    <div
      className="inv-page"
      style={{
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11px',
        color: '#111',
        background: '#fff',
        padding: '28px 32px 60px',
        width: '794px',
        minHeight: '1123px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* ── Centered title ── */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '22px', fontWeight: '900', color: ACCENT, letterSpacing: '4px', textTransform: 'uppercase' }}>
          QUOTATION
        </div>
        <div style={{ height: '3px', background: ACCENT, marginTop: '6px' }} />
      </div>

      {/* ── Company header: name/address left | meta right ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', gap: '24px' }}>
        {/* Left */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: ACCENT_LIGHT, marginBottom: '3px' }}>
            {supplier.companyName}
          </div>
          <AddressBlock
            text={companyAddressLines(supplier)}
            settings={settings}
            style={{ color: '#374151', fontSize: '10.5px', lineHeight: '1.5' }}
          />
          {supplier.mobile && <div style={{ color: '#374151', fontSize: '10.5px' }}>Mobile : {supplier.mobile}</div>}
          {supplier.email  && <div style={{ color: '#374151', fontSize: '10.5px' }}>Email &nbsp; : {supplier.email}</div>}
          {supplier.gstin  && <div style={{ color: '#374151', fontSize: '10.5px' }}>GSTIN : {supplier.gstin}</div>}
        </div>

        {/* Right: table layout so values are never clipped */}
        <div style={{ flexShrink: 0 }}>
          <table style={{ borderCollapse: 'collapse', fontSize: '10.5px', color: '#374151' }}>
            <tbody>
              {([
                ['Quotation No', data.quotationNo],
                ['Date',         fmtDate(data.quotationDate)],
                ['Valid Till',   fmtDate(data.validTill)],
                ...(data.preparedBy ? [['Prepared By', data.preparedBy]] : []),
              ] as [string, string][]).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '2px 6px 2px 0', color: '#6b7280', whiteSpace: 'nowrap' }}>{k}</td>
                  <td style={{ padding: '2px 4px', color: '#374151' }}>:</td>
                  <td style={{
                    padding: '2px 0 2px 4px',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    minWidth: '130px',
                    fontFamily: k === 'Quotation No' ? 'monospace' : 'inherit',
                  }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── NO Supplier (From) box — supplier info is already in the header ── */}

      {/* ── Intro sentence ── */}
      <div style={{ fontSize: '10.5px', color: '#374151', marginBottom: '10px' }}>
        We are pleased to quote you the following items on the terms and conditions mentioned below:
      </div>

      {/* ── Product table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '10.5px' }}>
        <thead>
          <tr style={{ background: ACCENT, color: '#fff' }}>
            {[
              { label: '#',           align: 'center', width: '28px'  },
              { label: 'Product',     align: 'left'                    },
              { label: 'HSN',         align: 'center', width: '70px'  },
              { label: 'Qty',         align: 'center', width: '44px'  },
              { label: 'Unit',        align: 'center', width: '46px'  },
              { label: 'Rate (₹)',    align: 'right',  width: '80px'  },
              { label: 'Amount (₹)', align: 'right',  width: '88px'  },
            ].map((h) => (
              <th
                key={h.label}
                style={{
                  padding: '7px 8px',
                  textAlign: h.align as React.CSSProperties['textAlign'],
                  fontWeight: '700',
                  fontSize: '10px',
                  width: h.width,
                  borderRight: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleItems.map((it, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '7px 8px', textAlign: 'center', color: '#6b7280', borderRight: '1px solid #e5e7eb' }}>{i + 1}</td>
              <td style={{ padding: '7px 8px', fontWeight: '600', borderRight: '1px solid #e5e7eb' }}>{it.productName}</td>
              <td style={{ padding: '7px 8px', fontFamily: 'monospace', color: '#374151', textAlign: 'center', borderRight: '1px solid #e5e7eb', fontSize: '10px' }}>{it.hsnCode || '—'}</td>
              <td style={{ padding: '7px 8px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>{it.quantity}</td>
              <td style={{ padding: '7px 8px', textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>{it.unit}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', borderRight: '1px solid #e5e7eb' }}>{fmt(it.rate)}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.taxableAmount)}</td>
            </tr>
          ))}
          {visibleItems.length < 3 && Array.from({ length: 3 - visibleItems.length }).map((_, i) => (
            <tr key={`filler-${i}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
              {[0,1,2,3,4,5,6].map((c) => (
                <td key={c} style={{ padding: '7px 8px', borderRight: c < 6 ? '1px solid #e5e7eb' : undefined }}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals — right-aligned ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <div style={{ minWidth: '260px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px', border: '1px solid #e5e7eb' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '6px 10px', color: '#374151' }}>Sub Total</td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600' }}>₹ {totals.totalTaxable.toFixed(2)}</td>
              </tr>
              {totals.roundOff !== 0 && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '6px 10px', color: '#374151' }}>Round Off</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(totals.roundOff)}</td>
                </tr>
              )}
              <tr style={{ background: ACCENT, color: '#fff' }}>
                <td style={{ padding: '8px 10px', fontWeight: '800', fontSize: '12px' }}>Grand Total</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '800', fontSize: '13px' }}>
                  ₹ {totals.grandTotal.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Amount in Words ── */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '8px 12px', marginBottom: '14px', fontSize: '10.5px' }}>
        <span style={{ fontWeight: '700' }}>Amount in Words: </span>
        <span style={{ color: '#374151' }}>{numberToWords(totals.grandTotal)}</span>
      </div>

      {/* ── Terms & Conditions — always printed ── */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '10px 14px', marginBottom: '20px' }}>
        <div style={{ fontWeight: '700', color: ACCENT_LIGHT, fontSize: '10px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Terms &amp; Conditions
        </div>
        <ul style={{ margin: 0, paddingLeft: '14px', color: '#374151', fontSize: '10px', lineHeight: '1.8' }}>
          {(data.termsAndConditions || '')
            .split('\n')
            .filter((l) => l.trim())
            .map((line, i) => (
              <li key={i}>{line.replace(/^[-•*]\s*/, '')}</li>
            ))}
        </ul>
        {data.notes && (
          <div style={{ marginTop: '8px', fontSize: '10px', color: '#374151' }}>
            <span style={{ fontWeight: '700' }}>Notes: </span>{data.notes}
          </div>
        )}
      </div>

      {/* ── Signature — Company Name above "Authorised Signatory", right-aligned ── */}
      {settings.showSignature && (
        <div style={{ textAlign: 'right', marginTop: '16px', marginBottom: '24px' }}>
          <div style={{ fontWeight: '800', fontSize: '12px', color: ACCENT_LIGHT }}>
            {supplier.companyName}
          </div>
          <div style={{ height: '44px' }} />
          <div style={{ display: 'inline-block', borderTop: '1px solid #374151', paddingTop: '4px', minWidth: '160px', fontSize: '10px', color: '#374151', textAlign: 'center' }}>
            Authorised Signatory
          </div>
        </div>
      )}

      {/* ── Footer bar ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: ACCENT,
          color: '#fff',
          textAlign: 'center',
          padding: '10px',
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.5px',
        }}
      >
        Thank you for your business!
      </div>
    </div>
  );
}