'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Chapter, ParsedPlaylist, SavedCourse } from '../types/playlist';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { secondsToTimestamp } from '../lib/youtubeParser';
import {
  saveCourse,
  getSavedCourse,
  updateCoursePlaybackProgress,
  toggleChapterCompletion,
} from '../lib/storage';

interface PlaylistViewProps {
  playlist: ParsedPlaylist;
  onReset: () => void;
}

export function PlaylistView({ playlist, onReset }: PlaylistViewProps) {
  const containerId = 'youtube-active-player';
  const sidebarListRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  // Load initial completed state & last playback time
  const [completedIds, setCompletedIds] = useState<string[]>(() => {
    const existing = getSavedCourse(playlist.video.id);
    return existing ? existing.completedChapterIds : [];
  });

  const lastSaveTimeRef = useRef<number>(0);

  // Ensure course is registered in storage
  useEffect(() => {
    const initialCourse: SavedCourse = {
      video: playlist.video,
      chapters: playlist.chapters,
      rawTimestampsText: playlist.rawTimestampsText || '',
      completedChapterIds: completedIds,
      lastPlayedChapterIndex: playlist.initialChapterIndex ?? 0,
      lastPlayedSeconds: playlist.initialStartTime ?? 0,
      updatedAt: Date.now(),
    };
    saveCourse(initialCourse);
  }, [playlist, completedIds]);

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
    onTimeUpdate: handleTimeUpdate,
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
    const updated = toggleChapterCompletion(playlist.video.id, chapterId);
    if (updated) {
      setCompletedIds([...updated.completedChapterIds]);
    } else {
      setCompletedIds((prev) =>
        prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId]
      );
    }
  };

  const handlePreviousChapter = () => {
    if (currentChapterIndex > 0) {
      seekToChapter(currentChapterIndex - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < playlist.chapters.length - 1) {
      seekToChapter(currentChapterIndex + 1);
    }
  };

  const completedCount = completedIds.length;
  const totalChapters = playlist.chapters.length;
  const progressPercentage = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
      {/* Video Headline Header & Course Progress */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#605d52] hover:text-[#ff4f00] cursor-pointer"
            >
              <span>← Back to URL input</span>
            </button>
            <span className="text-xs text-[#c5c0b1]">•</span>
            <span className="px-2 py-0.5 bg-[#f8f4f0] border border-[#c5c0b1]/60 rounded-[6px] text-xs font-semibold uppercase tracking-[1px] text-[#605d52]">
              Chapter {currentChapterIndex + 1} of {totalChapters}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-medium text-[#201515] tracking-tight truncate">
            {playlist.video.title}
          </h1>
          {playlist.video.author && (
            <p className="text-sm text-[#605d52] mt-0.5">By {playlist.video.author}</p>
          )}
        </div>

        {/* Course Progress Card */}
        <div className="bg-[#f8f4f0] border border-[#c5c0b1]/70 rounded-[12px] p-3 sm:p-4 shrink-0 min-w-[240px] md:w-72">
          <div className="flex items-center justify-between text-xs font-semibold text-[#201515] mb-1.5">
            <span>Course Progress</span>
            <span className="text-[#ff4f00] font-mono">{progressPercentage}%</span>
          </div>
          <div className="w-full h-2 bg-[#e7e2d7] rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-[#ff4f00] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-[#605d52]">
            {completedCount} of {totalChapters} chapters completed
          </p>
        </div>
      </div>

      {/* Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Video Player & Control Panel (7-8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          {/* 16:9 Video Embed Container */}
          <div className="relative w-full aspect-video bg-[#201515] rounded-[12px] overflow-hidden shadow-sm border border-[#c5c0b1]/40">
            <div id={containerId} className="w-full h-full" />
            {!isReady && !playerError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#201515] text-[#fffefb] gap-3">
                <svg className="animate-spin h-8 w-8 text-[#ff4f00]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-[#fffefb]/80">Loading YouTube Player...</span>
              </div>
            )}
            {playerError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#201515]/95 text-[#fffefb] p-6 text-center gap-3 z-10">
                <svg className="w-10 h-10 text-[#ff4f00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-semibold max-w-md">{playerError}</p>
                <a
                  href={`https://www.youtube.com/watch?v=${playlist.video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#ff4f00] hover:bg-[#e04500] text-[#fffefb] text-xs font-semibold rounded-[6px] transition-colors"
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
          <div className="bg-[#f8f4f0] border border-[#c5c0b1]/60 rounded-[12px] p-4 flex flex-wrap items-center justify-between gap-4">
            {/* Current Chapter Info */}
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-[0.5px] text-[#ff4f00] block mb-0.5">
                Current Segment
              </span>
              <p className="font-semibold text-sm sm:text-base text-[#201515] truncate">
                {activeChapter ? activeChapter.title : 'Playing'}
              </p>
              <p className="text-xs text-[#605d52] font-mono mt-0.5">
                {secondsToTimestamp(Math.floor(currentTime))} / {secondsToTimestamp(Math.floor(duration))}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousChapter}
                disabled={currentChapterIndex <= 0}
                title="Previous Chapter"
                className="w-10 h-10 inline-flex items-center justify-center rounded-[12px] bg-[#fffefb] border border-[#c5c0b1] text-[#201515] hover:bg-[#e7e2d7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={isPlaying ? pause : play}
                title={isPlaying ? 'Pause' : 'Play'}
                className="min-h-[44px] px-4 inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#ff4f00] hover:bg-[#e04500] text-[#fffefb] font-medium text-sm transition-colors shadow-sm cursor-pointer"
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
                className="w-10 h-10 inline-flex items-center justify-center rounded-[12px] bg-[#fffefb] border border-[#c5c0b1] text-[#201515] hover:bg-[#e7e2d7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Playlist Sidebar (4-5 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-[#f8f4f0] border border-[#c5c0b1]/80 rounded-[12px] overflow-hidden flex flex-col shadow-sm max-h-[750px]">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-[#c5c0b1]/60 bg-[#fffefb] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#201515]">Course Chapters</h2>
              <p className="text-xs text-[#605d52]">
                {completedCount} of {totalChapters} checked off
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-[#605d52] px-2 py-1 bg-[#f8f4f0] border border-[#c5c0b1] rounded-[6px]">
              Auto-advancing
            </span>
          </div>

          {/* Interactive Chapter List */}
          <div
            ref={sidebarListRef}
            className="overflow-y-auto p-2 divide-y divide-[#c5c0b1]/30 max-h-[600px] flex-1"
          >
            {playlist.chapters.map((chap, idx) => {
              const isActive = idx === currentChapterIndex;
              const isCompleted = completedIds.includes(chap.id);

              return (
                <div
                  key={chap.id}
                  ref={isActive ? (node) => { activeItemRef.current = node; } : undefined}
                  onClick={() => seekToChapter(idx)}
                  className={`w-full text-left p-3 rounded-[8px] transition-all flex items-start gap-3 my-0.5 cursor-pointer min-h-[48px] focus-within:ring-2 focus-within:ring-[#ff4f00] ${
                    isActive
                      ? 'bg-[#fffefb] border border-[#ff4f00] shadow-xs'
                      : 'hover:bg-[#fffefb]/70 border border-transparent'
                  }`}
                >
                  {/* Manual Completion Checkbox (touch target >= 48px area) */}
                  <div
                    onClick={(e) => handleToggleComplete(chap.id, e)}
                    className="shrink-0 p-1 -m-1 cursor-pointer flex items-center justify-center"
                    title={isCompleted ? 'Mark chapter as incomplete' : 'Mark chapter as completed'}
                  >
                    <div
                      className={`w-5 h-5 rounded-[4px] border flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-[#ff4f00] border-[#ff4f00] text-[#fffefb]'
                          : 'bg-[#fffefb] border-[#c5c0b1] hover:border-[#939084]'
                      }`}
                    >
                      {isCompleted && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Index / Status Icon */}
                  <div
                    className={`shrink-0 w-7 h-7 rounded-[6px] text-xs font-semibold flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-[#ff4f00] text-[#fffefb]'
                        : isCompleted
                        ? 'bg-[#e7e2d7] text-[#605d52]'
                        : 'bg-[#e7e2d7] text-[#605d52]'
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
                      className={`text-sm leading-snug break-words transition-opacity ${
                        isCompleted ? 'text-[#939084] line-through decoration-[#c5c0b1]' : 'text-[#201515]'
                      } ${isActive ? 'font-semibold' : 'font-normal'}`}
                    >
                      {chap.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs font-mono px-1.5 py-0.5 rounded-[4px] border ${
                          isActive
                            ? 'bg-[#fffefb] border-[#ff4f00]/40 text-[#ff4f00] font-medium'
                            : 'bg-[#fffefb] border-[#c5c0b1]/60 text-[#605d52]'
                        }`}
                      >
                        {chap.formattedTime}
                      </span>
                      {isActive && (
                        <span className="text-[11px] font-medium text-[#ff4f00]">
                          Now playing
                        </span>
                      )}
                      {isCompleted && !isActive && (
                        <span className="text-[11px] font-medium text-[#605d52]">
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
    </div>
  );
}
