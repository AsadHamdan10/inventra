import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { intermediaryApi } from '../../services/apiServices';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface IntermediaryDeal {
  id: number;
  sellerCompany: string;
  buyerCompany: string;
  materialName?: string;
  quantity: number;
  profitPerUnit: number;
  totalProfit: number;
  dealDate: string;
  notes?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function IntermediaryPrint() {
  const [params] = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<IntermediaryDeal[]>({
    queryKey: ['intermediary-print', from, to],
    queryFn: () =>
      intermediaryApi.list({
        from,
        to,
      }),
  });

  const deals: IntermediaryDeal[] = data || [];

  const formatINR = (value: number): string =>
    `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const totalDeals: number = deals.length;
  const totalQuantity: number = deals.reduce(
    (sum, d) => sum + Number(d.quantity || 0),
    0
  );
  const totalProfit: number = deals.reduce(
    (sum, d) => sum + Number(d.totalProfit || 0),
    0
  );
  const avgProfitPerUnit: number =
    totalQuantity > 0 ? totalProfit / totalQuantity : 0;

  const handleShare = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Intermediary Deal Register', url: window.location.href });
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
                    INTERMEDIARY DEAL REGISTER
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
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Deals
                    </div>
                    <div className="text-lg font-semibold text-slate-900 mt-1">
                      {totalDeals}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Quantity
                    </div>
                    <div className="text-lg font-semibold text-blue-700 mt-1">
                      {totalQuantity.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Avg Profit / Unit
                    </div>
                    <div className="text-lg font-semibold text-orange-700 mt-1">
                      {formatINR(avgProfitPerUnit)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Profit
                    </div>
                    <div className="text-lg font-semibold text-emerald-700 mt-1">
                      {formatINR(totalProfit)}
                    </div>
                  </div>
                </div>

                {/* ── Empty State ── */}
                {deals.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-md py-16 flex flex-col items-center gap-2 text-center">
                    <p className="text-slate-600 font-semibold text-sm">
                      No intermediary deals found
                    </p>
                    <p className="text-slate-400 text-xs max-w-sm">
                      No intermediary deals found for selected period.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Register Table ── */}
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Deal Detail — {deals.length} Record{deals.length !== 1 ? 's' : ''}
                    </p>

                    <table className="w-full border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-2 border border-slate-700 text-left">Date</th>
                          <th className="p-2 border border-slate-700 text-left">
                            Seller Company
                          </th>
                          <th className="p-2 border border-slate-700 text-left">
                            Buyer Company
                          </th>
                          <th className="p-2 border border-slate-700 text-left">Material</th>
                          <th className="p-2 border border-slate-700 text-right">Quantity</th>
                          <th className="p-2 border border-slate-700 text-right">
                            Profit / Unit
                          </th>
                          <th className="p-2 border border-slate-700 text-right">
                            Total Profit
                          </th>
                          <th className="p-2 border border-slate-700 text-left">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.map((d, idx) => (
                          <tr
                            key={d.id}
                            className={`print-break border-t border-slate-200 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            }`}
                          >
                            <td className="border border-slate-200 p-1.5 text-slate-600">
                              {d.dealDate ? format(new Date(d.dealDate), 'dd/MM/yyyy') : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 font-medium text-slate-800 min-w-[110px]">
                              {d.sellerCompany}
                            </td>
                            <td className="border border-slate-200 p-1.5 font-medium text-slate-800 min-w-[110px]">
                              {d.buyerCompany}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-slate-600">
                              {d.materialName || '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-slate-700">
                              {Number(d.quantity || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-blue-700">
                              {formatINR(d.profitPerUnit)}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right font-bold text-emerald-700">
                              {formatINR(d.totalProfit)}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-slate-500 max-w-[120px] truncate">
                              {d.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-bold">
                          <td colSpan={4} className="border border-slate-700 p-2">
                            Totals ({deals.length} deals)
                          </td>
                          <td className="border border-slate-700 p-2 text-right">
                            {totalQuantity.toLocaleString('en-IN')}
                          </td>
                          <td className="border border-slate-700 p-2 text-right">—</td>
                          <td className="border border-slate-700 p-2 text-right text-emerald-400">
                            {formatINR(totalProfit)}
                          </td>
                          <td className="border border-slate-700 p-2"></td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* ── Intermediary Profit Summary Box ── */}
                    <div className="mt-8 border border-slate-300 rounded-md overflow-hidden shadow-sm print-break">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Intermediary Profit Summary
                        </h3>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total Deals</span>
                        <span className="font-semibold text-slate-900">{totalDeals}</span>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total Quantity</span>
                        <span className="font-semibold text-blue-700">
                          {totalQuantity.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Average Profit Per Unit</span>
                        <span className="font-semibold text-orange-700">
                          {formatINR(avgProfitPerUnit)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 font-bold">
                        <span>Total Profit</span>
                        <span className="font-semibold text-emerald-700">
                          {formatINR(totalProfit)}
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