import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseApi, vendorApi, materialApi } from '../../services/apiServices';
import { Confirm, Spinner, EmptyState, inr } from '../../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Save, Pencil, Trash2, Eye } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { purchaseToInvoiceData } from '../invoiceTemplates/invoiceTypes';
import { getSelectedTemplate, TemplateId } from '../invoiceTemplates/invoiceTemplateManager';
import { RowPrintButton } from '../invoiceTemplates/useInvoicePrint';
import PrintMenuButton from '../invoiceTemplates/PrintMenuButton';
import InvoiceTemplateGallery from '../invoiceTemplates/InvoiceTemplateGallery';

const GST_RATES = [0, 3, 5, 12, 18, 28];

interface PItem {
  materialName: string;
  hsnCode: string;
  quantity: number;
  purchaseRate: number;
  gstPercent: number;
  taxableAmount: number;
  gstAmount: number;
  itemTotal: number;
}

const emptyItem = (): PItem => ({ materialName: '', hsnCode: '', quantity: 0, purchaseRate: 0, gstPercent: 18, taxableAmount: 0, gstAmount: 0, itemTotal: 0 });

const emptyForm = () => ({
  billNo: '', billDate: format(new Date(), 'yyyy-MM-dd'),
  vendorId: '' as string | number, vendorName: '', vendorGstin: '',
  otherExpense: 0, roundOff: 0, paymentPaid: 0,
  totalTaxable: 0, totalGst: 0, grandTotal: 0,
  igstAmount: 0, cgstAmount: 0, sgstAmount: 0,
  notes: '', isInterState: false, items: [emptyItem(), emptyItem()],
});

function calcItem(it: PItem): PItem {
  const t = +(it.quantity * it.purchaseRate).toFixed(2);
  const g = +(t * it.gstPercent / 100).toFixed(2);
  return { ...it, taxableAmount: t, gstAmount: g, itemTotal: +(t + g).toFixed(2) };
}

function calcTotals(items: PItem[], oe: number, ro: number, inter: boolean) {
  const active = items.filter(i => i.materialName && i.quantity > 0);
  const tt = +active.reduce((s, i) => s + i.taxableAmount, 0).toFixed(2);
  const tg = +active.reduce((s, i) => s + i.gstAmount, 0).toFixed(2);
  return {
    totalTaxable: tt, totalGst: tg,
    igstAmount: inter ? tg : 0,
    cgstAmount: inter ? 0 : +(tg / 2).toFixed(2),
    sgstAmount: inter ? 0 : +(tg / 2).toFixed(2),
    grandTotal: +(tt + tg + oe + ro).toFixed(2),
  };
}

