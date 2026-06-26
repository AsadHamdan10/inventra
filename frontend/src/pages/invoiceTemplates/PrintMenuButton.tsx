import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, Share2, Image, Palette, ChevronDown, Loader2 } from 'lucide-react';
import InvoiceRenderer from './InvoiceRenderer';
import { getSelectedTemplate, InvoiceType, TemplateId } from './invoiceTemplateManager';
import { InvoiceData } from './invoiceTypes';
import {
  downloadInvoicePdf,
  printInvoiceElement,
  shareInvoicePdf,
  shareInvoiceImage,
} from './generateInvoicePdf';

interface Props {
  invoiceData: InvoiceData;
  invoiceType: InvoiceType;
  invoiceNo?: string;
  onChangeDesign?: () => void;
  templateId?: TemplateId;
  /** 'icon' = compact icon-only button for table rows, 'full' = labeled button */
  variant?: 'icon' | 'full' | 'mobile';
}

type ActionKey = 'print' | 'download' | 'share-pdf' | 'share-image' | 'design';

export default function PrintMenuButton({
  invoiceData,
  invoiceType,
  invoiceNo,
  onChangeDesign,
  templateId: templateIdProp,
  variant = 'full',
}: Props) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; right: number; width: number } | null>(null);
  const [loading, setLoading] = useState<ActionKey | null>(null);
  const [renderVisible, setRenderVisible] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rendererRef = useRef<HTMLDivElement>(null);

  const [templateId, setTemplateId] = useState<TemplateId>(
    templateIdProp ?? getSelectedTemplate(invoiceType)
  );

  useEffect(() => {
    if (templateIdProp) setTemplateId(templateIdProp);
  }, [templateIdProp]);

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

  // Keep the floating menu pinned to the trigger button on scroll/resize,
  // and recompute whenever it opens — fixes menus rendering off-screen or
  // pushing page content down when the button sits inside a table/card.
  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = 240; // approx max height of the 5-item menu
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

  const handleOpen = () => {
    setTemplateId(templateIdProp ?? getSelectedTemplate(invoiceType));
    setOpen((v) => !v);
  };

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
    } finally {
      setLoading(null);
    }
  }, []);

  const handlePrint = () =>
    run('print', () => withRenderer(async (el) => printInvoiceElement(el)));

  const handleDownload = () =>
    run('download', () =>
      withRenderer((el) => downloadInvoicePdf(el, `${invoiceNo ?? 'invoice'}.pdf`))
    );

  const handleSharePdf = () =>
    run('share-pdf', () =>
      withRenderer((el) => shareInvoicePdf(el, `${invoiceNo ?? 'invoice'}.pdf`, invoiceNo ?? ''))
    );

  const handleShareImage = () =>
    run('share-image', () =>
      withRenderer((el) => shareInvoiceImage(el, `${invoiceNo ?? 'invoice'}.png`, invoiceNo ?? ''))
    );

  const handleDesign = () => {
    setOpen(false);
    onChangeDesign?.();
  };

  const isLoading = loading !== null;

  const loadingLabel: Record<ActionKey, string> = {
    print: 'Preparing…',
    download: 'Generating PDF…',
    'share-pdf': 'Sharing PDF…',
    'share-image': 'Sharing Image…',
    design: '',
  };

  const menuItems = [
    { key: 'print' as ActionKey,        emoji: '🖨',  label: 'Print Invoice',   desc: 'Open print dialog',           onClick: handlePrint },
    { key: 'download' as ActionKey,     emoji: '📄',  label: 'Download PDF',    desc: 'Save PDF to device',          onClick: handleDownload },
    { key: 'share-pdf' as ActionKey,    emoji: '📤',  label: 'Share PDF',       desc: 'WhatsApp · Gmail · Telegram', onClick: handleSharePdf },
    { key: 'share-image' as ActionKey,  emoji: '🖼',  label: 'Share Image',     desc: 'Share as PNG image',          onClick: handleShareImage },
    { key: 'design' as ActionKey,       emoji: '🎨',  label: 'Change Design',   desc: 'Browse 10 templates',         onClick: handleDesign, accent: true },
  ];

  // ── Trigger button styles per variant ──────────────────────
  const triggerStyle: React.CSSProperties =
    variant === 'icon'
      ? {
          display: 'flex', alignItems: 'center', gap: '3px',
          padding: '5px 8px', background: isLoading ? '#6b7280' : '#1d4ed8',
          color: '#fff', border: 'none', borderRadius: '6px',
          fontWeight: '700', fontSize: '11px', cursor: isLoading ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }
      : variant === 'mobile'
      ? {
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          width: '100%', padding: '12px', background: isLoading ? '#6b7280' : '#1d4ed8',
          color: '#fff', border: 'none', borderRadius: '10px',
          fontWeight: '700', fontSize: '14px', cursor: isLoading ? 'not-allowed' : 'pointer',
          minHeight: '48px',
        }
      : {
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 14px', background: isLoading ? '#6b7280' : '#1d4ed8',
          color: '#fff', border: 'none', borderRadius: '8px',
          fontWeight: '700', fontSize: '13px', cursor: isLoading ? 'not-allowed' : 'pointer',
        };

  return (
    <>
      <div ref={dropRef} style={{ position: 'relative', display: variant === 'mobile' ? 'block' : 'inline-block', width: variant === 'mobile' ? '100%' : undefined }}>
        <button ref={buttonRef} onClick={handleOpen} disabled={isLoading} style={triggerStyle}>
          {isLoading ? (
            <>
              <Loader2 size={13} style={{ animation: 'invSpin 1s linear infinite', flexShrink: 0 }} />
              {loading ? loadingLabel[loading] : ''}
            </>
          ) : (
            <>
              <Printer size={variant === 'icon' ? 12 : 14} />
              Print
              <ChevronDown size={11} style={{ opacity: 0.8 }} />
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
            ...(variant === 'mobile'
              ? { left: menuPos.left, width: menuPos.width }
              : { right: menuPos.right }),
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
            minWidth: variant === 'mobile' ? menuPos.width : '230px',
            maxWidth: '90vw',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'invFadeDown 0.15s ease',
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
              <span style={{ fontSize: variant === 'mobile' ? '18px' : '16px', flexShrink: 0 }}>
                {item.emoji}
              </span>
              <div>
                <div style={{
                  fontWeight: '700',
                  fontSize: variant === 'mobile' ? '14px' : '13px',
                  color: (item as { accent?: boolean }).accent ? '#7c3aed' : '#1e293b',
                }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>
                  {item.desc}
                </div>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}

      {renderVisible && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, opacity: 0, pointerEvents: 'none' }}>
          <div ref={rendererRef}>
            <InvoiceRenderer templateId={templateId} data={invoiceData} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes invSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes invFadeDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
}