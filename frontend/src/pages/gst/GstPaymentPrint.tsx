import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { gstApi } from '../../services/apiServices';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface GstPayment {
  id: number;
  paymentMonth: string;
  amountPaid: number;
  paymentDate: string;
  reference?: string;
  notes?: string;
  igstPaid?: number;
  cgstPaid?: number;
  sgstPaid?: number;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function GstPaymentPrint() {
  const [params] = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<GstPayment[]>({
    queryKey: ['gst-payment-print', from, to],
    queryFn: () =>
      gstApi.payments({
        from,
        to,
      }),
  });

  const payments: GstPayment[] = data || [];

  const formatINR = (value: number): string =>
    `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const totalIgst = payments.reduce((sum, p) => sum + Number(p.igstPaid || 0), 0);
  const totalCgst = payments.reduce((sum, p) => sum + Number(p.cgstPaid || 0), 0);
  const totalSgst = payments.reduce((sum, p) => sum + Number(p.sgstPaid || 0), 0);
  const grandTotalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

  const handleShare = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'GST Payment Register', url: window.location.href });
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
                    GST PAYMENT REGISTER
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
                      Total GST Paid
                    </div>
                    <div className="text-base font-semibold text-emerald-700 mt-1">
                      {formatINR(grandTotalPaid)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      Payments
                    </div>
                    <div className="text-base font-semibold text-slate-900 mt-1">
                      {payments.length}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      IGST Paid
                    </div>
                    <div className="text-base font-semibold text-blue-700 mt-1">
                      {formatINR(totalIgst)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      CGST Paid
                    </div>
                    <div className="text-base font-semibold text-emerald-700 mt-1">
                      {formatINR(totalCgst)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      SGST Paid
                    </div>
                    <div className="text-base font-semibold text-purple-700 mt-1">
                      {formatINR(totalSgst)}
                    </div>
                  </div>
                </div>

                {/* ── Empty State ── */}
                {payments.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-md py-16 flex flex-col items-center gap-2 text-center">
                    <p className="text-slate-600 font-semibold text-sm">No payments found</p>
                    <p className="text-slate-400 text-xs max-w-sm">
                      No GST payments recorded for the selected period.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Payment Register Table ── */}
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Payment Detail — {payments.length} Record
                      {payments.length !== 1 ? 's' : ''}
                    </p>

                    <table className="w-full border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-2 border border-slate-700 text-left">Date</th>
                          <th className="p-2 border border-slate-700 text-left">
                            Challan No / Reference
                          </th>
                          <th className="p-2 border border-slate-700 text-left">Description</th>
                          <th className="p-2 border border-slate-700 text-right">IGST</th>
                          <th className="p-2 border border-slate-700 text-right">CGST</th>
                          <th className="p-2 border border-slate-700 text-right">SGST</th>
                          <th className="p-2 border border-slate-700 text-right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p, idx) => (
                          <tr
                            key={p.id}
                            className={`print-break border-t border-slate-200 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            }`}
                          >
                            <td className="border border-slate-200 p-1.5 text-slate-600">
                              {p.paymentDate ? format(new Date(p.paymentDate), 'dd/MM/yyyy') : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 font-mono text-slate-700">
                              {p.reference || '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-slate-700 min-w-[120px]">
                              {p.notes || `GST Return — ${p.paymentMonth}`}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-blue-700">
                              {p.igstPaid && p.igstPaid > 0 ? formatINR(p.igstPaid) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-emerald-700">
                              {p.cgstPaid && p.cgstPaid > 0 ? formatINR(p.cgstPaid) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-purple-700">
                              {p.sgstPaid && p.sgstPaid > 0 ? formatINR(p.sgstPaid) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right font-bold text-emerald-700">
                              {formatINR(p.amountPaid)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-bold">
                          <td colSpan={3} className="border border-slate-700 p-2">
                            Totals ({payments.length} payments)
                          </td>
                          <td className="border border-slate-700 p-2 text-right text-blue-400">
                            {formatINR(totalIgst)}
                          </td>
                          <td className="border border-slate-700 p-2 text-right text-emerald-400">
                            {formatINR(totalCgst)}
                          </td>
                          <td className="border border-slate-700 p-2 text-right text-purple-400">
                            {formatINR(totalSgst)}
                          </td>
                          <td className="border border-slate-700 p-2 text-right text-emerald-400">
                            {formatINR(grandTotalPaid)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* ── GST Payment Summary Box ── */}
                    <div className="mt-8 border border-slate-300 rounded-md overflow-hidden shadow-sm">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          GST Payment Summary
                        </h3>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total IGST Paid</span>
                        <span className="font-semibold text-blue-700">{formatINR(totalIgst)}</span>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total CGST Paid</span>
                        <span className="font-semibold text-emerald-700">
                          {formatINR(totalCgst)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total SGST Paid</span>
                        <span className="font-semibold text-purple-700">
                          {formatINR(totalSgst)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 font-bold">
                        <span>Grand Total GST Paid</span>
                        <span className="font-semibold text-slate-900">
                          {formatINR(grandTotalPaid)}
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