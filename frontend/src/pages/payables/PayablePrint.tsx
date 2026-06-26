import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../services/apiServices';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface PayableRow {
  id: number;
  billNo: string;
  billDate: string;
  vendorName: string;
  grandTotal: number;
  paymentPaid: number;
  balance: number;
}

interface PayablesResponse {
  rows: PayableRow[];
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function PayablePrint() {
  const [params] = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<PayablesResponse>({
    queryKey: ['payable-print', from, to],
    queryFn: () =>
      reportApi.payables(
        from && to ? { from, to } : {}
      ),
  });

  const rows: PayableRow[] = data?.rows || [];

  const formatINR = (value: number): string =>
    `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const totalPurchase: number = rows.reduce(
    (sum, r) => sum + Number(r.grandTotal || 0),
    0
  );
  const totalPaid: number = rows.reduce(
    (sum, r) => sum + Number(r.paymentPaid || 0),
    0
  );
  const totalOutstanding: number = rows.reduce(
    (sum, r) => sum + Number(r.balance || 0),
    0
  );

  const handleShare = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Payables Report', url: window.location.href });
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

    transform:scale(0.43);
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
                    PAYABLES REPORT
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
                  <p>
                    Total Bills:{' '}
                    <span className="font-semibold ml-2">{rows.length}</span>
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
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      Total Purchase Amount
                    </div>
                    <div className="text-2xl font-semibold text-slate-900 mt-1">
                      {formatINR(totalPurchase)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      Total Paid
                    </div>
                    <div className="text-2xl font-semibold text-emerald-700 mt-1">
                      {formatINR(totalPaid)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                      Outstanding Payables
                    </div>
                    <div className="text-2xl font-semibold text-red-700 mt-1">
                      {formatINR(totalOutstanding)}
                    </div>
                  </div>
                </div>

                {/* ── Empty State ── */}
                {rows.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-md py-16 flex flex-col items-center gap-2 text-center">
                    <p className="text-slate-600 font-semibold text-sm">
                      No payables found
                    </p>
                    <p className="text-slate-400 text-xs max-w-sm">
                      No payable records found for selected period.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Payables Detail Table ── */}
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Payables Detail — {rows.length} Bill{rows.length !== 1 ? 's' : ''}
                    </p>

                    <table className="w-full border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-2 border border-slate-700 text-center w-8">S.No</th>
                          <th className="p-2 border border-slate-700 text-left">Invoice No</th>
                          <th className="p-2 border border-slate-700 text-center">
                            Purchase Date
                          </th>
                          <th className="p-2 border border-slate-700 text-left">
                            Vendor Name
                          </th>
                          <th className="p-2 border border-slate-700 text-right">
                            Purchase Amount
                          </th>
                          <th className="p-2 border border-slate-700 text-right">
                            Paid Amount
                          </th>
                          <th className="p-2 border border-slate-700 text-right">
                            Outstanding
                          </th>
                          <th className="p-2 border border-slate-700 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, idx) => {
                          const isPaid = r.balance <= 0;
                          return (
                            <tr
                              key={r.id}
                              className={`print-break border-t border-slate-200 ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                              }`}
                            >
                              <td className="border border-slate-200 p-1.5 text-center font-bold">
                                {idx + 1}
                              </td>
                              <td className="border border-slate-200 p-1.5 font-bold text-slate-700">
                                {r.billNo}
                              </td>
                              <td className="border border-slate-200 p-1.5 text-center text-slate-500">
                                {r.billDate
                                  ? format(new Date(r.billDate), 'dd/MM/yyyy')
                                  : '—'}
                              </td>
                              <td className="border border-slate-200 p-2 font-semibold min-w-[150px]">
                                {r.vendorName}
                              </td>
                              <td className="border border-slate-200 p-1.5 text-right">
                                {formatINR(r.grandTotal)}
                              </td>
                              <td className="border border-slate-200 p-1.5 text-right text-emerald-700 font-medium">
                                {formatINR(r.paymentPaid)}
                              </td>
                              <td className="border border-slate-200 p-1.5 text-right font-bold text-red-600">
                                {r.balance > 0 ? formatINR(r.balance) : '—'}
                              </td>
                              <td className="border border-slate-200 p-1.5 text-center">
                                {isPaid ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                    PAID
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                    DUE
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                          <td colSpan={4} className="border border-slate-300 p-2">
                            Totals ({rows.length} bill{rows.length !== 1 ? 's' : ''})
                          </td>
                          <td className="border border-slate-300 p-2 text-right">
                            {formatINR(totalPurchase)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-emerald-700">
                            {formatINR(totalPaid)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right text-red-600">
                            {formatINR(totalOutstanding)}
                          </td>
                          <td className="border border-slate-300 p-2"></td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* ── Footer Summary Box ── */}
                    <div className="mt-8 border border-slate-300 rounded-md overflow-hidden shadow-sm">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Payables Summary
                        </h3>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total Purchase Amount</span>
                        <span className="font-semibold text-slate-900">
                          {formatINR(totalPurchase)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total Paid</span>
                        <span className="font-semibold text-emerald-700">
                          {formatINR(totalPaid)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 font-bold">
                        <span>Outstanding Payables</span>
                        <span className="font-semibold text-red-600">
                          {formatINR(totalOutstanding)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
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