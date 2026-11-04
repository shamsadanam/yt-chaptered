'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import {
  List,
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
  Volume1,
  Volume2,
  VolumeX,
  Subtitles,
  Minimize2,
} from 'lucide-react';
import { Chapter } from '../../types/playlist';
import { secondsToTimestamp } from '../../lib/youtubeParser';

interface FullscreenBottomBarProps {
  visible: boolean;
  chapters: Chapter[];
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
  volume: number;
  isMuted: boolean;
  isCaptionsEnabled?: boolean;
  isDrawerOpen: boolean;
  isSpeedMenuOpen: boolean;
  speedMenuRef: React.RefObject<HTMLDivElement | null>;
  setIsSpeedMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onToggleDrawer: () => void;
  onPlay: () => void;
  onPause: () => void;
  onSeekBy: (delta: number) => void;
  onSeekToTime: (time: number) => void;
  onSeekToChapter: (index: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onSetVolume: (volume: number) => void;
  onToggleMute: () => void;
  onToggleCaptions?: () => void;
  onToggleComplete: (chapterId: string, e?: React.MouseEvent) => void;
  onExitFullscreen: () => void;
  onUserActivity: () => void;
  onHoverControls: (hovering: boolean) => void;
}

export function FullscreenBottomBar({
  visible,
  chapters,
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
  volume,
  isMuted,
  isCaptionsEnabled = false,
  isDrawerOpen,
  isSpeedMenuOpen,
  speedMenuRef,
  setIsSpeedMenuOpen,
  onToggleDrawer,
  onPlay,
  onPause,
  onSeekBy,
  onSeekToTime,
  onSeekToChapter,
  onSetPlaybackRate,
  onSetVolume,
  onToggleMute,
  onToggleCaptions,
  onToggleComplete,
  onExitFullscreen,
  onUserActivity,
  onHoverControls,
}: FullscreenBottomBarProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [hoveredChapterTitle, setHoveredChapterTitle] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const splitNotches = useMemo(() => {
    if (duration <= 0) return null;
    return chapters.map((c) => {
      if (c.startTime <= 0) return null;
      const leftPercent = (c.startTime / duration) * 100;
      return (
        <div
          key={c.id}
          className="absolute top-0 bottom-0 w-0.5 bg-black/60 z-10 pointer-events-none"
          style={{ left: `${leftPercent}%` }}
        />
      );
    });
  }, [duration, chapters]);

  const progressRatio = duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;
  const progressPercentage = (progressRatio * 100).toFixed(2);

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

      const foundChap = chapters.findLast((chap) => targetTime >= chap.startTime);
      setHoveredChapterTitle(foundChap ? foundChap.title : null);

      if (isScrubbing) {
        onSeekToTime(targetTime);
      }
    },
    [calculateTimeFromPointer, chapters, isScrubbing, onSeekToTime]
  );

  const handlePointerDownProgress = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setIsScrubbing(true);
      onHoverControls(true);
      const targetTime = calculateTimeFromPointer(e.clientX);
      onSeekToTime(targetTime);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [calculateTimeFromPointer, onHoverControls, onSeekToTime]
  );

  const handlePointerUpProgress = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setIsScrubbing(false);
      onHoverControls(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored if pointer capture was already released
      }
    },
    [onHoverControls]
  );

  const isCurrentCompleted = activeChapter ? completedIdsSet.has(activeChapter.id) : false;

  return (
    <footer
      onMouseEnter={() => onHoverControls(true)}
      onMouseLeave={() => onHoverControls(false)}
      className={`relative z-10 w-full bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-12 pb-4 sm:pb-6 px-4 sm:px-8 flex flex-col gap-2 pointer-events-auto transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative group/scrubber py-2">
        {hoveredTime !== null && (
          <div
            className="absolute bottom-full mb-2 -translate-x-1/2 px-2.5 py-1 bg-stone-900 border border-stone-700 text-white rounded-md text-xs font-mono font-tnum shadow-lg pointer-events-none flex flex-col items-center gap-0.5 z-50 whitespace-nowrap"
            style={{
              left: `${duration > 0 ? (hoveredTime / duration) * 100 : 0}%`,
            }}
          >
            <span className="font-semibold text-emerald-400">
              {secondsToTimestamp(Math.floor(hoveredTime))}
            </span>
            {hoveredChapterTitle && (
              <span className="text-2xs text-stone-300 max-w-44 truncate">
                {hoveredChapterTitle}
              </span>
            )}
          </div>
        )}

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
              e.preventDefault();
              e.stopPropagation();
              onSeekBy(-10);
              onUserActivity();
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              onSeekBy(10);
              onUserActivity();
            }
          }}
          className="w-full h-4 sm:h-5 flex items-center cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-full"
        >
          <div className="w-full h-1.5 sm:h-2 bg-stone-800/90 rounded-full overflow-hidden relative border border-white/10">
            <div
              className="h-full bg-primary transition-all duration-100 rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
            {splitNotches}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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

          {activeChapter && (
            <button
              type="button"
              role="checkbox"
              aria-checked={isCurrentCompleted}
              onClick={(e) => {
                onToggleComplete(activeChapter.id, e);
                onUserActivity();
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
              <span className="hidden md:inline">
                {isCurrentCompleted ? 'Completed' : 'Mark Complete'}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              if (currentChapterIndex > 0) onSeekToChapter(currentChapterIndex - 1);
              onUserActivity();
            }}
            disabled={currentChapterIndex <= 0}
            title="Previous Chapter ([)"
            aria-label="Previous Chapter"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <SkipBack className="w-4 h-4 fill-current" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              onSeekBy(-10);
              onUserActivity();
            }}
            title="Rewind 10 seconds (←)"
            aria-label="Rewind 10 seconds"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-100 transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (isPlaying) {
                onPause();
              } else {
                onPlay();
              }
              onUserActivity();
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

          <button
            type="button"
            onClick={() => {
              onSeekBy(10);
              onUserActivity();
            }}
            title="Forward 10 seconds (→)"
            aria-label="Forward 10 seconds"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-100 transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <RotateCw className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentChapterIndex < totalChapters - 1) onSeekToChapter(currentChapterIndex + 1);
              onUserActivity();
            }}
            disabled={currentChapterIndex >= totalChapters - 1}
            title="Next Chapter (])"
            aria-label="Next Chapter"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-100 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <SkipForward className="w-4 h-4 fill-current" aria-hidden="true" />
          </button>

          <div className="h-6 w-px bg-white/20 mx-1 hidden sm:block" aria-hidden="true" />

          <div className="flex items-center gap-1 group/volume">
            <button
              type="button"
              onClick={() => {
                onToggleMute();
                onUserActivity();
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
                  onSetVolume(Number(e.target.value));
                  onUserActivity();
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

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative" ref={speedMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsSpeedMenuOpen((prev) => !prev);
                onUserActivity();
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
                      onSetPlaybackRate(rate);
                      setIsSpeedMenuOpen(false);
                      onUserActivity();
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono font-tnum flex items-center justify-between hover:bg-stone-800 transition-colors cursor-pointer ${
                      playbackRate === rate ? 'text-emerald-400 font-bold bg-emerald-950/50' : 'text-stone-200'
                    }`}
                  >
                    <span>{rate}x</span>
                    {playbackRate === rate && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {onToggleCaptions && (
            <button
              type="button"
              onClick={() => {
                onToggleCaptions();
                onUserActivity();
              }}
              title={isCaptionsEnabled ? 'Turn off captions (C)' : 'Toggle captions (C)'}
              aria-label={isCaptionsEnabled ? 'Turn off captions' : 'Toggle captions'}
              aria-pressed={isCaptionsEnabled}
              className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                isCaptionsEnabled
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-stone-900/80 hover:bg-stone-800 text-stone-100 border-white/15'
              }`}
            >
              <Subtitles
                className={`w-4 h-4 ${isCaptionsEnabled ? 'text-white' : 'text-stone-300'}`}
                aria-hidden="true"
              />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onToggleDrawer();
              onUserActivity();
            }}
            title="Toggle Chapters (I)"
            aria-label={isDrawerOpen ? 'Close chapter list' : 'Open chapter list'}
            aria-expanded={isDrawerOpen}
            aria-controls="fullscreen-chapter-drawer"
            className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              isDrawerOpen
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-stone-900/80 hover:bg-stone-800 text-stone-100 border-white/15'
            }`}
          >
            <List className="w-4 h-4" aria-hidden="true" />
          </button>

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
  );
}
