'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Chapter } from '../types/playlist';

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate?: () => number;
  setPlaybackRate?: (rate: number) => void;
  destroy: () => void;
}

export interface YTPlayerEvent {
  target: YTPlayerInstance;
  data: number;
}

export interface YTNamespace {
  Player: new (
    elementId: string,
    config: {
      videoId: string;
      width: string;
      height: string;
      playerVars?: Record<string, unknown>;
      events?: {
        onReady?: (event: YTPlayerEvent) => void;
        onStateChange?: (event: YTPlayerEvent) => void;
        onError?: (event: YTPlayerEvent) => void;
      };
    }
  ) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}

interface UseYouTubePlayerOptions {
  containerId: string;
  videoId: string;
  chapters: Chapter[];
  onChapterChange?: (newIndex: number) => void;
  onChapterComplete?: (chapterIndex: number, chapter: Chapter) => void;
  onEnded?: () => void;
  onTimeUpdate?: (seconds: number, currentChapterIndex: number) => void;
  autoPlay?: boolean;
  initialStartTime?: number;
  initialChapterIndex?: number;
}

export function useYouTubePlayer({
  containerId,
  videoId,
  chapters,
  onChapterChange,
  onChapterComplete,
  onEnded,
  onTimeUpdate,
  autoPlay = false,
  initialStartTime = 0,
  initialChapterIndex = 0,
}: UseYouTubePlayerOptions) {
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const seekDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chapterDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (seekDebounceTimerRef.current) clearTimeout(seekDebounceTimerRef.current);
      if (chapterDebounceTimerRef.current) clearTimeout(chapterDebounceTimerRef.current);
      if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
    };
  }, []);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialStartTime);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const playStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initialStartTimeRef = useRef(initialStartTime);
  useEffect(() => {
    initialStartTimeRef.current = initialStartTime;
  }, [videoId, initialStartTime]);

  const autoPlayRef = useRef(autoPlay);
  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  // Keep chapters and index refs updated for interval callbacks inside effects
  const chaptersRef = useRef<Chapter[]>(chapters);
  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  const currentChapterIndexRef = useRef(currentChapterIndex);
  useEffect(() => {
    currentChapterIndexRef.current = currentChapterIndex;
  }, [currentChapterIndex]);

  const onChapterChangeRef = useRef(onChapterChange);
  useEffect(() => {
    onChapterChangeRef.current = onChapterChange;
  }, [onChapterChange]);

  const onTimeUpdateRef = useRef(onTimeUpdate);
  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  const onChapterCompleteRef = useRef(onChapterComplete);
  useEffect(() => {
    onChapterCompleteRef.current = onChapterComplete;
  }, [onChapterComplete]);

  const onEndedRef = useRef(onEnded);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const completedInSessionRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    completedInSessionRef.current.clear();
  }, [videoId]);

  // Sync active chapter index and trigger completion when strictly reaching 100% of chapter end
  const updateActiveChapterIndex = useCallback(
    (time: number) => {
      const list = chaptersRef.current;
      if (!list || list.length === 0) return;

      for (let i = list.length - 1; i >= 0; i--) {
        if (time >= list[i].startTime) {
          if (currentChapterIndexRef.current !== i) {
            setCurrentChapterIndex(i);
            onChapterChangeRef.current?.(i);
          }
          break;
        }
      }

      // Check each chapter to see if playback has strictly reached 100% of its endTime
      for (let i = 0; i < list.length; i++) {
        const chap = list[i];
        if (typeof chap.endTime === 'number' && Number.isFinite(chap.endTime)) {
          if (time >= chap.endTime && !completedInSessionRef.current.has(chap.id)) {
            completedInSessionRef.current.add(chap.id);
            onChapterCompleteRef.current?.(i, chap);
          }
        }
      }
    },
    []
  );

  // Load YouTube IFrame API script
  useEffect(() => {
    let isCancelled = false;

    const loadIframeAPI = () => {
      if (typeof window === 'undefined') return;

      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }

      const existingScript = document.getElementById('youtube-iframe-api-script');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(tag, firstScript);
      }

      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        if (!isCancelled) {
          initPlayer();
        }
      };
    };

    const initPlayer = () => {
      const container = document.getElementById(containerId);
      if (!container || !window.YT || !window.YT.Player) return;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore destroy errors
        }
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: autoPlayRef.current ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event: YTPlayerEvent) => {
            if (isCancelled) return;
            setIsReady(true);
            const dur = event.target.getDuration();
            setDuration(dur || 0);

            if (typeof event.target.getPlaybackRate === 'function') {
              const initialRate = event.target.getPlaybackRate();
              if (initialRate) setPlaybackRateState(initialRate);
            }

            // Seek to initial resume timestamp if provided
            const startTime = initialStartTimeRef.current;
            if (startTime > 0) {
              event.target.seekTo(startTime, true);
              setCurrentTime(startTime);
            } else if (chaptersRef.current.length > 0 && chaptersRef.current[0].startTime > 0) {
              event.target.seekTo(chaptersRef.current[0].startTime, true);
            }
          },
          onStateChange: (event: YTPlayerEvent) => {
            if (isCancelled) return;
            const playerState = event.data;
            if (playerState === 1) {
              if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
              setIsPlaying(true);
              setIsPlayLoading(false);
            } else if (playerState === 2) {
              if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
              setIsPlaying(false);
              setIsPlayLoading(false);
            } else if (playerState === 3) {
              // 3 = Buffering; video is actively loading chunks
              setIsPlayLoading(true);
            } else {
              if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
              setIsPlaying(false);
              setIsPlayLoading(false);
              if (playerState === 0) {
                onEndedRef.current?.();
              }
            }
          },
          onError: (event: YTPlayerEvent) => {
            if (isCancelled) return;
            if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
            setIsPlayLoading(false);
            const code = event.data;
            if (code === 101 || code === 150) {
              setPlayerError('Playback restricted: The video owner has disabled third-party embedding.');
            } else if (code === 100) {
              setPlayerError('Video not found or has been set to private.');
            } else if (code === 2) {
              setPlayerError('Invalid YouTube video ID.');
            } else {
              setPlayerError('Playback error occurred on this video.');
            }
          },
        },
      });
    };

    loadIframeAPI();

    return () => {
      isCancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [containerId, videoId]);

  // Periodic time polling when playing
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        // Skip updating currentTime while debounced seek is settling to prevent jitter
        if (pendingSeekTimeRef.current !== null) return;

        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const t = playerRef.current.getCurrentTime();
          setCurrentTime(t);
          updateActiveChapterIndex(t);
          onTimeUpdateRef.current?.(t, currentChapterIndexRef.current);
        }
      }, 250);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, updateActiveChapterIndex]);

  const seekToChapter = useCallback(
    (index: number) => {
      const list = chaptersRef.current;
      if (!list || !list[index]) return;
      const targetChapter = list[index];

      setCurrentChapterIndex(index);
      currentChapterIndexRef.current = index;
      onChapterChangeRef.current?.(index);

      // Optimistically sync displayed time and chapter before iframe settles
      pendingSeekTimeRef.current = targetChapter.startTime;
      setCurrentTime(targetChapter.startTime);

      if (chapterDebounceTimerRef.current) {
        clearTimeout(chapterDebounceTimerRef.current);
      }

      chapterDebounceTimerRef.current = setTimeout(() => {
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(targetChapter.startTime, true);
          playerRef.current.playVideo();
          setIsPlaying(true);
        }
        setTimeout(() => {
          pendingSeekTimeRef.current = null;
        }, 150);
      }, 150);
    },
    []
  );

  const seekToTime = useCallback(
    (seconds: number) => {
      const dur =
        (typeof playerRef.current?.getDuration === 'function'
          ? playerRef.current.getDuration()
          : 0) || duration;
      const target = Math.max(0, dur > 0 ? Math.min(dur, seconds) : seconds);

      pendingSeekTimeRef.current = target;
      setCurrentTime(target);
      updateActiveChapterIndex(target);

      if (seekDebounceTimerRef.current) {
        clearTimeout(seekDebounceTimerRef.current);
      }

      seekDebounceTimerRef.current = setTimeout(() => {
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(target, true);
        }
        setTimeout(() => {
          pendingSeekTimeRef.current = null;
        }, 150);
      }, 250);
    },
    [duration, updateActiveChapterIndex]
  );

  const seekBy = useCallback(
    (deltaSeconds: number) => {
      // Accumulate against pending target on rapid repeated taps instead of lagging iframe position
      const base =
        pendingSeekTimeRef.current !== null
          ? pendingSeekTimeRef.current
          : typeof playerRef.current?.getCurrentTime === 'function'
          ? playerRef.current.getCurrentTime()
          : currentTime;

      const dur =
        (typeof playerRef.current?.getDuration === 'function'
          ? playerRef.current.getDuration()
          : 0) || duration;
      const target = Math.max(0, dur > 0 ? Math.min(dur, base + deltaSeconds) : base + deltaSeconds);

      pendingSeekTimeRef.current = target;
      setCurrentTime(target);
      updateActiveChapterIndex(target);

      if (seekDebounceTimerRef.current) {
        clearTimeout(seekDebounceTimerRef.current);
      }

      seekDebounceTimerRef.current = setTimeout(() => {
        if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(target, true);
        }
        setTimeout(() => {
          pendingSeekTimeRef.current = null;
        }, 150);
      }, 250);

      return target;
    },
    [currentTime, duration, updateActiveChapterIndex]
  );

  const setPlaybackRate = useCallback((rate: number) => {
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(rate);
      setPlaybackRateState(rate);
    }
  }, []);

  const play = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      setIsPlayLoading(true);
      if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
      playStateTimeoutRef.current = setTimeout(() => {
        setIsPlayLoading(false);
      }, 4000);
      playerRef.current.playVideo();
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      setIsPlayLoading(true);
      if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
      playStateTimeoutRef.current = setTimeout(() => {
        setIsPlayLoading(false);
      }, 4000);
      playerRef.current.pauseVideo();
    }
  }, []);

  return {
    isReady,
    isPlaying,
    isPlayLoading,
    currentTime,
    duration,
    playbackRate,
    currentChapterIndex,
    playerError,
    seekToChapter,
    seekToTime,
    seekBy,
    setPlaybackRate,
    play,
    pause,
  };
}
