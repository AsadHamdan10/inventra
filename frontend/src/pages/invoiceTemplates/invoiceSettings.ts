// ── invoiceSettings.ts ────────────────────────────────────────
// Global Invoice Formatting Settings.
// Company-wide (NOT customer-specific). Persisted in localStorage.
// All templates must read from here instead of hardcoding
// textAlign / whiteSpace / visibility rules.
//
// Architecture (unchanged elsewhere):
//   Sale → saleToInvoiceData() → InvoiceData → Template
//
// This module only adds a SECOND, independent input — formatting
// preferences — that templates combine with InvoiceData at render
// time. It never touches retrieval, mapping, or calculation logic.

export type AddressAlignment = 'left' | 'center' | 'right';
export type AddressStyle = 'multiline' | 'singleline';

export interface InvoiceSettings {
  addressAlignment: AddressAlignment;
  addressStyle: AddressStyle;
  showSignature: boolean;
  showBankDetails: boolean;
  showTerms: boolean;
  showNotes: boolean;
  showPaymentStatus: boolean;
}

const STORAGE_KEY = 'inventra:invoiceSettings';

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  addressAlignment: 'left',
  addressStyle: 'multiline',
  showSignature: true,
  showBankDetails: true,
  showTerms: true,
  showNotes: true,
  showPaymentStatus: true,
};

// Browsers fire a custom event so every open template/preview
// re-renders the instant settings change — no save/reload needed.
const CHANGE_EVENT = 'inventra:invoiceSettingsChanged';

export function getInvoiceSettings(): InvoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_INVOICE_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<InvoiceSettings>;
    return { ...DEFAULT_INVOICE_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_INVOICE_SETTINGS };
  }
}

export function setInvoiceSettings(settings: InvoiceSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: settings }));
}

export function updateInvoiceSettings(partial: Partial<InvoiceSettings>): InvoiceSettings {
  const next = { ...getInvoiceSettings(), ...partial };
  setInvoiceSettings(next);
  return next;
}

/** Subscribe to live settings changes. Returns an unsubscribe function. */
export function subscribeInvoiceSettings(cb: (settings: InvoiceSettings) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<InvoiceSettings>).detail ?? getInvoiceSettings());
  window.addEventListener(CHANGE_EVENT, handler);
  // Also listen for cross-tab changes via the native storage event
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb(getInvoiceSettings());
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
}

// ── Formatting helpers used by templates ──────────────────────

/**
 * Formats a raw multi-line address string according to addressStyle.
 * Input is always stored as-is (with \n line breaks from a <textarea>).
 * - multiline  → preserves line breaks (whiteSpace: 'pre-wrap' in CSS)
 * - singleline → joins all non-empty lines with ", "
 */
export function formatAddress(raw: string | undefined | null, style: AddressStyle): string {
  if (!raw) return '';
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (style === 'singleline') return lines.join(', ');
  return lines.join('\n');
}

/** Returns the CSS style object templates should spread onto address blocks. */
export function addressBlockStyle(settings: InvoiceSettings): React.CSSProperties {
  return {
    textAlign: settings.addressAlignment,
    whiteSpace: settings.addressStyle === 'multiline' ? 'pre-wrap' : 'normal',
    wordBreak: 'break-word',
  };
}