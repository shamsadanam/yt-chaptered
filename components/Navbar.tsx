'use client';

import Image from 'next/image';
import { usePwa } from './PwaProvider';

interface NavbarProps {
  onReset?: () => void;
  showReset?: boolean;
  videoTitle?: string;
  onOpenAbout?: () => void;
}

export function Navbar({ onReset, showReset, videoTitle, onOpenAbout }: NavbarProps) {
  const { isInstallable, promptInstall } = usePwa();

  return (
    <header className="w-full border-b border-[#e7e5e4] bg-[#fafaf9]/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 relative rounded-[10px] sm:rounded-[12px] overflow-hidden shrink-0 shadow-xs">
            <Image
              src="/logo.svg"
              alt="ytChaptered logo"
              fill
              priority
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-[#1c1917] text-base sm:text-lg tracking-tight block truncate">
              ytChaptered
            </span>
            {videoTitle && (
              <span className="text-[11px] sm:text-xs text-[#57534e] truncate block max-w-[160px] xs:max-w-[220px] sm:max-w-md md:max-w-xl">
                {videoTitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Native PWA Install Button */}
          {isInstallable && (
            <button
              type="button"
              onClick={promptInstall}
              title="Install ytChaptered app"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#0d5c46] hover:bg-[#0a4635] active:bg-[#0a4635] rounded-[10px] sm:rounded-[12px] shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#0d5c46] min-h-[40px] sm:min-h-[44px] touch-manipulation cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Install</span>
            </button>
          )}

          <a
            href="https://github.com/shamsadanam/yt-chaptered"
            target="_blank"
            rel="noopener noreferrer"
            title="ytChaptered on GitHub"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#1c1917] bg-[#ffffff] hover:bg-[#f5f5f4] active:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[10px] sm:rounded-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0d5c46] min-h-[40px] sm:min-h-[44px] touch-manipulation cursor-pointer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span className="hidden xs:inline font-semibold">GitHub</span>
          </a>

          {/* About Me / Info Button */}
          {onOpenAbout && (
            <button
              type="button"
              onClick={onOpenAbout}
              title="About ytChaptered & Creator"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#57534e] hover:text-[#1c1917] bg-[#ffffff] hover:bg-[#f5f5f4] active:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[10px] sm:rounded-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0d5c46] min-h-[40px] sm:min-h-[44px] touch-manipulation cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">About</span>
            </button>
          )}

          {showReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#1c1917] bg-[#ffffff] active:bg-[#f5f5f4] hover:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[10px] sm:rounded-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0d5c46] min-h-[40px] sm:min-h-[44px] touch-manipulation cursor-pointer shrink-0"
            >
              <svg
                className="w-4 h-4 text-[#57534e]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="hidden xs:inline">Load Another</span>
              <span className="xs:hidden">New</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
