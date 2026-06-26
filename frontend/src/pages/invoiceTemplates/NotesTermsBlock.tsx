// ── NotesTermsBlock.tsx ────────────────────────────────────────
// Shared Notes + Terms & Conditions renderer, gated by global
// invoice settings (showNotes / showTerms). Drop into any
// template's footer so behaviour stays consistent everywhere.

import { InvoiceData } from './invoiceTypes';
import { InvoiceSettings } from './invoiceSettings';

interface Props {
  data: InvoiceData;
  settings: InvoiceSettings;
  style?: React.CSSProperties;
}

export default function NotesTermsBlock({ data, settings, style }: Props) {
  const showTerms = settings.showTerms && !!data.termsAndConditions;
  const showNotes = settings.showNotes && !!data.notes;
  if (!showTerms && !showNotes) return null;

  return (
    <div style={{ marginTop: '10px', fontSize: '10px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '7px', ...style }}>
      {showTerms && (
        <>
          <span style={{ fontWeight: '700', color: '#374151' }}>Terms & Conditions: </span>
          {data.termsAndConditions}
        </>
      )}
      {showTerms && showNotes && <br />}
      {showNotes && (
        <>
          <span style={{ fontWeight: '700', color: '#374151' }}>Notes: </span>
          {data.notes}
        </>
      )}
    </div>
  );
}