'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  AlertCircle,
  ExternalLink,
  Play,
} from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import { YouTubeSearchResultItem, YouTubeSearchResponse } from '../types/search';
import { Chapter } from '../types/playlist';
import { saveCourse } from '../lib/storage';
import { TurnstileWidget } from './TurnstileWidget';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToAddModal?: () => void;
}

export function SearchModal({
  isOpen,
  onClose,
  onSwitchToAddModal,
}: SearchModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<YouTubeSearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const turnstileTokenRef = useRef<string | null>(null);
  const handleTokenChange = useCallback((token: string | null) => {
    turnstileTokenRef.current = token;
  }, []);

  // Selected video for the Preview Drawer
  const [selectedVideo, setSelectedVideo] =
    useState<YouTubeSearchResultItem | null>(null);
  const [previewChapters, setPreviewChapters] = useState<Chapter[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const resultsRef = useRef(results);
  const selectedIndexRef = useRef(selectedIndex);
  const selectedVideoRef = useRef(selectedVideo);
  const handleSelectVideoRef = useRef<(video: YouTubeSearchResultItem) => void>(() => {});
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const activeIndex =
    results.length > 0 ? Math.min(selectedIndex, results.length - 1) : 0;

  useEffect(() => {
    resultsRef.current = results;
    selectedIndexRef.current = activeIndex;
    selectedVideoRef.current = selectedVideo;
  });

  useEffect(() => {
    if (results.length > 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, results.length]);

  if (isOpen && !isRendered) {
    setIsRendered(true);
  }

  // Handle smooth entrance and exit animations
  useEffect(() => {
    if (isOpen) {
      const frameId = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      const frameId = requestAnimationFrame(() => {
        setIsVisible(false);
      });
      const timer = setTimeout(() => {
        setIsRendered(false);
        setSelectedVideo(null);
        setPreviewChapters([]);
      }, 200);
      return () => {
        cancelAnimationFrame(frameId);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  useScrollLock(isRendered);

  // Focus trap and keyboard listeners
  useEffect(() => {
    if (!isRendered) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedVideoRef.current) {
          // Go back from preview to search results
          setSelectedVideo(null);
        } else {
          onClose();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        if (!selectedVideoRef.current && resultsRef.current.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % resultsRef.current.length);
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        if (!selectedVideoRef.current && resultsRef.current.length > 0) {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + resultsRef.current.length) % resultsRef.current.length);
        }
        return;
      }

      if (e.key === 'Enter') {
        if (!selectedVideoRef.current && resultsRef.current.length > 0) {
          const idx = selectedIndexRef.current;
          if (idx >= 0 && idx < resultsRef.current.length) {
            e.preventDefault();
            handleSelectVideoRef.current(resultsRef.current[idx]);
          }
        }
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isRendered, selectedVideo, onClose]);

  // Debounce search query input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute YouTube Innertube search
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    const performSearch = async () => {
      setIsSearching(true);
      setSearchError(null);
      setHasSearched(true);

      try {
        const headers: Record<string, string> = {};
        if (turnstileTokenRef.current) {
          headers['x-turnstile-token'] = turnstileTokenRef.current;
        }

        const res = await fetch(
          `/api/protected/youtube-search?q=${encodeURIComponent(debouncedQuery)}`,
          {
            headers,
            signal: controller.signal,
          }
        );

        if (isCancelled) return;

        const data: YouTubeSearchResponse = await res.json().catch(() => ({
          success: false,
          error: 'Failed to parse response',
        }));

        if (isCancelled) return;

        if (res.ok && data.success && data.results) {
          setResults(data.results);
          setSelectedIndex(0);
        } else {
          setSearchError(
            data.error || `Search failed with status ${res.status}`
          );
          setResults([]);
          setSelectedIndex(0);
        }
      } catch (err) {
        if (isCancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setSearchError(
          err instanceof Error
            ? err.message
            : 'Network error while searching YouTube'
        );
        setResults([]);
        setSelectedIndex(0);
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    };

    performSearch();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

  // Fetch full timestamped chapters when a video is selected for Preview
  const handleSelectVideo = useCallback(
    async (video: YouTubeSearchResultItem) => {
      setSelectedVideo(video);
      setIsPreviewLoading(true);
      setPreviewError(null);
      setPreviewChapters([]);

      try {
        const headers: Record<string, string> = {};
        if (turnstileTokenRef.current) {
          headers['x-turnstile-token'] = turnstileTokenRef.current;
        }

        const res = await fetch(
          `/api/protected/youtube-info?videoId=${video.videoId}`,
          { headers }
        );
        const data = await res.json().catch(() => null);

        if (res.ok && data && data.success && Array.isArray(data.chapters)) {
          setPreviewChapters(data.chapters);
        } else {
          // If no chapters endpoint or empty, construct tentative chapters from preview titles if any
          if (video.chapterTitles && video.chapterTitles.length > 0) {
            const fallbackChapters: Chapter[] = video.chapterTitles.map(
              (title, idx) => ({
                id: `preview-chap-${idx}`,
                index: idx + 1,
                title,
                startTime: 0,
                endTime: Infinity,
                formattedTime: 'Chapter',
                status: 'not_started',
              })
            );
            setPreviewChapters(fallbackChapters);
          } else {
            setPreviewChapters([]);
          }
        }
      } catch (err) {
        setPreviewError(
          err instanceof Error ? err.message : 'Failed to load chapter markers'
        );
      } finally {
        setIsPreviewLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    handleSelectVideoRef.current = handleSelectVideo;
  }, [handleSelectVideo]);

  // Start Learning: save course and launch player
  const handleStartLearning = () => {
    if (!selectedVideo) return;

    const initialStartTime =
      previewChapters.length > 0 ? previewChapters[0].startTime : 0;

    saveCourse({
      video: {
        id: selectedVideo.videoId,
        url: `https://www.youtube.com/watch?v=${selectedVideo.videoId}`,
        title: selectedVideo.title,
        author: selectedVideo.author,
        thumbnailUrl: selectedVideo.thumbnailUrl,
      },
      chapters: previewChapters,
      rawTimestampsText: '',
      completedChapterIds: [],
      lastPlayedChapterIndex: 0,
      lastPlayedSeconds: initialStartTime,
      updatedAt: Date.now(),
    });

    onClose();
    router.push(`/watch/${selectedVideo.videoId}`);
  };

  const handleClearQuery = () => {
    setQuery('');
    setDebouncedQuery('');
    setResults([]);
    setSelectedIndex(0);
    setSearchError(null);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  if (!isRendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200 ease-out pr-scrollbar-compensation ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)' }}
        className={`w-full sm:max-w-xl md:max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] transition-all duration-200 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 sm:scale-100'
            : 'opacity-0 translate-y-6 sm:translate-y-2 sm:scale-95'
        }`}
      >
        <h2 id="search-modal-title" className="sr-only">
          Search YouTube Videos
        </h2>

        {/* Top Header / Search Input Bar */}
        {!selectedVideo ? (
          <div className="flex items-center px-4 sm:px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 shrink-0 gap-3 bg-white dark:bg-stone-900">
            <div className="flex items-center gap-1.5 shrink-0 text-stone-400">
              {isSearching ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <svg className="w-6 h-6 text-red-600 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              role="searchbox"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={query}
              onChange={(e) => {
                const val = e.target.value;
                setQuery(val);
                if (val.trim().length < 2) {
                  setResults([]);
                  setSelectedIndex(0);
                  setSearchError(null);
                  setHasSearched(false);
                }
              }}
              placeholder="Search YouTube courses & videos..."
              aria-label="Search YouTube videos"
              className="flex-1 min-w-0 bg-transparent border-0 p-0 text-sm sm:text-base text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-0 leading-normal"
            />

            {query ? (
              <button
                type="button"
                onClick={handleClearQuery}
                aria-label="Clear search input"
                className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer transition-colors shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search dialog"
                className="w-8 h-8 sm:hidden rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer transition-colors shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}

            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-mono text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 rounded shrink-0">
              ESC
            </kbd>
          </div>
        ) : (
          /* Preview Mode Header */
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-stone-200 dark:border-stone-800 shrink-0 bg-white dark:bg-stone-900">
            <button
              type="button"
              onClick={() => setSelectedVideo(null)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer py-1 px-2 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back to results</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close search dialog"
              className="w-8 h-8 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Invisible Turnstile Bot Verification */}
        <TurnstileWidget
          onTokenChange={handleTokenChange}
          action="youtube_search"
          className="empty:hidden"
        />

        {/* View Mode 1: Search Form & Results */}
        {!selectedVideo ? (
          <>
            {/* Live screen reader announcement */}
            <div role="status" aria-live="polite" className="sr-only">
              {isSearching
                ? 'Searching YouTube...'
                : hasSearched
                ? `${results.length} videos found for ${debouncedQuery}`
                : ''}
            </div>

            {/* Results Scroll Area */}
            <div className="overflow-y-auto overscroll-contain flex-1 p-2 sm:p-3 divide-y divide-stone-100 dark:divide-stone-800/40">
              {/* Error Banner */}
              {searchError && (
                <div
                  role="alert"
                  className="m-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="font-medium">Search unavailable</p>
                    <p className="mt-0.5 text-rose-700 dark:text-rose-300">{searchError}</p>
                    {onSwitchToAddModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSwitchToAddModal();
                        }}
                        className="mt-2 text-xs font-medium text-rose-900 dark:text-rose-100 underline hover:no-underline cursor-pointer"
                      >
                        Paste direct YouTube URL instead &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Zero-Query Initial State */}
              {!hasSearched && !isSearching && (
                <div className="py-14 sm:py-16 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-3 text-stone-400 dark:text-stone-500">
                    <Search className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-stone-700 dark:text-stone-300">
                    Search YouTube courses &amp; videos
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 max-w-xs mx-auto">
                    Search tutorials or lectures to convert them into timestamped chapter playlists.
                  </p>
                </div>
              )}

              {/* Loading Skeleton */}
              {isSearching && (
                <div aria-busy="true" className="space-y-1.5 py-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg animate-pulse"
                    >
                      <div className="w-28 sm:w-36 aspect-video rounded-md bg-stone-200 dark:bg-stone-800 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-4/5" />
                        <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-2/5" />
                      </div>
                      <div className="w-16 h-5 bg-stone-200 dark:bg-stone-800 rounded-full shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Zero Results State */}
              {hasSearched && !isSearching && results.length === 0 && !searchError && (
                <div className="py-12 px-4 text-center">
                  <p className="text-sm sm:text-base font-medium text-stone-700 dark:text-stone-300">
                    No videos found for &ldquo;{debouncedQuery}&rdquo;
                  </p>
                  <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-xs mx-auto">
                    Try a different keyword or paste a direct YouTube link.
                  </p>
                  {onSwitchToAddModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSwitchToAddModal();
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      <span>Paste direct YouTube URL</span>
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {/* Search Results List */}
              {!isSearching && results.length > 0 && (
                <div role="listbox" aria-label="YouTube search results" className="space-y-1">
                  {results.map((video, idx) => (
                    <div
                      key={video.videoId}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      role="option"
                      aria-selected={activeIndex === idx}
                      tabIndex={0}
                      onClick={() => handleSelectVideo(video)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectVideo(video);
                        }
                      }}
                      className={`group flex items-center gap-3 p-2.5 sm:p-3 rounded-lg transition-colors cursor-pointer select-none ${
                        activeIndex === idx
                          ? 'bg-stone-100 dark:bg-stone-800'
                          : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-28 sm:w-36 rounded-md overflow-hidden bg-black shrink-0">
                        {video.thumbnailUrl ? (
                          <Image
                            src={video.thumbnailUrl}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 112px, 144px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-stone-900">
                            <Play className="w-6 h-6 text-stone-500" />
                          </div>
                        )}
                        {video.duration && (
                          <div className="absolute bottom-1 right-1 bg-black/85 text-white font-mono font-tnum text-xs px-1.5 py-0.5 rounded leading-none">
                            {video.duration}
                          </div>
                        )}
                      </div>

                      {/* Video details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-medium text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug group-hover:text-primary dark:group-hover:text-emerald-400 transition-colors">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400 flex-wrap">
                          {video.author && (
                            <span className="truncate max-w-44 font-medium">
                              {video.author}
                            </span>
                          )}
                          {video.views && (
                            <>
                              <span aria-hidden="true">&bull;</span>
                              <span className="shrink-0">{video.views}</span>
                            </>
                          )}
                          {video.publishedTime && (
                            <>
                              <span aria-hidden="true">&bull;</span>
                              <span className="shrink-0">{video.publishedTime}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Chapters indicator / Arrow */}
                      <div className="shrink-0 pl-1 flex items-center gap-2">
                        {video.hasChapters ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" aria-hidden="true" />
                            <span>Chapters</span>
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400 dark:text-stone-500 hidden sm:inline">
                            Single
                          </span>
                        )}
                        <ArrowRight
                          className={`w-5 h-5 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-transform ${
                            activeIndex === idx
                              ? 'translate-x-0.5 text-stone-700 dark:text-stone-200'
                              : ''
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Command Palette Footer */}
            <div className="hidden sm:flex items-center justify-between px-4 py-2.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 text-sm text-stone-600 dark:text-stone-300 shrink-0">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <kbd className="min-w-6 h-6 px-1 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 inline-flex items-center justify-center shadow-2xs text-stone-700 dark:text-stone-200">
                      <ArrowUp className="w-4 h-4" aria-hidden="true" />
                    </kbd>
                    <kbd className="min-w-6 h-6 px-1 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 inline-flex items-center justify-center shadow-2xs text-stone-700 dark:text-stone-200">
                      <ArrowDown className="w-4 h-4" aria-hidden="true" />
                    </kbd>
                  </span>
                  <span>navigate</span>
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="min-w-6 h-6 px-1 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 inline-flex items-center justify-center shadow-2xs text-stone-700 dark:text-stone-200">
                    <CornerDownLeft className="w-4 h-4" aria-hidden="true" />
                  </kbd>
                  <span>select</span>
                </span>
                <span className="flex items-center gap-2">
                  <kbd className="h-6 px-2 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono text-xs font-semibold inline-flex items-center justify-center shadow-2xs text-stone-700 dark:text-stone-200">
                    esc
                  </kbd>
                  <span>close</span>
                </span>
              </div>
              {results.length > 0 && (
                <span className="font-mono text-sm font-medium text-stone-500 dark:text-stone-400">
                  {results.length} result{results.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </>
        ) : (
          /* View Mode 2: Chapter Preview Drawer */
          <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col p-3 sm:p-4">
            {/* Video Summary Header Bar */}
            <div className="p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 rounded-lg mb-3 flex items-center gap-3 shrink-0">
              <div className="relative aspect-video w-28 sm:w-36 rounded-md overflow-hidden bg-black shrink-0">
                {selectedVideo.thumbnailUrl ? (
                  <Image
                    src={selectedVideo.thumbnailUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 112px, 144px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-900">
                    <Play className="w-6 h-6 text-stone-500" />
                  </div>
                )}
                {selectedVideo.duration && (
                  <div className="absolute bottom-1 right-1 bg-black/85 text-white font-mono font-tnum text-xs px-1.5 py-0.5 rounded leading-none">
                    {selectedVideo.duration}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                  {selectedVideo.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 flex-wrap">
                  {selectedVideo.author && <span className="font-medium truncate max-w-44">{selectedVideo.author}</span>}
                  {selectedVideo.views && (
                    <>
                      <span aria-hidden="true">&bull;</span>
                      <span>{selectedVideo.views}</span>
                    </>
                  )}
                  {selectedVideo.publishedTime && (
                    <>
                      <span aria-hidden="true">&bull;</span>
                      <span>{selectedVideo.publishedTime}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="shrink-0 hidden sm:block">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" aria-hidden="true" />
                  <span>
                    {previewChapters.length > 0
                      ? `${previewChapters.length} Chapters`
                      : isPreviewLoading
                      ? 'Checking...'
                      : 'Single Video'}
                  </span>
                </span>
              </div>
            </div>

            {/* Chapter Breakdown Header */}
            <div className="flex items-center justify-between px-1 mb-2 shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Chapter Breakdown
              </span>
              <span className="text-xs font-mono font-tnum text-stone-400">
                {previewChapters.length} chapter{previewChapters.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Chapters List */}
            <div className="flex-1 min-h-48 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden bg-white dark:bg-stone-900 mb-3 divide-y divide-stone-100 dark:divide-stone-800/50 overflow-y-auto">
              {isPreviewLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-emerald-400 mb-2" aria-hidden="true" />
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                    Inspecting YouTube chapter markers...
                  </p>
                </div>
              ) : previewError ? (
                <div className="p-4 text-sm text-rose-600 dark:text-rose-400">
                  {previewError}
                </div>
              ) : previewChapters.length === 0 ? (
                <div className="py-10 text-center p-4">
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    This video has no timestamped chapters in its description or player.
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    You can still start learning to play the video continuously, or paste custom timestamps later.
                  </p>
                </div>
              ) : (
                previewChapters.map((chapter) => (
                  <div
                    key={chapter.id || chapter.index}
                    className="flex items-center justify-between p-2.5 sm:px-3 text-sm hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="w-6 text-xs font-mono text-stone-400 shrink-0 text-right">
                        {chapter.index}
                      </span>
                      <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                        {chapter.title}
                      </span>
                    </div>
                    {chapter.formattedTime && chapter.formattedTime !== 'Chapter' && (
                      <span className="text-xs font-mono font-tnum text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded shrink-0">
                        {chapter.formattedTime}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 pt-1 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="h-10 px-4 inline-flex items-center justify-center text-xs font-medium text-stone-700 dark:text-stone-300 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-lg transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleStartLearning}
                className="flex-1 h-10 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover active:bg-primary-hover text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary active:scale-98"
              >
                <span>Start Learning</span>
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
