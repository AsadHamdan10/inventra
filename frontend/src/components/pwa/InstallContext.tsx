/**
 * InstallContext.tsx
 *
 * Single global source of truth for install UI state, so the banner
 * can be mounted once near the root (see App.tsx) and reflect the
 * same state regardless of which page is currently rendered —
 * including the login/register pages, per the spec ("mobile users
 * should always see the install section, even on the Login page").
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useInstallManager, type UseInstallManagerResult } from '../../hooks/useInstallManager';

const InstallContext = createContext<UseInstallManagerResult | null>(null);

export function InstallProvider({ children }: { children: ReactNode }) {
  const installManager = useInstallManager();
  return <InstallContext.Provider value={installManager}>{children}</InstallContext.Provider>;
}

export function useInstallContext(): UseInstallManagerResult {
  const ctx = useContext(InstallContext);
  if (!ctx) {
    throw new Error('useInstallContext must be used within an <InstallProvider>.');
  }
  return ctx;
}
