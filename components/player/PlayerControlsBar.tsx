'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
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
  Maximize2,
  Minimize2,
  RectangleHorizontal,
  Lock,
} from 'lucide-react';
import { Chapter } from '../../types/playlist';
import { PlayerPlaybackState, PlayerPlaybackActions } from '../../types/player';
import { secondsToTimestamp } from '../../lib/youtubeParser';

export interface PlayerControlsBarProps {
  mode: 'windowed' | 'fullscreen';
  visible: boolean;
  isLocked?: boolean;
  onToggleLock?: () => void;
  chapters: Chapter[];
  currentChapterIndex: number;
  totalChapters: number;
  playerState: PlayerPlaybackState;
  playerActions: PlayerPlaybackActions;
  isSpeedMenuOpen: boolean;
  speedMenuRef: React.RefObject<HTMLDivElement | null>;
  setIsSpeedMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
  onToggleFullscreen: () => void;
  onUserActivity: () => void;
  onHoverControls: (hovering: boolean) => void;
}

export function PlayerControlsBar({
  mode,
  visible,
  isLocked = false,
  onToggleLock,
  chapters,
  currentChapterIndex,
  totalChapters,
  playerState,
  playerActions,
  isSpeedMenuOpen,
  speedMenuRef,
  setIsSpeedMenuOpen,
  isTheaterMode = false,
  onToggleTheater,
  onToggleFullscreen,
  onUserActivity,
  onHoverControls,
}: PlayerControlsBarProps) {
  const {
    currentTime,
    duration,
    isPlaying,
    isPlayLoading,
    isReady,
    playbackRate,
    volume,
    isMuted,
    isCaptionsEnabled = false,
    isCaptionsSupported,
  } = playerState;

  const {
    play: onPlay,
    pause: onPause,
    seekBy: onSeekBy,
    seekToTime: onSeekToTime,
    seekToChapter: onSeekToChapter,
    setPlaybackRate: onSetPlaybackRate,
    setVolume: onSetVolume,
    toggleMute: onToggleMute,
    toggleCaptions: onToggleCaptions,
  } = playerActions;

  const progressBarRef = useRef<HTMLDivElement>(null);
  const volumeMenuRef = useRef<HTMLDivElement>(null);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [hoveredChapterTitle, setHoveredChapterTitle] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showCaptionsNotice, setShowCaptionsNotice] = useState(false);
  const captionsNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (captionsNoticeTimeoutRef.current) {
        clearTimeout(captionsNoticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerOutside = (e: MouseEvent) => {
      if (
        volumeMenuRef.current &&
        !volumeMenuRef.current.contains(e.target as Node)
      ) {
        setIsVolumeOpen(false);
      }
    };
    if (isVolumeOpen) {
      document.addEventListener('mousedown', handlePointerOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerOutside);
    };
  }, [isVolumeOpen]);

  const handleCaptionsClick = useCallback(() => {
    onUserActivity();
    if (isCaptionsSupported === false) {
      setShowCaptionsNotice(true);
      if (captionsNoticeTimeoutRef.current) {
        clearTimeout(captionsNoticeTimeoutRef.current);
      }
      captionsNoticeTimeoutRef.current = setTimeout(() => {
        setShowCaptionsNotice(false);
      }, 3500);
      return;
    }
    onToggleCaptions?.();
  }, [isCaptionsSupported, onToggleCaptions, onUserActivity]);

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
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored if pointer capture was already released
      }
      onUserActivity();
    },
    [onUserActivity]
  );

  const isFullscreenMode = mode === 'fullscreen';

  return (
    <footer
      onMouseEnter={() => onHoverControls(true)}
      onMouseLeave={() => onHoverControls(false)}
      className={`absolute ${
        isFullscreenMode
          ? 'bottom-3 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-6 max-w-4xl p-2.5 sm:p-3.5'
          : 'bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 max-w-3xl lg:max-w-4xl p-2 sm:p-3'
      } z-20 mx-auto rounded-2xl bg-stone-950/85 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col gap-1.5 sm:gap-2 pointer-events-auto transition-all duration-200 ${
        visible && !isLocked
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="relative group/scrubber py-0.5">
        {hoveredTime !== null && (
          <div
            className="absolute bottom-full mb-2 -translate-x-1/2 px-2.5 py-1 bg-stone-900 border border-stone-700 text-white rounded-md text-xs font-mono font-tnum shadow-lg pointer-events-none flex flex-col items-center gap-0.5 z-50 whitespace-nowrap"
            style={{
              left: `${duration > 0 ? (hoveredTime / duration) * 100 : 0}%`,
            }}
          >
            <span className="font-semibold text-primary">
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
          className="w-full h-4 sm:h-5 flex items-center cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
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

      <div className="relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 w-full min-h-11 sm:min-h-12">
        <div className="order-2 sm:order-1 sm:flex-1 flex items-center justify-start gap-1.5 sm:gap-2">
          <div className="relative group/volume" ref={volumeMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsVolumeOpen((prev) => !prev);
                onUserActivity();
              }}
              title={isMuted || volume === 0 ? 'Volume (Muted, M)' : `Volume (${volume}%, M)`}
              aria-label={isMuted || volume === 0 ? 'Volume muted, adjust volume' : `Volume ${volume} percent, adjust volume`}
              aria-haspopup="true"
              aria-expanded={isVolumeOpen}
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white border border-white/15 transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-stone-400" aria-hidden="true" />
              ) : volume < 50 ? (
                <Volume1 className="w-4 h-4 text-stone-200" aria-hidden="true" />
              ) : (
                <Volume2 className="w-4 h-4 text-stone-200" aria-hidden="true" />
              )}
            </button>

            <div
              className={`absolute bottom-full mb-2 left-0 sm:left-1/2 sm:-translate-x-1/2 z-30 px-3 py-2 bg-stone-900/95 border border-white/15 rounded-xl shadow-xl backdrop-blur-md transition-all duration-150 flex items-center gap-2.5 ${
                isVolumeOpen
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none group-hover/volume:opacity-100 group-hover/volume:scale-100 group-hover/volume:pointer-events-auto group-focus-within/volume:opacity-100 group-focus-within/volume:scale-100 group-focus-within/volume:pointer-events-auto'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onToggleMute();
                  onUserActivity();
                }}
                title={isMuted || volume === 0 ? 'Unmute (M)' : 'Mute (M)'}
                aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                className="w-7 h-7 inline-flex items-center justify-center rounded-lg hover:bg-stone-800 text-stone-200 hover:text-white transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-stone-400" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4 text-stone-200" aria-hidden="true" />
                )}
              </button>
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
                className="w-22 sm:w-24 h-1.5 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <span className="text-2xs font-mono font-tnum text-stone-300 w-7 text-right">
                {isMuted ? '0%' : `${volume}%`}
              </span>
            </div>
          </div>

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
              className="min-h-11 min-w-16 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white border border-white/15 text-xs font-semibold font-mono font-tnum transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Zap className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              <span className="w-8 text-center">{playbackRate}x</span>
              <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" aria-hidden="true" />
            </button>

            {isSpeedMenuOpen && (
              <div
                role="menu"
                aria-label="Playback speed options"
                className="absolute left-0 bottom-full mb-2 w-28 bg-stone-950/95 border border-white/15 rounded-xl shadow-xl py-1 z-50 backdrop-blur-md"
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
                      playbackRate === rate ? 'text-primary font-bold bg-primary/20' : 'text-stone-200'
                    }`}
                  >
                    <span>{rate}x</span>
                    {playbackRate === rate && (
                      <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-full sm:w-auto order-1 sm:order-2 shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              if (currentChapterIndex > 0) onSeekToChapter(currentChapterIndex - 1);
              onUserActivity();
            }}
            disabled={currentChapterIndex <= 0}
            title="Previous Chapter ([)"
            aria-label="Previous Chapter"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-200 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-200 hover:text-white transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            className="w-12 h-12 rounded-full bg-primary hover:bg-primary-hover active:scale-98 text-white border border-primary/40 shadow-lg flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-75 disabled:cursor-not-allowed shrink-0 transition-transform"
          >
            {isPlayLoading ? (
              <Loader2 className="animate-spin w-5 h-5 text-white" aria-hidden="true" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" aria-hidden="true" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onSeekBy(10);
              onUserActivity();
            }}
            title="Forward 10 seconds (→)"
            aria-label="Forward 10 seconds"
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-200 hover:text-white transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 border border-white/15 text-stone-200 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <SkipForward className="w-4 h-4 fill-current" aria-hidden="true" />
          </button>
        </div>

        <div className="order-3 sm:flex-1 flex items-center justify-end gap-1.5 sm:gap-2">
          {onToggleCaptions && (
            <div className="relative inline-flex items-center">
              {showCaptionsNotice && (
                <div
                  role="status"
                  aria-live="polite"
                  className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-stone-900/95 border border-white/20 shadow-xl text-2xs text-stone-200 whitespace-nowrap pointer-events-none"
                >
                  Captions are controlled via YouTube player native CC icon
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-stone-900" />
                </div>
              )}
              <button
                type="button"
                onClick={handleCaptionsClick}
                title={
                  isCaptionsSupported === false
                    ? 'Captions controlled via native YouTube player CC icon'
                    : isCaptionsEnabled
                    ? 'Turn off captions (C)'
                    : 'Toggle captions (C)'
                }
                aria-label={
                  isCaptionsSupported === false
                    ? 'Captions controlled via native YouTube player CC icon'
                    : isCaptionsEnabled
                    ? 'Turn off captions'
                    : 'Toggle captions'
                }
                aria-pressed={isCaptionsEnabled}
                className={`min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isCaptionsEnabled
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white border-white/15'
                }`}
              >
                <Subtitles
                  className={`w-4 h-4 ${isCaptionsEnabled ? 'text-white' : 'text-stone-300'}`}
                  aria-hidden="true"
                />
              </button>
            </div>
          )}

          {isFullscreenMode ? (
            onToggleLock && (
              <button
                type="button"
                onClick={() => {
                  onToggleLock();
                  onUserActivity();
                }}
                title="Lock screen controls"
                aria-label="Lock screen controls"
                className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white border border-white/15 transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Lock className="w-4 h-4" aria-hidden="true" />
              </button>
            )
          ) : (
            onToggleTheater && (
              <button
                type="button"
                onClick={() => {
                  onToggleTheater();
                  onUserActivity();
                }}
                title={isTheaterMode ? 'Exit Theater Mode (T)' : 'Theater Mode (T)'}
                aria-label={isTheaterMode ? 'Exit Theater Mode' : 'Theater Mode'}
                aria-pressed={isTheaterMode}
                className={`hidden lg:inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isTheaterMode
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-stone-900/80 hover:bg-stone-800 text-stone-200 hover:text-white border-white/15'
                }`}
              >
                <RectangleHorizontal className="w-4 h-4" aria-hidden="true" />
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => {
              onToggleFullscreen();
              onUserActivity();
            }}
            title={isFullscreenMode ? 'Exit Fullscreen (Esc)' : 'Fullscreen with Chapters'}
            aria-label={isFullscreenMode ? 'Exit Fullscreen' : 'Fullscreen with Chapters'}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl bg-stone-900/80 hover:bg-stone-800 active:bg-stone-800 text-stone-200 hover:text-white border border-white/15 transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isFullscreenMode ? (
              <Minimize2 className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
