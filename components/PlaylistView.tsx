"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useSyncExternalStore,
  ViewTransition,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Loader2,
  AlertTriangle,
  ExternalLink,
  Check,
  Play,
  ArrowLeft,
} from "lucide-react";
import { Chapter, ParsedPlaylist, SavedCourse } from "../types/playlist";
import { useYouTubePlayer } from "../hooks/useYouTubePlayer";
import { useDoubleClickHandler } from "../hooks/useDoubleClickHandler";
import { secondsToTimestamp } from "../lib/youtubeParser";
import { PlayerControlsBar } from "./player/PlayerControlsBar";
const FullscreenOverlay = dynamic(
  () => import("./FullscreenOverlay").then((mod) => mod.FullscreenOverlay),
  { ssr: false },
);
import {
  saveCourse,
  getSavedCourse,
  updateCoursePlaybackProgress,
  toggleChapterCompletion,
  markChapterCompleted,
  subscribeCourses,
  getCompletedChapterIdsSnapshot,
  getCompletedChapterIdsServerSnapshot,
} from "../lib/storage";
import {
  isCurrentlyFullscreen,
  requestFullscreen,
  exitFullscreen,
  lockOrientation,
  unlockOrientation,
} from "../lib/fullscreen";

interface PlaylistViewProps {
  playlist: ParsedPlaylist;
  onReset?: () => void;
}

