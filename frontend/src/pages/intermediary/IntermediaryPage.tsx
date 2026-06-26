import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { intermediaryApi } from '../../services/apiServices';
import { PageHeader, FilterBar, Modal, Field, Confirm, EmptyState, Spinner, SearchInput, inr } from '../../components/ui';
import { format, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ef=()=>({sellerCompany:'',buyerCompany:'',materialName:'',quantity:0,profitPerUnit:0,totalProfit:0,dealDate:format(new Date(),'yyyy-MM-dd'),notes:''});

export default function IntermediaryPage() {
  const qc=useQueryClient();
  const navigate = useNavigate();
  const td=format(new Date(),'yyyy-MM-dd'),ms=format(startOfMonth(new Date()),'yyyy-MM-dd');
  const [from,setFrom]=useState(ms),[to,setTo]=useState(td),[active,setActive]=useState({from:ms,to:td});
  const [search,setSearch]=useState(''),[open,setOpen]=useState(false),[editing,setEditing]=useState<number|null>(null);
  const [del,setDel]=useState<number|null>(null),[form,setForm]=useState(ef());

  const {data:deals=[],isLoading}=useQuery({queryKey:['intermediary',active.from,active.to],queryFn:()=>intermediaryApi.list({from:active.from,to:active.to})});
  const save=useMutation({mutationFn:()=>editing?intermediaryApi.update(editing,form):intermediaryApi.create(form),onSuccess:()=>{qc.invalidateQueries({queryKey:['intermediary']});setOpen(false);toast.success('Saved.');},onError:(e:any)=>toast.error(e.response?.data?.error||'Error')});
  const remove=useMutation({mutationFn:(id:number)=>intermediaryApi.delete(id),onSuccess:()=>{qc.invalidateQueries({queryKey:['intermediary']});setDel(null);toast.success('Deleted.');}});

  const openNew=()=>{setForm(ef());setEditing(null);setOpen(true);};
  const openEdit=(d:any)=>{setForm({sellerCompany:d.sellerCompany,buyerCompany:d.buyerCompany,materialName:d.materialName||'',quantity:+d.quantity,profitPerUnit:+d.profitPerUnit,totalProfit:+d.totalProfit,dealDate:format(new Date(d.dealDate),'yyyy-MM-dd'),notes:d.notes||''});setEditing(d.id);setOpen(true);};
  const filtered=deals.filter((d:any)=>[d.sellerCompany,d.buyerCompany,d.materialName].some((f:string)=>f?.toLowerCase().includes(search.toLowerCase())));
  const totalProfit=filtered.reduce((s:number,d:any)=>s+ +d.totalProfit,0);
  const handlePrint = () => {
  navigate(
    `/intermediary-print?from=${from}&to=${to}`
  );
};
  const sf=(k:string)=>(e:any)=>{ const v=e.target.type==='number'?+e.target.value:e.target.value; const upd={...form,[k]:v}; if(k==='quantity'||k==='profitPerUnit'){upd.totalProfit=+(upd.quantity*upd.profitPerUnit).toFixed(2);} setForm(upd); };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

  <div className="flex justify-between items-start mb-6">

    <div>
      <h1 className="text-3xl font-bold text-slate-900">
        Intermediary Deals
      </h1>

      <p className="mt-2 text-gray-500">
        {filtered.length} deals · Profit: {inr(totalProfit)}
      </p>
    </div>

    <div className="hidden lg:flex items-center gap-3">

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Seller, buyer, material..."
      />

      <button
        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        onClick={openNew}
      >
        <Plus size={16}/>
        Add Deal
      </button>

    </div>

  </div>

  {/* Desktop Filters */}
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
        setFrom(ms);
        setTo(td);
        setActive({from:ms,to:td});
      }}
    >
      This Month
    </button>

    <button
  className="h-10 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Print
</button>

  </div>

  {/* Mobile */}
  <div className="lg:hidden space-y-3">

    <SearchInput
      value={search}
      onChange={setSearch}
      placeholder="Seller, buyer, material..."
    />

    <button
      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-md"
      onClick={openNew}
    >
      + Add Deal
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
          setFrom(ms);
          setTo(td);
          setActive({from:ms,to:td});
        }}
      >
        This Month
      </button>

      <button
  className="h-10 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Print
</button>

    </div>

  </div>

</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

  <div className="card p-4 text-center">

    <p className="text-xs text-gray-500 uppercase tracking-wider">
      Total Deals
    </p>

    <p className="text-2xl font-bold text-indigo-600 mt-1">
      {filtered.length}
    </p>

  </div>

  <div className="card p-4 text-center">

    <p className="text-xs text-gray-500 uppercase tracking-wider">
      Total Profit
    </p>

    <p className="text-2xl font-bold text-emerald-600 mt-1">
      {inr(totalProfit)}
    </p>

  </div>

