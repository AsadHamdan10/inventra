import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Pencil, Trash2 } from 'lucide-react';
import { reportApi, purchaseApi } from '../../services/apiServices';
import { PageHeader, Modal, Field, Spinner, EmptyState, SearchInput, inr } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Empty payment form — uses datePaid to match PayablePayment schema
const ep = () => ({
  amount: 0,
  datePaid: format(new Date(), 'yyyy-MM-dd'),
  mode: 'Cash',
  reference: '',
  notes: '',
});

export default function PayablesPage() {
  const qc = useQueryClient();

  // ── Filter state ──────────────────────────────────────────────
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [active, setActive] = useState({ from: '', to: '' });
  const [search, setSearch] = useState('');

  const navigate = useNavigate(); 
const handlePrint = () => { navigate( `/payable-print?from=${active.from}&to=${active.to}` ); };

  // ── Modal state ───────────────────────────────────────────────
  const [payModal, setPayModal] = useState<{
    open: boolean;
    purchaseId: number | null;
    billNo: string;
    balance: number;
  }>({ open: false, purchaseId: null, billNo: '', balance: 0 });

  const [payment, setPayment] = useState(ep());

  const [editModal, setEditModal] = useState({
    open: false,
    payment: null as any,
  });
  const [editPayment, setEditPayment] = useState(ep());

  const [historyModal, setHistoryModal] = useState({
    open: false,
    purchaseId: null as number | null,
    billNo: '',
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    paymentId: null as number | null,
  });

  // ── Data queries ──────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['payables', active.from, active.to],
    queryFn: () =>
      reportApi.payables(
        active.from && active.to ? { from: active.from, to: active.to } : {}
      ),
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['purchase-payments', historyModal.purchaseId],
    enabled: historyModal.open && historyModal.purchaseId !== null,
    queryFn: () => purchaseApi.getPayments(historyModal.purchaseId!),
  });

  const rows = data?.rows || [];

  // ── Mutations ─────────────────────────────────────────────────
  const addPay = useMutation({
    mutationFn: () => purchaseApi.addPayment(payModal.purchaseId!, payment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      setPayModal({ open: false, purchaseId: null, billNo: '', balance: 0 });
      setPayment(ep());
      toast.success('Payment recorded.');
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.error || 'Failed to record payment.'),
  });

  const updatePay = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      purchaseApi.updatePayment(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      qc.invalidateQueries({ queryKey: ['purchase-payments'] });
      setEditModal({ open: false, payment: null });
      toast.success('Payment updated.');
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.error || 'Failed to update payment.'),
  });

  const deletePay = useMutation({
    mutationFn: (id: number) => purchaseApi.deletePayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] });
      qc.invalidateQueries({ queryKey: ['purchase-payments'] });
      toast.success('Payment deleted.');
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.error || 'Failed to delete payment.'),
  });

  // ── Quick filters ─────────────────────────────────────────────
  const quickFilter = (p: 'month' | 'year') => {
    const now = new Date();
    if (p === 'month') {
      const f = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      const t = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
      setFrom(f); setTo(t); setActive({ from: f, to: t });
    } else {
      const f = `${now.getFullYear()}-01-01`;
      const t = `${now.getFullYear()}-12-31`;
      setFrom(f); setTo(t); setActive({ from: f, to: t });
    }
  };

  // ── Derived values ────────────────────────────────────────────
  const filtered = rows.filter(
    (r: any) =>
      r.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      r.billNo?.toLowerCase().includes(search.toLowerCase())
  );

  const outstanding = filtered
    .filter((r: any) => r.balance > 0)
    .reduce((s: number, r: any) => s + r.balance, 0);

  const totalBilled = filtered.reduce((s: number, r: any) => s + +r.grandTotal, 0);
  const totalPaid   = filtered.reduce((s: number, r: any) => s + +r.paymentPaid, 0);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Desktop Header ───────────────────────────────────────── */}
      <div className="hidden lg:block">
        <PageHeader
          title="Payables"
          subtitle="Track outstanding vendor payments"
          actions={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search vendor, bill no..."
            />
          }
        />
      </div>

      {/* ── Mobile Header ────────────────────────────────────────── */}
      <div className="lg:hidden space-y-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payables</h1>
          <p className="text-gray-500 mt-1">Track outstanding vendor payments</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendor, bill no..."
          className="input w-full"
        />
      </div>

      {/* ── Date filter bar ──────────────────────────────────────── */}
      <div className="card p-5">

        {/* Desktop */}
        <div className="hidden lg:flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              className="input w-52"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              className="input w-52"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button className="btn-primary h-12 px-6" onClick={() => setActive({ from, to })}>
            Filter
          </button>
          <button
            className="btn-secondary h-12 px-6"
            onClick={() => { setFrom(''); setTo(''); setActive({ from: '', to: '' }); }}
          >
            All Records
          </button>
          <button className="btn-secondary h-12 px-6" onClick={() => quickFilter('month')}>
            This Month
          </button>
          <button className="btn-secondary h-12 px-6" onClick={() => quickFilter('year')}>
            This Year
          </button>
          <button
  className="h-12 px-6 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Print
