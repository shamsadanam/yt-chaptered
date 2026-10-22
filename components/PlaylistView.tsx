'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Loader2,
  AlertTriangle,
  ExternalLink,
  X,
  Zap,
  ChevronDown,
  Check,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  ArrowLeft,
} from 'lucide-react';
import { Chapter, ParsedPlaylist, SavedCourse } from '../types/playlist';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { secondsToTimestamp } from '../lib/youtubeParser';
import {
  saveCourse,
  getSavedCourse,
  updateCoursePlaybackProgress,
  toggleChapterCompletion,
  markChapterCompleted,
  subscribeCourses,
  getCompletedChapterIdsSnapshot,
  getCompletedChapterIdsServerSnapshot,
} from '../lib/storage';

interface PlaylistViewProps {
  playlist: ParsedPlaylist;
  onReset?: () => void;
}

export function PlaylistView({ playlist, onReset }: PlaylistViewProps) {
  const containerId = 'youtube-active-player';
  const sidebarListRef = useRef<HTMLOListElement>(null);
  const activeItemRef = useRef<HTMLLIElement | null>(null);

  const [copiedTimestamps, setCopiedTimestamps] = useState(false);
  const [showRawTimestamps, setShowRawTimestamps] = useState(false);

  const urlDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce updating URL query parameter to avoid flooding browser history during rapid seeks
  const updateUrlTimestamp = useCallback((seconds: number) => {
    if (typeof window === 'undefined') return;
    if (urlDebounceTimerRef.current) {
      clearTimeout(urlDebounceTimerRef.current);
    }
    urlDebounceTimerRef.current = setTimeout(() => {
      const url = new URL(window.location.href);
      const targetT = Math.floor(seconds).toString();
      if (url.searchParams.get('t') !== targetT) {
        url.searchParams.set('t', targetT);
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (urlDebounceTimerRef.current) {
        clearTimeout(urlDebounceTimerRef.current);
      }
    };
  }, []);

  // Ensure initial URL parameter is reflected if starting from non-zero
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('t') && playlist.initialStartTime !== undefined && playlist.initialStartTime > 0) {
      updateUrlTimestamp(playlist.initialStartTime);
    }
  }, [playlist.initialStartTime, updateUrlTimestamp]);

  // Load initial completed state & last playback time
  const completedIds = useSyncExternalStore(
    subscribeCourses,
    useCallback(() => getCompletedChapterIdsSnapshot(playlist.video.id), [playlist.video.id]),
    getCompletedChapterIdsServerSnapshot
  );

  const completedIdsSet = useMemo(() => new Set(completedIds), [completedIds]);

  const lastSaveTimeRef = useRef<number>(0);

  // Ensure course is registered in storage if not already existing
  useEffect(() => {
    const existing = getSavedCourse(playlist.video.id);
    if (!existing) {
      const initialCourse: SavedCourse = {
        video: playlist.video,
        chapters: playlist.chapters,
        rawTimestampsText: playlist.rawTimestampsText || '',
        completedChapterIds: [],
        lastPlayedChapterIndex: playlist.initialChapterIndex ?? 0,
        lastPlayedSeconds: playlist.initialStartTime ?? 0,
        updatedAt: Date.now(),
      };
      saveCourse(initialCourse);
    }
  }, [playlist.video.id]);

  // Periodic throttling to save playback timestamp
  const handleTimeUpdate = useCallback(
    (seconds: number, chapterIndex: number) => {
      const now = Date.now();
      if (now - lastSaveTimeRef.current > 3000) {
        lastSaveTimeRef.current = now;
        updateCoursePlaybackProgress(playlist.video.id, chapterIndex, seconds);
      }
    },
    [playlist.video.id]
  );

  const handleChapterComplete = useCallback(
    (_chapterIndex: number, chapter: Chapter) => {
      markChapterCompleted(playlist.video.id, chapter.id);
    },
    [playlist.video.id]
  );

  const handleVideoEnded = useCallback(() => {
    // Mark final chapter as complete when full video ends
    if (playlist.chapters.length > 0) {
      const lastChapter = playlist.chapters[playlist.chapters.length - 1];
      markChapterCompleted(playlist.video.id, lastChapter.id);
    }
  }, [playlist.video.id, playlist.chapters]);

  const {
    isReady,
    isPlaying,
    isPlayLoading,
    currentTime,
    duration,
    playbackRate,
    currentChapterIndex,
    playerError,
    seekToChapter,
    seekBy,
    setPlaybackRate,
    play,
    pause,
  } = useYouTubePlayer({
    containerId,
    videoId: playlist.video.id,
    chapters: playlist.chapters,
    autoPlay: true,
    initialStartTime: playlist.initialStartTime ?? 0,
    initialChapterIndex: playlist.initialChapterIndex ?? 0,
    onChapterChange: (newIndex: number) => {
      const chap = playlist.chapters[newIndex];
      if (chap) {
        updateUrlTimestamp(chap.startTime);
      }
    },
    onTimeUpdate: handleTimeUpdate,
    onChapterComplete: handleChapterComplete,
    onEnded: handleVideoEnded,
  });

  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  // Sync fullscreen state across vendor implementations
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!(document.fullscreenElement || (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement);
      setIsFullscreen(isNowFullscreen);
      if (!isNowFullscreen) {
        try {
          if (screen.orientation && 'unlock' in screen.orientation) {
            (screen.orientation as { unlock: () => void }).unlock();
          }
        } catch {
          // ignore unlock errors
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Track portrait vs landscape to handle fullscreen rotation transforms
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== 'undefined') {
        setIsPortrait(window.innerHeight > window.innerWidth);
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Dismiss playback speed popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedMenuOpen(false);
      }
    };
    if (isSpeedMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSpeedMenuOpen]);

  const activeChapter: Chapter | undefined = playlist.chapters[currentChapterIndex];

  // Auto-scroll sidebar list so active chapter remains in view on desktop sidebar
  useEffect(() => {
    if (activeItemRef.current && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentChapterIndex]);

  const handleToggleComplete = (chapterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleChapterCompletion(playlist.video.id, chapterId);
  };

  const handlePreviousChapter = () => {
    if (currentChapterIndex > 0) {
      const targetIdx = currentChapterIndex - 1;
      seekToChapter(targetIdx);
      const chap = playlist.chapters[targetIdx];
      if (chap) updateUrlTimestamp(chap.startTime);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < playlist.chapters.length - 1) {
      const targetIdx = currentChapterIndex + 1;
      seekToChapter(targetIdx);
      const chap = playlist.chapters[targetIdx];
      if (chap) updateUrlTimestamp(chap.startTime);
    }
  };

  const handleSelectChapter = (idx: number) => {
    seekToChapter(idx);
    const chap = playlist.chapters[idx];
    if (chap) updateUrlTimestamp(chap.startTime);
  };

  const handleSeekBy = (deltaSeconds: number) => {
    const newTime = seekBy(deltaSeconds);
    updateUrlTimestamp(newTime);
  };

  const handleToggleFullscreen = async () => {
    const elem = playerWrapperRef.current;
    if (!elem) return;

    const doc = document as unknown as {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      exitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
    };

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      try {
        const elemWithVendor = elem as unknown as {
          requestFullscreen?: () => Promise<void>;
          webkitRequestFullscreen?: () => Promise<void>;
        };

        if (elemWithVendor.requestFullscreen) {
          await elemWithVendor.requestFullscreen();
        } else if (elemWithVendor.webkitRequestFullscreen) {
          await elemWithVendor.webkitRequestFullscreen();
        }

        // Lock landscape orientation on mobile devices supporting the Screen Orientation API
        if (screen.orientation && 'lock' in screen.orientation) {
          try {
            await (screen.orientation as unknown as { lock: (orientation: string) => Promise<void> }).lock('landscape');
          } catch {
            // Orientation lock may fail if unsupported or unpermitted
          }
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }
    } else {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        if (screen.orientation && 'unlock' in screen.orientation) {
          try {
            (screen.orientation as unknown as { unlock: () => void }).unlock();
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('Exit fullscreen failed:', err);
      }
    }
  };

  const handleCopyTimestamps = async () => {
    const text =
      playlist.rawTimestampsText ||
      playlist.chapters.map((c) => `${c.formattedTime} ${c.title}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTimestamps(true);
      setTimeout(() => setCopiedTimestamps(false), 2000);
    } catch (err) {
      console.warn('Failed to copy timestamps:', err);
    }
  };

  const completedCount = completedIds.length;
  const totalChapters = playlist.chapters.length;
  const progressPercentage = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  const isCurrentCompleted = activeChapter ? completedIdsSet.has(activeChapter.id) : false;
  const activeChapterEndTime = activeChapter
    ? Number.isFinite(activeChapter.endTime)
      ? activeChapter.endTime
      : duration > 0
      ? duration
      : activeChapter.startTime
    : 0;
  const activeChapterEndTimeFormatted =
    activeChapterEndTime > 0 ? secondsToTimestamp(Math.floor(activeChapterEndTime)) : 'End';
  const chapterDuration = activeChapter
    ? Math.max(1, activeChapterEndTime - activeChapter.startTime)
    : 1;
  const chapterProgressPercentage = activeChapter
    ? Math.min(100, Math.max(0, Math.round(((currentTime - activeChapter.startTime) / chapterDuration) * 100)))
    : 0;

  const channelUrl =
    playlist.video.channelUrl ||
    (playlist.video.channelId
      ? `https://www.youtube.com/channel/${playlist.video.channelId}`
      : `https://www.youtube.com/watch?v=${playlist.video.id}`);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 w-full pb-16">
      {/* Video Headline Header */}
      <div className="mb-4 sm:mb-6">
        {/* Breadcrumb above course title */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 mb-2 sm:mb-2.5 text-xs">
          <Link
            href="/"
            onClick={() => onReset?.()}
            className="inline-flex items-center gap-1.5 font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors py-1 px-1.5 -ml-1.5 rounded-md hover:bg-stone-200/60 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Back to Courses"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Courses</span>
          </Link>
          <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">/</span>
          <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 rounded-md text-2xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 font-mono font-tnum">
            Chapter {currentChapterIndex + 1} of {totalChapters}
          </span>
        </nav>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-medium text-stone-900 dark:text-stone-100 tracking-tight">
          {playlist.video.title}
        </h1>
        <div className="flex items-center gap-2 mt-1.5">
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Visit ${playlist.video.author || 'YouTube Channel'} on YouTube (opens in new tab)`}
            aria-label={`Visit ${playlist.video.author || 'YouTube Channel'} on YouTube (opens in new tab)`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded-xs group"
          >
            <span>By <span className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-primary dark:group-hover:text-emerald-400 transition-colors">{playlist.video.author || 'YouTube Channel'}</span></span>
            <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors shrink-0" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Responsive Layout: Sticky video on mobile, 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* Left Column: Video Player, Dedicated Controls & Current Chapter */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 sm:gap-4">
          {/* 16:9 Video Embed Container (Sticky below navbar on mobile) */}
          <div className="sticky top-14 sm:static z-20 bg-stone-50 dark:bg-stone-950 sm:bg-transparent py-0 -mx-3 sm:mx-0">
            <div
              ref={playerWrapperRef}
              className={`relative w-full aspect-video bg-black overflow-hidden ${
                isFullscreen
                  ? 'fixed inset-0 z-50 rounded-none w-screen h-screen flex items-center justify-center'
                  : 'rounded-none sm:rounded-xl shadow-none sm:shadow-xs border-0 sm:border border-stone-200 dark:border-stone-800'
              }`}
            >
              {/* Inner wrapper rotated 90deg when fullscreened on portrait viewports */}
              <div
                className="w-full h-full"
                style={
                  isFullscreen && isPortrait
                    ? {
                        position: 'absolute',
                        width: '100vh',
                        height: '100vw',
                        transform: 'translate(-50%, -50%) rotate(90deg)',
                        top: '50%',
                        left: '50%',
                      }
                    : undefined
                }
              >
                <div id={containerId} className="w-full h-full" />
                {!isReady && !playerError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900 text-white gap-3">
                    <Loader2 className="animate-spin h-7 w-7 sm:h-8 sm:w-8 text-emerald-500" aria-hidden="true" />
                    <span className="text-xs sm:text-sm font-medium text-white/80">Loading YouTube Player...</span>
                  </div>
                )}
                {playerError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/95 text-white p-4 sm:p-6 text-center gap-2 sm:gap-3 z-10">
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500" aria-hidden="true" />
                    <p className="text-xs sm:text-sm font-semibold max-w-md">{playerError}</p>
                    <a
                      href={`https://www.youtube.com/watch?v=${playlist.video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 sm:mt-2 inline-flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-md transition-colors min-h-11 touch-manipulation"
                    >
                      <span>Open directly on YouTube</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>

              {/* Floating Exit Button in Fullscreen Mode */}
              {isFullscreen && (
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="absolute top-4 right-4 z-50 inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/80 hover:bg-black text-white text-xs font-semibold rounded-full border border-white/20 shadow-md cursor-pointer touch-manipulation"
                  title="Exit Fullscreen"
                  aria-label="Exit Fullscreen"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>

          {/* Unified Current Chapter & Playback Controls Panel */}
          <section
            aria-label="Playback controls and active chapter info"
            className="bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-xs"
          >
            {/* Top row: Chapter metadata + Mark Complete toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-primary dark:text-emerald-400">
                    Chapter {currentChapterIndex + 1} of {totalChapters}
                  </span>
                  <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">•</span>
                  <span className="text-xs font-mono font-tnum text-stone-500 dark:text-stone-400">
                    {activeChapter ? activeChapter.formattedTime : '0:00'} → {activeChapterEndTimeFormatted}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 leading-snug break-words">
                  {activeChapter ? activeChapter.title : 'Playing Course'}
                </h2>
              </div>

              {/* Fast chapter completion check */}
              {activeChapter && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isCurrentCompleted}
                  onClick={(e) => handleToggleComplete(activeChapter.id, e)}
                  title={isCurrentCompleted ? 'Mark chapter as incomplete' : 'Mark chapter as completed'}
                  aria-label={isCurrentCompleted ? `Mark chapter ${currentChapterIndex + 1} as incomplete` : `Mark chapter ${currentChapterIndex + 1} as completed`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer min-h-9 touch-manipulation border shrink-0 focus:outline-none focus:ring-2 focus:ring-primary ${
                    isCurrentCompleted
                      ? 'bg-primary text-white border-primary'
                      : 'bg-stone-50 text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:bg-stone-950 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center ${
                      isCurrentCompleted
                        ? 'bg-white border-white text-primary'
                        : 'border-stone-400 dark:border-stone-600'
                    }`}
                  >
                    {isCurrentCompleted && (
                      <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
                    )}
                  </div>
                  <span>{isCurrentCompleted ? 'Completed' : 'Mark Complete'}</span>
                </button>
              )}
            </div>

            {/* Chapter Progress Track */}
            <div className="pt-0.5">
              <div
                role="progressbar"
                aria-valuenow={chapterProgressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Chapter progress"
                className="w-full h-1 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${chapterProgressPercentage}%` }}
                />
              </div>
            </div>

            {/* Bottom Controls Row: Live Time | Center Transport Cluster | Speed & Fullscreen */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2.5">
              {/* Status & Live Timestamp Display */}
              <div className="flex items-center gap-2 order-1 shrink-0">
                <span
                  className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400 dark:bg-stone-600'}`}
                  aria-hidden="true"
                />
                <div className="font-mono font-tnum text-xs text-stone-600 dark:text-stone-400 flex items-center gap-1">
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{secondsToTimestamp(Math.floor(currentTime))}</span>
                  <span className="text-stone-400 dark:text-stone-600">/</span>
                  <span>{secondsToTimestamp(Math.floor(duration))}</span>
                </div>
              </div>

              {/* Utility Actions: Playback Speed & Fullscreen */}
              <div className="flex items-center gap-1.5 order-2 sm:order-3 shrink-0">
                {/* Playback Speed Popover */}
                <div className="relative" ref={speedMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                    title="Playback Speed"
                    aria-label={`Playback speed: ${playbackRate}x`}
                    aria-haspopup="true"
                    aria-expanded={isSpeedMenuOpen}
                    aria-controls="speed-menu-dropdown"
                    className="h-9 px-2.5 inline-flex items-center gap-1 rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 text-xs font-semibold font-mono font-tnum transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <Zap className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" aria-hidden="true" />
                    <span>{playbackRate}x</span>
                    <ChevronDown className="w-3 h-3 text-stone-500 dark:text-stone-400" aria-hidden="true" />
                  </button>

                  {isSpeedMenuOpen && (
                    <div
                      id="speed-menu-dropdown"
                      role="menu"
                      aria-label="Playback speed options"
                      className="absolute right-0 bottom-full mb-1.5 w-28 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-lg py-1 z-30"
                    >
                      {[0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          role="menuitemradio"
                          aria-checked={playbackRate === rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            setIsSpeedMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs font-mono font-tnum flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer ${
                            playbackRate === rate ? 'text-primary dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50' : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          <span>{rate}x</span>
                          {playbackRate === rate && <Check className="w-3.5 h-3.5 text-primary dark:text-emerald-400" aria-hidden="true" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (Auto-rotates Landscape)'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-stone-50 hover:bg-stone-100 active:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-stone-600 dark:text-stone-400" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-stone-600 dark:text-stone-400" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Centered Primary Media Cluster */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 order-3 sm:order-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-stone-800">
                {/* Previous Chapter */}
                <button
                  type="button"
                  onClick={handlePreviousChapter}
                  disabled={currentChapterIndex <= 0}
                  title="Previous Chapter"
                  aria-label="Previous Chapter"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-stone-50 active:bg-stone-100 hover:bg-stone-100 dark:bg-stone-950 dark:active:bg-stone-800 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <SkipBack className="w-4 h-4 fill-current" aria-hidden="true" />
                </button>

                {/* Rewind 10s */}
                <button
                  type="button"
                  onClick={() => handleSeekBy(-10)}
                  title="Rewind 10 seconds"
                  aria-label="Rewind 10 seconds"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-stone-50 active:bg-stone-100 hover:bg-stone-100 dark:bg-stone-950 dark:active:bg-stone-800 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                </button>

                {/* Play / Pause Hero Button */}
                <button
                  type="button"
                  onClick={isPlaying ? pause : play}
                  disabled={isPlayLoading || !isReady}
                  aria-busy={isPlayLoading}
                  title={
                    isPlayLoading
                      ? isPlaying
                        ? 'Pausing video...'
                        : 'Playing video...'
                      : isPlaying
                      ? 'Pause video'
                      : 'Play video'
                  }
                  aria-label={
                    isPlayLoading
                      ? isPlaying
                        ? 'Pausing video'
                        : 'Playing video'
                      : isPlaying
                      ? 'Pause video'
                      : 'Play video'
                  }
                  className="h-9 w-20 sm:w-22 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary active:bg-primary-hover hover:bg-primary-hover text-white font-medium text-xs sm:text-sm transition-all shadow-xs touch-manipulation cursor-pointer active:scale-98 select-none disabled:opacity-75 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {isPlayLoading ? (
                    <Loader2 className="animate-spin w-3.5 h-3.5 shrink-0 text-white" aria-hidden="true" />
                  ) : isPlaying ? (
                    <Pause className="w-3.5 h-3.5 shrink-0 fill-current" aria-hidden="true" />
                  ) : (
                    <Play className="w-3.5 h-3.5 shrink-0 ml-0.5 fill-current" aria-hidden="true" />
                  )}
                  <span className="whitespace-nowrap">{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                {/* Forward 10s */}
                <button
                  type="button"
                  onClick={() => handleSeekBy(10)}
                  title="Forward 10 seconds"
                  aria-label="Forward 10 seconds"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-stone-50 active:bg-stone-100 hover:bg-stone-100 dark:bg-stone-950 dark:active:bg-stone-800 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <RotateCw className="w-4 h-4" aria-hidden="true" />
                </button>

                {/* Next Chapter */}
                <button
                  type="button"
                  onClick={handleNextChapter}
                  disabled={currentChapterIndex >= playlist.chapters.length - 1}
                  title="Next Chapter"
                  aria-label="Next Chapter"
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-stone-50 active:bg-stone-100 hover:bg-stone-100 dark:bg-stone-950 dark:active:bg-stone-800 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <SkipForward className="w-4 h-4 fill-current" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Interactive Playlist Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden flex flex-col shadow-xs lg:max-h-187.5">
          {/* Sidebar Header */}
          <div className="p-3 sm:p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100">Course Chapters</h2>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {completedCount} of {totalChapters} completed
                </p>
              </div>
              <span className="text-xs sm:text-sm font-mono font-tnum font-semibold text-primary dark:text-emerald-400">
                {progressPercentage}%
              </span>
            </div>
            {/* Course Progress Bar */}
            <div
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Course completion progress"
              className="w-full h-1.5 sm:h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Interactive Chapter List with accessible buttons */}
          <ol
            ref={sidebarListRef}
            role="list"
            aria-label="Course chapters"
            className="overflow-y-auto p-1.5 sm:p-2 divide-y divide-stone-200 dark:divide-stone-800 max-h-125 sm:max-h-150 flex-1"
          >
            {playlist.chapters.map((chap, idx) => {
              const isActive = idx === currentChapterIndex;
              const isCompleted = completedIdsSet.has(chap.id);

              return (
                <li
                  key={chap.id}
                  ref={isActive ? (node) => { activeItemRef.current = node; } : undefined}
                  className={`w-full p-2 sm:p-2.5 rounded-lg transition-all flex items-center gap-2 sm:gap-2.5 my-0.5 min-h-13 ${
                    isActive
                      ? 'bg-stone-100 dark:bg-stone-800/80 border border-primary dark:border-emerald-500 shadow-xs'
                      : 'hover:bg-stone-50 dark:hover:bg-stone-800/50 border border-transparent'
                  }`}
                >
                  {/* Manual Completion Checkbox button with full 44px+ tap zone */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isCompleted}
                    onClick={(e) => handleToggleComplete(chap.id, e)}
                    title={isCompleted ? 'Mark chapter as incomplete' : 'Mark chapter as completed'}
                    aria-label={isCompleted ? `Mark chapter ${chap.index}: ${chap.title} as incomplete` : `Mark chapter ${chap.index}: ${chap.title} as completed`}
                    className="shrink-0 w-10 h-10 flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                  >
                    <div
                      className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-primary border-primary text-white'
                          : 'bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600'
                      }`}
                    >
                      {isCompleted && (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  {/* Primary Chapter Select Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(idx)}
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={`Play chapter ${chap.index}: ${chap.title}, timestamp ${chap.formattedTime}${isCompleted ? ', completed' : ''}`}
                    className="flex-1 min-w-0 text-left flex items-center gap-2.5 sm:gap-3 cursor-pointer touch-manipulation active:scale-98 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 -m-1"
                  >
                    {/* Index Badge */}
                    <div
                      className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : isCompleted
                          ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                          : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                      aria-hidden="true"
                    >
                      {isActive ? (
                        <Play className="w-3 h-3 fill-current ml-0.5 animate-pulse text-white" aria-hidden="true" />
                      ) : (
                        <span>{chap.index}</span>
                      )}
                    </div>

                    {/* Chapter Info */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm leading-snug break-words transition-opacity line-clamp-2 ${
                          isCompleted ? 'text-stone-500 line-through decoration-stone-400 dark:text-stone-500 dark:decoration-stone-600' : 'text-stone-900 dark:text-stone-100'
                        } ${isActive ? 'font-semibold' : 'font-normal'}`}
                      >
                        {chap.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                        <span
                          className={`text-xs font-mono font-tnum px-1.5 py-0.5 rounded-sm border ${
                            isActive
                              ? 'bg-white border-primary/30 text-primary font-medium dark:bg-stone-900 dark:border-emerald-500/30 dark:text-emerald-400'
                              : 'bg-white border-stone-200 text-stone-600 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-400'
                          }`}
                        >
                          {chap.formattedTime}
                        </span>
                        {isActive && (
                          <span className="text-2xs sm:text-xs font-medium text-primary dark:text-emerald-400">
                            Now playing
                          </span>
                        )}
                        {isCompleted && !isActive && (
                          <span className="text-2xs sm:text-xs font-medium text-stone-600 dark:text-stone-400">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Course Resources & Timestamps Section */}
      <section aria-label="Course resources and timestamps" className="mt-6 sm:mt-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100">Course Timestamps & Source</h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">Review structured timestamps or open the original video on YouTube.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`https://www.youtube.com/watch?v=${playlist.video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch ${playlist.video.title} on YouTube (opens in new tab)`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-900 dark:text-stone-100 bg-stone-50 hover:bg-stone-100 active:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors min-h-9 touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>Watch on YouTube</span>
              <ExternalLink className="w-3.5 h-3.5 text-stone-500" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={handleCopyTimestamps}
              aria-label={copiedTimestamps ? 'Course timestamps copied to clipboard' : 'Copy course timestamps to clipboard'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-900 dark:text-stone-100 bg-stone-50 hover:bg-stone-100 active:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors min-h-9 cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {copiedTimestamps ? (
                <>
                  <Check className="w-3.5 h-3.5 text-primary dark:text-emerald-400" aria-hidden="true" />
                  <span className="text-primary dark:text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <span>Copy Timestamps</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowRawTimestamps(!showRawTimestamps)}
              aria-expanded={showRawTimestamps}
              aria-controls="raw-timestamps-pre"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg transition-colors min-h-9 cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <span>{showRawTimestamps ? 'Hide' : 'View Raw'}</span>
            </button>
          </div>
        </div>

        {showRawTimestamps && (
          <pre
            id="raw-timestamps-pre"
            tabIndex={0}
            aria-label="Course raw timestamps"
            className="mt-3 p-3.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg text-xs font-mono font-tnum text-stone-600 dark:text-stone-300 overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {playlist.rawTimestampsText || playlist.chapters.map(c => `${c.formattedTime} ${c.title}`).join('\n')}
          </pre>
        )}
      </section>
    </div>
  );
}
