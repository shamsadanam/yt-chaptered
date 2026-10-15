'use client';

import { useEffect, useRef } from 'react';
import { usePwa } from './PwaProvider';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { isInstallable, promptInstall } = usePwa();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full sm:max-w-xl bg-[#fafaf9] border border-[#e7e5e4] rounded-t-[20px] sm:rounded-[16px] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e5e4] bg-[#ffffff]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[#0d5c46] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              yt
            </div>
            <div>
              <h2 id="about-modal-title" className="text-base font-semibold text-[#1c1917] leading-tight">
                About ytChaptered
              </h2>
              <p className="text-xs text-[#57534e]">Local-first YouTube course playlist creator</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f5f4] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Creator Profile Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[#ffffff] p-4 rounded-[12px] border border-[#e7e5e4]">
            <div className="w-14 h-14 rounded-full bg-[#0d5c46]/10 border border-[#0d5c46]/20 flex items-center justify-center text-[#0d5c46] font-bold text-xl shrink-0">
              SA
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#1c1917]">Shamsad Anam</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#0d5c46]/10 text-[#0d5c46]">
                  Made By
                </span>
              </div>
              <p className="text-xs text-[#57534e] mt-1 leading-relaxed">
                Full-stack developer building thoughtful local-first tools and productive web experiences.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <a
                  href="https://github.com/shamsadanam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1c1917] hover:text-[#0d5c46] transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>@shamsadanam</span>
                </a>
              </div>
            </div>
          </div>

          {/* Motivation & About ytChaptered */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#57534e]">Why ytChaptered?</h4>
            <p className="text-xs sm:text-sm text-[#1c1917] leading-relaxed">
              Long-form tutorials on YouTube are incredible learning resources, but navigating them with standard players is messy. <strong className="font-semibold text-[#0d5c46]">ytChaptered</strong> transforms timestamped videos into structured interactive courses with auto-advancing, completion tracking, and private browser-only storage.
            </p>
          </div>

          {/* GitHub Star Banner */}
          <div className="p-4 rounded-[12px] bg-[#0d5c46]/5 border border-[#0d5c46]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-[#1c1917] flex items-center gap-1.5">
                <span>⭐</span> Star the repository on GitHub
              </p>
              <p className="text-xs text-[#57534e] mt-0.5">
                Support the project, file issues, or contribute features.
              </p>
            </div>
            <a
              href="https://github.com/shamsadanam/yt-chaptered"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0d5c46] hover:bg-[#0a4635] active:bg-[#0a4635] rounded-[8px] transition-colors shrink-0 shadow-xs"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Star on GitHub</span>
            </a>
          </div>

          {/* Install App Section */}
          {isInstallable && (
            <div className="p-3.5 bg-[#f5f5f4] rounded-[10px] border border-[#e7e5e4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-[#1c1917] text-xs sm:text-sm block">
                  Install ytChaptered
                </span>
                <span className="text-[#57534e] text-[11px] sm:text-xs block mt-0.5">
                  Launch full screen like a native app with quick access to your courses and saved progress.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  promptInstall();
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0d5c46] hover:bg-[#0a4635] active:bg-[#0a4635] rounded-[8px] transition-colors shrink-0 shadow-xs cursor-pointer min-h-[36px]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Install App</span>
              </button>
            </div>
          )}

          {/* Tech Stack & Privacy */}
          <div className="pt-2 border-t border-[#e7e5e4] grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#ffffff] p-3 rounded-[8px] border border-[#e7e5e4]">
              <span className="font-semibold text-[#1c1917] block">Local-First</span>
              <span className="text-[#57534e] text-[11px] mt-0.5 block">Stored in browser IndexedDB. Zero cloud tracking.</span>
            </div>
            <div className="bg-[#ffffff] p-3 rounded-[8px] border border-[#e7e5e4]">
              <span className="font-semibold text-[#1c1917] block">Built With</span>
              <span className="text-[#57534e] text-[11px] mt-0.5 block">Next.js 16, React 19, Tailwind CSS v4.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e7e5e4] bg-[#fafaf9] flex items-center justify-between text-xs text-[#57534e]">
          <span>ytChaptered v0.1.0</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 font-medium text-[#1c1917] hover:bg-[#f5f5f4] rounded-[6px] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
