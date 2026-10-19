'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
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
  onReset: () => void;
}

export function PlaylistView({ playlist, onReset }: PlaylistViewProps) {
  const containerId = 'youtube-active-player';
  const sidebarListRef = useRef<HTMLOListElement>(null);
  const activeItemRef = useRef<HTMLLIElement | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
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

  // Auto-scroll sidebar list so active chapter remains in view
  useEffect(() => {
    if (activeItemRef.current) {
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

  const handleCopyShareLink = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn('Failed to copy link:', err);
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

  const isCurrentCompleted = activeChapter ? completedIds.includes(activeChapter.id) : false;
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

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 w-full pb-16">
      {/* Video Headline Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#57534e] hover:text-[#0d5c46] cursor-pointer min-h-[36px] touch-manipulation"
          >
            <span>← Back to URL input</span>
          </button>
          <span className="text-xs text-[#d6d3d1]">•</span>
          <span className="px-2 py-0.5 bg-[#ffffff] border border-[#e7e5e4] rounded-[6px] text-xs font-semibold uppercase tracking-[1px] text-[#57534e]">
            Ch. {currentChapterIndex + 1} of {totalChapters}
          </span>
        </div>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-medium text-[#1c1917] tracking-tight">
          {playlist.video.title}
        </h1>
        {playlist.video.author && (
          <p className="text-xs sm:text-sm text-[#57534e] mt-0.5">By {playlist.video.author}</p>
        )}
      </div>

      {/* Responsive Layout: Sticky video on mobile, 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* Left Column: Video Player, Dedicated Controls & Current Chapter */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 sm:gap-4">
          {/* 16:9 Video Embed Container (Sticky below navbar on mobile) */}
          <div className="sticky top-14 sm:static z-20 bg-[#fafaf9] pt-1 pb-1 sm:py-0">
            <div
              ref={playerWrapperRef}
              className={`relative w-full aspect-video bg-[#000000] overflow-hidden ${
                isFullscreen
                  ? 'fixed inset-0 z-50 rounded-none w-screen h-screen flex items-center justify-center'
                  : 'rounded-[10px] sm:rounded-[12px] shadow-xs border border-[#e7e5e4]'
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c1917] text-[#ffffff] gap-3">
                    <svg className="animate-spin h-7 w-7 sm:h-8 sm:w-8 text-[#10b981]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs sm:text-sm font-medium text-[#ffffff]/80">Loading YouTube Player...</span>
                  </div>
                )}
                {playerError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c1917]/95 text-[#ffffff] p-4 sm:p-6 text-center gap-2 sm:gap-3 z-10">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs sm:text-sm font-semibold max-w-md">{playerError}</p>
                    <a
                      href={`https://www.youtube.com/watch?v=${playlist.video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 sm:mt-2 inline-flex items-center gap-2 px-3 py-2 bg-[#0d5c46] hover:bg-[#0a4635] text-white text-xs font-semibold rounded-[6px] transition-colors min-h-[44px] touch-manipulation"
                    >
                      <span>Open directly on YouTube</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 1: Dedicated Compact Video Player Controls */}
          <section
            aria-label="Video Player Controls"
            className="bg-[#ffffff] border border-[#e7e5e4] rounded-[10px] sm:rounded-[12px] p-2.5 sm:p-3 shadow-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
              {/* Status & Live Timestamp Display */}
              <div className="flex items-center gap-2 order-1 shrink-0">
                <span
                  className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-[#10b981] animate-pulse' : 'bg-[#a8a29e]'}`}
                  aria-hidden="true"
                />
                <div className="font-mono text-xs text-[#57534e] flex items-center gap-1">
                  <span className="font-semibold text-[#1c1917]">{secondsToTimestamp(Math.floor(currentTime))}</span>
                  <span className="text-[#a8a29e]">/</span>
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
                    className="h-10 px-2.5 inline-flex items-center gap-1 rounded-[8px] sm:rounded-[10px] bg-[#fafaf9] hover:bg-[#f5f5f4] active:bg-[#f5f5f4] border border-[#e7e5e4] text-[#1c1917] text-xs font-semibold font-mono transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
                  >
                    <svg className="w-3.5 h-3.5 text-[#57534e]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{playbackRate}x</span>
                    <svg className="w-3 h-3 text-[#78716c]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isSpeedMenuOpen && (
                    <div
                      id="speed-menu-dropdown"
                      role="menu"
                      aria-label="Playback speed options"
                      className="absolute right-0 bottom-full mb-1.5 w-28 bg-[#ffffff] border border-[#e7e5e4] rounded-[10px] shadow-lg py-1 z-30"
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
                          className={`w-full text-left px-3 py-1.5 text-xs font-mono flex items-center justify-between hover:bg-[#fafaf9] transition-colors cursor-pointer ${
                            playbackRate === rate ? 'text-[#0d5c46] font-bold bg-[#f0fdf4]' : 'text-[#1c1917]'
                          }`}
                        >
                          <span>{rate}x</span>
                          {playbackRate === rate && <span aria-hidden="true">✓</span>}
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
                  className="h-10 w-10 inline-flex items-center justify-center rounded-[8px] sm:rounded-[10px] bg-[#fafaf9] hover:bg-[#f5f5f4] active:bg-[#f5f5f4] border border-[#e7e5e4] text-[#1c1917] transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
                >
                  {isFullscreen ? (
                    <svg className="w-4 h-4 text-[#57534e]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-[#57534e]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Centered Primary Media Cluster */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 order-3 sm:order-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[#f5f5f4]">
                {/* Previous Chapter */}
                <button
                  type="button"
                  onClick={handlePreviousChapter}
                  disabled={currentChapterIndex <= 0}
                  title="Previous Chapter"
                  aria-label="Previous Chapter"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-[8px] sm:rounded-[10px] bg-[#fafaf9] active:bg-[#f5f5f4] hover:bg-[#f5f5f4] border border-[#e7e5e4] text-[#1c1917] disabled:opacity-35 disabled:cursor-not-allowed transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                {/* Rewind 10s */}
                <button
                  type="button"
                  onClick={() => handleSeekBy(-10)}
                  title="Rewind 10 seconds"
                  aria-label="Rewind 10 seconds"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-[8px] sm:rounded-[10px] bg-[#fafaf9] active:bg-[#f5f5f4] hover:bg-[#f5f5f4] border border-[#e7e5e4] text-[#1c1917] transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
                >
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 3v5h5"
                    />
                    <text
                      x="12"
                      y="12.5"
                      dominantBaseline="central"
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      stroke="none"
                      fill="currentColor"
                    >
                      10
                    </text>
                  </svg>
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
                  className="h-10 w-[84px] sm:w-[92px] shrink-0 inline-flex items-center justify-center gap-1.5 rounded-[8px] sm:rounded-[10px] bg-[#0d5c46] active:bg-[#0a4635] hover:bg-[#0a4635] text-white font-medium text-xs sm:text-sm transition-all shadow-xs touch-manipulation cursor-pointer active:scale-[0.98] select-none disabled:opacity-75 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
                >
                  {isPlayLoading ? (
                    <svg className="animate-spin w-3.5 h-3.5 shrink-0 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : isPlaying ? (
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 shrink-0 ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                  <span className="whitespace-nowrap">{isPlaying ? 'Pause' : 'Play'}</span>
                </button>

                {/* Forward 10s */}
                <button
                  type="button"
                  onClick={() => handleSeekBy(10)}
                  title="Forward 10 seconds"
                  aria-label="Forward 10 seconds"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-[8px] sm:rounded-[10px] bg-[#fafaf9] active:bg-[#f5f5f4] hover:bg-[#f5f5f4] border border-[#e7e5e4] text-[#1c1917] transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
                >
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M21 3v5h-5"
                    />
                    <text
                      x="12"
                      y="12.5"
                      dominantBaseline="central"
                      textAnchor="middle"
                      fontSize="7.5"
                      fontWeight="700"
                      stroke="none"
                      fill="currentColor"
                    >
                      10
                    </text>
                  </svg>
                </button>

                {/* Next Chapter */}
                <button
                  type="button"
                  onClick={handleNextChapter}
                  disabled={currentChapterIndex >= playlist.chapters.length - 1}
                  title="Next Chapter"
                  aria-label="Next Chapter"
                  className="h-10 w-10 inline-flex items-center justify-center rounded-[8px] sm:rounded-[10px] bg-[#fafaf9] active:bg-[#f5f5f4] hover:bg-[#f5f5f4] border border-[#e7e5e4] text-[#1c1917] disabled:opacity-35 disabled:cursor-not-allowed transition-colors touch-manipulation cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Dedicated Current Chapter Information Card */}
          <section
            aria-label="Current Chapter Info"
            className="bg-[#ffffff] border border-[#e7e5e4] rounded-[10px] sm:rounded-[12px] p-3 sm:p-4 flex flex-col gap-2.5 shadow-xs"
          >
            {/* Header row: Chapter index & Completion toggle */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#f0fdf4] text-[#0d5c46] border border-[#bbf7d0] rounded-[6px] text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.5px]">
                  Current Chapter
                </span>
                <span className="text-xs text-[#57534e] font-medium">
                  Chapter {currentChapterIndex + 1} of {totalChapters}
                </span>
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
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer min-h-[36px] touch-manipulation border focus:outline-none focus:ring-2 focus:ring-[#0d5c46] ${
                    isCurrentCompleted
                      ? 'bg-[#0d5c46] text-white border-[#0d5c46]'
                      : 'bg-[#fafaf9] text-[#57534e] hover:text-[#1c1917] hover:bg-[#f5f5f4] border-[#e7e5e4]'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center ${
                      isCurrentCompleted
                        ? 'bg-white border-white text-[#0d5c46]'
                        : 'border-[#a8a29e]'
                    }`}
                  >
                    {isCurrentCompleted && (
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span>{isCurrentCompleted ? 'Completed' : 'Mark Complete'}</span>
                </button>
              )}
            </div>

            {/* Chapter Title */}
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-[#1c1917] leading-snug break-words">
                {activeChapter ? activeChapter.title : 'Playing Course Video'}
              </h2>
            </div>

            {/* Chapter Timing & Progress Bar */}
            <div className="pt-0.5">
              <div className="flex items-center justify-between text-[11px] sm:text-xs text-[#57534e] mb-1 font-mono">
                <span>
                  {activeChapter ? activeChapter.formattedTime : '0:00'}
                  {' → '}
                  {activeChapterEndTimeFormatted}
                </span>
                <span className="text-[#1c1917] font-semibold">
                  {chapterProgressPercentage}% through chapter
                </span>
              </div>

              {/* Chapter Progress Track */}
              <div
                role="progressbar"
                aria-valuenow={chapterProgressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Chapter progress"
                className="w-full h-1.5 bg-[#f5f5f4] rounded-full overflow-hidden border border-[#e7e5e4]"
              >
                <div
                  className="h-full bg-[#0d5c46] transition-all duration-300 rounded-full"
                  style={{ width: `${chapterProgressPercentage}%` }}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Interactive Playlist Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 bg-[#ffffff] border border-[#e7e5e4] rounded-[12px] overflow-hidden flex flex-col shadow-xs lg:max-h-[750px]">
          {/* Sidebar Header */}
          <div className="p-3 sm:p-4 border-b border-[#e7e5e4] bg-[#fafaf9]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[#1c1917]">Course Chapters</h2>
                <p className="text-[11px] sm:text-xs text-[#57534e]">
                  {completedCount} of {totalChapters} completed
                </p>
              </div>
              <span className="text-xs sm:text-sm font-mono font-semibold text-[#0d5c46]">
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
              className="w-full h-1.5 sm:h-2 bg-[#e7e5e4] rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-[#0d5c46] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Interactive Chapter List with accessible buttons */}
          <ol
            ref={sidebarListRef}
            role="list"
            aria-label="Course chapters"
            className="overflow-y-auto p-1.5 sm:p-2 divide-y divide-[#e7e5e4] max-h-[500px] sm:max-h-[600px] flex-1"
          >
            {playlist.chapters.map((chap, idx) => {
              const isActive = idx === currentChapterIndex;
              const isCompleted = completedIds.includes(chap.id);

              return (
                <li
                  key={chap.id}
                  ref={isActive ? (node) => { activeItemRef.current = node; } : undefined}
                  className={`w-full p-2 sm:p-2.5 rounded-[8px] transition-all flex items-center gap-2 sm:gap-2.5 my-0.5 min-h-[52px] ${
                    isActive
                      ? 'bg-[#f5f5f4] border border-[#0d5c46] shadow-xs'
                      : 'hover:bg-[#fafaf9] border border-transparent'
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
                    className="shrink-0 w-10 h-10 flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#0d5c46] rounded-[6px]"
                  >
                    <div
                      className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-[#0d5c46] border-[#0d5c46] text-white'
                          : 'bg-[#ffffff] border-[#d6d3d1] hover:border-[#a8a29e]'
                      }`}
                    >
                      {isCompleted && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Primary Chapter Select Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(idx)}
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={`Play chapter ${chap.index}: ${chap.title}, timestamp ${chap.formattedTime}${isCompleted ? ', completed' : ''}`}
                    className="flex-1 min-w-0 text-left flex items-center gap-2.5 sm:gap-3 cursor-pointer touch-manipulation active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#0d5c46] rounded-[6px] p-1 -m-1"
                  >
                    {/* Index Badge */}
                    <div
                      className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-[6px] text-xs font-semibold flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-[#0d5c46] text-white'
                          : isCompleted
                          ? 'bg-[#f5f5f4] text-[#57534e]'
                          : 'bg-[#f5f5f4] text-[#57534e]'
                      }`}
                      aria-hidden="true"
                    >
                      {isActive ? (
                        <span className="animate-pulse">▶</span>
                      ) : (
                        <span>{chap.index}</span>
                      )}
                    </div>

                    {/* Chapter Info */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm leading-snug break-words transition-opacity line-clamp-2 ${
                          isCompleted ? 'text-[#78716c] line-through decoration-[#a8a29e]' : 'text-[#1c1917]'
                        } ${isActive ? 'font-semibold' : 'font-normal'}`}
                      >
                        {chap.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                        <span
                          className={`text-[11px] sm:text-xs font-mono px-1.5 py-0.5 rounded-[4px] border ${
                            isActive
                              ? 'bg-[#ffffff] border-[#0d5c46]/30 text-[#0d5c46] font-medium'
                              : 'bg-[#ffffff] border-[#e7e5e4] text-[#57534e]'
                          }`}
                        >
                          {chap.formattedTime}
                        </span>
                        {isActive && (
                          <span className="text-[10px] sm:text-[11px] font-medium text-[#0d5c46]">
                            Now playing
                          </span>
                        )}
                        {isCompleted && !isActive && (
                          <span className="text-[10px] sm:text-[11px] font-medium text-[#57534e]">
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

      {/* Course Details & Sharing Section */}
      <section aria-label="Course details and sharing" className="mt-6 sm:mt-8 bg-[#ffffff] border border-[#e7e5e4] rounded-[12px] p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e7e5e4]">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[#1c1917]">Course Details</h2>
            <p className="text-xs text-[#57534e]">Bookmark this page or share the link to resume directly at the active timestamp.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyShareLink}
              aria-label={copiedLink ? 'Course bookmark link copied to clipboard' : 'Copy bookmark link to clipboard'}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0d5c46] hover:bg-[#0a4635] active:bg-[#0a4635] rounded-[8px] transition-colors cursor-pointer min-h-[40px] touch-manipulation shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
            >
              {copiedLink ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy Bookmark Link</span>
                </>
              )}
            </button>

            <a
              href={`https://www.youtube.com/watch?v=${playlist.video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch ${playlist.video.title} on YouTube (opens in new tab)`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1c1917] bg-[#ffffff] hover:bg-[#f5f5f4] active:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[8px] transition-colors min-h-[40px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
            >
              <span>Watch on YouTube</span>
              <svg className="w-3.5 h-3.5 text-[#57534e]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Course Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b border-[#e7e5e4] text-xs">
          <div className="bg-[#fafaf9] p-3 rounded-[8px] border border-[#e7e5e4]">
            <span className="text-[#57534e] block text-[11px]">Total Chapters</span>
            <span className="font-semibold text-sm text-[#1c1917]">{totalChapters}</span>
          </div>
          <div className="bg-[#fafaf9] p-3 rounded-[8px] border border-[#e7e5e4]">
            <span className="text-[#57534e] block text-[11px]">Completed</span>
            <span className="font-semibold text-sm text-[#0d5c46]">{completedCount} ({progressPercentage}%)</span>
          </div>
          <div className="bg-[#fafaf9] p-3 rounded-[8px] border border-[#e7e5e4]">
            <span className="text-[#57534e] block text-[11px]">Duration</span>
            <span className="font-semibold text-sm text-[#1c1917] font-mono">
              {duration > 0 ? secondsToTimestamp(Math.floor(duration)) : 'Auto-detected'}
            </span>
          </div>
          <div className="bg-[#fafaf9] p-3 rounded-[8px] border border-[#e7e5e4]">
            <span className="text-[#57534e] block text-[11px]">Storage Status</span>
            <span className="font-semibold text-sm text-[#1c1917]">IndexedDB (Saved)</span>
          </div>
        </div>

        {/* Timestamps & Description Section */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#1c1917]">Course Timestamps & Description</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyTimestamps}
                aria-label={copiedTimestamps ? 'Course timestamps copied to clipboard' : 'Copy course timestamps to clipboard'}
                className="text-xs font-medium text-[#0d5c46] hover:underline cursor-pointer flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-[#0d5c46]"
              >
                {copiedTimestamps ? '✓ Timestamps Copied' : 'Copy Timestamps'}
              </button>
              <span className="text-[#d6d3d1]" aria-hidden="true">•</span>
              <button
                type="button"
                onClick={() => setShowRawTimestamps(!showRawTimestamps)}
                aria-expanded={showRawTimestamps}
                aria-controls="raw-timestamps-pre"
                className="text-xs font-medium text-[#57534e] hover:text-[#1c1917] underline cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#0d5c46]"
              >
                {showRawTimestamps ? 'Hide' : 'View Raw'}
              </button>
            </div>
          </div>

          {showRawTimestamps && (
            <pre
              id="raw-timestamps-pre"
              tabIndex={0}
              aria-label="Course raw timestamps"
              className="p-3.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-[8px] text-[11px] sm:text-xs font-mono text-[#57534e] overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0d5c46]"
            >
              {playlist.rawTimestampsText || playlist.chapters.map(c => `${c.formattedTime} ${c.title}`).join('\n')}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}
