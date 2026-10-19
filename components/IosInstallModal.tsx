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
        className="w-full sm:max-w-md bg-[#fafaf9] border border-[#e7e5e4] rounded-t-[20px] sm:rounded-[16px] shadow-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#e7e5e4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[#0d5c46] text-white flex items-center justify-center font-bold text-sm shadow-xs" aria-hidden="true">
              yt
            </div>
            <div>
              <h2 id="ios-modal-title" className="text-base font-semibold text-[#1c1917] leading-tight">
                Install on iOS
              </h2>
              <p className="text-xs text-[#57534e]">Add ytChaptered to your home screen</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close iOS installation instructions dialog"
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#57534e] hover:text-[#1c1917] hover:bg-[#e7e5e4] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <ol className="space-y-3.5 text-xs sm:text-sm text-[#1c1917]" aria-label="iOS installation steps">
          <li className="flex items-start gap-3 p-3 bg-[#ffffff] border border-[#e7e5e4] rounded-[10px]">
            <span className="w-6 h-6 rounded-full bg-[#f5f5f4] text-[#1c1917] flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
              1
            </span>
            <p className="leading-relaxed">
              In Safari, tap the <strong>Share</strong> button (the square with an arrow pointing upward) in the browser toolbar.
            </p>
          </li>

          <li className="flex items-start gap-3 p-3 bg-[#ffffff] border border-[#e7e5e4] rounded-[10px]">
            <span className="w-6 h-6 rounded-full bg-[#f5f5f4] text-[#1c1917] flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
              2
            </span>
            <p className="leading-relaxed">
              Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.
            </p>
          </li>

          <li className="flex items-start gap-3 p-3 bg-[#ffffff] border border-[#e7e5e4] rounded-[10px]">
            <span className="w-6 h-6 rounded-full bg-[#f5f5f4] text-[#1c1917] flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
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
          className="w-full mt-1 py-2.5 bg-[#0d5c46] hover:bg-[#0a4635] text-white font-medium text-xs sm:text-sm rounded-[10px] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
