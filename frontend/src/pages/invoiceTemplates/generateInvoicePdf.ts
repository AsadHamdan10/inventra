import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { A4_WIDTH_PX, A4_HEIGHT_PX } from './invoicePagination';

export interface PdfOptions {
  scale?: number;
}

async function elementToCanvas(element: HTMLElement, scale = 2): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    // Ensure full height is captured for multi-page invoices
    windowWidth: A4_WIDTH_PX,
    scrollY: 0,
  });
}

/**
 * Converts a multi-page invoice element to a PDF.
 *
 * Strategy: the invoice renders as stacked A4 divs (each with class "inv-page").
 * We look for those child pages and render each one individually, giving a
 * clean per-page image in the PDF.  Falls back to single-canvas approach when
 * no "inv-page" children are found (backwards-compatible).
 */
export async function elementToPdf(element: HTMLElement, opts: PdfOptions = {}): Promise<jsPDF> {
  const scale = opts.scale ?? 2;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Try to find individual page elements
  const pageEls = Array.from(element.querySelectorAll<HTMLElement>('.inv-page'));

  if (pageEls.length > 0) {
    // Render each page separately for pixel-perfect A4 pages
    for (let i = 0; i < pageEls.length; i++) {
      const pageEl = pageEls[i];

      // Temporarily ensure the page has exact A4 dimensions for rendering
      const prevHeight = pageEl.style.minHeight;
      pageEl.style.minHeight = `${A4_HEIGHT_PX}px`;

      const canvas = await html2canvas(pageEl, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
      });

      pageEl.style.minHeight = prevHeight;

      const imgData = canvas.toDataURL('image/png');

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
    }
  } else {
    // Fallback: single-canvas scroll approach (original behaviour)
    const canvas = await elementToCanvas(element, scale);
    const imgData = canvas.toDataURL('image/png');
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;
    let y = 0;
    let remaining = imgH;
    while (remaining > 0) {
      pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH);
      remaining -= pageH;
      y += pageH;
      if (remaining > 0) pdf.addPage();
    }
  }

  return pdf;
}

export async function downloadInvoicePdf(element: HTMLElement, filename = 'invoice.pdf'): Promise<void> {
  const pdf = await elementToPdf(element);
  pdf.save(filename);
}

export async function shareInvoicePdf(
  element: HTMLElement,
  filename = 'invoice.pdf',
  invoiceNo = ''
): Promise<void> {
  const pdf = await elementToPdf(element);
  const blob = pdf.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  const title = `Invoice ${invoiceNo}`;
  const text = `Please find attached invoice ${invoiceNo}.`;
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
  } else if (navigator.share) {
    const url = URL.createObjectURL(blob);
    await navigator.share({ title, text, url });
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    pdf.save(filename);
  }
}

export async function shareInvoiceImage(
  element: HTMLElement,
  filename = 'invoice.png',
  invoiceNo = ''
): Promise<void> {
  const canvas = await elementToCanvas(element, 2);
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
  const file = new File([blob], filename, { type: 'image/png' });
  const title = `Invoice ${invoiceNo}`;
  const text = `Invoice ${invoiceNo}`;
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, text, files: [file] });
  } else if (navigator.share) {
    const url = URL.createObjectURL(blob);
    await navigator.share({ title, text, url });
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } else {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  }
}

export function printInvoiceElement(element: HTMLElement): void {
  const clone = element.cloneNode(true) as HTMLElement;

  // Collect existing page stylesheets
  const styleSheets = Array.from(document.styleSheets)
    .map((s) => {
      try {
        return Array.from(s.cssRules).map((r) => r.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) {
    alert('Please allow pop-ups to print.');
    return;
  }

  win.document.write(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice</title>
<style>
${styleSheets}
@page {
  size: A4 portrait;
  margin: 0;
}
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
/* Each .inv-page is one A4 sheet */
.inv-page {
  width: ${A4_WIDTH_PX}px !important;
  min-height: ${A4_HEIGHT_PX}px !important;
  page-break-after: always !important;
  break-after: page !important;
  box-sizing: border-box;
  overflow: hidden;
}
.inv-page:last-child {
  page-break-after: avoid !important;
  break-after: avoid !important;
}
.inv-no-break {
  page-break-inside: avoid !important;
  break-inside: avoid !important;
}
@media print {
  body { zoom: 1; }
}
</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>
`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 600);
}