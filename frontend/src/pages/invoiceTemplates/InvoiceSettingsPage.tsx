// ── InvoiceSettingsPage.tsx ────────────────────────────────────
// Dedicated Invoice Settings page (Inventra → Settings → Invoice Formatting).
//
// Lets the company set GLOBAL invoice formatting preferences:
//   - Address alignment (left / center / right)
//   - Address style (multi-line / single-line)
//   - Section visibility (signature, bank details, terms, notes, payment status)
//
// Changes apply instantly to the live preview on the right, and to
// every invoice template across the app the moment they're changed —
// no save button required for the preview, though "Save" persists
// the choice as the default going forward.
//
// Architecture note: this page does NOT touch Sale/Purchase retrieval,
// saleToInvoiceData(), or any template's data contract. It only writes
// to invoiceSettings.ts (localStorage), which every template already
// reads from InvoiceRenderer.

import { useEffect, useState } from 'react';
import { Palette, Eye, EyeOff, RotateCcw, Check, LayoutTemplate, Plus, ArrowRight } from 'lucide-react';
import {
  InvoiceSettings,
  AddressAlignment,
  AddressStyle,
  getInvoiceSettings,
  setInvoiceSettings,
  DEFAULT_INVOICE_SETTINGS,
} from '../invoiceTemplates/invoiceSettings';
import {
  getSelectedTemplate,
  setSelectedTemplate,
  TEMPLATES,
  TemplateId,
  InvoiceType,
} from '../invoiceTemplates/invoiceTemplateManager';
import InvoiceRenderer from '../invoiceTemplates/InvoiceRenderer';
import InvoiceTemplateGallery from '../invoiceTemplates/InvoiceTemplateGallery';
import { InvoiceData } from '../invoiceTemplates/invoiceTypes';

// ── Demo invoice used only for the live preview pane ───────────
const PREVIEW_DATA: InvoiceData = {
  invoiceNo: 'INV-2024-001',
  invoiceDate: new Date().toISOString(),
  invoiceLabel: 'Tax Invoice',
  company: {
    companyName: 'Inventra Solutions Pvt Ltd',
    gstin: '33AABCI1234F1Z5',
    addressLine1: '42, Tech Park, Anna Salai',
    addressLine2: 'Guindy Industrial Estate',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600032',
    mobile: '9876543210',
    email: 'info@inventra.in',
  },
  partyName: 'Sunrise Trading Co.',
  partyGstin: '33BBBCS5678G1Z9',
  partyAddress: 'No.266, Periyar EVR High Road\nKilpauk\nChennai - 600010',
  deliveryAddress: 'No.266, Periyar EVR High Road\nKilpauk\nChennai - 600010',
  partyLabel: 'Bill To',
  partyMobile: '9876501234',
  items: [
    { materialName: 'Steel Pipes (20mm)', hsnCode: '7306', quantity: 100, unitPrice: 850, gstPercent: 18, taxableAmount: 85000, gstAmount: 15300, itemTotal: 100300 },
    { materialName: 'Copper Fittings', hsnCode: '7412', quantity: 50, unitPrice: 320, gstPercent: 18, taxableAmount: 16000, gstAmount: 2880, itemTotal: 18880 },
  ],
  totalTaxable: 101000,
  totalGst: 18180,
  cgstAmount: 9090,
  sgstAmount: 9090,
  igstAmount: 0,
  grandTotal: 119180,
  isInterState: false,
  paymentReceived: 50000,
  amountInWords: 'One Lakh Nineteen Thousand One Hundred Eighty Rupees Only',
  bankName: 'State Bank of India',
  accountName: 'Inventra Solutions Pvt Ltd',
  accountNumber: '39847263819200',
  ifscCode: 'SBIN0001234',
  branchName: 'Anna Salai Branch',
  termsAndConditions: 'Payment due within 30 days. Goods once sold cannot be returned.',
  notes: 'Thank you for your business!',
};

