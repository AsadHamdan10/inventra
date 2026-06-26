import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { gstApi } from '../../services/apiServices';
import { FilterBar, PageHeader, Spinner, inr } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

export default function GstPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [active, setActive] = useState({ from: monthStart, to: today });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['gst-summary', active.from, active.to],
    queryFn: () => gstApi.summary({ from: active.from, to: active.to }),
  });

  const handleFilter = () => setActive({ from, to });
  const handleReset = () => { setFrom(monthStart); setTo(today); setActive({ from: monthStart, to: today }); };
  const navigate = useNavigate();

  const GstCol = ({ igst, cgst, sgst, total, bold }: any) => (
    <>
      <td className="px-4 py-2 text-right text-blue-700 dark:text-blue-400 text-sm">{igst > 0 ? inr(igst) : '—'}</td>
      <td className="px-4 py-2 text-right text-emerald-700 dark:text-emerald-400 text-sm">{cgst > 0 ? inr(cgst) : '—'}</td>
      <td className="px-4 py-2 text-right text-purple-700 dark:text-purple-400 text-sm">{sgst > 0 ? inr(sgst) : '—'}</td>
      <td className={`px-4 py-2 text-right text-sm ${bold ? 'font-bold' : ''}`}>{inr(total ?? igst + cgst + sgst)}</td>
    </>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="GST Summary" subtitle="GSTR-3B Style — Section 49 ITC Utilization" />
      <div className="bg-white rounded-3xl border border-gray-200 p-4 shadow-sm">

  {/* Desktop */}
  <div className="hidden lg:flex items-end gap-3 flex-wrap">

    <div>
      <label className="block text-xs text-gray-500 mb-1">
        From
      </label>
      <input
        type="date"
        className="input w-40"
        value={from}
        onChange={(e)=>setFrom(e.target.value)}
      />
    </div>

    <div>
      <label className="block text-xs text-gray-500 mb-1">
        To
      </label>
      <input
        type="date"
        className="input w-40"
        value={to}
        onChange={(e)=>setTo(e.target.value)}
      />
    </div>

    <button
      className="btn-primary h-10"
      onClick={handleFilter}
    >
      Filter
    </button>

    <button
      className="btn-secondary h-10"
      onClick={handleReset}
    >
      All Records
    </button>

    <button
      className="btn-secondary h-10"
      onClick={()=>{
        const f = format(
          startOfMonth(new Date()),
          'yyyy-MM-dd'
        );

        setFrom(f);
        setTo(today);
        setActive({
          from:f,
          to:today
        });
      }}
    >
      This Month
    </button>

    <button
  className="h-10 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={() =>
    navigate(
      `/gst-summary-print?from=${active.from}&to=${active.to}`
    )
  }
>
  Download GST Summary
</button>

  </div>

  {/* Mobile */}
  <div className="lg:hidden space-y-3">

    <div>
      <label className="block text-xs text-gray-500 mb-1">
        From
      </label>

      <input
        type="date"
        className="input w-full"
        value={from}
        onChange={(e)=>setFrom(e.target.value)}
      />
    </div>

    <div>
      <label className="block text-xs text-gray-500 mb-1">
        To
      </label>

      <input
        type="date"
        className="input w-full"
        value={to}
        onChange={(e)=>setTo(e.target.value)}
      />
    </div>

    <button
      className="btn-primary w-full h-11"
      onClick={handleFilter}
    >
      Filter
    </button>

    <div className="grid grid-cols-2 gap-3">

      <button
        className="btn-secondary h-10"
        onClick={handleReset}
      >
        All Records
      </button>

      <button
        className="btn-secondary h-10"
        onClick={()=>{
          const f = format(
            startOfMonth(new Date()),
            'yyyy-MM-dd'
          );

          setFrom(f);
          setTo(today);
          setActive({
            from:f,
            to:today
          });
        }}
      >
        This Month
      </button>

      <button
  className="h-15 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={() =>
    navigate(
      `/gst-summary-print?from=${active.from}&to=${active.to}`
    )
  }
>
  Download GST Summary
</button>

    </div>

  </div>

