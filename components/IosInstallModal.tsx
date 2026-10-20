'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IosInstallModal({ isOpen, onClose }: IosInstallModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full sm:max-w-md bg-stone-50 border border-stone-200 dark:bg-stone-900 dark:border-stone-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs" aria-hidden="true">
              yt
            </div>
            <div>
              <h2 id="ios-modal-title" className="text-base font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                Install on iOS
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">Add ytChaptered to your home screen</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close iOS installation instructions dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-200 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <ol className="space-y-3.5 text-xs sm:text-sm text-stone-900 dark:text-stone-100" aria-label="iOS installation steps">
          <li className="flex items-start gap-3 p-3 bg-white border border-stone-200 dark:bg-stone-950 dark:border-stone-800 rounded-lg">
            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
              1
            </span>
            <p className="leading-relaxed">
              In Safari, tap the <strong>Share</strong> button (the square with an arrow pointing upward) in the browser toolbar.
            </p>
          </li>

          <li className="flex items-start gap-3 p-3 bg-white border border-stone-200 dark:bg-stone-950 dark:border-stone-800 rounded-lg">
            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
              2
            </span>
            <p className="leading-relaxed">
              Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.
            </p>
          </li>

          <li className="flex items-start gap-3 p-3 bg-white border border-stone-200 dark:bg-stone-950 dark:border-stone-800 rounded-lg">
            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100 flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
              3
            </span>
            <p className="leading-relaxed">
              Tap <strong>Add</strong> in the top right corner to launch it full screen like a native app.
            </p>
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-1 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium text-xs sm:text-sm rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
