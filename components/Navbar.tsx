'use client';

interface NavbarProps {
  onReset?: () => void;
  showReset?: boolean;
  videoTitle?: string;
}

export function Navbar({ onReset, showReset, videoTitle }: NavbarProps) {
  return (
    <header className="w-full border-b border-[#c5c0b1]/40 bg-[#fffefb]/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] sm:rounded-[12px] bg-[#ff4f00] flex items-center justify-center text-[#fffefb] shrink-0 font-bold text-base sm:text-lg shadow-xs">
            ▶
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-[#201515] text-base sm:text-lg tracking-tight block truncate">
              Chaptered
            </span>
            {videoTitle && (
              <span className="text-[11px] sm:text-xs text-[#605d52] truncate block max-w-[160px] xs:max-w-[220px] sm:max-w-md md:max-w-xl">
                {videoTitle}
              </span>
            )}
          </div>
        </div>

        {showReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-[#201515] bg-[#f8f4f0] active:bg-[#e7e2d7] hover:bg-[#e7e2d7] border border-[#c5c0b1] rounded-[10px] sm:rounded-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff4f00] min-h-[48px] touch-manipulation cursor-pointer shrink-0"
          >
            <svg
              className="w-4 h-4 text-[#605d52]"
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
