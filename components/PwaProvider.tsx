'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);

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
      {children}

      <IosInstallModal
        isOpen={isIosModalOpen}
        onClose={() => setIsIosModalOpen(false)}
      />
    </PwaContext.Provider>
  );
}