export function PlaylistView({ playlist, onReset }: PlaylistViewProps) {
  const containerId = "youtube-active-player";
  const sidebarListRef = useRef<HTMLOListElement>(null);
  const activeItemRef = useRef<HTMLLIElement | null>(null);

  const [copiedTimestamps, setCopiedTimestamps] = useState(false);
  const [showRawTimestamps, setShowRawTimestamps] = useState(false);

  const urlDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce updating URL query parameter to avoid flooding browser history during rapid seeks
  const updateUrlTimestamp = useCallback((seconds: number) => {
    if (typeof window === "undefined") return;
    if (urlDebounceTimerRef.current) {
      clearTimeout(urlDebounceTimerRef.current);
    }
    urlDebounceTimerRef.current = setTimeout(() => {
      const url = new URL(window.location.href);
      const targetT = Math.floor(seconds).toString();
      if (url.searchParams.get("t") !== targetT) {
        url.searchParams.set("t", targetT);
        window.history.replaceState(null, "", url.pathname + url.search);
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
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (
      !url.searchParams.has("t") &&
      playlist.initialStartTime !== undefined &&
      playlist.initialStartTime > 0
    ) {
      updateUrlTimestamp(playlist.initialStartTime);
    }
  }, [playlist.initialStartTime, updateUrlTimestamp]);

  // Load initial completed state & last playback time
  const completedIds = useSyncExternalStore(
    subscribeCourses,
    useCallback(
      () => getCompletedChapterIdsSnapshot(playlist.video.id),
      [playlist.video.id],
    ),
    getCompletedChapterIdsServerSnapshot,
  );

  const completedIdsSet = useMemo(() => new Set(completedIds), [completedIds]);

  const lastSaveTimeRef = useRef<number>(0);

  const playlistRef = useRef(playlist);
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  // Ensure course is registered in storage if not already existing
  useEffect(() => {
    const current = playlistRef.current;
    const existing = getSavedCourse(playlist.video.id);
    if (!existing) {
      const initialCourse: SavedCourse = {
        video: current.video,
        chapters: current.chapters,
        rawTimestampsText: current.rawTimestampsText || "",
        completedChapterIds: [],
        lastPlayedChapterIndex: current.initialChapterIndex ?? 0,
        lastPlayedSeconds: current.initialStartTime ?? 0,
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
    [playlist.video.id],
  );

  const handleChapterComplete = useCallback(
    (_chapterIndex: number, chapter: Chapter) => {
      markChapterCompleted(playlist.video.id, chapter.id);
    },
    [playlist.video.id],
  );

  const handleVideoEnded = useCallback(() => {
    // Mark final chapter as complete when full video ends
    if (playlist.chapters.length > 0) {
      const lastChapter = playlist.chapters[playlist.chapters.length - 1];
      markChapterCompleted(playlist.video.id, lastChapter.id);
    }
  }, [playlist.video.id, playlist.chapters]);

  const handleChapterChange = useCallback(
    (newIndex: number) => {
      const chap = playlist.chapters[newIndex];
      if (chap) {
        updateUrlTimestamp(chap.startTime);
      }
    },
    [playlist.chapters, updateUrlTimestamp],
  );

  const {
    isReady,
    isPlaying,
    isPlayLoading,
    currentTime,
    duration,
    playbackRate,
    currentChapterIndex,
    playerError,
    volume,
    isMuted,
    seekToChapter,
    seekBy,
    seekToTime,
    setPlaybackRate,
    setVolume,
    toggleMute,
    play,
    pause,
  } = useYouTubePlayer({
    containerId,
    videoId: playlist.video.id,
    chapters: playlist.chapters,
    autoPlay: true,
    initialStartTime: playlist.initialStartTime ?? 0,
    initialChapterIndex: playlist.initialChapterIndex ?? 0,
    onChapterChange: handleChapterChange,
    onTimeUpdate: handleTimeUpdate,
    onChapterComplete: handleChapterComplete,
    onEnded: handleVideoEnded,
  });

  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimer = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    if (isPlaying && !isSpeedMenuOpen && !isHoveringControls) {
      controlsTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
    }
  }, [isPlaying, isSpeedMenuOpen, isHoveringControls]);

  useEffect(() => {
    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    if (isPlaying && !isSpeedMenuOpen && !isHoveringControls) {
      controlsTimerRef.current = setTimeout(() => {
        setIsControlsVisible(false);
      }, 3000);
    }
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, [isPlaying, isSpeedMenuOpen, isHoveringControls]);

  // Reset portrait orientation transform when tab/device is hidden to prevent mobile viewport snapshot glitches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsPortrait(false);
      } else {
        if (typeof window !== "undefined") {
          setIsPortrait(window.innerHeight > window.innerWidth);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Sync fullscreen state across vendor implementations
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = isCurrentlyFullscreen();
      setIsFullscreen(isNowFullscreen);
      if (!isNowFullscreen) {
        unlockOrientation();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  // Track portrait vs landscape to handle fullscreen rotation transforms
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window !== "undefined") {
        setIsPortrait(window.innerHeight > window.innerWidth);
      }
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // Dismiss playback speed popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        speedMenuRef.current &&
        !speedMenuRef.current.contains(e.target as Node)
      ) {
        setIsSpeedMenuOpen(false);
      }
    };
    if (isSpeedMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSpeedMenuOpen]);

  const activeChapter: Chapter | undefined =
    playlist.chapters[currentChapterIndex];

  // Auto-scroll sidebar list so active chapter remains in view on desktop sidebar
  useEffect(() => {
    if (
      activeItemRef.current &&
      typeof window !== "undefined" &&
      window.innerWidth >= 1024
    ) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentChapterIndex]);

  const handleToggleComplete = useCallback(
    (chapterId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      toggleChapterCompletion(playlist.video.id, chapterId);
    },
    [playlist.video.id]
  );

  const handleSelectChapter = useCallback(
    (idx: number) => {
      seekToChapter(idx);
      const chap = playlist.chapters[idx];
      if (chap) updateUrlTimestamp(chap.startTime);
    },
    [seekToChapter, playlist.chapters, updateUrlTimestamp]
  );

  const handleSeekBy = useCallback(
    (deltaSeconds: number) => {
      const newTime = seekBy(deltaSeconds);
      updateUrlTimestamp(newTime);
    },
    [seekBy, updateUrlTimestamp]
  );

  const handleSeekToTime = useCallback(
    (seconds: number) => {
      seekToTime(seconds);
      updateUrlTimestamp(seconds);
    },
    [seekToTime, updateUrlTimestamp]
  );

  const handleToggleFullscreen = useCallback(async () => {
    const elem = playerWrapperRef.current;
    if (!elem) return;

    if (!isCurrentlyFullscreen()) {
      try {
        await requestFullscreen(elem);

        // Lock landscape orientation on mobile portrait devices supporting Screen Orientation API
        if (isPortrait) {
          await lockOrientation("landscape");
        }
      } catch (err) {
        console.warn("Fullscreen request failed:", err);
      }
    } else {
      try {
        await exitFullscreen();
        unlockOrientation();
      } catch (err) {
        console.warn("Exit fullscreen failed:", err);
      }
    }
  }, [isPortrait]);

  const handleTogglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
    resetControlsTimer();
  }, [isPlaying, pause, play, resetControlsTimer]);

  const handleDoubleTapFullscreen = useCallback(() => {
    handleToggleFullscreen();
    resetControlsTimer();
  }, [handleToggleFullscreen, resetControlsTimer]);

  const handleCanvasSingleClick = useCallback(() => {
    if (!isControlsVisible) {
      resetControlsTimer();
    } else {
      handleTogglePlayPause();
    }
  }, [isControlsVisible, resetControlsTimer, handleTogglePlayPause]);

  const {
    handleClick: handleCanvasClick,
    handleDoubleClick: handleCanvasDoubleClick,
  } = useDoubleClickHandler({
    onSingleClick: handleCanvasSingleClick,
    onDoubleClick: handleDoubleTapFullscreen,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setIsTheaterMode((prev) => !prev);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMute]);

  const handleCopyTimestamps = async () => {
    const text =
      playlist.rawTimestampsText ||
      playlist.chapters.map((c) => `${c.formattedTime} ${c.title}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTimestamps(true);
      setTimeout(() => setCopiedTimestamps(false), 2000);
    } catch (err) {
      console.warn("Failed to copy timestamps:", err);
    }
  };

  const completedCount = completedIds.length;
  const totalChapters = playlist.chapters.length;
  const progressPercentage =
    totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;

  const isCurrentCompleted = activeChapter
    ? completedIdsSet.has(activeChapter.id)
    : false;
  const activeChapterEndTime = activeChapter
    ? Number.isFinite(activeChapter.endTime)
      ? activeChapter.endTime
      : duration > 0
        ? duration
        : activeChapter.startTime
    : 0;
  const activeChapterEndTimeFormatted =
    activeChapterEndTime > 0
      ? secondsToTimestamp(Math.floor(activeChapterEndTime))
      : "End";
  const chapterDuration = activeChapter
    ? Math.max(1, activeChapterEndTime - activeChapter.startTime)
    : 1;
  const chapterProgressPercentage = activeChapter
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((currentTime - activeChapter.startTime) / chapterDuration) * 100,
          ),
        ),
      )
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
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 mb-2 sm:mb-2.5 text-xs"
        >
          <Link
            href="/"
            transitionTypes={['nav-back']}
            prefetch={true}
            onClick={() => onReset?.()}
            className="inline-flex items-center gap-1.5 font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors py-1 px-1.5 -ml-1.5 rounded-md hover:bg-stone-200/60 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Back to Courses"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Courses</span>
          </Link>
          <span
            className="text-stone-300 dark:text-stone-700"
            aria-hidden="true"
          >
            /
          </span>
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
            title={`Visit ${playlist.video.author || "YouTube Channel"} on YouTube (opens in new tab)`}
            aria-label={`Visit ${playlist.video.author || "YouTube Channel"} on YouTube (opens in new tab)`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded-xs group"
          >
            <span>
              By{" "}
              <span className="font-semibold text-stone-900 dark:text-stone-100 group-hover:text-primary dark:group-hover:text-emerald-400 transition-colors">
                {playlist.video.author || "YouTube Channel"}
              </span>
            </span>
            <ExternalLink
              className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors shrink-0"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>

      {/* Responsive Layout: Sticky video on mobile, 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* Left Column: Video Player, Dedicated Controls & Current Chapter */}
        <div
          className={`${
            isTheaterMode ? "lg:col-span-12" : "lg:col-span-7 xl:col-span-8"
          } flex flex-col gap-3 sm:gap-4 transition-all duration-200`}
        >
          {/* 16:9 Video Embed Container (Sticky below navbar on mobile) */}
          <div className="sticky top-14 sm:static z-20 bg-stone-50 dark:bg-stone-950 sm:bg-transparent py-0 -mx-3 sm:mx-0">
            <ViewTransition name={`course-hero-${playlist.video.id}`} share="morph">
              <div
                ref={playerWrapperRef}
                onPointerMove={(e) => {
                  if (e.pointerType !== "touch") resetControlsTimer();
                }}
                onPointerDown={(e) => {
                  if (e.pointerType !== "touch") resetControlsTimer();
                }}
                className={`group/player relative w-full aspect-video bg-black overflow-hidden ${
                  isFullscreen
                    ? "fixed inset-0 z-50 rounded-none w-screen h-screen flex items-center justify-center"
                    : "rounded-none sm:rounded-xl shadow-none sm:shadow-xs border-0 sm:border border-stone-200 dark:border-stone-800"
                }`}
              >
                {/* Inner wrapper rotated 90deg when fullscreened on portrait viewports */}
                <div
                  className="w-full h-full relative"
                  style={
                    isFullscreen && isPortrait
                      ? {
                          position: "absolute",
                          width: "100vh",
                          height: "100vw",
                          transform: "translate(-50%, -50%) rotate(90deg)",
                          top: "50%",
                          left: "50%",
                        }
                      : undefined
                  }
                >
                  <div id={containerId} className="w-full h-full" />
                  {!isReady && !playerError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900 text-white gap-3">
                      <div className="animate-spin inline-flex">
                        <Loader2
                          className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-500"
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-white/80">
                        Loading YouTube Player...
                      </span>
                    </div>
                  )}
                  {playerError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-stone-900/95 text-white p-4 sm:p-6 text-center gap-2 sm:gap-3 z-10">
                      <AlertTriangle
                        className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-500"
                        aria-hidden="true"
                      />
                      <p className="text-xs sm:text-sm font-semibold max-w-md">
                        {playerError}
                      </p>
                      <a
                        href={`https://www.youtube.com/watch?v=${playlist.video.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 sm:mt-2 inline-flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-md transition-colors min-h-11 touch-manipulation"
                      >
                        <span>Open directly on YouTube</span>
                        <ExternalLink
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                      </a>
                    </div>
                  )}

                  {/* Rich Fullscreen Overlay with transport bar & chapter drawer */}
                  {isFullscreen && (
                    <FullscreenOverlay
                      playlist={playlist}
                      activeChapter={activeChapter}
                      currentChapterIndex={currentChapterIndex}
                      totalChapters={totalChapters}
                      completedIdsSet={completedIdsSet}
                      playerState={{
                        isPlaying,
                        isPlayLoading,
                        isReady,
                        currentTime,
                        duration,
                        playbackRate,
                        volume,
                        isMuted,
                      }}
                      playerActions={{
                        play,
                        pause,
                        seekToChapter: handleSelectChapter,
                        seekBy: handleSeekBy,
                        seekToTime: handleSeekToTime,
                        setPlaybackRate,
                        setVolume,
                        toggleMute,
                      }}
                      onToggleComplete={handleToggleComplete}
                      onExitFullscreen={handleToggleFullscreen}
                    />
                  )}

                  {!isFullscreen && isReady && !playerError && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                      <div
                        role="presentation"
                        className="absolute top-12 sm:top-14 inset-x-0 bottom-0 pointer-events-auto z-0"
                        onClick={handleCanvasClick}
                        onDoubleClick={handleCanvasDoubleClick}
                        onPointerMove={(e) => {
                          if (e.pointerType !== "touch") resetControlsTimer();
                        }}
                        aria-label="Video player double-click fullscreen overlay"
                      />

                      <PlayerControlsBar
                        mode="windowed"
                        visible={isControlsVisible}
                        chapters={playlist.chapters}
                        currentChapterIndex={currentChapterIndex}
                        totalChapters={totalChapters}
                        playerState={{
                          isPlaying,
                          isPlayLoading,
                          isReady,
                          currentTime,
                          duration,
                          playbackRate,
                          volume,
                          isMuted,
                        }}
                        playerActions={{
                          play,
                          pause,
                          seekToChapter: handleSelectChapter,
                          seekBy: handleSeekBy,
                          seekToTime: handleSeekToTime,
                          setPlaybackRate,
                          setVolume,
                          toggleMute,
                        }}
                        isSpeedMenuOpen={isSpeedMenuOpen}
                        speedMenuRef={speedMenuRef}
                        setIsSpeedMenuOpen={setIsSpeedMenuOpen}
                        isTheaterMode={isTheaterMode}
                        onToggleTheater={() => setIsTheaterMode((prev) => !prev)}
                        onToggleFullscreen={handleToggleFullscreen}
                        onUserActivity={resetControlsTimer}
                        onHoverControls={setIsHoveringControls}
                      />
                    </div>
                  )}
                </div>
              </div>
            </ViewTransition>
          </div>

          <section
            aria-label="Active chapter info and progress"
            className="bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800 rounded-xl p-3.5 sm:p-4 flex flex-col gap-2.5 shadow-xs"
          >
            {/* Top row: Chapter metadata + Mark Complete toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-primary">
                    Chapter {currentChapterIndex + 1} of {totalChapters}
                  </span>
                  <span
                    className="text-stone-300 dark:text-stone-700"
                    aria-hidden="true"
                  >
                    •
                  </span>
                  <span className="text-xs font-mono font-tnum text-stone-500 dark:text-stone-400">
                    {activeChapter ? activeChapter.formattedTime : "0:00"} →{" "}
                    {activeChapterEndTimeFormatted}
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 leading-snug break-words">
                  {activeChapter ? activeChapter.title : "Playing Course"}
                </h2>
              </div>

              {/* Fast chapter completion check */}
              {activeChapter && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isCurrentCompleted}
                  onClick={(e) => handleToggleComplete(activeChapter.id, e)}
                  title={
                    isCurrentCompleted
                      ? "Mark chapter as incomplete"
                      : "Mark chapter as completed"
                  }
                  aria-label={
                    isCurrentCompleted
                      ? `Mark chapter ${currentChapterIndex + 1} as incomplete`
                      : `Mark chapter ${currentChapterIndex + 1} as completed`
                  }
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-11 touch-manipulation border shrink-0 focus:outline-none focus:ring-2 focus:ring-primary ${
                    isCurrentCompleted
                      ? "bg-primary text-white border-primary"
                      : "bg-stone-50 text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:bg-stone-950 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 border-stone-200 dark:border-stone-800"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center ${
                      isCurrentCompleted
                        ? "bg-white border-white text-primary"
                        : "border-stone-400 dark:border-stone-600"
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
                  <span>
                    {isCurrentCompleted ? "Completed" : "Mark Complete"}
                  </span>
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
          </section>
        </div>

        {/* Right Column: Interactive Playlist Sidebar */}
        <div
          className={`${
            isTheaterMode
              ? "lg:col-span-12 max-h-120"
              : "lg:col-span-5 xl:col-span-4 lg:max-h-187.5"
          } bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden flex flex-col shadow-xs transition-all duration-200`}
        >
          {/* Sidebar Header */}
          <div className="p-3 sm:p-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100">
                  Course Chapters
                </h2>
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
                  ref={
                    isActive
                      ? (node) => {
                          activeItemRef.current = node;
                        }
                      : undefined
                  }
                  className={`content-visibility-auto w-full p-2 sm:p-2.5 rounded-lg transition-all flex items-center gap-2 sm:gap-2.5 my-0.5 min-h-13 ${
                    isActive
                      ? "bg-stone-100 dark:bg-stone-800/80 border border-primary dark:border-emerald-500 shadow-xs"
                      : "hover:bg-stone-50 dark:hover:bg-stone-800/50 border border-transparent"
                  }`}
                >
                  {/* Primary Chapter Select Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectChapter(idx)}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={`Play chapter ${chap.index}: ${chap.title}, timestamp ${chap.formattedTime}${isCompleted ? ", completed" : ""}`}
                    className="flex-1 min-w-0 text-left flex items-center gap-2.5 sm:gap-3 cursor-pointer touch-manipulation active:scale-98 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 -m-1"
                  >
                    {/* Index Badge */}
                    <div
                      className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-primary text-white"
                          : isCompleted
                            ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                            : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                      }`}
                      aria-hidden="true"
                    >
                      {isActive ? (
                        <Play
                          className="w-3 h-3 fill-current ml-0.5 animate-pulse text-white"
                          aria-hidden="true"
                        />
                      ) : (
                        <span>{chap.index}</span>
                      )}
                    </div>

                    {/* Chapter Info */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm leading-snug break-words transition-opacity line-clamp-2 ${
                          isCompleted
                            ? "text-stone-500 line-through decoration-stone-400 dark:text-stone-500 dark:decoration-stone-600"
                            : "text-stone-900 dark:text-stone-100"
                        } ${isActive ? "font-semibold" : "font-normal"}`}
                      >
                        {chap.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                        <span
                          className={`text-xs font-mono font-tnum px-1.5 py-0.5 rounded-sm border ${
                            isActive
                              ? "bg-white border-primary/30 text-primary font-medium dark:bg-stone-900 dark:border-emerald-500/30 dark:text-emerald-400"
                              : "bg-white border-stone-200 text-stone-600 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-400"
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

                  {/* Manual Completion Checkbox button with full 44px+ tap zone */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isCompleted}
                    onClick={(e) => handleToggleComplete(chap.id, e)}
                    title={
                      isCompleted
                        ? "Mark chapter as incomplete"
                        : "Mark chapter as completed"
                    }
                    aria-label={
                      isCompleted
                        ? `Mark chapter ${chap.index}: ${chap.title} as incomplete`
                        : `Mark chapter ${chap.index}: ${chap.title} as completed`
                    }
                    className="shrink-0 w-10 h-10 flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                  >
                    <div
                      className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-colors ${
                        isCompleted
                          ? "bg-primary border-primary text-white"
                          : "bg-white dark:bg-stone-900 border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600"
                      }`}
                    >
                      {isCompleted && (
                        <Check
                          className="w-3.5 h-3.5"
                          strokeWidth={3}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Course Resources & Timestamps Section */}
      <section
        aria-label="Course resources and timestamps"
        className="mt-6 sm:mt-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 sm:p-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100">
              Course Timestamps & Source
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Review structured timestamps or open the original video on
              YouTube.
            </p>
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
              <ExternalLink
                className="w-3.5 h-3.5 text-stone-500"
                aria-hidden="true"
              />
            </a>
            <button
              type="button"
              onClick={handleCopyTimestamps}
              aria-label={
                copiedTimestamps
                  ? "Course timestamps copied to clipboard"
                  : "Copy course timestamps to clipboard"
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-900 dark:text-stone-100 bg-stone-50 hover:bg-stone-100 active:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-800 dark:active:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-lg transition-colors min-h-9 cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {copiedTimestamps ? (
                <>
                  <Check
                    className="w-3.5 h-3.5 text-primary dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <span className="text-primary dark:text-emerald-400 font-semibold">
                    Copied
                  </span>
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
              <span>{showRawTimestamps ? "Hide" : "View Raw"}</span>
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
            {playlist.rawTimestampsText ||
              playlist.chapters
                .map((c) => `${c.formattedTime} ${c.title}`)
                .join("\n")}
          </pre>
        )}
      </section>
    </div>
  );
}
