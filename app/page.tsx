'use client';
 
import { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../components/Navbar';
import { InputView } from '../components/InputView';
import { PlaylistView } from '../components/PlaylistView';
import { CourseHistoryShelf } from '../components/CourseHistoryShelf';
import { MobileTabBar } from '../components/MobileTabBar';
import { AboutModal } from '../components/AboutModal';
import { CopyrightYear } from '../components/CopyrightYear';
import { ParsedPlaylist, SavedCourse } from '../types/playlist';
import {
  subscribeCourses,
  getSavedCoursesSnapshot,
  getSavedCoursesServerSnapshot,
  saveCourse,
} from '../lib/storage';

export default function Home() {
  const router = useRouter();
  const [playlist, setPlaylist] = useState<ParsedPlaylist | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'player' | 'history'>('create');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const savedCourses = useSyncExternalStore(
    subscribeCourses,
    getSavedCoursesSnapshot,
    getSavedCoursesServerSnapshot
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'history' || tab === 'create') {
      queueMicrotask(() => {
        setActiveTab(tab);
      });
    }
  }, []);

  const handleRefreshCourses = () => {};

  const handleGenerate = (newPlaylist: ParsedPlaylist) => {
    saveCourse({
      video: newPlaylist.video,
      chapters: newPlaylist.chapters,
      rawTimestampsText: newPlaylist.rawTimestampsText || '',
      completedChapterIds: [],
      lastPlayedChapterIndex: newPlaylist.initialChapterIndex ?? 0,
      lastPlayedSeconds: newPlaylist.initialStartTime ?? 0,
      updatedAt: Date.now(),
    });
    const tParam = newPlaylist.initialStartTime && newPlaylist.initialStartTime > 0
      ? `?t=${Math.floor(newPlaylist.initialStartTime)}`
      : '';
    router.push(`/watch/${newPlaylist.video.id}${tParam}`);
  };

  const handleResumeCourse = (course: SavedCourse) => {
    const tParam = course.lastPlayedSeconds > 0 ? `?t=${Math.floor(course.lastPlayedSeconds)}` : '';
    router.push(`/watch/${course.video.id}${tParam}`);
  };

  const handleReset = () => {
    setPlaylist(null);
    setActiveTab('create');
    handleRefreshCourses();
  };

  const handleTabChange = (tab: 'create' | 'player' | 'history') => {
    if (tab === 'player') {
      if (savedCourses.length > 0) {
        const recent = savedCourses[0];
        const tParam = recent.lastPlayedSeconds > 0 ? `?t=${Math.floor(recent.lastPlayedSeconds)}` : '';
        router.push(`/watch/${recent.video.id}${tParam}`);
        return;
      }
    }
    if (tab === 'history') {
      handleRefreshCourses();
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-[#1c1917] pb-16 md:pb-0">
      <Navbar
        onReset={handleReset}
        showReset={playlist !== null && activeTab === 'player'}
        videoTitle={playlist?.video.title}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col justify-start outline-none">
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
            onAddNewCourse={() => setActiveTab('create')}
          />
        )}

        {/* View 3: Create / Home Input View */}
        {(activeTab === 'create' || (activeTab === 'player' && !playlist)) && (
          <InputView onGenerate={handleGenerate} />
        )}
      </main>

      {/* Floating Mini Player Bar on mobile when video loaded but viewing other tabs */}
      {playlist && activeTab !== 'player' && (
        <aside aria-label="Active video player" className="md:hidden fixed bottom-[64px] left-3 right-3 z-40">
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            aria-label={`Open active video player: ${playlist.video.title}`}
            className="w-full bg-[#1c1917] text-[#ffffff] p-3 rounded-[12px] shadow-lg flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#10b981]"
          >
            <div className="flex items-center gap-2.5 min-w-0 text-left">
              <span className="w-7 h-7 rounded-[6px] bg-[#0d5c46] flex items-center justify-center text-xs shrink-0 font-bold text-white" aria-hidden="true">
                ▶
              </span>
              <div className="min-w-0">
                <span className="text-[10px] text-[#10b981] font-semibold uppercase tracking-wider block">
                  Now Playing
                </span>
                <p className="text-xs font-semibold truncate text-[#ffffff]">
                  {playlist.video.title}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#10b981] shrink-0 pr-1" aria-hidden="true">
              Open →
            </span>
          </button>
        </aside>
      )}

      {/* Mobile App Bottom Tab Bar */}
      <MobileTabBar
        activeTab={activeTab}
        hasActivePlaylist={playlist !== null}
        activePlaylistTitle={playlist?.video.title}
        onTabChange={handleTabChange}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* About Me / App Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <footer className="hidden md:block border-t border-[#e7e5e4] py-6 px-4 text-center text-xs text-[#57534e]">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <p>
            © <CopyrightYear /> ytChaptered • Local-first YouTube Chaptered Playlist Creator • Built by{' '}
            <a
              href="https://shamsad.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1c1917] font-semibold hover:text-[#0d5c46] transition-colors underline"
            >
              Shamsad Anam
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
