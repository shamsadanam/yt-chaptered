'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { PlaylistView } from '../../../components/PlaylistView';
import { MobileTabBar } from '../../../components/MobileTabBar';
import { Footer } from '../../../components/Footer';
import { TurnstileWidget } from '../../../components/TurnstileWidget';
import { useSearchShortcut } from '../../../hooks/useSearchShortcut';
import { ParsedPlaylist, SavedCourse } from '../../../types/playlist';
import {
  subscribeCourses,
  getSavedCoursesSnapshot,
  getSavedCoursesServerSnapshot,
  getSavedCourse,
  saveCourse,
  initStorage,
} from '../../../lib/storage';
import { parseTimestamps, getYouTubeThumbnail } from '../../../lib/youtubeParser';

const AboutModal = dynamic(
  () => import('../../../components/AboutModal').then((mod) => mod.AboutModal),
  { ssr: false }
);
const AddVideoModal = dynamic(
  () => import('../../../components/AddVideoModal').then((mod) => mod.AddVideoModal),
  { ssr: false }
);

interface WatchClientProps {
  videoId: string;
  initialTimeParam?: string;
}

function getInitialPlaybackParams(
  course: SavedCourse | null | undefined,
  videoId: string,
  initialTimeParam?: string
) {
  if (!course) return null;
  const parsedTimeParam = initialTimeParam ? parseInt(initialTimeParam, 10) : NaN;
  const initialStartTime = !isNaN(parsedTimeParam) && parsedTimeParam >= 0
    ? parsedTimeParam
    : (course.lastPlayedSeconds || 0);

  let initialChapterIndex = course.lastPlayedChapterIndex || 0;
  if (course.chapters && course.chapters.length > 0) {
    for (let i = course.chapters.length - 1; i >= 0; i--) {
      if (initialStartTime >= course.chapters[i].startTime) {
        initialChapterIndex = i;
        break;
      }
    }
  }

  return {
    videoId,
    startTime: initialStartTime,
    chapterIndex: initialChapterIndex,
  };
}

