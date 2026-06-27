/**
 * UpdateContext.tsx
 *
 * Single source of truth for "is there an update, and should the
 * dialog be open right now". Mount <UpdateProvider> once, near the
 * root (see App.tsx). Any component can then call useUpdateContext()
 * to read status or trigger an update — but in practice only
 * <UpdateDialog /> needs to.
 */

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react';
import { usePWAUpdate, type UsePWAUpdateResult } from '../../hooks/usePWAUpdate';

interface UpdateContextValue extends UsePWAUpdateResult {
  /** Whether the update dialog should currently be rendered open. */
  isDialogOpen: boolean;
  /** User clicked "Later" — hide the dialog, keep needRefresh true so it can be re-opened. */
  closeDialog: () => void;
  /** Re-open a dialog the user previously dismissed with "Later". */
  reopenDialog: () => void;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const pwaUpdate = usePWAUpdate();
  const [dismissed, setDismissed] = useState(false);

  const closeDialog = useCallback(() => setDismissed(true), []);
  const reopenDialog = useCallback(() => setDismissed(false), []);

  // The dialog opens automatically the moment an update is detected,
  // unless the user has already said "Later" for this particular
  // update. If a *new* update arrives after that, needRefresh briefly
  // goes false->true again in practice only once per SW lifecycle, so
  // this is intentionally simple rather than tracking update "ids".
  const isDialogOpen = pwaUpdate.needRefresh && !dismissed;

  const value = useMemo<UpdateContextValue>(
    () => ({
      ...pwaUpdate,
      isDialogOpen,
      closeDialog,
      reopenDialog,
    }),
    [pwaUpdate, isDialogOpen, closeDialog, reopenDialog]
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdateContext(): UpdateContextValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) {
    throw new Error('useUpdateContext must be used within an <UpdateProvider>.');
  }
  return ctx;
}
