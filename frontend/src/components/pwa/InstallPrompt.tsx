import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Sidebar install button for Inventra ERP.
 *
 * - Listens for the browser's `beforeinstallprompt` event (Chrome/Edge/Android).
 * - Renders nothing until that event fires, and disappears permanently once
 *   the app is installed (checked both via `appinstalled` and the
 *   `display-mode: standalone` media query, so a refreshed/installed window
 *   never shows the button again).
 * - iOS Safari never fires `beforeinstallprompt`, so this component is
 *   intentionally invisible there — iOS users install via the native
 *   "Add to Home Screen" share-sheet action instead, which can't be triggered
 *   programmatically. If you want an iOS nudge, that's a separate, simple
 *   "tap Share → Add to Home Screen" banner — happy to add it, just say the word.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already running as an installed app? Don't bother wiring anything up.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
    console.log("✅ beforeinstallprompt fired");

    e.preventDefault();

    setDeferredPrompt(e as BeforeInstallPromptEvent);
};

    const handleAppInstalled = () => {
    console.log("✅ App Installed");

    setInstalled(true);
    setDeferredPrompt(null);
};

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
  console.log("Install button clicked");

  if (!deferredPrompt) {
    console.log("No deferred prompt available");
    return;
  }

  try {
    console.log("Calling prompt...");

    await deferredPrompt.prompt();

    const result = await deferredPrompt.userChoice;

    console.log("User choice:", result);

    if (result.outcome === "accepted") {
      toast.success("Inventra installed successfully.");
      setInstalled(true);
    } else {
      toast("Installation cancelled.");
    }
  } catch (err) {
    console.error("Install error:", err);
  } finally {
    setDeferredPrompt(null);
  }
};
  console.log({
  installed,
  deferredPrompt,
});

if (installed || !deferredPrompt) return null;

  return (
    <button
      onClick={handleInstallClick}
      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-brand-400 transition-colors"
      title="Install Inventra as an app"
    >
      <Download size={13} className="flex-shrink-0" />
      Install Inventra
    </button>
  );
}

/**
 * Optional dismissible variant, if you'd rather show this as a small banner
 * above the user footer instead of a plain inline button. Not wired up by
 * default — swap it in to AppLayout.tsx only if you prefer the look.
 */
export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
  console.log("beforeinstallprompt fired");

  e.preventDefault();

  setDeferredPrompt(e as BeforeInstallPromptEvent);

  console.log("Prompt saved");
};
    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <div className="flex items-center gap-2 bg-brand-900/40 border border-brand-800 rounded-lg px-3 py-2 mx-1 mb-2">
      <Download size={14} className="text-brand-400 flex-shrink-0" />
      <span className="text-xs text-gray-300 flex-1">Install Inventra for quick access</span>
      <button
      onClick={handleInstallClick}
      aria-label="Install Inventra ERP"
        className="text-xs font-semibold text-brand-400 hover:text-brand-300 px-2"
      >
        Install
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-gray-500 hover:text-gray-300"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}