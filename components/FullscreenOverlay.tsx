'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { List } from 'lucide-react';
import { Chapter, ParsedPlaylist } from '../types/playlist';
import { PlayerPlaybackState, PlayerPlaybackActions } from '../types/player';
import { FullscreenChapterDrawer } from './fullscreen/FullscreenChapterDrawer';
import { FullscreenBottomBar } from './fullscreen/FullscreenBottomBar';

export interface FullscreenOverlayProps {
  playlist: ParsedPlaylist;
  activeChapter: Chapter | undefined;
  currentChapterIndex: number;
  totalChapters: number;
  completedIdsSet: Set<string>;
  playerState: PlayerPlaybackState;
  playerActions: PlayerPlaybackActions;
  onToggleComplete: (chapterId: string, e?: React.MouseEvent) => void;
  onExitFullscreen: () => void;
}

export function FullscreenOverlay({
  playlist,
  activeChapter,
  currentChapterIndex,
  totalChapters,
  completedIdsSet,
  playerState,
  playerActions,
  onToggleComplete,
  onExitFullscreen,
}: FullscreenOverlayProps) {
  const {
    isPlaying,
    isPlayLoading,
    isReady,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isCaptionsEnabled,
  } = playerState;

  const {
    play,
    pause,
    seekToChapter,
    seekToTime,
    seekBy,
    setPlaybackRate,
    setVolume,
    toggleMute,
    toggleCaptions,
  } = playerActions;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (isPlaying && !isDrawerOpen && !isSpeedMenuOpen && !isHoveringControls) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 5000);
    }
  }, [isPlaying, isDrawerOpen, isSpeedMenuOpen, isHoveringControls]);

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (isPlaying && !isDrawerOpen && !isSpeedMenuOpen && !isHoveringControls) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 5000);
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isPlaying, isDrawerOpen, isSpeedMenuOpen, isHoveringControls]);

  const resetHideTimerRef = useRef(resetHideTimer);
  useEffect(() => {
    resetHideTimerRef.current = resetHideTimer;
  });

  useEffect(() => {
    const handleWindowPointer = () => {
      resetHideTimerRef.current();
    };
    window.addEventListener('pointermove', handleWindowPointer, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleWindowPointer);
    };
  }, []);

  const handleKeyDownRef = useRef<(e: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    handleKeyDownRef.current = (e: KeyboardEvent) => {
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
          toggleCaptions?.();
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
          toggleMute();
          resetHideTimer();
          break;

        case 'ArrowUp':
          e.preventDefault();
          {
            const currentEffective = isMuted ? 0 : volume;
            setVolume(Math.min(100, currentEffective + 5));
          }
          resetHideTimer();
          break;

        case 'ArrowDown':
          e.preventDefault();
          {
            const currentEffective = isMuted ? 0 : volume;
            setVolume(Math.max(0, currentEffective - 5));
          }
          resetHideTimer();
          break;

        case 'Escape':
          if (isSpeedMenuOpen) {
            setIsSpeedMenuOpen(false);
          } else if (isDrawerOpen) {
            setIsDrawerOpen(false);
          }
          break;

        default:
          resetHideTimer();
          break;
      }
    };
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleKeyDownRef.current(e);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  return (
    <div
      onPointerMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className={`absolute inset-0 z-30 select-none overflow-hidden flex flex-col justify-between ${
        controlsVisible || isDrawerOpen ? 'cursor-default' : 'cursor-none'
      }`}
    >
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

      <div role="status" aria-live="polite" className="sr-only">
        {activeChapter ? `Now playing chapter ${currentChapterIndex + 1}: ${activeChapter.title}` : ''}
      </div>

      <header
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
        className={`relative z-10 w-full bg-gradient-to-b from-black/90 via-black/50 to-transparent pt-4 pb-10 px-4 sm:px-6 flex items-center justify-between gap-3 transition-opacity duration-200 pointer-events-auto ${
          controlsVisible || isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
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

        <div className="hidden sm:flex flex-col items-center min-w-0 max-w-md lg:max-w-xl text-center px-2">
          <h1 className="text-xs sm:text-sm font-semibold text-stone-100 truncate w-full">
            {playlist.video.title}
          </h1>
          <span className="text-2xs text-stone-400 truncate w-full">
            {playlist.video.author || 'YouTube Course'}
          </span>
        </div>

        <div className="w-11" aria-hidden="true" />
      </header>

      <FullscreenChapterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chapters={playlist.chapters}
        currentChapterIndex={currentChapterIndex}
        totalChapters={totalChapters}
        completedIdsSet={completedIdsSet}
        onSelectChapter={seekToChapter}
        onToggleComplete={onToggleComplete}
        onUserActivity={resetHideTimer}
        onHoverControls={setIsHoveringControls}
      />

      <FullscreenBottomBar
        visible={controlsVisible || isDrawerOpen}
        chapters={playlist.chapters}
        activeChapter={activeChapter}
        currentChapterIndex={currentChapterIndex}
        totalChapters={totalChapters}
        completedIdsSet={completedIdsSet}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        isPlayLoading={isPlayLoading}
        isReady={isReady}
        playbackRate={playbackRate}
        volume={volume}
        isMuted={isMuted}
        isCaptionsEnabled={isCaptionsEnabled}
        isDrawerOpen={isDrawerOpen}
        isSpeedMenuOpen={isSpeedMenuOpen}
        speedMenuRef={speedMenuRef}
        setIsSpeedMenuOpen={setIsSpeedMenuOpen}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        onPlay={play}
        onPause={pause}
        onSeekBy={seekBy}
        onSeekToTime={seekToTime}
        onSeekToChapter={seekToChapter}
        onSetPlaybackRate={setPlaybackRate}
        onSetVolume={setVolume}
        onToggleMute={toggleMute}
        onToggleCaptions={toggleCaptions}
        onToggleComplete={onToggleComplete}
        onExitFullscreen={onExitFullscreen}
        onUserActivity={resetHideTimer}
        onHoverControls={setIsHoveringControls}
      />
    </div>
  );
}
