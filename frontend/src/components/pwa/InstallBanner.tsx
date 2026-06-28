/**
 * InstallBanner.tsx
 *
 * Purely presentational. All state comes from InstallContext. Mount
 * once near the root (see App.tsx) so it's visible across every
 * route, including the login/register pages — per spec, mobile users
 * should always see the install section regardless of auth state.
 *
 * Layout:
 *   - Mobile (< lg breakpoint): fixed bar pinned to the bottom of the
 *     viewport, full width, respects safe-area-inset-bottom.
 *   - Desktop (>= lg): small floating card, bottom-right, dismissible
 *     with a 7-day snooze.
 *
 * Visual language matches Inventra's existing dark sidebar / brand
 * palette (see AppLayout.tsx, AuthLayout.tsx) — rounded corners,
 * backdrop blur, brand-indigo accents, dark-mode aware surfaces.
 */

import { useEffect } from 'react';
import { Download, Smartphone, Share, Plus, ExternalLink, Ban, X } from 'lucide-react';
import { useInstallContext } from './InstallContext';
import type { InstallUiState } from '../../hooks/useInstallManager';

interface StateContent {
  icon: React.ElementType;
  title: string;
  body: React.ReactNode;
  primaryLabel: string | null;
  primaryAction: 'install' | 'open' | null;
}

function useStateContent(): StateContent | null {
  const { uiState, isInstalling } = useInstallContext();

  const content: Record<InstallUiState, StateContent | null> = {
    'hidden-standalone': null,

    'already-installed': {
      icon: ExternalLink,
      title: 'Inventra is already installed',
      body: 'Open the installed app for the best experience.',
      primaryLabel: 'Open Inventra',
      primaryAction: 'open',
    },

    'can-install': {
      icon: Download,
      title: 'Install Inventra',
      body: <FeatureList />,
      primaryLabel: isInstalling ? 'Installing…' : 'Install App',
      primaryAction: 'install',
    },

    'install-pending-browser': {
      icon: Download,
      title: 'Install Inventra',
      body: <FeatureList />,
      primaryLabel: isInstalling ? 'Installing…' : 'Install App',
      // Browser supports it but hasn't handed us the native prompt
      // yet — tapping still calls install(); the hook simply no-ops
      // if the event truly never arrives, which is rare and brief.
      primaryAction: 'install',
    },

    'manual-instructions': {
      icon: Smartphone,
      title: 'Install Inventra',
      body: <IosInstructions />,
      primaryLabel: null,
      primaryAction: null,
    },

    unsupported: {
      icon: Ban,
      title: 'Installation not supported',
      body: 'Your current browser doesn\u2019t support installing apps. Try Chrome or Edge for the best experience.',
      primaryLabel: null,
      primaryAction: null,
    },
  };

  return content[uiState];
}

function FeatureList() {
  return (
    <ul className="space-y-1">
      <Feature>Faster access</Feature>
      <Feature>Works like a native app</Feature>
      <Feature>Offline support</Feature>
    </ul>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
      <span className="text-brand-500 font-bold">✓</span>
      {children}
    </li>
  );
}

function IosInstructions() {
  return (
    <p className="text-xs text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-1">
      Tap
      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 mx-0.5">
        <Share size={11} className="text-brand-500" />
      </span>
      then
      <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 mx-0.5">
        <Plus size={11} className="text-brand-500" />
        Add to Home Screen
      </span>
    </p>
  );
}

export default function InstallBanner() {
  const { uiState, install, openApp, dismiss, isDismissed, isInstalling } = useInstallContext();
  const content = useStateContent();
  const visible = uiState !== 'hidden-standalone' && !!content && !isDismissed;

  // Reserve viewport space for the fixed mobile bar via a CSS
  // variable, so existing pages (AuthLayout's centered card,
  // AppLayout's scroll container) can avoid being covered just by
  // adding `padding-bottom: var(--inventra-install-banner-height, 0px)`
  // wherever it matters — without this component needing to know
  // about or edit those layouts directly.
  useEffect(() => {
    const root = document.documentElement;
    if (visible) {
      // ~64px content row + vertical padding + safe-area inset is a
      // safe upper-bound reservation; exact height varies slightly by
      // content state (e.g. iOS instructions wrap to 2 lines).
      root.style.setProperty('--inventra-install-banner-height', '88px');
    } else {
      root.style.removeProperty('--inventra-install-banner-height');
    }
    return () => {
      root.style.removeProperty('--inventra-install-banner-height');
    };
  }, [visible]);

  if (!visible || !content) return null;

  const handlePrimary = () => {
    if (content.primaryAction === 'install') void install();
    else if (content.primaryAction === 'open') openApp();
  };

  const Icon = content.icon;

  return (
    <>
      {/* ── Mobile: fixed bottom bar ── */}
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 inventra-install-slide-up"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 shadow-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {content.title}
              </p>
              <div className="mt-0.5">{content.body}</div>
            </div>
            {content.primaryLabel && content.primaryAction && (
              <button
                onClick={handlePrimary}
                disabled={isInstalling}
                className="flex-shrink-0 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-70
                           text-white text-xs font-semibold px-3.5 py-2 transition-colors whitespace-nowrap"
              >
                {content.primaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Desktop: floating bottom-right card ── */}
      <div className="hidden lg:block fixed bottom-5 right-5 z-40 w-80 inventra-install-fade-in">
        <div className="relative rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-4">
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>

          <div className="flex items-center gap-2.5 mb-2 pr-5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {content.title}
            </p>
          </div>

          <div className="mb-3">{content.body}</div>

          {content.primaryLabel && content.primaryAction && (
            <button
              onClick={handlePrimary}
              disabled={isInstalling}
              className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-70
                         text-white text-sm font-semibold py-2.5 transition-colors"
            >
              {content.primaryLabel}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
