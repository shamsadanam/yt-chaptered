'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Download, Info, ArrowLeft } from 'lucide-react';
import { usePwa } from './PwaProvider';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  onReset?: () => void;
  showReset?: boolean;
  videoTitle?: string;
  onOpenAbout?: () => void;
}

export function Navbar({ onReset, showReset, videoTitle, onOpenAbout }: NavbarProps) {
  const { isInstallable, promptInstall } = usePwa();

  return (
    <header className="w-full border-b border-stone-200 bg-stone-50/95 dark:border-stone-800 dark:bg-stone-950/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        <Link href="/" aria-label="ytChaptered home" className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 sm:w-9 sm:h-9 relative rounded-lg sm:rounded-xl overflow-hidden shrink-0 shadow-xs">
            <Image
              src="/logo.svg"
              alt=""
              fill
              priority
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-stone-900 dark:text-stone-100 text-base sm:text-lg tracking-tight block truncate">
              ytChaptered
            </span>
            {videoTitle && (
              <span className="text-xs text-stone-600 dark:text-stone-400 truncate block max-w-40 xs:max-w-55 sm:max-w-md md:max-w-xl">
                {videoTitle}
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          {/* Native PWA Install Button */}
          {isInstallable && (
            <button
              type="button"
              onClick={promptInstall}
              title="Install ytChaptered app"
              aria-label="Install ytChaptered app"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-primary hover:bg-primary-hover active:bg-primary-hover rounded-lg sm:rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-10 sm:min-h-11 touch-manipulation cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Install</span>
            </button>
          )}

          <a
            href="https://github.com/shamsadanam/yt-chaptered"
            target="_blank"
            rel="noopener noreferrer"
            title="ytChaptered on GitHub"
            aria-label="ytChaptered on GitHub"
            className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-stone-900 bg-white hover:bg-stone-100 active:bg-stone-100 dark:text-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg sm:rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-8.5 sm:min-h-9 touch-manipulation cursor-pointer"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span className="hidden xs:inline font-semibold">GitHub</span>
            <span className="sr-only xs:hidden">GitHub</span>
          </a>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Info / About Button */}
          {onOpenAbout && (
            <button
              type="button"
              onClick={onOpenAbout}
              title="About ytChaptered & Creator"
              aria-label="About ytChaptered & Creator"
              className="inline-flex items-center justify-center p-1.5 sm:p-2 text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 active:bg-stone-100 dark:text-stone-300 dark:hover:text-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg sm:rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-8.5 sm:min-h-9 min-w-8.5 sm:min-w-9 touch-manipulation cursor-pointer"
            >
              <Info className="w-5 h-5" aria-hidden="true" />
            </button>
          )}

          {showReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Load another video or course"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-stone-900 bg-white active:bg-stone-100 hover:bg-stone-100 dark:text-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg sm:rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-10 sm:min-h-11 touch-manipulation cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-stone-600 dark:text-stone-400" aria-hidden="true" />
              <span className="hidden xs:inline">Load Another</span>
              <span className="xs:hidden">New</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

