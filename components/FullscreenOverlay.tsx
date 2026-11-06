"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { List, Lock, Check } from "lucide-react";
import { Chapter, ParsedPlaylist } from "../types/playlist";
import { PlayerPlaybackState, PlayerPlaybackActions } from "../types/player";
import { secondsToTimestamp } from "../lib/youtubeParser";
import { FullscreenChapterDrawer } from "./fullscreen/FullscreenChapterDrawer";
import { FullscreenBottomBar } from "./fullscreen/FullscreenBottomBar";

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
  const { isPlaying, volume, isMuted, currentTime, duration } = playerState;
  const isCurrentCompleted = activeChapter
    ? completedIdsSet.has(activeChapter.id)
    : false;

  const {
    play,
    pause,
    seekToChapter,
    seekBy,
    setVolume,
    toggleMute,
    toggleCaptions,
  } = playerActions;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showLockUnlockPill, setShowLockUnlockPill] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lockPillTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  const resetHideTimer = useCallback(() => {
    if (isLocked) return;
    setControlsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (isPlaying && !isDrawerOpen && !isSpeedMenuOpen && !isHoveringControls) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 4000);
    }
  }, [isPlaying, isDrawerOpen, isSpeedMenuOpen, isHoveringControls, isLocked]);

  useEffect(() => {
    if (isLocked) return;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (isPlaying && !isDrawerOpen && !isSpeedMenuOpen && !isHoveringControls) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 4000);
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isPlaying, isDrawerOpen, isSpeedMenuOpen, isHoveringControls, isLocked]);

  useEffect(() => {
    return () => {
      if (lockPillTimeoutRef.current) {
        clearTimeout(lockPillTimeoutRef.current);
      }
    };
  }, []);

  const resetHideTimerRef = useRef(resetHideTimer);
  useEffect(() => {
    resetHideTimerRef.current = resetHideTimer;
  });

  useEffect(() => {
    const handleWindowPointer = () => {
      if (isLocked) return;
      resetHideTimerRef.current();
    };
    window.addEventListener("pointermove", handleWindowPointer, {
      passive: true,
    });
    return () => {
      window.removeEventListener("pointermove", handleWindowPointer);
    };
  }, [isLocked]);

  const handleKeyDownRef = useRef<(e: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    handleKeyDownRef.current = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
        if (e.key === "Escape") {
          setIsDrawerOpen(false);
        }
        return;
      }

      if (isLocked) {
        return;
      }

      switch (e.key) {
        case "i":
        case "I":
          e.preventDefault();
          setIsDrawerOpen((prev) => !prev);
          resetHideTimer();
          break;

        case "c":
        case "C":
          e.preventDefault();
          toggleCaptions?.();
          resetHideTimer();
          break;

        case " ":
        case "k":
        case "K":
          e.preventDefault();
          if (isPlaying) {
            pause();
          } else {
            play();
          }
          resetHideTimer();
          break;

        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          seekBy(-10);
          resetHideTimer();
          break;

        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          seekBy(10);
          resetHideTimer();
          break;

        case "[":
        case "p":
          e.preventDefault();
          if (currentChapterIndex > 0) {
            seekToChapter(currentChapterIndex - 1);
          }
          resetHideTimer();
          break;

        case "]":
        case "n":
          e.preventDefault();
          if (currentChapterIndex < totalChapters - 1) {
            seekToChapter(currentChapterIndex + 1);
          }
          resetHideTimer();
          break;

        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          resetHideTimer();
          break;

        case "ArrowUp":
          e.preventDefault();
          {
            const currentEffective = isMuted ? 0 : volume;
            setVolume(Math.min(100, currentEffective + 5));
          }
          resetHideTimer();
          break;

        case "ArrowDown":
          e.preventDefault();
          {
            const currentEffective = isMuted ? 0 : volume;
            setVolume(Math.max(0, currentEffective - 5));
          }
          resetHideTimer();
          break;

        case "Escape":
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
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        speedMenuRef.current &&
        !speedMenuRef.current.contains(e.target as Node)
      ) {
        setIsSpeedMenuOpen(false);
      }
    };
    if (isSpeedMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isSpeedMenuOpen]);

  return (
    <div
      onPointerMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      className={`absolute inset-0 z-30 select-none overflow-hidden flex flex-col justify-between ${
        ((controlsVisible || isDrawerOpen) && !isLocked) || showLockUnlockPill
          ? "cursor-default"
          : "cursor-none"
      }`}
    >
      <div
        className="absolute inset-0 z-0"
        onPointerMove={resetHideTimer}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            if (isLocked) {
              setShowLockUnlockPill(true);
              if (lockPillTimeoutRef.current) {
                clearTimeout(lockPillTimeoutRef.current);
              }
              lockPillTimeoutRef.current = setTimeout(() => {
                setShowLockUnlockPill(false);
              }, 2500);
              return;
            }

            if (isDrawerOpen) {
              setIsDrawerOpen(false);
              resetHideTimer();
              return;
            }

            if (controlsVisible) {
              if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
              }
              setControlsVisible(false);
            } else {
              setControlsVisible(true);
              resetHideTimer();
            }
          }
        }}
        onDoubleClick={() => {
          if (!isLocked) {
            onExitFullscreen();
          }
        }}
      />

      <div role="status" aria-live="polite" className="sr-only">
        {activeChapter
          ? `Now playing chapter ${currentChapterIndex + 1}: ${activeChapter.title}`
          : ""}
      </div>

      <header
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
        className={`relative z-10 w-full bg-gradient-to-b from-black/90 via-black/40 to-transparent pt-3 pb-8 px-3 sm:px-6 flex items-center justify-between gap-3 transition-opacity duration-200 pointer-events-auto ${
          (controlsVisible || isDrawerOpen) && !isLocked
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
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
            aria-label={
              isDrawerOpen
                ? "Hide course chapter list"
                : "Show course chapter list"
            }
            title="Toggle Chapter List (I)"
            className={`min-h-11 px-3.5 inline-flex items-center gap-2 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isDrawerOpen
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-stone-900/80 hover:bg-stone-800 text-stone-200 border-white/15"
            }`}
          >
            <List className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden xs:inline">
              {isDrawerOpen ? "Close Chapters" : "Chapters"}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-2xs font-mono font-tnum">
              {currentChapterIndex + 1}/{totalChapters}
            </span>
          </button>
        </div>

        <div className="flex flex-col items-center min-w-0 max-w-xs sm:max-w-md lg:max-w-xl text-center px-2">
          <div className="flex items-center gap-1.5 text-2xs text-stone-300 font-mono font-tnum">
            <span className="text-primary font-semibold uppercase tracking-wider">
              Ch {currentChapterIndex + 1}/{totalChapters}
            </span>
            <span className="text-stone-500">•</span>
            <span>
              {secondsToTimestamp(Math.floor(currentTime))} /{" "}
              {secondsToTimestamp(Math.floor(duration))}
            </span>
          </div>
          <h1 className="text-xs sm:text-sm font-semibold text-stone-100 truncate w-full mt-0.5">
            {activeChapter ? activeChapter.title : playlist.video.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {activeChapter && (
            <button
              type="button"
              role="checkbox"
              aria-checked={isCurrentCompleted}
              onClick={(e) => {
                onToggleComplete(activeChapter.id, e);
                resetHideTimer();
              }}
              title={
                isCurrentCompleted
                  ? "Mark chapter as incomplete"
                  : "Mark chapter as completed"
              }
              aria-label={
                isCurrentCompleted
                  ? "Mark chapter as incomplete"
                  : "Mark chapter as completed"
              }
              className={`min-h-11 px-3.5 inline-flex items-center gap-2 rounded-xl text-xs font-semibold border backdrop-blur-md transition-colors cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 ${
                isCurrentCompleted
                  ? "bg-primary text-white border-primary shadow-xs"
                  : "bg-stone-900/80 hover:bg-stone-800 text-stone-200 border-white/15"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                  isCurrentCompleted
                    ? "bg-white border-white text-primary"
                    : "border-stone-400"
                }`}
              >
                {isCurrentCompleted && (
                  <Check
                    className="w-2.5 h-2.5"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                )}
              </div>
              <span className="hidden sm:inline">
                {isCurrentCompleted ? "Completed" : "Mark Complete"}
              </span>
            </button>
          )}
        </div>
      </header>

      {isLocked && showLockUnlockPill && (
        <div className="absolute inset-x-0 bottom-12 sm:bottom-16 z-50 flex items-center justify-center pointer-events-none p-4 transition-opacity duration-200">
          <button
            type="button"
            onClick={() => {
              setIsLocked(false);
              setShowLockUnlockPill(false);
              if (lockPillTimeoutRef.current) {
                clearTimeout(lockPillTimeoutRef.current);
              }
              setControlsVisible(true);
              resetHideTimer();
            }}
            aria-label="Unlock player controls"
            className="pointer-events-auto min-h-11 px-5 py-2.5 rounded-full bg-stone-950/95 text-white border border-primary/50 shadow-2xl backdrop-blur-md inline-flex items-center gap-2.5 text-xs font-semibold hover:bg-stone-900 active:scale-98 transition-all cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Lock className="w-4 h-4 text-primary" aria-hidden="true" />
            <span>Locked • Tap to unlock</span>
          </button>
        </div>
      )}

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
        isLocked={isLocked}
        onToggleLock={() => {
          setIsLocked((prev) => !prev);
          setIsDrawerOpen(false);
          setIsSpeedMenuOpen(false);
        }}
        chapters={playlist.chapters}
        currentChapterIndex={currentChapterIndex}
        totalChapters={totalChapters}
        playerState={playerState}
        playerActions={playerActions}
        isSpeedMenuOpen={isSpeedMenuOpen}
        speedMenuRef={speedMenuRef}
        setIsSpeedMenuOpen={setIsSpeedMenuOpen}
        onExitFullscreen={onExitFullscreen}
        onUserActivity={resetHideTimer}
        onHoverControls={setIsHoveringControls}
      />
    </div>
  );
}
