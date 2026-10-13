'use client';

import Image from 'next/image';

interface NavbarProps {
  onReset?: () => void;
  showReset?: boolean;
  videoTitle?: string;
}

export function Navbar({ onReset, showReset, videoTitle }: NavbarProps) {
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

        {showReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-[#1c1917] bg-[#ffffff] active:bg-[#f5f5f4] hover:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[10px] sm:rounded-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0d5c46] min-h-[48px] touch-manipulation cursor-pointer shrink-0"
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
    </header>
  );
}
