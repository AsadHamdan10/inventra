// ── Template 01: Classic GST Invoice ─────────────────────────
// Traditional GST invoice for traders, distributors & manufacturers.
// Multi-page A4 support: header repeats, footer only on last page.

import { InvoiceData, InvoiceItem, fmt, fmtDate, companyAddressLines } from './invoiceTypes';
import { paginateItems, A4_WIDTH_PX, A4_HEIGHT_PX, PRINT_CSS } from './invoicePagination';
import { InvoiceSettings, getInvoiceSettings } from './invoiceSettings';
import AddressBlock from './AddressBlock';

interface Props { data: InvoiceData; settings?: InvoiceSettings; }

// ── Accent colour ─────────────────────────────────────────────
const ACCENT = '#233876';

// ── Page header (repeated on every page) ─────────────────────
function PageHeader({ data, settings }: { data: InvoiceData; settings: InvoiceSettings }) {
  return (
    <div>

  <div
  style={{
    textAlign: 'center',
    fontSize: '24px',
    fontWeight: '700',
    color: ACCENT,
    letterSpacing: '2px',
    marginBottom: '14px',
    paddingBottom: '8px',
    borderBottom: `2px solid ${ACCENT}`,
    textTransform: 'uppercase',
  }}
>
    {data.invoiceLabel ?? 'Tax Invoice'}
  </div>

  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    }}
  >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        
        
      </div>
      </div>

      {/* Traditional Tally Style Header Grid */}

<table
  style={{
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
    fontSize: '11px',
    border: '1px solid #d1d5db',
  }}
>
  <tbody>
    <tr>
      <td
        style={{
          width: '50%',
          border: '1px solid #d1d5db',
          verticalAlign: 'top',
          padding: '8px',
        }}
      >
        <div
  style={{
    fontWeight: '700',
    fontSize: '18px',
    color: ACCENT,
    marginBottom: '0px',
  }}
>
          {data.company.companyName}
        </div>

        <AddressBlock
          text={companyAddressLines(data.company)}
          settings={settings}
          style={{ fontSize: '14px' }}
        />

        {data.company.mobile && (
          <div style={{ fontSize:'14px'}}><strong>Mobile :</strong> {data.company.mobile}</div>
        )}

        {data.company.email && (
          <div style={{ fontSize:'14px'}}><strong>Email :</strong> {data.company.email}</div>
        )}
      </td>

      <td
        style={{
          width: '50%',
          border: '1px solid #d1d5db',
          verticalAlign: 'top',
          padding: '8px',
        }}
      >
        {data.company.gstin && (
          <div style={{ fontSize:'14px'}}><strong>GSTIN :</strong> {data.company.gstin}</div>
        )}

        <div style={{ fontSize:'14px'}}>
          <strong>Date :</strong> {fmtDate(data.invoiceDate)}
        </div>

        <div style={{ fontSize:'14px'}}>
          <strong>Invoice No :</strong> {data.invoiceNo}
        </div>

        {data.dueDate && (
          <div style={{ fontSize:'14px'}}>
            <strong>Due Date :</strong> {fmtDate(data.dueDate)}
          </div>
        )}

        {data.poNo ? (
  <div style={{ marginTop: '3px',fontSize:'14px' }}>
    <strong>Buyer's Order No :</strong> {data.poNo}
  </div>
) : (
  <div style={{ marginTop: '3px',fontSize:'14px' }}>
    <strong>Buyer's Order No :</strong> -
  </div>
)}
      </td>
    </tr>

    <tr>
      <td
        style={{
          border: '1px solid #d1d5db',
          verticalAlign: 'top',
          padding: '8px',
        }}
      >
        <div
  style={{
    fontWeight: 'bold',
    marginBottom: '8px',
    background: '#eff6ff',
    color: ACCENT,
    padding: '6px 8px',
    borderRadius: '3px',
    fontSize: '16px'
  }}
>
  Buyer (Bill To)
