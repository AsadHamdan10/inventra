/**
 * AppVersionInfo.tsx
 *
 * Drop this into Company Profile / Settings / "About Inventra" to show
 * the current installed version and build time. Pulls from the same
 * centralized src/config/version.ts used by the update dialog, so
 * there's only ever one place to bump the version number.
 *
 * Usage:
 *   import AppVersionInfo from '../../components/pwa/AppVersionInfo';
 *   ...
 *   <AppVersionInfo />
 */

import { Info } from 'lucide-react';
import { APP_VERSION, BUILD_TIME } from '../../config/version';

export default function AppVersionInfo() {
  const buildDate = new Date(BUILD_TIME).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <Info size={14} className="flex-shrink-0" />
      <span>
        Inventra ERP <span className="font-semibold text-gray-700 dark:text-gray-300">v{APP_VERSION}</span>
        {' '}· Built {buildDate}
      </span>
    </div>
  );
}