export function WatchClient({ videoId, initialTimeParam }: WatchClientProps) {
  const router = useRouter();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAutoFetching, setIsAutoFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [needsFetch, setNeedsFetch] = useState(false);
  const hasFetchedRef = useRef(false);

  // Subscribe to reactive IndexedDB course updates
  useSyncExternalStore(
    subscribeCourses,
    getSavedCoursesSnapshot,
    getSavedCoursesServerSnapshot
  );

  const savedCourse = getSavedCourse(videoId);

  const initialPlayback = useMemo(
    () => getInitialPlaybackParams(savedCourse, videoId, initialTimeParam),
    [savedCourse, videoId, initialTimeParam]
  );

  const playlistVideo = savedCourse?.video;
  const playlistChapters = savedCourse?.chapters;
  const playlistRawTimestampsText = savedCourse?.rawTimestampsText;

  const playlist = useMemo(() => {
    if (!playlistVideo || !playlistChapters) return null;

    const initialStartTime = initialPlayback?.videoId === videoId ? initialPlayback.startTime : 0;
    const initialChapterIndex = initialPlayback?.videoId === videoId ? initialPlayback.chapterIndex : 0;

    const parsed: ParsedPlaylist = {
      video: playlistVideo,
      chapters: playlistChapters,
      rawTimestampsText: playlistRawTimestampsText,
      initialStartTime,
      initialChapterIndex,
    };
    return parsed;
  }, [playlistVideo, playlistChapters, playlistRawTimestampsText, initialPlayback, videoId]);

  // If course is not present in local storage (e.g. fresh direct link or bookmark), trigger auto-fetch
  useEffect(() => {
    let isCancelled = false;

    if (!savedCourse) {
      initStorage()
        .then(() => {
          if (isCancelled) return;
          const existing = getSavedCourse(videoId);
          if (existing) {
            setIsAutoFetching(false);
            setNeedsFetch(false);
          } else {
            setIsAutoFetching(true);
            setNeedsFetch(true);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            console.warn('Init storage failed:', err);
            setIsAutoFetching(true);
            setNeedsFetch(true);
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [videoId, savedCourse]);

  useSearchShortcut(
    () => setIsAddModalOpen(true),
    () => setIsAddModalOpen((prev) => !prev)
  );

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

  // Execute protected fetch once Turnstile token is available or client is cleared
  useEffect(() => {
    let isCancelled = false;
    if (!needsFetch || hasFetchedRef.current) return;

    const executeFetch = async (token?: string | null) => {
      if (hasFetchedRef.current || isCancelled) return;
      hasFetchedRef.current = true;
      setIsAutoFetching(true);
      setFetchError(null);

      const headers: Record<string, string> = {};
      if (token) {
        headers['x-turnstile-token'] = token;
      }

      try {
        const res = await fetch(`/api/protected/youtube-info?videoId=${videoId}`, { headers });
        if (!res.ok) {
          if (res.status === 403 && !token) {
            hasFetchedRef.current = false;
            setIsAutoFetching(false);
            return;
          }
          throw new Error('Video info request failed');
        }

        const data = await res.json();
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
              thumbnailUrl: getYouTubeThumbnail(videoId, finalThumbnail),
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
      } catch (err) {
        if (!isCancelled) {
          console.warn('Auto-fetch course failed:', err);
          setFetchError('Could not load course. Please check the YouTube video URL or ID.');
        }
      } finally {
        if (!isCancelled) {
          setIsAutoFetching(false);
        }
      }
    };

    if (turnstileToken) {
      executeFetch(turnstileToken);
    } else {
      const fallbackTimer = setTimeout(() => {
        executeFetch(null);
      }, 2500);
      return () => {
        isCancelled = true;
        clearTimeout(fallbackTimer);
      };
    }

    return () => {
      isCancelled = true;
    };
  }, [videoId, needsFetch, turnstileToken]);

  const handleTurnstileError = useCallback((err: string) => {
    if (process.env.NODE_ENV === 'production') {
      setFetchError(err);
    } else {
      console.warn('Turnstile dev notice:', err);
    }
  }, []);

  // Loading state while storage initializes or video info is auto-fetched
  if (!savedCourse && (isAutoFetching || needsFetch)) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <Navbar
          onOpenAddVideo={() => setIsAddModalOpen(true)}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col items-center justify-center p-4 outline-none">
          <div className="bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-xs">
            <div className="animate-spin inline-flex mx-auto mb-4">
              <Loader2 size={32} className="text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">
              Loading Course Details...
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Detecting chapters and course data for <span className="font-mono">{videoId}</span>
            </p>
            <TurnstileWidget
              onTokenChange={setTurnstileToken}
              onError={handleTurnstileError}
              action="watch_auto_fetch"
              className="flex justify-center empty:hidden mt-4"
            />
          </div>
        </main>
      </div>
    );
  }

  // Error state if video cannot be resolved
  if (!savedCourse && fetchError) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <Navbar
          onOpenAddVideo={() => setIsAddModalOpen(true)}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col items-center justify-center p-4 outline-none">
          <div role="alert" className="bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mx-auto mb-3" aria-hidden="true">
              <AlertTriangle size={24} aria-hidden="true" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">
              Course Not Found
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400 mb-5">
              {fetchError}
            </p>
            <button
              type="button"
              onClick={() => router.push('/', { transitionTypes: ['nav-back'] })}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer w-full min-h-11"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Return to Courses</span>
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
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100 pb-16 md:pb-0">
      <Navbar
        onOpenAddVideo={() => setIsAddModalOpen(true)}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col justify-start outline-none">
        <PlaylistView playlist={playlist} onReset={() => router.push('/', { transitionTypes: ['nav-back'] })} />
      </main>

      <MobileTabBar
        activeTab="player"
        onTabChange={(tab) => {
          if (tab === 'search' || tab === 'create') setIsAddModalOpen(true);
          else if (tab === 'history') router.push('/?tab=history', { transitionTypes: ['nav-back'] });
          else if (tab === 'about') setIsAboutOpen(true);
        }}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      <AddVideoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onGenerate={handleGenerate}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <Footer onOpenAbout={() => setIsAboutOpen(true)} />
    </div>
  );
}
