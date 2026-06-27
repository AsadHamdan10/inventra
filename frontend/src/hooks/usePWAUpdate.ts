/**
 * usePWAUpdate.ts
 *
 * React-facing hook around `pwaService`. Owns no UI — just state and
 * actions. `UpdateContext` consumes this hook so that the dialog
 * component can stay purely presentational.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { initPwaService, applyUpdate, type UpdateStatus } from '../services/pwaService';

export interface UsePWAUpdateResult {
  /** A new version has been detected and is ready to install. */
  needRefresh: boolean;
  /** App finished precaching and can now run fully offline. */
  offlineReady: boolean;
  /** Current high-level status, useful for driving loading UI. */
  status: UpdateStatus;
  /** Activates the waiting SW and reloads the app onto the new version. */
  updateNow: () => Promise<void>;
  /** Dismisses the offline-ready toast/banner without affecting needRefresh. */
  dismissOfflineReady: () => void;
}

export function usePWAUpdate(): UsePWAUpdateResult {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [status, setStatus] = useState<UpdateStatus>('idle');

  // Guards against double-registration under StrictMode's
  // mount -> unmount -> mount dev cycle.
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setStatus('checking');

    initPwaService({
      onNeedRefresh: () => {
        setNeedRefresh(true);
        setStatus('update-available');
      },
      onOfflineReady: () => {
        setOfflineReady(true);
        setStatus((prev) => (prev === 'update-available' ? prev : 'offline-ready'));
      },
      onRegisterError: () => {
        setStatus('error');
      },
    });
  }, []);

  const updateNow = useCallback(async () => {
    setStatus('updating');
    try {
      await applyUpdate();
      // No further state updates here on purpose — applyUpdate triggers
      // a full page reload, so this component tree is about to unmount.
    } catch (err) {
      console.error('Inventra update failed:', err);
      setStatus('error');
      throw err;
    }
  }, []);

  const dismissOfflineReady = useCallback(() => {
    setOfflineReady(false);
  }, []);

  return { needRefresh, offlineReady, status, updateNow, dismissOfflineReady };
}
