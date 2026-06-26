import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../services/apiServices';
import {
  PageHeader,
  Spinner,
  EmptyState,
  SearchInput,
  inr
} from '../../components/ui';
import { format, startOfMonth, startOfYear } from 'date-fns';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────────────────
   ProfitPage
   ─────────────────────────────────────────────────────────────────────────────
   Screen-only report page.  The "Print" button navigates to
   /profit-register-print?from=…&to=… (same pattern as SalesPage → SalesRegisterPrint).
   All print rendering happens inside ProfitRegisterPrint.tsx.
   ───────────────────────────────────────────────────────────────────────────── */
export default function ProfitPage() {
  const navigate = useNavigate();

  const td = format(new Date(), 'yyyy-MM-dd');
  const sy = format(startOfYear(new Date()), 'yyyy-MM-dd');

  const [from, setFrom]     = useState(sy);
  const [to, setTo]         = useState(td);
  const [active, setActive] = useState({ from: sy, to: td });
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['profit-report', active.from, active.to],
    queryFn:  () => reportApi.profit({ from: active.from, to: active.to }),
  });

  /* ── Derived data ── */
  const sales =
    data?.sales?.filter((s: any) => {
      const q = search.toLowerCase();
      return (
        s.invoiceNo?.toLowerCase().includes(q) ||
        s.companyName?.toLowerCase().includes(q)
      );
    }) ?? [];

  const expenses = data?.expenses ?? [];

  const summary = data?.summary ?? {
    totalRevenue:    0,
    totalPurchase:   0,
    totalInvExpense: 0,
    grossProfit:     0,
    totalExpenses:   0,
    netProfit:       0,
    profitMargin:    '0',
  };

  const netProfitPositive = Number(summary.netProfit) >= 0;

  /* ── Filter helpers ── */
  const applyFilter  = () => setActive({ from, to });
  const allRecords   = () => { setFrom(sy);  setTo(td); setActive({ from: sy,  to: td }); };
  const thisMonth    = () => {
    const f = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    setFrom(f); setTo(td); setActive({ from: f, to: td });
  };
  const thisYear = () => { setFrom(sy); setTo(td); setActive({ from: sy, to: td }); };

  /* ── Print: navigate to standalone print page (mirrors SalesPage pattern) ── */
  const handlePrint = () =>
    navigate(`/profit-register-print?from=${active.from}&to=${active.to}`);

  /* ── Row helpers ── */
  const rowProfit = (s: any) =>
    Number(s.grossProfit || 0) - Number(s.otherExpense || 0);

  const profitPct = (s: any) =>
    (
      (rowProfit(s) / Math.max(Number(s.totalTaxable || 0), 1)) *
      100
    ).toFixed(2);

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* ── Desktop header ── */}
      <div className="hidden lg:block">
        <PageHeader
          title="Profit & Loss Report"
          subtitle="Sales revenue minus costs and expenses"
          actions={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search invoice or company…"
            />
          }
        />
      </div>

      {/* ── Mobile header ── */}
      <div className="lg:hidden space-y-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profit &amp; Loss</h1>
          <p className="text-gray-500 mt-1 text-sm">Sales revenue minus costs and expenses</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice or company…"
          className="input w-full"
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FILTER BAR
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border border-gray-200 p-4 shadow-sm">

        {/* Desktop */}
        <div className="hidden lg:flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date" className="input w-40"
              value={from} onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date" className="input w-40"
              value={to} onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button className="btn-primary h-10"   onClick={applyFilter}>Filter</button>
          <button className="btn-secondary h-10" onClick={allRecords}>All Records</button>
          <button className="btn-secondary h-10" onClick={thisMonth}>This Month</button>
          <button className="btn-secondary h-10" onClick={thisYear}>This Year</button>
          {/* Print navigates to ProfitRegisterPrint */}
          <button
  className="h-10 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={() =>
    navigate(`/profit-register-print?from=${active.from}&to=${active.to}`)
  }
>
  Preview Report
