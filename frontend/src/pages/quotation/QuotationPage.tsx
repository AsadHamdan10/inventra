// ── QuotationPage.tsx ──────────────────────────────────────────
// Standalone Quotation editor. No database read/write of any kind —
// only useAuthStore() is read, exactly like Sales reads company info
// for the invoice header. Quotation number is generated in-memory
// and resets to 0001 on every page refresh.
//
// UI refactored to match SalesPage design language.
// Business logic, calculations, state management, print logic
// and renderer are intentionally unchanged.

import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { inr } from '../../components/ui';
import { format } from 'date-fns';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  QuotationData,
  QuotationItem,
  blankQuotation,
  calcQuotationItem,
  calcQuotationTotals,
  emptyQuotationItem,
  hasBuyer,
  supplierFromCompany,
} from './quotationTypes';
import { CompanyInfo } from '../invoiceTemplates/invoiceTypes';
import QuotationRenderer from './QuotationRenderer';
import QuotationPrintMenu from './QuotationPrintMenu';

const GST_RATES = [0, 3, 5, 12, 18, 28];
const UNITS = ['Nos', 'Kg', 'Mtr', 'Box', 'Pcs', 'Set', 'Ltr', 'Bag'];

export default function QuotationPage() {
  const { user } = useAuthStore();

  const company: CompanyInfo = {
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

  const [data, setData] = useState<QuotationData>(() => blankQuotation(company));
  const [previewOpenMobile, setPreviewOpenMobile] = useState(false);

  // ── Recalculate derived fields whenever items/interstate change ──
  const recalc = (next: QuotationData): QuotationData => {
    const items = next.items.map(calcQuotationItem);
    return { ...next, items, totals: calcQuotationTotals(items, next.isInterState) };
  };

  const update = (partial: Partial<QuotationData>) => setData((p) => recalc({ ...p, ...partial }));

  // ── Supplier ──────────────────────────────────────────────────
  const toggleUseCompanyProfile = (checked: boolean) => {
    setData((p) => ({
      ...p,
      supplier: checked ? supplierFromCompany(company) : { ...p.supplier, useCompanyProfile: false },
    }));
  };

  const sf = (key: keyof typeof data.supplier) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((p) => ({ ...p, supplier: { ...p.supplier, [key]: e.target.value } }));
  };

  // ── Buyer ─────────────────────────────────────────────────────
  const bf = (key: keyof typeof data.buyer) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setData((p) => ({ ...p, buyer: { ...p.buyer, [key]: e.target.value } }));
  };

  // ── Items ─────────────────────────────────────────────────────
  const itemField = (idx: number, key: keyof QuotationItem) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const isNumeric = ['quantity', 'rate', 'discountPercent', 'gstPercent'].includes(key as string);
    const value = isNumeric ? +e.target.value : e.target.value;
    setData((p) => {
      const items = p.items.map((it, i) => (i === idx ? calcQuotationItem({ ...it, [key]: value } as QuotationItem) : it));
      return { ...p, items, totals: calcQuotationTotals(items, p.isInterState) };
    });
  };

  const addRow = () => setData((p) => ({ ...p, items: [...p.items, emptyQuotationItem()] }));
  const removeRow = (idx: number) =>
    setData((p) => {
      const items = p.items.filter((_, i) => i !== idx);
      return { ...p, items, totals: calcQuotationTotals(items, p.isInterState) };
    });

  // ── Reset after Print/Download/Share completes (no confirmation) ──
  const handleComplete = () => {
    setData(blankQuotation(company));
  };

  const buyerPresent = hasBuyer(data.buyer);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Desktop Header (matches SalesPage) ── */}
      <div className="hidden lg:block">
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Quotation</h1>
              <p className="mt-2 text-gray-500 text-base">
                Create a professional quotation. Nothing entered here is saved permanently unless converted later.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Today</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{format(new Date(), 'dd MMM yyyy')}</p>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-5 mt-8">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Taxable Amount</p>
              <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">{inr(data.totals.totalTaxable)}</h3>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">GST</p>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{inr(data.totals.totalGst)}</h3>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-800 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Items</p>
              <h3 className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-2">
                {data.items.filter((i) => i.productName).length}
              </h3>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Grand Total</p>
              <h3 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-2">{inr(data.totals.grandTotal)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Heading ── */}
      <div className="lg:hidden px-3 pt-4 mb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quotation</h1>
        <p className="text-gray-500 mt-1 text-sm">Not saved to your records — print or share when ready.</p>
      </div>

      <div className="px-3 py-4">
        {/* Two-column layout: Editor 60% | Preview 40% */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 items-start">

          {/* ════════════════ LEFT: EDITOR ════════════════ */}
          <div className="space-y-4">

            {/* ── Quotation Details ── */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Quotation Details</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Basic quotation information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">QUOTATION NO</label>
                  <input
                    className="input h-11 font-mono font-semibold"
                    value={data.quotationNo}
                    onChange={(e) => update({ quotationNo: e.target.value })}
                    placeholder="QT-2026-0001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">DATE</label>
                  <input className="input h-11" type="date" value={data.quotationDate} onChange={(e) => update({ quotationDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">VALID TILL</label>
                  <input className="input h-11" type="date" value={data.validTill} onChange={(e) => update({ validTill: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PREPARED BY</label>
                  <input className="input h-11" value={data.preparedBy} onChange={(e) => update({ preparedBy: e.target.value })} placeholder="Your name" />
                </div>
              </div>
            </div>

            {/* ── Supplier Information ── */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Supplier Information</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Company details that appear in the quotation.</p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0">
                  <input
                    type="checkbox"
                    checked={data.supplier.useCompanyProfile}
                    onChange={(e) => toggleUseCompanyProfile(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Use Company Profile
                </label>
              </div>

              {data.supplier.useCompanyProfile ? (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white">{data.supplier.companyName || '—'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-6">
                    {[data.supplier.addressLine1, data.supplier.addressLine2, data.supplier.city, data.supplier.state, data.supplier.pincode]
                      .filter(Boolean)
                      .join(', ') || 'No address on file — add one in Company Profile.'}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
                    {data.supplier.gstin && <span>GSTIN: <span className="font-mono">{data.supplier.gstin}</span></span>}
                    {data.supplier.mobile && <span>Mobile: {data.supplier.mobile}</span>}
                    {data.supplier.email && <span>{data.supplier.email}</span>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">COMPANY NAME</label>
                    <input className="input h-11" placeholder="Company Name" value={data.supplier.companyName} onChange={sf('companyName')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">GSTIN</label>
                    <input className="input h-11 font-mono uppercase" placeholder="GSTIN" value={data.supplier.gstin ?? ''} onChange={sf('gstin')} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ADDRESS</label>
                    <input className="input h-11" placeholder="Address Line 1" value={data.supplier.addressLine1 ?? ''} onChange={sf('addressLine1')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">CITY</label>
                    <input className="input h-11" placeholder="City" value={data.supplier.city ?? ''} onChange={sf('city')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">STATE</label>
                    <input className="input h-11" placeholder="State" value={data.supplier.state ?? ''} onChange={sf('state')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">MOBILE</label>
                    <input className="input h-11" placeholder="Mobile" value={data.supplier.mobile ?? ''} onChange={sf('mobile')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">EMAIL</label>
                    <input className="input h-11" placeholder="Email" value={data.supplier.email ?? ''} onChange={sf('email')} />
                  </div>
                </div>
              )}
            </div>

            {/* ── Customer Information ── */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Customer Information
                    <span className="ml-2 text-sm font-normal text-gray-400">(optional)</span>
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Leave Customer Name empty to create a general quotation.
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${buyerPresent ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {buyerPresent ? 'Supplier + Customer' : 'Supplier Only'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">CUSTOMER NAME</label>
                  <input className="input h-11" placeholder="Customer / Company Name" value={data.buyer.buyerName} onChange={bf('buyerName')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">CONTACT PERSON</label>
                  <input className="input h-11" placeholder="Contact Person" value={data.buyer.contactPerson ?? ''} onChange={bf('contactPerson')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">MOBILE</label>
                  <input className="input h-11" placeholder="Mobile" value={data.buyer.mobile ?? ''} onChange={bf('mobile')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">EMAIL</label>
                  <input className="input h-11" placeholder="Email" value={data.buyer.email ?? ''} onChange={bf('email')} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ADDRESS LINE 1</label>
                  <input className="input h-11" placeholder="Address Line 1" value={data.buyer.addressLine1 ?? ''} onChange={bf('addressLine1')} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ADDRESS LINE 2</label>
                  <input className="input h-11" placeholder="Address Line 2" value={data.buyer.addressLine2 ?? ''} onChange={bf('addressLine2')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">CITY</label>
                  <input className="input h-11" placeholder="City" value={data.buyer.city ?? ''} onChange={bf('city')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">STATE</label>
                  <input className="input h-11" placeholder="State" value={data.buyer.state ?? ''} onChange={bf('state')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">PINCODE</label>
                  <input className="input h-11" placeholder="Pincode" value={data.buyer.pincode ?? ''} onChange={bf('pincode')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">GSTIN (optional)</label>
                  <input className="input h-11 font-mono uppercase" placeholder="GSTIN" value={data.buyer.gstin ?? ''} onChange={bf('gstin')} />
                </div>
              </div>
            </div>

            {/* ── GST Settings ── */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">GST Settings</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="radio"
                    name="gst-type"
                    checked={!data.isInterState}
                    onChange={() => update({ isInterState: false })}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Intra-State Supply</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CGST + SGST applied</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <input
                    type="radio"
                    name="gst-type"
                    checked={data.isInterState}
                    onChange={() => update({ isInterState: true })}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Inter-State Supply</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">IGST applied</p>
                  </div>
                </label>
              </div>
            </div>

            {/* ── Products ── */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Products</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add products as they should appear in the quotation.</p>
                </div>
                <button
                  onClick={addRow}
                  className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                >
                  <Plus size={15} />
                  Add Row
                </button>
              </div>

              {/* Desktop table — clean, no Description column */}
              <div className="hidden md:block rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 dark:bg-gray-700 text-white">
                      <th className="px-3 py-3 text-center text-xs font-semibold w-8">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">PRODUCT / ITEM</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold w-24">HSN</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold w-16">QTY</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold w-20">UNIT</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold w-28">RATE (₹)</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold w-20">GST %</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold w-28">TOTAL (₹)</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors">
                        <td className="px-3 py-3 text-gray-400 text-xs text-center font-medium">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <input
                            className="input text-sm py-1.5 px-2 w-full font-medium"
                            placeholder="Product name"
                            value={it.productName}
                            onChange={itemField(idx, 'productName')}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input className="input text-xs py-1.5 px-2 text-center font-mono w-full" placeholder="HSN" value={it.hsnCode} onChange={itemField(idx, 'hsnCode')} />
                        </td>
                        <td className="px-2 py-2">
                          <input className="input text-xs py-1.5 px-2 text-center w-full" type="number" min="0" step="0.001" value={it.quantity || ''} onChange={itemField(idx, 'quantity')} placeholder="0" />
                        </td>
                        <td className="px-2 py-2">
                          <select className="input text-xs py-1.5 px-2 w-full" value={it.unit} onChange={itemField(idx, 'unit')}>
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input className="input text-xs py-1.5 px-2 text-right w-full" type="number" min="0" step="0.01" value={it.rate || ''} onChange={itemField(idx, 'rate')} placeholder="0.00" />
                        </td>
                        <td className="px-2 py-2">
                          <select className="input text-xs py-1.5 px-2 w-full" value={it.gstPercent} onChange={itemField(idx, 'gstPercent')}>
                            {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-gray-800 dark:text-white tabular-nums">
                          {it.itemTotal.toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          {data.items.length > 1 && (
                            <button
                              onClick={() => removeRow(idx)}
                              className="w-7 h-7 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile product cards */}
              <div className="md:hidden space-y-4">
                {data.items.map((it, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-800 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg">Item #{idx + 1}</span>
                      {data.items.length > 1 && (
                        <button onClick={() => removeRow(idx)} className="px-3 py-1 text-xs font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
                          Remove
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">PRODUCT / ITEM</label>
                      <input className="input w-full h-11" placeholder="Product name" value={it.productName} onChange={itemField(idx, 'productName')} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">HSN</label>
                        <input className="input w-full h-11 font-mono" placeholder="HSN" value={it.hsnCode} onChange={itemField(idx, 'hsnCode')} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">UNIT</label>
                        <select className="input w-full h-11" value={it.unit} onChange={itemField(idx, 'unit')}>
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">QUANTITY</label>
                        <input className="input w-full h-11" type="number" placeholder="Quantity" value={it.quantity || ''} onChange={itemField(idx, 'quantity')} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">RATE (₹)</label>
                        <input className="input w-full h-11" type="number" placeholder="Rate" value={it.rate || ''} onChange={itemField(idx, 'rate')} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">GST %</label>
                        <select className="input w-full h-11" value={it.gstPercent} onChange={itemField(idx, 'gstPercent')}>
                          {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">TOTAL</label>
                        <p className="h-11 flex items-center px-3 font-bold text-gray-900 dark:text-white">₹{it.itemTotal.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Taxable</p>
                        <p className="font-semibold text-gray-900 dark:text-white">₹{it.taxableAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600">GST</p>
                        <p className="font-semibold text-green-600">₹{it.gstAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addRow}
                className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 rounded-xl text-sm font-medium transition-colors"
              >
                + Add Item
              </button>
            </div>

            {/* ── Totals Summary ── */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex flex-wrap gap-6 items-center border border-gray-200 dark:border-gray-700">
              {([
                ['TAXABLE', data.totals.totalTaxable, 'text-gray-700 dark:text-gray-300'],
                ['GST', data.totals.totalGst, 'text-green-600'],
                ['GRAND TOTAL', data.totals.grandTotal, 'text-gray-900 dark:text-white font-bold text-xl'],
              ] as [string, number, string][]).map(([label, val, cls]) => (
                <div key={label}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className={`font-semibold ${cls}`}>{inr(val)}</p>
                </div>
              ))}
            </div>

            {/* ── Notes ── */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">NOTES</label>
              <textarea
                className="input w-full"
                rows={3}
                value={data.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Optional notes…"
              />
            </div>

            {/* ── Terms & Conditions ── */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">TERMS & CONDITIONS</label>
              <textarea
                className="input w-full"
                rows={6}
                value={data.termsAndConditions}
                onChange={(e) => update({ termsAndConditions: e.target.value })}
              />
            </div>

            {/* ── Print Actions (desktop) ── */}
            <div className="hidden lg:flex justify-end">
              <QuotationPrintMenu data={data} onComplete={handleComplete} variant="full" />
            </div>

            {/* ── Print Actions (mobile, full width) ── */}
            <div className="lg:hidden">
              <QuotationPrintMenu data={data} onComplete={handleComplete} variant="mobile" />
            </div>
          </div>

          {/* ════════════════ RIGHT: LIVE PREVIEW (desktop) ════════════════
              The renderer outputs a fixed 794px-wide A4 page.
              We scale it to fit the preview panel using CSS transform.
              Because transform doesn't affect layout flow, we use a
              paddingBottom trick: scaled height = A4_H * SCALE, and
              the outer div is set to exactly that height so the
              scrollable container knows the real occupied space.
          ════════════════════════════════════════════════════════════ */}
          <div className="hidden lg:block sticky top-4">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              {/* Preview header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Live Preview</h2>
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  {buyerPresent ? 'Supplier + Customer' : 'Supplier Only'}
                </span>
              </div>

              {/* Scrollable preview — scroll vertically to see full A4 */}
              <div className="overflow-y-auto bg-gray-100 dark:bg-gray-950 p-4" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                {/*
                  A4 page: 794 × 1123 px (at 96 dpi screen).
                  Scale factor chosen so the 794px width fits the panel.
                  Panel inner width ≈ 460px → scale = 460/794 ≈ 0.579.
                  We use 0.56 for a small margin.
                  Scaled dimensions: 794 * 0.56 = 445px wide, 1123 * 0.56 = 629px tall.
                  The wrapper is set to exactly (1123 * 0.56)px tall so the
                  scroll container knows the true height.
                */}
                <div style={{ position: 'relative', width: '100%', height: `${Math.round(1123 * 0.56)}px` }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: 'scale(0.56)',
                      transformOrigin: 'top left',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    <QuotationRenderer data={data} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Mobile: collapsible preview ── */}
          <div className="lg:hidden">
            <button
              onClick={() => setPreviewOpenMobile((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm shadow-sm"
            >
              <span>{previewOpenMobile ? 'Hide Preview' : 'Show Live Preview'}</span>
              {previewOpenMobile ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {previewOpenMobile && (
              <div className="mt-3 bg-gray-100 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-y-auto p-4" style={{ maxHeight: '75vh' }}>
                {/* Mobile scale: 0.38 → 794*0.38=302px wide, 1123*0.38=427px tall */}
                <div style={{ position: 'relative', width: '100%', height: `${Math.round(1123 * 0.38)}px` }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: 'scale(0.38)',
                      transformOrigin: 'top left',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    }}
                  >
                    <QuotationRenderer data={data} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}