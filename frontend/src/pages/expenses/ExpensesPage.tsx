import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { expenseApi } from '../../services/apiServices';
import { PageHeader, FilterBar, Modal, Field, Confirm, EmptyState, Spinner, SearchInput, inr } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const CATS=['General','Rent','Salary','Transport','Utilities','Office Supplies','Marketing','Maintenance','Insurance','Professional Fees','Other'];
const ef=()=>({expenseName:'',amount:0,expenseDate:format(new Date(),'yyyy-MM-dd'),category:'General',deductProfit:true,notes:''});

export default function ExpensesPage() {
  const qc=useQueryClient();
  const today=format(new Date(),'yyyy-MM-dd');
  const [from,setFrom]=useState(''), [to,setTo]=useState(''), [active,setActive]=useState({from:'',to:''});
  const [search,setSearch]=useState(''),[open,setOpen]=useState(false),[editing,setEditing]=useState<number|null>(null);
  const [del,setDel]=useState<number|null>(null),[form,setForm]=useState(ef());

  const navigate = useNavigate();

const handlePrint = () => {
  navigate(
    `/expense-print?from=${from}&to=${to}&search=${encodeURIComponent(search)}`
  );
};

  const {data:expenses=[],isLoading}=useQuery({queryKey:['expenses',active.from,active.to],queryFn:()=>expenseApi.list(active.from&&active.to?{from:active.from,to:active.to}:{})});
  const save=useMutation({mutationFn:()=>editing?expenseApi.update(editing,form):expenseApi.create(form),onSuccess:()=>{qc.invalidateQueries({queryKey:['expenses']});qc.invalidateQueries({queryKey:['dashboard']});setOpen(false);toast.success('Saved.');},onError:(e:any)=>toast.error(e.response?.data?.error||'Error')});
  const remove=useMutation({mutationFn:(id:number)=>expenseApi.delete(id),onSuccess:()=>{qc.invalidateQueries({queryKey:['expenses']});setDel(null);toast.success('Deleted.');}});

  const quickFilter=(p:'month'|'year')=>{const now=new Date();if(p==='month'){const f=format(new Date(now.getFullYear(),now.getMonth(),1),'yyyy-MM-dd');const t=format(new Date(now.getFullYear(),now.getMonth()+1,0),'yyyy-MM-dd');setFrom(f);setTo(t);setActive({from:f,to:t});}else{const f=`${now.getFullYear()}-01-01`;const t=`${now.getFullYear()}-12-31`;setFrom(f);setTo(t);setActive({from:f,to:t});}};
  const openNew=()=>{setForm(ef());setEditing(null);setOpen(true);};
  const openEdit=(e:any)=>{setForm({expenseName:e.expenseName,amount:+e.amount,expenseDate:format(new Date(e.expenseDate),'yyyy-MM-dd'),category:e.category,deductProfit:e.deductProfit,notes:e.notes||''});setEditing(e.id);setOpen(true);};
  const filtered=expenses.filter((e:any)=>e.expenseName.toLowerCase().includes(search.toLowerCase())||e.category.toLowerCase().includes(search.toLowerCase()));
  const total=filtered.reduce((s:number,e:any)=>s+ +e.amount,0);
  const deductible=filtered.filter((e:any)=>e.deductProfit).reduce((s:number,e:any)=>s+ +e.amount,0);
  const byCat:Record<string,number>={};filtered.forEach((e:any)=>{byCat[e.category]=(byCat[e.category]||0)+ +e.amount;});
  const sf=(k:string)=>(ev:any)=>setForm(p=>({...p,[k]:ev.target.type==='checkbox'?ev.target.checked:ev.target.type==='number'?+ev.target.value:ev.target.value}));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">

  <div className="flex justify-between items-start mb-6">

    <div>
      <h1 className="text-3xl font-bold text-slate-900">
        Expenses
      </h1>

      <p className="mt-2 text-gray-500">
        {filtered.length} records · {inr(total)}
      </p>
    </div>

    <div className="hidden lg:flex items-center gap-3">

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search expenses..."
      />

      <button
        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        onClick={openNew}
      >
        <Plus size={16}/>
        Add Expense
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
  Print Expenses
</button>

  </div>

  {/* Mobile */}
  <div className="lg:hidden space-y-3">

    <SearchInput
      value={search}
      onChange={setSearch}
      placeholder="Search expenses..."
    />

    <button
      className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-md"
      onClick={openNew}
    >
      + Add Expense
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
  className="h-12 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Print Expenses
</button>

    </div>

  </div>

</div>
      {/* Desktop Summary */}
<div className="hidden md:grid grid-cols-3 gap-3">

  <div className="card p-3 text-center">
    <p className="text-xs text-gray-500">Total</p>
    <p className="text-xl font-bold text-red-600">{inr(total)}</p>
  </div>

  <div className="card p-3 text-center">
    <p className="text-xs text-gray-500">Profit-Deductible</p>
    <p className="text-xl font-bold text-orange-500">{inr(deductible)}</p>
  </div>

  <div className="card p-3 text-center">
    <p className="text-xs text-gray-500">Non-Deductible</p>
    <p className="text-xl font-bold text-gray-500">
      {inr(total-deductible)}
    </p>
  </div>

</div>

{/* Mobile Summary */}
<div className="md:hidden space-y-3">

  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
    <p className="text-xs text-red-600">
      Total Expenses
    </p>

    <p className="text-2xl font-bold text-red-700 mt-1">
      {inr(total)}
    </p>
  </div>

  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
    <p className="text-xs text-orange-600">
      Profit Deductible
    </p>

    <p className="text-2xl font-bold text-orange-700 mt-1">
      {inr(deductible)}
    </p>
  </div>

  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
    <p className="text-xs text-slate-600">
      Non Deductible
    </p>

    <p className="text-2xl font-bold text-slate-700 mt-1">
      {inr(total-deductible)}
    </p>
  </div>

</div>
      {Object.keys(byCat).length>0&&<div className="card p-4"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">By Category</p><div className="flex flex-wrap gap-2">{Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([c,a])=><div key={c} className="bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm flex gap-2"><span className="text-gray-600 dark:text-gray-400">{c}</span><strong className="text-red-600">{inr(a)}</strong></div>)}</div></div>}
      <div className="table-container">

        

  {isLoading ? (
    <Spinner />
  ) : filtered.length === 0 ? (
    <EmptyState message="No expenses found." />
  ) : (
    <>

      {/* Desktop Table */}
      <div className="hidden md:block">

        <table className="table">

          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Category</th>
              <th className="text-right">Amount</th>
              <th className="text-center">Deductible</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((e:any)=>(
              <tr key={e.id}>
                <td className="text-sm">
                  {format(new Date(e.expenseDate),'dd/MM/yyyy')}
                </td>

                <td className="font-medium">
                  {e.expenseName}
                </td>

                <td>
                  <span className="badge-gray text-xs">
                    {e.category}
                  </span>
                </td>

                <td className="text-right font-semibold text-red-600">
                  {inr(e.amount)}
                </td>

                <td className="text-center">
                  {e.deductProfit
                    ? <span className="badge-green text-xs">Yes</span>
                    : <span className="badge-gray text-xs">No</span>
                  }
                </td>

                <td className="text-sm text-gray-500 max-w-[150px] truncate">
                  {e.notes || '—'}
                </td>

                <td>
                  <div className="flex gap-1">
                    <button
                      className="btn-ghost btn-sm p-1.5"
                      onClick={()=>openEdit(e)}
                    >
                      <Pencil size={13}/>
                    </button>

                    <button
                      className="btn-ghost btn-sm p-1.5 text-red-500"
                      onClick={()=>setDel(e.id)}
                    >
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold">
              <td colSpan={3} className="px-4 py-2">
                TOTAL
              </td>

              <td className="px-4 py-2 text-right text-red-600">
                {inr(total)}
              </td>

              <td colSpan={3}></td>
            </tr>
          </tfoot>

        </table>

      </div>

      {/* Mobile Cards */}
      <div className="md:hidden p-4 space-y-4">

        {filtered.map((e:any) => (

          <div
            key={e.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >

            <div className="px-4 py-4 bg-gradient-to-r from-red-50 to-orange-50 border-b">

              <div className="flex justify-between items-center">

                <h3 className="font-bold">
                  {e.expenseName}
                </h3>

                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  {e.category}
                </span>

              </div>

              <p className="text-xs text-gray-500 mt-1">
                {format(new Date(e.expenseDate),'dd/MM/yyyy')}
              </p>

            </div>

            <div className="p-4">

              <div className="bg-red-50 rounded-xl p-3 mb-4">

                <p className="text-xs">
                  Expense Amount
                </p>

                <p className="font-bold text-xl text-red-700">
                  {inr(e.amount)}
                </p>

              </div>

              <div className="space-y-3">

                <div>
                  <p className="text-xs text-gray-400">
                    Deductible
                  </p>

                  <p className="font-medium">
                    {e.deductProfit ? 'Yes' : 'No'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Notes
                  </p>

                  <p className="text-sm">
                    {e.notes || '—'}
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">

                <button
                  className="py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                  onClick={() => openEdit(e)}
                >
                  Edit
                </button>

                <button
                  className="py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 font-medium"
                  onClick={() => setDel(e.id)}
                >
                  Delete
                </button>

              </div>

            </div>

          </div>

        ))}

      </div>

    </>
  )}

</div>
      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Expense':'Add Expense'}>
        <div className="space-y-3">
          <Field label="Expense Name" required><input className="input" value={form.expenseName} onChange={sf('expenseName')} placeholder="e.g. Office Rent"/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹)" required><input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={sf('amount')}/></Field>
            <Field label="Date" required><input className="input" type="date" value={form.expenseDate} onChange={sf('expenseDate')}/></Field>
          </div>
          <Field label="Category"><select className="input" value={form.category} onChange={sf('category')}>{CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.deductProfit} onChange={sf('deductProfit')} className="w-4 h-4 rounded"/><span>Deduct from Profit/Loss Report</span></label>
          <Field label="Notes"><textarea className="input" rows={2} value={form.notes} onChange={sf('notes')}/></Field>
          <div className="flex gap-2 justify-end pt-2"><button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary" onClick={()=>save.mutate()} disabled={save.isPending||!form.expenseName||form.amount<=0}>{save.isPending?'Saving…':'Save'}</button></div>
        </div>
      </Modal>
      <Confirm open={del!==null} onConfirm={()=>remove.mutate(del!)} onCancel={()=>setDel(null)} title="Delete Expense" message="Delete this expense?" danger/>
    </div>
  );
}
