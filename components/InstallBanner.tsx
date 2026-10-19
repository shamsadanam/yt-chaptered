'use client';

import React, { useSyncExternalStore } from 'react';
import Image from 'next/image';
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
      className="fixed z-40 bottom-16 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md bg-[#ffffff] border border-[#e7e5e4] rounded-[16px] p-4 shadow-xl animate-in slide-in-from-bottom-3 duration-200 transition-all touch-manipulation"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 relative rounded-[10px] overflow-hidden shrink-0 shadow-2xs border border-[#e7e5e4]/50" aria-hidden="true">
          <Image
            src="/logo.svg"
            alt=""
            fill
            className="object-contain"
          />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#1c1917] tracking-tight truncate">
              Install ytChaptered
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="w-6 h-6 rounded-[6px] text-[#78716c] hover:text-[#1c1917] hover:bg-[#f5f5f4] active:bg-[#e7e5e4] flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-1 focus:ring-[#0d5c46]"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
          <p className="text-xs text-[#57534e] mt-0.5 leading-relaxed">
            Install on your device for standalone distraction-free learning and instant access.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleInstall}
              aria-label="Install ytChaptered app"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#0d5c46] hover:bg-[#0a4635] active:bg-[#0a4635] text-white text-xs font-semibold rounded-[8px] transition-colors cursor-pointer shadow-2xs touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Install App</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt for now"
              className="px-2.5 py-1.5 text-xs font-medium text-[#57534e] hover:text-[#1c1917] transition-colors cursor-pointer touch-manipulation focus:outline-none focus:ring-1 focus:ring-[#0d5c46] rounded"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
