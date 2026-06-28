/**
 * useInstallManager.ts
 *
 * React-facing hook around `installService`. Owns no UI — just state
 * and actions. `InstallContext` consumes this hook so that banner
 * components stay purely presentational.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  attemptLaunchInstalledApp,
  checkAlreadyInstalledCrossSession,
  classifyCapability,
  clearDismissal,
  detectBrowser,
  detectPlatform,
  isDismissalStillActive,
  isRunningStandalone,
  recordDismissal,
  subscribeToInstallEvents,
  triggerNativePrompt,
  type BeforeInstallPromptEvent,
  type BrowserKind,
  type InstallCapability,
  type Platform,
} from '../services/installService';

export type InstallUiState =
  /** Running inside the installed shell right now — show nothing. */
  | 'hidden-standalone'
  /** Already installed, but viewing from a regular browser tab. */
  | 'already-installed'
  /** Native prompt is ready to fire on tap. */
  | 'can-install'
  /** Chromium-family browser, prompt hasn't fired yet this session —
   *  still show the banner with platform guidance instead of nothing. */
  | 'install-pending-browser'
  /** iOS Safari — guide through manual Add to Home Screen. */
  | 'manual-instructions'
  /** No install path on this browser at all. */
  | 'unsupported';

export interface UseInstallManagerResult {
  uiState: InstallUiState;
  platform: Platform;
  browser: BrowserKind;
  capability: InstallCapability;
  /** True only right after the user successfully installs, for a one-time toast/confirmation. */
  justInstalled: boolean;
  isInstalling: boolean;
  /** Triggers native install prompt if available, else no-ops (UI should route to instructions instead). */
  install: () => Promise<void>;
  /** Best-effort attempt to focus/open the already-installed app. */
  openApp: () => void;
  /** User dismissed the desktop floating card; reappears after 7 days. */
  dismiss: () => void;
  /** True if the banner should currently be hidden due to a recent dismissal. */
  isDismissed: boolean;
}

export function useInstallManager(): UseInstallManagerResult {
  const [standalone, setStandalone] = useState<boolean>(() => isRunningStandalone());
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [knownInstalled, setKnownInstalled] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(() => isDismissalStillActive());

  const platform = useRef(detectPlatform()).current;
  const browser = useRef(detectBrowser()).current;

  useEffect(() => {
    if (standalone) return; // Don't bother wiring listeners once standalone.

    const unsubscribe = subscribeToInstallEvents({
      onBeforeInstallPrompt: (e) => setDeferredEvent(e),
      onAppInstalled: () => {
        setKnownInstalled(true);
        setJustInstalled(true);
        setDeferredEvent(null);
        clearDismissal();
      },
    });

    return unsubscribe;
  }, [standalone]);

  // Best-effort cross-session check (Chromium-only today) — catches
  // the case where the app was installed in a *previous* session and
  // the user is now back in a regular browser tab, which the
  // `appinstalled` event alone can't tell us about.
  useEffect(() => {
    if (standalone) return;
    let cancelled = false;
    checkAlreadyInstalledCrossSession().then((isInstalled) => {
      if (!cancelled && isInstalled) setKnownInstalled(true);
    });
    return () => {
      cancelled = true;
    };
  }, [standalone]);

  // Re-check standalone status on visibility change — covers the case
  // where a user installs, then returns to the original browser tab.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setStandalone(isRunningStandalone());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const capability = classifyCapability({
    platform,
    browser,
    hasNativePrompt: deferredEvent !== null,
  });

  const uiState: InstallUiState = (() => {
    if (standalone) return 'hidden-standalone';
    if (knownInstalled) return 'already-installed';
    switch (capability) {
      case 'native-prompt':
        return 'can-install';
      case 'supported-no-prompt-yet':
        return 'install-pending-browser';
      case 'manual-only':
        return 'manual-instructions';
      case 'unsupported':
        return 'unsupported';
    }
  })();

  const install = useCallback(async () => {
    if (!deferredEvent) return; // UI should not call this outside 'can-install'.
    setIsInstalling(true);
    try {
      const outcome = await triggerNativePrompt(deferredEvent);
      if (outcome === 'accepted') {
        setJustInstalled(true);
        setKnownInstalled(true);
      }
    } finally {
      setDeferredEvent(null);
      setIsInstalling(false);
    }
  }, [deferredEvent]);

  const openApp = useCallback(() => {
    attemptLaunchInstalledApp();
  }, []);

  const dismiss = useCallback(() => {
    recordDismissal();
    setIsDismissed(true);
  }, []);

  return {
    uiState,
    platform,
    browser,
    capability,
    justInstalled,
    isInstalling,
    install,
    openApp,
    dismiss,
    isDismissed,
  };
}
