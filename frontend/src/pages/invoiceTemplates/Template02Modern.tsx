// ── Template 02: Modern Professional ─────────────────────────
// Clean spacing, blue accents, large total box.
// Multi-page A4 support: header repeats, footer only on last page.

import { InvoiceData, InvoiceItem, fmt, fmtDate, companyAddressLines } from './invoiceTypes';
import { paginateItems, PRINT_CSS } from './invoicePagination';
import { InvoiceSettings, getInvoiceSettings } from './invoiceSettings';
import AddressBlock from './AddressBlock';

interface Props { data: InvoiceData; settings?: InvoiceSettings; }

const ACCENT  = '#0284c7';
const ACCENT2 = '#0ea5e9';

function PageHeader({ data, settings }: { data: InvoiceData; settings: InvoiceSettings }) {
  return (
    <>
      {/* Coloured band */}
      <div style={{ background: `linear-gradient(135deg, ${ACCENT2} 0%, ${ACCENT} 100%)`, padding: '20px 28px 16px', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>{data.company.companyName}</div>
            <AddressBlock
              text={companyAddressLines(data.company)}
              settings={settings}
              style={{ opacity: 0.85, marginTop: '3px', fontSize: '10px', lineHeight: '1.6' }}
            />
            {data.company.gstin && (
              <div style={{ marginTop: '4px', background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px' }}>
                GSTIN: {data.company.gstin}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.9 }}>{data.invoiceLabel ?? 'Tax Invoice'}</div>
            <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '3px', fontFamily: 'monospace' }}>#{data.invoiceNo}</div>
          </div>
        </div>
      </div>

      {/* Invoice meta + Bill To */}
      <div style={{ display: 'flex', gap: '16px', padding: '14px 28px 0', marginBottom: '14px' }}>
        <div style={{ flex: 1, background: '#f0f9ff', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontWeight: '700', color: ACCENT, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>{data.partyLabel ?? 'Bill To'}</div>
          <div style={{ fontWeight: '700', fontSize: '13px' }}>{data.partyName}</div>
          <AddressBlock
            text={data.partyAddress}
            settings={settings}
            style={{ color: '#475569', marginTop: '2px', fontSize: '10px' }}
          />
          {data.partyGstin && <div style={{ marginTop: '4px', fontFamily: 'monospace', color: ACCENT, fontSize: '10px' }}>GSTIN: {data.partyGstin}</div>}
          {data.partyMobile && <div style={{ marginTop: '2px', fontSize: '10px', color: '#475569' }}>Mobile: {data.partyMobile}</div>}
          {(data.deliveryAddress && data.deliveryAddress !== data.partyAddress) && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #bae6fd' }}>
              <div style={{ fontWeight: '700', color: ACCENT, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Ship To</div>
              <AddressBlock
                text={data.deliveryAddress || data.partyAddress}
                settings={settings}
                style={{ color: '#475569', fontSize: '10px' }}
              />
            </div>
          )}
        </div>
        <div style={{ minWidth: '190px', background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
          <div style={{ fontWeight: '700', color: ACCENT, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Invoice Details</div>
          {[
            ['Date',         fmtDate(data.invoiceDate)],
            ...(data.dueDate      ? [['Due Date',       fmtDate(data.dueDate)]]              : []),
            ...(data.poNo         ? [['PO No',          data.poNo]]                          : []),
            ...(data.paymentTerms ? [['Payment Terms',  `${data.paymentTerms} days`]]        : []),
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10px' }}>
              <span style={{ color: '#64748b' }}>{k}</span>
              <span style={{ fontWeight: '600' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TableHead() {
  return (
    <thead>
      <tr>
        {['#', 'Item Description', 'HSN', 'Qty', 'Unit Price', 'Taxable', 'GST%', 'GST', 'Total'].map((h) => (
          <th key={h} style={{
            padding: '7px 6px',
            background: '#1e293b',
            color: '#fff',
            textAlign: ['#', 'Qty', 'GST%'].includes(h) ? 'center' : ['Unit Price', 'Taxable', 'GST', 'Total'].includes(h) ? 'right' : 'left',
            fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px',
          }}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}

function ItemRows({ items, startIndex }: { items: InvoiceItem[]; startIndex: number }) {
  return (
    <tbody>
      {items.map((it, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: (startIndex + i) % 2 ? '#f8fafc' : '#fff' }}>
          <td style={{ padding: '6px 6px', textAlign: 'center', color: '#94a3b8' }}>{startIndex + i + 1}</td>
          <td style={{ padding: '6px 6px', fontWeight: '600' }}>{it.materialName}</td>
          <td style={{ padding: '6px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#64748b' }}>{it.hsnCode || '—'}</td>
          <td style={{ padding: '6px 6px', textAlign: 'center' }}>{it.quantity}</td>
          <td style={{ padding: '6px 6px', textAlign: 'right' }}>{fmt(it.unitPrice)}</td>
          <td style={{ padding: '6px 6px', textAlign: 'right' }}>{fmt(it.taxableAmount)}</td>
          <td style={{ padding: '6px 6px', textAlign: 'center' }}>{it.gstPercent}%</td>
          <td style={{ padding: '6px 6px', textAlign: 'right', color: ACCENT }}>{fmt(it.gstAmount)}</td>
          <td style={{ padding: '6px 6px', textAlign: 'right', fontWeight: '700' }}>{fmt(it.itemTotal)}</td>
        </tr>
      ))}
    </tbody>
  );
}

function LastPageFooter({ data, settings }: { data: InvoiceData; settings: InvoiceSettings }) {
  const isIGST = data.isInterState;
  const balance = (data.grandTotal ?? 0) - (data.paymentReceived ?? 0);

  return (
    <div style={{ padding: '0 28px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
        <div style={{ minWidth: '280px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              {[
                ['Subtotal (Taxable)', fmt(data.totalTaxable)],
                isIGST  ? ['IGST',  fmt(data.igstAmount)]  : null,
                !isIGST ? ['CGST',  fmt(data.cgstAmount)]  : null,
                !isIGST ? ['SGST',  fmt(data.sgstAmount)]  : null,
                data.otherExpense ? ['Other Expense', fmt(data.otherExpense)] : null,
                data.roundOff     ? ['Round Off',     fmt(data.roundOff)]     : null,
              ].filter(Boolean).map((row: any, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '5px 8px', color: '#64748b' }}>{row[0]}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right' }}>{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Grand Total box */}
          <div style={{ background: `linear-gradient(135deg, ${ACCENT2}, ${ACCENT})`, color: '#fff', borderRadius: '10px', padding: '12px 16px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '700', fontSize: '13px' }}>GRAND TOTAL</span>
            <span style={{ fontWeight: '800', fontSize: '20px' }}>{fmt(data.grandTotal)}</span>
          </div>
          {settings.showPaymentStatus && (data.paymentReceived ?? 0) > 0 && (
            <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #e2e8f0', fontSize: '11px' }}>
              <span style={{ color: '#16a34a' }}>Received</span>
              <span style={{ color: '#16a34a', fontWeight: '600' }}>{fmt(data.paymentReceived ?? 0)}</span>
            </div>
          )}
          {settings.showPaymentStatus && balance > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '11px' }}>
              <span style={{ color: '#dc2626', fontWeight: '700' }}>Balance Due</span>
              <span style={{ color: '#dc2626', fontWeight: '700' }}>{fmt(balance)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Amount in words */}
      {data.amountInWords && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '7px 12px', marginBottom: '14px', fontSize: '10px' }}>
          <span style={{ color: ACCENT, fontWeight: '700' }}>Amount in Words: </span>{data.amountInWords}
        </div>
      )}

      {/* Bank + Signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '14px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        {settings.showBankDetails && data.bankName && (
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px', fontSize: '10px' }}>
            <div style={{ fontWeight: '700', color: ACCENT, marginBottom: '5px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Bank Details</div>
            {[['Bank', data.bankName], ['A/c Name', data.accountName], ['A/c No', data.accountNumber], ['IFSC', data.ifscCode], ['Branch', data.branchName]].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{ marginBottom: '2px' }}><span style={{ color: '#64748b' }}>{k}: </span><span style={{ fontWeight: '600' }}>{v}</span></div>
            ))}
          </div>
        )}
        {settings.showSignature && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '50px' }} />
            <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px', width: '160px', fontSize: '10px', color: '#64748b' }}>Authorised Signatory</div>
            <div style={{ fontWeight: '700', fontSize: '11px' }}>{data.company.companyName}</div>
          </div>
        )}
      </div>

      {settings.showNotes && data.notes && (
        <div style={{ marginTop: '10px', fontSize: '10px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '7px' }}>
          <span style={{ fontWeight: '700' }}>Notes: </span>{data.notes}
        </div>
      )}
    </div>
  );
}

function PageFooter({ pageNum, totalPages, isLast }: { pageNum: number; totalPages: number; isLast: boolean }) {
  return (
    <div style={{ margin: '12px 28px 0', borderTop: `2px solid ${ACCENT}`, paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b' }}>
      <span>Page {pageNum} of {totalPages}</span>
      {isLast
        ? <span>This is a computer-generated invoice. No signature required unless mentioned.</span>
        : <span style={{ fontStyle: 'italic' }}>Continued on next page…</span>}
    </div>
  );
}

export default function Template02Modern({ data, settings: settingsProp }: Props) {
  const settings    = settingsProp ?? getInvoiceSettings();
  const pages      = paginateItems(data.items, 'modern');
  const totalPages = pages.length;
  let globalIndex  = 0;

  return (
    <>
      <style>{PRINT_CSS}</style>
      {pages.map((pageItems, pageIdx) => {
        const isLast     = pageIdx === totalPages - 1;
        const startIndex = globalIndex;
        globalIndex += pageItems.length;

        return (
          <div
            key={pageIdx}
            className="inv-page"
            style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '11px', color: '#1e293b', background: '#fff', width: '794px', minHeight: '1123px', boxSizing: 'border-box' }}
          >
            <PageHeader data={data} settings={settings} />

            <div style={{ padding: '0 28px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: '10px' }}>
                <TableHead />
                <ItemRows items={pageItems} startIndex={startIndex} />
              </table>
            </div>

            {isLast && <LastPageFooter data={data} settings={settings} />}

            <PageFooter pageNum={pageIdx + 1} totalPages={totalPages} isLast={isLast} />
          </div>
        );
      })}
    </>
  );
}