</div>
      <div className="table-container">

  {isLoading ? (
    <Spinner />
  ) : filtered.length === 0 ? (
    <EmptyState message="No intermediary deals found." />
  ) : (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">

        <table className="table">

          <thead>
            <tr>
              <th>Date</th>
              <th>Seller</th>
              <th>Buyer</th>
              <th>Material</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Profit</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {filtered.map((d:any)=>(

              <tr key={d.id}>

                <td>
                  {format(
                    new Date(d.dealDate),
                    'dd/MM/yyyy'
                  )}
                </td>

                <td>{d.sellerCompany}</td>

                <td>{d.buyerCompany}</td>

                <td>{d.materialName || '—'}</td>

                <td className="text-right">
                  {d.quantity}
                </td>

                <td className="text-right">
                  {inr(d.profitPerUnit)}
                </td>

                <td className="text-right font-bold text-emerald-600">
                  {inr(d.totalProfit)}
                </td>

                <td>{d.notes || '—'}</td>

                <td>
                  <div className="flex gap-1">

                    <button
                      className="btn-ghost btn-sm p-1.5"
                      onClick={()=>openEdit(d)}
                    >
                      <Pencil size={13}/>
                    </button>

                    <button
                      className="btn-ghost btn-sm p-1.5 text-red-500"
                      onClick={()=>setDel(d.id)}
                    >
                      <Trash2 size={13}/>
                    </button>

                  </div>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">

        {filtered.map((d:any)=>(

          <div
            key={d.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >

            <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">

              <p className="text-xs text-gray-500">
                {format(
                  new Date(d.dealDate),
                  'dd/MM/yyyy'
                )}
              </p>

              <h3 className="font-bold text-slate-900 mt-1">
                {d.materialName || 'Intermediary Deal'}
              </h3>

            </div>

            <div className="p-4">

              <div className="space-y-3">

                <div>

                  <p className="text-xs text-gray-400">
                    Seller
                  </p>

                  <p className="font-semibold">
                    {d.sellerCompany}
                  </p>

                </div>

                <div>

                  <p className="text-xs text-gray-400">
                    Buyer
                  </p>

                  <p className="font-semibold">
                    {d.buyerCompany}
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">

                <div className="bg-blue-50 rounded-xl p-3">

                  <p className="text-xs">
                    Qty
                  </p>

                  <p className="font-bold text-blue-700">
                    {d.quantity}
                  </p>

                </div>

                <div className="bg-orange-50 rounded-xl p-3">

                  <p className="text-xs">
                    Rate
                  </p>

                  <p className="font-bold text-orange-700">
                    {inr(d.profitPerUnit)}
                  </p>

                </div>

                <div className="bg-green-50 rounded-xl p-3">

                  <p className="text-xs">
                    Profit
                  </p>

                  <p className="font-bold text-green-700">
                    {inr(d.totalProfit)}
                  </p>

                </div>

              </div>

              {d.notes && (

                <div className="mt-4">

                  <p className="text-xs text-gray-400">
                    Notes
                  </p>

                  <p className="text-sm text-slate-600">
                    {d.notes}
                  </p>

                </div>

              )}

              <div className="mt-4 border-t pt-4 flex justify-end gap-2">

                <button
                  className="px-3 py-2 rounded-lg border"
                  onClick={()=>openEdit(d)}
                >
                  <Pencil size={15}/>
                </button>

                <button
                  className="px-3 py-2 rounded-lg border text-red-600"
                  onClick={()=>setDel(d.id)}
                >
                  <Trash2 size={15}/>
                </button>

              </div>

            </div>

          </div>

        ))}

      </div>
    </>
  )}

</div>
      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Deal':'New Intermediary Deal'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seller Company" required><input className="input" value={form.sellerCompany} onChange={sf('sellerCompany')}/></Field>
            <Field label="Buyer Company" required><input className="input" value={form.buyerCompany} onChange={sf('buyerCompany')}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Material"><input className="input" value={form.materialName} onChange={sf('materialName')}/></Field>
            <Field label="Deal Date"><input className="input" type="date" value={form.dealDate} onChange={sf('dealDate')}/></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Quantity"><input className="input" type="number" min="0" step="0.001" value={form.quantity} onChange={sf('quantity')}/></Field>
            <Field label="Profit/Unit (₹)"><input className="input" type="number" min="0" step="0.01" value={form.profitPerUnit} onChange={sf('profitPerUnit')}/></Field>
            <Field label="Total Profit (₹)"><input className="input font-bold" type="number" min="0" step="0.01" value={form.totalProfit} onChange={sf('totalProfit')}/></Field>
          </div>
          <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={sf('notes')}/></Field>
          <div className="flex gap-2 justify-end pt-2"><button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" onClick={()=>save.mutate()} disabled={save.isPending||!form.sellerCompany||!form.buyerCompany}>{save.isPending?'Saving…':'Save'}</button></div>
        </div>
      </Modal>
      <Confirm open={del!==null} onConfirm={()=>remove.mutate(del!)} onCancel={()=>setDel(null)} title="Delete Deal" message="Delete this intermediary deal?" danger/>
    </div>
  );
}
