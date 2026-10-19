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
  const sidebarListRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTimestamps, setCopiedTimestamps] = useState(false);
  const [showRawTimestamps, setShowRawTimestamps] = useState(false);

  // Sync timestamp directly to browser URL query parameter (?t=seconds)
  const updateUrlTimestamp = useCallback((seconds: number) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const targetT = Math.floor(seconds).toString();
    if (url.searchParams.get('t') !== targetT) {
      url.searchParams.set('t', targetT);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
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
    currentTime,
    duration,
    currentChapterIndex,
    playerError,
    seekToChapter,
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
        {/* Left Column: Video Player & Control Panel (Sticky on mobile) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 sm:gap-4 sticky top-14 sm:static z-20 bg-[#fafaf9] pt-1 pb-2 sm:py-0 border-b lg:border-b-0 border-[#e7e5e4]">
          {/* 16:9 Video Embed Container */}
          <div className="relative w-full aspect-video bg-[#000000] rounded-[10px] sm:rounded-[12px] overflow-hidden shadow-xs border border-[#e7e5e4]">
            <div id={containerId} className="w-full h-full" />
            {!isReady && !playerError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c1917] text-[#ffffff] gap-3">
                <svg className="animate-spin h-7 w-7 sm:h-8 sm:w-8 text-[#10b981]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs sm:text-sm font-medium text-[#ffffff]/80">Loading YouTube Player...</span>
              </div>
            )}
            {playerError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1c1917]/95 text-[#ffffff] p-4 sm:p-6 text-center gap-2 sm:gap-3 z-10">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* Quick Playback Bar */}
          <div className="bg-[#ffffff] border border-[#e7e5e4] rounded-[10px] sm:rounded-[12px] p-2.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
            {/* Current Chapter Info */}
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.5px] text-[#0d5c46] block">
                Current
              </span>
              <p className="font-semibold text-xs sm:text-base text-[#1c1917] truncate">
                {activeChapter ? activeChapter.title : 'Playing'}
              </p>
              <p className="text-[11px] sm:text-xs text-[#57534e] font-mono mt-0.5">
                {secondsToTimestamp(Math.floor(currentTime))} / {secondsToTimestamp(Math.floor(duration))}
              </p>
            </div>

            {/* Controls with touch-friendly 48px targets */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePreviousChapter}
                disabled={currentChapterIndex <= 0}
                title="Previous Chapter"
                className="w-11 h-11 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-[10px] sm:rounded-[12px] bg-[#fafaf9] active:bg-[#f5f5f4] border border-[#e7e5e4] text-[#1c1917] hover:bg-[#f5f5f4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={isPlaying ? pause : play}
                title={isPlaying ? 'Pause' : 'Play'}
                className="min-h-[44px] min-w-[76px] sm:min-w-[88px] px-3 sm:px-4 inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-[10px] sm:rounded-[12px] bg-[#0d5c46] active:bg-[#0a4635] hover:bg-[#0a4635] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs touch-manipulation cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNextChapter}
                disabled={currentChapterIndex >= playlist.chapters.length - 1}
                title="Next Chapter"
                className="w-11 h-11 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-[10px] sm:rounded-[12px] bg-[#fafaf9] active:bg-[#f5f5f4] border border-[#e7e5e4] text-[#1c1917] hover:bg-[#f5f5f4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
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
            <div className="w-full h-1.5 sm:h-2 bg-[#e7e5e4] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0d5c46] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Interactive Chapter List with 48px+ touch targets */}
          <div
            ref={sidebarListRef}
            className="overflow-y-auto p-1.5 sm:p-2 divide-y divide-[#e7e5e4] max-h-[500px] sm:max-h-[600px] flex-1"
          >
            {playlist.chapters.map((chap, idx) => {
              const isActive = idx === currentChapterIndex;
              const isCompleted = completedIds.includes(chap.id);

              return (
                <div
                  key={chap.id}
                  ref={isActive ? (node) => { activeItemRef.current = node; } : undefined}
                  onClick={() => handleSelectChapter(idx)}
                  className={`w-full text-left p-2.5 sm:p-3 rounded-[8px] transition-all flex items-center gap-2.5 sm:gap-3 my-0.5 cursor-pointer min-h-[52px] touch-manipulation active:scale-[0.99] ${
                    isActive
                      ? 'bg-[#f5f5f4] border border-[#0d5c46] shadow-xs'
                      : 'hover:bg-[#fafaf9] border border-transparent'
                  }`}
                >
                  {/* Manual Completion Checkbox with full 48px touch zone */}
                  <div
                    onClick={(e) => handleToggleComplete(chap.id, e)}
                    className="shrink-0 w-11 h-11 -ml-1 flex items-center justify-center cursor-pointer touch-manipulation"
                    title={isCompleted ? 'Mark chapter as incomplete' : 'Mark chapter as completed'}
                  >
                    <div
                      className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-[#0d5c46] border-[#0d5c46] text-white'
                          : 'bg-[#ffffff] border-[#d6d3d1] hover:border-[#a8a29e]'
                      }`}
                    >
                      {isCompleted && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Index Badge */}
                  <div
                    className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-[6px] text-xs font-semibold flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-[#0d5c46] text-white'
                        : isCompleted
                        ? 'bg-[#f5f5f4] text-[#57534e]'
                        : 'bg-[#f5f5f4] text-[#57534e]'
                    }`}
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
                        isCompleted ? 'text-[#a8a29e] line-through decoration-[#d6d3d1]' : 'text-[#1c1917]'
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
                </div>
              );
            })}
          </div>
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
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0d5c46] hover:bg-[#0a4635] active:bg-[#0a4635] rounded-[8px] transition-colors cursor-pointer min-h-[40px] touch-manipulation shadow-2xs"
            >
              {copiedLink ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1c1917] bg-[#ffffff] hover:bg-[#f5f5f4] active:bg-[#f5f5f4] border border-[#e7e5e4] rounded-[8px] transition-colors min-h-[40px] touch-manipulation"
            >
              <span>Watch on YouTube</span>
              <svg className="w-3.5 h-3.5 text-[#57534e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="text-xs font-medium text-[#0d5c46] hover:underline cursor-pointer flex items-center gap-1"
              >
                {copiedTimestamps ? '✓ Timestamps Copied' : 'Copy Timestamps'}
              </button>
              <span className="text-[#d6d3d1]">•</span>
              <button
                type="button"
                onClick={() => setShowRawTimestamps(!showRawTimestamps)}
                className="text-xs font-medium text-[#57534e] hover:text-[#1c1917] underline cursor-pointer"
              >
                {showRawTimestamps ? 'Hide' : 'View Raw'}
              </button>
            </div>
          </div>

          {showRawTimestamps && (
            <pre className="p-3.5 bg-[#fafaf9] border border-[#e7e5e4] rounded-[8px] text-[11px] sm:text-xs font-mono text-[#57534e] overflow-x-auto max-h-56 whitespace-pre-wrap leading-relaxed">
              {playlist.rawTimestampsText || playlist.chapters.map(c => `${c.formattedTime} ${c.title}`).join('\n')}
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}
