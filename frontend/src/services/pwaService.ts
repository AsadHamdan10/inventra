/**
 * pwaService.ts
 *
 * The ONLY file in the codebase that talks to `virtual:pwa-register`
 * directly. Everything else (hooks, context, UI) goes through the
 * functions exported here. This keeps service-worker mechanics fully
 * isolated from business/UI code, so future changes (e.g. swapping
 * vite-plugin-pwa for a hand-rolled SW, adding background sync, etc.)
 * only ever touch this one file.
 */

import { registerSW } from 'virtual:pwa-register';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'update-available'
  | 'updating'
  | 'offline-ready'
  | 'error';

export interface PwaServiceCallbacks {
  /** A new version has been built and is waiting to take over. */
  onNeedRefresh?: () => void;
  /** First install finished precaching; app now works offline. */
  onOfflineReady?: () => void;
  /** Registration succeeded; fires roughly every check interval. */
  onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
  /** Registration itself failed (e.g. SW script errored). */
  onRegisterError?: (error: unknown) => void;
}

let updateSWRef: ((reloadPage?: boolean) => Promise<void>) | null = null;
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Registers the service worker exactly once for the app's lifetime and
 * wires up the lifecycle callbacks. Safe to call multiple times — only
 * the first registration takes effect.
 *
 * `immediate: true` matches the previous behavior (register on load
 * rather than waiting for the page to be fully idle).
 */
export function initPwaService(callbacks: PwaServiceCallbacks): void {
  if (updateSWRef) return; // already registered

  updateSWRef = registerSW({
    immediate: true,

    onNeedRefresh() {
      callbacks.onNeedRefresh?.();
    },

    onOfflineReady() {
      callbacks.onOfflineReady?.();
    },

    onRegisteredSW(swUrl, registration) {
      callbacks.onRegisteredSW?.(swUrl, registration);
      startUpdateChecks(registration);
    },

    onRegisterError(error) {
      callbacks.onRegisterError?.(error);
    },
  });
}

/**
 * Periodically asks the browser to re-fetch sw.js and compare bytes,
 * which is what actually triggers `onNeedRefresh` when a new
 * deployment has gone out. Without this, updates are only detected on
 * a full navigation, which an installed PWA may rarely do.
 *
 * Every 60s is a safe default for a business app — frequent enough
 * that updates surface within a session, infrequent enough to not
 * waste bandwidth or battery.
 */
function startUpdateChecks(registration: ServiceWorkerRegistration | undefined, intervalMs = 60_000) {
  if (!registration || pollIntervalId) return;

  pollIntervalId = setInterval(() => {
    // Don't bother checking if the tab isn't visible — saves a
    // network request and avoids surprising the user with a popup
    // for a tab they're not looking at.
    if (document.visibilityState !== 'visible') return;
    registration.update().catch(() => {
      // Network hiccups here are expected (offline, flaky connection)
      // and not actionable — the next interval will retry.
    });
  }, intervalMs);
}

export function stopUpdateChecks(): void {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

/**
 * Activates the waiting service worker and reloads the page once it
 * has taken control. Resolves after the reload has been triggered —
 * callers should treat resolution as "about to navigate away", not
 * "update finished", since the page itself is about to tear down.
 */
export async function applyUpdate(): Promise<void> {
  if (!updateSWRef) {
    throw new Error('pwaService: cannot apply update before registration.');
  }
  await updateSWRef(true);
}

/** True once the SW module has registered at least once. */
export function isPwaServiceReady(): boolean {
  return updateSWRef !== null;
}
