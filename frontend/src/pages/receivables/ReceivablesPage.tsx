import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Pencil, Trash2 } from 'lucide-react';
import { reportApi, saleApi } from '../../services/apiServices';
import { PageHeader, Modal, Field, Spinner, EmptyState, SearchInput, inr } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ep=()=>({amount:0,dateReceived:format(new Date(),'yyyy-MM-dd'),mode:'Cash',reference:'',notes:''});

export default function ReceivablesPage() {
  const qc=useQueryClient();
  const today=format(new Date(),'yyyy-MM-dd');
  const [from,setFrom]=useState(''), [to,setTo]=useState(''), [active,setActive]=useState({from:'',to:''});
  const [search,setSearch]=useState('');
  const [payModal,setPayModal]=useState<{open:boolean;saleId:number|null;invoiceNo:string;balance:number}>({open:false,saleId:null,invoiceNo:'',balance:0});
  const [payment,setPayment]=useState(ep());
  const [editModal,setEditModal]=useState({
  open:false,
  payment:null as any
});

const [editPayment,setEditPayment]=useState(ep());
  const [historyModal,setHistoryModal]=useState({
  open:false,
  saleId:null as number | null,
  invoiceNo:''
});

const navigate = useNavigate(); 
const handlePrint = () => { navigate( `/receivable-print?from=${active.from}&to=${active.to}` ); };

const [deleteModal, setDeleteModal] = useState({
  open: false,
  paymentId: null as number | null,
});

  const {data,isLoading}=useQuery({queryKey:['receivables',active.from,active.to],queryFn:()=>reportApi.receivables(active.from&&active.to?{from:active.from,to:active.to}:{})});
  const {
  data: payments = [],
  isLoading: loadingPayments,
} = useQuery({
  queryKey: ['sale-payments', historyModal.saleId],
  enabled: historyModal.open,
  queryFn: () => saleApi.getPayments(historyModal.saleId!),
});
  const rows=data?.rows||[];
  const addPay=useMutation({mutationFn:()=>saleApi.addPayment(payModal.saleId!,payment),onSuccess:()=>{qc.invalidateQueries({queryKey:['receivables']});setPayModal({open:false,saleId:null,invoiceNo:'',balance:0});setPayment(ep());toast.success('Payment recorded.');},onError:(e:any)=>toast.error(e.response?.data?.error||'Failed.')});
  const updatePay=useMutation({
  mutationFn:({id,data}:any)=>
    saleApi.updatePayment(id,data),

  onSuccess:()=>{
    qc.invalidateQueries({
      queryKey:['receivables']
    });

    qc.invalidateQueries({
      queryKey:['sale-payments']
    });

    setEditModal({
      open:false,
      payment:null
    });

    toast.success('Payment updated.');
  }
});

const deletePay=useMutation({
  mutationFn:(id:number)=>
    saleApi.deletePayment(id),

  onSuccess:()=>{
    qc.invalidateQueries({
      queryKey:['receivables']
    });

    qc.invalidateQueries({
      queryKey:['sale-payments']
    });

    toast.success('Payment deleted.');
  }
});

  const quickFilter=(p:'month'|'year')=>{const now=new Date();if(p==='month'){const f=format(new Date(now.getFullYear(),now.getMonth(),1),'yyyy-MM-dd');const t=format(new Date(now.getFullYear(),now.getMonth()+1,0),'yyyy-MM-dd');setFrom(f);setTo(t);setActive({from:f,to:t});}else{const f=`${now.getFullYear()}-01-01`;const t=`${now.getFullYear()}-12-31`;setFrom(f);setTo(t);setActive({from:f,to:t});}};
  const filtered=rows.filter((r:any)=>r.companyName.toLowerCase().includes(search.toLowerCase())||r.invoiceNo?.toLowerCase().includes(search.toLowerCase()));
  const outstanding=filtered.filter((r:any)=>r.balance>0).reduce((s:number,r:any)=>s+r.balance,0);
  const totalRev=filtered.reduce((s:number,r:any)=>s+ +r.grandTotal,0);

  return (
    <div className="space-y-4">
      {/* Desktop Header */}
<div className="hidden lg:block">
  <PageHeader
    title="Receivables"
    subtitle="Track outstanding customer payments"
    actions={
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search..."
      />
    }
  />
</div>

{/* Mobile Header */}
<div className="lg:hidden space-y-3">

  <div>
    <h1 className="text-3xl font-bold text-slate-900">
      Receivables
    </h1>

    <p className="text-gray-500 mt-1">
      Track outstanding customer payments
    </p>
  </div>

  <div className="w-full">
  <input
    type="text"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search Customer, invoice no..."
    className="input w-full"
  />
</div>
</div>
      <div className="card p-5">

  {/* Desktop */}
  <div className="hidden lg:flex items-end gap-4 flex-wrap">

    <div>
      <label className="block text-xs text-gray-500 mb-1">
        From
      </label>
      <input
        type="date"
        className="input w-52"
        value={from}
        onChange={e => setFrom(e.target.value)}
      />
    </div>

    <div>
      <label className="block text-xs text-gray-500 mb-1">
        To
      </label>
      <input
        type="date"
        className="input w-52"
        value={to}
        onChange={e => setTo(e.target.value)}
      />
    </div>

    <button
      className="btn-primary h-12 px-6"
      onClick={() => setActive({ from, to })}
    >
      Filter
    </button>

    <button
      className="btn-secondary h-12 px-6"
      onClick={() => {
        setFrom('');
        setTo('');
        setActive({ from: '', to: '' });
      }}
    >
      All Records
    </button>

    <button
      className="btn-secondary h-12 px-6"
      onClick={() => quickFilter('month')}
    >
      This Month
    </button>

    <button
      className="btn-secondary h-12 px-6"
      onClick={() => quickFilter('year')}
    >
      This Year
    </button>

    <button
  className="h-12 px-6 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Print
</button>

  </div>

  {/* Mobile + Tablet */}
  <div className="lg:hidden space-y-3">

    <div>
      <label className="block text-xs text-gray-500 mb-1">
        From
      </label>
      <input
        type="date"
        className="input w-full"
        value={from}
        onChange={e => setFrom(e.target.value)}
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
        onChange={e => setTo(e.target.value)}
      />
    </div>

    <button
      className="btn-primary w-full"
      onClick={() => setActive({ from, to })}
    >
      Filter
    </button>

    <div className="grid grid-cols-2 gap-2">
      <button className="btn-secondary btn-sm">All Records</button>
      <button className="btn-secondary btn-sm">This Month</button>
      <button className="btn-secondary btn-sm">This Year</button>
      <button
  className="h-11 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Print
</button>
    </div>

  </div>

</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        <div className="card p-3 text-center"><p className="text-xs text-gray-500">Total Invoiced</p><p className="text-xl font-bold text-blue-600">{inr(totalRev)}</p></div>
        <div className="card p-3 text-center"><p className="text-xs text-gray-500">Collected</p><p className="text-xl font-bold text-emerald-600">{inr(totalRev-outstanding)}</p></div>
        <div className="card p-3 text-center"><p className="text-xs text-gray-500">Outstanding</p><p className="text-xl font-bold text-red-600">{inr(outstanding)}</p></div>
      </div>
      <div className="hidden md:block table-container overflow-x-auto">
        {isLoading?<Spinner/>:filtered.length===0?<EmptyState message="No receivables found."/>:(
          <table className="table">
            <thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th className="text-right">Invoice Amt</th><th className="text-right">Received</th><th className="text-right">Balance</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{filtered.map((r:any)=>(
              <tr key={r.id} className={r.balance>0?'bg-red-50/20 dark:bg-red-900/5':''}>
                <td className="font-mono text-xs font-semibold">{r.invoiceNo}</td>
                <td className="text-sm">{format(new Date(r.invoiceDate),'dd/MM/yyyy')}</td>
                <td className="font-medium">{r.companyName}</td>
                <td className="text-right">{inr(r.grandTotal)}</td>
                <td className="text-right text-emerald-600">{inr(r.paymentReceived)}</td>
                <td className={`text-right font-bold ${r.balance>0?'text-red-600':'text-emerald-600'}`}>{r.balance>0?inr(r.balance):'✓ Paid'}</td>
                <td>{r.balance<=0?<span className="badge-green text-xs">Paid</span>:<span className="badge-red text-xs">Due</span>}</td>
                <td>
  <div className="flex gap-2">

    {r.balance>0 && (
      <button
        className="btn-ghost btn-sm p-1.5 text-emerald-600"
        onClick={()=>{
          setPayModal({
            open:true,
            saleId:r.id,
            invoiceNo:r.invoiceNo,
            balance:r.balance
          });
          setPayment({
            ...ep(),
            amount:r.balance
          });
        }}
      >
        <CreditCard size={14}/>
      </button>
    )}

    <button
      className="btn-secondary btn-sm"
      onClick={()=>
        setHistoryModal({
          open:true,
          saleId:r.id,
          invoiceNo:r.invoiceNo
        })
      }
    >
      Payments
    </button>

  </div>
</td>
              </tr>
            ))}</tbody>
            <tfoot><tr className="bg-gray-50 dark:bg-gray-800/50 font-bold"><td colSpan={3} className="px-4 py-2">TOTAL</td><td className="px-4 py-2 text-right">{inr(totalRev)}</td><td className="px-4 py-2 text-right text-emerald-600">{inr(totalRev-outstanding)}</td><td className="px-4 py-2 text-right text-red-600">{inr(outstanding)}</td><td colSpan={2}></td></tr></tfoot>
          </table>
        )}
      </div>

      <div className="md:hidden">
  {filtered.length === 0 ? (
    <EmptyState message="No receivables found." />
  ) : (
    <div className="space-y-3">
      {filtered.map((r:any) => (
        <div
          key={r.id}
          className="card p-4 space-y-3"
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold text-sm">
              {r.invoiceNo}
            </span>

            {r.balance <= 0 ? (
              <span className="badge-green text-xs">
                Paid
              </span>
            ) : (
              <span className="badge-red text-xs">
                Due
              </span>
            )}
          </div>

          <div>
            <p className="font-medium">
              {r.companyName}
            </p>

            <p className="text-xs text-gray-500">
              {format(
                new Date(r.invoiceDate),
                'dd/MM/yyyy'
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Invoice</p>
              <p>{inr(r.grandTotal)}</p>
            </div>

            <div>
              <p className="text-gray-500">Received</p>
              <p className="text-emerald-600">
                {inr(r.paymentReceived)}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-gray-500">Balance</p>

              <p className="font-bold text-red-600">
                {r.balance > 0
                  ? inr(r.balance)
                  : '✓ Paid'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {r.balance > 0 && (
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  setPayModal({
                    open: true,
                    saleId: r.id,
                    invoiceNo: r.invoiceNo,
                    balance: r.balance,
                  });

                  setPayment({
                    ...ep(),
                    amount: r.balance,
                  });
                }}
              >
                Receive
              </button>
            )}

            <button
              className="btn-secondary flex-1"
              onClick={() =>
                setHistoryModal({
                  open: true,
                  saleId: r.id,
                  invoiceNo: r.invoiceNo,
                })
              }
            >
              Payments
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

      <Modal open={payModal.open} onClose={()=>setPayModal({open:false,saleId:null,invoiceNo:'',balance:0})} title={`Record Payment — ${payModal.invoiceNo}`} size="sm">
        <div className="space-y-3">
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">Outstanding: <strong>{inr(payModal.balance)}</strong></p>
          <Field label="Amount (₹)" required><input className="input" type="number" min="0" step="0.01" value={payment.amount} onChange={e=>setPayment(p=>({...p,amount:+e.target.value}))}/></Field>
          <Field label="Date"><input className="input" type="date" value={payment.dateReceived} onChange={e=>setPayment(p=>({...p,dateReceived:e.target.value}))}/></Field>
          <Field label="Mode"><select className="input" value={payment.mode} onChange={e=>setPayment(p=>({...p,mode:e.target.value}))}>{['Cash','Bank Transfer','Cheque','UPI','Other'].map(m=><option key={m}>{m}</option>)}</select></Field>
          <Field label="Reference"><input className="input" value={payment.reference} onChange={e=>setPayment(p=>({...p,reference:e.target.value}))}/></Field>
          <div className="flex flex-col sm:flex-row gap-2 justify-end"><button className="btn-secondary btn-sm w-full sm:w-auto" onClick={()=>setPayModal({open:false,saleId:null,invoiceNo:'',balance:0})}>Cancel</button><button className="btn-primary btn-sm w-full sm:w-auto" onClick={()=>addPay.mutate()} disabled={addPay.isPending}>{addPay.isPending?'Saving…':'Record Payment'}</button></div>
        </div>
      </Modal>
      {/* Payment History Modal */}
<Modal
  open={historyModal.open}
  onClose={() =>
    setHistoryModal({
      open:false,
      saleId:null,
      invoiceNo:''
    })
  }
  title={`Payments — ${historyModal.invoiceNo}`}
  size="lg"
>
  {loadingPayments ? (
    <Spinner/>
  ) : payments.length===0 ? (
    <EmptyState message="No payments found."/>
  ) : (
    <div className="space-y-3">
      {payments.map((p:any)=>(
    <div
  key={p.id}
  className="border rounded-xl p-4 bg-white dark:bg-gray-900 shadow-sm"
>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

    <div>
      <p className="text-xs text-gray-500">Date</p>
      <p className="font-medium">
        {format(new Date(p.dateReceived), 'dd/MM/yyyy')}
      </p>
    </div>

    <div>
      <p className="text-xs text-gray-500">Mode</p>
      <p className="font-medium">{p.mode}</p>
    </div>

    <div>
      <p className="text-xs text-gray-500">Reference</p>
      <p className="font-medium break-all">
        {p.reference || '-'}
      </p>
    </div>

    <div>
      <p className="text-xs text-gray-500">Amount</p>
      <p className="font-bold text-emerald-600">
        {inr(p.amount)}
      </p>
    </div>

    <div>
      <p className="text-xs text-gray-500">Notes</p>
      <p className="font-medium">
        {p.notes || '-'}
      </p>
    </div>

  </div>

  <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">

    <button
      className="w-full sm:w-auto px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
      onClick={() => {
        setEditModal({ open:true, payment:p });

        setEditPayment({
          amount:Number(p.amount),
          dateReceived:format(
            new Date(p.dateReceived),
            'yyyy-MM-dd'
          ),
          mode:p.mode,
          reference:p.reference || '',
          notes:p.notes || ''
        });
      }}
    >
      <Pencil size={14}/>
      Edit
    </button>

    <button
  className="w-full sm:w-auto px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
  onClick={() => {
    setDeleteModal({
      open: true,
      paymentId: p.id,
    });
  }}
>
  <Trash2 size={14}/>
  Delete
</button>

  </div>
</div>
))}
</div>
)}
</Modal>

<Modal
  open={editModal.open}
  onClose={()=>
    setEditModal({
      open:false,
      payment:null
    })
  }
  title="Edit Payment"
  size="sm"
>
  <div className="space-y-3">

    <Field label="Amount">
      <input
        className="input"
        type="number"
        value={editPayment.amount}
        onChange={e=>
          setEditPayment(p=>({
            ...p,
            amount:+e.target.value
          }))
        }
      />
    </Field>

    <Field label="Date">
      <input
        className="input"
        type="date"
        value={editPayment.dateReceived}
        onChange={e=>
          setEditPayment(p=>({
            ...p,
            dateReceived:e.target.value
          }))
        }
      />
    </Field>

    <Field label="Mode">
      <select
        className="input"
        value={editPayment.mode}
        onChange={e=>
          setEditPayment(p=>({
            ...p,
            mode:e.target.value
          }))
        }
      >
        {['Cash','Bank Transfer','Cheque','UPI','Other']
          .map(m=><option key={m}>{m}</option>)}
      </select>
    </Field>

    <Field label="Reference">
      <input
        className="input"
        value={editPayment.reference}
        onChange={e=>
          setEditPayment(p=>({
            ...p,
            reference:e.target.value
          }))
        }
      />
    </Field>

    <Field label="Notes">
      <textarea
        className="input"
        value={editPayment.notes}
        onChange={e=>
          setEditPayment(p=>({
            ...p,
            notes:e.target.value
          }))
        }
      />
    </Field>

    <div className="flex flex-col sm:flex-row gap-2">

      <button
        className="btn-secondary btn-sm w-full sm:w-auto"
        onClick={()=>
          setEditModal({
            open:false,
            payment:null
          })
        }
      >
        Cancel
      </button>

      <button
  className="btn-primary btn-sm w-full sm:w-auto"
  onClick={() => {
    console.log('SAVE CLICKED');
    console.log(editModal);
    console.log(editPayment);

    updatePay.mutate({
      id: editModal?.payment?.id,
      data: editPayment
    });
  }}
>
  Save Changes
</button>
    </div>

  </div>
</Modal>
<Modal
  open={deleteModal.open}
  onClose={() =>
    setDeleteModal({
      open:false,
      paymentId:null,
    })
  }
  title="Delete Payment"
  size="sm"
>
  <div className="space-y-4">

    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
      <p className="text-red-700 font-medium">
        Are you sure you want to delete this payment?
      </p>

      <p className="text-sm text-red-600 mt-1">
        This action cannot be undone.
      </p>
    </div>

    <div className="flex flex-col sm:flex-row justify-end gap-2">

      <button
        className="btn-secondary w-full sm:w-auto"
        onClick={() =>
          setDeleteModal({
            open:false,
            paymentId:null,
          })
        }
      >
        Cancel
      </button>

      <button
        className="btn-danger w-full sm:w-auto"
        onClick={() => {
          if (!deleteModal.paymentId) return;

          deletePay.mutate(deleteModal.paymentId);

          setDeleteModal({
            open:false,
            paymentId:null,
          });
        }}
      >
        Delete Payment
      </button>

    </div>

  </div>
</Modal>
</div>
);
}    