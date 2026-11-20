import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-amber-700/30 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Install App
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 whitespace-nowrap shrink-0 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <Smartphone className="h-4 w-4" aria-hidden="true" />
        {isIOS ? 'Install on iOS' : 'Install App'}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <h3 id="pwa-guide-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Install Memory Meals
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {isIOS ? (
              <ol className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <li>1. Tap the <strong>Share</strong> icon in your Safari toolbar.</li>
                <li>2. Scroll down and select <strong>Add to Home Screen</strong>.</li>
                <li>3. Tap <strong>Add</strong> to open Memory Meals as a standalone app.</li>
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Open your browser menu (three dots in Chrome or Edge) and choose{' '}
                <strong>Install Memory Meals</strong> or <strong>Add to Home screen</strong> for
                one-tap hostel ordering and offline menu browsing.
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 min-h-[44px] w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-600 dark:hover:bg-amber-500"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-700/30 bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg md:bottom-4"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Offline — Cached menu active; edits sync when back online.</span>
    </div>
  );
};