</div>

        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
  {data.partyName}
</div>

{data.partyAddress && (
  <AddressBlock
    text={data.partyAddress}
    settings={settings}
    style={{ marginTop: '4px', lineHeight: '1.5', fontSize: '13px' }}
  />
)}

        {data.partyGstin && (
  <div style={{ marginTop: '4px',fontSize:'13px' }}>
    <strong>GSTIN :</strong> {data.partyGstin}
  </div>
)}

{data.partyMobile && (
  <div style={{ marginTop: '4px',fontSize:'13px' }}>
    <strong>Mobile :</strong> {data.partyMobile}
  </div>
)}
      </td>

      <td
        style={{
          border: '1px solid #d1d5db',
          verticalAlign: 'top',
          padding: '8px',
        }}
      >
        <div
  style={{
    fontWeight: 'bold',
    marginBottom: '8px',
    background: '#eff6ff',
    color: ACCENT,
    padding: '6px 8px',
    borderRadius: '3px',
    fontSize:'16px'
  }}
>
  Delivery At
</div>

        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
  {data.partyName}
</div>

{(data.deliveryAddress || data.partyAddress) && (
  <AddressBlock
    text={data.deliveryAddress || data.partyAddress}
    settings={settings}
    style={{ marginTop: '4px', lineHeight: '1.5', fontSize: '13px' }}
  />
)}

        <>
  {data.partyMobile && (
    <div style={{ marginBottom: '4px',fontSize:'13px' }}>
      <strong>Mobile :</strong> {data.partyMobile}
    </div>
  )}

  <div style={{fontSize:'13px'}}>
    <strong>Place of Supply :</strong>{' '}
    {data.isInterState ? 'Tamil Nadu' : data.company.state}
  </div>
</>
      </td>
    </tr>
  </tbody>
</table>
    </div>
  );
}

// ── Item table header row (repeated on every page) ────────────
function TableHead() {
  return (
    <thead>
      <tr
  style={{
    background: ACCENT,
    color: '#fff',
    borderBottom: '2px solid #1e3a8a',
  }}
>
        {['#', 'Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'GST%', 'GST Amt', 'Total'].map((h) => (
          <th
  key={h}
  style={{
    fontSize:'14px',
    padding: '8px 6px',
    textAlign:
      h === '#'
        ? 'center'
        : h === 'Qty'
        ? 'center'
        : h === 'GST%'
        ? 'center'
        : ['Rate', 'Taxable', 'GST Amt', 'Total'].includes(h)
        ? 'right'
        : 'center',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  }}
>{h}</th>
        ))}
      </tr>
    </thead>
  );
}

// ── Item rows ─────────────────────────────────────────────────
function ItemRows({ items, startIndex }: { items: InvoiceItem[]; startIndex: number }) {
  return (
    <tbody>
      {items.map((it, i) => (
        <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background:
  (startIndex + i) % 2 === 0
    ? '#fcfcfd'
    : '#ffffff' }}>
          <td style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280',fontSize: '13px' }}>{startIndex + i + 1}</td>
          <td style={{padding: '8px 6px',fontWeight: '600',lineHeight: '1.6',fontSize: '13px'}}>{it.materialName}</td>
          <td style={{ padding: '8px 6px', color: '#000000', textAlign: 'center',fontSize: '13px' }}>{it.hsnCode || '—'}</td>
          <td style={{ padding: '8px 6px', textAlign: 'center',fontSize: '13px' }}>{it.quantity}</td>
          <td style={{ padding: '8px 6px', textAlign: 'right',fontSize: '13px' }}>{fmt(it.unitPrice)}</td>
          <td style={{ padding: '8px 6px', textAlign: 'right',fontSize: '13px' }}>{fmt(it.taxableAmount)}</td>
          <td style={{ padding: '8px 6px', textAlign: 'center',fontSize: '13px' }}>{it.gstPercent}%</td>
          <td style={{ padding: '8px 6px', textAlign: 'right', color: '#000000',
fontWeight: '700',fontSize: '13px' }}>{fmt(it.gstAmount)}</td>
          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '700',fontSize: '13px' }}>{fmt(it.itemTotal)}</td>
        </tr>
      ))}
    </tbody>
  );
}

