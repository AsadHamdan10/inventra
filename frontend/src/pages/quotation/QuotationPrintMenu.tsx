// ── QuotationPrintMenu.tsx ────────────────────────────────────
// Slim print/PDF/share dropdown, purpose-built for quotations.
//
// Why not reuse PrintMenuButton.tsx directly? That component's menu
// includes "Change Design" (opens the 10-template InvoiceTemplateGallery)
// and is typed to InvoiceType ('sales' | 'purchase'). Quotation has
// only 2 formats and they're chosen AUTOMATICALLY (no gallery, no user
// choice) — forcing PrintMenuButton's gallery-switch UI onto a feature
// that has no gallery would be confusing, not reuse.
//
// Everything else IS reused directly: the same fixed-position +
// portal anchoring technique (so the dropdown floats over the page
// instead of pushing content down — the exact bug fixed earlier in
// PrintMenuButton), and the same underlying print/PDF/share engine
// (generateInvoicePdf.ts) via quotationToPrint.ts.

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ChevronDown, Loader2 } from 'lucide-react';
import QuotationRenderer from './QuotationRenderer';
import { QuotationData } from './quotationTypes';
import {
  printQuotationElement,
  downloadQuotationPdf,
  shareQuotationPdf,
  shareQuotationImage,
} from './quotationToPrint';

interface Props {
  data: QuotationData;
  /** Called after Print / Download / Share PDF / Share Image completes — used to auto-reset the form. */
  onComplete?: () => void;
  variant?: 'full' | 'mobile';
}

type ActionKey = 'print' | 'download' | 'share-pdf' | 'share-image';

export default function QuotationPrintMenu({ data, onComplete, variant = 'full' }: Props) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; right: number; width: number } | null>(null);
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [renderVisible, setRenderVisible] = useState(false);

  const dropRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rendererRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropRef.current && !dropRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

    setMenuPos({
      top: openUpward ? rect.top - menuHeight - 6 : rect.bottom + 6,
      left: rect.left,
      right: window.innerWidth - rect.right,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  const withRenderer = useCallback(async (fn: (el: HTMLElement) => Promise<void>) => {
    setRenderVisible(true);
    await new Promise((r) => setTimeout(r, 150));
    const el = rendererRef.current;
    if (el) await fn(el);
    setRenderVisible(false);
  }, []);

  const run = useCallback(async (key: ActionKey, fn: () => Promise<void>) => {
    setOpen(false);
    setLoading(key);
    try {
      await fn();
      onComplete?.();
    } finally {
      setLoading(null);
    }
  }, [onComplete]);

  const handlePrint = () => run('print', () => withRenderer((el) => printQuotationElement(el)));
  const handleDownload = () => run('download', () => withRenderer((el) => downloadQuotationPdf(el, data.quotationNo)));
  const handleSharePdf = () => run('share-pdf', () => withRenderer((el) => shareQuotationPdf(el, data.quotationNo)));
  const handleShareImage = () => run('share-image', () => withRenderer((el) => shareQuotationImage(el, data.quotationNo)));

  const isLoading = loading !== null;

  const loadingLabel: Record<ActionKey, string> = {
    print: 'Preparing…',
    download: 'Generating PDF…',
    'share-pdf': 'Sharing PDF…',
    'share-image': 'Sharing Image…',
  };

  const menuItems = [
    { key: 'print' as ActionKey, emoji: '🖨', label: 'Print', desc: 'Open print dialog', onClick: handlePrint },
    { key: 'download' as ActionKey, emoji: '📄', label: 'Download PDF', desc: 'Save PDF to device', onClick: handleDownload },
    { key: 'share-pdf' as ActionKey, emoji: '📤', label: 'Share PDF', desc: 'WhatsApp · Gmail · Telegram', onClick: handleSharePdf },
    { key: 'share-image' as ActionKey, emoji: '🖼', label: 'Share Image', desc: 'Share as PNG image', onClick: handleShareImage },
  ];

  const triggerStyle: React.CSSProperties =
    variant === 'mobile'
      ? {
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          width: '100%', padding: '12px', background: isLoading ? '#6b7280' : '#1d4ed8',
          color: '#fff', border: 'none', borderRadius: '10px',
          fontWeight: '700', fontSize: '14px', cursor: isLoading ? 'not-allowed' : 'pointer',
          minHeight: '48px',
        }
      : {
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 18px', background: isLoading ? '#6b7280' : '#1d4ed8',
          color: '#fff', border: 'none', borderRadius: '8px',
          fontWeight: '700', fontSize: '14px', cursor: isLoading ? 'not-allowed' : 'pointer',
        };

  return (
    <>
      <div ref={dropRef} style={{ position: 'relative', display: variant === 'mobile' ? 'block' : 'inline-block', width: variant === 'mobile' ? '100%' : undefined }}>
        <button ref={buttonRef} onClick={() => setOpen((v) => !v)} disabled={isLoading} style={triggerStyle}>
          {isLoading ? (
            <>
              <Loader2 size={14} style={{ animation: 'qSpin 1s linear infinite', flexShrink: 0 }} />
              {loading ? loadingLabel[loading] : ''}
            </>
          ) : (
            <>
              <Printer size={15} />
              Print / Share
              <ChevronDown size={12} style={{ opacity: 0.8 }} />
            </>
          )}
        </button>
      </div>

      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPos.top,
            ...(variant === 'mobile' ? { left: menuPos.left, width: menuPos.width } : { right: menuPos.right }),
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
            minWidth: variant === 'mobile' ? menuPos.width : '230px',
            maxWidth: '90vw',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'qFadeDown 0.15s ease',
          }}
        >
          {menuItems.map((item, idx) => (
            <button
              key={item.key}
              onClick={item.onClick}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: variant === 'mobile' ? '14px 16px' : '10px 14px',
                background: 'transparent', border: 'none',
                borderBottom: idx < menuItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                minHeight: variant === 'mobile' ? '52px' : '44px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: variant === 'mobile' ? '18px' : '16px', flexShrink: 0 }}>{item.emoji}</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: variant === 'mobile' ? '14px' : '13px', color: '#1e293b' }}>{item.label}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}

      {renderVisible && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, opacity: 0, pointerEvents: 'none' }}>
          <QuotationRenderer ref={rendererRef} data={data} />
        </div>
      )}

      <style>{`
        @keyframes qSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes qFadeDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}