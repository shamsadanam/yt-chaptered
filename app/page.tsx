'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { DirectionalTransition } from '../components/DirectionalTransition';
import { Navbar } from '../components/Navbar';
import { InputView } from '../components/InputView';
import { CourseHistoryShelf } from '../components/CourseHistoryShelf';
import { MobileTabBar } from '../components/MobileTabBar';
import { DockedMiniPlayer } from '../components/DockedMiniPlayer';
import { Footer } from '../components/Footer';
import { useSearchShortcut } from '../hooks/useSearchShortcut';
import { ParsedPlaylist, SavedCourse } from '../types/playlist';
import {
  subscribeCourses,
  getSavedCoursesSnapshot,
  getSavedCoursesServerSnapshot,
  saveCourse,
  useIsStorageLoading,
} from '../lib/storage';

const AboutModal = dynamic(
  () => import('../components/AboutModal').then((mod) => mod.AboutModal),
  { ssr: false }
);
const AddVideoModal = dynamic(
  () => import('../components/AddVideoModal').then((mod) => mod.AddVideoModal),
  { ssr: false }
);
const PlaylistView = dynamic(
  () => import('../components/PlaylistView').then((mod) => mod.PlaylistView),
  { ssr: false }
);

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
    if (tab === 'history' || tab === 'create' || tab === 'search') {
      queueMicrotask(() => {
        if (tab === 'create' || tab === 'search') {
          setIsAddModalOpen(true);
        } else {
          setActiveTab('history');
        }
      });
    }
  }, []);

  useSearchShortcut(
    () => setIsAddModalOpen(true),
    () => setIsAddModalOpen((prev) => !prev)
  );

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
    router.push(`/watch/${newPlaylist.video.id}${tParam}`, { transitionTypes: ['nav-forward'] });
  };

  const handleResumeCourse = (course: SavedCourse) => {
    const tParam = course.lastPlayedSeconds > 0 ? `?t=${Math.floor(course.lastPlayedSeconds)}` : '';
    router.push(`/watch/${course.video.id}${tParam}`, { transitionTypes: ['nav-forward'] });
  };

  const handleReset = () => {
    setPlaylist(null);
    setActiveTab('history');
    handleRefreshCourses();
  };

  const handleTabChange = (tab: 'create' | 'player' | 'history' | 'search' | 'about') => {
    if (tab === 'about') {
      setIsAboutOpen(true);
      return;
    }
    if (tab === 'create' || tab === 'search') {
      setIsAddModalOpen(true);
      return;
    }
    if (tab === 'player') {
      if (savedCourses.length > 0) {
        const recent = savedCourses[0];
        const tParam = recent.lastPlayedSeconds > 0 ? `?t=${Math.floor(recent.lastPlayedSeconds)}` : '';
        router.push(`/watch/${recent.video.id}${tParam}`, { transitionTypes: ['nav-forward'] });
        return;
      }
    }
    if (tab === 'history') {
      handleRefreshCourses();
    }
    setActiveTab(tab);
  };

  return (
    <DirectionalTransition>
      <div className={`min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 ${savedCourses.length > 0 ? 'pb-36 md:pb-0' : 'pb-16 md:pb-0'}`}>
        <Navbar
          onOpenAddVideo={savedCourses.length > 0 ? () => setIsAddModalOpen(true) : undefined}
        />

        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col justify-start outline-none">
          {activeTab === 'player' && playlist && (
            <PlaylistView playlist={playlist} onReset={handleReset} />
          )}

          {savedCourses.length > 0 && activeTab !== 'player' && (
            <CourseHistoryShelf
              courses={savedCourses}
              onResumeCourse={handleResumeCourse}
              onRefresh={handleRefreshCourses}
              isLoading={isStorageLoading}
              onAddNewCourse={() => setIsAddModalOpen(true)}
            />
          )}

          {savedCourses.length === 0 && activeTab !== 'player' && (
            <InputView onGenerate={handleGenerate} />
          )}
        </main>

        {savedCourses.length > 0 && activeTab !== 'player' && (
          <DockedMiniPlayer
            course={savedCourses[0]}
            onResume={handleResumeCourse}
          />
        )}

        <MobileTabBar
          activeTab={activeTab === 'player' ? 'player' : 'history'}
          onTabChange={handleTabChange}
          onOpenAbout={() => setIsAboutOpen(true)}
        />

        {/* Unified Add Video Modal Dialog */}
        <AddVideoModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onGenerate={handleGenerate}
        />

        {/* About Me / App Modal */}
        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />

        <Footer onOpenAbout={() => setIsAboutOpen(true)} />
      </div>
    </DirectionalTransition>
  );
}
