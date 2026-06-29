// ── quotationToPrint.ts ────────────────────────────────────────
// Thin wrapper around the EXISTING print/PDF/share engine
// (generateInvoicePdf.ts). No new PDF/canvas logic is written here —
// every function below just forwards to the already-built, generic,
// element-based utilities that Sales/Purchase already use.

import {
  downloadInvoicePdf,
  shareInvoicePdf,
  shareInvoiceImage,
  printInvoiceElement,
} from '../invoiceTemplates/generateInvoicePdf';

export async function printQuotationElement(element: HTMLElement): Promise<void> {
  printInvoiceElement(element);
}

export async function downloadQuotationPdf(element: HTMLElement, quotationNo: string): Promise<void> {
  const safeNo = quotationNo.replace(/\//g, '-');
  await downloadInvoicePdf(element, `${safeNo}.pdf`);
}

export async function shareQuotationPdf(element: HTMLElement, quotationNo: string): Promise<void> {
  const safeNo = quotationNo.replace(/\//g, '-');
  await shareInvoicePdf(element, `${safeNo}.pdf`, quotationNo);
}

export async function shareQuotationImage(element: HTMLElement, quotationNo: string): Promise<void> {
  const safeNo = quotationNo.replace(/\//g, '-');
  await shareInvoiceImage(element, `${safeNo}.png`, quotationNo);
}