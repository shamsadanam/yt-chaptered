'use client';
 
import { useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { InputView } from '../components/InputView';
import { PlaylistView } from '../components/PlaylistView';
import { CourseHistoryShelf, CourseHistorySkeleton } from '../components/CourseHistoryShelf';
import { MobileTabBar } from '../components/MobileTabBar';
import { AboutModal } from '../components/AboutModal';
import { AddCourseModal } from '../components/AddCourseModal';
import { CopyrightYear } from '../components/CopyrightYear';
import { ParsedPlaylist, SavedCourse } from '../types/playlist';
import {
  subscribeCourses,
  getSavedCoursesSnapshot,
  getSavedCoursesServerSnapshot,
  saveCourse,
  useIsStorageLoading,
} from '../lib/storage';

export default function Home() {
  const router = useRouter();
  const [playlist, setPlaylist] = useState<ParsedPlaylist | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'player' | 'history'>('history');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const isStorageLoading = useIsStorageLoading();
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
        if (tab === 'create') {
          setIsAddModalOpen(true);
        } else {
          setActiveTab('history');
        }
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
    setActiveTab('history');
    handleRefreshCourses();
  };

  const handleTabChange = (tab: 'create' | 'player' | 'history') => {
    if (tab === 'create') {
      setIsAddModalOpen(true);
      return;
    }
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
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 pb-16 md:pb-0">
      <Navbar
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col justify-start outline-none">
        {/* View 1: Active Player View */}
        {activeTab === 'player' && playlist && (
          <PlaylistView playlist={playlist} onReset={handleReset} />
        )}

        {/* View 2: Course Library (Dashboard for Returning Users) */}
        {savedCourses.length > 0 && activeTab !== 'player' && (
          <CourseHistoryShelf
            courses={savedCourses}
            onResumeCourse={handleResumeCourse}
            onRefresh={handleRefreshCourses}
            isLoading={isStorageLoading}
            isStandaloneView={true}
            onAddNewCourse={() => setIsAddModalOpen(true)}
          />
        )}

        {/* View 3: First-time User Experience (When No Courses Exist Yet) */}
        {savedCourses.length === 0 && !isStorageLoading && activeTab !== 'player' && (
          <InputView onGenerate={handleGenerate} />
        )}

        {/* Loading skeleton while storage initializes */}
        {savedCourses.length === 0 && isStorageLoading && activeTab !== 'player' && (
          <CourseHistorySkeleton />
        )}
      </main>

      {/* Floating Mini Player Bar on mobile when course loaded but viewing other tabs */}
      {playlist && activeTab !== 'player' && (
        <aside aria-label="Active course player" className="md:hidden fixed bottom-16 left-3 right-3 z-40">
          <button
            type="button"
            onClick={() => setActiveTab('player')}
            aria-label={`Open active course player: ${playlist.video.title}`}
            className="w-full bg-stone-900 dark:bg-stone-900 border border-transparent dark:border-stone-800 text-white p-3 rounded-xl shadow-lg flex items-center justify-between gap-3 cursor-pointer active:scale-98 transition-transform touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="flex items-center gap-2.5 min-w-0 text-left">
              <span className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-xs shrink-0 font-bold text-white" aria-hidden="true">
                <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-white" />
              </span>
              <div className="min-w-0">
                <span className="text-2xs text-emerald-500 font-semibold uppercase tracking-wider block">
                  Now Playing
                </span>
                <p className="text-xs font-semibold truncate text-white">
                  {playlist.video.title}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-500 shrink-0 pr-1" aria-hidden="true">
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

      {/* Add Course Modal Dialog */}
      <AddCourseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onGenerate={handleGenerate}
      />

      {/* About Me / App Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <footer className="hidden md:block border-t border-stone-200 dark:border-stone-800 py-6 px-4 text-center text-xs text-stone-600 dark:text-stone-400">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
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
        </div>
      </footer>
    </div>
  );
}
