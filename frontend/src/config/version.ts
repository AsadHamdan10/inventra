/**
 * Centralized version configuration for Inventra ERP.
 *
 * Bump APP_VERSION on every release that you want the update dialog
 * to be able to display as the "latest version" label. The actual
 * update *detection* is driven by the service worker (a new SW build
 * always means new content), but this human-readable string is what
 * gets shown in the UI — the update dialog, Company Profile, etc.
 *
 * Keep RELEASE_NOTES short — a handful of bullet points max. This is
 * surfaced directly in the update dialog.
 */

export const APP_VERSION = '1.0.6';

export const RELEASE_NOTES: string[] = [
  'Performance improvements',
  'Security improvements',
  'Bug fixes',
];

/**
 * Build metadata, useful for support/debugging (e.g. shown in
 * Company Profile > About). Vite replaces these at build time.
 */
export const BUILD_TIME = __APP_BUILD_TIME__;
