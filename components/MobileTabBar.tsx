'use client';

interface MobileTabBarProps {
  activeTab: 'create' | 'player' | 'history';
  hasActivePlaylist: boolean;
  activePlaylistTitle?: string;
  onTabChange: (tab: 'create' | 'player' | 'history') => void;
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fafaf9]/95 backdrop-blur-lg border-t border-[#e7e5e4] px-2 py-1 shadow-lg"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Tab 1: Create / Home */}
        <button
          type="button"
          onClick={() => onTabChange('create')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] min-h-[48px] touch-manipulation transition-colors ${
            activeTab === 'create'
              ? 'text-[#0d5c46]'
              : 'text-[#57534e] active:text-[#1c1917]'
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-[11px] font-semibold tracking-tight">Create</span>
        </button>

        {/* Tab 2: Now Playing */}
        <button
          type="button"
          onClick={() => onTabChange('player')}
          disabled={!hasActivePlaylist}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] min-h-[48px] touch-manipulation transition-colors relative ${
            !hasActivePlaylist
              ? 'opacity-40 cursor-not-allowed text-[#a8a29e]'
              : activeTab === 'player'
              ? 'text-[#0d5c46]'
              : 'text-[#57534e] active:text-[#1c1917]'
          }`}
          title={hasActivePlaylist ? activePlaylistTitle || 'Now Playing' : 'No video currently playing'}
        >
          <div className="relative">
            <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {hasActivePlaylist && activeTab !== 'player' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-[11px] font-semibold tracking-tight">Playing</span>
        </button>

        {/* Tab 3: Courses / History */}
        <button
          type="button"
          onClick={() => onTabChange('history')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-[8px] min-h-[48px] touch-manipulation transition-colors ${
            activeTab === 'history'
              ? 'text-[#0d5c46]'
              : 'text-[#57534e] active:text-[#1c1917]'
          }`}
        >
          <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-[11px] font-semibold tracking-tight">Courses</span>
        </button>
      </div>
    </nav>
  );
}
