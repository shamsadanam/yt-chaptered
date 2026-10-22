'use client';

import { PlusCircle, PlayCircle, Library } from 'lucide-react';

interface MobileTabBarProps {
  activeTab: 'create' | 'player' | 'history';
  hasActivePlaylist: boolean;
  activePlaylistTitle?: string;
  onTabChange: (tab: 'create' | 'player' | 'history') => void;
  onOpenAbout?: () => void;
}

export function MobileTabBar({
  activeTab,
  hasActivePlaylist,
  activePlaylistTitle,
  onTabChange,
}: MobileTabBarProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-lg border-t border-stone-200 dark:border-stone-800 px-2 py-1 shadow-lg"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Tab 1: Courses (Dashboard) */}
        <button
          type="button"
          onClick={() => onTabChange('history')}
          aria-current={activeTab === 'history' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg min-h-12 touch-manipulation transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
            activeTab === 'history'
              ? 'text-primary dark:text-emerald-400 font-semibold'
              : 'text-stone-600 active:text-stone-900 dark:text-stone-400 dark:active:text-stone-100'
          }`}
        >
          <Library className="w-5 h-5 mb-0.5 pointer-events-none" aria-hidden="true" />
          <span className="text-xs tracking-tight">Courses</span>
        </button>

        {/* Tab 2: Quick Add Course */}
        <button
          type="button"
          onClick={() => onTabChange('create')}
          aria-current={activeTab === 'create' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg min-h-12 touch-manipulation transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
            activeTab === 'create'
              ? 'text-primary dark:text-emerald-400 font-semibold'
              : 'text-stone-600 active:text-stone-900 dark:text-stone-400 dark:active:text-stone-100'
          }`}
        >
          <PlusCircle className="w-5 h-5 mb-0.5 pointer-events-none" aria-hidden="true" />
          <span className="text-xs tracking-tight">+ Add</span>
        </button>

        {/* Tab 3: Active Player */}
        <button
          type="button"
          onClick={() => onTabChange('player')}
          disabled={!hasActivePlaylist}
          aria-disabled={!hasActivePlaylist}
          aria-current={activeTab === 'player' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg min-h-12 touch-manipulation transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary ${
            !hasActivePlaylist
              ? 'opacity-40 cursor-not-allowed text-stone-400 dark:text-stone-600'
              : activeTab === 'player'
              ? 'text-primary dark:text-emerald-400 font-semibold'
              : 'text-stone-600 active:text-stone-900 dark:text-stone-400 dark:active:text-stone-100'
          }`}
          title={hasActivePlaylist ? activePlaylistTitle || 'Now Playing' : 'No course currently playing'}
          aria-label={hasActivePlaylist ? `Now Playing: ${activePlaylistTitle || 'Active Course'}` : 'Now Playing (No course currently active)'}
        >
          <div className="relative pointer-events-none">
            <PlayCircle className="w-5 h-5 mb-0.5" aria-hidden="true" />
            {hasActivePlaylist && activeTab !== 'player' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true" />
            )}
          </div>
          <span className="text-xs tracking-tight">Playing</span>
        </button>
      </div>
    </nav>
  );
}
