import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../services/apiServices';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface LedgerEntry {
  date: string;
  type: 'Sale' | 'Purchase' | 'Expense' | 'Bank credit' | 'Bank debit';
  ref: string;
  party: string;
  credit: number;
  debit: number;
}

interface LedgerResponse {
  openingBalance: number;
  totalCredit: number;
  totalDebit: number;
  ledger: LedgerEntry[];
}

interface LedgerRow extends LedgerEntry {
  runningBalance: number;
}

/* ─── Badge colours ─────────────────────────────────────────────────────── */
const TYPE_BADGE: Record<LedgerEntry['type'], string> = {
  Sale: 'bg-emerald-100 text-emerald-700',
  'Bank credit': 'bg-emerald-100 text-emerald-700',
  Purchase: 'bg-blue-100 text-blue-700',
  Expense: 'bg-red-100 text-red-700',
  'Bank debit': 'bg-red-100 text-red-700',
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function LedgerPrint() {
  const [params] = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<LedgerResponse>({
    queryKey: ['ledger-print', from, to],
    queryFn: () =>
      reportApi.ledger({
        from,
        to,
      }),
  });

  const openingBalance: number = Number(data?.openingBalance || 0);
  const rows: LedgerEntry[] = data?.ledger || [];

  const rowsWithBalance: LedgerRow[] = (() => {
    let balance = openingBalance;
    return rows.map((row) => {
      balance += row.credit - row.debit;
      return {
        ...row,
        runningBalance: balance,
      };
    });
  })();

  const totalCredit: number = rows.reduce(
    (sum, row) => sum + Number(row.credit || 0),
    0
  );
  const totalDebit: number = rows.reduce(
    (sum, row) => sum + Number(row.debit || 0),
    0
  );
  const closingBalance: number = openingBalance + totalCredit - totalDebit;

  const formatINR = (value: number): string =>
    `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const handleShare = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Day Book Report', url: window.location.href });
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

    transform:scale(0.6);
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
                    DAY BOOK
                  </p>
                  <p className="text-sm font-semibold text-slate-700 mt-2">
                    Complete Business Transaction Register
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
                    Total Transactions:{' '}
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
                <div className="grid grid-cols-4 gap-4 mb-8">
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Opening Balance
                    </div>
                    <div className="text-lg font-semibold text-slate-900 mt-1">
                      {formatINR(openingBalance)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Credits
                    </div>
                    <div className="text-lg font-semibold text-emerald-700 mt-1">
                      {formatINR(totalCredit)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Debits
                    </div>
                    <div className="text-lg font-semibold text-red-700 mt-1">
                      {formatINR(totalDebit)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Closing Balance
                    </div>
                    <div
                      className={`text-lg font-semibold mt-1 ${
                        closingBalance >= 0 ? 'text-slate-900' : 'text-red-700'
                      }`}
                    >
                      {formatINR(closingBalance)}
                    </div>
                  </div>
                </div>

                {/* ── Empty State ── */}
                {rowsWithBalance.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-md py-16 flex flex-col items-center gap-2 text-center">
                    <p className="text-slate-600 font-semibold text-sm">
                      No transactions found
                    </p>
                    <p className="text-slate-400 text-xs max-w-sm">
                      No transactions available for selected period.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Ledger Table ── */}
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Transaction Detail — {rowsWithBalance.length} Entr
                      {rowsWithBalance.length !== 1 ? 'ies' : 'y'}
                    </p>

                    <table className="w-full border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-2 border border-slate-700 text-left">Date</th>
                          <th className="p-2 border border-slate-700 text-left">Type</th>
                          <th className="p-2 border border-slate-700 text-left">Reference</th>
                          <th className="p-2 border border-slate-700 text-left">
                            Party / Category
                          </th>
                          <th className="p-2 border border-slate-700 text-right">Credit</th>
                          <th className="p-2 border border-slate-700 text-right">Debit</th>
                          <th className="p-2 border border-slate-700 text-right">
                            Running Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Opening balance row */}
                        <tr className="bg-slate-100 font-bold text-slate-700 border-t-2 border-slate-400">
                          <td className="border border-slate-300 p-2" colSpan={6}>
                            Opening Balance
                          </td>
                          <td className="border border-slate-300 p-2 text-right">
                            {formatINR(openingBalance)}
                          </td>
                        </tr>

                        {rowsWithBalance.map((row, idx) => (
                          <tr
                            key={`${row.date}-${row.ref}-${idx}`}
                            className={`print-break border-t border-slate-200 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            }`}
                          >
                            <td className="border border-slate-200 p-1.5 text-slate-600">
                              {row.date ? format(new Date(row.date), 'dd/MM/yyyy') : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  TYPE_BADGE[row.type] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {row.type}
                              </span>
                            </td>
                            <td className="border border-slate-200 p-1.5 text-slate-600">
                              {row.ref || '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 font-medium text-slate-800 min-w-[120px]">
                              {row.party || '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-emerald-700 font-semibold">
                              {row.credit > 0 ? formatINR(row.credit) : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right text-red-600 font-semibold">
                              {row.debit > 0 ? formatINR(row.debit) : '—'}
                            </td>
                            <td
                              className={`border border-slate-200 p-1.5 text-right font-bold ${
                                row.runningBalance >= 0 ? 'text-slate-900' : 'text-red-600'
                              }`}
                            >
                              {formatINR(row.runningBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-bold">
                          <td colSpan={4} className="border border-slate-700 p-2">
                            Closing Balance
                          </td>
                          <td className="border border-slate-700 p-2 text-right text-emerald-400">
                            {formatINR(totalCredit)}
                          </td>
                          <td className="border border-slate-700 p-2 text-right text-red-400">
                            {formatINR(totalDebit)}
                          </td>
                          <td
                            className={`border border-slate-700 p-2 text-right ${
                              closingBalance >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {formatINR(closingBalance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* ── Footer Summary Box ── */}
                    <div className="mt-8 border border-slate-300 rounded-md overflow-hidden shadow-sm">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Day Book Summary
                        </h3>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Opening Balance</span>
                        <span className="font-semibold text-slate-900">
                          {formatINR(openingBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total Credits</span>
                        <span className="font-semibold text-emerald-700">
                          {formatINR(totalCredit)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total Debits</span>
                        <span className="font-semibold text-red-600">
                          {formatINR(totalDebit)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 font-bold">
                        <span>Closing Balance</span>
                        <span
                          className={`font-semibold ${
                            closingBalance >= 0 ? 'text-slate-900' : 'text-red-600'
                          }`}
                        >
                          {formatINR(closingBalance)}
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

/* ─── Local Spinner (used only if shared Spinner import is unavailable) ──── */
function Spinner() {
  return (
    <div
      className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"
      role="status"
      aria-label="Loading"
    />
  );
}