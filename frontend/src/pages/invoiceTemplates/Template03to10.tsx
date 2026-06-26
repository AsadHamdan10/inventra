// ── Templates 03–10 ───────────────────────────────────────────
// Each exported as a named component.
// All support multi-page A4 printing with repeated headers and
// last-page-only footer content.

import { InvoiceData, InvoiceItem, fmt, fmtDate, companyAddressLines } from './invoiceTypes';
import { paginateItems, PRINT_CSS } from './invoicePagination';
import { InvoiceSettings, getInvoiceSettings } from './invoiceSettings';
import AddressBlock from './AddressBlock';
import NotesTermsBlock from './NotesTermsBlock';

// ── Shared helpers ────────────────────────────────────────────

/** Reusable page-numbering footer */
function PageNum({ pageNum, totalPages, isLast, style }: {
  pageNum: number; totalPages: number; isLast: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', ...style }}>
      <span>Page {pageNum} of {totalPages}</span>
      {isLast
        ? <span>This is a computer-generated invoice.</span>
        : <span style={{ fontStyle: 'italic' }}>Continued on next page…</span>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TEMPLATE 03 — Corporate Premium
// ══════════════════════════════════════════════════════════════
export function Template03Corporate({ data, settings: settingsProp }: { data: InvoiceData; settings?: InvoiceSettings }) {
  const settings = settingsProp ?? getInvoiceSettings();
  const isIGST = data.isInterState;
  const balance = (data.grandTotal ?? 0) - (data.paymentReceived ?? 0);
  const ACCENT = '#7c3aed';
  const pages = paginateItems(data.items, 'corporate');
  const totalPages = pages.length;
  let globalIndex = 0;

  function Header() {
    return (
      <>
        <div style={{ background: '#1a1a2e', color: '#fff', padding: '22px 30px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase' }}>{data.company.companyName}</div>
              <AddressBlock text={companyAddressLines(data.company)} settings={settings} style={{ color: '#c084fc', marginTop: '4px', fontSize: '10px' }} />
              {data.company.gstin && <div style={{ color: '#e9d5ff', fontFamily: 'monospace', fontSize: '10px', marginTop: '2px' }}>GSTIN: {data.company.gstin}</div>}
            </div>
            <div style={{ textAlign: 'right', background: ACCENT, padding: '12px 16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.8 }}>{data.invoiceLabel ?? 'Tax Invoice'}</div>
              <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'monospace', marginTop: '2px' }}>{data.invoiceNo}</div>
              <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.8 }}>{fmtDate(data.invoiceDate)}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', padding: '14px 30px 0', marginBottom: '14px' }}>
          <div style={{ flex: 1, border: `2px solid ${ACCENT}`, borderRadius: '8px', padding: '12px' }}>
            <div style={{ color: ACCENT, fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>{data.partyLabel ?? 'Bill To'}</div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>{data.partyName}</div>
            <AddressBlock text={data.partyAddress} settings={settings} style={{ color: '#374151', fontSize: '10px', marginTop: '2px' }} />
            {(data.deliveryAddress && data.deliveryAddress !== data.partyAddress) && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Ship To: </span>
                <AddressBlock text={data.deliveryAddress} settings={settings} style={{ color: '#374151', fontSize: '10px', marginTop: '2px' }} />
              </div>
            )}
            {data.partyGstin && <div style={{ color: ACCENT, fontFamily: 'monospace', fontSize: '10px', marginTop: '3px' }}>GSTIN: {data.partyGstin}</div>}
          </div>
          <div style={{ minWidth: '190px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#faf5ff' }}>
            {[['Invoice No', data.invoiceNo], ['Date', fmtDate(data.invoiceDate)], ...(data.dueDate ? [['Due Date', fmtDate(data.dueDate)]] : []), ...(data.poNo ? [['PO No', data.poNo]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px' }}>
                <span style={{ color: '#6b7280' }}>{k}</span><span style={{ fontWeight: '700' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function THead() {
    return (
      <thead>
        <tr style={{ background: ACCENT, color: '#fff' }}>
          {['#', 'Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST%', 'GST', 'Total'].map(h => (
            <th key={h} style={{ padding: '6px 5px', textAlign: ['#', 'Qty', 'GST%'].includes(h) ? 'center' : ['Rate', 'Taxable', 'GST', 'Total'].includes(h) ? 'right' : 'left', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
    );
  }

  function Rows({ items, si }: { items: InvoiceItem[]; si: number }) {
    return (
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #ede9fe', background: (si + i) % 2 ? '#faf5ff' : '#fff' }}>
            <td style={{ padding: '5px', textAlign: 'center', color: '#9ca3af' }}>{si + i + 1}</td>
            <td style={{ padding: '5px', fontWeight: '600' }}>{it.materialName}</td>
            <td style={{ padding: '5px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px', color: '#6b7280' }}>{it.hsnCode || '—'}</td>
            <td style={{ padding: '5px', textAlign: 'center' }}>{it.quantity}</td>
            <td style={{ padding: '5px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
            <td style={{ padding: '5px', textAlign: 'right' }}>{fmt(it.taxableAmount)}</td>
            <td style={{ padding: '5px', textAlign: 'center' }}>{it.gstPercent}%</td>
            <td style={{ padding: '5px', textAlign: 'right', color: ACCENT }}>{fmt(it.gstAmount)}</td>
            <td style={{ padding: '5px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.itemTotal)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  function Footer() {
    return (
      <div style={{ padding: '0 30px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
          <div style={{ minWidth: '260px' }}>
            {[['Taxable Amount', fmt(data.totalTaxable)], isIGST && ['IGST', fmt(data.igstAmount)], !isIGST && ['CGST', fmt(data.cgstAmount)], !isIGST && ['SGST', fmt(data.sgstAmount)]].filter(Boolean).map((r: any, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #ede9fe', fontSize: '11px' }}>
                <span style={{ color: '#6b7280' }}>{r[0]}</span><span>{r[1]}</span>
              </div>
            ))}
            <div style={{ background: ACCENT, color: '#fff', padding: '10px 14px', borderRadius: '6px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700' }}>TOTAL</span><span style={{ fontSize: '18px', fontWeight: '800' }}>{fmt(data.grandTotal)}</span>
            </div>
            {settings.showPaymentStatus && (data.paymentReceived ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '10px' }}>
                <span style={{ color: balance > 0 ? '#dc2626' : '#16a34a', fontWeight: '700' }}>Balance Due</span>
                <span style={{ color: balance > 0 ? '#dc2626' : '#16a34a', fontWeight: '700' }}>{fmt(balance)}</span>
              </div>
            )}
          </div>
        </div>
        {data.amountInWords && <div style={{ background: '#faf5ff', border: '1px solid #ede9fe', padding: '6px 12px', borderRadius: '6px', fontSize: '10px', marginBottom: '14px' }}><span style={{ color: ACCENT, fontWeight: '700' }}>In Words: </span>{data.amountInWords}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {settings.showBankDetails && data.bankName && (
            <div style={{ fontSize: '10px', border: '1px solid #ede9fe', borderRadius: '8px', padding: '10px 14px', background: '#faf5ff' }}>
              <div style={{ fontWeight: '700', color: ACCENT, marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase' }}>Bank Details</div>
              {[['Bank', data.bankName], ['A/c Name', data.accountName], ['A/c No', data.accountNumber], ['IFSC', data.ifscCode]].filter(([, v]) => v).map(([k, v]) => <div key={k}><span style={{ color: '#6b7280' }}>{k}: </span><b>{v}</b></div>)}
            </div>
          )}
          {settings.showSignature && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '50px', borderBottom: `2px solid ${ACCENT}`, width: '160px' }} />
            <div style={{ paddingTop: '4px', color: '#6b7280', fontSize: '10px' }}>Authorised Signatory</div>
            <div style={{ fontWeight: '700' }}>{data.company.companyName}</div>
          </div>
          )}
        <NotesTermsBlock data={data} settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {pages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === totalPages - 1;
        const si = globalIndex;
        globalIndex += pageItems.length;
        return (
          <div key={pageIdx} className="inv-page" style={{ fontFamily: 'Georgia, serif', fontSize: '11px', color: '#1a1a2e', background: '#fff', width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}>
            <Header />
            <div style={{ padding: '0 30px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '10px' }}>
                <THead /><Rows items={pageItems} si={si} />
              </table>
            </div>
            {isLast && <Footer />}
            <div style={{ margin: '12px 30px 0', borderTop: `2px solid ${ACCENT}`, paddingTop: '6px' }}>
              <PageNum pageNum={pageIdx + 1} totalPages={totalPages} isLast={isLast} style={{ color: '#6b7280' }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TEMPLATE 04 — Minimal White
// ══════════════════════════════════════════════════════════════
export function Template04Minimal({ data, settings: settingsProp }: { data: InvoiceData; settings?: InvoiceSettings }) {
  const settings = settingsProp ?? getInvoiceSettings();
  const isIGST = data.isInterState;
  const pages = paginateItems(data.items, 'minimal');
  const totalPages = pages.length;
  let globalIndex = 0;

  function Header() {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #000', paddingBottom: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>{data.company.companyName}</div>
            <AddressBlock text={companyAddressLines(data.company)} settings={settings} style={{ marginTop: '3px', fontSize: '10px', color: '#444' }} />
            {data.company.gstin && <div style={{ fontFamily: 'monospace', fontSize: '10px', marginTop: '2px' }}>GSTIN: {data.company.gstin}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px' }}>{data.invoiceLabel ?? 'Invoice'}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '700', marginTop: '3px' }}>{data.invoiceNo}</div>
            <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>{fmtDate(data.invoiceDate)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '14px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#666', marginBottom: '3px' }}>{data.partyLabel ?? 'Bill To'}</div>
            <div style={{ fontWeight: '700', fontSize: '13px' }}>{data.partyName}</div>
            <AddressBlock text={data.partyAddress} settings={settings} style={{ fontSize: '10px', color: '#444', marginTop: '2px' }} />
            {(data.deliveryAddress && data.deliveryAddress !== data.partyAddress) && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Ship To: </span>
                <AddressBlock text={data.deliveryAddress} settings={settings} style={{ fontSize: '10px', color: '#444', marginTop: '2px' }} />
              </div>
            )}
            {data.partyGstin && <div style={{ fontFamily: 'monospace', fontSize: '10px', marginTop: '2px' }}>GSTIN: {data.partyGstin}</div>}
          </div>
          <div>
            {[['Invoice No', data.invoiceNo], ['Date', fmtDate(data.invoiceDate)], ...(data.dueDate ? [['Due', fmtDate(data.dueDate)]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '12px', marginBottom: '3px', fontSize: '10px' }}>
                <span style={{ color: '#666', width: '70px' }}>{k}</span><span style={{ fontWeight: '700' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function THead() {
    return (
      <thead>
        <tr style={{ borderBottom: '2px solid #000' }}>
          {['#', 'Description', 'HSN', 'Qty', 'Rate', 'GST%', 'GST', 'Total'].map(h => (
            <th key={h} style={{ padding: '5px 4px', textAlign: ['#', 'Qty', 'GST%'].includes(h) ? 'center' : ['Rate', 'GST', 'Total'].includes(h) ? 'right' : 'left', fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
          ))}
        </tr>
      </thead>
    );
  }

  function Rows({ items, si }: { items: InvoiceItem[]; si: number }) {
    return (
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '5px 4px', textAlign: 'center', color: '#999' }}>{si + i + 1}</td>
            <td style={{ padding: '5px 4px', fontWeight: '600' }}>{it.materialName}</td>
            <td style={{ padding: '5px 4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px', color: '#666' }}>{it.hsnCode || '—'}</td>
            <td style={{ padding: '5px 4px', textAlign: 'center' }}>{it.quantity}</td>
            <td style={{ padding: '5px 4px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
            <td style={{ padding: '5px 4px', textAlign: 'center' }}>{it.gstPercent}%</td>
            <td style={{ padding: '5px 4px', textAlign: 'right' }}>{fmt(it.gstAmount)}</td>
            <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.itemTotal)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  function Footer() {
    return (
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
          <div style={{ minWidth: '220px' }}>
            {[['Taxable', fmt(data.totalTaxable)], isIGST && ['IGST', fmt(data.igstAmount)], !isIGST && ['CGST', fmt(data.cgstAmount)], !isIGST && ['SGST', fmt(data.sgstAmount)]].filter(Boolean).map((r: any, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #eee', fontSize: '10px' }}>
                <span style={{ color: '#666' }}>{r[0]}</span><span>{r[1]}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '3px solid #000', marginTop: '3px' }}>
              <span style={{ fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total</span>
              <span style={{ fontWeight: '900', fontSize: '15px' }}>{fmt(data.grandTotal)}</span>
            </div>
          </div>
        </div>
        {data.amountInWords && <div style={{ fontSize: '10px', borderTop: '1px solid #ddd', paddingTop: '5px', marginBottom: '10px' }}><span style={{ color: '#666' }}>In Words: </span>{data.amountInWords}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {settings.showBankDetails && data.bankName && <div style={{ fontSize: '10px' }}>
            <div style={{ fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', color: '#666' }}>Bank Details</div>
            {[['Bank', data.bankName], ['A/c No', data.accountNumber], ['IFSC', data.ifscCode]].filter(([, v]) => v).map(([k, v]) => <div key={k}><span style={{ color: '#666' }}>{k}: </span><b>{v}</b></div>)}
          </div>}
          {settings.showSignature && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '40px', borderBottom: '2px solid #000', width: '140px' }} />
            <div style={{ paddingTop: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Authorised Signatory</div>
            <div style={{ fontWeight: '700' }}>{data.company.companyName}</div>
          </div>
          )}
        <NotesTermsBlock data={data} settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {pages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === totalPages - 1;
        const si = globalIndex;
        globalIndex += pageItems.length;
        return (
          <div key={pageIdx} className="inv-page" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '11px', color: '#000', background: '#fff', padding: '30px', width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}>
            <Header />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '10px' }}>
              <THead /><Rows items={pageItems} si={si} />
            </table>
            {isLast && <Footer />}
            <div style={{ borderTop: '1px solid #ccc', marginTop: '12px', paddingTop: '5px' }}>
              <PageNum pageNum={pageIdx + 1} totalPages={totalPages} isLast={isLast} style={{ color: '#666' }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TEMPLATE 05 — Premium Gradient
// ══════════════════════════════════════════════════════════════
export function Template05Gradient({ data, settings: settingsProp }: { data: InvoiceData; settings?: InvoiceSettings }) {
  const settings = settingsProp ?? getInvoiceSettings();
  const isIGST = data.isInterState;
  const ACCENT = '#7c3aed';
  const pages = paginateItems(data.items, 'gradient');
  const totalPages = pages.length;
  let globalIndex = 0;

  function Header() {
    return (
      <>
        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)', padding: '24px 28px 18px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '800' }}>{data.company.companyName}</div>
              <AddressBlock text={companyAddressLines(data.company)} settings={settings} style={{ opacity: 0.8, fontSize: '10px', marginTop: '3px' }} />
              {data.company.gstin && <div style={{ background: 'rgba(255,255,255,0.15)', display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontFamily: 'monospace', fontSize: '10px', marginTop: '4px' }}>GSTIN: {data.company.gstin}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', letterSpacing: '3px', opacity: 0.8, textTransform: 'uppercase' }}>{data.invoiceLabel ?? 'Tax Invoice'}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'monospace' }}>{data.invoiceNo}</div>
              <div style={{ opacity: 0.8, fontSize: '11px' }}>{fmtDate(data.invoiceDate)}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '14px', padding: '14px 28px 0', marginBottom: '14px' }}>
          <div style={{ flex: 1, background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: '8px', padding: '12px', border: '1px solid #c4b5fd' }}>
            <div style={{ color: ACCENT, fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>{data.partyLabel ?? 'Bill To'}</div>
            <div style={{ fontSize: '13px', fontWeight: '700' }}>{data.partyName}</div>
            <AddressBlock text={data.partyAddress} settings={settings} style={{ fontSize: '10px', color: '#555', marginTop: '2px' }} />
            {(data.deliveryAddress && data.deliveryAddress !== data.partyAddress) && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Ship To: </span>
                <AddressBlock text={data.deliveryAddress} settings={settings} style={{ fontSize: '10px', color: '#555', marginTop: '2px' }} />
              </div>
            )}
            {data.partyGstin && <div style={{ fontFamily: 'monospace', color: '#6d28d9', fontSize: '10px', marginTop: '3px' }}>GSTIN: {data.partyGstin}</div>}
          </div>
          <div style={{ minWidth: '190px', borderRadius: '8px', padding: '12px', background: '#faf5ff', border: '1px solid #ede9fe' }}>
            {[['Invoice No', data.invoiceNo], ['Date', fmtDate(data.invoiceDate)], ...(data.dueDate ? [['Due', fmtDate(data.dueDate)]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '3px' }}>
                <span style={{ color: ACCENT }}>{k}</span><span style={{ fontWeight: '700' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function THead() {
    return (
      <thead>
        <tr style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', color: '#fff' }}>
          {['#', 'Item', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST%', 'GST', 'Total'].map(h => (
            <th key={h} style={{ padding: '6px 5px', textAlign: ['#', 'Qty', 'GST%'].includes(h) ? 'center' : ['Rate', 'Taxable', 'GST', 'Total'].includes(h) ? 'right' : 'left', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
    );
  }

  function Rows({ items, si }: { items: InvoiceItem[]; si: number }) {
    return (
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #ede9fe', background: (si + i) % 2 ? '#faf5ff' : '#fff' }}>
            <td style={{ padding: '5px', textAlign: 'center', color: '#a78bfa' }}>{si + i + 1}</td>
            <td style={{ padding: '5px', fontWeight: '600' }}>{it.materialName}</td>
            <td style={{ padding: '5px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px', color: '#6b7280' }}>{it.hsnCode || '—'}</td>
            <td style={{ padding: '5px', textAlign: 'center' }}>{it.quantity}</td>
            <td style={{ padding: '5px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
            <td style={{ padding: '5px', textAlign: 'right' }}>{fmt(it.taxableAmount)}</td>
            <td style={{ padding: '5px', textAlign: 'center' }}>{it.gstPercent}%</td>
            <td style={{ padding: '5px', textAlign: 'right', color: ACCENT }}>{fmt(it.gstAmount)}</td>
            <td style={{ padding: '5px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.itemTotal)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  function Footer() {
    return (
      <div style={{ padding: '0 28px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
          <div style={{ minWidth: '260px' }}>
            {[['Taxable', fmt(data.totalTaxable)], isIGST && ['IGST', fmt(data.igstAmount)], !isIGST && ['CGST', fmt(data.cgstAmount)], !isIGST && ['SGST', fmt(data.sgstAmount)]].filter(Boolean).map((r: any, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #ede9fe', fontSize: '11px' }}>
                <span style={{ color: ACCENT }}>{r[0]}</span><span>{r[1]}</span>
              </div>
            ))}
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', padding: '12px 14px', borderRadius: '8px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', fontSize: '12px' }}>GRAND TOTAL</span>
              <span style={{ fontWeight: '800', fontSize: '20px' }}>{fmt(data.grandTotal)}</span>
            </div>
          </div>
        </div>
        {data.amountInWords && <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', padding: '6px 12px', borderRadius: '8px', fontSize: '10px', marginBottom: '12px' }}><span style={{ color: ACCENT, fontWeight: '700' }}>In Words: </span>{data.amountInWords}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {settings.showBankDetails && data.bankName && <div style={{ fontSize: '10px', border: '1px solid #ede9fe', padding: '10px 14px', borderRadius: '8px', background: '#faf5ff' }}>
            <div style={{ fontWeight: '700', color: ACCENT, marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase' }}>Bank Details</div>
            {[['Bank', data.bankName], ['A/c No', data.accountNumber], ['IFSC', data.ifscCode]].filter(([, v]) => v).map(([k, v]) => <div key={k}><span style={{ color: '#6b7280' }}>{k}: </span><b>{v}</b></div>)}
          </div>}
          {settings.showSignature && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '50px', borderBottom: '2px solid #7c3aed', width: '150px' }} />
            <div style={{ paddingTop: '4px', color: '#6b7280', fontSize: '10px' }}>Authorised Signatory</div>
            <div style={{ fontWeight: '700', color: '#6366f1' }}>{data.company.companyName}</div>
          </div>
          )}
        <NotesTermsBlock data={data} settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {pages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === totalPages - 1;
        const si = globalIndex;
        globalIndex += pageItems.length;
        return (
          <div key={pageIdx} className="inv-page" style={{ fontFamily: "'Segoe UI', sans-serif", fontSize: '11px', color: '#1e1b4b', background: '#fff', width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}>
            <Header />
            <div style={{ padding: '0 28px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '10px' }}>
                <THead /><Rows items={pageItems} si={si} />
              </table>
            </div>
            {isLast && <Footer />}
            <div style={{ margin: '10px 28px 0', borderTop: '1px solid #ede9fe', paddingTop: '5px' }}>
              <PageNum pageNum={pageIdx + 1} totalPages={totalPages} isLast={isLast} style={{ color: '#6b7280' }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TEMPLATE 06 — Retail Style (Vyapar Inspired)
// ══════════════════════════════════════════════════════════════
export function Template06Retail({ data, settings: settingsProp }: { data: InvoiceData; settings?: InvoiceSettings }) {
  const settings = settingsProp ?? getInvoiceSettings();
  const isIGST = data.isInterState;
  const balance = (data.grandTotal ?? 0) - (data.paymentReceived ?? 0);
  const ACCENT = '#16a34a';
  const pages = paginateItems(data.items, 'retail');
  const totalPages = pages.length;
  let globalIndex = 0;

  function Header() {
    return (
      <>
        <div style={{ background: ACCENT, color: '#fff', padding: '8px 12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>{data.company.companyName}</div>
            <AddressBlock text={companyAddressLines(data.company)} settings={settings} style={{ fontSize: '9px', opacity: 0.9, marginTop: '1px' }} />
            {data.company.gstin && <div style={{ fontSize: '9px', fontFamily: 'monospace', opacity: 0.9 }}>GSTIN: {data.company.gstin}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px' }}>{data.invoiceLabel ?? 'TAX INVOICE'}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '700' }}>{data.invoiceNo}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '10px' }}>
          <div style={{ flex: 1, border: `1px solid ${ACCENT}`, borderRadius: '4px', padding: '7px' }}>
            <div style={{ color: ACCENT, fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', marginBottom: '2px' }}>{data.partyLabel ?? 'Bill To'}</div>
            <div style={{ fontWeight: '700', fontSize: '12px' }}>{data.partyName}</div>
            <AddressBlock text={data.partyAddress} settings={settings} style={{ color: '#374151', marginTop: '1px', fontSize: '9px' }} />
            {(data.deliveryAddress && data.deliveryAddress !== data.partyAddress) && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Ship To: </span>
                <AddressBlock text={data.deliveryAddress} settings={settings} style={{ color: '#374151', marginTop: '1px', fontSize: '9px' }} />
              </div>
            )}
            {data.partyGstin && <div style={{ fontFamily: 'monospace', color: '#374151', marginTop: '2px', fontSize: '9px' }}>GSTIN: {data.partyGstin}</div>}
          </div>
          <div style={{ minWidth: '170px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '7px' }}>
            {[['Invoice No', data.invoiceNo], ['Date', fmtDate(data.invoiceDate)], ...(data.dueDate ? [['Due', fmtDate(data.dueDate)]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', fontSize: '9px' }}>
                <span style={{ color: '#6b7280' }}>{k}</span><span style={{ fontWeight: '700' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function THead() {
    return (
      <thead>
        <tr style={{ background: '#166534', color: '#fff' }}>
          {['#', 'Item', 'HSN', 'Qty', 'Rate', 'GST%', 'GST', 'Total'].map(h => (
            <th key={h} style={{ padding: '5px 4px', textAlign: ['#', 'Qty', 'GST%'].includes(h) ? 'center' : ['Rate', 'GST', 'Total'].includes(h) ? 'right' : 'left', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
    );
  }

  function Rows({ items, si }: { items: InvoiceItem[]; si: number }) {
    return (
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #d1fae5', background: (si + i) % 2 ? '#f0fdf4' : '#fff' }}>
            <td style={{ padding: '4px', textAlign: 'center', color: '#9ca3af' }}>{si + i + 1}</td>
            <td style={{ padding: '4px', fontWeight: '600' }}>{it.materialName}</td>
            <td style={{ padding: '4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px', color: '#6b7280' }}>{it.hsnCode || '—'}</td>
            <td style={{ padding: '4px', textAlign: 'center' }}>{it.quantity}</td>
            <td style={{ padding: '4px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
            <td style={{ padding: '4px', textAlign: 'center' }}>{it.gstPercent}%</td>
            <td style={{ padding: '4px', textAlign: 'right', color: ACCENT }}>{fmt(it.gstAmount)}</td>
            <td style={{ padding: '4px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.itemTotal)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  function Footer() {
    return (
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: '#374151', maxWidth: '55%' }}>
            {isIGST ? <span>IGST: {fmt(data.igstAmount)}</span> : <span>CGST: {fmt(data.cgstAmount)} | SGST: {fmt(data.sgstAmount)}</span>}
            {data.amountInWords && <div style={{ marginTop: '5px', color: '#6b7280', fontStyle: 'italic', fontSize: '9px' }}>{data.amountInWords}</div>}
          </div>
          <div style={{ minWidth: '195px' }}>
            {[['Taxable', fmt(data.totalTaxable)], ['Total GST', fmt(data.totalGst)]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px', fontSize: '10px' }}>
                <span style={{ color: '#6b7280' }}>{k}</span><span>{v}</span>
              </div>
            ))}
            <div style={{ background: ACCENT, color: '#fff', padding: '7px 10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
              <span style={{ fontWeight: '700', fontSize: '11px' }}>TOTAL</span><span style={{ fontWeight: '800', fontSize: '15px' }}>{fmt(data.grandTotal)}</span>
            </div>
            {settings.showPaymentStatus && (data.paymentReceived ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 4px', fontSize: '10px', color: balance > 0 ? '#dc2626' : ACCENT, fontWeight: '700' }}>
                <span>Balance</span><span>{fmt(balance)}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #d1fae5', paddingTop: '7px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {settings.showBankDetails && data.bankName && <div style={{ fontSize: '10px' }}>
            <div style={{ fontWeight: '700', color: ACCENT, marginBottom: '2px', fontSize: '9px' }}>BANK DETAILS</div>
            {[['Bank', data.bankName], ['A/c No', data.accountNumber], ['IFSC', data.ifscCode]].filter(([, v]) => v).map(([k, v]) => <div key={k}><span style={{ color: '#6b7280' }}>{k}: </span><b>{v}</b></div>)}
          </div>}
          {settings.showSignature && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '40px', borderBottom: '1px solid #374151', width: '130px' }} />
            <div style={{ paddingTop: '3px', fontSize: '9px', color: '#6b7280' }}>Authorised Signatory</div>
            <div style={{ fontWeight: '700', fontSize: '10px' }}>{data.company.companyName}</div>
          </div>
          )}
        <NotesTermsBlock data={data} settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {pages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === totalPages - 1;
        const si = globalIndex;
        globalIndex += pageItems.length;
        return (
          <div key={pageIdx} className="inv-page" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#111', background: '#fff', padding: '10px', width: '794px', minHeight: '1123px', boxSizing: 'border-box', border: `2px solid ${ACCENT}` }}>
            <Header />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '10px' }}>
              <THead /><Rows items={pageItems} si={si} />
            </table>
            {isLast && <Footer />}
            <div style={{ borderTop: `1px solid #d1fae5`, marginTop: '8px', paddingTop: '5px' }}>
              <PageNum pageNum={pageIdx + 1} totalPages={totalPages} isLast={isLast} style={{ color: '#6b7280' }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TEMPLATE 07 — Tally Style
// ══════════════════════════════════════════════════════════════
export function Template07Tally({ data, settings: settingsProp }: { data: InvoiceData; settings?: InvoiceSettings }) {
  const settings = settingsProp ?? getInvoiceSettings();
  const isIGST = data.isInterState;
  const pages = paginateItems(data.items, 'tally');
  const totalPages = pages.length;
  let globalIndex = 0;

  function Header() {
    return (
      <>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '6px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>{data.company.companyName}</div>
          <AddressBlock text={companyAddressLines(data.company)} settings={settings} style={{ fontSize: '9px', marginTop: '2px' }} />
          {data.company.gstin && <div style={{ marginTop: '1px' }}>GSTIN: {data.company.gstin}</div>}
          <div style={{ marginTop: '3px', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '3px' }}>{data.invoiceLabel ?? 'TAX INVOICE'}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '6px', fontSize: '10px' }}>
          <div>
            <div>Invoice No: <b>{data.invoiceNo}</b></div>
            <div>Date: <b>{fmtDate(data.invoiceDate)}</b></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Party: <b>{data.partyName}</b></div>
            {data.partyGstin && <div>GSTIN: <b>{data.partyGstin}</b></div>}
            <AddressBlock text={data.partyAddress} settings={settings} style={{ fontSize: '9px', color: '#444' }} />
            {(data.deliveryAddress && data.deliveryAddress !== data.partyAddress) && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Ship To: </span>
                <AddressBlock text={data.deliveryAddress} settings={settings} style={{ fontSize: '9px', color: '#444' }} />
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  function THead() {
    return (
      <thead>
        <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
          {['Sr.', 'Particulars', 'HSN', 'Qty', 'Rate', 'GST%', 'GST Amt', 'Amount'].map(h => (
            <th key={h} style={{ padding: '3px', textAlign: ['Sr.', 'Qty', 'GST%'].includes(h) ? 'center' : ['Rate', 'GST Amt', 'Amount'].includes(h) ? 'right' : 'left', fontWeight: '700', fontSize: '9px' }}>{h}</th>
          ))}
        </tr>
      </thead>
    );
  }

  function Rows({ items, si }: { items: InvoiceItem[]; si: number }) {
    return (
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ borderBottom: '1px dashed #aaa' }}>
            <td style={{ padding: '3px', textAlign: 'center' }}>{si + i + 1}</td>
            <td style={{ padding: '3px' }}>{it.materialName}</td>
            <td style={{ padding: '3px', textAlign: 'center' }}>{it.hsnCode || ''}</td>
            <td style={{ padding: '3px', textAlign: 'center' }}>{it.quantity}</td>
            <td style={{ padding: '3px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
            <td style={{ padding: '3px', textAlign: 'center' }}>{it.gstPercent}%</td>
            <td style={{ padding: '3px', textAlign: 'right' }}>{fmt(it.gstAmount)}</td>
            <td style={{ padding: '3px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.itemTotal)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  function Footer() {
    return (
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ borderTop: '1px solid #000', paddingTop: '5px', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '9px' }}>
            <div>Taxable Amount: {fmt(data.totalTaxable)}</div>
            {isIGST ? <div>IGST: {fmt(data.igstAmount)}</div> : <><div>CGST: {fmt(data.cgstAmount)}</div><div>SGST: {fmt(data.sgstAmount)}</div></>}
            {data.amountInWords && <div style={{ marginTop: '3px' }}>In Words: {data.amountInWords}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ borderTop: '1px solid #000', borderBottom: '2px double #000', padding: '3px 0', fontWeight: '700', fontSize: '12px' }}>
              Net Total: {fmt(data.grandTotal)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #000', marginTop: '6px', paddingTop: '5px', fontSize: '9px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {settings.showBankDetails && data.bankName && <div>
            <div style={{ fontWeight: '700', marginBottom: '2px' }}>Bank Details:</div>
            <div>Bank: {data.bankName}</div>
            {data.accountNumber && <div>A/c No: {data.accountNumber}</div>}
            {data.ifscCode && <div>IFSC: {data.ifscCode}</div>}
          </div>}
          {settings.showSignature && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ height: '35px', borderBottom: '1px solid #000', width: '120px', marginLeft: 'auto' }} />
            <div>Authorised Signatory</div>
            <div style={{ fontWeight: '700' }}>{data.company.companyName}</div>
          </div>
          )}
        <NotesTermsBlock data={data} settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {pages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === totalPages - 1;
        const si = globalIndex;
        globalIndex += pageItems.length;
        return (
          <div key={pageIdx} className="inv-page" style={{ fontFamily: 'Courier New, monospace', fontSize: '10px', color: '#000', background: '#fff', padding: '10px 14px', width: '794px', minHeight: '1123px', boxSizing: 'border-box', border: '1px solid #000' }}>
            <Header />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '9px' }}>
              <THead /><Rows items={pageItems} si={si} />
            </table>
            {isLast && <Footer />}
            <div style={{ textAlign: 'center', borderTop: '1px solid #000', marginTop: '6px', paddingTop: '3px', fontSize: '8px', color: '#444' }}>
              <PageNum pageNum={pageIdx + 1} totalPages={totalPages} isLast={isLast} style={{ color: '#444', justifyContent: 'center', gap: '20px' }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TEMPLATE 08 — Boxed Professional
// ══════════════════════════════════════════════════════════════
export function Template08Boxed({ data, settings: settingsProp }: { data: InvoiceData; settings?: InvoiceSettings }) {
  const settings = settingsProp ?? getInvoiceSettings();
  const isIGST = data.isInterState;
  const balance = (data.grandTotal ?? 0) - (data.paymentReceived ?? 0);
  const ACCENT = '#0f766e';
  const pages = paginateItems(data.items, 'boxed');
  const totalPages = pages.length;
  let globalIndex = 0;

  function Header() {
    return (
      <>
        <div style={{ border: `2px solid ${ACCENT}`, borderRadius: '6px', padding: '12px', marginBottom: '10px', background: '#f0fdfa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: ACCENT }}>{data.company.companyName}</div>
              <AddressBlock text={companyAddressLines(data.company)} settings={settings} style={{ fontSize: '10px', color: '#374151', marginTop: '2px' }} />
              {data.company.gstin && <div style={{ fontFamily: 'monospace', fontSize: '10px', color: ACCENT, marginTop: '2px' }}>GSTIN: {data.company.gstin}</div>}
            </div>
            <div style={{ textAlign: 'right', border: `2px solid ${ACCENT}`, borderRadius: '6px', padding: '8px 12px', background: '#fff' }}>
              <div style={{ color: ACCENT, fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>{data.invoiceLabel ?? 'Tax Invoice'}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: '800', marginTop: '3px' }}>{data.invoiceNo}</div>
              <div style={{ fontSize: '10px', color: '#374151', marginTop: '1px' }}>{fmtDate(data.invoiceDate)}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div style={{ flex: 1, border: '2px solid #ccfbf1', borderRadius: '6px', padding: '10px' }}>
            <div style={{ color: ACCENT, fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>{data.partyLabel ?? 'Bill To'}</div>
            <div style={{ fontWeight: '700', fontSize: '12px' }}>{data.partyName}</div>
            <AddressBlock text={data.partyAddress} settings={settings} style={{ color: '#374151', marginTop: '2px', fontSize: '10px' }} />
            {(data.deliveryAddress && data.deliveryAddress !== data.partyAddress) && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Ship To: </span>
                <AddressBlock text={data.deliveryAddress} settings={settings} style={{ color: '#374151', marginTop: '2px', fontSize: '10px' }} />
              </div>
            )}
            {data.partyGstin && <div style={{ color: ACCENT, fontFamily: 'monospace', fontSize: '10px', marginTop: '3px' }}>GSTIN: {data.partyGstin}</div>}
          </div>
          <div style={{ minWidth: '190px', border: '2px solid #ccfbf1', borderRadius: '6px', padding: '10px' }}>
            {[['Invoice No', data.invoiceNo], ['Date', fmtDate(data.invoiceDate)], ...(data.dueDate ? [['Due', fmtDate(data.dueDate)]] : []), ...(data.poNo ? [['PO No', data.poNo]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccfbf1', padding: '3px 0', fontSize: '10px' }}>
                <span style={{ color: '#64748b' }}>{k}</span><span style={{ fontWeight: '700' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function THead() {
    return (
      <thead>
        <tr style={{ background: ACCENT, color: '#fff' }}>
          {['#', 'Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST%', 'GST', 'Total'].map(h => (
            <th key={h} style={{ padding: '6px 5px', textAlign: ['#', 'Qty', 'GST%'].includes(h) ? 'center' : ['Rate', 'Taxable', 'GST', 'Total'].includes(h) ? 'right' : 'left', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
    );
  }

  function Rows({ items, si }: { items: InvoiceItem[]; si: number }) {
    return (
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #ccfbf1', background: (si + i) % 2 ? '#f0fdfa' : '#fff' }}>
            <td style={{ padding: '5px', textAlign: 'center', color: '#9ca3af' }}>{si + i + 1}</td>
            <td style={{ padding: '5px', fontWeight: '600' }}>{it.materialName}</td>
            <td style={{ padding: '5px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px' }}>{it.hsnCode || '—'}</td>
            <td style={{ padding: '5px', textAlign: 'center' }}>{it.quantity}</td>
            <td style={{ padding: '5px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
            <td style={{ padding: '5px', textAlign: 'right' }}>{fmt(it.taxableAmount)}</td>
            <td style={{ padding: '5px', textAlign: 'center' }}>{it.gstPercent}%</td>
            <td style={{ padding: '5px', textAlign: 'right', color: ACCENT }}>{fmt(it.gstAmount)}</td>
            <td style={{ padding: '5px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.itemTotal)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  function Footer() {
    return (
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <div style={{ minWidth: '260px', border: `2px solid ${ACCENT}`, borderRadius: '6px', overflow: 'hidden' }}>
            {[['Taxable Amount', fmt(data.totalTaxable)], isIGST && ['IGST', fmt(data.igstAmount)], !isIGST && ['CGST', fmt(data.cgstAmount)], !isIGST && ['SGST', fmt(data.sgstAmount)], data.otherExpense && ['Other Expense', fmt(data.otherExpense)]].filter(Boolean).map((r: any, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 10px', borderBottom: '1px solid #ccfbf1', fontSize: '10px' }}>
                <span style={{ color: '#64748b' }}>{r[0]}</span><span style={{ fontWeight: '600' }}>{r[1]}</span>
              </div>
            ))}
            <div style={{ background: ACCENT, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
              <span style={{ fontWeight: '700' }}>GRAND TOTAL</span><span style={{ fontWeight: '800', fontSize: '15px' }}>{fmt(data.grandTotal)}</span>
            </div>
            {settings.showPaymentStatus && (data.paymentReceived ?? 0) > 0 && (
              <div style={{ padding: '5px 10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                <span style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>Balance Due</span>
                <span style={{ fontWeight: '700', color: balance > 0 ? '#dc2626' : '#16a34a' }}>{fmt(balance)}</span>
              </div>
            )}
          </div>
        </div>
        {data.amountInWords && <div style={{ border: '1px solid #ccfbf1', borderRadius: '6px', padding: '5px 10px', marginBottom: '10px', fontSize: '10px', background: '#f0fdfa' }}><span style={{ fontWeight: '700', color: ACCENT }}>In Words: </span>{data.amountInWords}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {settings.showBankDetails && data.bankName && <div style={{ flex: 1, border: '2px solid #ccfbf1', borderRadius: '6px', padding: '10px 12px', fontSize: '10px' }}>
            <div style={{ fontWeight: '700', color: ACCENT, marginBottom: '4px', fontSize: '9px', textTransform: 'uppercase' }}>Bank Details</div>
            {[['Bank', data.bankName], ['A/c Name', data.accountName], ['A/c No', data.accountNumber], ['IFSC', data.ifscCode]].filter(([, v]) => v).map(([k, v]) => <div key={k} style={{ marginBottom: '2px' }}><span style={{ color: '#64748b' }}>{k}: </span><b>{v}</b></div>)}
          </div>}
          {settings.showSignature && (
          <div style={{ minWidth: '190px', border: '2px solid #ccfbf1', borderRadius: '6px', padding: '10px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontSize: '10px' }}>
            <div style={{ height: '50px' }} />
            <div style={{ borderTop: '1px solid #374151', paddingTop: '3px', color: '#374151' }}>Authorised Signatory</div>
            <div style={{ fontWeight: '700', color: ACCENT, marginTop: '1px' }}>{data.company.companyName}</div>
          </div>
          )}
        <NotesTermsBlock data={data} settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {pages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === totalPages - 1;
        const si = globalIndex;
        globalIndex += pageItems.length;
        return (
          <div key={pageIdx} className="inv-page" style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '11px', color: '#1e293b', background: '#fff', padding: '18px', width: '794px', minHeight: '1123px', boxSizing: 'border-box', border: `2px solid ${ACCENT}` }}>
            <Header />
            <div style={{ border: '2px solid #ccfbf1', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <THead /><Rows items={pageItems} si={si} />
              </table>
            </div>
            {isLast && <Footer />}
            <div style={{ borderTop: `1px solid #ccfbf1`, marginTop: '8px', paddingTop: '5px' }}>
              <PageNum pageNum={pageIdx + 1} totalPages={totalPages} isLast={isLast} style={{ color: '#64748b' }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TEMPLATE 09 — GST Detailed
// ══════════════════════════════════════════════════════════════
export function Template09DetailedGST({ data, settings: settingsProp }: { data: InvoiceData; settings?: InvoiceSettings }) {
  const settings = settingsProp ?? getInvoiceSettings();
  const isIGST = data.isInterState;
  const ACCENT = '#dc2626';
  const pages = paginateItems(data.items, 'gstdetail');
  const totalPages = pages.length;
  let globalIndex = 0;

  function Header() {
    return (
      <>
        <div style={{ background: ACCENT, color: '#fff', padding: '12px 18px', marginBottom: '10px', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>{data.company.companyName}</div>
              <AddressBlock text={companyAddressLines(data.company)} settings={settings} style={{ fontSize: '9px', opacity: 0.85, marginTop: '2px' }} />
              {data.company.gstin && <div style={{ fontFamily: 'monospace', marginTop: '2px', fontSize: '10px', opacity: 0.9 }}>GSTIN: {data.company.gstin}</div>}
            </div>
            <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '2px', fontWeight: '700' }}>{data.invoiceLabel ?? 'TAX INVOICE'}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>{data.invoiceNo}</div>
              <div style={{ fontSize: '10px', opacity: 0.85 }}>{fmtDate(data.invoiceDate)}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div style={{ flex: 1, border: '2px solid #fecaca', borderRadius: '4px', padding: '9px' }}>
            <div style={{ color: ACCENT, fontWeight: '700', fontSize: '9px', textTransform: 'uppercase', marginBottom: '3px' }}>{data.partyLabel ?? 'Bill To'}</div>
            <div style={{ fontWeight: '700', fontSize: '13px' }}>{data.partyName}</div>
            <AddressBlock text={data.partyAddress} settings={settings} style={{ fontSize: '10px', color: '#444', marginTop: '2px' }} />
            {(data.deliveryAddress && data.deliveryAddress !== data.partyAddress) && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Ship To: </span>
                <AddressBlock text={data.deliveryAddress} settings={settings} style={{ fontSize: '10px', color: '#444', marginTop: '2px' }} />
              </div>
            )}
            {data.partyGstin && <div style={{ fontFamily: 'monospace', fontSize: '10px', color: ACCENT, marginTop: '2px' }}>GSTIN: {data.partyGstin}</div>}
          </div>
          <div style={{ minWidth: '190px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '4px', padding: '9px' }}>
            {[['Invoice No', data.invoiceNo], ['Date', fmtDate(data.invoiceDate)], ...(data.dueDate ? [['Due', fmtDate(data.dueDate)]] : []), ...(data.poNo ? [['PO', data.poNo]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #fecaca', fontSize: '10px' }}>
                <span style={{ color: '#6b7280' }}>{k}</span><span style={{ fontWeight: '700' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function THead() {
    const cols = ['#', 'Description of Goods', 'HSN Code', 'Qty', 'Unit Rate', 'Taxable Value', 'GST Rate',
      ...(isIGST ? ['IGST Amt'] : ['CGST', 'SGST']), 'Total Amount'];
    return (
      <thead>
        <tr style={{ background: '#7f1d1d', color: '#fff' }}>
          {cols.map(h => (
            <th key={h} style={{ padding: '5px 4px', textAlign: ['#', 'Qty', 'GST Rate'].includes(h) ? 'center' : ['Unit Rate', 'Taxable Value', 'IGST Amt', 'CGST', 'SGST', 'Total Amount'].includes(h) ? 'right' : 'left', fontSize: '8.5px', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
    );
  }

  function Rows({ items, si }: { items: InvoiceItem[]; si: number }) {
    return (
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #fecaca', background: (si + i) % 2 ? '#fff5f5' : '#fff' }}>
            <td style={{ padding: '4px', textAlign: 'center' }}>{si + i + 1}</td>
            <td style={{ padding: '4px', fontWeight: '600' }}>{it.materialName}</td>
            <td style={{ padding: '4px', textAlign: 'center', fontFamily: 'monospace', fontSize: '9px' }}>{it.hsnCode || '—'}</td>
            <td style={{ padding: '4px', textAlign: 'center' }}>{it.quantity}</td>
            <td style={{ padding: '4px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
            <td style={{ padding: '4px', textAlign: 'right', fontWeight: '600' }}>{fmt(it.taxableAmount)}</td>
            <td style={{ padding: '4px', textAlign: 'center' }}>{it.gstPercent}%</td>
            {isIGST
              ? <td style={{ padding: '4px', textAlign: 'right', color: ACCENT }}>{fmt(it.gstAmount)}</td>
              : <><td style={{ padding: '4px', textAlign: 'right', color: ACCENT }}>{fmt(it.gstAmount / 2)}</td><td style={{ padding: '4px', textAlign: 'right', color: ACCENT }}>{fmt(it.gstAmount / 2)}</td></>}
            <td style={{ padding: '4px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.itemTotal)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  function Footer() {
    const gstRates = Array.from(new Set(data.items.map((i) => i.gstPercent)));
    return (
      <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        {/* HSN-wise GST Summary */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontWeight: '700', color: ACCENT, fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>HSN-wise GST Summary</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: '1px solid #fecaca' }}>
            <thead>
              <tr style={{ background: '#fecaca' }}>
                {['HSN Code', 'GST %', 'Taxable Value', ...(isIGST ? ['IGST Amount'] : ['CGST Amount', 'SGST Amount']), 'Total GST'].map(h => (
                  <th key={h} style={{ padding: '3px 5px', textAlign: ['Taxable Value', 'IGST Amount', 'CGST Amount', 'SGST Amount', 'Total GST'].includes(h) ? 'right' : 'center', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gstRates.map((rate) => {
                const group = data.items.filter((i) => i.gstPercent === rate);
                const hsnCodes = [...new Set(group.map((i) => i.hsnCode || '—'))].join(', ');
                const taxable = group.reduce((s, i) => s + i.taxableAmount, 0);
                const gst = group.reduce((s, i) => s + i.gstAmount, 0);
                return (
                  <tr key={rate} style={{ borderTop: '1px solid #fecaca' }}>
                    <td style={{ padding: '3px 5px', textAlign: 'center', fontFamily: 'monospace' }}>{hsnCodes}</td>
                    <td style={{ padding: '3px 5px', textAlign: 'center' }}>{rate}%</td>
                    <td style={{ padding: '3px 5px', textAlign: 'right' }}>{fmt(taxable)}</td>
                    {isIGST ? <td style={{ padding: '3px 5px', textAlign: 'right' }}>{fmt(gst)}</td> : <><td style={{ padding: '3px 5px', textAlign: 'right' }}>{fmt(gst / 2)}</td><td style={{ padding: '3px 5px', textAlign: 'right' }}>{fmt(gst / 2)}</td></>}
                    <td style={{ padding: '3px 5px', textAlign: 'right', fontWeight: '700' }}>{fmt(gst)}</td>
                  </tr>
                );
              })}
              <tr style={{ background: '#fecaca', fontWeight: '700', borderTop: '2px solid #dc2626' }}>
                <td colSpan={2} style={{ padding: '3px 5px', textAlign: 'center' }}>TOTAL</td>
                <td style={{ padding: '3px 5px', textAlign: 'right' }}>{fmt(data.totalTaxable)}</td>
                {isIGST ? <td style={{ padding: '3px 5px', textAlign: 'right' }}>{fmt(data.igstAmount)}</td> : <><td style={{ padding: '3px 5px', textAlign: 'right' }}>{fmt(data.cgstAmount)}</td><td style={{ padding: '3px 5px', textAlign: 'right' }}>{fmt(data.sgstAmount)}</td></>}
                <td style={{ padding: '3px 5px', textAlign: 'right' }}>{fmt(data.totalGst)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Grand Total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <div style={{ background: ACCENT, color: '#fff', padding: '8px 14px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: '240px' }}>
            <span style={{ fontWeight: '700', fontSize: '12px' }}>GRAND TOTAL</span>
            <span style={{ fontWeight: '800', fontSize: '17px' }}>{fmt(data.grandTotal)}</span>
          </div>
        </div>

        {data.amountInWords && <div style={{ background: '#fff5f5', border: '1px solid #fecaca', padding: '5px 9px', borderRadius: '4px', fontSize: '10px', marginBottom: '8px' }}><span style={{ color: ACCENT, fontWeight: '700' }}>In Words: </span>{data.amountInWords}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {settings.showBankDetails && data.bankName && <div style={{ fontSize: '10px', border: '1px solid #fecaca', padding: '7px 10px', borderRadius: '4px' }}>
            <div style={{ fontWeight: '700', color: ACCENT, marginBottom: '3px', fontSize: '9px', textTransform: 'uppercase' }}>Bank Details</div>
            {[['Bank', data.bankName], ['A/c No', data.accountNumber], ['IFSC', data.ifscCode]].filter(([, v]) => v).map(([k, v]) => <div key={k}><span style={{ color: '#6b7280' }}>{k}: </span><b>{v}</b></div>)}
          </div>}
          {settings.showSignature && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '40px', borderBottom: `2px solid ${ACCENT}`, width: '150px' }} />
            <div style={{ paddingTop: '4px', color: '#6b7280', fontSize: '9px' }}>Authorised Signatory</div>
            <div style={{ fontWeight: '700', color: ACCENT }}>{data.company.companyName}</div>
          </div>
          )}
        <NotesTermsBlock data={data} settings={settings} />
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {pages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === totalPages - 1;
        const si = globalIndex;
        globalIndex += pageItems.length;
        return (
          <div key={pageIdx} className="inv-page" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10.5px', color: '#111', background: '#fff', padding: '16px', width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}>
            <Header />
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '10px' }}>
              <THead /><Rows items={pageItems} si={si} />
            </table>
            {isLast && <Footer />}
            <div style={{ borderTop: '1px solid #fecaca', marginTop: '8px', paddingTop: '5px' }}>
              <PageNum pageNum={pageIdx + 1} totalPages={totalPages} isLast={isLast} style={{ color: '#6b7280' }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TEMPLATE 10 — Executive Premium
// ══════════════════════════════════════════════════════════════
export function Template10Executive({ data, settings: settingsProp }: { data: InvoiceData; settings?: InvoiceSettings }) {
  const settings = settingsProp ?? getInvoiceSettings();
  const isIGST = data.isInterState;
  const balance = (data.grandTotal ?? 0) - (data.paymentReceived ?? 0);
  const pages = paginateItems(data.items, 'executive');
  const totalPages = pages.length;
  let globalIndex = 0;

  function Header() {
    return (
      <>
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)', color: '#fff', padding: '24px 32px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>{data.company.companyName}</div>
              <AddressBlock
                text={companyAddressLines(data.company)}
                settings={settings}
                style={{ color: '#94a3b8', marginTop: '4px', fontSize: '10px', lineHeight: '1.7' }}
              />
              {data.company.mobile && <div style={{ color: '#94a3b8', fontSize: '10px' }}>+91 {data.company.mobile}</div>}
              {data.company.gstin && (
                <div style={{ marginTop: '5px', display: 'inline-flex', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '20px', fontFamily: 'monospace', fontSize: '10px', color: '#cbd5e1' }}>
                  GSTIN: {data.company.gstin}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#94a3b8', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '4px' }}>{data.invoiceLabel ?? 'Tax Invoice'}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'monospace', color: '#e2e8f0' }}>{data.invoiceNo}</div>
              <div style={{ color: '#94a3b8', marginTop: '3px', fontSize: '11px' }}>{fmtDate(data.invoiceDate)}</div>
              {data.dueDate && <div style={{ color: '#f87171', fontSize: '10px', marginTop: '1px' }}>Due: {fmtDate(data.dueDate)}</div>}
            </div>
          </div>
        </div>
        {/* Gold accent line */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #fde68a, #f59e0b)' }} />

        <div style={{ display: 'flex', gap: '14px', padding: '14px 32px 0', marginBottom: '14px' }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', borderRadius: '6px', padding: '12px 14px' }}>
            <div style={{ color: '#64748b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '5px' }}>{data.partyLabel ?? 'Bill To'}</div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>{data.partyName}</div>
            <AddressBlock text={data.partyAddress} settings={settings} style={{ color: '#64748b', marginTop: '2px', fontSize: '10px' }} />
            {(data.deliveryAddress && data.deliveryAddress !== data.partyAddress) && (
              <div style={{ marginTop: '4px' }}>
                <span style={{ fontWeight: '700', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>Ship To: </span>
                <AddressBlock text={data.deliveryAddress} settings={settings} style={{ color: '#64748b', marginTop: '2px', fontSize: '10px' }} />
              </div>
            )}
            {data.partyGstin && <div style={{ color: '#0f172a', fontFamily: 'monospace', marginTop: '4px', fontSize: '10px', background: '#f1f5f9', display: 'inline-block', padding: '2px 8px', borderRadius: '4px' }}>GSTIN: {data.partyGstin}</div>}
          </div>
          <div style={{ minWidth: '200px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px 14px' }}>
            <div style={{ color: '#64748b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Invoice Details</div>
            {[['Invoice No', data.invoiceNo], ['Invoice Date', fmtDate(data.invoiceDate)], ...(data.dueDate ? [['Due Date', fmtDate(data.dueDate)]] : []), ...(data.poNo ? [['PO Number', data.poNo]] : []), ...(data.paymentTerms ? [['Payment Terms', `${data.paymentTerms} Days`]] : [])].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px' }}>
                <span style={{ color: '#64748b' }}>{k}</span><span style={{ fontWeight: '700' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  function THead() {
    return (
      <thead>
        <tr style={{ background: '#0f172a', color: '#fff' }}>
          {['#', 'Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST%', 'GST', 'Total'].map(h => (
            <th key={h} style={{ padding: '7px 6px', textAlign: ['#', 'Qty', 'GST%'].includes(h) ? 'center' : ['Rate', 'Taxable', 'GST', 'Total'].includes(h) ? 'right' : 'left', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
          ))}
        </tr>
      </thead>
    );
  }

  function Rows({ items, si }: { items: InvoiceItem[]; si: number }) {
    return (
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: (si + i) % 2 ? '#f8fafc' : '#fff' }}>
            <td style={{ padding: '6px', textAlign: 'center', color: '#94a3b8' }}>{si + i + 1}</td>
            <td style={{ padding: '6px', fontWeight: '600' }}>{it.materialName}</td>
            <td style={{ padding: '6px', textAlign: 'center', fontFamily: 'monospace', color: '#64748b', fontSize: '9px' }}>{it.hsnCode || '—'}</td>
            <td style={{ padding: '6px', textAlign: 'center' }}>{it.quantity}</td>
            <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
            <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(it.taxableAmount)}</td>
            <td style={{ padding: '6px', textAlign: 'center' }}>{it.gstPercent}%</td>
            <td style={{ padding: '6px', textAlign: 'right', color: '#f59e0b', fontWeight: '600' }}>{fmt(it.gstAmount)}</td>
            <td style={{ padding: '6px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.itemTotal)}</td>
          </tr>
        ))}
      </tbody>
    );
  }

  function Footer() {
    return (
      <div style={{ padding: '0 32px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
          <div style={{ minWidth: '280px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              {[['Taxable Amount', fmt(data.totalTaxable)], isIGST && ['IGST', fmt(data.igstAmount)], !isIGST && ['CGST', fmt(data.cgstAmount)], !isIGST && ['SGST', fmt(data.sgstAmount)], data.otherExpense && ['Other Expense', fmt(data.otherExpense)], data.roundOff && ['Round Off', fmt(data.roundOff)]].filter(Boolean).map((r: any, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>{r[0]}</span><span style={{ fontWeight: '600' }}>{r[1]}</span>
                </div>
              ))}
              <div style={{ background: 'linear-gradient(90deg, #0f172a, #1e293b)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px' }}>
                <span style={{ fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '11px' }}>Grand Total</span>
                <span style={{ fontWeight: '800', fontSize: '19px', color: '#fbbf24' }}>{fmt(data.grandTotal)}</span>
              </div>
              {settings.showPaymentStatus && (data.paymentReceived ?? 0) > 0 && (
                <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: '#16a34a' }}>Amount Received</span>
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>{fmt(data.paymentReceived ?? 0)}</span>
                </div>
              )}
              {settings.showPaymentStatus && balance > 0 && (
                <div style={{ padding: '6px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#dc2626', fontWeight: '700' }}>Balance Due</span>
                  <span style={{ color: '#dc2626', fontWeight: '700' }}>{fmt(balance)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {data.amountInWords && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', padding: '7px 12px', borderRadius: '4px', marginBottom: '14px', fontSize: '10px' }}>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>Amount in Words: </span><span style={{ color: '#374151' }}>{data.amountInWords}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '14px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {settings.showBankDetails && data.bankName && (
            <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '10px', background: '#f8fafc' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '5px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>Bank Details</div>
              {[['Bank Name', data.bankName], ['Account Name', data.accountName], ['Account No', data.accountNumber], ['IFSC Code', data.ifscCode]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ marginBottom: '2px' }}><span style={{ color: '#64748b' }}>{k}: </span><span style={{ fontWeight: '600' }}>{v}</span></div>
              ))}
            </div>
          )}
          {/* QR placeholder */}
          <div style={{ width: '76px', height: '76px', border: '2px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexShrink: 0 }}>
            <div style={{ textAlign: 'center', fontSize: '7px', color: '#94a3b8', lineHeight: '1.4' }}>
              <div style={{ fontSize: '16px', marginBottom: '2px' }}>⬛</div>QR Code
            </div>
          </div>
          {settings.showSignature && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minWidth: '155px' }}>
            <div style={{ height: '50px', borderBottom: '2px solid #0f172a', width: '100%' }} />
            <div style={{ paddingTop: '4px', color: '#64748b', fontSize: '10px' }}>Authorised Signatory</div>
            <div style={{ fontWeight: '700', fontSize: '12px', color: '#0f172a', letterSpacing: '0.5px' }}>{data.company.companyName}</div>
          </div>
          )}
        </div>

        {settings.showNotes && data.notes && (
          <div style={{ marginTop: '12px', padding: '7px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '10px', color: '#64748b' }}>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>Notes: </span>{data.notes}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <style>{PRINT_CSS}</style>
      {pages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === totalPages - 1;
        const si = globalIndex;
        globalIndex += pageItems.length;
        return (
          <div key={pageIdx} className="inv-page" style={{ fontFamily: "'Georgia', serif", fontSize: '11px', color: '#0f172a', background: '#fff', width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}>
            <Header />
            <div style={{ padding: '0 32px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '10px' }}>
                <THead /><Rows items={pageItems} si={si} />
              </table>
            </div>
            {isLast && <Footer />}
            <div style={{ background: '#0f172a', color: '#475569', padding: '7px 32px', textAlign: 'center', fontSize: '9px', marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Page {pageIdx + 1} of {totalPages}</span>
              {isLast
                ? <span>This is a computer-generated invoice and does not require a physical signature.</span>
                : <span style={{ fontStyle: 'italic' }}>Continued on next page…</span>}
            </div>
          </div>
        );
      })}
    </>
  );
}