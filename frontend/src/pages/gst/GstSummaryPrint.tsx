import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { gstApi } from '../../services/apiServices';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface GstBucket {
  igst: number;
  cgst: number;
  sgst: number;
}

interface GstUtilization {
  igstVsIgst: number;
  igstVsCgst: number;
  igstVsSgst: number;
  cgstVsCgst: number;
  sgstVsSgst: number;
}

interface GstSalesRow {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  companyName: string;
  grandTotal: number;
  _igst: number;
  _cgst: number;
  _sgst: number;
}

interface GstPurchaseRow {
  id: number;
  billNo: string;
  billDate: string;
  vendorName: string;
  _igst: number;
  _cgst: number;
  _sgst: number;
}

interface GstSummaryResponse {
  opening: GstBucket;
  output: GstBucket;
  itcFromPurchases: GstBucket;
  itcFromInputBills: GstBucket;
  itcFromAdjustments: number;
  totalAvailable: GstBucket;
  utilization: GstUtilization;
  totalUtilized: GstBucket;
  cashPayable: GstBucket;
  totalCashPayable: number;
  closing: GstBucket;
  gstPaid: number;
  balanceRemaining: number;
  salesRows: GstSalesRow[];
  purchaseRows: GstPurchaseRow[];
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function GstSummaryPrint() {
  const [params] = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<GstSummaryResponse>({
    queryKey: ['gst-summary-print', from, to],
    queryFn: () =>
      gstApi.summary({
        from,
        to,
      }),
  });

  const formatINR = (value: number): string =>
    `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const bucketTotal = (b: GstBucket | undefined): number =>
    Number(b?.igst || 0) + Number(b?.cgst || 0) + Number(b?.sgst || 0);

  const handleShare = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'GST Summary Report', url: window.location.href });
      } catch (_) {
        // user cancelled share — no-op
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Report link copied.');
      } catch (_) {
        // clipboard failed — no-op
      }
    }
  };

  const Toolbar = () => (
    <div
      className="
        flex flex-wrap
        justify-between
        items-center
        gap-1 md:gap-2
        bg-white
        border
        border-slate-200
        rounded-lg
        shadow-sm
        py-2 md:py-3
        px-2 md:px-4
        print:hidden
        w-full
        max-w-[794px]
        mx-auto
      "
    >
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1 px-2 py-1.5 md:px-4 md:py-2 bg-white border border-slate-300 rounded-md text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
      >
        ← Back
      </button>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1 px-2 py-1.5 md:px-4 md:py-2 bg-slate-100 border border-slate-300 rounded-md text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-200 transition-all"
        >
          📤 Share
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 px-2 py-1.5 md:px-4 md:py-2 bg-slate-700 text-white rounded-md text-xs md:text-sm font-medium hover:bg-slate-600 transition-all"
        >
          💾 Save PDF
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 px-2 py-1.5 md:px-4 md:py-2 bg-slate-900 text-white rounded-md text-xs md:text-sm font-medium hover:bg-slate-800 transition-all"
        >
          🖨 Print
        </button>
      </div>
    </div>
  );

  const opening = data?.opening ?? { igst: 0, cgst: 0, sgst: 0 };
  const output = data?.output ?? { igst: 0, cgst: 0, sgst: 0 };
  const itcFromPurchases = data?.itcFromPurchases ?? { igst: 0, cgst: 0, sgst: 0 };
  const itcFromInputBills = data?.itcFromInputBills ?? { igst: 0, cgst: 0, sgst: 0 };
  const itcFromAdjustments = Number(data?.itcFromAdjustments || 0);
  const totalAvailable = data?.totalAvailable ?? { igst: 0, cgst: 0, sgst: 0 };
  const utilization = data?.utilization ?? {
    igstVsIgst: 0,
    igstVsCgst: 0,
    igstVsSgst: 0,
    cgstVsCgst: 0,
    sgstVsSgst: 0,
  };
  const totalUtilized = data?.totalUtilized ?? { igst: 0, cgst: 0, sgst: 0 };
  const cashPayable = data?.cashPayable ?? { igst: 0, cgst: 0, sgst: 0 };
  const totalCashPayable = Number(data?.totalCashPayable || 0);
  const closing = data?.closing ?? { igst: 0, cgst: 0, sgst: 0 };
  const gstPaid = Number(data?.gstPaid || 0);
  const balanceRemaining = Number(data?.balanceRemaining || 0);
  const salesRows = data?.salesRows ?? [];
  const purchaseRows = data?.purchaseRows ?? [];

  const salesTotals = salesRows.reduce(
    (acc, s) => ({
      igst: acc.igst + Number(s._igst || 0),
      cgst: acc.cgst + Number(s._cgst || 0),
      sgst: acc.sgst + Number(s._sgst || 0),
      grandTotal: acc.grandTotal + Number(s.grandTotal || 0),
    }),
    { igst: 0, cgst: 0, sgst: 0, grandTotal: 0 }
  );

  const purchaseTotals = purchaseRows.reduce(
    (acc, p) => ({
      igst: acc.igst + Number(p._igst || 0),
      cgst: acc.cgst + Number(p._cgst || 0),
      sgst: acc.sgst + Number(p._sgst || 0),
    }),
    { igst: 0, cgst: 0, sgst: 0 }
  );

  /* Row helper for the GST summary table */
  const GstRow = ({
    label,
    bucket,
    bold,
    rowClass,
  }: {
    label: string;
    bucket: GstBucket;
    bold?: boolean;
    rowClass?: string;
  }) => (
    <tr className={`border-t border-slate-200 ${rowClass || ''}`}>
      <td className={`border border-slate-200 p-1.5 ${bold ? 'font-bold' : ''}`}>{label}</td>
      <td className="border border-slate-200 p-1.5 text-right text-blue-700">
        {bucket.igst > 0 ? formatINR(bucket.igst) : '—'}
      </td>
      <td className="border border-slate-200 p-1.5 text-right text-emerald-700">
        {bucket.cgst > 0 ? formatINR(bucket.cgst) : '—'}
      </td>
      <td className="border border-slate-200 p-1.5 text-right text-purple-700">
        {bucket.sgst > 0 ? formatINR(bucket.sgst) : '—'}
      </td>
      <td className={`border border-slate-200 p-1.5 text-right ${bold ? 'font-bold' : 'font-semibold'}`}>
        {formatINR(bucketTotal(bucket))}
      </td>
    </tr>
  );

  return (
    <>
      <style>{`

  .report-sheet{
  width:794px;
  min-height:1123px;
}

@media (max-width:768px){

  .report-sheet{
    width:794px;
    min-height:1123px;

    transform:scale(0.7);
    transform-origin:top center;
  }
}

  @media print {

    @page{
      size:A4 portrait;
      margin:8mm;
    }

    .print\\:hidden{
      display:none !important;
    }

    body{
      zoom:92%;
      -webkit-print-color-adjust:exact;
      print-color-adjust:exact;
    }

    .report-sheet{
      width:auto !important;
      transform:none !important;
      margin:0 !important;
      box-shadow:none !important;
    }

    .print-break{
      page-break-inside:avoid;
      break-inside:avoid;
    }
  }

`}</style>

      <div
        className="
          bg-slate-100
          min-h-screen
          overflow-auto
        "
      >
        {/* Sticky top toolbar */}
        <div className="sticky top-0 z-30 bg-slate-100 pb-3 px-2">
          <Toolbar />
        </div>

        <div className="flex justify-center">
          <div
            className="
              report-sheet
              mx-auto
              bg-white
              text-black
              p-8
              shadow-sm
              my-6
            "
          >
            {/* ── Header ── */}
            <div className="border-b border-slate-300 pb-5 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 uppercase">
                    {user?.companyName || 'Company Name'}
                  </h1>
                  <p className="text-xs tracking-[0.30em] uppercase text-slate-500 mt-1">
                    GST SUMMARY REPORT
                  </p>
                  <p className="text-sm font-semibold text-slate-700 mt-2">
                    GSTR-3B Style — Section 49 ITC Utilization
                  </p>
                </div>
                <div className="text-right text-sm text-slate-700">
                  <p>
                    From: <span className="font-semibold ml-2">{from || 'Beginning'}</span>
                  </p>
                  <p>
                    To: <span className="font-semibold ml-2">{to || 'Today'}</span>
                  </p>
                  <p>
                    Printed:{' '}
                    <span className="font-semibold ml-2">
                      {format(new Date(), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* ── Loading State ── */}
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Spinner />
              </div>
            ) : (
              <>
                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-5 gap-3 mb-8">
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      Output GST
                    </div>
                    <div className="text-base font-semibold text-red-700 mt-1">
                      {formatINR(bucketTotal(output))}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      ITC Available
                    </div>
                    <div className="text-base font-semibold text-blue-700 mt-1">
                      {formatINR(bucketTotal(totalAvailable))}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      ITC Utilized
                    </div>
                    <div className="text-base font-semibold text-emerald-700 mt-1">
                      {formatINR(bucketTotal(totalUtilized))}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      Cash Payable
                    </div>
                    <div className="text-base font-semibold text-orange-700 mt-1">
                      {formatINR(totalCashPayable)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      Closing ITC
                    </div>
                    <div className="text-base font-semibold text-slate-900 mt-1">
                      {formatINR(bucketTotal(closing))}
                    </div>
                  </div>
                </div>

                {/* ── GST Summary Table ── */}
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  GST Ledger Summary — Section 49, CGST Act 2017
                </p>

                <table className="w-full border border-slate-300 text-xs mb-8">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2 border border-slate-700 text-left">Particular</th>
                      <th className="p-2 border border-slate-700 text-right">IGST</th>
                      <th className="p-2 border border-slate-700 text-right">CGST</th>
                      <th className="p-2 border border-slate-700 text-right">SGST</th>
                      <th className="p-2 border border-slate-700 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <GstRow
                      label="3.1 — Output Tax Liability (Sales)"
                      bucket={output}
                      bold
                      rowClass="bg-red-50"
                    />

                    <tr className="bg-slate-100">
                      <td colSpan={5} className="p-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        4 — Input Tax Credit Available
                      </td>
                    </tr>
                    {bucketTotal(opening) > 0 && (
                      <GstRow label="↩ Opening ITC (Carried Forward)" bucket={opening} />
                    )}
                    <GstRow label="4A — Purchase ITC" bucket={itcFromPurchases} />
                    <GstRow label="4B — GST Input Bills" bucket={itcFromInputBills} />
                    {itcFromAdjustments > 0 && (
                      <GstRow
                        label="4C — GST Adjustments (IGST)"
                        bucket={{ igst: itcFromAdjustments, cgst: 0, sgst: 0 }}
                      />
                    )}
                    <GstRow
                      label="Total ITC Available"
                      bucket={totalAvailable}
                      bold
                      rowClass="bg-blue-50"
                    />

                    <tr className="bg-slate-100">
                      <td colSpan={5} className="p-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        5 — ITC Utilization (Section 49 Order)
                      </td>
                    </tr>
                    <GstRow
                      label="Step 1: IGST ITC → IGST Liability"
                      bucket={{ igst: utilization.igstVsIgst, cgst: 0, sgst: 0 }}
                    />
                    <GstRow
                      label="Step 2: IGST ITC → CGST Liability"
                      bucket={{ igst: 0, cgst: utilization.igstVsCgst, sgst: 0 }}
                    />
                    <GstRow
                      label="Step 3: IGST ITC → SGST Liability"
                      bucket={{ igst: 0, cgst: 0, sgst: utilization.igstVsSgst }}
                    />
                    <GstRow
                      label="Step 4: CGST ITC → CGST Liability"
                      bucket={{ igst: 0, cgst: utilization.cgstVsCgst, sgst: 0 }}
                    />
                    <GstRow
                      label="Step 5: SGST ITC → SGST Liability"
                      bucket={{ igst: 0, cgst: 0, sgst: utilization.sgstVsSgst }}
                    />
                    <GstRow
                      label="Total ITC Utilized"
                      bucket={totalUtilized}
                      bold
                      rowClass="bg-emerald-50"
                    />

                    <tr className="bg-slate-100">
                      <td colSpan={5} className="p-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        6 — Cash Ledger Payable
                      </td>
                    </tr>
                    <GstRow
                      label="Cash Payable (Output − ITC)"
                      bucket={cashPayable}
                      bold
                      rowClass="bg-red-50"
                    />

                    <tr className="bg-slate-100">
                      <td colSpan={5} className="p-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        7 — Closing ITC (Carry Forward to Next Period)
                      </td>
                    </tr>
                    <GstRow
                      label="Closing ITC Balance"
                      bucket={closing}
                      bold
                      rowClass="bg-blue-50"
                    />
                  </tbody>
                </table>

                {/* ── Sales GST Detail Table ── */}
                <div className="print-break mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Sales — GST Collected ({salesRows.length} Invoice
                    {salesRows.length !== 1 ? 's' : ''})
                  </p>

                  {salesRows.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3">No sales invoices in this period.</p>
                  ) : (
                    <table className="w-full border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-2 border border-slate-700 text-left">Invoice No</th>
                          <th className="p-2 border border-slate-700 text-left">Date</th>
                          <th className="p-2 border border-slate-700 text-left">Customer</th>
                          <th className="p-2 border border-slate-700 text-right">IGST</th>
                          <th className="p-2 border border-slate-700 text-right">CGST</th>
                          <th className="p-2 border border-slate-700 text-right">SGST</th>
                          <th className="p-2 border border-slate-700 text-right">Total GST</th>
                          <th className="p-2 border border-slate-700 text-right">Invoice Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesRows.map((s, idx) => (
                          <tr
                            key={s.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                          >
                            <td className="border border-slate-200 p-1.5 font-medium">{s.invoiceNo}</td>
                            <td className="border border-slate-200 p-1.5 text-slate-600">
                              {s.invoiceDate ? format(new Date(s.invoiceDate), 'dd/MM/yyyy') : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 min-w-[120px]">{s.companyName}</td>
                            <td className="border border-slate-200 p-1.5 text-right text-blue-700">
                              {s._igst > 0 ? formatINR(s._igst) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-emerald-700">
                              {s._cgst > 0 ? formatINR(s._cgst) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-purple-700">
                              {s._sgst > 0 ? formatINR(s._sgst) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right font-semibold">
                              {formatINR(s._igst + s._cgst + s._sgst)}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right font-bold">
                              {formatINR(s.grandTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                          <td colSpan={3} className="border border-slate-300 p-2">
                            Totals ({salesRows.length} invoices)
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-blue-700">
                            {formatINR(salesTotals.igst)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-emerald-700">
                            {formatINR(salesTotals.cgst)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-purple-700">
                            {formatINR(salesTotals.sgst)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right">
                            {formatINR(salesTotals.igst + salesTotals.cgst + salesTotals.sgst)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right">
                            {formatINR(salesTotals.grandTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>

                {/* ── Purchase ITC Detail Table ── */}
                <div className="print-break mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Purchases — ITC Claimable ({purchaseRows.length} Bill
                    {purchaseRows.length !== 1 ? 's' : ''})
                  </p>

                  {purchaseRows.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3">No purchase bills in this period.</p>
                  ) : (
                    <table className="w-full border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-2 border border-slate-700 text-left">Bill No</th>
                          <th className="p-2 border border-slate-700 text-left">Date</th>
                          <th className="p-2 border border-slate-700 text-left">Vendor</th>
                          <th className="p-2 border border-slate-700 text-right">IGST ITC</th>
                          <th className="p-2 border border-slate-700 text-right">CGST ITC</th>
                          <th className="p-2 border border-slate-700 text-right">SGST ITC</th>
                          <th className="p-2 border border-slate-700 text-right">Total ITC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseRows.map((p, idx) => (
                          <tr
                            key={p.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                          >
                            <td className="border border-slate-200 p-1.5 font-medium">{p.billNo}</td>
                            <td className="border border-slate-200 p-1.5 text-slate-600">
                              {p.billDate ? format(new Date(p.billDate), 'dd/MM/yyyy') : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 min-w-[120px]">{p.vendorName}</td>
                            <td className="border border-slate-200 p-1.5 text-right text-blue-700">
                              {p._igst > 0 ? formatINR(p._igst) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-emerald-700">
                              {p._cgst > 0 ? formatINR(p._cgst) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-purple-700">
                              {p._sgst > 0 ? formatINR(p._sgst) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right font-semibold text-emerald-700">
                              {formatINR(p._igst + p._cgst + p._sgst)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                          <td colSpan={3} className="border border-slate-300 p-2">
                            Totals ({purchaseRows.length} bills)
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-blue-700">
                            {formatINR(purchaseTotals.igst)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-emerald-700">
                            {formatINR(purchaseTotals.cgst)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-purple-700">
                            {formatINR(purchaseTotals.sgst)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-emerald-700">
                            {formatINR(purchaseTotals.igst + purchaseTotals.cgst + purchaseTotals.sgst)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>

                {/* ── GST Financial Summary Box ── */}
                <div className="mt-8 border border-slate-300 rounded-md overflow-hidden shadow-sm print-break">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      GST Financial Summary
                    </h3>
                  </div>
                  <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                    <span>Output GST</span>
                    <span className="font-semibold text-red-700">
                      {formatINR(bucketTotal(output))}
                    </span>
                  </div>
                  <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                    <span>Total ITC Available</span>
                    <span className="font-semibold text-blue-700">
                      {formatINR(bucketTotal(totalAvailable))}
                    </span>
                  </div>
                  <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                    <span>Total ITC Utilized</span>
                    <span className="font-semibold text-emerald-700">
                      {formatINR(bucketTotal(totalUtilized))}
                    </span>
                  </div>
                  <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                    <span>Cash Payable</span>
                    <span className="font-semibold text-orange-700">
                      {formatINR(totalCashPayable)}
                    </span>
                  </div>
                  <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                    <span>GST Paid (Period)</span>
                    <span className="font-semibold text-emerald-700">{formatINR(gstPaid)}</span>
                  </div>
                  <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                    <span>Balance Remaining</span>
                    <span
                      className={`font-semibold ${
                        balanceRemaining > 0 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {balanceRemaining > 0 ? formatINR(balanceRemaining) : 'Fully Paid'}
                    </span>
                  </div>
                  <div className="flex justify-between px-5 py-4 font-bold">
                    <span>Closing ITC Balance</span>
                    <span className="font-semibold text-slate-900">
                      {formatINR(bucketTotal(closing))}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* ── Document Footer ── */}
            <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-400">
              <span>Generated by {user?.companyName || 'Company'}</span>
              <span>Printed on {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="print:hidden">
          <Toolbar />
        </div>
      </div>
    </>
  );
}

/* ─── Local Spinner ───────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div
      className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"
      role="status"
      aria-label="Loading"
    />
  );
}