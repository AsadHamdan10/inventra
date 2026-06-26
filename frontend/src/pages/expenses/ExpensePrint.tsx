import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { expenseApi } from '../../services/apiServices';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface ExpenseEntry {
  id: number;
  expenseName: string;
  amount: number;
  expenseDate: string;
  category: string;
  deductProfit: boolean;
  notes?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ExpensePrint() {
  const [params] = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const search = params.get('search') || '';

  const { user } = useAuthStore();

  const { data, isLoading } = useQuery<ExpenseEntry[]>({
    queryKey: ['expense-print', from, to],
    queryFn: () =>
      expenseApi.list({
        from,
        to,
      }),
  });

  const allExpenses: ExpenseEntry[] = data || [];

  const expenses: ExpenseEntry[] = search
    ? allExpenses.filter(
        (e) =>
          e.expenseName.toLowerCase().includes(search.toLowerCase()) ||
          e.category.toLowerCase().includes(search.toLowerCase())
      )
    : allExpenses;

  const formatINR = (value: number): string =>
    `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const totalExpenses: number = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );
  const deductible: number = expenses
    .filter((e) => e.deductProfit)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const nonDeductible: number = totalExpenses - deductible;

  const byCategory: Record<string, number> = {};
  expenses.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount || 0);
  });
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const categoriesUsed = categoryEntries.length;

  const handleShare = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Expense Register', url: window.location.href });
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

    transform:scale(0.65);
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
                    EXPENSE REGISTER
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
                      Total Expenses
                    </div>
                    <div className="text-base font-semibold text-red-700 mt-1">
                      {formatINR(totalExpenses)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      Total Records
                    </div>
                    <div className="text-base font-semibold text-slate-900 mt-1">
                      {expenses.length}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      Profit Deductible
                    </div>
                    <div className="text-base font-semibold text-orange-700 mt-1">
                      {formatINR(deductible)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      Non Deductible
                    </div>
                    <div className="text-base font-semibold text-slate-700 mt-1">
                      {formatINR(nonDeductible)}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                    <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">
                      Categories
                    </div>
                    <div className="text-base font-semibold text-slate-900 mt-1">
                      {categoriesUsed}
                    </div>
                  </div>
                </div>

                {/* ── Empty State ── */}
                {expenses.length === 0 ? (
                  <div className="border border-dashed border-slate-300 rounded-md py-16 flex flex-col items-center gap-2 text-center">
                    <p className="text-slate-600 font-semibold text-sm">
                      No expenses found
                    </p>
                    <p className="text-slate-400 text-xs max-w-sm">
                      No expenses found for selected period.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* ── Category Summary Box ── */}
                    {categoryEntries.length > 0 && (
                      <div className="mb-8 border border-slate-300 rounded-md overflow-hidden shadow-sm print-break">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                            Category Summary
                          </h3>
                        </div>
                        {categoryEntries.map(([category, amount], idx) => (
                          <div
                            key={category}
                            className={`flex justify-between px-5 py-3 font-medium ${
                              idx !== categoryEntries.length - 1
                                ? 'border-b border-slate-200'
                                : ''
                            }`}
                          >
                            <span>{category}</span>
                            <span className="font-semibold text-red-700">
                              {formatINR(amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Expense Table ── */}
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Expense Detail — {expenses.length} Record
                      {expenses.length !== 1 ? 's' : ''}
                    </p>

                    <table className="w-full border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="p-2 border border-slate-700 text-left">Date</th>
                          <th className="p-2 border border-slate-700 text-left">
                            Expense Name
                          </th>
                          <th className="p-2 border border-slate-700 text-left">Category</th>
                          <th className="p-2 border border-slate-700 text-center">
                            Deductible
                          </th>
                          <th className="p-2 border border-slate-700 text-left">Notes</th>
                          <th className="p-2 border border-slate-700 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((e, idx) => (
                          <tr
                            key={e.id}
                            className={`print-break border-t border-slate-200 ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                            }`}
                          >
                            <td className="border border-slate-200 p-1.5 text-slate-600">
                              {e.expenseDate
                                ? format(new Date(e.expenseDate), 'dd/MM/yyyy')
                                : '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 font-medium text-slate-800 min-w-[120px]">
                              {e.expenseName}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-slate-600">
                              {e.category}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-center">
                              {e.deductProfit ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                  No
                                </span>
                              )}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-slate-500 max-w-[140px] truncate">
                              {e.notes || '—'}
                            </td>
                            <td className="border border-slate-200 p-1.5 text-right font-bold text-red-700">
                              {formatINR(e.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-bold">
                          <td colSpan={5} className="border border-slate-700 p-2">
                            Total Expenses ({expenses.length} records)
                          </td>
                          <td className="border border-slate-700 p-2 text-right text-red-400">
                            {formatINR(totalExpenses)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* ── Expense Summary Box ── */}
                    <div className="mt-8 border border-slate-300 rounded-md overflow-hidden shadow-sm print-break">
                      <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                          Expense Summary
                        </h3>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Total Expenses</span>
                        <span className="font-semibold text-red-700">
                          {formatINR(totalExpenses)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Profit Deductible</span>
                        <span className="font-semibold text-orange-700">
                          {formatINR(deductible)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
                        <span>Non Deductible</span>
                        <span className="font-semibold text-slate-700">
                          {formatINR(nonDeductible)}
                        </span>
                      </div>
                      <div className="flex justify-between px-5 py-4 font-bold">
                        <span>Total Categories</span>
                        <span className="font-semibold text-slate-900">
                          {categoriesUsed}
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