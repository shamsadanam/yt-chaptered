'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={`inline-flex items-center justify-center p-1.5 sm:p-2 text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100 bg-white hover:bg-stone-100 active:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg sm:rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary min-h-8.5 sm:min-h-9 min-w-8.5 sm:min-w-9 touch-manipulation cursor-pointer ${className}`}
    >
      <Sun className="w-4 h-4 sm:w-5 sm:h-5 block dark:hidden" aria-hidden="true" />
      <Moon className="w-4 h-4 sm:w-5 sm:h-5 hidden dark:block" aria-hidden="true" />
    </button>
  );
}
