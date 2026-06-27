/**
 * UpdateDialog.tsx
 *
 * Purely presentational. All state comes from UpdateContext — this
 * component just renders it. Matches Inventra's existing card/brand
 * styling (see AuthLayout.tsx, AppLayout.tsx) rather than introducing
 * a new visual language: rounded-2xl cards, brand-indigo accents,
 * dark-mode aware surfaces.
 */

import { useEffect, useState } from 'react';
import { Sparkles, ShieldCheck, Bug, ArrowRight, Clock } from 'lucide-react';
import { useUpdateContext } from './UpdateContext';
import { APP_VERSION, RELEASE_NOTES } from '../../config/version';

const STEP_MESSAGES = [
  'Downloading latest version...',
  'Installing update...',
  'Restarting application...',
];

// Maps a release-note keyword to an icon, falling back to a generic
// sparkle. Keeps the bullet list visually rich without requiring
// authors to hand-pick icons in version.ts.
function noteIcon(note: string) {
  const lower = note.toLowerCase();
  if (lower.includes('secur')) return ShieldCheck;
  if (lower.includes('bug') || lower.includes('fix')) return Bug;
  return Sparkles;
}

export default function UpdateDialog() {
  const { isDialogOpen, status, updateNow, closeDialog } = useUpdateContext();
  const [stepIndex, setStepIndex] = useState(0);
  const updating = status === 'updating';

  // Cycle through the "Updating... / Downloading... / Installing..."
  // copy while the reload is pending, purely for perceived progress —
  // there's no real multi-stage async work happening client side.
  useEffect(() => {
    if (!updating) {
      setStepIndex(0);
      return;
    }
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEP_MESSAGES.length - 1));
    }, 700);
    return () => clearInterval(id);
  }, [updating]);

  if (!isDialogOpen) return null;

  const handleUpdate = () => {
    void updateNow();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 inventra-update-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
        onClick={updating ? undefined : closeDialog}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900
                   border border-gray-200 dark:border-gray-800 shadow-2xl
                   p-6 inventra-update-card"
      >
        {updating ? (
          <UpdatingState message={STEP_MESSAGES[stepIndex]} />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2
                  id="update-dialog-title"
                  className="text-base font-bold text-gray-900 dark:text-white tracking-tight"
                >
                  Inventra ERP
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Version {APP_VERSION} available
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              A new version of Inventra is available with the following improvements:
            </p>

            {/* Release notes */}
            <ul className="space-y-2 mb-6">
              {RELEASE_NOTES.map((note) => {
                const Icon = noteIcon(note);
                return (
                  <li
                    key={note}
                    className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <Icon size={14} className="text-brand-500 flex-shrink-0" />
                    {note}
                  </li>
                );
              })}
            </ul>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={closeDialog}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5
                           text-sm font-medium text-gray-600 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Clock size={14} />
                Later
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5
                           text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700
                           transition-colors shadow-sm"
              >
                Update Now
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UpdatingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center mb-4 relative">
        <Sparkles size={20} className="text-white" />
        <span className="absolute inset-0 rounded-xl border-2 border-brand-400 animate-ping" />
      </div>
      <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
        Updating Inventra...
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 transition-opacity">{message}</p>

      {/* Indeterminate progress bar */}
      <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mt-5">
        <div className="h-full w-1/3 rounded-full bg-brand-600 inventra-update-progress-bar" />
      </div>
    </div>
  );
}