// ── Last-page footer: GST summary, totals, bank, signature ───
function LastPageFooter({ data, settings }: { data: InvoiceData; settings: InvoiceSettings }) {
  const isIGST = data.isInterState;
  const balance = (data.grandTotal ?? 0) - (data.paymentReceived ?? 0);

  return (
    <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      {/* GST Summary + Totals */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
        {/* GST Breakdown */}
        <div
  style={{
    flex: 1,
    border: '1px solid #dbeafe',
    borderRadius: '4px',
    padding: '10px',
    background: '#ffffff',
  }}
>
          <div style={{ fontWeight: 'bold', color: ACCENT, fontSize: '12px', textTransform: 'uppercase', marginBottom: '6px' }}>GST Summary</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e5e7eb' }}>
            <thead>
              <tr
  style={{
    background: '#eff6ff',
    color: ACCENT,
  }}
>
                <th style={{ padding: '4px 6px', textAlign: 'left', fontSize:'10px'}}>GST %</th>
                <th style={{ padding: '4px 6px', textAlign: 'right', fontSize:'10px' }}>Taxable</th>
                {isIGST
                  ? <th style={{ padding: '4px 6px', textAlign: 'right', fontSize:'10px' }}>IGST</th>
                  : <><th style={{ padding: '4px 6px', textAlign: 'right', fontSize:'10px' }}>CGST</th><th style={{ padding: '4px 6px', textAlign: 'right' }}>SGST</th></>}
                <th style={{ padding: '4px 6px', textAlign: 'right', fontSize:'10px' }}>Total GST</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set(data.items.map((i) => i.gstPercent))).map((rate) => {
                const group   = data.items.filter((i) => i.gstPercent === rate);
                const taxable = group.reduce(
  (s, i) => s + Number(i.taxableAmount || 0),
  0
);

const gst = group.reduce(
  (s, i) => s + Number(i.gstAmount || 0),
  0
);
                return (
                  <tr key={rate} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '4px 6px' }}>{rate}%</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(taxable)}</td>
                    {isIGST
                      ? <td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(gst)}</td>
                      : <><td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(gst / 2)}</td><td style={{ padding: '4px 6px', textAlign: 'right' }}>{fmt(gst / 2)}</td></>}
                    <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '600' }}>{fmt(gst)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div
  style={{
    minWidth: '240px',
    border: '1px solid #dbeafe',
    borderRadius: '4px',
    overflow: 'hidden',
    background: '#fff',
  }}
>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontWeight: 'bold'}}>
            <tbody>
              {[
                ['Taxable Amount', fmt(data.totalTaxable)],
                isIGST  ? ['IGST',  fmt(data.igstAmount)]  : null,
                !isIGST ? ['CGST',  fmt(data.cgstAmount)]  : null,
                !isIGST ? ['SGST',  fmt(data.sgstAmount)]  : null,
                data.otherExpense ? ['Other Expense', fmt(data.otherExpense)] : null,
                data.roundOff     ? ['Round Off',     fmt(data.roundOff)]     : null,
              ].filter(Boolean).map((row: any, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '4px 6px', color: '#374151' }}>{row[0]}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right' }}>{row[1]}</td>
                </tr>
              ))}
              <tr
  style={{
    background: ACCENT,
    color: '#fff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
  }}
