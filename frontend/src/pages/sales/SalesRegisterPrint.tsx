import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { saleApi } from '../../services/apiServices';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function SalesRegisterPrint() {
  const [params] = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const { data: sales = [] } = useQuery({
    queryKey: ['sales-print', from, to],
    queryFn: () =>
      saleApi.list(from && to ? { from, to } : {}),
  });

  const { user } = useAuthStore();

  const totalAmount = sales.reduce(
    (s: number, sale: any) => s + Number(sale.grandTotal),
    0
  );
  const totalReceived = sales.reduce(
    (s: number, sale: any) => s + Number(sale.paymentReceived),
    0
  );
  const totalBalance = totalAmount - totalReceived;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sales Register Report', url: window.location.href });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
console.log('Report copied');
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
            <div className="flex justify-between items-start gap-6">
              <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 uppercase">
                  {user?.companyName || 'Company Name'}
                </h1>
                <p className="text-xs tracking-[0.30em] uppercase text-slate-500 mt-1">
                  SALES REGISTER REPORT
                </p>
              </div>
              <div className="text-right text-sm text-slate-700">
                <p>From: <span className="font-semibold ml-2">{from || 'Beginning'}</span></p>
                <p>To: <span className="font-semibold ml-2">{to || 'Today'}</span></p>
                <p>Printed: <span className="font-semibold ml-2">{format(new Date(), 'dd/MM/yyyy HH:mm')}</span></p>
                <p>Total Records: <span className="font-semibold ml-2">{sales.length}</span></p>
              </div>
            </div>
          </div>

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Total Records</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">{sales.length}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Total Sales</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">₹{totalAmount.toLocaleString()}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-md p-5">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Outstanding</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">₹{totalBalance.toLocaleString()}</div>
            </div>
          </div>

          {/* ── Main Register Table ── */}
          <table className="w-full border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2 border border-slate-700">#</th>
                <th className="p-2 border border-slate-700">Date</th>
                <th className="p-2 border border-slate-700">Invoice No</th>
                <th className="p-2 border border-slate-700">Customer</th>
                <th className="p-2 border border-slate-700 text-right">Total</th>
                <th className="p-2 border border-slate-700 text-right">Received</th>
                <th className="p-2 border border-slate-700 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s: any, saleIndex: number) => {
                const balance = Number(s.grandTotal) - Number(s.paymentReceived);
                return (
                  <React.Fragment key={s.id}>
                    {saleIndex > 0 && (
                      <tr>
                        <td colSpan={7} className="h-5 bg-white border-t-[4px] border-slate-800" />
                      </tr>
                    )}
                    <tr className="bg-slate-50 print-break">
                      <td className="border border-slate-300 p-2 text-center font-bold">{saleIndex + 1}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {format(new Date(s.invoiceDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="border border-slate-300 p-2 font-bold">{s.invoiceNo}</td>
                      <td className="border border-slate-300 p-2 font-semibold text-slate-800">{s.companyName}</td>
                      <td className="border border-slate-300 p-2 text-right font-bold">₹{Number(s.grandTotal).toLocaleString()}</td>
                      <td className="border border-slate-300 p-2 text-right font-bold text-green-700">₹{Number(s.paymentReceived).toLocaleString()}</td>
                      <td className={`border border-slate-300 p-2 text-right font-bold ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        ₹{balance.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={7} className="p-0">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300">
                              <th className="border border-slate-300 p-1 w-10">#</th>
                              <th className="border border-slate-300 p-1 text-left">Material</th>
                              <th className="border border-slate-300 p-1">Qty</th>
                              <th className="border border-slate-300 p-1">Sale Rate</th>
                              <th className="border border-slate-300 p-1">GST</th>
                              <th className="border border-slate-300 p-1 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.items?.map((it: any, itemIndex: number) => (
                              <tr key={itemIndex}>
                                <td className="border border-slate-200 p-1 text-center">{itemIndex + 1}</td>
                                <td className="border border-slate-200 p-1 font-medium">{it.materialName}</td>
                                <td className="border border-slate-200 p-1 text-center">{it.quantity}</td>
                                <td className="border border-slate-200 p-1 text-center">₹{Number(it.unitPrice).toLocaleString()}</td>
                                <td className="border border-slate-200 p-1 text-center">{it.gstPercent}%</td>
                                <td className="border border-slate-200 p-1 text-right">₹{Number(it.itemTotal).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* ── Footer Summary ── */}
          <div className="mt-8 border border-slate-300 rounded-md overflow-hidden shadow-sm">
            <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
              <span>Total Sales Value</span>
              <span className="font-semibold text-slate-900">₹{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-5 py-4 border-b border-slate-200 font-medium">
              <span>Total Received</span>
              <span className="font-semibold text-slate-900">₹{totalReceived.toLocaleString()}</span>
            </div>
            <div className="flex justify-between px-5 py-4 font-medium">
              <span>Total Outstanding</span>
              <span className="font-semibold text-slate-900">₹{totalBalance.toLocaleString()}</span>
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