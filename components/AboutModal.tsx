'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Download, Star, ShieldCheck, ListVideo, ArrowUpDown } from 'lucide-react';
import { usePwa } from './PwaProvider';
import { useScrollLock } from '../hooks/useScrollLock';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const { isInstallable, promptInstall } = usePwa();

  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  if (isOpen && !isRendered) {
    setIsRendered(true);
  }

  // Smooth opening and closing animation coordination
  useEffect(() => {
    if (isOpen) {
      const frameId = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      const frameId = requestAnimationFrame(() => {
        setIsVisible(false);
      });
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 200);
      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  const handleRequestClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useScrollLock(isRendered);

  useEffect(() => {
    if (!isRendered) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Shift focus into dialog upon open
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 80);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleRequestClose();
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

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isRendered, handleRequestClose]);

  if (!isRendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200 ease-out pr-scrollbar-compensation ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleRequestClose();
      }}
    >
      <div
        ref={modalRef}
        className={`w-full sm:max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-modal flex flex-col overflow-hidden transition-all duration-200 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 sm:scale-100'
            : 'opacity-0 translate-y-6 sm:translate-y-2 sm:scale-95'
        }`}
      >
        {/* Header / Hero */}
        <div className="relative pt-6 px-6 pb-2 text-center">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleRequestClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Centered App Mark */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl relative overflow-hidden shadow-xs mb-3">
            <Image
              src="/logo.svg"
              alt="ytChaptered logo"
              fill
              priority
              className="object-contain"
            />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 id="about-modal-title" className="text-lg font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              ytChaptered
            </h2>
            <span className="text-2xs font-mono font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
              v0.1.0
            </span>
          </div>

          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
            Turn timestamped YouTube tutorials into distraction-free, structured courses.
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto overscroll-contain">
          {/* Feature Pillars */}
          <div className="space-y-4 divide-y divide-stone-100 dark:divide-stone-800/80">
            <div className="flex items-start gap-3.5 pt-1 first:pt-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-emerald-950/40 text-primary dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Local-First & Private
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">
                  All courses and bookmarks stay in your browser’s IndexedDB. Zero tracking, zero ads, no accounts required.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-3.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-emerald-950/40 text-primary dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <ListVideo className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Structured Learning Flow
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">
                  Automatic chapter advancement, precise playback position memory, and checkmark completion tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-3.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-emerald-950/40 text-primary dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <ArrowUpDown className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Full Data Portability
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-relaxed">
                  Export and import your entire learning library as clean JSON anytime across all devices.
                </p>
              </div>
            </div>
          </div>

          {/* Conditional PWA Banner */}
          {isInstallable && (
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs block">
                  Install Desktop / Mobile App
                </span>
                <span className="text-stone-600 dark:text-stone-400 text-2xs block mt-0.5 truncate">
                  Standalone fullscreen window with quick launch access
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleRequestClose();
                  promptInstall();
                }}
                aria-label="Install ytChaptered app"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover active:bg-primary-hover rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer min-h-8 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Install</span>
              </button>
            </div>
          )}

          {/* Tech Badges */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-2xs text-stone-500 dark:text-stone-400">
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
              Next.js 16
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
              React 19
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
              Tailwind CSS v4
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800/70 border border-stone-200 dark:border-stone-800">
              IndexedDB
            </span>
          </div>
        </div>

        {/* Footer with Creator Credit and Actions */}
        <div className="px-6 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
            <span>Crafted by</span>
            <a
              href="https://github.com/shamsadanam"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-stone-800 dark:text-stone-200 hover:text-primary dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Shamsad Anam</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/shamsadanam/yt-chaptered"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-md transition-colors shadow-xs"
            >
              <Star className="w-3 h-3 fill-amber-400 text-amber-500" aria-hidden="true" />
              <span>Star on GitHub</span>
            </a>
            <button
              type="button"
              onClick={handleRequestClose}
              aria-label="Close dialog"
              className="px-3 py-1 font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
