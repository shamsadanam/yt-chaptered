'use client';

import { CopyrightYear } from './CopyrightYear';

interface FooterProps {
  onOpenAbout?: () => void;
  className?: string;
}

export function Footer({ onOpenAbout, className = '' }: FooterProps) {
  return (
    <footer className={`hidden md:block border-t border-stone-200 dark:border-stone-800 py-6 px-4 text-xs text-stone-600 dark:text-stone-400 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p>
          © <CopyrightYear /> ytChaptered • Local-first YouTube Chaptered Course Creator • Built by{' '}
          <a
            href="https://shamsad.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-900 dark:text-stone-100 font-semibold hover:text-primary dark:hover:text-emerald-400 transition-colors underline"
          >
            Shamsad Anam
          </a>
        </p>
        {onOpenAbout && (
          <button
            type="button"
            onClick={onOpenAbout}
            className="text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors cursor-pointer hover:underline"
          >
            About ytChaptered
          </button>
        )}
      </div>
    </footer>
  );
}
