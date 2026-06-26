import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { gstApi } from '../../services/apiServices';
import { PageHeader, Modal, Field, Confirm, EmptyState, Spinner, inr } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ef=()=>({paymentMonth:format(new Date(),'yyyy-MM'),amountPaid:0,paymentDate:format(new Date(),'yyyy-MM-dd'),reference:'',notes:''});

export default function GstPaymentsPage() {
  const qc=useQueryClient();
  const today=format(new Date(),'yyyy-MM-dd');
  const [from,setFrom]=useState(''), [to,setTo]=useState(''), [active,setActive]=useState({from:'',to:''});
  const [open,setOpen]=useState(false),[del,setDel]=useState<number|null>(null),[form,setForm]=useState(ef());

  const navigate = useNavigate();

  const handlePrint = () => {
  navigate(
    `/gst-payment-print?from=${from}&to=${to}`
  );
};

  const {data:payments=[],isLoading}=useQuery({queryKey:['gst-payments',active.from,active.to],queryFn:()=>gstApi.payments(active.from&&active.to?{from:active.from,to:active.to}:{})});
  const save=useMutation({mutationFn:()=>gstApi.createPayment(form),onSuccess:()=>{qc.invalidateQueries({queryKey:['gst-payments']});qc.invalidateQueries({queryKey:['gst-summary']});setOpen(false);toast.success('Payment recorded.');},onError:(e:any)=>toast.error(e.response?.data?.error||'Error')});
  const remove=useMutation({mutationFn:(id:number)=>gstApi.deletePayment(id),onSuccess:()=>{qc.invalidateQueries({queryKey:['gst-payments']});setDel(null);toast.success('Deleted.');}});

  const quickFilter=(p:'month'|'year')=>{const now=new Date();if(p==='month'){const f=format(new Date(now.getFullYear(),now.getMonth(),1),'yyyy-MM-dd');const t=format(new Date(now.getFullYear(),now.getMonth()+1,0),'yyyy-MM-dd');setFrom(f);setTo(t);setActive({from:f,to:t});}else{const f=`${now.getFullYear()}-01-01`;const t=`${now.getFullYear()}-12-31`;setFrom(f);setTo(t);setActive({from:f,to:t});}};
  const total=payments.reduce((s:number,p:any)=>s+ +p.amountPaid,0);
  const sf=(k:string)=>(e:any)=>setForm(p=>({...p,[k]:e.target.type==='number'?+e.target.value:e.target.value}));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

  <div className="flex justify-between items-start mb-6">

    <div>
      <h1 className="text-3xl font-bold text-slate-900">
        GST Payments
      </h1>

      <p className="mt-2 text-gray-500">
        {payments.length} payments · {inr(total)}
      </p>
    </div>

    <button
      className="hidden lg:flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
      onClick={()=>{
        setForm(ef());
        setOpen(true);
      }}
    >
      <Plus size={16}/>
      Record Payment
    </button>

  </div>

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
        onChange={e=>setFrom(e.target.value)}
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
        onChange={e=>setTo(e.target.value)}
      />
    </div>

    <button
      className="btn-primary h-10"
      onClick={()=>setActive({from,to})}
    >
      Filter
    </button>

    <button
      className="btn-secondary h-10"
      onClick={()=>{
        setFrom('');
        setTo('');
        setActive({from:'',to:''});
      }}
    >
      All Records
    </button>

    <button
      className="btn-secondary h-10"
      onClick={()=>quickFilter('month')}
    >
      This Month
    </button>

    <button
      className="btn-secondary h-10"
      onClick={()=>quickFilter('year')}
    >
      This Year
    </button>

    <button
  className="h-10 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Print Register
</button>

  </div>

  {/* Mobile */}
  <div className="lg:hidden space-y-3">

    <button
      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold"
      onClick={()=>{
        setForm(ef());
        setOpen(true);
      }}
    >
      + Record Payment
    </button>

    <div>
      <label className="block text-xs text-gray-500 mb-1">
        From
      </label>
      <input
        type="date"
        className="input w-full"
        value={from}
        onChange={e=>setFrom(e.target.value)}
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
        onChange={e=>setTo(e.target.value)}
      />
    </div>

    <button
      className="btn-primary w-full h-11"
      onClick={()=>setActive({from,to})}
    >
      Filter
    </button>

    <div className="grid grid-cols-2 gap-3">

      <button
        className="btn-secondary h-10"
        onClick={()=>{
          setFrom('');
          setTo('');
          setActive({from:'',to:''});
        }}
      >
        All Records
      </button>

      <button
        className="btn-secondary h-10"
        onClick={()=>quickFilter('month')}
      >
        This Month
      </button>

      <button
        className="btn-secondary h-10"
        onClick={()=>quickFilter('year')}
      >
        This Year
      </button>

      <button
  className="h-15 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Print Register
</button>

    </div>

  </div>

</div>
      <div className="card p-4 flex items-center gap-6">
        <div><p className="text-xs text-gray-500">Total GST Paid</p><p className="text-2xl font-bold text-emerald-600">{inr(total)}</p></div>
        <div className="text-xs text-gray-400">Go to <a href="/gst" className="text-brand-600 underline">GST Summary</a> to see payable vs paid.</div>
      </div>
      <div className="table-container">

  {isLoading ? (
    <Spinner />
  ) : payments.length === 0 ? (
    <EmptyState message="No GST payments recorded." />
  ) : (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Payment Date</th>
              <th className="text-right">Amount Paid</th>
              <th>Reference</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {payments.map((p:any) => (
              <tr key={p.id}>
                <td className="font-semibold">
                  {p.paymentMonth}
                </td>

                <td>
                  {format(new Date(p.paymentDate),'dd/MM/yyyy')}
                </td>

                <td className="text-right font-bold text-emerald-600">
                  {inr(p.amountPaid)}
                </td>

                <td className="font-mono text-xs">
                  {p.reference || '—'}
                </td>

                <td className="text-sm text-gray-500">
                  {p.notes || '—'}
                </td>

                <td>
                  <button
                    className="btn-ghost btn-sm p-1.5 text-red-500"
                    onClick={() => setDel(p.id)}
                  >
                    <Trash2 size={13}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td colSpan={2}>TOTAL</td>
              <td className="text-right text-emerald-600">
                {inr(total)}
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden p-4 space-y-4">

        {payments.map((p:any) => (

          <div
            key={p.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >

            <div className="px-4 py-4 bg-gradient-to-r from-emerald-50 to-green-50 border-b">

              <div className="flex justify-between items-center">

                <h3 className="font-bold">
                  {p.paymentMonth}
                </h3>

                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  GST PAID
                </span>

              </div>

              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(p.paymentDate),'dd/MM/yyyy')}
              </p>

            </div>

            <div className="p-4">

              <div className="bg-emerald-50 rounded-xl p-3 mb-4">

                <p className="text-xs text-gray-500">
                  Amount Paid
                </p>

                <p className="font-bold text-xl text-emerald-700">
                  {inr(p.amountPaid)}
                </p>

              </div>

              <div className="space-y-3">

                <div>
                  <p className="text-xs text-gray-400">
                    Reference
                  </p>

                  <p className="font-mono text-sm">
                    {p.reference || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Notes
                  </p>

                  <p className="text-sm">
                    {p.notes || '—'}
                  </p>
                </div>

              </div>

              <button
                className="mt-4 w-full py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 font-medium"
                onClick={() => setDel(p.id)}
              >
                Delete Payment
              </button>

            </div>

          </div>

        ))}

      </div>
    </>
  )}
<div className="md:hidden p-4">
  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
    <p className="text-xs text-emerald-600">
      Total GST Paid
    </p>

    <p className="text-2xl font-bold text-emerald-700 mt-1">
      {inr(total)}
    </p>

    <p className="text-xs text-gray-500 mt-2">
      {payments.length} payment records
    </p>
  </div>
</div>
</div>
      <Modal open={open} onClose={()=>setOpen(false)} title="Record GST Payment" size="sm">
        <div className="space-y-3">
          <Field label="GST Return Month" required><input className="input" type="month" value={form.paymentMonth} onChange={sf('paymentMonth')}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount Paid (₹)" required><input className="input" type="number" min="0.01" step="0.01" value={form.amountPaid} onChange={sf('amountPaid')}/></Field>
            <Field label="Payment Date" required><input className="input" type="date" value={form.paymentDate} onChange={sf('paymentDate')}/></Field>
          </div>
          <Field label="Challan / Reference No"><input className="input font-mono" value={form.reference} onChange={sf('reference')}/></Field>
          <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={sf('notes')}/></Field>
          <div className="flex gap-2 justify-end pt-2"><button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" onClick={()=>save.mutate()} disabled={save.isPending||form.amountPaid<=0}>{save.isPending?'Saving…':'Record Payment'}</button></div>
        </div>
      </Modal>
      <Confirm open={del!==null} onConfirm={()=>remove.mutate(del!)} onCancel={()=>setDel(null)} title="Delete Payment" message="Delete this GST payment record?" danger/>
    </div>
  );
}
