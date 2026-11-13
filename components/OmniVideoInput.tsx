'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Search,
  Link as LinkIcon,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  X,
  ChevronDown,
  GraduationCap,
  Play,
  AlertCircle,
  Check,
  Lightbulb,
} from 'lucide-react';
import { extractYouTubeId, parseTimestamps } from '../lib/youtubeParser';
import { YouTubeSearchResultItem, YouTubeSearchResponse } from '../types/search';
import { Chapter, ParsedPlaylist } from '../types/playlist';
import { TurnstileWidget, TurnstileWidgetHandle } from './TurnstileWidget';
import { SAMPLE_DATA } from '../lib/sampleData';

interface VideoDetails {
  videoId: string;
  title: string;
  author?: string;
  channelId?: string;
  channelUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  formattedDuration?: string;
  chapters?: Chapter[];
  description?: string;
}

export interface OmniVideoInputProps {
  variant?: 'inline' | 'modal';
  onGenerate: (playlist: ParsedPlaylist) => void;
  onCloseModal?: () => void;
  autoFocus?: boolean;
}

const clientSearchCache = new Map<string, YouTubeSearchResultItem[]>();

export function OmniVideoInput({
  variant = 'inline',
  onGenerate,
  onCloseModal,
  autoFocus = false,
}: OmniVideoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const directVideoId = extractYouTubeId(query);
  const isDirectUrl = Boolean(
    directVideoId ||
      query.trim().startsWith('http://') ||
      query.trim().startsWith('https://') ||
      query.trim().startsWith('youtube.com') ||
      query.trim().startsWith('youtu.be') ||
      query.trim().startsWith('www.youtube.com')
  );

  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const turnstileTokenRef = useRef<string | null>(null);
  const handleTokenChange = useCallback((token: string | null) => {
    turnstileTokenRef.current = token;
  }, []);

  const waitForToken = useCallback(async (timeoutMs = 1500): Promise<string | null> => {
    if (turnstileTokenRef.current) return turnstileTokenRef.current;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (turnstileTokenRef.current) return turnstileTokenRef.current;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return turnstileTokenRef.current;
  }, []);

  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [urlVideoDetails, setUrlVideoDetails] = useState<VideoDetails | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [results, setResults] = useState<YouTubeSearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [selectedResult, setSelectedResult] = useState<YouTubeSearchResultItem | null>(null);
  const [previewChapters, setPreviewChapters] = useState<Chapter[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [customTimestampsText, setCustomTimestampsText] = useState('');
  const [isCustomTimestampsExpanded, setIsCustomTimestampsExpanded] = useState(false);

  const effectiveResults = useMemo(() => {
    return !isDirectUrl && debouncedQuery.length >= 2 && query.trim().length >= 2 ? results : [];
  }, [isDirectUrl, debouncedQuery, query, results]);
  const activeIndex = effectiveResults.length > 0 ? Math.min(selectedIndex, effectiveResults.length - 1) : 0;

  const resultsRef = useRef(effectiveResults);
  const selectedIndexRef = useRef(selectedIndex);
  const selectedResultRef = useRef(selectedResult);
  const queryRef = useRef(query);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    resultsRef.current = effectiveResults;
    selectedIndexRef.current = activeIndex;
    selectedResultRef.current = selectedResult;
    queryRef.current = query;
  }, [effectiveResults, activeIndex, selectedResult, query]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (isDirectUrl) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [query, isDirectUrl]);

  useEffect(() => {
    if (!directVideoId) return;

    let isCancelled = false;
    const fetchDirectVideo = async () => {
      setIsUrlLoading(true);
      setUrlError(null);
      setIsCustomTimestampsExpanded(false);
      setCustomTimestampsText('');

      try {
        const token = await waitForToken(1000);
        let headers: Record<string, string> = {};
        if (token) {
          headers['x-turnstile-token'] = token;
          turnstileTokenRef.current = null;
          turnstileRef.current?.reset();
        }

        let res = await fetch(`/api/protected/youtube-info?videoId=${directVideoId}`, { headers });
        if (res.status === 403 && !token) {
          turnstileRef.current?.reset();
          const retryToken = await waitForToken(1500);
          if (retryToken) {
            headers = { 'x-turnstile-token': retryToken };
            turnstileTokenRef.current = null;
            turnstileRef.current?.reset();
            res = await fetch(`/api/protected/youtube-info?videoId=${directVideoId}`, { headers });
          }
        }
        const data = await res.json().catch(() => null);

        if (isCancelled) return;

        if (res.ok && data && data.success) {
          const chapters = Array.isArray(data.chapters) ? data.chapters : [];
          setUrlVideoDetails({
            videoId: directVideoId,
            title: data.title || 'YouTube Video',
            author: data.author,
            channelId: data.channelId,
            channelUrl: data.channelUrl,
            thumbnailUrl: data.thumbnailUrl,
            duration: data.duration,
            chapters,
            description: data.description || '',
          });

          if (chapters.length === 0) {
            setIsCustomTimestampsExpanded(true);
          }
        } else {
          try {
            const oembedRes = await fetch(
              `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directVideoId}&format=json`
            );
            if (oembedRes.ok) {
              const oembedData = await oembedRes.json();
              if (!isCancelled) {
                setUrlVideoDetails({
                  videoId: directVideoId,
                  title: oembedData.title || 'YouTube Video',
                  author: oembedData.author_name,
                  channelUrl: oembedData.author_url,
                  thumbnailUrl: oembedData.thumbnail_url,
                  chapters: [],
                });
                setIsCustomTimestampsExpanded(true);
                return;
              }
            }
          } catch {
            // Ignore oembed network fallbacks
          }

          if (!isCancelled) {
            setUrlError(data?.error || 'Could not fetch video information. Please check the URL.');
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setUrlError(err instanceof Error ? err.message : 'Network error fetching video info');
        }
      } finally {
        if (!isCancelled) {
          setIsUrlLoading(false);
        }
      }
    };

    fetchDirectVideo();

    return () => {
      isCancelled = true;
    };
  }, [directVideoId, waitForToken]);

  useEffect(() => {
    if (isDirectUrl || debouncedQuery.length < 2) return;

    let isCancelled = false;
    const controller = new AbortController();

    const performSearch = async () => {
      const normalized = debouncedQuery.trim().toLowerCase();
      if (clientSearchCache.has(normalized)) {
        setResults(clientSearchCache.get(normalized)!);
        setSelectedIndex(0);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        let token = turnstileTokenRef.current;
        if (!token) {
          token = await waitForToken(1000);
        }

        let headers: Record<string, string> = {};
        if (token) {
          headers['x-turnstile-token'] = token;
          turnstileTokenRef.current = null;
          turnstileRef.current?.reset();
        }

        let res = await fetch(
          `/api/protected/youtube-search?q=${encodeURIComponent(debouncedQuery)}`,
          { headers, signal: controller.signal }
        );

        if (res.status === 403 && !token) {
          turnstileRef.current?.reset();
          const retryToken = await waitForToken(1500);
          if (retryToken) {
            headers = { 'x-turnstile-token': retryToken };
            turnstileTokenRef.current = null;
            turnstileRef.current?.reset();
            res = await fetch(
              `/api/protected/youtube-search?q=${encodeURIComponent(debouncedQuery)}`,
              { headers, signal: controller.signal }
            );
          }
        }

        const data: YouTubeSearchResponse = await res.json().catch(() => ({
          success: false,
          error: 'Failed to parse response',
        }));

        if (isCancelled) return;

        if (res.ok && data.success && data.results) {
          clientSearchCache.set(normalized, data.results);
          setResults(data.results);
          setSelectedIndex(0);
        } else {
          setSearchError(data.error || `Search failed with status ${res.status}`);
          setResults([]);
          setSelectedIndex(0);
        }
      } catch (err) {
        if (isCancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setSearchError(err instanceof Error ? err.message : 'Network error searching YouTube');
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
      setIsSearching(false);
    };
  }, [debouncedQuery, isDirectUrl, waitForToken]);

  const handleSelectResult = useCallback(
    async (video: YouTubeSearchResultItem) => {
      setSelectedResult(video);
      setIsPreviewLoading(true);
      setPreviewError(null);
      setPreviewChapters([]);
      setCustomTimestampsText('');
      setIsCustomTimestampsExpanded(false);

      try {
        let headers: Record<string, string> = {};
        let token = turnstileTokenRef.current;
        if (!token) {
          token = await waitForToken(800);
        }
        if (token) {
          headers['x-turnstile-token'] = token;
          turnstileTokenRef.current = null;
          turnstileRef.current?.reset();
        }

        let res = await fetch(`/api/protected/youtube-info?videoId=${video.videoId}`, { headers });
        if (res.status === 403) {
          turnstileRef.current?.reset();
          const freshToken = await waitForToken(1500);
          if (freshToken) {
            headers = { 'x-turnstile-token': freshToken };
            turnstileTokenRef.current = null;
            turnstileRef.current?.reset();
            res = await fetch(`/api/protected/youtube-info?videoId=${video.videoId}`, { headers });
          }
        }
        const data = await res.json().catch(() => null);

        if (res.ok && data && data.success && Array.isArray(data.chapters)) {
          setPreviewChapters(data.chapters);
          if (data.chapters.length === 0) {
            setIsCustomTimestampsExpanded(true);
          }
        } else {
          // If no timestamped chapters, avoid setting corrupted 0:00 markers
          setPreviewChapters([]);
          setIsCustomTimestampsExpanded(true);
        }
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Failed to inspect chapter markers');
        setIsCustomTimestampsExpanded(true);
      } finally {
        setIsPreviewLoading(false);
      }
    },
    [waitForToken]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setIsSearching(false);
    setIsUrlLoading(false);
    setResults([]);
    setSelectedResult(null);
    setUrlVideoDetails(null);
    setUrlError(null);
    setSearchError(null);
    setCustomTimestampsText('');
    setIsCustomTimestampsExpanded(false);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedResultRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedResult(null);
        }
        return;
      }

      if (resultsRef.current.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % resultsRef.current.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + resultsRef.current.length) % resultsRef.current.length);
          return;
        }
        if (e.key === 'Enter') {
          const idx = selectedIndexRef.current;
          if (idx >= 0 && idx < resultsRef.current.length) {
            e.preventDefault();
            handleSelectResult(resultsRef.current[idx]);
            return;
          }
        }
      }

      if (e.key === 'Escape') {
        if (queryRef.current) {
          e.preventDefault();
          handleClear();
        } else if (onCloseModal) {
          e.preventDefault();
          onCloseModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCloseModal, handleSelectResult, handleClear]);

  useEffect(() => {
    if (effectiveResults.length > 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, effectiveResults.length]);

  const handleGenerateDirect = () => {
    if (!urlVideoDetails) return;

    let chaptersToUse = urlVideoDetails.chapters || [];
    if (customTimestampsText.trim()) {
      const parsed = parseTimestamps(customTimestampsText, urlVideoDetails.duration);
      if (parsed.length > 0) {
        chaptersToUse = parsed;
      }
    }

    if (chaptersToUse.length === 0) {
      setUrlError('Please provide at least one chapter timestamp or enter "0:00 Full Video".');
      setIsCustomTimestampsExpanded(true);
      return;
    }

    const playlist: ParsedPlaylist = {
      video: {
        id: urlVideoDetails.videoId,
        url: `https://www.youtube.com/watch?v=${urlVideoDetails.videoId}`,
        title: urlVideoDetails.title,
        author: urlVideoDetails.author,
        channelId: urlVideoDetails.channelId,
        channelUrl: urlVideoDetails.channelUrl,
        thumbnailUrl: urlVideoDetails.thumbnailUrl,
        duration: urlVideoDetails.duration,
      },
      chapters: chaptersToUse,
      rawTimestampsText: customTimestampsText || urlVideoDetails.description || '',
    };

    if (onCloseModal) onCloseModal();
    onGenerate(playlist);
  };

  const handleGenerateSearchResult = () => {
    if (!selectedResult) return;

    let chaptersToUse = previewChapters;
    if (customTimestampsText.trim()) {
      const parsed = parseTimestamps(customTimestampsText);
      if (parsed.length > 0) {
        chaptersToUse = parsed;
      }
    }

    if (chaptersToUse.length === 0) {
      setPreviewError('Please provide at least one chapter timestamp or enter "0:00 Full Video".');
      setIsCustomTimestampsExpanded(true);
      return;
    }

    const initialStartTime = chaptersToUse.length > 0 ? chaptersToUse[0].startTime : 0;

    const playlist: ParsedPlaylist = {
      video: {
        id: selectedResult.videoId,
        url: `https://www.youtube.com/watch?v=${selectedResult.videoId}`,
        title: selectedResult.title,
        author: selectedResult.author,
        thumbnailUrl: selectedResult.thumbnailUrl,
      },
      chapters: chaptersToUse,
      rawTimestampsText: customTimestampsText || '',
      initialStartTime,
    };

    if (onCloseModal) onCloseModal();
    onGenerate(playlist);
  };

  const handleLoadSample = () => {
    const playlist: ParsedPlaylist = {
      video: {
        id: SAMPLE_DATA.videoId,
        url: SAMPLE_DATA.url,
        title: SAMPLE_DATA.title,
        author: SAMPLE_DATA.author,
        thumbnailUrl: SAMPLE_DATA.thumbnailUrl,
      },
      chapters: parseTimestamps(SAMPLE_DATA.description),
      rawTimestampsText: SAMPLE_DATA.description,
    };
    if (onCloseModal) onCloseModal();
    onGenerate(playlist);
  };

  return (
    <div className="w-full flex flex-col">
      <div className="relative w-full">
        <label htmlFor="omni-video-input" className="sr-only">
          Search topic or paste video link
        </label>
        <div className="relative flex items-center">
          <div className="absolute left-3.5 sm:left-4 pointer-events-none text-stone-500 dark:text-stone-400">
            {isSearching || isUrlLoading ? (
              <span className="animate-spin inline-flex">
                <Loader2 size={18} strokeWidth={2} className="text-primary dark:text-emerald-400" aria-hidden="true" />
              </span>
            ) : isDirectUrl ? (
              <LinkIcon size={18} strokeWidth={2} className="text-primary dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <Search size={18} strokeWidth={2} className="text-stone-500 dark:text-stone-400" aria-hidden="true" />
            )}
          </div>

          <input
            ref={inputRef}
            id="omni-video-input"
            type="text"
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              if (val.trim().length < 2) {
                setIsSearching(false);
                setIsUrlLoading(false);
                setResults([]);
              }
              setSelectedResult(null);
              setUrlError(null);
              setSearchError(null);
            }}
            placeholder="Search topic or paste link..."
            aria-label="Search topic or paste video URL"
            autoComplete="off"
            spellCheck={false}
            className={`w-full bg-stone-100/90 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 rounded-xl pl-11 sm:pl-12 pr-12 text-sm sm:text-base text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-emerald-500 focus:border-primary dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-stone-950 transition-all shadow-xs ${
              variant === 'inline' ? 'py-3.5 sm:py-4 text-base' : 'py-3 sm:py-3.5'
            }`}
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear input query"
              className="absolute right-3.5 p-1 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 rounded-md transition-colors cursor-pointer"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>

        <TurnstileWidget
          ref={turnstileRef}
          onTokenChange={handleTokenChange}
          action="omni_search"
          className="flex justify-start empty:hidden mt-2"
        />
      </div>

      {isDirectUrl && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {isUrlLoading ? (
            <div className="p-6 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-center gap-3 text-stone-600 dark:text-stone-300">
              <span className="animate-spin inline-flex">
                <Loader2 size={20} strokeWidth={2} className="text-primary dark:text-emerald-400" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">Detecting video chapters and details...</span>
            </div>
          ) : urlError ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle size={20} strokeWidth={2} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold mb-1">Could not load video</p>
                <p className="text-xs leading-relaxed">{urlError}</p>
              </div>
            </div>
          ) : urlVideoDetails ? (
            <div className="p-4 sm:p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="relative aspect-video w-full sm:w-44 rounded-lg overflow-hidden bg-black shrink-0 border border-stone-200/60 dark:border-stone-800">
                  {urlVideoDetails.thumbnailUrl ? (
                    <Image
                      src={urlVideoDetails.thumbnailUrl}
                      alt={urlVideoDetails.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 176px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={24} strokeWidth={2} className="text-stone-500" />
                    </div>
                  )}
                  {typeof urlVideoDetails.duration === 'number' && urlVideoDetails.duration > 0 ? (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-white font-mono font-tnum text-2xs px-2 py-0.5 rounded-full leading-none">
                      {Math.floor(urlVideoDetails.duration / 60)}:
                      {String(Math.floor(urlVideoDetails.duration % 60)).padStart(2, '0')}
                    </div>
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                      <Check size={14} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
                      <span>Link Verified</span>
                    </span>
                    {(urlVideoDetails.chapters?.length || 0) > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 font-mono font-tnum">
                        {urlVideoDetails.chapters?.length} Chapters
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        No chapters found
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                    {urlVideoDetails.title}
                  </h3>

                  {urlVideoDetails.author && (
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 truncate">
                      {urlVideoDetails.author}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCustomTimestampsExpanded((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 cursor-pointer transition-colors"
                >
                  <ChevronDown
                    size={16}
                    strokeWidth={2}
                    className={`transition-transform duration-200 ${
                      isCustomTimestampsExpanded ? 'rotate-180' : ''
                    }`}
                  />
                  <span>
                    {isCustomTimestampsExpanded ? 'Hide custom timestamps' : 'Custom timestamps (optional)'}
                  </span>
                </button>

                {isCustomTimestampsExpanded && (
                  <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
                    <textarea
                      rows={4}
                      value={customTimestampsText}
                      onChange={(e) => setCustomTimestampsText(e.target.value)}
                      placeholder={`0:00 Introduction\n04:12 Key Concepts\n15:30 Demonstration\n45:00 Summary`}
                      className="w-full p-3 bg-stone-100/90 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-600 rounded-lg text-xs sm:text-sm font-mono font-tnum text-stone-900 dark:text-stone-100 placeholder:text-stone-500 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-stone-950 transition-colors"
                    />
                    <p className="text-2xs sm:text-xs text-stone-500">
                      Format: <span className="font-mono">0:00 Title</span>
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateDirect}
                className="w-full h-11 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover active:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary active:scale-98"
              >
                <span>Start Learning</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : null}
        </div>
      )}

      {!isDirectUrl && effectiveResults.length > 0 && !selectedResult && (
        <div className="mt-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-md overflow-hidden animate-in fade-in duration-150 flex flex-col">
          <div className="max-h-96 sm:max-h-112 overflow-y-auto overscroll-contain divide-y divide-stone-100 dark:divide-stone-800/60 p-1.5 sm:p-2">
            {effectiveResults.map((video, idx) => (
              <button
                key={video.videoId}
                type="button"
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                onClick={() => handleSelectResult(video)}
                className={`w-full text-left flex items-center gap-3 p-2.5 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                  activeIndex === idx
                    ? 'bg-stone-100 dark:bg-stone-800'
                    : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                }`}
              >
                <div className="relative aspect-video w-24 sm:w-32 rounded-md overflow-hidden bg-black shrink-0 border border-stone-200/50 dark:border-stone-800">
                  {video.thumbnailUrl ? (
                    <Image
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      sizes="(max-width: 640px) 96px, 128px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-900">
                      <Play size={20} strokeWidth={2} className="text-stone-500" />
                    </div>
                  )}
                  {Boolean(video.duration) ? (
                    <div className="absolute bottom-1 right-1 bg-black/85 text-white font-mono font-tnum text-2xs px-1.5 py-0.5 rounded-full leading-none">
                      {video.duration}
                    </div>
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-2xs sm:text-xs text-stone-500 dark:text-stone-400 flex-wrap">
                    {video.author && <span className="font-medium truncate max-w-40">{video.author}</span>}
                    {video.views && (
                      <>
                        <span aria-hidden="true">&bull;</span>
                        <span>{video.views}</span>
                      </>
                    )}
                    {video.publishedTime && (
                      <>
                        <span aria-hidden="true">&bull;</span>
                        <span>{video.publishedTime}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {video.hasChapters ? (
                    <span className="hidden xs:inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                      <span>Chapters</span>
                    </span>
                  ) : null}
                  <ArrowRight
                    size={16}
                    strokeWidth={2}
                    className={`text-stone-400 transition-transform ${
                      activeIndex === idx ? 'translate-x-0.5 text-stone-700 dark:text-stone-200' : ''
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center justify-between px-3.5 py-2 border-t border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 text-2xs text-stone-600 dark:text-stone-400 font-medium">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono shadow-2xs">
                  <ArrowUp size={12} strokeWidth={2} className="inline" />
                </kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono shadow-2xs">
                  <ArrowDown size={12} strokeWidth={2} className="inline" />
                </kbd>
                <span className="ml-1">navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono shadow-2xs">
                  <CornerDownLeft size={12} strokeWidth={2} className="inline" />
                </kbd>
                <span className="ml-1">inspect</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono shadow-2xs">
                  esc
                </kbd>
                <span className="ml-1">clear</span>
              </span>
            </div>
            <span className="font-mono">{effectiveResults.length} results</span>
          </div>
        </div>
      )}

      {!isDirectUrl && selectedResult && (
        <div className="mt-3 p-4 sm:p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-md space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedResult(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              <span>Back to search results</span>
            </button>
            <span className="text-2xs font-mono font-tnum text-stone-500 dark:text-stone-400">
              {previewChapters.length} {previewChapters.length === 1 ? 'chapter' : 'chapters'}
            </span>
          </div>

          <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 rounded-lg">
            <div className="relative aspect-video w-24 sm:w-32 rounded-md overflow-hidden bg-black shrink-0">
              {selectedResult.thumbnailUrl ? (
                <Image
                  src={selectedResult.thumbnailUrl}
                  alt={selectedResult.title}
                  fill
                  sizes="128px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={20} strokeWidth={2} className="text-stone-500" />
                </div>
              )}
              {Boolean(selectedResult.duration) ? (
                <div className="absolute bottom-1 right-1 bg-black/85 text-white font-mono font-tnum text-2xs px-1.5 py-0.5 rounded-full leading-none">
                  {selectedResult.duration}
                </div>
              ) : null}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                {selectedResult.title}
              </h3>
              <p className="text-2xs sm:text-xs text-stone-500 dark:text-stone-400 mt-1 truncate">
                {selectedResult.author}
              </p>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-stone-200 dark:border-stone-800 rounded-lg divide-y divide-stone-100 dark:divide-stone-800/60 bg-stone-50/50 dark:bg-stone-950/40">
            {isPreviewLoading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-stone-500">
                <span className="animate-spin inline-flex">
                  <Loader2 size={20} strokeWidth={2} className="text-primary dark:text-emerald-400" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium">Inspecting chapter markers...</span>
              </div>
            ) : previewError ? (
              <div className="p-4 text-xs text-rose-600 dark:text-rose-400">{previewError}</div>
            ) : previewChapters.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                <p className="font-semibold text-stone-700 dark:text-stone-300 mb-1">No chapters found</p>
                <p>Paste timestamps below or continue directly.</p>
              </div>
            ) : (
              previewChapters.map((chapter) => (
                <div
                  key={chapter.id || chapter.index}
                  className="flex items-center justify-between p-2.5 text-xs hover:bg-stone-100/60 dark:hover:bg-stone-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-5 text-2xs font-mono text-stone-400 shrink-0 text-right">
                      {chapter.index}
                    </span>
                    <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                      {chapter.title}
                    </span>
                  </div>
                  {chapter.formattedTime && (
                    <span className="text-2xs font-mono font-tnum text-stone-500 bg-stone-200/60 dark:bg-stone-800 px-1.5 py-0.5 rounded shrink-0">
                      {chapter.formattedTime}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {previewChapters.length === 0 && (
            <div className="space-y-2">
              <label htmlFor="preview-custom-timestamps" className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                Custom Timestamps
              </label>
              <textarea
                id="preview-custom-timestamps"
                rows={3}
                value={customTimestampsText}
                onChange={(e) => setCustomTimestampsText(e.target.value)}
                placeholder={`0:00 Introduction\n05:10 Main Content\n20:00 Conclusion`}
                className="w-full p-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-md text-xs font-mono font-tnum text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerateSearchResult}
            className="w-full h-11 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover active:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary active:scale-98"
          >
            <span>Start Learning</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {variant === 'inline' && !query && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400 pt-2">
          <p className="text-center sm:text-left inline-flex items-center gap-1.5">
            <Lightbulb size={14} strokeWidth={2} className="text-amber-500 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <span>Search topics or paste any video link to auto-detect chapters.</span>
          </p>
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white dark:text-stone-900 bg-stone-900 hover:bg-stone-800 active:bg-black dark:bg-white dark:hover:bg-stone-100 dark:active:bg-stone-200 border border-stone-800 dark:border-white rounded-lg sm:rounded-xl shadow-xs transition-all cursor-pointer shrink-0 min-h-9 active:scale-98 focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-emerald-400"
          >
            <GraduationCap size={15} strokeWidth={2.2} className="text-emerald-400 dark:text-emerald-600 shrink-0" aria-hidden="true" />
            <span>Try sample course</span>
          </button>
        </div>
      )}

      {searchError && !isDirectUrl && (
        <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} strokeWidth={2} className="shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{searchError}</span>
        </div>
      )}
    </div>
  );
}
