import React, { useState, useCallback, useMemo } from 'react';
import { InvoiceData } from './invoiceTypes';
import { InvoiceType, TemplateId, getSelectedTemplate } from './invoiceTemplateManager';
import PrintMenuButton from './PrintMenuButton';
import InvoiceTemplateGallery from './InvoiceTemplateGallery';

interface Options {
  invoiceType: InvoiceType;
  getInvoiceData: () => InvoiceData | null;
  invoiceNo?: string;
  /** 'icon' for compact table rows, 'full' for modal headers, 'mobile' for mobile cards */
  variant?: 'icon' | 'full' | 'mobile';
}

interface Result {
  PrintButton: React.ReactNode;
  GalleryModal: React.ReactNode;
  openGallery: () => void;
  templateId: TemplateId;
}

export function useInvoicePrint({ invoiceType, getInvoiceData, invoiceNo, variant = 'full' }: Options): Result {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [templateId, setTemplateId] = useState<TemplateId>(() => getSelectedTemplate(invoiceType));

  const openGallery = useCallback(() => setGalleryOpen(true), []);
  const handleSelect = useCallback((id: TemplateId) => setTemplateId(id), []);

  const invoiceData = getInvoiceData();

  const PrintButton: React.ReactNode = useMemo(
    () =>
      invoiceData ? (
        <PrintMenuButton
          invoiceData={invoiceData}
          invoiceType={invoiceType}
          invoiceNo={invoiceNo}
          templateId={templateId}
          onChangeDesign={openGallery}
          variant={variant}
        />
      ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoiceData, invoiceType, invoiceNo, templateId, variant]
  );

  const GalleryModal: React.ReactNode = galleryOpen ? (
    <InvoiceTemplateGallery
      type={invoiceType}
      onClose={() => setGalleryOpen(false)}
      onSelect={handleSelect}
    />
  ) : null;

  return { PrintButton, GalleryModal, openGallery, templateId };
}

// ── Per-row hook: each row gets its own isolated print button ──
// Use this inside a .map() so each row has independent loading state.
interface RowOptions {
  invoiceType: InvoiceType;
  invoiceData: InvoiceData;
  invoiceNo: string;
  onChangeDesign: () => void;
  templateId: TemplateId;
}

export function RowPrintButton({
  invoiceType,
  invoiceData,
  invoiceNo,
  onChangeDesign,
  templateId,
}: RowOptions): React.ReactElement {
  return (
    <PrintMenuButton
      invoiceData={invoiceData}
      invoiceType={invoiceType}
      invoiceNo={invoiceNo}
      templateId={templateId}
      onChangeDesign={onChangeDesign}
      variant="icon"
    />
  );
}