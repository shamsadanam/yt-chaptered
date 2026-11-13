'use client';

import { Library, Info, Search, Plus } from 'lucide-react';
import { YouTubeIcon } from './icons/YouTubeIcon';

interface MobileTabBarProps {
  activeTab?: 'create' | 'player' | 'history' | 'search' | 'about';
  onTabChange: (tab: 'create' | 'player' | 'history' | 'search' | 'about') => void;
  onOpenAbout?: () => void;
}

export function MobileTabBar({
  activeTab = 'history',
  onTabChange,
  onOpenAbout,
}: MobileTabBarProps) {
  const handleAboutClick = () => {
    if (onOpenAbout) {
      onOpenAbout();
    } else {
      onTabChange('about');
    }
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-lg border-t border-stone-200 dark:border-stone-800 px-3 py-1 shadow-lg"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
        viewTransitionName: 'mobile-tab-bar',
      }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button
          type="button"
          onClick={() => onTabChange('history')}
          aria-current={activeTab === 'history' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg min-h-12 touch-manipulation transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer ${
            activeTab === 'history'
              ? 'text-primary dark:text-emerald-400 font-semibold'
              : 'text-stone-600 active:text-stone-900 dark:text-stone-400 dark:active:text-stone-100'
          }`}
        >
          <Library size={20} strokeWidth={2} className="mb-0.5 pointer-events-none" aria-hidden="true" />
          <span className="text-2xs sm:text-xs tracking-tight">Courses</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('search')}
          aria-haspopup="dialog"
          aria-label="Search YouTube and add course"
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg min-h-12 touch-manipulation transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer ${
            activeTab === 'search' || activeTab === 'create'
              ? 'text-primary dark:text-emerald-400 font-semibold'
              : 'text-stone-600 active:text-stone-900 dark:text-stone-400 dark:active:text-stone-100'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5 mb-0.5 pointer-events-none">
            <div className="relative">
              <Search size={17} strokeWidth={2.2} className="shrink-0" aria-hidden="true" />
              <Plus size={8} strokeWidth={3} className="absolute -top-1 -right-1 text-primary dark:text-emerald-400" aria-hidden="true" />
            </div>
            <YouTubeIcon size={16} branded className="shrink-0" />
          </div>
          <span className="text-2xs sm:text-xs tracking-tight">Search & Add</span>
        </button>

        <button
          type="button"
          onClick={handleAboutClick}
          aria-haspopup="dialog"
          aria-label="About ytChaptered"
          aria-current={activeTab === 'about' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg min-h-12 touch-manipulation transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer ${
            activeTab === 'about'
              ? 'text-primary dark:text-emerald-400 font-semibold'
              : 'text-stone-600 active:text-stone-900 dark:text-stone-400 dark:active:text-stone-100'
          }`}
        >
          <Info size={20} strokeWidth={2} className="mb-0.5 pointer-events-none" aria-hidden="true" />
          <span className="text-2xs sm:text-xs tracking-tight">About</span>
        </button>
      </div>
    </nav>
  );
}
