import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { materialApi } from '../../services/apiServices';
import { PageHeader, Modal, Field, Confirm, EmptyState, Spinner, SearchInput } from '../../components/ui';
import toast from 'react-hot-toast';

const empty = { materialName:'', hsnCode:'', unit:'Nos' };
const units = ['Nos','Kg','MT','Litre','Box','Set','Meter','Sq.Ft','Sq.Mt','Other'];

export default function MaterialsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number|null>(null);
  const [open, setOpen] = useState(false);
  const [del, setDel] = useState<number|null>(null);

  const {data=[], isLoading} = useQuery({queryKey:['materials'],queryFn:()=>materialApi.list()});
  const save = useMutation({
    mutationFn:()=>editing?materialApi.update(editing,form):materialApi.create(form),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['materials']});setOpen(false);toast.success('Saved.');},
    onError:(e:any)=>toast.error(e.response?.data?.error||'Error'),
  });
  const remove = useMutation({
    mutationFn:(id:number)=>materialApi.delete(id),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['materials']});setDel(null);toast.success('Deleted.');},
  });
  const filtered=data.filter((m:any)=>m.materialName.toLowerCase().includes(search.toLowerCase())||m.hsnCode?.includes(search));
  const f=(k:keyof typeof empty)=>(e:any)=>setForm(p=>({...p,[k]:e.target.value}));

  return (
    <div className="space-y-4">
       {/* Desktop Only */}
<div className="hidden lg:block">
  <PageHeader
    title="Materials"
    subtitle={`${data.length} materials`}
    actions={
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search Materials..."
      />
    }
  />
</div>


{/* Mobile Header */}
<div className="lg:hidden space-y-3">

  <div>
    <h1 className="text-3xl font-bold text-slate-900">
      Materials
    </h1>

    <p className="text-gray-500 mt-1">
      {`${data.length} materials`}
    </p>
  </div>

  <div className="w-full">
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search Materials..."
      className="input w-full"
    />
  </div>

</div>

{/* Mobile Only */}
<div className="lg:hidden mb-4">
  <button
    className="btn-primary w-full justify-center"
    onClick={()=>{
      setForm(empty);
      setEditing(null);
      setOpen(true);
    }}
  >
    <Plus size={15}/>
    Add Material
  </button>
</div>

{/* Desktop Only */}
<div className="hidden lg:flex justify-end -mt-14 mb-4">
  <button
    className="btn-primary"
    onClick={()=>{
      setForm(empty);
      setEditing(null);
      setOpen(true);
    }}
  >
    <Plus size={15}/>
    Add Material
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
              <th>#</th>
              <th>Material Name</th>
              <th>HSN Code</th>
              <th>Unit</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((m:any,i:number)=>(
              <tr key={m.id}>
                <td className="text-gray-400 text-xs">{i+1}</td>
                <td className="font-medium">{m.materialName}</td>
                <td className="font-mono text-xs">{m.hsnCode||'—'}</td>
                <td>{m.unit}</td>

                <td>
                  <div className="flex gap-1">
                    <button
                      className="btn-ghost btn-sm p-1.5"
                      onClick={()=>{
                        setForm({
                          materialName:m.materialName,
                          hsnCode:m.hsnCode||'',
                          unit:m.unit
                        });
                        setEditing(m.id);
                        setOpen(true);
                      }}
                    >
                      <Pencil size={13}/>
                    </button>

                    <button
                      className="btn-ghost btn-sm p-1.5 text-red-500"
                      onClick={()=>setDel(m.id)}
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

        {filtered.map((m:any)=>(
          <div
            key={m.id}
            className="card overflow-hidden"
          >
            <div className="p-4 bg-slate-50 dark:bg-gray-800 border-b">

              <div className="font-semibold text-base">
                {m.materialName}
              </div>

              <div className="text-xs font-mono text-gray-500 mt-1">
                HSN : {m.hsnCode || '—'}
              </div>

            </div>

            <div className="p-4 text-sm">
              <span className="text-gray-500">
                Unit:
              </span>{' '}
              {m.unit}
            </div>

            <div className="grid grid-cols-2 border-t">

              <button
                onClick={()=>{
                  setForm({
                    materialName:m.materialName,
                    hsnCode:m.hsnCode||'',
                    unit:m.unit
                  });
                  setEditing(m.id);
                  setOpen(true);
                }}
                className="flex items-center justify-center gap-2 py-3 text-blue-600 border-r hover:bg-blue-50"
              >
                <Pencil size={16}/>
                Edit
              </button>

              <button
                onClick={()=>setDel(m.id)}
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
      <Modal open={open} onClose={()=>setOpen(false)} title={editing?'Edit Material':'New Material'}>
        <div className="space-y-3">
          <Field label="Material Name" required><input className="input" value={form.materialName} onChange={f('materialName')}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="HSN Code"><input className="input font-mono" value={form.hsnCode} onChange={f('hsnCode')}/></Field>
            <Field label="Unit"><select className="input" value={form.unit} onChange={f('unit')}>{units.map(u=><option key={u}>{u}</option>)}</select></Field>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={()=>save.mutate()} disabled={save.isPending}>{save.isPending?'Saving…':'Save'}</button>
          </div>
        </div>
      </Modal>
      <Confirm open={del!==null} onConfirm={()=>remove.mutate(del!)} onCancel={()=>setDel(null)} title="Delete Material" message="Delete this material?" danger/>
    </div>
  );
}