>
                <td style={{ padding: '6px 8px', fontWeight: 'bold', fontSize: '12px' }}>Grand Total</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px' }}>{fmt(data.grandTotal)}</td>
              </tr>
              {settings.showPaymentStatus && (data.paymentReceived ?? 0) > 0 && (<>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '4px 6px', color: '#15803d',
fontWeight: '700' }}>Amount Received</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', color: '#16a34a' }}>{fmt(data.paymentReceived ?? 0)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 6px', color: balance > 0 ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>Balance Due</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: balance > 0 ? '#dc2626' : '#16a34a' }}>{fmt(balance)}</td>
                </tr>
              </>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in Words */}
      {data.amountInWords && (
        <div style={{ background: '#f8fafc',
border: '1px solid #dbeafe', borderRadius: '4px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px' }}>
          <span style={{ color: '#171718',fontWeight:'bold' }}>Amount in Words: </span>
          <span style={{ fontWeight: '600', color: ACCENT,fontSize:'12px'}}>INR {data.amountInWords}</span>
        </div>
      )}

      {/* Bank Details */}
      {settings.showBankDetails && (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '2px', padding: '10px', marginBottom: '12px', fontSize: '12px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div style={{ fontWeight: 'bold', color: ACCENT, marginBottom: '6px', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>Bank Details</div>
          <div style={{ display: 'flex', gap: '40px',fontSize:'12px' }}>
            {[
  ['Bank Name', data.bankName],
  ['Account No', data.accountNumber],
  ['IFSC Code', data.ifscCode],
  ['Branch', data.branchName]
].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>{k}</div>
                <div style={{ fontWeight: '600' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes + Terms + Signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <div style={{ fontSize: '10px', color: '#374151', maxWidth: '60%' }}>
          {settings.showTerms && data.termsAndConditions && (
            <><div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Terms & Conditions:</div><div style={{ color: '#6b7280' }}>{data.termsAndConditions}</div></>
          )}
          {settings.showNotes && data.notes && (
            <div style={{ marginTop: '6px', color: '#6b7280' }}><span style={{ fontWeight: 'bold' }}>Notes: </span>{data.notes}</div>
          )}
        </div>
        {settings.showSignature && (
          <div
    style={{
      textAlign: 'center',
      minWidth: '180px',
    }}
  >
            <div style={{ borderTop: '1px solid #9ca3af', paddingTop: '4px', width: '180px', fontSize: '10px', color: '#374151' }}>Authorised Signatory</div>
            <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '2px' }}>{data.company.companyName}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page footer bar ───────────────────────────────────────────
function PageFooter({ pageNum, totalPages, isLast }: { pageNum: number; totalPages: number; isLast: boolean }) {
  return (
    <div style={{ borderTop: `1px solid ${ACCENT}`, marginTop: '16px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#6b7280' }}>
      <span>Page {pageNum} of {totalPages}</span>
      {isLast && <span>This is a computer-generated invoice. No signature required unless mentioned.</span>}
      {!isLast && <span style={{ fontStyle: 'italic' }}>Continued on next page…</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function Template01Classic({ data, settings: settingsProp }: Props) {
  const settings = settingsProp ?? getInvoiceSettings();
  const pages      = paginateItems(data.items, 'classic');
  const totalPages = pages.length;

  let globalIndex = 0;

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
  style={{
    fontFamily: 'Arial, sans-serif',
    fontSize: '11px',
    color: '#111',
    background: '#fff',
    padding: '18px',
    border: '1px solid #d1d5db',
    boxSizing: 'border-box',
    width: `${794}px`,
    minHeight: `${1123}px`,
              position:    'relative',
            }}
          >
            {/* Repeated header on every page */}
            <PageHeader data={data} settings={settings} />

            {/* Item table */}
            <table
  style={{
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '16px',
    fontSize: '10px',
    border: '1px solid #dbeafe',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }}
>
              <TableHead />
              <ItemRows items={pageItems} startIndex={startIndex} />
            </table>

            {/* Last-page content */}
            {isLast && <LastPageFooter data={data} settings={settings} />}

            {/* Page footer */}
            <PageFooter pageNum={pageIdx + 1} totalPages={totalPages} isLast={isLast} />
          </div>
        );
      })}
    </>
  );
}