'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import { usePwa } from './PwaProvider';
import { ThemeToggle } from './ThemeToggle';
import { YouTubeIcon } from './icons/YouTubeIcon';

interface NavbarProps {
  onOpenAddVideo?: () => void;
  onOpenSearch?: () => void;
}

export function Navbar({ onOpenAddVideo, onOpenSearch }: NavbarProps) {
  const pathname = usePathname();
  const { isInstallable, promptInstall } = usePwa();
  const handleOpenAdd = onOpenAddVideo || onOpenSearch;
  const isWatchPage = pathname?.startsWith('/watch');

  return (
    <header
      style={{ viewTransitionName: 'site-header' }}
      className="w-full border-b border-stone-200 bg-stone-50/95 dark:border-stone-800 dark:bg-stone-950/95 backdrop-blur-md sticky top-0 z-30"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          transitionTypes={isWatchPage ? ['nav-back'] : undefined}
          prefetch={true}
          aria-label="ytChaptered home"
          className="flex items-center gap-2.5 min-w-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 relative rounded-lg sm:rounded-xl overflow-hidden shrink-0 shadow-xs">
            <Image
              src="/logo.svg"
              alt="ytChaptered logo"
              fill
              priority
              className="object-contain"
            />
          </div>
          <span className="font-semibold text-stone-900 dark:text-stone-100 text-base sm:text-lg tracking-tight block truncate">
            ytChaptered
          </span>
        </Link>

        {handleOpenAdd && (
          <button
            type="button"
            onClick={handleOpenAdd}
            title="Search YouTube or paste video link (⌘K)"
            aria-label="Search YouTube or paste video link"
            className="hidden md:inline-flex items-center gap-2.5 px-3 py-1.5 text-xs sm:text-sm text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100 bg-white hover:bg-stone-100 active:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 rounded-lg sm:rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary min-h-10 sm:min-h-9 cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 shrink-0">
              <Search
                size={15}
                strokeWidth={2}
                className="text-stone-500 group-hover:text-stone-700 dark:text-stone-400 dark:group-hover:text-stone-200 transition-colors"
                aria-hidden="true"
              />
              <YouTubeIcon size={16} branded />
            </div>
            <span className="font-normal text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">
              Search YouTube or paste link...
            </span>
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-2xs font-mono font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded ml-1">
              ⌘K
            </kbd>
          </button>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isInstallable && (
            <button
              type="button"
              onClick={promptInstall}
              title="Install ytChaptered app"
              aria-label="Install ytChaptered app"
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-primary hover:bg-primary-hover active:bg-primary-hover rounded-lg sm:rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-10 sm:min-h-9 touch-manipulation cursor-pointer shadow-xs active:scale-98"
            >
              <Download size={15} strokeWidth={2} aria-hidden="true" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}

          <a
            href="https://github.com/shamsadanam/yt-chaptered"
            target="_blank"
            rel="noopener noreferrer"
            title="ytChaptered on GitHub"
            aria-label="ytChaptered on GitHub"
            className="inline-flex items-center justify-center p-2 text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-100 active:bg-stone-100 dark:text-stone-300 dark:hover:text-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg sm:rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-10 min-w-10 sm:min-h-9 sm:min-w-9 touch-manipulation cursor-pointer"
          >
            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span className="sr-only">GitHub</span>
          </a>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
