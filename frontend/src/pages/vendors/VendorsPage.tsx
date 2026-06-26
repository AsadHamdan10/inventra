import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { vendorApi } from '../../services/apiServices';
import { PageHeader, Modal, Field, Confirm, EmptyState, Spinner, SearchInput, Badge, inr } from '../../components/ui';
import toast from 'react-hot-toast';

const empty = { vendorName:'', vendorGstin:'', contact:'', phone:'', email:'', address:'' };

export default function VendorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number|null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<number|null>(null);

  const { data=[], isLoading } = useQuery({ queryKey:['vendors'], queryFn:()=>vendorApi.list() });
  const save = useMutation({
    mutationFn: () => editing ? vendorApi.update(editing, form) : vendorApi.create(form),
    onSuccess: () => { qc.invalidateQueries({queryKey:['vendors']}); setOpen(false); toast.success('Saved.'); },
    onError: (e:any) => toast.error(e.response?.data?.error||'Error'),
  });
  const remove = useMutation({
    mutationFn: (id:number) => vendorApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({queryKey:['vendors']}); setDel(null); toast.success('Deleted.'); },
  });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (v:any) => { setForm({vendorName:v.vendorName,vendorGstin:v.vendorGstin||'',contact:v.contact||'',phone:v.phone||'',email:v.email||'',address:v.address||''}); setEditing(v.id); setOpen(true); };
  const filtered = data.filter((v:any) => v.vendorName.toLowerCase().includes(search.toLowerCase()) || v.phone?.includes(search));
  const f = (k:keyof typeof empty) => (e:any) => setForm(p=>({...p,[k]:e.target.value}));

  return (
    <div className="space-y-4">
      {/* Desktop Header */}
<div className="hidden lg:block">
  <PageHeader
    title="Vendors"
    subtitle={`${data.length} vendors`}
    actions={
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search Vendors..."
      />
    }
  />
</div>

{/* Mobile Header */}
<div className="lg:hidden space-y-3">

  <div>
    <h1 className="text-3xl font-bold text-slate-900">
      Vendors
    </h1>

    <p className="text-gray-500 mt-1">
      {`${data.length} vendors`}
    </p>
  </div>
<div className="w-full">
  <input
    type="text"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search Vendors..."
    className="input w-full"
  />
</div>

</div>

{/* Mobile Only */}
<div className="lg:hidden mb-4">
  <button
    className="btn-primary w-full justify-center"
    onClick={openNew}
  >
    <Plus size={15} />
    Add Vendor
  </button>
</div>

{/* Desktop Only */}
<div className="hidden lg:flex justify-end -mt-14 mb-4">
  <button
    className="btn-primary"
    onClick={openNew}
  >
    <Plus size={15} />
    Add Vendor
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
              <th>Vendor Name</th>
              <th>GSTIN</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((v:any) => (
              <tr key={v.id}>
                <td className="font-medium">{v.vendorName}</td>
                <td className="font-mono text-xs">{v.vendorGstin || '—'}</td>
                <td>{v.contact || '—'}</td>
                <td>{v.phone || '—'}</td>
                <td>{v.email || '—'}</td>

                <td>
                  <div className="flex gap-1">
                    <button
                      className="btn-ghost btn-sm p-1.5"
                      onClick={() => openEdit(v)}
                    >
                      <Pencil size={13}/>
                    </button>

                    <button
                      className="btn-ghost btn-sm p-1.5 text-red-500"
                      onClick={() => setDel(v.id)}
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

      {/* Mobile + Tablet */}
      <div className="lg:hidden space-y-3">
        {filtered.map((v:any) => (
          <div
            key={v.id}
            className="card overflow-hidden"
          >
            <div className="p-4 bg-slate-50 dark:bg-gray-800 border-b">
              <div className="font-semibold text-base">
                {v.vendorName}
              </div>

              <div className="text-xs font-mono text-gray-500 mt-1">
                GST: {v.vendorGstin || '—'}
              </div>
            </div>

            <div className="p-4 space-y-2 text-sm">

              <div>
                <span className="text-gray-500">
                  Contact:
                </span>{' '}
                {v.contact || '—'}
              </div>

              <div>
                <span className="text-gray-500">
                  Phone:
                </span>{' '}
                {v.phone || '—'}
              </div>

              <div className="break-all">
                <span className="text-gray-500">
                  Email:
                </span>{' '}
                {v.email || '—'}
              </div>

            </div>

            <div className="grid grid-cols-2 border-t">

              <button
                onClick={() => openEdit(v)}
                className="flex items-center justify-center gap-2 py-3 text-blue-600 border-r hover:bg-blue-50"
              >
                <Pencil size={16}/>
                Edit
              </button>

              <button
                onClick={() => setDel(v.id)}
                className="flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50"
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
      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Vendor':'New Vendor'}>
        <div className="space-y-3">
          <Field label="Vendor Name" required><input className="input" value={form.vendorName} onChange={f('vendorName')} placeholder="Company name"/></Field>
          <Field label="GSTIN"><input className="input font-mono uppercase" value={form.vendorGstin} onChange={f('vendorGstin')} placeholder="22AAAAA0000A1Z5" maxLength={15}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Person"><input className="input" value={form.contact} onChange={f('contact')}/></Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={f('phone')}/></Field>
          </div>
          <Field label="Email"><input className="input" type="email" value={form.email} onChange={f('email')}/></Field>
          <Field label="Address"><textarea className="input" rows={2} value={form.address} onChange={f('address')}/></Field>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={()=>save.mutate()} disabled={save.isPending}>{save.isPending?'Saving…':'Save'}</button>
          </div>
        </div>
      </Modal>
      <Confirm open={del!==null} onConfirm={()=>remove.mutate(del!)} onCancel={()=>setDel(null)} title="Delete Vendor" message="Delete this vendor? This cannot be undone." danger />
    </div>
  );
}
