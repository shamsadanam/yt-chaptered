'use client';

import Image from 'next/image';

interface NavbarProps {
  onReset?: () => void;
  showReset?: boolean;
  videoTitle?: string;
  onOpenAbout?: () => void;
}

export function Navbar({ onReset, showReset, videoTitle, onOpenAbout }: NavbarProps) {
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
          {/* GitHub Star Button */}
          <a
            href="https://github.com/shamsadanam/yt-chaptered"
            target="_blank"
            rel="noopener noreferrer"
            title="Star ytChaptered on GitHub"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#1c1917] bg-[#ffffff] hover:bg-[#f5f5f4] active:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[10px] sm:rounded-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0d5c46] min-h-[40px] sm:min-h-[44px] touch-manipulation cursor-pointer"
          >
            <svg className="w-4 h-4 text-amber-500 fill-amber-400" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="hidden xs:inline font-semibold">Star</span>
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
