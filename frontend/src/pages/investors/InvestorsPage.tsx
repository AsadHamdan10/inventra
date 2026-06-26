import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { investorApi } from '../../services/apiServices';
import { PageHeader, Modal, Field, Confirm, EmptyState, Spinner, SearchInput, StatusBadge, inr } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ef=()=>({investorName:'',mobile:'',investedAmount:0,profitPct:0,joinedDate:format(new Date(),'yyyy-MM-dd'),status:'Active' as const,notes:''});

export default function InvestorsPage() {
  const qc=useQueryClient();
  const [search,setSearch]=useState(''),[open,setOpen]=useState(false),[editing,setEditing]=useState<number|null>(null);
  const [del,setDel]=useState<number|null>(null),[form,setForm]=useState(ef());

  const {data:investors=[],isLoading}=useQuery({queryKey:['investors'],queryFn:()=>investorApi.list()});
  const save=useMutation({mutationFn:()=>editing?investorApi.update(editing,form):investorApi.create(form),onSuccess:()=>{qc.invalidateQueries({queryKey:['investors']});setOpen(false);toast.success('Saved.');},onError:(e:any)=>toast.error(e.response?.data?.error||'Error')});
  const remove=useMutation({mutationFn:(id:number)=>investorApi.delete(id),onSuccess:()=>{qc.invalidateQueries({queryKey:['investors']});setDel(null);toast.success('Deleted.');}});

  const openNew=()=>{setForm(ef());setEditing(null);setOpen(true);};
  const openEdit=(i:any)=>{setForm({investorName:i.investorName,mobile:i.mobile||'',investedAmount:+i.investedAmount,profitPct:+i.profitPct,joinedDate:i.joinedDate?format(new Date(i.joinedDate),'yyyy-MM-dd'):'',status:i.status,notes:i.notes||''});setEditing(i.id);setOpen(true);};
  const filtered=investors.filter((i:any)=>i.investorName.toLowerCase().includes(search.toLowerCase()));
  const totalInvested=investors.filter((i:any)=>i.status==='Active').reduce((s:number,i:any)=>s+ +i.investedAmount,0);
  const sf=(k:string)=>(e:any)=>setForm(p=>({...p,[k]:e.target.type==='number'?+e.target.value:e.target.value}));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

  <div className="flex justify-between items-start">

    <div>
      <h1 className="text-3xl font-bold text-slate-900">
        Investors
      </h1>

      <p className="mt-2 text-gray-500">
        {investors.length} investors · Active Capital: {inr(totalInvested)}
      </p>
    </div>

    {/* Desktop */}
    <div className="hidden lg:flex items-center gap-3">

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search investors..."
      />

      <button
        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        onClick={openNew}
      >
        <Plus size={16}/>
        Add Investor
      </button>

    </div>

  </div>

  {/* Mobile */}
  <div className="lg:hidden mt-4 space-y-3">

    <SearchInput
      value={search}
      onChange={setSearch}
      placeholder="Search investors..."
    />

    <button
      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-md"
      onClick={openNew}
    >
      + Add Investor
    </button>

  </div>

</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

  <div className="card p-4 text-center">
    <p className="text-xs text-gray-500 uppercase tracking-wider">
      Total Investors
    </p>

    <p className="text-2xl font-bold text-indigo-600 mt-1">
      {investors.length}
    </p>
  </div>

  <div className="card p-4 text-center">
    <p className="text-xs text-gray-500 uppercase tracking-wider">
      Active Capital
    </p>

    <p className="text-2xl font-bold text-emerald-600 mt-1">
      {inr(totalInvested)}
    </p>
  </div>

  <div className="card p-4 text-center">
    <p className="text-xs text-gray-500 uppercase tracking-wider">
      Active Investors
    </p>

    <p className="text-2xl font-bold text-blue-600 mt-1">
      {investors.filter((i:any)=>i.status==='Active').length}
    </p>
  </div>

</div>
      <div className="table-container">

  {isLoading ? (
    <Spinner />
  ) : filtered.length === 0 ? (
    <EmptyState />
  ) : (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th className="text-right">Invested</th>
              <th className="text-right">Profit %</th>
              <th>Joined</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {filtered.map((i:any) => (

              <tr key={i.id}>

                <td className="font-semibold">
                  {i.investorName}
                </td>

                <td>
                  {i.mobile || '—'}
                </td>

                <td className="text-right font-bold text-blue-600">
                  {inr(i.investedAmount)}
                </td>

                <td className="text-right">
                  {i.profitPct}%
                </td>

                <td>
                  {i.joinedDate
                    ? format(new Date(i.joinedDate),'dd/MM/yyyy')
                    : '—'}
                </td>

                <td>
                  <StatusBadge status={i.status}/>
                </td>

                <td>
                  {i.notes || '—'}
                </td>

                <td>
                  <div className="flex gap-1">

                    <button
                      className="btn-ghost btn-sm p-1.5"
                      onClick={()=>openEdit(i)}
                    >
                      <Pencil size={13}/>
                    </button>

                    <button
                      className="btn-ghost btn-sm p-1.5 text-red-500"
                      onClick={()=>setDel(i.id)}
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

        {filtered.map((i:any) => (

          <div
            key={i.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >

            <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">

              <div className="flex justify-between items-start">

                <div>

                  <h3 className="font-bold text-slate-900">
                    {i.investorName}
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    {i.mobile || 'No Mobile'}
                  </p>

                </div>

                <StatusBadge status={i.status} />

              </div>

            </div>

            <div className="p-4">

              <div className="grid grid-cols-2 gap-3">

                <div className="bg-blue-50 rounded-xl p-3">

                  <p className="text-xs text-gray-500">
                    Invested Amount
                  </p>

                  <p className="font-bold text-blue-700 mt-1">
                    {inr(i.investedAmount)}
                  </p>

                </div>

                <div className="bg-green-50 rounded-xl p-3">

                  <p className="text-xs text-gray-500">
                    Profit Share
                  </p>

                  <p className="font-bold text-green-700 mt-1">
                    {i.profitPct}%
                  </p>

                </div>

              </div>

              <div className="mt-4">

                <p className="text-xs text-gray-400">
                  Joined Date
                </p>

                <p className="font-medium">
                  {i.joinedDate
                    ? format(new Date(i.joinedDate),'dd/MM/yyyy')
                    : '—'}
                </p>

              </div>

              {i.notes && (

                <div className="mt-4">

                  <p className="text-xs text-gray-400">
                    Notes
                  </p>

                  <p className="text-sm text-slate-600">
                    {i.notes}
                  </p>

                </div>

              )}

              <div className="mt-4 border-t pt-4 flex justify-end gap-2">

                <button
                  className="px-3 py-2 rounded-lg border"
                  onClick={()=>openEdit(i)}
                >
                  <Pencil size={15}/>
                </button>

                <button
                  className="px-3 py-2 rounded-lg border text-red-600"
                  onClick={()=>setDel(i.id)}
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
      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Investor':'Add Investor'}>
        <div className="space-y-3">
          <Field label="Investor Name" required><input className="input" value={form.investorName} onChange={sf('investorName')}/></Field>
          <Field label="Mobile"><input className="input" value={form.mobile} onChange={sf('mobile')}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Invested Amount (₹)" required><input className="input" type="number" min="0" step="0.01" value={form.investedAmount} onChange={sf('investedAmount')}/></Field>
            <Field label="Profit Share %"><input className="input" type="number" min="0" max="100" step="0.01" value={form.profitPct} onChange={sf('profitPct')}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Joined Date"><input className="input" type="date" value={form.joinedDate} onChange={sf('joinedDate')}/></Field>
            <Field label="Status"><select className="input" value={form.status} onChange={sf('status')}><option>Active</option><option>Inactive</option></select></Field>
          </div>
          <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={sf('notes')}/></Field>
          <div className="flex gap-2 justify-end pt-2"><button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" onClick={()=>save.mutate()} disabled={save.isPending||!form.investorName}>{save.isPending?'Saving…':'Save'}</button></div>
        </div>
      </Modal>
      <Confirm open={del!==null} onConfirm={()=>remove.mutate(del!)} onCancel={()=>setDel(null)} title="Delete Investor" message="Delete this investor record?" danger/>
    </div>
  );
}
