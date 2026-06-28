/**
 * installService.ts
 *
 * The ONLY file that talks to raw browser PWA-install APIs directly:
 * `beforeinstallprompt`, `appinstalled`, `display-mode` media query,
 * `navigator.standalone`, and platform/browser sniffing. Everything
 * else (hooks, context, UI) goes through the functions exported here.
 *
 * Keeping this isolated means swapping detection strategies later
 * (e.g. a future getInstalledRelatedApps() check) only touches this
 * file.
 */

export type Platform = 'ios' | 'android' | 'desktop';

export type BrowserKind =
  | 'chrome'
  | 'edge'
  | 'samsung'
  | 'safari'
  | 'firefox'
  | 'other';

export type InstallCapability =
  /** Native prompt available right now — beforeinstallprompt fired. */
  | 'native-prompt'
  /** Browser supports install, but the deferred prompt hasn't fired yet
   *  (e.g. Chrome's engagement heuristics haven't been met, or the
   *  event fires later in the session). We still show guidance. */
  | 'supported-no-prompt-yet'
  /** iOS Safari / Safari in general — no beforeinstallprompt exists;
   *  guide the user through the manual "Add to Home Screen" share
   *  sheet action instead. */
  | 'manual-only'
  /** Browser genuinely has no install path (e.g. old Firefox desktop). */
  | 'unsupported';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/** True if the app is currently running inside its installed shell. */
export function isRunningStandalone(): boolean {
  const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  // Some Android/Samsung browsers report this display mode instead.
  const minimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
  return standaloneMedia || iosStandalone || minimalUi;
}

export function detectPlatform(): Platform {
  const ua = window.navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as Mac but has touch support.
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function detectBrowser(): BrowserKind {
  const ua = window.navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  if (/Edg\//i.test(ua)) return 'edge';
  if (/CriOS|Chrome/i.test(ua) && !/Edg\//i.test(ua)) return 'chrome';
  if (/Firefox|FxiOS/i.test(ua)) return 'firefox';
  if (/Safari/i.test(ua) && !/Chrome|CriOS|Android/i.test(ua)) return 'safari';
  return 'other';
}

/**
 * Best-effort capability classification, used before
 * `beforeinstallprompt` has necessarily fired. This is what lets the
 * banner show *something* useful (rather than nothing) on first
 * visit, instead of waiting on a browser event that may never come in
 * a given session.
 */
export function classifyCapability(params: {
  platform: Platform;
  browser: BrowserKind;
  hasNativePrompt: boolean;
}): InstallCapability {
  const { platform, browser, hasNativePrompt } = params;

  if (hasNativePrompt) return 'native-prompt';

  // iOS Safari (and iOS Chrome/Firefox, which are just Safari skins
  // without install capability) never fires beforeinstallprompt.
  if (platform === 'ios') return 'manual-only';

  // Chromium-family browsers on Android/desktop support install but
  // may not have fired the event yet this session.
  if (browser === 'chrome' || browser === 'edge' || browser === 'samsung') {
    return 'supported-no-prompt-yet';
  }

  // Firefox desktop/mobile and anything else: no install path today.
  return 'unsupported';
}

/**
 * Attempts to bring focus to an already-installed instance of the app.
 * There is no universal cross-browser API for this — Chrome/Edge have
 * no JS-callable "launch installed app" call from a regular browser
 * tab for security reasons. The practical approach (and what
 * commercial PWAs actually do) is:
 *   1. If a custom-protocol / OS-level handoff isn't available, just
 *      navigate the current tab to the app's origin. If the OS has
 *      registered the installed PWA as the handler for that origin
 *      (common on Windows/Android), this can hand off to the
 *      installed window. Otherwise it simply loads the site normally,
 *      which is a safe, correct fallback.
 */
export function attemptLaunchInstalledApp(originUrl: string = window.location.origin + '/'): void {
  window.location.href = originUrl;
}

/**
 * Best-effort, cross-session check for whether this PWA is already
 * installed, using the Installed Related Apps API. Support is
 * currently limited to Chromium-based browsers (Chrome/Edge on
 * Android and desktop) and requires a self-referencing `webapp` entry
 * in the manifest's `related_applications` (see manifest config) —
 * see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getInstalledRelatedApps.
 *
 * Returns false (not "unknown") when unsupported or the check fails,
 * since the safe default is to fall through to the normal
 * beforeinstallprompt-driven flow rather than block on an unreliable
 * signal.
 */
export async function checkAlreadyInstalledCrossSession(): Promise<boolean> {
  const nav = window.navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<unknown[]>;
  };
  if (typeof nav.getInstalledRelatedApps !== 'function') return false;
  try {
    const related = await nav.getInstalledRelatedApps();
    return related.length > 0;
  } catch {
    return false;
  }
}

/**
 * Thin wrapper for registering the two browser events this module
 * cares about. Returns an unsubscribe function. Isolated here so
 * React effects in the hook stay declarative.
 */
export function subscribeToInstallEvents(handlers: {
  onBeforeInstallPrompt: (e: BeforeInstallPromptEvent) => void;
  onAppInstalled: () => void;
}): () => void {
  const beforeInstallPromptHandler = (e: Event) => {
    e.preventDefault();
    handlers.onBeforeInstallPrompt(e as BeforeInstallPromptEvent);
  };
  const appInstalledHandler = () => handlers.onAppInstalled();

  window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
  window.addEventListener('appinstalled', appInstalledHandler);

  return () => {
    window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
    window.removeEventListener('appinstalled', appInstalledHandler);
  };
}

/**
 * Triggers the captured native prompt. Throws if none is available —
 * callers should only invoke this when capability is 'native-prompt'.
 */
export async function triggerNativePrompt(
  deferredEvent: BeforeInstallPromptEvent
): Promise<'accepted' | 'dismissed'> {
  await deferredEvent.prompt();
  const { outcome } = await deferredEvent.userChoice;
  return outcome;
}

// ---- Dismissal persistence (desktop floating card "reappear after 7 days") ----

const DISMISS_STORAGE_KEY = 'inventra-install-dismissed-at';
const REAPPEAR_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function recordDismissal(): void {
  try {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage can throw in private-browsing contexts; not dismissing
    // persistently is an acceptable degradation, not an error to surface.
  }
}

export function isDismissalStillActive(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt < REAPPEAR_AFTER_MS;
  } catch {
    return false;
  }
}

export function clearDismissal(): void {
  try {
    window.localStorage.removeItem(DISMISS_STORAGE_KEY);
  } catch {
    // No-op — see recordDismissal.
  }
}
