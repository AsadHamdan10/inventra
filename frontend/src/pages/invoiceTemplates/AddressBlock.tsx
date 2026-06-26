// ── AddressBlock.tsx ──────────────────────────────────────────
// Single shared address renderer used by ALL templates.
// Reads InvoiceSettings (alignment + style) so no template ever
// hardcodes textAlign or whiteSpace for an address again.
//
// Usage in any template:
//   <AddressBlock text={data.partyAddress} settings={settings} style={{ fontSize: '13px' }} />

import { InvoiceSettings, addressBlockStyle, formatAddress } from './invoiceSettings';

interface Props {
  text?: string | null;
  settings: InvoiceSettings;
  /** Extra styles merged on top of the settings-driven base style (font-size, color, margin, etc.) */
  style?: React.CSSProperties;
  className?: string;
}

export default function AddressBlock({ text, settings, style, className }: Props) {
  if (!text) return null;
  const formatted = formatAddress(text, settings.addressStyle);
  if (!formatted) return null;
  return (
    <div
      className={className}
      style={{
        ...addressBlockStyle(settings),
        ...style,
      }}
    >
      {formatted}
    </div>
  );
}