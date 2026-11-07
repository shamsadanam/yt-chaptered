'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Chapter } from '../types/playlist';
import {
  getStoredPlaybackRate,
  setStoredPlaybackRate,
  getStoredVolumePreference,
  setStoredVolumePreference,
} from '../lib/storage';

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate?: () => number;
  setPlaybackRate?: (rate: number) => void;
  getVolume?: () => number;
  setVolume?: (vol: number) => void;
  mute?: () => void;
  unMute?: () => void;
  isMuted?: () => boolean;
  loadModule?: (name: string) => void;
  unloadModule?: (name: string) => void;
  getOption?: (module: string, option: string) => unknown;
  setOption?: (module: string, option: string, value: unknown) => void;
  getOptions?: (module?: string) => unknown;
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
        onApiChange?: (event: YTPlayerEvent) => void;
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
  const playStateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastReportedTimeRef = useRef<number>(-1);

  useEffect(() => {
    return () => {
      if (seekDebounceTimerRef.current) clearTimeout(seekDebounceTimerRef.current);
      if (chapterDebounceTimerRef.current) clearTimeout(chapterDebounceTimerRef.current);
      if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialStartTime);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(() => getStoredPlaybackRate());
  const desiredPlaybackRateRef = useRef(playbackRate);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isCaptionsEnabled, setIsCaptionsEnabled] = useState(false);
  const isCaptionsEnabledRef = useRef(isCaptionsEnabled);
  useEffect(() => {
    isCaptionsEnabledRef.current = isCaptionsEnabled;
  }, [isCaptionsEnabled]);
  const [isCaptionsSupported, setIsCaptionsSupported] = useState<boolean | undefined>(undefined);

  const [volume, setVolumeState] = useState(() => {
    const pref = getStoredVolumePreference();
    return pref ? pref.volume : 100;
  });
  const [isMuted, setIsMutedState] = useState(() => {
    const pref = getStoredVolumePreference();
    return pref ? pref.isMuted : false;
  });
  const customVolumeRef = useRef<number | null>(null);
  const customMutedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const pref = getStoredVolumePreference();
    if (pref) {
      customVolumeRef.current = pref.volume;
      customMutedRef.current = pref.isMuted;
    }
  }, []);

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
          fs: 0,
          cc_lang_pref: 'en',
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onReady: (event: YTPlayerEvent) => {
            if (isCancelled) return;
            setIsReady(true);
            const dur = event.target.getDuration();
            setDuration(dur || 0);

            const targetRate = desiredPlaybackRateRef.current;
            if (typeof event.target.setPlaybackRate === 'function' && targetRate !== 1) {
              event.target.setPlaybackRate(targetRate);
            }
            if (typeof event.target.getPlaybackRate === 'function') {
              const currentRate = event.target.getPlaybackRate();
              setPlaybackRateState(currentRate || targetRate);
            } else {
              setPlaybackRateState(targetRate);
            }

            if (customVolumeRef.current !== null && typeof event.target.setVolume === 'function') {
              event.target.setVolume(customVolumeRef.current);
              setVolumeState(customVolumeRef.current);
            } else if (typeof event.target.getVolume === 'function') {
              const initialVol = event.target.getVolume();
              if (typeof initialVol === 'number') setVolumeState(initialVol);
            }

            if (customMutedRef.current !== null) {
              if (customMutedRef.current && typeof event.target.mute === 'function') {
                event.target.mute();
                setIsMutedState(true);
              } else if (!customMutedRef.current && typeof event.target.unMute === 'function') {
                event.target.unMute();
                setIsMutedState(false);
              }
            } else if (typeof event.target.isMuted === 'function') {
              setIsMutedState(Boolean(event.target.isMuted()));
            }

            // Pre-load captions module in the background so tracklist is available on demand
            if (typeof event.target.loadModule === 'function') {
              event.target.loadModule('captions');
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
          onApiChange: () => {
            if (isCancelled || !playerRef.current) return;
            const p = playerRef.current;
            if (typeof p.getOption === 'function') {
              try {
                const trackList = p.getOption('captions', 'tracklist') as Array<{ languageCode?: string }> | undefined;
                if (Array.isArray(trackList)) {
                  setIsCaptionsSupported(trackList.length > 0);
                }
                const track = p.getOption('captions', 'track');
                const isCurrentlyOn = Boolean(track && typeof track === 'object' && Object.keys(track).length > 0);
                setIsCaptionsEnabled(isCurrentlyOn);
              } catch {
                setIsCaptionsSupported(false);
              }
            }
            if (typeof p.isMuted === 'function') {
              setIsMutedState(Boolean(p.isMuted()));
            }
            if (typeof p.getVolume === 'function') {
              const v = p.getVolume();
              if (typeof v === 'number' && !isNaN(v)) setVolumeState(v);
            }
          },
          onStateChange: (event: YTPlayerEvent) => {
            if (isCancelled) return;

            // Sync volume and mute on state changes if user has not set a custom preference
            if (customMutedRef.current === null && typeof event.target.isMuted === 'function') {
              setIsMutedState(Boolean(event.target.isMuted()));
            }
            if (customVolumeRef.current === null && typeof event.target.getVolume === 'function') {
              const v = event.target.getVolume();
              if (typeof v === 'number' && !isNaN(v)) setVolumeState(v);
            }

            const playerState = event.data;
            if (playerState === 1) {
              if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
              setIsPlaying(true);
              setIsPlayLoading(false);

              // Proactively re-assert playback rate when video resumes or starts playing
              const targetRate = desiredPlaybackRateRef.current;
              if (typeof event.target.setPlaybackRate === 'function') {
                const currentRate =
                  typeof event.target.getPlaybackRate === 'function'
                    ? event.target.getPlaybackRate()
                    : null;
                if (currentRate !== targetRate) {
                  event.target.setPlaybackRate(targetRate);
                }
              }

              // Ensure captions module is active when playback begins
              if (typeof event.target.loadModule === 'function') {
                event.target.loadModule('captions');
              }
            } else if (playerState === 2) {
              if (playStateTimeoutRef.current) clearTimeout(playStateTimeoutRef.current);
              setIsPlaying(false);
              setIsPlayLoading(false);
            } else if (playerState === 3) {
              // 3 = Buffering; video is actively loading chunks
              setIsPlayLoading(true);

              // Connection drop / chunk buffering can cause YouTube to revert rate: re-assert
              const targetRate = desiredPlaybackRateRef.current;
              if (typeof event.target.setPlaybackRate === 'function') {
                event.target.setPlaybackRate(targetRate);
              }
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
          if (typeof t !== 'number' || isNaN(t)) return;

          // Skip queuing frame if time has not progressed by at least 0.25s
          if (Math.abs(t - lastReportedTimeRef.current) < 0.25) return;
          lastReportedTimeRef.current = t;

          // Schedule updates inside requestAnimationFrame to keep setInterval handler instant (<1ms)
          if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = requestAnimationFrame(() => {
            setCurrentTime(t);
            updateActiveChapterIndex(t);
            onTimeUpdateRef.current?.(t, currentChapterIndexRef.current);
          });
        }

        // Sync volume, mute & captions if adjusted inside YouTube iframe
        if (playerRef.current) {
          if (customMutedRef.current === null && typeof playerRef.current.isMuted === 'function') {
            const m = Boolean(playerRef.current.isMuted());
            setIsMutedState((prev) => (prev !== m ? m : prev));
          }
          if (customVolumeRef.current === null && typeof playerRef.current.getVolume === 'function') {
            const v = playerRef.current.getVolume();
            if (typeof v === 'number' && !isNaN(v)) {
              setVolumeState((prev) => (prev !== v ? v : prev));
            }
          }
          if (typeof playerRef.current.getOption === 'function') {
            try {
              const track = playerRef.current.getOption('captions', 'track');
              const isCurrentlyOn = Boolean(track && typeof track === 'object' && Object.keys(track).length > 0);
              setIsCaptionsEnabled((prev) => (prev !== isCurrentlyOn ? isCurrentlyOn : prev));
            } catch {
              // Module loading
            }
          }
        }
      }, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
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
    desiredPlaybackRateRef.current = rate;
    setStoredPlaybackRate(rate);
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      playerRef.current.setPlaybackRate(rate);
    }
    setPlaybackRateState(rate);
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

  const toggleCaptions = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (typeof player.loadModule === 'function') {
        player.loadModule('captions');
      }

      const currentTrack = typeof player.getOption === 'function' ? player.getOption('captions', 'track') : null;
      const isCurrentlyOn =
        isCaptionsEnabledRef.current ||
        Boolean(currentTrack && typeof currentTrack === 'object' && Object.keys(currentTrack).length > 0);

      if (isCurrentlyOn) {
        if (typeof player.setOption === 'function') {
          player.setOption('captions', 'track', {});
        }
        if (typeof player.unloadModule === 'function') {
          player.unloadModule('captions');
        }
        setIsCaptionsEnabled(false);
      } else {
        const activateCaptions = () => {
          if (!playerRef.current) return;
          const p = playerRef.current;
          let trackToSet: unknown = { languageCode: 'en' };
          if (typeof p.getOption === 'function') {
            const trackList = p.getOption('captions', 'tracklist') as Array<{ languageCode?: string }> | undefined;
            if (Array.isArray(trackList) && trackList.length > 0) {
              const enTrack = trackList.find(
                (t) => t.languageCode === 'en' || t.languageCode?.startsWith('en')
              );
              trackToSet = enTrack || trackList[0];
              setIsCaptionsSupported(true);
            } else if (trackList !== undefined && trackList.length === 0) {
              setIsCaptionsSupported(false);
            }
          }
          if (typeof p.setOption === 'function') {
            p.setOption('captions', 'track', trackToSet);
          }
        };

        activateCaptions();
        setTimeout(activateCaptions, 150);
        setTimeout(activateCaptions, 400);
        setTimeout(activateCaptions, 800);

        setIsCaptionsEnabled(true);
      }
    } catch (err) {
      console.warn('Failed to toggle captions:', err);
      setIsCaptionsSupported(false);
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newVolume)));
    customVolumeRef.current = clamped;
    customMutedRef.current = false;
    setStoredVolumePreference(clamped, false);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(clamped);
      if (clamped > 0 && typeof playerRef.current.unMute === 'function') {
        playerRef.current.unMute();
        setIsMutedState(false);
      }
      setVolumeState(clamped);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    const player = playerRef.current;
    if (typeof player.isMuted === 'function' && typeof player.mute === 'function' && typeof player.unMute === 'function') {
      const currentlyMuted = player.isMuted();
      const nextMuted = !currentlyMuted;
      customMutedRef.current = nextMuted;
      setStoredVolumePreference(volume, nextMuted);
      if (nextMuted) {
        player.mute();
        setIsMutedState(true);
      } else {
        player.unMute();
        setIsMutedState(false);
        if (volume === 0 && typeof player.setVolume === 'function') {
          player.setVolume(50);
          setVolumeState(50);
          customVolumeRef.current = 50;
          setStoredVolumePreference(50, false);
        }
      }
    }
  }, [volume]);

  return {
    isReady,
    isPlaying,
    isPlayLoading,
    currentTime,
    duration,
    playbackRate,
    currentChapterIndex,
    playerError,
    isCaptionsEnabled,
    isCaptionsSupported,
    volume,
    isMuted,
    seekToChapter,
    seekToTime,
    seekBy,
    setPlaybackRate,
    setVolume,
    toggleMute,
    play,
    pause,
    toggleCaptions,
  };
}