// ── Small reusable radio-card control ───────────────────────────
function OptionCard({
  active,
  label,
  sublabel,
  onClick,
}: {
  active: boolean;
  label: string;
  sublabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left px-4 py-3 rounded-xl border-2 transition-all ${
        active
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
          {label}
        </span>
        {active && <Check size={15} className="text-indigo-600" />}
      </div>
      {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
    </button>
  );
}

// ── Toggle row for visibility settings ──────────────────────────
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${checked ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
          {checked ? <Eye size={15} /> : <EyeOff size={15} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium break-words text-gray-800 dark:text-gray-200">{label}</p>
          <p className="text-xs text-gray-400 break-words">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  );
}

export default function InvoiceSettingsPage() {
  const [settings, setSettings] = useState<InvoiceSettings>(() => getInvoiceSettings());
  const [saved, setSaved] = useState(false);
  const [previewType, setPreviewType] = useState<InvoiceType>('sales');
  const [salesTemplate, setSalesTemplate] = useState<TemplateId>(() => getSelectedTemplate('sales'));
  const [purchaseTemplate, setPurchaseTemplate] = useState<TemplateId>(() => getSelectedTemplate('purchase'));
  const [galleryOpen, setGalleryOpen] = useState(false);

  const previewTemplateId = previewType === 'sales' ? salesTemplate : purchaseTemplate;

  const chooseTemplate = (id: TemplateId) => {
    setSelectedTemplate(previewType, id);
    if (previewType === 'sales') setSalesTemplate(id);
    else setPurchaseTemplate(id);
  };

  // Persist immediately on every change — this is what makes the
  // preview AND every open invoice across the app update live,
  // with no separate "Save" step required (per spec section 9/12).
  useEffect(() => {
    setInvoiceSettings(settings);
  }, [settings]);

  const update = (partial: Partial<InvoiceSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  };

  const handleSaveDefault = () => {
    setInvoiceSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_INVOICE_SETTINGS });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="px-4 py-6 max-w-7xl mx-auto">

        {/* ── Page Header ── */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Palette size={20} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Invoice Formatting</h1>
              <p className="text-sm text-gray-500 mt-0.5">Applies globally to every invoice template — changes preview instantly.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <RotateCcw size={14} /> Reset to Default
            </button>
            <button
              onClick={handleSaveDefault}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              <Check size={14} /> {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">

          {/* ── Settings Panel ── */}
          <div className="space-y-5">

            {/* ── Choose Template ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <LayoutTemplate size={15} className="text-indigo-500" />
                Default Template
              </h2>
              <button
                onClick={() => setGalleryOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Plus size={13} /> Add Template
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Choose which design prints by default for each invoice type.</p>

            {/* Sales / Purchase toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <OptionCard
                active={previewType === 'sales'}
                label="Sales Invoice"
                sublabel={TEMPLATES.find((t) => t.id === salesTemplate)?.name}
                onClick={() => setPreviewType('sales')}
              />
              <OptionCard
                active={previewType === 'purchase'}
                label="Purchase Invoice"
                sublabel={TEMPLATES.find((t) => t.id === purchaseTemplate)?.name}
                onClick={() => setPreviewType('purchase')}
              />
            </div>

            {/* Horizontal thumbnail strip — all 10 templates */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              {TEMPLATES.map((tmpl) => {
                const isActive = previewTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => chooseTemplate(tmpl.id)}
                    className="flex-shrink-0 w-24 sm:w-20 text-left"
                    title={tmpl.name}
                  >
                    <div
                      className={`w-20 h-14 rounded-lg border-2 flex items-center justify-center text-[9px] font-bold transition-all ${
                        isActive
                          ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                      style={{ background: `${tmpl.accentColor}15`, color: tmpl.accentColor }}
                    >
                      #{String(tmpl.id).padStart(2, '0')}
                      {isActive && <Check size={11} className="ml-1" />}
                    </div>
                    <p className={`text-[10px] mt-1 truncate ${isActive ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}>
                      {tmpl.name}
                    </p>
                  </button>
                );
              })}
              <button
                onClick={() => setGalleryOpen(true)}
                className="flex-shrink-0 w-20 h-14 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors mt-0"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={() => setGalleryOpen(true)}
              className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 py-1"
            >
              Browse full gallery & previews <ArrowRight size={12} />
            </button>
          </div>

          {/* Address Alignment */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Address Alignment</h2>
              <p className="text-xs text-gray-400 mb-3">Applies to company, buyer, and delivery addresses.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['left', 'center', 'right'] as AddressAlignment[]).map((al) => (
                  <OptionCard
                    key={al}
                    active={settings.addressAlignment === al}
                    label={al.charAt(0).toUpperCase() + al.slice(1)}
                    onClick={() => update({ addressAlignment: al })}
                  />
                ))}
              </div>
            </div>

            {/* Address Style */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Address Style</h2>
              <p className="text-xs text-gray-400 mb-3">How multi-line addresses are printed on the invoice.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <OptionCard
                  active={settings.addressStyle === 'multiline'}
                  label="Multi-line"
                  sublabel="Recommended"
                  onClick={() => update({ addressStyle: 'multiline' as AddressStyle })}
                />
                <OptionCard
                  active={settings.addressStyle === 'singleline'}
                  label="Single-line"
                  sublabel="Comma separated"
                  onClick={() => update({ addressStyle: 'singleline' as AddressStyle })}
                />
              </div>
            </div>

            {/* Section Visibility */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">Section Visibility</h2>
              <p className="text-xs text-gray-400 mb-2">Show or hide entire sections on every invoice.</p>
              <ToggleRow
                label="Signature"
                description="Authorised signatory block"
                checked={settings.showSignature}
                onChange={(v) => update({ showSignature: v })}
              />
              <ToggleRow
                label="Bank Details"
                description="Bank name, account, IFSC, branch"
                checked={settings.showBankDetails}
                onChange={(v) => update({ showBankDetails: v })}
              />
              <ToggleRow
                label="Terms & Conditions"
                description="Printed near the footer"
                checked={settings.showTerms}
                onChange={(v) => update({ showTerms: v })}
              />
              <ToggleRow
                label="Notes"
                description="Free-text invoice notes"
                checked={settings.showNotes}
                onChange={(v) => update({ showNotes: v })}
              />
              <ToggleRow
                label="Payment Status"
                description="Amount received & balance due"
                checked={settings.showPaymentStatus}
                onChange={(v) => update({ showPaymentStatus: v })}
              />
            </div>
          </div>

          {/* ── Live Preview ── */}
          <div className="bg-gray-100 dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4 lg:p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">Live Preview</h2>
              <span className="text-xs text-gray-400">
                {previewType === 'sales' ? 'Sales' : 'Purchase'} sample · {TEMPLATES.find((t) => t.id === previewTemplateId)?.name}
              </span>
            </div>
            <div className="flex justify-center">
             <div
  className="
    scale-[0.39]
    sm:scale-[0.40]
    md:scale-[0.55]
    lg:scale-[0.65]
    xl:scale-[0.72]
  "
  style={{
    transformOrigin: 'top center',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
  }}
>
                <InvoiceRenderer templateId={previewTemplateId} data={PREVIEW_DATA} settings={settings} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full Template Gallery (opens from "Add Template" / "Browse full gallery") ── */}
      {galleryOpen && (
        <InvoiceTemplateGallery
          type={previewType}
          onClose={() => setGalleryOpen(false)}
          onSelect={(id) => {
            if (previewType === 'sales') setSalesTemplate(id);
            else setPurchaseTemplate(id);
          }}
        />
      )}
    </div>
  );
}