</button>
        </div>

        {/* Mobile */}
        <div className="lg:hidden space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              className="input w-full"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              className="input w-full"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <button
            className="btn-primary w-full"
            onClick={() => setActive({ from, to })}
          >
            Filter
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-secondary btn-sm"
              onClick={() => { setFrom(''); setTo(''); setActive({ from: '', to: '' }); }}
            >
              All Records
            </button>
            <button className="btn-secondary btn-sm" onClick={() => quickFilter('month')}>
              This Month
            </button>
            <button className="btn-secondary btn-sm" onClick={() => quickFilter('year')}>
              This Year
            </button>
            <button
  className="h-11 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
  onClick={handlePrint}
>
  Print
</button>
          </div>
        </div>

      </div>

      {/* ── Summary cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">Total Billed</p>
          <p className="text-xl font-bold text-blue-600">{inr(totalBilled)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">Total Paid</p>
          <p className="text-xl font-bold text-emerald-600">{inr(totalPaid)}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-gray-500">Outstanding</p>
          <p className="text-xl font-bold text-red-600">{inr(outstanding)}</p>
        </div>
      </div>

      {/* ── Desktop table ─────────────────────────────────────────── */}
      <div className="hidden md:block table-container overflow-x-auto">
        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState message="No payables found." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Date</th>
                <th>Vendor</th>
                <th className="text-right">Bill Amt</th>
                <th className="text-right">Paid</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} className={r.balance > 0 ? 'bg-red-50/20 dark:bg-red-900/5' : ''}>
                  <td className="font-mono text-xs font-semibold">{r.billNo}</td>
                  <td className="text-sm">{format(new Date(r.billDate), 'dd/MM/yyyy')}</td>
                  <td className="font-medium">{r.vendorName}</td>
                  <td className="text-right">{inr(r.grandTotal)}</td>
                  <td className="text-right text-emerald-600">{inr(r.paymentPaid)}</td>
                  <td className={`text-right font-bold ${r.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {r.balance > 0 ? inr(r.balance) : '✓ Paid'}
                  </td>
                  <td>
                    {r.balance <= 0 ? (
                      <span className="badge-green text-xs">Paid</span>
                    ) : (
                      <span className="badge-red text-xs">Due</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {r.balance > 0 && (
                        <button
                          className="btn-ghost btn-sm p-1.5 text-emerald-600"
                          onClick={() => {
                            setPayModal({
                              open: true,
                              purchaseId: r.id,
                              billNo: r.billNo,
                              balance: r.balance,
                            });
                            setPayment({ ...ep(), amount: r.balance });
                          }}
                          title="Pay Vendor"
                        >
                          <CreditCard size={14} />
                        </button>
                      )}
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() =>
                          setHistoryModal({
                            open: true,
                            purchaseId: r.id,
                            billNo: r.billNo,
                          })
                        }
                      >
                        Payments
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold">
                <td colSpan={3} className="px-4 py-2">TOTAL</td>
                <td className="px-4 py-2 text-right">{inr(totalBilled)}</td>
                <td className="px-4 py-2 text-right text-emerald-600">{inr(totalPaid)}</td>
                <td className="px-4 py-2 text-right text-red-600">{inr(outstanding)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Mobile cards ──────────────────────────────────────────── */}
      <div className="md:hidden">
        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState message="No payables found." />
        ) : (
          <div className="space-y-3">
            {filtered.map((r: any) => (
              <div key={r.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm">{r.billNo}</span>
                  {r.balance <= 0 ? (
                    <span className="badge-green text-xs">Paid</span>
                  ) : (
                    <span className="badge-red text-xs">Due</span>
                  )}
                </div>
                <div>
                  <p className="font-medium">{r.vendorName}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(r.billDate), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Bill Amount</p>
                    <p>{inr(r.grandTotal)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Paid</p>
                    <p className="text-emerald-600">{inr(r.paymentPaid)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Balance</p>
                    <p className={`font-bold ${r.balance > 0 ? 'text-red-600' :'text-green-600'}`}>{r.balance > 0 ? inr(r.balance) : '✓ Paid'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.balance > 0 && (
                    <button
                      className="btn-primary flex-1"
                      onClick={() => {
                        setPayModal({
                          open: true,
                          purchaseId: r.id,
                          billNo: r.billNo,
                          balance: r.balance,
                        });
                        setPayment({ ...ep(), amount: r.balance });
                      }}
                    >
                      Pay Vendor
                    </button>
                  )}
                  <button
                    className="btn-secondary flex-1"
                    onClick={() =>
                      setHistoryModal({
                        open: true,
                        purchaseId: r.id,
                        billNo: r.billNo,
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

      {/* ── Record Payment modal ──────────────────────────────────── */}
      <Modal
        open={payModal.open}
        onClose={() =>
          setPayModal({ open: false, purchaseId: null, billNo: '', balance: 0 })
        }
        title={`Pay Vendor — ${payModal.billNo}`}
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
            Outstanding: <strong>{inr(payModal.balance)}</strong>
          </p>
          <Field label="Amount (₹)" required>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={payment.amount}
              onChange={(e) => setPayment((p) => ({ ...p, amount: +e.target.value }))}
            />
          </Field>
          <Field label="Date">
            <input
              className="input"
              type="date"
              value={payment.datePaid}
              onChange={(e) => setPayment((p) => ({ ...p, datePaid: e.target.value }))}
            />
          </Field>
          <Field label="Mode">
            <select
              className="input"
              value={payment.mode}
              onChange={(e) => setPayment((p) => ({ ...p, mode: e.target.value }))}
            >
              {['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Reference">
            <input
              className="input"
              value={payment.reference}
              onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))}
            />
          </Field>
          <Field label="Notes">
            <textarea
              className="input"
              value={payment.notes}
              onChange={(e) => setPayment((p) => ({ ...p, notes: e.target.value }))}
            />
          </Field>
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <button
              className="btn-secondary btn-sm w-full sm:w-auto"
              onClick={() =>
                setPayModal({ open: false, purchaseId: null, billNo: '', balance: 0 })
              }
            >
              Cancel
            </button>
            <button
              className="btn-primary btn-sm w-full sm:w-auto"
              onClick={() => addPay.mutate()}
              disabled={addPay.isPending}
            >
              {addPay.isPending ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Payment History modal ─────────────────────────────────── */}
      <Modal
        open={historyModal.open}
        onClose={() =>
          setHistoryModal({ open: false, purchaseId: null, billNo: '' })
        }
        title={`Payments — ${historyModal.billNo}`}
        size="lg"
      >
        {loadingPayments ? (
          <Spinner />
        ) : payments.length === 0 ? (
          <EmptyState message="No payments recorded yet." />
        ) : (
          <div className="space-y-3">
            {payments.map((p: any) => (
              <div
                key={p.id}
                className="border rounded-xl p-4 bg-white dark:bg-gray-900 shadow-sm"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium">
                      {format(new Date(p.datePaid), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Mode</p>
                    <p className="font-medium">{p.mode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reference</p>
                    <p className="font-medium break-all">{p.reference || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-bold text-emerald-600">{inr(p.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="font-medium">{p.notes || '-'}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                  <button
                    className="w-full sm:w-auto px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                    onClick={() => {
                      setEditModal({ open: true, payment: p });
                      setEditPayment({
                        amount: Number(p.amount),
                        datePaid: format(new Date(p.datePaid), 'yyyy-MM-dd'),
                        mode: p.mode,
                        reference: p.reference || '',
                        notes: p.notes || '',
                      });
                    }}
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    className="w-full sm:w-auto px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                    onClick={() =>
                      setDeleteModal({ open: true, paymentId: p.id })
                    }
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Edit Payment modal ────────────────────────────────────── */}
      <Modal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, payment: null })}
        title="Edit Payment"
        size="sm"
      >
        <div className="space-y-3">
          <Field label="Amount (₹)">
            <input
              className="input"
              type="number"
              value={editPayment.amount}
              onChange={(e) =>
                setEditPayment((p) => ({ ...p, amount: +e.target.value }))
              }
            />
          </Field>
          <Field label="Date">
            <input
              className="input"
              type="date"
              value={editPayment.datePaid}
              onChange={(e) =>
                setEditPayment((p) => ({ ...p, datePaid: e.target.value }))
              }
            />
          </Field>
          <Field label="Mode">
            <select
              className="input"
              value={editPayment.mode}
              onChange={(e) =>
                setEditPayment((p) => ({ ...p, mode: e.target.value }))
              }
            >
              {['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Reference">
            <input
              className="input"
              value={editPayment.reference}
              onChange={(e) =>
                setEditPayment((p) => ({ ...p, reference: e.target.value }))
              }
            />
          </Field>
          <Field label="Notes">
            <textarea
              className="input"
              value={editPayment.notes}
              onChange={(e) =>
                setEditPayment((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </Field>
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <button
              className="btn-secondary btn-sm w-full sm:w-auto"
              onClick={() => setEditModal({ open: false, payment: null })}
            >
              Cancel
            </button>
            <button
              className="btn-primary btn-sm w-full sm:w-auto"
              onClick={() =>
                updatePay.mutate({
                  id: editModal.payment?.id,
                  data: editPayment,
                })
              }
              disabled={updatePay.isPending}
            >
              {updatePay.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation modal ─────────────────────────────── */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, paymentId: null })}
        title="Delete Payment"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-red-700 font-medium">
              Are you sure you want to delete this payment?
            </p>
            <p className="text-sm text-red-600 mt-1">
              This action cannot be undone. The vendor balance will be updated automatically.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <button
              className="btn-secondary w-full sm:w-auto"
              onClick={() => setDeleteModal({ open: false, paymentId: null })}
            >
              Cancel
            </button>
            <button
              className="btn-danger w-full sm:w-auto"
              onClick={() => {
                if (!deleteModal.paymentId) return;
                deletePay.mutate(deleteModal.paymentId);
                setDeleteModal({ open: false, paymentId: null });
              }}
              disabled={deletePay.isPending}
            >
              Delete Payment
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}