</div>

      {isLoading ? <Spinner /> : !data ? null : (
        <>
          {/* Opening ITC banner */}
          {(data.opening.igst + data.opening.cgst + data.opening.sgst) > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5 text-sm text-blue-800 dark:text-blue-300">
              ↩ <strong>Opening ITC Carry-Forward:</strong>&nbsp;
              IGST {inr(data.opening.igst)} | CGST {inr(data.opening.cgst)} | SGST {inr(data.opening.sgst)}
            </div>
          )}

          {/* Main ledger table */}
          <div className="card overflow-x-auto hidden md:block">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-sm">GST Ledger Summary</h3>
              <span className="text-xs text-gray-400">As per Section 49, CGST Act 2017</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Particular</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-blue-600 uppercase">IGST</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-600 uppercase">CGST</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-purple-600 uppercase">SGST</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-red-50 dark:bg-red-900/10 border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2.5 font-bold text-red-700 dark:text-red-400">3.1 — Output Tax Liability (Sales)</td>
                  <GstCol igst={data.output.igst} cgst={data.output.cgst} sgst={data.output.sgst} bold />
                </tr>

                <tr className="bg-gray-50 dark:bg-gray-800/30">
                  <td colSpan={5} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    4 — Input Tax Credit Available
                  </td>
                </tr>
                {(data.opening.igst + data.opening.cgst + data.opening.sgst) > 0 && (
                  <tr className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2 text-blue-600">↩ Opening ITC (Carried Forward)</td>
                    <GstCol igst={data.opening.igst} cgst={data.opening.cgst} sgst={data.opening.sgst} />
                  </tr>
                )}
                <tr className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">4A — Purchase ITC</td>
                  <GstCol igst={data.itcFromPurchases.igst} cgst={data.itcFromPurchases.cgst} sgst={data.itcFromPurchases.sgst} />
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">4B — GST Input Bills</td>
                  <GstCol igst={data.itcFromInputBills.igst} cgst={data.itcFromInputBills.cgst} sgst={data.itcFromInputBills.sgst} />
                </tr>
                {data.itcFromAdjustments > 0 && (
                  <tr className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-2">4C — GST Adjustments (IGST)</td>
                    <GstCol igst={data.itcFromAdjustments} cgst={0} sgst={0} />
                  </tr>
                )}
                <tr className="border-t border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/10">
                  <td className="px-4 py-2.5 font-bold text-blue-700 dark:text-blue-400">Total ITC Available</td>
                  <GstCol igst={data.totalAvailable.igst} cgst={data.totalAvailable.cgst} sgst={data.totalAvailable.sgst} bold />
                </tr>

                <tr className="bg-gray-50 dark:bg-gray-800/30">
                  <td colSpan={5} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    5 — ITC Utilization (Section 49 Order)
                  </td>
                </tr>
                {[
                  ['Step 1: IGST ITC → IGST Liability', data.utilization.igstVsIgst, 0, 0],
                  ['Step 2: IGST ITC → CGST Liability', 0, data.utilization.igstVsCgst, 0],
                  ['Step 3: IGST ITC → SGST Liability', 0, 0, data.utilization.igstVsSgst],
                  ['Step 4: CGST ITC → CGST Liability', 0, data.utilization.cgstVsCgst, 0],
                  ['Step 5: SGST ITC → SGST Liability', 0, 0, data.utilization.sgstVsSgst],
                ].map(([label, igst, cgst, sgst]: any, i) => (
                  <tr key={i} className={`border-t border-gray-100 dark:border-gray-800 ${(igst+cgst+sgst)===0?'opacity-40':''}`}>
                    <td className="px-4 py-2 text-sm">{label}
                      {(igst+cgst+sgst)===0 && <span className="ml-2 text-xs text-gray-400">(skipped)</span>}
                    </td>
                    <GstCol igst={igst} cgst={cgst} sgst={sgst} />
                  </tr>
                ))}
                <tr className="border-t border-gray-100 dark:border-gray-800 bg-emerald-50 dark:bg-emerald-900/10">
                  <td className="px-4 py-2.5 font-bold text-emerald-700 dark:text-emerald-400">Total ITC Utilized</td>
                  <GstCol igst={data.totalUtilized.igst} cgst={data.totalUtilized.cgst} sgst={data.totalUtilized.sgst} bold />
                </tr>

                <tr className="bg-gray-50 dark:bg-gray-800/30">
                  <td colSpan={5} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    6 — Cash Ledger Payable
                  </td>
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-800 bg-red-50 dark:bg-red-900/10">
                  <td className="px-4 py-2.5 font-bold text-red-700 dark:text-red-400">Cash Payable (Output – ITC)</td>
                  <GstCol igst={data.cashPayable.igst} cgst={data.cashPayable.cgst} sgst={data.cashPayable.sgst} bold />
                </tr>

                <tr className="bg-gray-50 dark:bg-gray-800/30">
                  <td colSpan={5} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    7 — Closing ITC (Carry Forward to Next Period)
                  </td>
                </tr>
                <tr className="border-t border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/10">
                  <td className="px-4 py-2.5 font-bold text-blue-700 dark:text-blue-400">Closing ITC Balance</td>
                  <GstCol igst={data.closing.igst} cgst={data.closing.cgst} sgst={data.closing.sgst} bold />
                </tr>
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4">

  <div className="grid grid-cols-2 gap-3">

    <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
      <p className="text-xs text-red-600">
        Output GST
      </p>
      <p className="text-xl font-bold text-red-700 mt-1">
        {inr(
          data.output.igst +
          data.output.cgst +
          data.output.sgst
        )}
      </p>
    </div>

    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
      <p className="text-xs text-blue-600">
        ITC Available
      </p>
      <p className="text-xl font-bold text-blue-700 mt-1">
        {inr(
          data.totalAvailable.igst +
          data.totalAvailable.cgst +
          data.totalAvailable.sgst
        )}
      </p>
    </div>

    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
      <p className="text-xs text-green-600">
        ITC Utilized
      </p>
      <p className="text-xl font-bold text-green-700 mt-1">
        {inr(
          data.totalUtilized.igst +
          data.totalUtilized.cgst +
          data.totalUtilized.sgst
        )}
      </p>
    </div>

    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
      <p className="text-xs text-orange-600">
        Cash Payable
      </p>
      <p className="text-xl font-bold text-orange-700 mt-1">
        {inr(data.totalCashPayable)}
      </p>
    </div>

  </div>

</div>

<div className="md:hidden p-4 space-y-4">

  <div className="bg-white rounded-2xl border p-4">

    <p className="font-semibold text-red-600 mb-3">
      Output GST
    </p>

    <div className="grid grid-cols-2 gap-3">

      <div>
        <p className="text-xs text-gray-500">
          IGST
        </p>
        <p className="font-semibold">
          {inr(data.output.igst)}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          CGST
        </p>
        <p className="font-semibold">
          {inr(data.output.cgst)}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          SGST
        </p>
        <p className="font-semibold">
          {inr(data.output.sgst)}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          Total
        </p>
        <p className="font-bold text-red-600">
          {inr(
            data.output.igst +
            data.output.cgst +
            data.output.sgst
          )}
        </p>
      </div>

    </div>

  </div>

  <div className="bg-white rounded-2xl border p-4">

    <p className="font-semibold text-orange-600 mb-3">
      Cash Payable
    </p>

    <div className="grid grid-cols-2 gap-3">

      <div>
        <p className="text-xs text-gray-500">
          IGST
        </p>
        <p className="font-semibold">
          {inr(data.cashPayable.igst)}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          CGST
        </p>
        <p className="font-semibold">
          {inr(data.cashPayable.cgst)}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          SGST
        </p>
        <p className="font-semibold">
          {inr(data.cashPayable.sgst)}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          Total
        </p>
        <p className="font-bold text-orange-600">
          {inr(data.totalCashPayable)}
        </p>
      </div>

    </div>

  </div>

</div>

          {/* Payment summary */}
          <div className="card p-4">
            <div className="flex flex-wrap gap-6 items-center">
              <div><p className="text-xs text-gray-500">Cash Payable</p><p className="text-xl font-bold text-red-600">{inr(data.totalCashPayable)}</p></div>
              <div className="text-gray-300 text-xl">−</div>
              <div><p className="text-xs text-gray-500">GST Paid (period)</p><p className="text-xl font-bold text-emerald-600">{inr(data.gstPaid)}</p></div>
              <div className="text-gray-300 text-xl">=</div>
              <div>
                <p className="text-xs text-gray-500">Balance Remaining</p>
                <p className={`text-xl font-bold ${data.balanceRemaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {data.balanceRemaining > 0 ? inr(data.balanceRemaining) : '✅ Fully Paid'}
                </p>
              </div>
            </div>
            {data.totalCashPayable === 0 && (
              <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm px-3 py-2 rounded-lg">
                ✅ Fully covered by ITC — no cash payment required this period.
              </div>
            )}
          </div>

          {/* Sales detail table */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold text-sm">
              Sales — GST Collected ({data.salesRows.length} invoices)
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice No</th><th>Date</th><th>Customer</th>
                    <th className="text-right text-blue-600">IGST</th>
                    <th className="text-right text-emerald-600">CGST</th>
                    <th className="text-right text-purple-600">SGST</th>
                    <th className="text-right">Total GST</th>
                    <th className="text-right">Invoice Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.salesRows.map((s: any) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs">
                        {s.invoiceNo}
                        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-semibold ${s._igst > 0 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {s._igst > 0 ? 'Inter' : 'Intra'}
                        </span>
                      </td>
                      <td className="text-xs">{format(new Date(s.invoiceDate), 'dd/MM/yyyy')}</td>
                      <td className="truncate max-w-[140px]">{s.companyName}</td>
                      <td className="text-right text-blue-600">{s._igst > 0 ? inr(s._igst) : '—'}</td>
                      <td className="text-right text-emerald-600">{s._cgst > 0 ? inr(s._cgst) : '—'}</td>
                      <td className="text-right text-purple-600">{s._sgst > 0 ? inr(s._sgst) : '—'}</td>
                      <td className="text-right font-semibold">{inr(s._igst + s._cgst + s._sgst)}</td>
                      <td className="text-right">{inr(s.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="md:hidden p-4 space-y-4">
  {data.salesRows.map((s:any) => (
    <div
      key={s.id}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
    >

      <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">

        <div className="flex justify-between items-center">
          <h3 className="font-bold">
            {s.invoiceNo}
          </h3>

          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              s._igst > 0
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {s._igst > 0 ? 'INTER' : 'INTRA'}
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-1">
          {format(new Date(s.invoiceDate),'dd/MM/yyyy')}
        </p>

      </div>

      <div className="p-4">

        <p className="text-xs text-gray-400">
          Customer
        </p>

        <p className="font-semibold mb-4">
          {s.companyName}
        </p>

        <div className="grid grid-cols-2 gap-3">

          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs">IGST</p>
            <p className="font-bold text-blue-700">
              {inr(s._igst)}
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs">CGST</p>
            <p className="font-bold text-green-700">
              {inr(s._cgst)}
            </p>
          </div>

          <div className="bg-purple-50 rounded-xl p-3">
            <p className="text-xs">SGST</p>
            <p className="font-bold text-purple-700">
              {inr(s._sgst)}
            </p>
          </div>

          <div className="bg-orange-50 rounded-xl p-3">
            <p className="text-xs">Total GST</p>
            <p className="font-bold text-orange-700">
              {inr(s._igst+s._cgst+s._sgst)}
            </p>
          </div>

        </div>

        <div className="mt-4 border-t pt-3 flex justify-between">
          <span>Invoice Total</span>

          <span className="font-bold">
            {inr(s.grandTotal)}
          </span>
        </div>

      </div>

    </div>
  ))}
</div>

          </div>

          {/* Purchases ITC detail */}
          <div className="card">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 font-semibold text-sm">
              Purchases — ITC Claimable ({data.purchaseRows.length} bills)
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bill No</th><th>Date</th><th>Vendor</th>
                    <th className="text-right text-blue-600">IGST ITC</th>
                    <th className="text-right text-emerald-600">CGST ITC</th>
                    <th className="text-right text-purple-600">SGST ITC</th>
                    <th className="text-right">Total ITC</th>
                  </tr>
                </thead>
                <tbody>
                  {data.purchaseRows.map((p: any) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.billNo}</td>
                      <td className="text-xs">{format(new Date(p.billDate), 'dd/MM/yyyy')}</td>
                      <td className="truncate max-w-[140px]">{p.vendorName}</td>
                      <td className="text-right text-blue-600">{p._igst > 0 ? inr(p._igst) : '—'}</td>
                      <td className="text-right text-emerald-600">{p._cgst > 0 ? inr(p._cgst) : '—'}</td>
                      <td className="text-right text-purple-600">{p._sgst > 0 ? inr(p._sgst) : '—'}</td>
                      <td className="text-right font-semibold text-emerald-600">{inr(p._igst + p._cgst + p._sgst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

                  <div className="md:hidden p-4 space-y-4">

  {data.purchaseRows.map((p:any) => (

    <div
      key={p.id}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
    >

      <div className="px-4 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">

        <h3 className="font-bold">
          {p.billNo}
        </h3>

        <p className="text-xs text-gray-500 mt-1">
          {format(new Date(p.billDate),'dd/MM/yyyy')}
        </p>

      </div>

      <div className="p-4">

        <p className="text-xs text-gray-400">
          Vendor
        </p>

        <p className="font-semibold mb-4">
          {p.vendorName}
        </p>

        <div className="grid grid-cols-2 gap-3">

          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs">IGST ITC</p>
            <p className="font-bold text-blue-700">
              {inr(p._igst)}
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-xs">CGST ITC</p>
            <p className="font-bold text-green-700">
              {inr(p._cgst)}
            </p>
          </div>

          <div className="bg-purple-50 rounded-xl p-3">
            <p className="text-xs">SGST ITC</p>
            <p className="font-bold text-purple-700">
              {inr(p._sgst)}
            </p>
          </div>

          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-xs">Total ITC</p>
            <p className="font-bold text-emerald-700">
              {inr(p._igst+p._cgst+p._sgst)}
            </p>
          </div>

        </div>

      </div>

    </div>

  ))}

</div>

          </div>
        </>
      )}
    </div>
  );
}
