'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  List,
  X,
  Play,
  Pause,
  Loader2,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Zap,
  ChevronDown,
  Check,
  Search,
  Volume1,
  Volume2,
  VolumeX,
  Subtitles,
  Minimize2,
} from 'lucide-react';
import { Chapter, ParsedPlaylist } from '../types/playlist';
import { secondsToTimestamp } from '../lib/youtubeParser';

interface FullscreenOverlayProps {
  playlist: ParsedPlaylist;
  activeChapter: Chapter | undefined;
  currentChapterIndex: number;
  totalChapters: number;
  completedIdsSet: Set<string>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isPlayLoading: boolean;
  isReady: boolean;
  playbackRate: number;
  isCaptionsEnabled?: boolean;
  volume?: number;
  isMuted?: boolean;
  seekToChapter: (index: number) => void;
  seekBy: (deltaSeconds: number) => void;
  seekToTime: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume?: (vol: number) => void;
  toggleMute?: () => void;
  onSetVolume?: (vol: number) => void;
  onToggleMute?: () => void;
  play: () => void;
  pause: () => void;
  onToggleCaptions?: () => void;
  onToggleComplete: (chapterId: string, e?: React.MouseEvent) => void;
  onExitFullscreen: () => void;
}

export function FullscreenOverlay({
  playlist,
  activeChapter,
  currentChapterIndex,
  totalChapters,
  completedIdsSet,
  currentTime,
  duration,
  isPlaying,
  isPlayLoading,
  isReady,
  playbackRate,
  isCaptionsEnabled = false,
  volume = 100,
  isMuted = false,
  seekToChapter,
  seekBy,
  seekToTime,
  setPlaybackRate,
  onSetVolume,
  onToggleMute,
  setVolume,
  toggleMute,
  play,
  pause,
  onToggleCaptions,
  onToggleComplete,
  onExitFullscreen,
}: FullscreenOverlayProps) {
  const effectiveSetVolume = onSetVolume || setVolume;
  const effectiveToggleMute = onToggleMute || toggleMute;

  // Drawer and menu toggles
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Auto-hide visibility and idle tracking
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Scrubber hover state
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [hoveredChapterTitle, setHoveredChapterTitle] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // References for keyboard focus and drawer scrolling
  const drawerListRef = useRef<HTMLOListElement>(null);
  const activeChapterRef = useRef<HTMLLIElement | null>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const drawerSearchInputRef = useRef<HTMLInputElement>(null);

  // Reset inactivity countdown (5 seconds) during active playback on user interactions
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // Only arm auto-hide if playing, controls aren't hovered, and modal menus are closed
    if (isPlaying && !isDrawerOpen && !isSpeedMenuOpen && !isHoveringControls && !isScrubbing) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 5000);
    }
  }, [isPlaying, isDrawerOpen, isSpeedMenuOpen, isHoveringControls, isScrubbing]);

  // Synchronize idle auto-hide whenever playback or modal state transitions
  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (isPlaying && !isDrawerOpen && !isSpeedMenuOpen && !isHoveringControls && !isScrubbing) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 5000);
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isPlaying, isDrawerOpen, isSpeedMenuOpen, isHoveringControls, isScrubbing]);

  // Global window pointermove listener to ensure controls wake up on mouse movement
  useEffect(() => {
    const handleWindowPointer = () => {
      resetHideTimer();
    };
    window.addEventListener('pointermove', handleWindowPointer);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointer);
    };
  }, [resetHideTimer]);

  // Keyboard navigation inside fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept hotkeys if user is typing in the search filter input
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          setIsDrawerOpen(false);
        }
        return;
      }

      switch (e.key) {
        case 'i':
        case 'I':
          e.preventDefault();
          setIsDrawerOpen((prev) => !prev);
          resetHideTimer();
          break;

        case 'c':
        case 'C':
          e.preventDefault();
          onToggleCaptions?.();
          resetHideTimer();
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          onExitFullscreen();
          break;

        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          if (isPlaying) {
            pause();
          } else {
            play();
          }
          resetHideTimer();
          break;

        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          seekBy(-10);
          resetHideTimer();
          break;

        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          seekBy(10);
          resetHideTimer();
          break;

        case '[':
        case 'p':
          e.preventDefault();
          if (currentChapterIndex > 0) {
            seekToChapter(currentChapterIndex - 1);
          }
          resetHideTimer();
          break;

        case ']':
        case 'n':
          e.preventDefault();
          if (currentChapterIndex < totalChapters - 1) {
            seekToChapter(currentChapterIndex + 1);
          }
          resetHideTimer();
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          effectiveToggleMute?.();
          resetHideTimer();
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (effectiveSetVolume) {
            const currentEffective = isMuted ? 0 : volume;
            effectiveSetVolume(Math.min(100, currentEffective + 5));
          }
          resetHideTimer();
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (effectiveSetVolume) {
            const currentEffective = isMuted ? 0 : volume;
            effectiveSetVolume(Math.max(0, currentEffective - 5));
          }
          resetHideTimer();
          break;

        case 'Escape':
          if (isSpeedMenuOpen) {
            e.preventDefault();
            setIsSpeedMenuOpen(false);
          } else if (isDrawerOpen) {
            e.preventDefault();
            setIsDrawerOpen(false);
          }
          break;

        default:
          resetHideTimer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isPlaying,
    isDrawerOpen,
    isSpeedMenuOpen,
    currentChapterIndex,
    totalChapters,
    volume,
    isMuted,
    play,
    pause,
    seekBy,
    seekToChapter,
    onExitFullscreen,
    onToggleCaptions,
    effectiveSetVolume,
    effectiveToggleMute,
    resetHideTimer,
  ]);

  // Auto-scroll chapter drawer to active item when opened
  useEffect(() => {
    if (isDrawerOpen && activeChapterRef.current) {
      activeChapterRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isDrawerOpen, currentChapterIndex]);

  // Close speed popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedMenuOpen(false);
      }
    };
    if (isSpeedMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isSpeedMenuOpen]);

  // Filtered chapters for drawer search
  const filteredChapters = useMemo(() => {
    if (!filterQuery.trim()) return playlist.chapters;
    const query = filterQuery.toLowerCase();
    return playlist.chapters.filter((chap) =>
      chap.title.toLowerCase().includes(query) || chap.formattedTime.toLowerCase().includes(query)
    );
  }, [playlist.chapters, filterQuery]);

  // Overall course progress
  const completedCount = completedIdsSet.size;
  const courseProgressPercentage = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  // Active chapter completion state
  const isCurrentCompleted = activeChapter ? completedIdsSet.has(activeChapter.id) : false;

  // Timeline progress percentages
  const progressRatio = duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;
  const progressPercentage = (progressRatio * 100).toFixed(2);

  // Time calculations for scrubber hover
  const calculateTimeFromPointer = useCallback(
    (clientX: number) => {
      if (!progressBarRef.current || duration <= 0) return 0;
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return clickRatio * duration;
    },
    [duration]
  );

  const handlePointerMoveProgress = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const targetTime = calculateTimeFromPointer(e.clientX);
      setHoveredTime(targetTime);

      // Find corresponding chapter title for hovered timestamp
      const foundChap = [...playlist.chapters]
        .reverse()
        .find((chap) => targetTime >= chap.startTime);
      setHoveredChapterTitle(foundChap ? foundChap.title : null);

      if (isScrubbing) {
        seekToTime(targetTime);
      }
    },
    [calculateTimeFromPointer, playlist.chapters, isScrubbing, seekToTime]
  );

  const handlePointerDownProgress = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setIsScrubbing(true);
      const targetTime = calculateTimeFromPointer(e.clientX);
      seekToTime(targetTime);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [calculateTimeFromPointer, seekToTime]
  );

  const handlePointerUpProgress = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsScrubbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer capture was already released
    }
  }, []);

  return (
    <div
      onPointerMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className={`absolute inset-0 z-30 select-none overflow-hidden flex flex-col justify-between ${
        controlsVisible || isDrawerOpen ? 'cursor-default' : 'cursor-none'
      }`}
    >
      {/* Background interaction surface to catch clicks and pointer moves above the YouTube iframe */}
      <div
        className="absolute inset-0 z-0"
        onPointerMove={resetHideTimer}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            if (!controlsVisible && !isDrawerOpen) {
              setControlsVisible(true);
              resetHideTimer();
            } else {
              if (isPlaying) {
                pause();
              } else {
                play();
              }
              resetHideTimer();
            }
          }
        }}
        onDoubleClick={onExitFullscreen}
      />

      {/* Screen Reader Announcements for chapter transitions */}
      <div role="status" aria-live="polite" className="sr-only">
        {activeChapter ? `Now playing chapter ${currentChapterIndex + 1}: ${activeChapter.title}` : ''}
      </div>

      {/* TOP FLOATING HEADER BAR */}
      <header
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
        className={`relative z-10 w-full bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-4 pb-10 px-4 sm:px-6 flex items-center justify-between gap-3 transition-opacity duration-200 pointer-events-auto ${
          controlsVisible || isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Chapter Drawer Toggle Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsDrawerOpen((prev) => !prev);
              resetHideTimer();
            }}
            aria-expanded={isDrawerOpen}
            aria-controls="fullscreen-chapter-drawer"
            aria-label={isDrawerOpen ? 'Hide course chapter list' : 'Show course chapter list'}
            title="Toggle Chapter List (I)"
            className={`min-h-11 px-3.5 inline-flex items-center gap-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
              isDrawerOpen
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 text-stone-100 border-white/20'
            }`}
          >
            <List className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden xs:inline">{isDrawerOpen ? 'Close Chapters' : 'Chapters'}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-2xs font-mono font-tnum">
              {currentChapterIndex + 1}/{totalChapters}
            </span>
          </button>
        </div>

        {/* Center: Course Title & Channel (Desktop / Tablet) */}
        <div className="hidden sm:flex flex-col items-center min-w-0 max-w-md lg:max-w-xl text-center px-2">
          <h1 className="text-xs sm:text-sm font-semibold text-stone-100 truncate w-full">
            {playlist.video.title}
          </h1>
          <span className="text-2xs text-stone-400 truncate w-full">
            {playlist.video.author || 'YouTube Course'}
          </span>
        </div>

        {/* Right header spacer to balance left chapter button while keeping top-right clean */}
        <div className="w-11" aria-hidden="true" />
      </header>

      {/* SLIDE-IN CHAPTER DRAWER (Mounted on Right) */}
      <aside
        id="fullscreen-chapter-drawer"
        role="dialog"
        aria-modal="false"
        aria-label="Course chapters"
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
        className={`absolute top-0 right-0 bottom-0 z-40 w-80 sm:w-88 md:w-96 flex flex-col bg-stone-950/95 backdrop-blur-md border-l border-white/10 shadow-2xl transition-transform duration-200 ease-out pointer-events-auto motion-reduce:transition-none ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/10 bg-stone-900/40">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h2 className="text-sm font-semibold text-white">Course Chapters</h2>
              <p className="text-xs text-stone-300 font-mono font-tnum">
                {completedCount} of {totalChapters} completed
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-tnum font-semibold text-emerald-400">
                {courseProgressPercentage}%
              </span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close chapter list"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Overall Course Progress Track */}
          <div
            role="progressbar"
            aria-valuenow={courseProgressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Course completion progress"
            className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${courseProgressPercentage}%` }}
            />
          </div>

          {/* Quick Search / Filter Input */}
          <div className="mt-3 relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              ref={drawerSearchInputRef}
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter chapters..."
              aria-label="Filter chapters"
              className="w-full h-9 pl-8 pr-7 text-xs bg-stone-900 border border-stone-700/80 rounded-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                aria-label="Clear filter"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Chapter List */}
        <ol
          ref={drawerListRef}
          role="list"
          aria-label="Chapter items"
          className="flex-1 overflow-y-auto p-2 divide-y divide-white/5"
        >
          {filteredChapters.length === 0 ? (
            <li className="p-4 text-center text-xs text-stone-400">
              No chapters matching &quot;{filterQuery}&quot;
            </li>
          ) : (
            filteredChapters.map((chap) => {
              const originalIndex = playlist.chapters.findIndex((c) => c.id === chap.id);
              const isActive = originalIndex === currentChapterIndex;
              const isCompleted = completedIdsSet.has(chap.id);

              return (
                <li
                  key={chap.id}
                  ref={isActive ? (node) => { activeChapterRef.current = node; } : undefined}
                  className={`w-full p-2 rounded-lg flex items-center gap-2 my-0.5 transition-colors ${
                    isActive
                      ? 'bg-stone-800/90 border border-emerald-500/50 shadow-xs'
                      : 'hover:bg-stone-800/50 border border-transparent'
                  }`}
                >
                  {/* Chapter Select Button */}
                  <button
                    type="button"
                    onClick={() => {
                      seekToChapter(originalIndex);
                      resetHideTimer();
                    }}
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={`Play chapter ${chap.index}: ${chap.title}, timestamp ${chap.formattedTime}${isCompleted ? ', completed' : ''}`}
                    className="flex-1 min-w-0 text-left flex items-center gap-2.5 cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-md p-1 -m-1"
                  >
                    {/* Index or Active Icon Badge */}
                    <div
                      className={`shrink-0 w-6 h-6 rounded-md text-2xs font-semibold flex items-center justify-center ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                      aria-hidden="true"
                    >
                      {isActive ? (
                        <Play className="w-3 h-3 fill-current ml-0.5 animate-pulse text-white" />
                      ) : (
                        <span>{chap.index}</span>
                      )}
                    </div>

                    {/* Chapter Title & Time */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs leading-snug break-words line-clamp-2 ${
                          isCompleted
                            ? 'text-stone-400 line-through decoration-stone-500'
                            : 'text-stone-100'
                        } ${isActive ? 'font-semibold text-emerald-300' : 'font-normal'}`}
                      >
                        {chap.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-2xs font-mono font-tnum px-1 py-0.5 rounded-xs bg-stone-900 border border-stone-800 text-stone-300">
                          {chap.formattedTime}
                        </span>
                        {isActive && (
                          <span className="text-2xs font-medium text-emerald-400">
                            Now playing
                          </span>
                        )}
                        {isCompleted && !isActive && (
                          <span className="text-2xs font-medium text-stone-400">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Accessible 44×44px Completion Checkbox */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isCompleted}
                    onClick={(e) => {
                      onToggleComplete(chap.id, e);
                      resetHideTimer();
                    }}
                    title={isCompleted ? 'Mark chapter as incomplete' : 'Mark chapter as completed'}
                    aria-label={isCompleted ? `Mark chapter ${chap.index} as incomplete` : `Mark chapter ${chap.index} as completed`}
                    className="shrink-0 min-h-11 min-w-11 flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-md"
                  >
                    <div
                      className={`w-5 h-5 rounded-xs border flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-primary border-primary text-white'
                          : 'bg-stone-900 border-stone-600 hover:border-stone-400'
                      }`}
                    >
                      {isCompleted && (
                        <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ol>

        {/* Drawer Footer with Keyboard Hint */}
        <div className="p-2.5 border-t border-white/10 text-center text-2xs text-stone-400">
          Tip: <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">I</kbd> chapters, <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">C</kbd> captions, <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">M</kbd> mute, <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">↑/↓</kbd> volume, <kbd className="px-1 py-0.5 rounded-xs bg-stone-800 text-stone-200 border border-stone-700">Space</kbd> play/pause
        </div>
      </aside>

      {/* BOTTOM TRANSPORT CONTROLS BAR */}
      <footer
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
        className={`relative z-10 w-full bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-12 pb-4 sm:pb-6 px-4 sm:px-8 flex flex-col gap-2 pointer-events-auto transition-opacity duration-200 ${
          controlsVisible || isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* TIMELINE PROGRESS SCRUBBER */}
        <div className="relative group/scrubber py-2">
          {/* Hover Time Tooltip */}
          {hoveredTime !== null && (
            <div
              className="absolute bottom-full mb-2 -translate-x-1/2 px-2.5 py-1 bg-stone-900 border border-stone-700 text-white rounded-md text-xs font-mono font-tnum shadow-lg pointer-events-none flex flex-col items-center gap-0.5 z-50 whitespace-nowrap"
              style={{
                left: `${duration > 0 ? (hoveredTime / duration) * 100 : 0}%`,
              }}
            >
              <span className="font-semibold text-emerald-400">{secondsToTimestamp(Math.floor(hoveredTime))}</span>
              {hoveredChapterTitle && (
                <span className="text-2xs text-stone-300 max-w-44 truncate">{hoveredChapterTitle}</span>
              )}
            </div>
          )}

          {/* Interactive Touch Track */}
          <div
            ref={progressBarRef}
            role="slider"
            tabIndex={0}
            aria-label="Course playback timeline"
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(currentTime)}
            aria-valuetext={`${secondsToTimestamp(Math.floor(currentTime))} of ${secondsToTimestamp(Math.floor(duration))}`}
            onPointerMove={handlePointerMoveProgress}
            onPointerDown={handlePointerDownProgress}
            onPointerUp={handlePointerUpProgress}
            onPointerLeave={() => setHoveredTime(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                seekBy(-5);
                resetHideTimer();
              } else if (e.key === 'ArrowRight') {
                seekBy(5);
                resetHideTimer();
              }
            }}
            className="w-full h-4 sm:h-5 flex items-center cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-full"
          >
            {/* Background Track with Chapter Markers */}
            <div className="w-full h-1.5 sm:h-2 bg-stone-800/90 rounded-full overflow-hidden relative border border-white/10">
              {/* Progress Fill */}
              <div
                className="h-full bg-primary transition-all duration-100 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />

              {/* Chapter Boundary Split Notches */}
              {duration > 0 &&
                playlist.chapters.map((c) => {
                  if (c.startTime <= 0) return null;
                  const leftPercent = (c.startTime / duration) * 100;
                  return (
                    <div
                      key={c.id}
                      className="absolute top-0 bottom-0 w-0.5 bg-black/60 z-10 pointer-events-none"
                      style={{ left: `${leftPercent}%` }}
                    />
                  );
                })}
            </div>
          </div>
        </div>

        {/* PRIMARY CONTROLS ROW */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Left Cluster: Active Chapter Info & Completion Toggle */}
          <div className="flex items-center gap-3 min-w-0 max-w-full sm:max-w-md">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-2xs font-semibold uppercase tracking-wider text-emerald-400">
                  Ch {currentChapterIndex + 1}/{totalChapters}
                </span>
                <span className="text-stone-500" aria-hidden="true">•</span>
                <span className="text-xs font-mono font-tnum text-stone-300">
                  {secondsToTimestamp(Math.floor(currentTime))} / {secondsToTimestamp(Math.floor(duration))}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-stone-100 truncate">
                {activeChapter ? activeChapter.title : 'Playing Course'}
              </p>
            </div>

            {/* Quick Completion Button */}
            {activeChapter && (
              <button
                type="button"
                role="checkbox"
                aria-checked={isCurrentCompleted}
                onClick={(e) => {
                  onToggleComplete(activeChapter.id, e);
                  resetHideTimer();
                }}
                title={isCurrentCompleted ? 'Mark chapter as incomplete' : 'Mark chapter as completed'}
                aria-label={isCurrentCompleted ? 'Mark chapter as incomplete' : 'Mark chapter as completed'}
                className={`min-h-11 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 shrink-0 ${
                  isCurrentCompleted
                    ? 'bg-primary text-white border-primary'
                    : 'bg-stone-900/80 hover:bg-stone-800 text-stone-300 border-white/20'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center ${
                    isCurrentCompleted
                      ? 'bg-white border-white text-primary'
                      : 'border-stone-400'
                  }`}
                >
                  {isCurrentCompleted && (
                    <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden="true" />
                  )}
                </div>
                <span className="hidden md:inline">{isCurrentCompleted ? 'Completed' : 'Mark Complete'}</span>
              </button>
            )}
          </div>

          {/* Center Cluster: Main Media Transport */}
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            {/* Previous Chapter */}
            <button
              type="button"
              onClick={() => {
                if (currentChapterIndex > 0) seekToChapter(currentChapterIndex - 1);
                resetHideTimer();
              }}
              disabled={currentChapterIndex <= 0}
              title="Previous Chapter ([)"
              aria-label="Previous Chapter"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <SkipBack className="w-4 h-4 fill-current" aria-hidden="true" />
            </button>

            {/* Rewind 10s */}
            <button
              type="button"
              onClick={() => {
                seekBy(-10);
                resetHideTimer();
              }}
              title="Rewind 10 seconds (←)"
              aria-label="Rewind 10 seconds"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-100 transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Hero Play / Pause */}
            <button
              type="button"
              onClick={() => {
                if (isPlaying) {
                  pause();
                } else {
                  play();
                }
                resetHideTimer();
              }}
              disabled={isPlayLoading || !isReady}
              aria-busy={isPlayLoading}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              className="min-h-11 px-5 rounded-lg bg-primary hover:bg-primary-hover active:scale-98 text-white font-semibold text-xs sm:text-sm border border-emerald-500/30 shadow-md flex items-center justify-center gap-2 cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isPlayLoading ? (
                <Loader2 className="animate-spin w-4 h-4 text-white" aria-hidden="true" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" aria-hidden="true" />
              )}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Forward 10s */}
            <button
              type="button"
              onClick={() => {
                seekBy(10);
                resetHideTimer();
              }}
              title="Forward 10 seconds (→)"
              aria-label="Forward 10 seconds"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-100 transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <RotateCw className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Next Chapter */}
            <button
              type="button"
              onClick={() => {
                if (currentChapterIndex < totalChapters - 1) seekToChapter(currentChapterIndex + 1);
                resetHideTimer();
              }}
              disabled={currentChapterIndex >= totalChapters - 1}
              title="Next Chapter (])"
              aria-label="Next Chapter"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <SkipForward className="w-4 h-4 fill-current" aria-hidden="true" />
            </button>

            {/* Subtle Divider */}
            <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" aria-hidden="true" />

            {/* Volume Control */}
            <div className="flex items-center gap-1 group/volume">
              <button
                type="button"
                onClick={() => {
                  effectiveToggleMute?.();
                  resetHideTimer();
                }}
                title={isMuted || volume === 0 ? 'Unmute (M)' : 'Mute (M)'}
                aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-100 border border-white/15 transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-stone-400" aria-hidden="true" />
                ) : volume < 50 ? (
                  <Volume1 className="w-4 h-4 text-stone-200" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4 text-stone-200" aria-hidden="true" />
                )}
              </button>
              <div className="flex items-center w-20 sm:w-28 md:w-36 px-1.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    effectiveSetVolume?.(Number(e.target.value));
                    resetHideTimer();
                  }}
                  aria-label="Volume slider"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={isMuted ? 0 : volume}
                  aria-valuetext={`${isMuted ? 0 : volume}%`}
                  className="w-full h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Right Cluster: Speed, Subtitles, Drawer Toggle, Exit */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Playback Speed Popover */}
            <div className="relative" ref={speedMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSpeedMenuOpen((prev) => !prev);
                  resetHideTimer();
                }}
                title="Playback Speed"
                aria-label={`Playback speed: ${playbackRate}x`}
                aria-haspopup="true"
                aria-expanded={isSpeedMenuOpen}
                className="min-h-11 px-3 inline-flex items-center gap-1 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-100 border border-white/15 text-xs font-semibold font-mono font-tnum transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>{playbackRate}x</span>
                <ChevronDown className="w-3 h-3 text-stone-400" aria-hidden="true" />
              </button>

              {isSpeedMenuOpen && (
                <div
                  role="menu"
                  aria-label="Playback speed options"
                  className="absolute right-0 bottom-full mb-2 w-28 bg-stone-950/95 border border-white/15 rounded-lg shadow-xl py-1 z-50 backdrop-blur-md"
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
                        resetHideTimer();
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-mono font-tnum flex items-center justify-between hover:bg-stone-800 transition-colors cursor-pointer ${
                        playbackRate === rate ? 'text-emerald-400 font-bold bg-emerald-950/50' : 'text-stone-200'
                      }`}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle Closed Captions (C) */}
            {onToggleCaptions && (
              <button
                type="button"
                onClick={() => {
                  onToggleCaptions();
                  resetHideTimer();
                }}
                title={isCaptionsEnabled ? 'Turn off captions (C)' : 'Turn on captions (C)'}
                aria-label={isCaptionsEnabled ? 'Turn off captions' : 'Turn on captions'}
                aria-pressed={isCaptionsEnabled}
                className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  isCaptionsEnabled
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-stone-900/80 hover:bg-stone-800 text-stone-100 border-white/15'
                }`}
              >
                <Subtitles className={`w-4 h-4 ${isCaptionsEnabled ? 'text-white' : 'text-stone-300'}`} aria-hidden="true" />
              </button>
            )}

            {/* Toggle Chapter Drawer */}
            <button
              type="button"
              onClick={() => {
                setIsDrawerOpen((prev) => !prev);
                resetHideTimer();
              }}
              title="Toggle Chapters (I)"
              aria-label={isDrawerOpen ? 'Close chapter list' : 'Open chapter list'}
              className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                isDrawerOpen
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-stone-900/80 hover:bg-stone-800 text-stone-100 border-white/15'
              }`}
            >
              <List className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Exit Fullscreen (Fullscreen Out Icon) */}
            <button
              type="button"
              onClick={onExitFullscreen}
              title="Exit Fullscreen (Esc)"
              aria-label="Exit Fullscreen"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 text-stone-100 border border-white/15 transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <Minimize2 className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
