import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { customerApi } from '../../services/apiServices';
import { PageHeader, Modal, Field, Confirm, EmptyState, Spinner, SearchInput, inr } from '../../components/ui';
import toast from 'react-hot-toast';

const empty = {
  companyName:'',
  gstin:'',
  contact:'',
  phone:'',
  email:'',
  address:'',
  deliveryAddress:'',
  paymentTerms:30
};

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<typeof empty>(empty);
  const [editing, setEditing] = useState<number|null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<number|null>(null);

  const { data=[], isLoading } = useQuery({ queryKey:['customers'], queryFn:()=>customerApi.list() });
  const save = useMutation({
    mutationFn: () => editing ? customerApi.update(editing, form) : customerApi.create(form),
    onSuccess: () => { qc.invalidateQueries({queryKey:['customers']}); setOpen(false); toast.success('Saved.'); },
    onError: (e:any) => toast.error(e.response?.data?.error||'Error'),
  });
  const remove = useMutation({
    mutationFn:(id:number)=>customerApi.delete(id),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['customers']});setDel(null);toast.success('Deleted.');},
  });
  const openNew = ()=>{setForm(empty);setEditing(null);setOpen(true);};
  const openEdit=(c:any)=>{setForm({
  companyName:c.companyName,
  gstin:c.gstin||'',
  contact:c.contact||'',
  phone:c.phone||'',
  email:c.email||'',
  address:c.address||'',
  deliveryAddress:c.deliveryAddress||'',
  paymentTerms:c.paymentTerms
});setEditing(c.id);setOpen(true);};
  const filtered=data.filter((c:any)=>c.companyName.toLowerCase().includes(search.toLowerCase()));
  const f=(k:keyof typeof empty)=>(e:any)=>setForm(p=>({...p,[k]:e.target.value}));

  return (
    <div className="space-y-4">
      {/* Desktop Only */}
<div className="hidden lg:block">
  <PageHeader
    title="Customers"
    subtitle={`${data.length} customers`}
    actions={
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search Customers..."
      />
    }
  />
</div>


{/* Mobile Header */}
<div className="lg:hidden space-y-3">

  <div>
    <h1 className="text-3xl font-bold text-slate-900">
      Customers
    </h1>

    <p className="text-gray-500 mt-1">
      {`${data.length} customers`}
    </p>
  </div>

  <div className="w-full">
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search Customers..."
      className="input w-full"
    />
  </div>

</div> {/* ← MISSING CLOSING DIV */}


{/* Mobile Only Add Customer */}
<div className="lg:hidden mb-4">
  <button
    className="btn-primary w-full justify-center"
    onClick={openNew}
  >
    <Plus size={15} />
    Add Customer
  </button>
</div>

{/* Desktop Only Add Customer */}
<div className="hidden lg:flex justify-end -mt-14 mb-4">
  <button
    className="btn-primary"
    onClick={openNew}
  >
    <Plus size={15} />
    Add Customer
  </button>
</div>
<div className="table-container">

  {isLoading ? (
    <Spinner />
  ) : filtered.length === 0 ? (
    <EmptyState />
  ) : (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">

        <table className="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>GSTIN</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Terms</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c:any)=>(
              <tr key={c.id}>
                <td className="font-medium">{c.companyName}</td>
                <td className="font-mono text-xs">{c.gstin||'—'}</td>
                <td>{c.contact||'—'}</td>
                <td>{c.phone||'—'}</td>
                <td>{c.email||'—'}</td>
                <td>{c.paymentTerms} days</td>

                <td>
                  <div className="flex gap-1">
                    <button
                      className="btn-ghost btn-sm p-1.5"
                      onClick={()=>openEdit(c)}
                    >
                      <Pencil size={13}/>
                    </button>

                    <button
                      className="btn-ghost btn-sm p-1.5 text-red-500"
                      onClick={()=>setDel(c.id)}
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

      {/* Mobile & Tablet */}
      <div className="lg:hidden space-y-3">

        {filtered.map((c:any)=>(
          <div key={c.id} className="card overflow-hidden">

            <div className="p-4 bg-slate-50 border-b">
              <div className="font-semibold text-base">
                {c.companyName}
              </div>

              <div className="text-xs font-mono text-gray-500 mt-1">
                GST : {c.gstin || '—'}
              </div>
            </div>

            <div className="p-4 space-y-2 text-sm">

              <div>
                <span className="text-gray-500">Contact:</span>{' '}
                {c.contact || '—'}
              </div>

              <div>
                <span className="text-gray-500">Phone:</span>{' '}
                {c.phone || '—'}
              </div>

              <div className="break-all">
                <span className="text-gray-500">Email:</span>{' '}
                {c.email || '—'}
              </div>

              <div>
                <span className="text-gray-500">Terms:</span>{' '}

                <span className="inline-flex px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700">
                  {c.paymentTerms} days
                </span>
              </div>

            </div>

            <div className="grid grid-cols-2 border-t">

              <button
                onClick={()=>openEdit(c)}
                className="flex items-center justify-center gap-2 py-3 text-blue-600 border-r"
              >
                <Pencil size={16}/>
                Edit
              </button>

              <button
                onClick={()=>setDel(c.id)}
                className="flex items-center justify-center gap-2 py-3 text-red-600"
              >
                <Trash2 size={16}/>
                Delete
              </button>

            </div>

          </div>
        ))}

      </div>
    </>
  )}

</div>
      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Customer':'New Customer'}>
        <div className="space-y-3">
          <Field label="Company Name" required><input className="input" value={form.companyName} onChange={f('companyName')}/></Field>
          <Field label="GSTIN"><input className="input font-mono uppercase" value={form.gstin} onChange={f('gstin')} maxLength={15}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Person"><input className="input" value={form.contact} onChange={f('contact')}/></Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={f('phone')}/></Field>
          </div>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={f('email')}/></Field>
          <Field label="Address"><textarea className="input" rows={2} value={form.address} onChange={f('address')}/></Field>
          <Field label="Delivery Address">
  <textarea
    className="input"
    rows={2}
    value={form.deliveryAddress}
    onChange={f('deliveryAddress')}
    placeholder="Leave blank if same as address"
  />
</Field>
          <Field label="Payment Terms (days)"><input className="input" type="number" value={form.paymentTerms} onChange={f('paymentTerms')}/></Field>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={()=>save.mutate()} disabled={save.isPending}>{save.isPending?'Saving…':'Save'}</button>
          </div>
        </div>
      </Modal>
      <Confirm open={del!==null} onConfirm={()=>remove.mutate(del!)} onCancel={()=>setDel(null)} title="Delete Customer" message="Delete this customer?" danger/>
    </div>
  );
}
