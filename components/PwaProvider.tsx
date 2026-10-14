'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { IosInstallModal } from './IosInstallModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextValue {
  isInstallable: boolean;
  isStandalone: boolean;
  isIos: boolean;
  promptInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue>({
  isInstallable: false,
  isStandalone: false,
  isIos: false,
  promptInstall: async () => {},
});

export function usePwa() {
  return useContext(PwaContext);
}

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  const [dismissedOffline, setDismissedOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);

  useEffect(() => {
    if (isOnline) {
      queueMicrotask(() => {
        setDismissedOffline(false);
      });
    }
  }, [isOnline]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone display mode to suppress install prompt when already running as an installed PWA
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && Boolean((window.navigator as unknown as { standalone?: boolean }).standalone));

    const iosCheck =
      /iPhone|iPad|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;

    queueMicrotask(() => {
      setIsStandalone(standaloneCheck);
      setIsIos(iosCheck);
      if (iosCheck && !standaloneCheck) {
        setIsInstallable(true);
      }
    });

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => {
          console.error('Service worker registration failed:', err);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIos && !isStandalone) {
      setIsIosModalOpen(true);
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isInstallable: isInstallable && !isStandalone,
        isStandalone,
        isIos,
        promptInstall,
      }}
    >
      {!isOnline && !dismissedOffline && (
        <aside
          role="status"
          aria-live="polite"
          className="bg-[#fef3c7] border-b border-[#fcd34d] text-[#92400e] px-4 py-2 text-xs sm:text-sm font-medium sticky top-0 z-50 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-base" aria-hidden="true">⚠️</span>
            <span className="truncate">
              <strong>Offline Mode:</strong> Saved courses are available from local storage. Video playback requires an active internet connection.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDismissedOffline(true)}
            aria-label="Dismiss offline banner"
            className="shrink-0 px-2 py-0.5 text-xs text-[#92400e] hover:bg-[#fde68a] rounded-[6px] transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </aside>
      )}

      {children}

      <IosInstallModal
        isOpen={isIosModalOpen}
        onClose={() => setIsIosModalOpen(false)}
      />
    </PwaContext.Provider>
  );
}
