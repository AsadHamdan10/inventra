import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../services/apiServices';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function ProfitRegisterPrint() {
  const [params] = useSearchParams();
  const from = params.get('from') || '';
  const to   = params.get('to')   || '';

  const { user } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['profit-print', from, to],
    queryFn:  () => reportApi.profit(from && to ? { from, to } : {}),
  }); 

  const sales: any[]    = data?.sales    ?? [];
  const expenses: any[] = data?.expenses ?? [];
  const summary         = data?.summary  ?? {
    totalRevenue:    0,
    totalPurchase:   0,
    totalInvExpense: 0,
    grossProfit:     0,
    totalExpenses:   0,
    netProfit:       0,
    profitMargin:    '0',
  };

  const rowProfit = (s: any) =>
    Number(s.grossProfit || 0) - Number(s.otherExpense || 0);

  const profitPct = (s: any) =>
    ((rowProfit(s) / Math.max(Number(s.totalTaxable || 0), 1)) * 100).toFixed(2);

  const grandTotalAllInvoices = sales.reduce(
    (acc: number, s: any) => acc + Number(s.grandTotal || 0), 0
  );

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Profit & Loss Report', url: window.location.href });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Report link copied.');
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
                  PROFIT &amp; LOSS REPORT
                </p>
              </div>
              <div className="text-right text-sm text-slate-700">
                <p>From: <span className="font-semibold ml-2">{from || 'Beginning'}</span></p>
                <p>To: <span className="font-semibold ml-2">{to || 'Today'}</span></p>
                <p>Printed: <span className="font-semibold ml-2">{format(new Date(), 'dd/MM/yyyy HH:mm')}</span></p>
                <p>Total Invoices: <span className="font-semibold ml-2">{sales.length}</span></p>
              </div>
            </div>
          </div>

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-3 gap-5 mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Total Revenue</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">₹{Number(summary.totalRevenue).toLocaleString()}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Gross Profit</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">₹{Number(summary.grossProfit).toLocaleString()}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Net Profit</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">₹{Number(summary.netProfit).toLocaleString()}</div>
            </div>
          </div>

          {/* ── P&L Overview ── */}
          <div className="mb-8 border border-slate-300 rounded-md overflow-hidden shadow-sm">
            <div className="grid grid-cols-2">
              <div className="p-5 border-r border-slate-200">
                <div className="flex justify-between py-2.5 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-700">Total Sales Revenue</span>
                  <span className="text-sm font-semibold text-slate-900">₹{Number(summary.totalRevenue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-700">Total Purchase Cost</span>
                  <span className="text-sm font-semibold text-slate-900">₹{Number(summary.totalPurchase).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm font-medium text-slate-700">Gross Profit</span>
                  <span className="text-sm font-semibold text-slate-900">₹{Number(summary.grossProfit).toLocaleString()}</span>
                </div>
              </div>
              <div className="p-5">
                <div className="flex justify-between py-2.5 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-700">Invoice Expenses</span>
                  <span className="text-sm font-semibold text-slate-900">₹{Number(summary.totalInvExpense).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-slate-200">
                  <span className="text-sm font-medium text-slate-700">Other Expenses</span>
                  <span className="text-sm font-semibold text-slate-900">₹{Number(summary.totalExpenses).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-sm font-bold text-slate-900">NET PROFIT</span>
                  <span className="text-sm font-bold text-slate-900">₹{Number(summary.netProfit).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sales Detail Table ── */}
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Sales Detail — {sales.length} Invoice{sales.length !== 1 ? 's' : ''}
          </p>

          <table className="w-full border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2 border border-slate-700 text-center w-6">#</th>
                <th className="p-2 border border-slate-700 text-left">Invoice</th>
                <th className="p-2 border border-slate-700 text-center">Date</th>
                <th className="p-2 border border-slate-700 text-left">Customer</th>
                <th className="p-2 border border-slate-700 text-right">Sales</th>
                <th className="p-2 border border-slate-700 text-right">Purchase</th>
                <th className="p-2 border border-slate-700 text-right">Inv Exp</th>
                <th className="p-2 border border-slate-700 text-right">Profit</th>
                <th className="p-2 border border-slate-700 text-center">%</th>
                <th className="p-2 border border-slate-700 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s: any, idx: number) => (
                <tr
                  key={s.id}
                  className={`print-break border-t-[3px] border-slate-700 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                >
                  <td className="border border-slate-200 p-1.5 text-center font-bold">{idx + 1}</td>
                  <td className="border border-slate-200 p-1.5 font-bold text-slate-700">{s.invoiceNo}</td>
                  <td className="border border-slate-200 p-1.5 text-center text-slate-500">
                    {format(new Date(s.invoiceDate), 'dd/MM/yyyy')}
                  </td>
                  <td className="border border-slate-200 p-2 font-semibold min-w-[150px]">{s.companyName}</td>
                  <td className="border border-slate-200 p-1.5 text-right">₹{Number(s.totalTaxable).toLocaleString()}</td>
                  <td className="border border-slate-200 p-1.5 text-right text-red-600 font-medium">₹{Number(s.totalPurchaseCost).toLocaleString()}</td>
                  <td className="border border-slate-200 p-1.5 text-right text-slate-600 font-medium">₹{Number(s.otherExpense || 0).toLocaleString()}</td>
                  <td className="border border-slate-200 p-1.5 text-right font-bold text-slate-900">₹{rowProfit(s).toLocaleString()}</td>
                  <td className="border border-slate-200 p-1.5 text-center font-semibold">{profitPct(s)}%</td>
                  <td className="border border-slate-200 p-1.5 text-right font-bold text-slate-900">₹{Number(s.grandTotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                <td colSpan={4} className="border border-slate-300 p-2">
                  Totals ({sales.length} invoices)
                </td>
                <td className="border border-slate-300 p-2 text-right">₹{Number(summary.totalRevenue).toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-right">₹{Number(summary.totalPurchase).toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-right">₹{Number(summary.totalInvExpense).toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-right">₹{Number(summary.grossProfit).toLocaleString()}</td>
                <td className="border border-slate-300 p-2 text-center">{summary.profitMargin}%</td>
                <td className="border border-slate-300 p-2 text-right">₹{grandTotalAllInvoices.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          {/* ── Expenses Table ── */}
          {expenses.length > 0 && (
            <div className="mt-8 print-break">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Other Expenses — {expenses.length} Record{expenses.length !== 1 ? 's' : ''}
              </p>
              <table className="w-full border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-2 border border-slate-700 text-center w-6">#</th>
                    <th className="p-2 border border-slate-700 text-center">Date</th>
                    <th className="p-2 border border-slate-700 text-left">Description</th>
                    <th className="p-2 border border-slate-700 text-left">Category</th>
                    <th className="p-2 border border-slate-700 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e: any, idx: number) => (
                    <tr key={e.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-slate-200 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-200 p-1.5 text-center text-slate-500">
                        {format(new Date(e.expenseDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="border border-slate-200 p-1.5 font-medium">{e.expenseName}</td>
                      <td className="border border-slate-200 p-1.5 text-slate-600">{e.category}</td>
                      <td className="border border-slate-200 p-1.5 text-right font-semibold text-red-600">₹{Number(e.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 text-slate-900 font-bold">
                    <td colSpan={4} className="border border-slate-300 p-2 uppercase text-xs tracking-wider">Total Expenses</td>
                    <td className="border border-slate-300 p-2 text-right">₹{Number(summary.totalExpenses).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ── Footer Summary Box ── */}
          <div className="mt-8 border border-slate-300 rounded-md overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Financial Summary</h3>
            </div>
            <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
              <span>Total Sales Revenue</span>
              <span className="font-semibold text-slate-900">₹{Number(summary.totalRevenue).toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
              <span>Total Purchase Cost</span>
              <span className="font-semibold text-slate-900">₹{Number(summary.totalPurchase).toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
              <span>Gross Profit</span>
              <span className="font-semibold text-slate-900">₹{Number(summary.grossProfit).toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
              <span>Total Expenses</span>
              <span className="font-semibold text-slate-900">₹{Number(summary.totalExpenses).toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-5 py-4 font-bold">
              <span>Net Profit</span>
              <span className="font-semibold text-slate-900">₹{Number(summary.netProfit).toLocaleString()}</span>
            </div>
          </div>
          

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