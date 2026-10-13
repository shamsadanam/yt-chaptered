'use client';

import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { InputView } from '../components/InputView';
import { PlaylistView } from '../components/PlaylistView';
import { CourseHistoryShelf } from '../components/CourseHistoryShelf';
import { MobileTabBar } from '../components/MobileTabBar';
import { ParsedPlaylist, SavedCourse } from '../types/playlist';
import { getSavedCourses } from '../lib/storage';

export default function Home() {
  const [playlist, setPlaylist] = useState<ParsedPlaylist | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'player' | 'history'>('create');
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>(() => {
    return getSavedCourses();
  });

  const handleRefreshCourses = () => {
    setSavedCourses(getSavedCourses());
  };

  const handleGenerate = (newPlaylist: ParsedPlaylist) => {
    setPlaylist(newPlaylist);
    setActiveTab('player');
    handleRefreshCourses();
  };

  const handleResumeCourse = (course: SavedCourse) => {
    const resumed: ParsedPlaylist = {
      video: course.video,
      chapters: course.chapters,
      rawTimestampsText: course.rawTimestampsText,
      initialStartTime: course.lastPlayedSeconds,
      initialChapterIndex: course.lastPlayedChapterIndex,
    };
    setPlaylist(resumed);
    setActiveTab('player');
  };

  const handleReset = () => {
    setPlaylist(null);
    setActiveTab('create');
    handleRefreshCourses();
  };

  const handleTabChange = (tab: 'create' | 'player' | 'history') => {
    if (tab === 'history') {
      handleRefreshCourses();
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fffefb] text-[#201515] pb-16 md:pb-0">
      <Navbar
        onReset={handleReset}
        showReset={playlist !== null && activeTab === 'player'}
        videoTitle={playlist?.video.title}
      />

      <main className="flex-1 flex flex-col justify-start">
        {/* View 1: Player View */}
        {activeTab === 'player' && playlist && (
          <PlaylistView playlist={playlist} onReset={handleReset} />
        )}

        {/* View 2: Standalone Courses & History View */}
        {activeTab === 'history' && (
          <CourseHistoryShelf
            courses={savedCourses}
            onResumeCourse={handleResumeCourse}
            onRefresh={handleRefreshCourses}
            isStandaloneView={true}
            onGoToCreate={() => setActiveTab('create')}
          />
        )}

        {/* View 3: Create / Home Input View */}
        {(activeTab === 'create' || (activeTab === 'player' && !playlist)) && (
          <InputView onGenerate={handleGenerate} />
        )}
      </main>

      {/* Floating Mini Player Bar on mobile when video loaded but viewing other tabs */}
      {playlist && activeTab !== 'player' && (
        <aside
          aria-label="Active video player"
          onClick={() => setActiveTab('player')}
          className="md:hidden fixed bottom-[64px] left-3 right-3 z-40 bg-[#201515] text-[#fffefb] p-3 rounded-[12px] shadow-lg flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform touch-manipulation"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-[6px] bg-[#ff4f00] flex items-center justify-center text-xs shrink-0 font-bold">
              ▶
            </span>
            <div className="min-w-0">
              <span className="text-[10px] text-[#ff4f00] font-semibold uppercase tracking-wider block">
                Now Playing
              </span>
              <p className="text-xs font-semibold truncate text-[#fffefb]">
                {playlist.video.title}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#ff4f00] shrink-0 pr-1">
            Open →
          </span>
        </aside>
      )}

      {/* Mobile App Bottom Tab Bar */}
      <MobileTabBar
        activeTab={activeTab}
        hasActivePlaylist={playlist !== null}
        activePlaylistTitle={playlist?.video.title}
        onTabChange={handleTabChange}
      />

      <footer className="hidden md:block border-t border-[#c5c0b1]/30 py-6 px-4 text-center text-xs text-[#605d52]">
        <p>Local-first YouTube Chaptered Playlist Creator • Runs in your browser without cloud tracking</p>
      </footer>
    </div>
  );
}