export default function PurchasesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const company = {
    companyName: user?.companyName ?? '',
    gstin: user?.gstin,
    addressLine1: user?.addressLine1,
    addressLine2: user?.addressLine2,
    city: user?.city,
    state: user?.state,
    pincode: user?.pincode,
    mobile: user?.mobile,
    email: user?.email,
  };

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [active, setActive] = useState({ from: '', to: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState<Record<string, unknown> | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [del, setDel] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  // Gallery state — shared across all rows
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<TemplateId>(() => getSelectedTemplate('purchase'));

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases', active.from, active.to],
    queryFn: () => purchaseApi.list(active.from && active.to ? { from: active.from, to: active.to } : {}),
  });
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: () => vendorApi.list() });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: () => materialApi.list() });

  const recalc = (f: typeof form) => {
    const items = f.items.map(calcItem);
    return { ...f, items, ...calcTotals(items, f.otherExpense, f.roundOff, f.isInterState) };
  };

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const v = target.type === 'checkbox' ? target.checked : target.type === 'number' ? +target.value : target.value;
    setForm(p => recalc({ ...p, [k]: v }));
  };

  const sif = (idx: number, k: keyof PItem) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = ['quantity', 'purchaseRate', 'gstPercent'].includes(k) ? +e.target.value : e.target.value;
    if (k === 'materialName') {
      const mat = (materials as Array<{ materialName: string; hsnCode?: string }>).find((m) => m.materialName === v);
      setForm(p => {
        const items = p.items.map((it, i) => i === idx ? { ...it, materialName: v as string, hsnCode: mat?.hsnCode || '' } : it);
        return recalc({ ...p, items });
      });
    } else {
      setForm(p => {
        const items = p.items.map((it, i) => i === idx ? { ...it, [k]: v } : it);
        return recalc({ ...p, items });
      });
    }
  };

  const selVendor = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = (vendors as Array<{ id: number; vendorName: string; vendorGstin?: string }>).find((vn) => vn.id === +e.target.value);
    setForm(p => recalc({ ...p, vendorId: v?.id || '', vendorName: v?.vendorName || '', vendorGstin: v?.vendorGstin || '' }));
  };

  const addRow = () => setForm(p => ({ ...p, items: [...p.items, emptyItem()] }));
  const removeRow = (idx: number) => setForm(p => recalc({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const openNew = () => { setForm(emptyForm()); setEditing(null); setModalOpen(true); };

  const openEdit = (p: Record<string, unknown>) => {
    setForm({
      billNo: p.billNo as string,
      billDate: format(new Date(p.billDate as string), 'yyyy-MM-dd'),
      vendorId: (p.vendorId as string) || '',
      vendorName: p.vendorName as string,
      vendorGstin: (p.vendorGstin as string) || '',
      otherExpense: +(p.otherExpense as number),
      roundOff: +(p.roundOff as number),
      paymentPaid: +(p.paymentPaid as number),
      totalTaxable: +(p.totalTaxable as number),
      totalGst: +(p.totalGst as number),
      grandTotal: +(p.grandTotal as number),
      igstAmount: +((p.igstAmount as number) || 0),
      cgstAmount: +((p.cgstAmount as number) || 0),
      sgstAmount: +((p.sgstAmount as number) || 0),
      notes: (p.notes as string) || '',
      isInterState: +((p.igstAmount as number) || 0) > 0,
      items: (p.items as PItem[])?.length
        ? (p.items as Array<Record<string, unknown>>).map((it) => ({
            materialName: it.materialName as string,
            hsnCode: (it.hsnCode as string) || '',
            quantity: +(it.quantity as number),
            purchaseRate: +(it.purchaseRate as number),
            gstPercent: +(it.gstPercent as number),
            taxableAmount: +(it.taxableAmount as number),
            gstAmount: +(it.gstAmount as number),
            itemTotal: +(it.itemTotal as number),
          }))
        : [emptyItem()],
    });
    setEditing(p.id as number);
    setModalOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const activeItems = form.items.filter(i => i.materialName && i.quantity > 0);
      if (!activeItems.length) throw new Error('Add at least one item.');
      if (!form.billNo) throw new Error('Bill number is required.');
      if (!form.vendorName) throw new Error('Vendor is required.');
      const payload = { ...form, vendorId: form.vendorId ? +form.vendorId : null, items: activeItems };
      return editing ? purchaseApi.update(editing, payload) : purchaseApi.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setModalOpen(false); toast.success('Purchase saved.'); },
    onError: (e: { message?: string; response?: { data?: { error?: string } } }) =>
      toast.error(e.message || e.response?.data?.error || 'Save failed.'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => purchaseApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchases'] }); setDel(null); toast.success('Deleted.'); },
  });

  const totGrand = (purchases as Array<{ grandTotal: number }>).reduce((s, p) => s + +p.grandTotal, 0);
  const totPaid = (purchases as Array<{ paymentPaid: number }>).reduce((s, p) => s + +p.paymentPaid, 0);

  const quickFilter = (preset: 'month' | 'year' | 'all') => {
    if (preset === 'all') { setFrom(''); setTo(''); setActive({ from: '', to: '' }); return; }
    const now = new Date();
    if (preset === 'month') {
      const f = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      const t = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');
      setFrom(f); setTo(t); setActive({ from: f, to: t });
    }
    if (preset === 'year') {
      const f = `${now.getFullYear()}-01-01`;
      const t = `${now.getFullYear()}-12-31`;
      setFrom(f); setTo(t); setActive({ from: f, to: t });
    }
  };

  const viewInvoiceData = viewModal ? purchaseToInvoiceData(viewModal, company) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Desktop Dashboard Header ── */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Purchase Management</h1>
              <p className="mt-2 text-gray-500 text-base">Manage vendor purchases, expenses and stock procurement</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Today</p>
              <p className="font-semibold text-slate-700">{format(new Date(), 'dd MMM yyyy')}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-5 mt-8">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm text-gray-500">Total Purchases</p>
              <h3 className="text-2xl font-bold text-blue-700 mt-2">{inr(totGrand)}</h3>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="text-sm text-gray-500">Paid Amount</p>
              <h3 className="text-2xl font-bold text-green-600 mt-2">{inr(totPaid)}</h3>
            </div>
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm text-gray-500">Outstanding</p>
              <h3 className="text-2xl font-bold text-red-600 mt-2">{inr(totGrand - totPaid)}</h3>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-sm text-gray-500">Vendors</p>
              <h3 className="text-2xl font-bold text-violet-600 mt-2">{(vendors as unknown[]).length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 py-4 space-y-4">

        {/* ── Mobile Heading ── */}
        <div className="lg:hidden mb-2">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Purchases</h1>
          <p className="text-gray-500 mt-1">Manage vendor purchases and procurement</p>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm max-w-full">
          <div className="hidden lg:flex items-end gap-3 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" className="input w-40" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" className="input w-40" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <button className="btn-primary h-10" onClick={() => setActive({ from, to })}>Filter</button>
            <button className="btn-secondary h-10" onClick={() => { setFrom(''); setTo(''); setActive({ from: '', to: '' }); }}>All Records</button>
            <button className="btn-secondary h-10" onClick={() => quickFilter('month')}>This Month</button>
            <button className="btn-secondary h-10" onClick={() => quickFilter('year')}>This Year</button>
            <button
              className="h-10 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
              onClick={() => navigate(`/purchase-register-print?from=${active.from}&to=${active.to}`)}
            >
              Preview Purchase Report
            </button>
          </div>
          <div className="lg:hidden space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="date" className="input w-full text-sm" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="date" className="input w-full text-sm" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <button className="btn-primary h-11 w-full" onClick={() => setActive({ from, to })}>Filter</button>
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-secondary h-10" onClick={() => { setFrom(''); setTo(''); setActive({ from: '', to: '' }); }}>All Records</button>
              <button className="btn-secondary h-10" onClick={() => quickFilter('month')}>This Month</button>
              <button className="btn-secondary h-10" onClick={() => quickFilter('year')}>This Year</button>
              <button
                className="h-16 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition-colors"
                onClick={() => navigate(`/purchase-register-print?from=${active.from}&to=${active.to}`)}
              >
                Preview Report
              </button>
            </div>
          </div>
        </div>

        {/* ── Table / Cards ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={openNew}
                className="hidden lg:flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus size={16} />
                New Purchase
              </button>
            </div>
            <div className="lg:hidden mb-4 space-y-3">
              <button onClick={openNew} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-md">
                + New Purchase
              </button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Purchases</h2>
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                <p className="text-xs text-green-600 uppercase font-medium">Paid</p>
                <p className="text-xl font-bold text-green-700 mt-1">{inr(totPaid)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <p className="text-xs text-red-600 uppercase font-medium">Due</p>
                <p className="text-xl font-bold text-red-700 mt-1">{inr(totGrand - totPaid)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                <p className="text-xs text-blue-600 uppercase font-medium">Total Purchases</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{inr(totGrand)}</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <Spinner />
          ) : (purchases as unknown[]).length === 0 ? (
            <EmptyState message="No purchases found. Click '+ New Purchase' to add one." />
          ) : (
            <>
              {/* ── Desktop Table ── */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 dark:bg-gray-700 text-white">
                      <th className="px-3 py-3 text-left text-xs font-semibold w-8">#</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold">BILL NO</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold">DATE</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold">VENDOR</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold">ITEMS</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold">TAXABLE</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold">GST</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold">TOTAL</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold">PAID</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold">BAL</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(purchases as Array<Record<string, unknown>>).map((p, idx) => {
                      const bal = +(p.grandTotal as number) - +(p.paymentPaid as number);
                      const rowInvoiceData = purchaseToInvoiceData(p, company);
                      return (
                        <tr key={p.id as number} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                          <td className="px-3 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-3 py-3 font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">{p.billNo as string}</td>
                          <td className="px-3 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{format(new Date(p.billDate as string), 'dd/MM/yyyy')}</td>
                          <td className="px-3 py-3 max-w-[180px]">
                            <div className="font-medium text-gray-800 dark:text-gray-200">{p.vendorName as string}</div>
                            {p.vendorGstin ? (<div className="text-xs text-gray-400 truncate">{String(p.vendorGstin)}</div>) : null}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{(p.items as unknown[])?.length || 0}</span>
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700 dark:text-gray-300">{inr(p.totalTaxable as number)}</td>
                          <td className="px-3 py-3 text-right font-semibold text-green-600">{inr(p.totalGst as number)}</td>
                          <td className="px-3 py-3 text-right font-bold text-gray-800 dark:text-gray-200">{inr(p.grandTotal as number)}</td>
                          <td className="px-3 py-3 text-right text-green-600 font-medium">{inr(p.paymentPaid as number)}</td>
                          <td className="px-3 py-3 text-right">
                            <span className={`font-semibold ${bal > 0 ? 'text-red-600' : 'text-green-600'}`}>{inr(bal)}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              {/* Print ▼ first */}
                              <RowPrintButton
                                invoiceType="purchase"
                                invoiceData={rowInvoiceData}
                                invoiceNo={p.billNo as string}
                                templateId={activeTemplateId}
                                onChangeDesign={() => setGalleryOpen(true)}
                              />
                              <button
                                onClick={() => setViewModal(p)}
                                className="w-7 h-7 flex items-center justify-center bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => openEdit(p)}
                                className="w-7 h-7 flex items-center justify-center bg-amber-100 text-amber-600 rounded hover:bg-amber-200 transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setDel(p.id as number)}
                                className="w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile Cards ── */}
              <div className="lg:hidden p-4 space-y-4">
                {(purchases as Array<Record<string, unknown>>).map((p) => {
                  const bal = +(p.grandTotal as number) - +(p.paymentPaid as number);
                  const rowInvoiceData = purchaseToInvoiceData(p, company);
                  return (
                    <div key={p.id as number} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">
                      {/* Card Header */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-lg">{p.billNo as string}</h3>
                            <p className="text-indigo-600 font-bold mt-1">{inr(p.grandTotal as number)}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bal > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {bal > 0 ? 'Due' : 'Paid'}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Vendor</p>
                          <p className="font-medium">{p.vendorName as string}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p>{format(new Date(p.billDate as string), 'dd/MM/yyyy')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Items</p>
                            <p>{(p.items as unknown[])?.length || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">GST</p>
                            <p className="text-green-600 font-semibold">{inr(p.totalGst as number)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Balance</p>
                            <p className={bal > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>{inr(bal)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions — Print full width, then View/Edit/Delete */}
                      <div className="px-4 pb-3 pt-1 border-t">
                        <PrintMenuButton
                          invoiceData={rowInvoiceData}
                          invoiceType="purchase"
                          invoiceNo={p.billNo as string}
                          templateId={activeTemplateId}
                          onChangeDesign={() => setGalleryOpen(true)}
                          variant="mobile"
                        />
                        <div className="grid grid-cols-3 mt-2 border rounded-xl overflow-hidden">
                          <button onClick={() => setViewModal(p)} className="py-3 text-blue-600 border-r text-sm font-medium">View</button>
                          <button onClick={() => openEdit(p)} className="py-3 text-orange-600 border-r text-sm font-medium">Edit</button>
                          <button onClick={() => setDel(p.id as number)} className="py-3 text-red-600 text-sm font-medium">Delete</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add / Edit Purchase Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl animate-slide-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold">{editing ? 'Edit Purchase' : 'New Purchase'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">BILL NO <span className="text-red-500">*</span></label>
                  <input className="input" value={form.billNo} onChange={sf('billNo')} placeholder="INV-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">BILL DATE <span className="text-red-500">*</span></label>
                  <input className="input" type="date" value={form.billDate} onChange={sf('billDate')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">VENDOR</label>
                  <select className="input" value={form.vendorId} onChange={selVendor}>
                    <option value="">— Select —</option>
                    {(vendors as Array<{ id: number; vendorName: string }>).map((v) => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">VENDOR GSTIN</label>
                  <input className="input font-mono uppercase" value={form.vendorGstin} onChange={sf('vendorGstin')} placeholder="22AAAAA0000A1Z5" />
                </div>
              </div>
              {!form.vendorId && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">VENDOR NAME <span className="text-red-500">*</span></label>
                  <input className="input" value={form.vendorName} onChange={sf('vendorName')} />
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input type="checkbox" checked={form.isInterState} onChange={sf('isInterState')} className="w-4 h-4" />
                  <span className="text-blue-700 dark:text-blue-300">Inter-State Purchase (IGST)</span>
                </label>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Items *</span>
                  <button className="btn-secondary btn-sm" onClick={addRow}><Plus size={13} />Add Row</button>
                </div>
                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 dark:bg-gray-700 text-white">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-8">#</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold min-w-[180px]">MATERIAL *</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-24">HSN</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-24">QTY</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-32">RATE (₹)</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold w-20">GST%</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold w-28">TAXABLE</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold w-24">GST AMT</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold w-28">ITEM TOTAL</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, idx) => (
                        <tr key={idx} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-2 py-1.5">
                            <select className="input text-sm py-1.5" value={it.materialName} onChange={sif(idx, 'materialName')}>
                              <option value="">— Select —</option>
                              {(materials as Array<{ id: number; materialName: string }>).map((m) => <option key={m.id} value={m.materialName}>{m.materialName}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5"><input className="input text-sm py-1.5 font-mono" value={it.hsnCode} onChange={sif(idx, 'hsnCode')} /></td>
                          <td className="px-2 py-1.5"><input className="input text-sm py-1.5" type="number" min="0" step="0.001" value={it.quantity || ''} onChange={sif(idx, 'quantity')} /></td>
                          <td className="px-2 py-1.5"><input className="input text-sm py-1.5" type="number" min="0" step="0.01" value={it.purchaseRate || ''} onChange={sif(idx, 'purchaseRate')} /></td>
                          <td className="px-2 py-1.5">
                            <select className="input text-sm py-1.5" value={it.gstPercent} onChange={sif(idx, 'gstPercent')}>
                              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{it.taxableAmount?.toFixed(2) || '0.00'}</td>
                          <td className="px-3 py-2 text-right text-blue-600">{it.gstAmount?.toFixed(2) || '0.00'}</td>
                          <td className="px-3 py-2 text-right font-bold">{it.itemTotal?.toFixed(2) || '0.00'}</td>
                          <td className="px-2 py-1.5">
                            {form.items.length > 1 && (
                              <button onClick={() => removeRow(idx)} className="w-6 h-6 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-500 rounded hover:bg-red-200">
                                <X size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-5">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-4 bg-white dark:bg-gray-800 shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded-lg">Item #{idx + 1}</span>
                        {form.items.length > 1 && (
                          <button onClick={() => removeRow(idx)} className="px-3 py-1 text-xs font-semibold text-red-600 border border-red-300 rounded-lg">Remove</button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <select className="input w-full" value={it.materialName} onChange={sif(idx, 'materialName')}>
                          <option value="">Select Material</option>
                          {(materials as Array<{ id: number; materialName: string }>).map((m) => <option key={m.id} value={m.materialName}>{m.materialName}</option>)}
                        </select>
                        <input className="input w-full" placeholder="HSN Code" value={it.hsnCode} onChange={sif(idx, 'hsnCode')} />
                        <input className="input w-full" type="number" placeholder="Quantity" value={it.quantity || ''} onChange={sif(idx, 'quantity')} />
                        <input className="input w-full" type="number" placeholder="Rate" value={it.purchaseRate || ''} onChange={sif(idx, 'purchaseRate')} />
                        <select className="input w-full" value={it.gstPercent} onChange={sif(idx, 'gstPercent')}>
                          {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                        </select>
                        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Taxable</p>
                            <p className="font-semibold">₹{it.taxableAmount.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-blue-600">GST</p>
                            <p className="font-semibold text-blue-600">₹{it.gstAmount.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-green-600">Total</p>
                            <p className="font-bold text-green-600">₹{it.itemTotal.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addRow} className="mt-2 w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:border-brand-400 hover:text-brand-600 rounded-xl text-sm font-medium transition-colors">
                  + Add Item
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">OTHER EXPENSE (₹)</label>
                  <input className="input" type="number" min="0" step="0.01" value={form.otherExpense} onChange={sf('otherExpense')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ROUND OFF (₹)</label>
                  <input className="input" type="number" step="0.01" value={form.roundOff} onChange={sf('roundOff')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PAYMENT PAID (₹)</label>
                  <input className="input bg-gray-100 cursor-not-allowed" value={inr(form.paymentPaid)} readOnly />
                  <p className="text-xs text-gray-500 mt-1">Automatically managed from Payables.</p>
                </div>
                <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-3 flex flex-col justify-center">
                  <p className="text-xs text-brand-600">GRAND TOTAL</p>
                  <p className="text-2xl font-bold text-brand-700 dark:text-brand-300">₹{form.grandTotal.toFixed(2)}</p>
                  <p className="text-xs text-gray-400">GST: ₹{form.totalGst.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">NOTES</label>
                <textarea className="input" rows={2} value={form.notes} onChange={sf('notes')} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
              <button className="btn-secondary px-6" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary px-6 py-2.5" onClick={() => save.mutate()} disabled={save.isPending}>
                <Save size={15} />
                {save.isPending ? 'Saving…' : editing ? 'Update Purchase' : 'Save Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Purchase Modal ── */}
      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setViewModal(null)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-bold">Purchase: {viewModal.billNo as string}</h2>
              <div className="flex items-center gap-3">
                {viewInvoiceData && (
                  <PrintMenuButton
                    invoiceData={viewInvoiceData}
                    invoiceType="purchase"
                    invoiceNo={viewModal.billNo as string}
                    templateId={activeTemplateId}
                    onChangeDesign={() => setGalleryOpen(true)}
                    variant="full"
                  />
                )}
                <button onClick={() => setViewModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-400">Vendor:</span> <strong>{viewModal.vendorName as string}</strong></div>
                <div><span className="text-gray-400">Date:</span> <strong>{format(new Date(viewModal.billDate as string), 'dd MMM yyyy')}</strong></div>
                <div><span className="text-gray-400">GSTIN:</span> <span className="font-mono text-xs">{(viewModal.vendorGstin as string) || '—'}</span></div>
                <div>
                  <span className="text-gray-400">Paid:</span>{' '}
                  <strong className={+(viewModal.grandTotal as number) > +(viewModal.paymentPaid as number) ? 'text-red-500' : 'text-green-600'}>
                    {inr(viewModal.paymentPaid as number)} / {inr(viewModal.grandTotal as number)}
                  </strong>
                </div>
              </div>
              <div className="space-y-3">
                {(viewModal.items as Array<Record<string, unknown>>)?.map((it, i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{it.materialName as string}</h4>
                    <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
                      <span className="text-gray-500">Qty</span><span className="font-medium text-right">{it.quantity as number}</span>
                      <span className="text-gray-500">Rate</span><span className="font-medium text-right">{inr(it.purchaseRate as number)}</span>
                      <span className="text-gray-500">GST</span><span className="font-medium text-right">{it.gstPercent as number}%</span>
                      <span className="text-gray-500">Total</span><span className="font-bold text-right">{inr(it.itemTotal as number)}</span>
                    </div>
                  </div>
                ))}
                <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Grand Total</span>
                    <span className="text-xl font-bold text-brand-600">{inr(viewModal.grandTotal as number)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Gallery (shared across all rows) ── */}
      {galleryOpen && (
        <InvoiceTemplateGallery
          type="purchase"
          onClose={() => setGalleryOpen(false)}
          onSelect={(id) => { setActiveTemplateId(id); }}
        />
      )}

      <Confirm
        open={del !== null}
        onConfirm={() => remove.mutate(del!)}
        onCancel={() => setDel(null)}
        title="Delete Purchase"
        message="Delete this purchase? This cannot be undone."
        danger
      />
    </div>
  );
}