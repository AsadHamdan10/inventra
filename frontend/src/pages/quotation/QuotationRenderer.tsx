// ── QuotationRenderer.tsx ─────────────────────────────────────
// Picks Format 1 (Supplier + Buyer) or Format 2 (Supplier Only)
// automatically based on whether buyer.buyerName is filled in.
// The user never chooses a format — this mirrors how
// InvoiceRenderer.tsx switches between the 10 invoice templates,
// except quotation only has 2, and the choice is automatic
// rather than user-selected.

import { forwardRef, useEffect, useState } from 'react';
import { QuotationData, hasBuyer } from './quotationTypes';
import { InvoiceSettings, getInvoiceSettings, subscribeInvoiceSettings } from '../invoiceTemplates/invoiceSettings';
import Template01SupplierBuyer from './quotationTemplates/Template01SupplierBuyer';
import Template02SupplierOnly from './quotationTemplates/Template02SupplierOnly';

interface Props {
  data: QuotationData;
  /** Optional override — if omitted, reads live global InvoiceSettings and stays in sync. */
  settings?: InvoiceSettings;
}

const QuotationRenderer = forwardRef<HTMLDivElement, Props>(({ data, settings: settingsProp }, ref) => {
  const [liveSettings, setLiveSettings] = useState<InvoiceSettings>(() => settingsProp ?? getInvoiceSettings());

  useEffect(() => {
    if (settingsProp) {
      setLiveSettings(settingsProp);
      return;
    }
    setLiveSettings(getInvoiceSettings());
    const unsubscribe = subscribeInvoiceSettings(setLiveSettings);
    return unsubscribe;
  }, [settingsProp]);

  const Template = hasBuyer(data.buyer) ? Template01SupplierBuyer : Template02SupplierOnly;

  return (
    <div ref={ref}>
      <Template data={data} settings={liveSettings} />
    </div>
  );
});

QuotationRenderer.displayName = 'QuotationRenderer';
export default QuotationRenderer;