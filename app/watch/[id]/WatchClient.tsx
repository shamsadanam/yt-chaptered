'use client';

import { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { PlaylistView } from '../../../components/PlaylistView';
import { MobileTabBar } from '../../../components/MobileTabBar';
import { AboutModal } from '../../../components/AboutModal';
import { CopyrightYear } from '../../../components/CopyrightYear';
import { ParsedPlaylist, SavedCourse } from '../../../types/playlist';
import {
  subscribeCourses,
  getSavedCoursesSnapshot,
  getSavedCoursesServerSnapshot,
  getSavedCourse,
  saveCourse,
  initStorage,
} from '../../../lib/storage';
import { parseTimestamps } from '../../../lib/youtubeParser';

interface WatchClientProps {
  videoId: string;
  initialTimeParam?: string;
}

export function WatchClient({ videoId, initialTimeParam }: WatchClientProps) {
  const router = useRouter();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Subscribe to reactive IndexedDB course updates
  useSyncExternalStore(
    subscribeCourses,
    getSavedCoursesSnapshot,
    getSavedCoursesServerSnapshot
  );

  const savedCourse = getSavedCourse(videoId);

  const playlist = useMemo(() => {
    if (!savedCourse) return null;

    // Parse target start time from ?t= query param or fallback to saved playback seconds
    const parsedTimeParam = initialTimeParam ? parseInt(initialTimeParam, 10) : NaN;
    const initialStartTime = !isNaN(parsedTimeParam) && parsedTimeParam >= 0
      ? parsedTimeParam
      : (savedCourse.lastPlayedSeconds || 0);

    // Match target timestamp to corresponding chapter
    let initialChapterIndex = savedCourse.lastPlayedChapterIndex || 0;
    if (savedCourse.chapters && savedCourse.chapters.length > 0) {
      for (let i = savedCourse.chapters.length - 1; i >= 0; i--) {
        if (initialStartTime >= savedCourse.chapters[i].startTime) {
          initialChapterIndex = i;
          break;
        }
      }
    }

    const parsed: ParsedPlaylist = {
      video: savedCourse.video,
      chapters: savedCourse.chapters,
      rawTimestampsText: savedCourse.rawTimestampsText,
      initialStartTime,
      initialChapterIndex,
    };
    return parsed;
  }, [savedCourse, initialTimeParam]);

  // If course is not present in local storage (e.g. fresh direct link or bookmark), auto-fetch details
  useEffect(() => {
    let isCancelled = false;

    if (!savedCourse) {
      initStorage()
        .then(() => {
          if (isCancelled) return;
          const existing = getSavedCourse(videoId);
          if (existing) {
            setIsAutoFetching(false);
            return;
          }

          setIsAutoFetching(true);
          setFetchError(null);

          return fetch(`/api/youtube-info?videoId=${videoId}`)
            .then((res) => {
              if (!res.ok) throw new Error('Video info request failed');
              return res.json();
            })
            .then(async (data) => {
              if (isCancelled) return;
              if (data && data.success) {
                let parsedChapters = data.chapters || [];
                if (parsedChapters.length === 0 && data.description) {
                  parsedChapters = parseTimestamps(data.description, data.duration);
                }
                if (parsedChapters.length === 0) {
                  parsedChapters = [
                    {
                      id: `chap-${videoId}-0`,
                      index: 1,
                      title: 'Full Video',
                      startTime: 0,
                      endTime: Infinity,
                      formattedTime: '0:00',
                      status: 'not_started',
                    },
                  ];
                }

                let finalTitle = data.title;
                let finalAuthor = data.author;
                const finalChannelId = data.channelId;
                let finalChannelUrl = data.channelUrl;
                let finalThumbnail = data.thumbnailUrl;

                if (!finalTitle || !finalChannelUrl) {
                  try {
                    const oembedRes = await fetch(
                      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
                    );
                    if (oembedRes.ok) {
                      const oembed = await oembedRes.json();
                      if (oembed.title && !finalTitle) finalTitle = oembed.title;
                      if (oembed.author_name && !finalAuthor) finalAuthor = oembed.author_name;
                      if (oembed.author_url && !finalChannelUrl) finalChannelUrl = oembed.author_url;
                      if (oembed.thumbnail_url && !finalThumbnail) finalThumbnail = oembed.thumbnail_url;
                    }
                  } catch {
                    // Silent fallback
                  }
                }

                const newCourse: SavedCourse = {
                  video: {
                    id: videoId,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    title: finalTitle || 'YouTube Video',
                    author: finalAuthor,
                    channelId: finalChannelId,
                    channelUrl: finalChannelUrl,
                    thumbnailUrl: finalThumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    duration: data.duration,
                  },
                  chapters: parsedChapters,
                  rawTimestampsText: data.description || '',
                  completedChapterIds: [],
                  lastPlayedChapterIndex: 0,
                  lastPlayedSeconds: 0,
                  updatedAt: Date.now(),
                };

                saveCourse(newCourse);
              } else {
                setFetchError(data?.error || 'Video could not be loaded or auto-detected.');
              }
            });
        })
        .catch((err) => {
          if (!isCancelled) {
            console.warn('Auto-fetch course failed:', err);
            setFetchError('Could not load course. Please check the YouTube video URL or ID.');
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsAutoFetching(false);
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [videoId, savedCourse]);

  // Loading state while storage initializes or video info is auto-fetched
  if (!savedCourse && isAutoFetching) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fafaf9] text-[#1c1917]">
        <Navbar onReset={() => router.push('/')} showReset={true} onOpenAbout={() => setIsAboutOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col items-center justify-center p-4 outline-none">
          <div className="bg-[#ffffff] border border-[#e7e5e4] rounded-[16px] p-6 sm:p-8 max-w-md w-full text-center shadow-xs">
            <Loader2 className="animate-spin h-8 w-8 text-[#0d5c46] mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-semibold text-[#1c1917] mb-1">
              Loading Course Details...
            </h2>
            <p className="text-xs text-[#57534e]">
              Detecting chapters and course data for video <span className="font-mono">{videoId}</span>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Error state if video cannot be resolved
  if (!savedCourse && fetchError) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fafaf9] text-[#1c1917]">
        <Navbar onReset={() => router.push('/')} showReset={true} onOpenAbout={() => setIsAboutOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col items-center justify-center p-4 outline-none">
          <div role="alert" className="bg-[#ffffff] border border-[#e7e5e4] rounded-[16px] p-6 sm:p-8 max-w-md w-full text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#fef2f2] text-[#e11d48] flex items-center justify-center mx-auto mb-3" aria-hidden="true">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-[#1c1917] mb-1">
              Course Not Found
            </h2>
            <p className="text-xs text-[#57534e] mb-5">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0d5c46] hover:bg-[#0a4635] text-white text-xs font-semibold rounded-[8px] transition-colors cursor-pointer w-full min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Return to Home</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!playlist) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-[#1c1917] pb-16 md:pb-0">
      <Navbar
        onReset={() => router.push('/')}
        showReset={true}
        videoTitle={playlist.video.title}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col justify-start outline-none">
        <PlaylistView playlist={playlist} onReset={() => router.push('/')} />
      </main>

      <MobileTabBar
        activeTab="player"
        hasActivePlaylist={true}
        activePlaylistTitle={playlist.video.title}
        onTabChange={(tab) => {
          if (tab === 'create') router.push('/');
          else if (tab === 'history') router.push('/?tab=history');
        }}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

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