</button>
        </div>

        {/* Mobile */}
        <div className="lg:hidden space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date" className="input w-full"
              value={from} onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date" className="input w-full"
              value={to} onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button className="btn-primary w-full h-11" onClick={applyFilter}>Filter</button>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary h-10" onClick={allRecords}>All Records</button>
            <button className="btn-secondary h-10" onClick={thisMonth}>This Month</button>
            <button className="btn-secondary h-10" onClick={thisYear}>This Year</button>
            <button
  className="h-16 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={() =>
    navigate(`/sales-register-print?from=${active.from}&to=${active.to}`)
  }
>
  Preview Report
</button>
          </div>
        </div>

      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {/* ════════════════════════════════════════════════════════════════
              P&L SUMMARY CARDS
          ════════════════════════════════════════════════════════════════ */}
          <div className="card p-4">
            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3">
              P&amp;L Summary
            </h3>

            {/* Desktop – 6-col */}
            <div className="hidden lg:grid lg:grid-cols-6 gap-3">
              <SummaryCard label="Sales"         value={inr(summary.totalRevenue)}    scheme="blue" />
              <SummaryCard label="Purchase"      value={inr(summary.totalPurchase)}   scheme="red" />
              <SummaryCard label="Gross Profit"  value={inr(summary.grossProfit)}     scheme="green" />
              <SummaryCard label="Inv Expense"   value={inr(summary.totalInvExpense)} scheme="orange" />
              <SummaryCard label="Other Expense" value={inr(summary.totalExpenses)}   scheme="rose" />
              <SummaryCard
                label="Net Profit"
                value={inr(summary.netProfit)}
                sub={`${summary.profitMargin}% margin`}
                scheme={netProfitPositive ? 'emerald' : 'red'}
                prominent
              />
            </div>

            {/* Tablet – 3-col */}
            <div className="hidden sm:grid sm:grid-cols-3 lg:hidden gap-3">
              <SummaryCard label="Sales"         value={inr(summary.totalRevenue)}    scheme="blue" />
              <SummaryCard label="Purchase"      value={inr(summary.totalPurchase)}   scheme="red" />
              <SummaryCard label="Gross Profit"  value={inr(summary.grossProfit)}     scheme="green" />
              <SummaryCard label="Inv Expense"   value={inr(summary.totalInvExpense)} scheme="orange" />
              <SummaryCard label="Other Expense" value={inr(summary.totalExpenses)}   scheme="rose" />
              <SummaryCard
                label="Net Profit"
                value={inr(summary.netProfit)}
                sub={`${summary.profitMargin}% margin`}
                scheme={netProfitPositive ? 'emerald' : 'red'}
                prominent
              />
            </div>

            {/* Mobile – stacked, net profit first */}
            <div className="sm:hidden space-y-3">
              <div
                className={`rounded-2xl p-4 text-center border-2 ${
                  netProfitPositive
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wide ${netProfitPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  Net Profit
                </p>
                <p className={`text-3xl font-bold mt-1 ${netProfitPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                  {inr(summary.netProfit)}
                </p>
                <p className={`text-xs mt-1 ${netProfitPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                  {summary.profitMargin}% margin
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MobileSummaryCard label="Sales"         value={inr(summary.totalRevenue)}    color="text-blue-700"   bg="bg-blue-50" />
                <MobileSummaryCard label="Purchase"      value={inr(summary.totalPurchase)}   color="text-red-600"    bg="bg-red-50" />
                <MobileSummaryCard label="Gross Profit"  value={inr(summary.grossProfit)}     color="text-green-700"  bg="bg-green-50" />
                <MobileSummaryCard label="Inv Expense"   value={inr(summary.totalInvExpense)} color="text-orange-600" bg="bg-orange-50" />
                <MobileSummaryCard label="Other Expense" value={inr(summary.totalExpenses)}   color="text-rose-600"   bg="bg-rose-50" />
                <MobileSummaryCard label="Margin"        value={`${summary.profitMargin}%`}   color="text-purple-700" bg="bg-purple-50" />
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              SALES DETAIL
          ════════════════════════════════════════════════════════════════ */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-sm">Sales Detail</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {sales.length} invoice{sales.length !== 1 ? 's' : ''}
              </span>
            </div>

            {sales.length === 0 ? (
              <EmptyState message="No sales found for this period." />
            ) : (
              <>
                {/* Desktop / tablet table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-[12px] table-auto">
                    <thead className="bg-slate-950 text-white text-sm font-semibold">
  <tr>
    <th className="w-[4%] px-2 py-5 text-left">#</th>
    <th className="w-[11%] px-2 py-5 text-left">Invoice</th>
    <th className="w-[9%] px-2 py-5 text-left">Date</th>
    <th className="w-[16%] px-3 py-5 text-left">Company</th>
    <th className="w-[10%] px-2 py-5 text-right">Sales</th>
    <th className="w-[10%] px-2 py-5 text-right">Purchase</th>
    <th className="w-[9%] px-2 py-5 text-right">Inv Exp</th>
    <th className="w-[10%] px-2 py-5 text-right">Profit</th>
    <th className="w-[5%] px-2 py-5 text-center">%</th>
    <th className="w-[10%] px-2 py-5 text-center">Total</th>
  </tr>
</thead>
                    <tbody>
                      {sales.map((s: any, index: number) => (
                        <tr
                          key={s.id}
                          className="border-b border-slate-100 hover:bg-blue-50 transition-colors h-14"
                        >
                          <td className="px-2 py-3 text-slate-400">{index + 1}</td>
                          <td className="px-2 py-3 font-bold text-slate-700 truncate">{s.invoiceNo}</td>
                          <td className="px-2 py-3 text-slate-500">
                            {format(new Date(s.invoiceDate), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-3 py-3 font-medium truncate" title={s.companyName}>
                            {s.companyName}
                          </td>
                          <td className="px-2 py-3 text-right">{inr(s.totalTaxable)}</td>
                          <td className="px-2 py-3 text-right text-red-500 font-medium">
                            {inr(s.totalPurchaseCost)}
                          </td>
                          <td className="px-2 py-3 text-right text-orange-500 font-medium">
                            {inr(s.otherExpense || 0)}
                          </td>
                          <td className="px-2 py-3 text-right text-green-600 font-bold">
                            {inr(rowProfit(s))}
                          </td>
                          <td className="px-1 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                              {profitPct(s)}%
                            </span>
                          </td>
                          <td className="px-1 py-3 text-center font-bold text-slate-900">
                            {inr(s.grandTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals footer */}
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-[12px]">
                        <td colSpan={4} className="px-3 py-3 text-slate-500 text-[10px] uppercase tracking-wider">
                          Totals
                        </td>
                        <td className="px-2 py-3 text-right text-blue-700">{inr(summary.totalRevenue)}</td>
                        <td className="px-2 py-3 text-right text-red-600">{inr(summary.totalPurchase)}</td>
                        <td className="px-2 py-3 text-right text-orange-500">{inr(summary.totalInvExpense)}</td>
                        <td className="px-2 py-3 text-right text-green-700">{inr(summary.grossProfit)}</td>
                        <td className="px-1 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold">
                            {summary.profitMargin}%
                          </span>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden p-4 space-y-4">
                  {sales.map((s: any) => (
                    <div
                      key={s.id}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-base text-slate-900">{s.invoiceNo}</h3>
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                            {profitPct(s)}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {format(new Date(s.invoiceDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div className="px-4 pt-3 pb-1">
                        <p className="text-[11px] uppercase text-slate-400 tracking-wide">Customer</p>
                        <p className="font-semibold text-slate-800 mt-0.5 line-clamp-2">{s.companyName}</p>
                      </div>
                      <div className="p-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <MobileMetric label="Sales"       value={inr(s.totalTaxable)}      color="blue" />
                          <MobileMetric label="Purchase"    value={inr(s.totalPurchaseCost)} color="red" />
                          <MobileMetric label="Inv Expense" value={inr(s.otherExpense || 0)} color="orange" />
                          <MobileMetric label="Profit"      value={inr(rowProfit(s))}        color="green" />
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                          <div>
                            <p className="text-[11px] text-slate-500">GST</p>
                            <p className="font-medium text-slate-600">{inr(s.totalGst)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] text-slate-500">Grand Total</p>
                            <p className="font-bold text-lg text-slate-900">{inr(s.grandTotal)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════════════
              EXPENSES BREAKDOWN
          ════════════════════════════════════════════════════════════════ */}
          {expenses.length > 0 && (
            <div className="card">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-sm">Other Expenses</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {expenses.length} record{expenses.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950 text-white text-sm font-semibold">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e: any) => (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-red-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {format(new Date(e.expenseDate), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{e.expenseName}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                            {e.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          {inr(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-red-50 border-t-2 border-red-200 font-bold">
                      <td colSpan={3} className="px-4 py-3 text-red-700 uppercase text-xs tracking-wider">
                        Total Expenses
                      </td>
                      <td className="px-4 py-3 text-right text-red-700 text-base">
                        {inr(summary.totalExpenses)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden p-4 space-y-3">
                {expenses.map((e: any) => (
                  <div key={e.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{e.expenseName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(e.expenseDate), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <span className="font-bold text-red-600 text-base">{inr(e.amount)}</span>
                    </div>
                    <div className="mt-3">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {e.category}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Total Expenses</p>
                  <p className="text-lg font-bold text-red-700">{inr(summary.totalExpenses)}</p>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              NET PROFIT BANNER
          ════════════════════════════════════════════════════════════════ */}
          <div
            className={`rounded-3xl border-2 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${
              netProfitPositive
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${netProfitPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {netProfitPositive ? '✓ Net Profit' : '✗ Net Loss'}
              </p>
              <p className={`text-4xl font-extrabold mt-1 ${netProfitPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                {inr(summary.netProfit)}
              </p>
              <p className={`text-sm mt-1 ${netProfitPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                {active.from} → {active.to}
              </p>
            </div>
            <div className={`text-center rounded-2xl px-6 py-4 ${netProfitPositive ? 'bg-emerald-100' : 'bg-red-100'}`}>
              <p className={`text-xs font-semibold uppercase ${netProfitPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                Profit Margin
              </p>
              <p className={`text-4xl font-extrabold ${netProfitPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                {summary.profitMargin}%
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOCAL SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

const SCHEME: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100' },
  red:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-100' },
  green:   { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-100' },
  orange:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-100' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
};

function SummaryCard({
  label, value, sub, scheme, prominent,
}: {
  label: string; value: string; sub?: string; scheme: string; prominent?: boolean;
}) {
  const s = SCHEME[scheme] ?? SCHEME.blue;
  return (
    <div className={`rounded-xl ${s.bg} p-4 text-center border ${prominent ? 'border-2 ' + s.border : s.border}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${s.text}`}>{label}</p>
      <p className={`font-bold mt-1 ${prominent ? 'text-2xl' : 'text-xl'} ${s.text}`}>{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${s.text} opacity-70`}>{sub}</p>}
    </div>
  );
}

function MobileSummaryCard({
  label, value, color, bg,
}: { label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <p className={`text-[11px] font-medium ${color} opacity-80`}>{label}</p>
      <p className={`font-bold text-base ${color} mt-0.5`}>{value}</p>
    </div>
  );
}

const METRIC_COLORS: Record<string, { bg: string; value: string }> = {
  blue:   { bg: 'bg-blue-50',   value: 'text-blue-700 font-bold' },
  red:    { bg: 'bg-red-50',    value: 'text-red-600 font-bold' },
  orange: { bg: 'bg-orange-50', value: 'text-orange-600 font-bold' },
  green:  { bg: 'bg-green-50',  value: 'text-green-700 font-bold' },
};

function MobileMetric({
  label, value, color,
}: { label: string; value: string; color: string }) {
  const c = METRIC_COLORS[color] ?? METRIC_COLORS.blue;
  return (
    <div className={`${c.bg} rounded-xl p-3`}>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`${c.value} mt-0.5`}>{value}</p>
    </div>
  );
}