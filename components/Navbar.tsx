'use client';

interface NavbarProps {
  onReset?: () => void;
  showReset?: boolean;
  videoTitle?: string;
}

export function Navbar({ onReset, showReset, videoTitle }: NavbarProps) {
  return (
    <header className="w-full border-b border-[#c5c0b1]/40 bg-[#fffefb]/90 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[12px] bg-[#ff4f00] flex items-center justify-center text-[#fffefb] shrink-0 font-bold text-lg shadow-sm">
            ▶
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-[#201515] text-base sm:text-lg tracking-tight block truncate">
              Chaptered
            </span>
            {videoTitle && (
              <span className="text-xs text-[#605d52] truncate block max-w-xs sm:max-w-md md:max-w-xl">
                {videoTitle}
              </span>
            )}
          </div>
        </div>

        {showReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#201515] bg-[#f8f4f0] hover:bg-[#e7e2d7] border border-[#c5c0b1] rounded-[12px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff4f00] focus:ring-offset-2 min-h-[44px]"
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
            <span>Load Another Video</span>
          </button>
        )}
      </div>
    </header>
  );
}
