'use client';

import { PlusCircle, PlayCircle, Library, Info } from 'lucide-react';

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
  onOpenAbout,
}: MobileTabBarProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fafaf9]/95 backdrop-blur-lg border-t border-[#e7e5e4] px-2 py-1 shadow-lg"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Tab 1: Create / Home */}
        <button
          type="button"
          onClick={() => onTabChange('create')}
          aria-current={activeTab === 'create' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] min-h-[48px] touch-manipulation transition-colors focus:outline-none focus:ring-2 focus:ring-[#0d5c46] ${
            activeTab === 'create'
              ? 'text-[#0d5c46]'
              : 'text-[#57534e] active:text-[#1c1917]'
          }`}
        >
          <PlusCircle className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span className="text-[11px] font-semibold tracking-tight">Create</span>
        </button>

        {/* Tab 2: Now Playing */}
        <button
          type="button"
          onClick={() => onTabChange('player')}
          disabled={!hasActivePlaylist}
          aria-disabled={!hasActivePlaylist}
          aria-current={activeTab === 'player' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] min-h-[48px] touch-manipulation transition-colors relative focus:outline-none focus:ring-2 focus:ring-[#0d5c46] ${
            !hasActivePlaylist
              ? 'opacity-40 cursor-not-allowed text-[#a8a29e]'
              : activeTab === 'player'
              ? 'text-[#0d5c46]'
              : 'text-[#57534e] active:text-[#1c1917]'
          }`}
          title={hasActivePlaylist ? activePlaylistTitle || 'Now Playing' : 'No video currently playing'}
          aria-label={hasActivePlaylist ? `Now Playing: ${activePlaylistTitle || 'Active Video'}` : 'Now Playing (No video currently active)'}
        >
          <div className="relative">
            <PlayCircle className="w-5 h-5 mb-0.5" aria-hidden="true" />
            {hasActivePlaylist && activeTab !== 'player' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#10b981] rounded-full animate-pulse" aria-hidden="true" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight">Playing</span>
        </button>

        {/* Tab 3: Courses / History */}
        <button
          type="button"
          onClick={() => onTabChange('history')}
          aria-current={activeTab === 'history' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] min-h-[48px] touch-manipulation transition-colors focus:outline-none focus:ring-2 focus:ring-[#0d5c46] ${
            activeTab === 'history'
              ? 'text-[#0d5c46]'
              : 'text-[#57534e] active:text-[#1c1917]'
          }`}
        >
          <Library className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span className="text-[11px] font-semibold tracking-tight">Courses</span>
        </button>

        {/* Tab 4: About / Star */}
        {onOpenAbout && (
          <button
            type="button"
            onClick={onOpenAbout}
            aria-label="About ytChaptered and creator"
            className="flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] min-h-[48px] touch-manipulation transition-colors text-[#57534e] active:text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
          >
            <Info className="w-5 h-5 mb-0.5" aria-hidden="true" />
            <span className="text-[11px] font-semibold tracking-tight">About</span>
          </button>
        )}
      </div>
    </nav>
  );
}
