'use client';

import React, { useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Download, X } from 'lucide-react';
import { usePwa } from './PwaProvider';

const DISMISS_KEY = 'yt_install_banner_dismissed_until';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours dismissal cooldown

const listeners = new Set<() => void>();

function notifyDismissListeners() {
  listeners.forEach((listener) => listener());
}

function subscribeDismiss(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getDismissSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    return Boolean(val && Number(val) > Date.now());
  } catch {
    return false;
  }
}

function getDismissServerSnapshot(): boolean {
  return true;
}

export function InstallBanner() {
  const { isInstallable, promptInstall } = usePwa();
  const isDismissed = useSyncExternalStore(
    subscribeDismiss,
    getDismissSnapshot,
    getDismissServerSnapshot
  );

  if (!isInstallable || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS));
    } catch {
      // Ignore localStorage unavailability
    }
    notifyDismissListeners();
  };

  const handleInstall = async () => {
    await promptInstall();
    handleDismiss();
  };

  return (
    <aside
      aria-label="Install app prompt"
      className="fixed z-40 bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 rounded-2xl p-4 shadow-xl animate-in slide-in-from-bottom-3 duration-200 transition-all touch-manipulation"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 relative rounded-lg overflow-hidden shrink-0 shadow-2xs border border-stone-200/50 dark:border-stone-700/50" aria-hidden="true">
          <Image
            src="/logo.svg"
            alt=""
            fill
            className="object-contain"
          />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight truncate">
              Install ytChaptered
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="w-6 h-6 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 active:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 dark:active:bg-stone-700 flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">
            Install on your device for standalone distraction-free learning and instant access.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleInstall}
              aria-label="Install ytChaptered app"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary-hover active:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Install App</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt for now"
              className="px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors cursor-pointer touch-manipulation focus:outline-none focus:ring-1 focus:ring-primary rounded"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
