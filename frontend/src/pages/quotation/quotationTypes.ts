// ── quotationTypes.ts ──────────────────────────────────────────
// Data model + calculation engine for the standalone Quotation
// module. Nothing here is ever persisted — quotationNo is an
// in-memory counter that resets to 0001 on every page refresh,
// per spec ("Generate locally only... No database storage").
//
// Re-uses (does NOT duplicate) the existing invoice formatting
// helpers — fmt / fmtDate / numberToWords / CompanyInfo — exactly
// as Sales/Purchase do.

import { format, addDays } from 'date-fns';
import { CompanyInfo, fmt, fmtDate, numberToWords } from '../invoiceTemplates/invoiceTypes';

// Re-exported so quotation templates can do
//   import { fmt, fmtDate, numberToWords } from '../quotationTypes'
// without reaching into invoiceTemplates directly.
export { fmt, fmtDate, numberToWords };

// ── Item ────────────────────────────────────────────────────────
export interface QuotationItem {
  productName: string;
  description?: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  gstPercent: number;
  // Derived (set by calcQuotationItem)
  taxableAmount: number;
  gstAmount: number;
  itemTotal: number;
}

export function emptyQuotationItem(): QuotationItem {
  return {
    productName: '',
    description: '',
    hsnCode: '',
    quantity: 0,
    unit: 'Nos',
    rate: 0,
    discountPercent: 0,
    gstPercent: 0,
    taxableAmount: 0,
    gstAmount: 0,
    itemTotal: 0,
  };
}

/** Recomputes taxable / GST / total for a single row. Same calculation
 *  order as the invoice engine (qty × rate → GST), extended with a
 *  per-item discount % the way the quotation spec requires. */
export function calcQuotationItem(item: QuotationItem): QuotationItem {
  const gross = +(item.quantity * item.rate).toFixed(2);
  const discountAmount = +((gross * (item.discountPercent || 0)) / 100).toFixed(2);
  const taxableAmount = +(gross - discountAmount).toFixed(2);
  const gstAmount = +((taxableAmount * item.gstPercent) / 100).toFixed(2);
  const itemTotal = +(taxableAmount + gstAmount).toFixed(2);
  return { ...item, taxableAmount, gstAmount, itemTotal };
}

// ── Totals ──────────────────────────────────────────────────────
export interface QuotationTotals {
  totalTaxable: number;
  totalDiscount: number;
  totalGst: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  grandTotal: number;
}

/** Same CGST/SGST vs IGST split logic as calcTotals() in SalesPage.tsx,
 *  plus an automatically-computed Round Off (quotations round the
 *  grand total to the nearest rupee; Sales leaves Round Off manual). */
export function calcQuotationTotals(items: QuotationItem[], isInterState: boolean): QuotationTotals {
  const active = items.filter((it) => it.productName && it.quantity > 0);

  const totalTaxable = +active.reduce((s, it) => s + it.taxableAmount, 0).toFixed(2);
  const totalGst = +active.reduce((s, it) => s + it.gstAmount, 0).toFixed(2);
  const totalDiscount = +active
    .reduce((s, it) => s + (it.quantity * it.rate - it.taxableAmount), 0)
    .toFixed(2);

  const rawGrandTotal = totalTaxable + totalGst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = +(grandTotal - rawGrandTotal).toFixed(2);

  return {
    totalTaxable,
    totalDiscount,
    totalGst,
    igstAmount: isInterState ? totalGst : 0,
    cgstAmount: isInterState ? 0 : +(totalGst / 2).toFixed(2),
    sgstAmount: isInterState ? 0 : +(totalGst / 2).toFixed(2),
    roundOff,
    grandTotal,
  };
}

// ── Supplier (= logged-in company, optionally edited for this quotation only) ──
export interface QuotationSupplier extends CompanyInfo {
  useCompanyProfile: boolean;
}

export function supplierFromCompany(company: CompanyInfo): QuotationSupplier {
  return { ...company, useCompanyProfile: true };
}

// ── Buyer (always manual — never read from the database) ────────
export interface QuotationBuyer {
  buyerName: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
}

function emptyQuotationBuyer(): QuotationBuyer {
  return {
    buyerName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
  };
}

/** A quotation is Format 1 (Supplier + Buyer) the moment Buyer Name is
 *  filled in, and Format 2 (Supplier Only) otherwise. The user never
 *  picks — this is the single source of truth both QuotationPage's
 *  status badge and QuotationRenderer's auto-switch read from. */
export function hasBuyer(buyer: QuotationBuyer): boolean {
  return !!buyer.buyerName && buyer.buyerName.trim().length > 0;
}

// ── Quotation (the whole, in-memory-only document) ───────────────
export interface QuotationData {
  quotationNo: string;
  quotationDate: string;
  validTill: string;
  preparedBy: string;
  supplier: QuotationSupplier;
  buyer: QuotationBuyer;
  isInterState: boolean;
  items: QuotationItem[];
  totals: QuotationTotals;
  notes: string;
  termsAndConditions: string;
}

export const DEFAULT_QUOTATION_TERMS = [
  'Prices are exclusive of GST.',
  'Transportation extra unless specified.',
  'Delivery subject to stock availability.',
  'Quotation valid till expiry date.',
  'Payment terms as mutually agreed.',
  'Goods once sold cannot be returned.',
  'This quotation does not constitute a tax invoice.',
].join('\n');

// ── Quotation number — in-memory only, resets to 0001 on refresh ──
// A module-level counter is enough: a hard page refresh re-evaluates
// this module from scratch, which is exactly the "reset to 0001"
// behaviour the spec asks for. No localStorage, no database.
let quotationCounter = 0;

function financialYearLabel(d: Date): string {
  const isAfterApril = d.getMonth() >= 3; // April = month index 3
  const startYear = isAfterApril ? d.getFullYear() : d.getFullYear() - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

function nextQuotationNumber(): string {
  quotationCounter += 1;
  return `QT/${financialYearLabel(new Date())}/${String(quotationCounter).padStart(4, '0')}`;
}

/** Builds a brand-new, blank quotation: fresh number, today's date,
 *  Valid Till = +15 days, supplier reloaded from the company profile,
 *  buyer/items/notes all cleared. Called on first load AND after every
 *  Print / Download / Share completes (no confirmation dialog). */
export function blankQuotation(company: CompanyInfo): QuotationData {
  const today = new Date();
  const items = [emptyQuotationItem()];
  return {
    quotationNo: nextQuotationNumber(),
    quotationDate: format(today, 'yyyy-MM-dd'),
    validTill: format(addDays(today, 15), 'yyyy-MM-dd'),
    preparedBy: '',
    supplier: supplierFromCompany(company),
    buyer: emptyQuotationBuyer(),
    isInterState: false,
    items,
    totals: calcQuotationTotals(items, false),
    notes: '',
    termsAndConditions: DEFAULT_QUOTATION_TERMS,
  };
}